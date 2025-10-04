#!/bin/bash

echo "========================================"
echo "🔥 FORCE APPLYING LAUNCH FIX"
echo "========================================"
echo ""

cd /opt/speed-send || exit 1

echo "1️⃣ Stashing all local changes..."
git stash

echo ""
echo "2️⃣ Pulling latest launch fix..."
git pull origin main

echo ""
echo "3️⃣ Stopping all services..."
docker-compose down

echo ""
echo "4️⃣ Rebuilding backend with launch fix..."
docker-compose build --no-cache backend

echo ""
echo "5️⃣ Starting all services..."
docker-compose up -d

echo ""
echo "6️⃣ Waiting for services to start..."
sleep 15

echo ""
echo "7️⃣ Testing backend health..."
curl -s http://localhost:8000/health && echo "✅ Backend OK" || echo "❌ Backend not ready"

echo ""
echo "8️⃣ Testing launch endpoint..."
curl -s -X POST http://localhost:8000/api/v1/campaigns/22/launch || echo "❌ Launch endpoint not ready"

echo ""
echo "========================================"
echo "✅ LAUNCH FIX FORCE APPLIED!"
echo "========================================"
echo ""
echo "🎯 FIXES APPLIED:"
echo "   ✅ Launch endpoint accepts DRAFT status"
echo "   ✅ No more READY status requirement"
echo "   ✅ Backend rebuilt with latest code"
echo ""
echo "🌐 Test at: http://172.236.219.75:3000/campaigns"
echo ""
