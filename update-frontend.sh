#!/bin/bash

echo "========================================"
echo "🔄 UPDATING FRONTEND"
echo "========================================"
echo ""

cd /opt/speed-send || exit 1

echo "1️⃣ Pulling latest code..."
git pull origin main

echo ""
echo "2️⃣ Stopping frontend container..."
docker-compose stop frontend

echo ""
echo "3️⃣ Removing old frontend container..."
docker-compose rm -f frontend

echo ""
echo "4️⃣ Rebuilding frontend (no cache)..."
docker-compose build --no-cache frontend

echo ""
echo "5️⃣ Starting new frontend..."
docker-compose up -d frontend

echo ""
echo "6️⃣ Waiting for frontend to start..."
sleep 5

echo ""
echo "7️⃣ Checking status..."
docker-compose ps frontend

echo ""
echo "8️⃣ Last 20 lines of frontend logs..."
docker-compose logs --tail=20 frontend

echo ""
echo "========================================"
echo "✅ FRONTEND UPDATED!"
echo "========================================"
echo ""
echo "🌐 Open: http://172.236.219.75:3000/campaigns/new"
echo ""
echo "🔍 To see live logs:"
echo "   docker-compose logs -f frontend"
echo ""

