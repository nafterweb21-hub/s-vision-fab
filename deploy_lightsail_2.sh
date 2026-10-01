#!/bin/bash
# Deploy script for AWS Lightsail instance 13.206.85.149 (Windows Compatible)
# Build locally via standalone mode, push to VPS.
# Usage: ./deploy_lightsail_2.sh [user@vps-ip] [ssh-key-path] [deploy-path]

set -e

VPS_HOST="${1:-ubuntu@13.206.85.149}"
SSH_KEY="${2:-C:/Users/hp/Downloads/LightsailDefaultKey-ap-south-1 (1).pem}"
DEPLOY_PATH="${3:-/home/ubuntu/projects/vision_one}"
# Array form: the default key path contains spaces and parentheses.
SSH_OPTS=(-i "$SSH_KEY" -o StrictHostKeyChecking=no)
PM2_APP_NAME="vision-one-erp"
NODE_VERSION="20.20.2"

chmod 600 "$SSH_KEY" 2>/dev/null || true

echo "==> Generating Prisma client locally..."
npx prisma generate

echo "==> Cleaning old build cache..."
rm -rf .next 2>/dev/null || true

echo "==> Building Next.js app (standalone mode)..."
npm run build

echo "==> Packaging standalone build..."
# Copy static files to the standalone directory
cp -r .next/static .next/standalone/.next/
# Copy public folder; uploads on the server are preserved by not deleting them below
cp -r public .next/standalone/
# Copy prisma files
cp -r prisma .next/standalone/
cp prisma.config.ts .next/standalone/ 2>/dev/null || true

echo "==> Fixing Turbopack synthetic pg module bug..."
# Turbopack in Next 15+ standalone mode sometimes mangles pg into a synthetic module
# (e.g. pg-587764f78a6c7a9c). Find the hash and duplicate the pg folder so it resolves at runtime.
if [ -d ".next/standalone/node_modules/pg" ]; then
  PG_SYNTHETIC=$(grep -h -o 'pg-[a-f0-9]\{5,\}' .next/server/middleware.js.nft.json 2>/dev/null | head -1)
  if [ -n "$PG_SYNTHETIC" ]; then
    echo "Found synthetic pg package requirement: $PG_SYNTHETIC"
    cp -r .next/standalone/node_modules/pg ".next/standalone/node_modules/$PG_SYNTHETIC"
  fi
fi

echo "==> Fixing Next.js standalone @swc/helpers trace bug..."
# Next.js standalone trace sometimes only copies package.json for @swc/helpers
rm -rf .next/standalone/node_modules/@swc/helpers
mkdir -p .next/standalone/node_modules/@swc
cp -r node_modules/@swc/helpers .next/standalone/node_modules/@swc/

echo "==> Creating deployment archive..."
# Never ship the local .env: the server keeps its own (production DATABASE_URL etc.).
tar -chzf deploy.tar.gz --exclude='./.env' -C .next/standalone .

echo "==> Ensuring remote directories exist..."
ssh "${SSH_OPTS[@]}" "$VPS_HOST" "mkdir -p $DEPLOY_PATH/public/uploads"

echo "==> Uploading archive to VPS..."
scp "${SSH_OPTS[@]}" deploy.tar.gz "$VPS_HOST:/tmp/deploy.tar.gz"

echo "==> Extracting on VPS..."
ssh "${SSH_OPTS[@]}" "$VPS_HOST" "rm -rf $DEPLOY_PATH/node_modules $DEPLOY_PATH/.next $DEPLOY_PATH/server.js && tar -xzf /tmp/deploy.tar.gz -C $DEPLOY_PATH && rm /tmp/deploy.tar.gz"

echo "==> Fixing permissions for uploads directory..."
ssh "${SSH_OPTS[@]}" "$VPS_HOST" "sudo chmod -R 777 $DEPLOY_PATH/public/uploads"

