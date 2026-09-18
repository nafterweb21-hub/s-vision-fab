#!/bin/bash
set -e

# 1. Fix Nginx Configuration
cat << 'EOF' | sudo tee /etc/nginx/sites-available/default
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name fab.vision.ind.in;

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

# 2. Check Nginx configuration and reload
sudo nginx -t
sudo systemctl reload nginx

# 3. Install Certbot
sudo apt update
sudo apt install -y certbot python3-certbot-nginx

# 4. Run Certbot to get SSL and configure Nginx automatically
sudo certbot --nginx -d fab.vision.ind.in --non-interactive --agree-tos -m admin@vision.ind.in --redirect

echo "SSL installation complete!"
