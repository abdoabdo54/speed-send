#!/bin/bash

echo "🔍 COMPREHENSIVE NETWORK DIAGNOSIS"
echo "=================================="

echo "📋 Step 1: Check if backend is actually responding..."
echo "Testing localhost:8000..."
curl -v http://localhost:8000/health 2>&1 | head -n 10

echo ""
echo "📋 Step 2: Check if backend port is open..."
netstat -tlnp | grep :8000 || echo "❌ Port 8000 not listening"

echo ""
echo "📋 Step 3: Check backend container internal network..."
docker-compose exec backend curl -s http://localhost:8000/health || echo "❌ Backend can't reach itself"

echo ""
echo "📋 Step 4: Check if backend is actually running the app..."
docker-compose exec backend ps aux | grep uvicorn || echo "❌ Uvicorn not running"

echo ""
echo "📋 Step 5: Check backend container logs for errors..."
docker-compose logs --tail=20 backend

echo ""
echo "📋 Step 6: Test from frontend container to backend..."
docker-compose exec frontend curl -s http://backend:8000/health || echo "❌ Frontend can't reach backend"

echo ""
echo "📋 Step 7: Check if there are any firewall issues..."
iptables -L | grep 8000 || echo "No firewall rules for port 8000"

echo ""
echo "📋 Step 8: Test external IP access..."
EXTERNAL_IP=$(hostname -I | awk '{print $1}')
echo "Testing external IP: $EXTERNAL_IP:8000"
curl -v http://$EXTERNAL_IP:8000/health 2>&1 | head -n 10

echo ""
echo "📋 Step 9: Check Docker network configuration..."
docker network ls
docker network inspect speed-send_default || echo "❌ Network not found"

echo ""
echo "✅ NETWORK DIAGNOSIS COMPLETE!"
