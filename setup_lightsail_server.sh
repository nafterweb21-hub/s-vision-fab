#!/bin/bash
set -e

echo "==> Updating system packages..."
sudo apt-get update
sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y

echo "==> Installing dependencies..."
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y curl git nginx

echo "==> Installing NVM and Node.js v20..."
if [ ! -d "$HOME/.nvm" ]; then
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
fi

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

nvm install 20
nvm use 20
nvm alias default 20

echo "==> Installing PM2..."
npm install -g pm2

echo "==> Configuring Nginx..."
cat << 'EOF' > /tmp/vision-one
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

sudo mv /tmp/vision-one /etc/nginx/sites-available/vision-one
sudo ln -sf /etc/nginx/sites-available/vision-one /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo systemctl test nginx || true
sudo systemctl restart nginx

echo "==> Setting up PM2 Startup Script..."
pm2 startup systemd -u ubuntu --hp /home/ubuntu || true

echo "==> Setup complete!"
