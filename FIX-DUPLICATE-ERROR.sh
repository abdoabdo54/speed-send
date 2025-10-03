#!/bin/bash

echo "========================================"
echo "🔧 FIXING DUPLICATE FUNCTION ERROR"
echo "========================================"
echo ""

cd /opt/speed-send || exit 1

echo "1️⃣ Pulling latest fix..."
git pull origin main

echo ""
echo "2️⃣ Rebuilding frontend with fix..."
docker-compose build --no-cache frontend

echo ""
echo "3️⃣ Starting frontend..."
docker-compose up -d frontend

echo ""
echo "4️⃣ Waiting for frontend to start..."
sleep 10

echo ""
echo "5️⃣ Checking frontend status..."
docker-compose ps frontend

echo ""
echo "========================================"
echo "✅ DUPLICATE FUNCTION ERROR FIXED!"
echo "========================================"
echo ""
echo "🌐 Test at: http://172.236.219.75:3000/campaigns"
echo ""
echo "🎯 Now you can:"
echo "   ✅ Launch campaigns"
echo "   ✅ Delete campaigns" 
echo "   ✅ Duplicate campaigns"
echo "   ✅ No more build errors!"
echo ""
