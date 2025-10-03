#!/bin/bash

echo "========================================"
echo "🔧 QUICK FIX FOR LAUNCH & DELETE"
echo "========================================"
echo ""

cd /opt/speed-send || exit 1

echo "1️⃣ Pulling latest fixes..."
git pull origin main

echo ""
echo "2️⃣ Restarting backend with fixes..."
docker-compose restart backend

echo ""
echo "3️⃣ Waiting for backend to start..."
sleep 10

echo ""
echo "4️⃣ Testing backend..."
curl -s http://localhost:8000/health && echo "✅ Backend OK" || echo "❌ Backend not ready"

echo ""
echo "========================================"
echo "✅ FIXES APPLIED!"
echo "========================================"
echo ""
echo "🎯 Now you can:"
echo "   ✅ Launch campaigns (WorkspaceUser error fixed)"
echo "   ✅ Delete draft campaigns"
echo "   ✅ Duplicate campaigns"
echo ""
echo "🌐 Test at: http://172.236.219.75:3000/campaigns"
echo ""
