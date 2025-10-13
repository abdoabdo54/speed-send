#!/bin/bash

echo "🚀 COMPLETE NETWORK FIX"
echo "======================="

echo "📋 Step 1: Stop all services..."
docker-compose down

echo ""
echo "📋 Step 2: Clean up Docker networks..."
docker network prune -f

echo ""
echo "📋 Step 3: Rebuild backend with proper network configuration..."
docker-compose build --no-cache backend

echo ""
echo "📋 Step 4: Start services in correct order..."
# Start database first
docker-compose up -d postgres redis

echo "⏳ Waiting for database to be ready..."
sleep 15

# Start backend
docker-compose up -d backend

echo "⏳ Waiting for backend to start..."
sleep 20

# Start frontend
docker-compose up -d frontend

echo "⏳ Waiting for frontend to start..."
sleep 15

echo ""
echo "📋 Step 5: Test backend connectivity..."
echo "Testing localhost:8000..."
for i in {1..5}; do
    echo "Attempt $i/5:"
    curl -s http://localhost:8000/health && echo "✅ Backend responding" && break || echo "❌ Backend not responding"
    sleep 3
done

echo ""
echo "📋 Step 6: Test API endpoints..."
echo "Health endpoint:"
curl -s http://localhost:8000/health

echo ""
echo "Accounts API:"
curl -s http://localhost:8000/api/v1/accounts/

echo ""
echo "📋 Step 7: Test external access..."
EXTERNAL_IP=$(hostname -I | awk '{print $1}')
echo "External IP: $EXTERNAL_IP"
echo "Testing external access..."
curl -s http://$EXTERNAL_IP:8000/health && echo "✅ External access working" || echo "❌ External access failed"

echo ""
echo "📋 Step 8: Check service status..."
docker-compose ps

echo ""
echo "📋 Step 9: Check backend logs..."
docker-compose logs --tail=10 backend

echo ""
echo "🌐 Access URLs:"
echo "Frontend: http://$EXTERNAL_IP:3000"
echo "Backend: http://$EXTERNAL_IP:8000"
echo "API Docs: http://$EXTERNAL_IP:8000/docs"

echo ""
echo "✅ COMPLETE NETWORK FIX FINISHED!"
