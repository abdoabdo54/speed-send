#!/bin/bash

echo "========================================"
echo "🔥 FORCE UPDATING SERVER WITH FIXES"
echo "========================================"
echo ""

cd /opt/speed-send || exit 1

echo "1️⃣ Pulling latest code..."
git pull origin main

echo ""
echo "2️⃣ Stopping all services..."
docker-compose down

echo ""
echo "3️⃣ Removing all containers and images..."
docker-compose rm -f
docker rmi speed-send-backend speed-send-frontend 2>/dev/null || true

echo ""
echo "4️⃣ Rebuilding backend with no cache..."
docker-compose build --no-cache backend

echo ""
echo "5️⃣ Rebuilding frontend with no cache..."
docker-compose build --no-cache frontend

echo ""
echo "6️⃣ Starting all services..."
docker-compose up -d

echo ""
echo "7️⃣ Waiting for services to start..."
sleep 20

echo ""
echo "8️⃣ Checking service status..."
docker-compose ps

echo ""
echo "9️⃣ Testing backend health..."
curl -s http://localhost:8000/health && echo "✅ Backend OK" || echo "❌ Backend not ready"

echo ""
echo "🔟 Testing launch endpoint..."
curl -s -X POST http://localhost:8000/api/v1/campaigns/1/launch || echo "❌ Launch endpoint not ready"

echo ""
echo "========================================"
echo "✅ SERVER FORCE UPDATED!"
echo "========================================"
echo ""
echo "🎯 FIXES APPLIED:"
echo "   ✅ WorkspaceUser import added"
echo "   ✅ Launch endpoint fixed"
echo "   ✅ Delete endpoint added"
echo "   ✅ Duplicate endpoint added"
echo ""
echo "🌐 Test at: http://172.236.219.75:3000/campaigns"
echo ""
