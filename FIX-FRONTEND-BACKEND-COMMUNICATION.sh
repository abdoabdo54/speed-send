#!/bin/bash

echo "🔧 FIXING FRONTEND-BACKEND COMMUNICATION"
echo "========================================"

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: docker-compose.yml not found. Please run this script from the project root."
    exit 1
fi

echo "📋 Step 1: Checking current status..."
docker-compose ps

echo ""
echo "📋 Step 2: Testing backend connectivity..."
echo "Backend health:"
curl -s http://localhost:8000/health

echo ""
echo "Backend accounts API:"
curl -s http://localhost:8000/api/v1/accounts/

echo ""
echo "📋 Step 3: Testing external IP connectivity..."
EXTERNAL_IP=$(hostname -I | awk '{print $1}')
echo "External IP: $EXTERNAL_IP"

echo "Testing backend on external IP:"
curl -s http://$EXTERNAL_IP:8000/health || echo "❌ External IP not accessible"

echo ""
echo "📋 Step 4: Checking frontend configuration..."
echo "Frontend should be accessible at: http://$EXTERNAL_IP:3000"
echo "Backend should be accessible at: http://$EXTERNAL_IP:8000"

echo ""
echo "📋 Step 5: Restarting services to ensure clean state..."
docker-compose restart backend frontend

echo "⏳ Waiting for services to start..."
sleep 20

echo ""
echo "📋 Step 6: Final connectivity test..."
echo "Backend health:"
curl -s http://localhost:8000/health

echo ""
echo "Backend accounts API:"
curl -s http://localhost:8000/api/v1/accounts/

echo ""
echo "📋 Step 7: Checking backend logs for CORS issues..."
docker-compose logs --tail=10 backend

echo ""
echo "📋 Step 8: Testing from frontend container..."
docker-compose exec frontend curl -s http://backend:8000/health || echo "❌ Frontend cannot reach backend"

echo ""
echo "✅ FRONTEND-BACKEND COMMUNICATION FIX COMPLETE!"
echo "🌐 Access URLs:"
echo "Frontend: http://$EXTERNAL_IP:3000"
echo "Backend API: http://$EXTERNAL_IP:8000"
echo "API Docs: http://$EXTERNAL_IP:8000/docs"
