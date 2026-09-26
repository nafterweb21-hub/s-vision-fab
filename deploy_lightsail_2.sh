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
# The app connects as a limited role (vision_app) that does not own the tables, so a push
# needs a DB URL for the owning role in the server's .env. It never uses --accept-data-loss
# (destructive changes are refused, not applied) and a failure here never aborts the deploy.
if [ "${RUN_DB_PUSH:-0}" = "1" ]; then
  echo "==> Pushing Prisma schema to DB on VPS (RUN_DB_PUSH=1)..."
  ssh "${SSH_OPTS[@]}" "$VPS_HOST" "export NVM_DIR=~/.nvm && source ~/.nvm/nvm.sh && nvm use $NODE_VERSION && rm -rf /tmp/prisma_deps && mkdir -p /tmp/prisma_deps && cd /tmp/prisma_deps && npm init -y && npm install dotenv typescript ts-node @types/node prisma@7.10.0 && cd $DEPLOY_PATH && NODE_PATH=/tmp/prisma_deps/node_modules npx -y prisma@7.10.0 db push" \
    || echo "WARNING: prisma db push failed or was refused; the app is unaffected. Apply schema changes manually."
else
  echo "==> Skipping prisma db push (set RUN_DB_PUSH=1 to sync the schema)"
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
