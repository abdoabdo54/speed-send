#!/bin/bash

echo "========================================"
echo "🔥 FORCE UPDATING FRONTEND WITH LOGGING"
echo "========================================"
echo ""

cd /opt/speed-send || exit 1

echo "1️⃣ Pulling latest code..."
git pull origin main

echo ""
echo "2️⃣ Stopping frontend container..."
docker-compose stop frontend

echo ""
echo "3️⃣ Removing frontend container and image..."
docker-compose rm -f frontend
docker rmi speed-send-frontend 2>/dev/null || true

echo ""
echo "4️⃣ Rebuilding frontend with no cache..."
docker-compose build --no-cache frontend

echo ""
echo "5️⃣ Starting frontend..."
docker-compose up -d frontend

echo ""
echo "6️⃣ Waiting for frontend to start..."
sleep 10

echo ""
echo "7️⃣ Checking frontend status..."
docker-compose ps frontend

echo ""
echo "8️⃣ Frontend logs..."
docker-compose logs --tail=20 frontend

echo ""
echo "========================================"
echo "✅ FRONTEND UPDATED!"
echo "========================================"
echo ""
echo "🌐 Test at: http://172.236.219.75:3000/campaigns/new"
echo ""
echo "🔍 When you click 'Send Test Email', you should see:"
echo "   - A full-screen black log window"
echo "   - Detailed step-by-step logging"
echo "   - Backend response details"
echo ""
