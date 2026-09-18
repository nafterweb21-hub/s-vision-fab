#!/bin/bash
# Deploy script - Build locally via standalone mode, push to VPS
# Usage: ./deploy.sh <user@vps-ip> [ssh-key-path] [deploy-path]

set -e

VPS_HOST="${1:-ubuntu@65.0.168.115}"
SSH_KEY="${2:-./vision.pem}"
DEPLOY_PATH="${3:-/home/ubuntu/projects/vision_one}"
SSH_OPTS="-i $SSH_KEY -o StrictHostKeyChecking=no"
PM2_APP_NAME="vision-one-erp"

chmod 600 "$SSH_KEY" 2>/dev/null || true

echo "==> Generating Prisma client locally..."
npx prisma generate

echo "==> Cleaning old build cache..."
rm -rf .next

echo "==> Building Next.js app (standalone mode)..."
npm run build

echo "==> Ensuring remote directories exist..."
ssh $SSH_OPTS "$VPS_HOST" "mkdir -p $DEPLOY_PATH/.next/static $DEPLOY_PATH/public/uploads $DEPLOY_PATH/prisma"

echo "==> Syncing Prisma schema & config..."
rsync -avz --delete -e "ssh $SSH_OPTS" prisma/ "$VPS_HOST:$DEPLOY_PATH/prisma/"
rsync -avz -e "ssh $SSH_OPTS" prisma.config.ts "$VPS_HOST:$DEPLOY_PATH/prisma.config.ts"

echo "==> Pushing Prisma schema to DB on VPS..."
# Execute prisma db push via npx on the server
ssh $SSH_OPTS "$VPS_HOST" "export NVM_DIR=\$HOME/.nvm && source \$NVM_DIR/nvm.sh && cd $DEPLOY_PATH && npx prisma db push --accept-data-loss"

echo "==> Syncing standalone build..."
# Sync the standalone directory contents to the root of DEPLOY_PATH
rsync -avz --delete -e "ssh $SSH_OPTS" .next/standalone/ "$VPS_HOST:$DEPLOY_PATH/"

echo "==> Syncing static assets..."
rsync -avz --delete -e "ssh $SSH_OPTS" .next/static/ "$VPS_HOST:$DEPLOY_PATH/.next/static/"

echo "==> Syncing public assets (preserving uploads)..."
rsync -avz --delete --exclude='uploads/' -e "ssh $SSH_OPTS" public/ "$VPS_HOST:$DEPLOY_PATH/public/"

echo "==> Fixing permissions for uploads directory..."
ssh $SSH_OPTS "$VPS_HOST" "sudo chmod -R 777 $DEPLOY_PATH/public/uploads"

echo "==> Restarting app via pm2..."
# In standalone mode, we run server.js with pm2
ssh $SSH_OPTS "$VPS_HOST" "export NVM_DIR=\$HOME/.nvm && source \$NVM_DIR/nvm.sh && cd $DEPLOY_PATH && (pm2 delete $PM2_APP_NAME 2>/dev/null || true) && PORT=3000 pm2 start server.js --name $PM2_APP_NAME && pm2 save"

echo ""
echo "==> Deploy complete!"
echo "    App: running via pm2 ($PM2_APP_NAME) on port 3000"
echo "    Front with nginx reverse proxy to localhost:3000"