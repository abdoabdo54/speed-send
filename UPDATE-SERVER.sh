#!/bin/bash

echo "========================================"
echo "🚀 UPDATING SERVER WITH FIXES"
echo "========================================"
echo ""

cd /opt/speed-send || exit 1

echo "1️⃣ Pulling latest code..."
git pull origin main

echo ""
echo "2️⃣ Stopping all services..."
docker-compose down

echo ""
echo "3️⃣ Rebuilding backend with new test-email endpoint..."
docker-compose build --no-cache backend

echo ""
echo "4️⃣ Rebuilding frontend with updated test logic..."
docker-compose build --no-cache frontend

echo ""
echo "5️⃣ Starting all services..."
docker-compose up -d

echo ""
echo "6️⃣ Waiting for services to start..."
sleep 15

echo ""
echo "7️⃣ Checking service status..."
docker-compose ps

echo ""
echo "8️⃣ Testing backend health..."
curl -s http://localhost:8000/health || echo "Backend not ready yet"

echo ""
echo "========================================"
echo "✅ SERVER UPDATED!"
echo "========================================"
echo ""
echo "🌐 Test at: http://172.236.219.75:3000/campaigns/new"
echo ""
echo "🔧 NEW WORKFLOW:"
echo "   1. 🧪 Test Email → Sends directly (no campaign)"
echo "   2. 🚀 Create Campaign → Creates in DRAFT status"
echo "   3. 📋 Go to Campaigns page → Prepare & Launch"
echo ""
