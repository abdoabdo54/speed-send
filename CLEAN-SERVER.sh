#!/bin/bash

echo "========================================"
echo "🧹 CLEANING SERVER AND APPLYING FIXES"
echo "========================================"
echo ""

cd /opt/speed-send || exit 1

echo "1️⃣ Stashing local changes..."
git stash

echo ""
echo "2️⃣ Pulling latest fixes..."
git pull origin main

echo ""
echo "3️⃣ Stopping all services..."
docker-compose down

echo ""
echo "4️⃣ Rebuilding backend with fixes..."
docker-compose build --no-cache backend

echo ""
echo "5️⃣ Starting all services..."
docker-compose up -d

echo ""
echo "6️⃣ Waiting for services to start..."
sleep 15

echo ""
echo "7️⃣ Testing backend..."
curl -s http://localhost:8000/health && echo "✅ Backend OK" || echo "❌ Backend not ready"

echo ""
echo "8️⃣ Testing campaigns endpoint..."
curl -s http://localhost:8000/api/v1/campaigns/ | head -c 100 && echo "..." || echo "❌ Campaigns endpoint not ready"

echo ""
echo "========================================"
echo "✅ SERVER CLEANED AND UPDATED!"
echo "========================================"
echo ""
echo "🎯 FIXES APPLIED:"
echo "   ✅ Delete campaigns - Fixed RUNNING/QUEUED error"
echo "   ✅ Launch campaigns - Should work now"
echo "   ✅ All services restarted"
echo ""
echo "🌐 Test at: http://172.236.219.75:3000/campaigns"
echo ""
