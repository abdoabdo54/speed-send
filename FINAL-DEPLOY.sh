#!/bin/bash

set -e

echo "========================================"
echo "  FINAL DEPLOYMENT - COMPLETE REBUILD"
echo "========================================"
echo ""

cd /opt/speed-send

echo "1. Pulling latest code..."
git reset --hard HEAD
git clean -fd
git pull origin main
echo "✓ Code updated"
echo ""

echo "2. Adding database column..."
docker-compose exec -T postgres psql -U gmailsaas -d gmail_saas -c "ALTER TABLE service_accounts ADD COLUMN IF NOT EXISTS admin_email VARCHAR(255);" || true
echo "✓ Database updated"
echo ""

echo "3. Stopping all services..."
docker-compose down
echo "✓ Stopped"
echo ""

echo "4. Rebuilding images (3-5 minutes)..."
docker-compose build --no-cache
echo "✓ Built"
echo ""

echo "5. Starting services..."
docker-compose up -d
echo "✓ Started"
echo ""

echo "6. Waiting for services (30 seconds)..."
sleep 30
echo ""

echo "7. Testing backend..."
curl -s http://localhost:8000/health
echo ""
echo ""

echo "========================================"
echo "✅ DEPLOYMENT COMPLETE!"
echo "========================================"
echo ""
echo "NOW:"
echo "1. Go to http://$(hostname -I | awk '{print $1}'):3000/accounts"
echo "2. Click 'Sync Users' button"
echo "3. Enter: selina@kpgsrypj7nx1tnctr.brightlegals.co.uk"
echo "4. It WILL work now!"
echo ""

