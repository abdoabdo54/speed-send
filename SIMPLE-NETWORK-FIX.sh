#!/bin/bash

echo "🚀 SIMPLE NETWORK FIX"
echo "====================="

echo "📋 Step 1: Restart all services..."
docker-compose down
docker-compose up -d

echo "⏳ Waiting for services to start..."
sleep 30

echo ""
echo "📋 Step 2: Test backend connectivity..."
curl -s http://localhost:8000/health && echo "✅ Backend health OK" || echo "❌ Backend health FAILED"

echo ""
echo "📋 Step 3: Test accounts API..."
curl -s http://localhost:8000/api/v1/accounts/ && echo "✅ Accounts API OK" || echo "❌ Accounts API FAILED"

echo ""
echo "📋 Step 4: Check service status..."
docker-compose ps

echo ""
echo "📋 Step 5: Get server IP..."
SERVER_IP=$(hostname -I | awk '{print $1}')
echo "Server IP: $SERVER_IP"

echo ""
echo "🌐 Access URLs:"
echo "Frontend: http://$SERVER_IP:3000"
echo "Backend: http://$SERVER_IP:8000"
echo ""
echo "✅ SIMPLE NETWORK FIX COMPLETE!"
echo "Try accessing the frontend now at http://$SERVER_IP:3000"
