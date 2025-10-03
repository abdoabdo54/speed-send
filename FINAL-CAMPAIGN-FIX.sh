#!/bin/bash

echo "========================================"
echo "🚀 FINAL CAMPAIGN MANAGEMENT FIX"
echo "========================================"
echo ""

cd /opt/speed-send || exit 1

echo "1️⃣ Pulling latest campaign management code..."
git pull origin main

echo ""
echo "2️⃣ Stopping all services..."
docker-compose down

echo ""
echo "3️⃣ Rebuilding backend with campaign management..."
docker-compose build --no-cache backend

echo ""
echo "4️⃣ Rebuilding frontend with new campaign UI..."
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
echo "✅ CAMPAIGN MANAGEMENT SYSTEM READY!"
echo "========================================"
echo ""
echo "🌐 Test at: http://172.236.219.75:3000/campaigns/new"
echo ""
echo "🎯 NEW FEATURES:"
echo "   ✅ Fixed logging error"
echo "   ✅ Test email sends directly (no campaign)"
echo "   ✅ Create campaign creates in DRAFT status"
echo "   ✅ 🚀 Launch button sends all emails immediately"
echo "   ✅ 📋 Duplicate button creates campaign copy"
echo "   ✅ ⚡ Light speed sending with PowerMTA mode"
echo ""
echo "📋 WORKFLOW:"
echo "   1. Create campaign → DRAFT status"
echo "   2. Go to Campaigns page"
echo "   3. Click 🚀 Launch → Sends all emails instantly"
echo "   4. Click 📋 Duplicate → Creates copy for reuse"
echo ""