# Schema sync is opt-in: RUN_DB_PUSH=1 ./deploy_lightsail_2.sh ...
# Prisma diffs the live DB (read-only) against prisma/schema.prisma into SQL, which is then
# applied in one transaction via peer auth (sudo -u postgres) under SET ROLE $DB_OWNER, so new
# tables are owned by the same role as the existing ones (on this host the app role, vision,
# owns them all). Potentially destructive SQL (drops, truncates, deletes, column type changes)
# is printed and refused, never applied. A failure here never aborts the deploy.
DB_NAME="vision_one"
DB_OWNER="vision"
if [ "${RUN_DB_PUSH:-0}" = "1" ]; then
  echo "==> Syncing Prisma schema to DB on VPS (RUN_DB_PUSH=1)..."
  ssh "${SSH_OPTS[@]}" "$VPS_HOST" "DEPLOY_PATH='$DEPLOY_PATH' DB_NAME='$DB_NAME' DB_OWNER='$DB_OWNER' NODE_VERSION='$NODE_VERSION' bash -s" <<'REMOTE' \
    || echo "WARNING: schema sync failed or was refused; the app is unaffected. Apply schema changes manually."
export NVM_DIR=~/.nvm && source ~/.nvm/nvm.sh >/dev/null && nvm use "$NODE_VERSION" >/dev/null
set -e
if [ ! -d /tmp/prisma_deps/node_modules/prisma ]; then
  mkdir -p /tmp/prisma_deps && cd /tmp/prisma_deps
  npm init -y >/dev/null && npm install --silent dotenv typescript ts-node @types/node prisma@7.10.0
fi
cd "$DEPLOY_PATH"
SQL=$(mktemp /tmp/schema_sync.XXXXXX)
trap 'rm -f "$SQL"' EXIT
NODE_PATH=/tmp/prisma_deps/node_modules npx -y prisma@7.10.0 migrate diff \
  --from-config-datasource --to-schema prisma/schema.prisma --script > "$SQL"
if ! grep -qvE '^[[:space:]]*(--.*)?$' "$SQL"; then
  echo "Schema already in sync; nothing to apply."
  exit 0
fi
echo "---- schema changes ----"; cat "$SQL"; echo "------------------------"
if grep -iqE 'DROP (TABLE|COLUMN|TYPE|SCHEMA)|TRUNCATE|DELETE FROM|SET DATA TYPE' "$SQL"; then
  echo "Refusing: potentially destructive statements above. Review and apply manually with:"
  echo "  { echo 'SET ROLE $DB_OWNER;'; cat <file>; } | sudo -u postgres psql -d $DB_NAME -v ON_ERROR_STOP=1 -1 -f -"
  exit 1
fi
# The SQL file is readable only by this user, so feed it to psql on stdin.
{ echo "SET ROLE $DB_OWNER;"; cat "$SQL"; } | sudo -u postgres psql -d "$DB_NAME" -v ON_ERROR_STOP=1 -1 -f -
echo "Schema sync applied."
REMOTE
else
  echo "==> Skipping schema sync (set RUN_DB_PUSH=1 to sync the schema)"
fi

echo "==> Restarting app via pm2..."
# In standalone mode, we run server.js with pm2
ssh "${SSH_OPTS[@]}" "$VPS_HOST" "export NVM_DIR=~/.nvm && source ~/.nvm/nvm.sh && nvm use $NODE_VERSION && cd $DEPLOY_PATH && (~/.nvm/versions/node/v$NODE_VERSION/bin/pm2 delete $PM2_APP_NAME 2>/dev/null || true) && PORT=3000 ~/.nvm/versions/node/v$NODE_VERSION/bin/pm2 start server.js --name $PM2_APP_NAME && ~/.nvm/versions/node/v$NODE_VERSION/bin/pm2 save"

echo "==> Cleaning up local archive..."
rm deploy.tar.gz 2>/dev/null || true

echo ""
echo "==> Deploy complete!"
echo "    Host: $VPS_HOST"
echo "    App: running via pm2 ($PM2_APP_NAME) on port 3000"
echo "    Front with nginx reverse proxy to localhost:3000"
