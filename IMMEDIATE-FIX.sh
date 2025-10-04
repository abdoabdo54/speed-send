#!/bin/bash

echo "========================================"
echo "🔥 IMMEDIATE LAUNCH FIX"
echo "========================================"
echo ""

cd /opt/speed-send || exit 1

echo "1️⃣ Stopping backend..."
docker-compose stop backend

echo ""
echo "2️⃣ Pulling latest fix..."
git stash
git pull origin main

echo ""
echo "3️⃣ Rebuilding backend..."
docker-compose build --no-cache backend

echo ""
echo "4️⃣ Starting backend..."
docker-compose up -d backend

echo ""
echo "5️⃣ Waiting for backend..."
sleep 10

echo ""
echo "6️⃣ Testing backend..."
curl -s http://localhost:8000/health && echo "✅ Backend OK" || echo "❌ Backend not ready"

echo ""
echo "========================================"
echo "✅ FIX APPLIED - TEST NOW!"
echo "========================================"
echo ""
echo "🌐 Go to: http://172.236.219.75:3000/campaigns"
echo "🎯 Click 🚀 Launch on any DRAFT campaign"
echo ""
