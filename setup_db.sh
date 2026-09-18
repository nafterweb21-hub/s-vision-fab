#!/bin/bash
set -e

echo "==> Installing PostgreSQL..."
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y postgresql postgresql-contrib

echo "==> Configuring PostgreSQL User and Database..."
# Change password of postgres user to postgres
sudo -i -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'postgres';" || sudo -i -u postgres psql -c "CREATE USER postgres WITH SUPERUSER PASSWORD 'postgres';"
# Create vision_one database owned by postgres
sudo -i -u postgres psql -c "CREATE DATABASE vision_one OWNER postgres;" || true

echo "==> PostgreSQL installation complete!"
