#!/bin/bash
# Habesha Restaurant OS — one-shot deployment script
# Run as root on Ubuntu 20.04+ : bash deploy.sh

set -e

APP_DIR="/var/www/rms1"
DOMAIN="rms1.auraraisetech.com"
DB_NAME="habesha_os"
DB_USER="rmsuser"
DB_PASS=$(openssl rand -hex 16)
PORT=3000

echo "=== [1/8] Installing Node.js 20 ==="
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

echo "=== [2/8] Installing PostgreSQL ==="
apt-get install -y postgresql postgresql-contrib

echo "=== [3/8] Installing Nginx, Certbot, PM2 ==="
apt-get install -y nginx certbot python3-certbot-nginx
npm install -g pm2

echo "=== [4/8] Setting up PostgreSQL database ==="
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" 2>/dev/null || true

echo "=== [5/8] Creating .env file ==="
JWT_SECRET=$(openssl rand -hex 48)
ADMIN_KEY=$(openssl rand -hex 32)

cat > "$APP_DIR/.env" <<EOF
NODE_ENV=production
PORT=$PORT
DATABASE_URL=postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME
JWT_SECRET=$JWT_SECRET
ADMIN_KEY=$ADMIN_KEY
APP_URL=https://$DOMAIN

# Fill these in manually after deploy:
SUPER_ADMIN_EMAIL=admin@auraraisetech.com
SUPER_ADMIN_PASSWORD=change-me-now
GEMINI_API_KEY=
EMAIL_USER=
EMAIL_PASS=
CHAPA_SECRET_KEY=
CHAPA_ENCRYPTION_KEY=
EOF

echo "=== [6/8] Installing dependencies and building ==="
cd "$APP_DIR"
npm ci --no-audit --no-fund
npm run build

echo "=== [7/8] Starting app with PM2 ==="
pm2 delete rms 2>/dev/null || true
pm2 start "npm start" --name rms --cwd "$APP_DIR"
pm2 save
pm2 startup | tail -1 | bash

echo "=== [8/8] Configuring Nginx ==="
cat > /etc/nginx/sites-available/rms <<NGINX
server {
    listen 80;
    server_name $DOMAIN;

    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/rms /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx

echo ""
echo "=========================================="
echo "  App running at http://$DOMAIN"
echo "  Getting HTTPS certificate..."
echo "=========================================="
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "Ediluadmasu@gmail.com" || \
  echo "Certbot failed — make sure DNS is pointing to this server first."

echo ""
echo "=========================================="
echo "  DEPLOYMENT COMPLETE"
echo "  URL: https://$DOMAIN"
echo "  DB password saved in: $APP_DIR/.env"
echo ""
echo "  IMPORTANT: Edit .env to set:"
echo "    SUPER_ADMIN_EMAIL"
echo "    SUPER_ADMIN_PASSWORD"
echo "=========================================="
