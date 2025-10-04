#!/bin/bash

echo "🔧 FIXING BACKEND CONNECTION ISSUES"
echo "=================================="

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: docker-compose.yml not found. Please run this script from the project root."
    exit 1
fi

echo "📋 Current Docker status:"
docker-compose ps

echo ""
echo "🔄 Restarting backend services..."
docker-compose restart backend

echo ""
echo "⏳ Waiting for backend to start..."
sleep 10

echo ""
echo "🔍 Checking backend health..."
curl -s http://localhost:8000/health || echo "❌ Backend health check failed"

echo ""
echo "🔍 Testing API endpoints..."
echo "Accounts API:"
curl -s http://localhost:8000/api/v1/accounts/ | head -n 3

echo ""
echo "Users API:"
curl -s http://localhost:8000/api/v1/users/ | head -n 3

echo ""
echo "📊 Backend logs (last 20 lines):"
docker-compose logs --tail=20 backend

echo ""
echo "✅ Backend connection fix complete!"
echo "🌐 Frontend should now be able to connect to backend at http://localhost:8000"
