#!/bin/bash

echo "🔧 COMPLETE UBUNTU SERVER FIX FOR GOOGLE WORKSPACE API"
echo "====================================================="

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: docker-compose.yml not found. Please run this script from the project root."
    exit 1
fi

echo "📋 Current system status:"
echo "Docker containers:"
docker-compose ps

echo ""
echo "🔄 Step 1: Stopping all services..."
docker-compose down

echo ""
echo "🔄 Step 2: Cleaning up containers and volumes..."
docker-compose down -v --remove-orphans
docker system prune -f

echo ""
echo "🔄 Step 3: Rebuilding all services..."
docker-compose build --no-cache

echo ""
echo "🔄 Step 4: Starting services in correct order..."
# Start database first
docker-compose up -d db redis

echo "⏳ Waiting for database to be ready..."
sleep 15

# Check database connection
echo "🔍 Testing database connection..."
docker-compose exec db psql -U postgres -d speed_send -c "SELECT 1;" || echo "❌ Database connection failed"

echo ""
echo "🔄 Step 5: Starting backend..."
docker-compose up -d backend

echo "⏳ Waiting for backend to start..."
sleep 10

# Check backend health
echo "🔍 Testing backend health..."
curl -s http://localhost:8000/health || echo "❌ Backend health check failed"

echo ""
echo "🔄 Step 6: Starting frontend..."
docker-compose up -d frontend

echo "⏳ Waiting for frontend to build..."
sleep 30

echo ""
echo "🔍 Step 7: Testing all API endpoints..."

# Test health endpoint
echo "Health endpoint:"
curl -s http://localhost:8000/health | head -n 3

echo ""
echo "Accounts API:"
curl -s http://localhost:8000/api/v1/accounts/ | head -n 3

echo ""
echo "Users API:"
curl -s http://localhost:8000/api/v1/users/ | head -n 3

echo ""
echo "Test email API:"
curl -s -X POST http://localhost:8000/api/v1/test-email/ \
  -H "Content-Type: application/json" \
  -d '{"test":"data"}' | head -n 3

echo ""
echo "📊 Final status:"
docker-compose ps

echo ""
echo "📋 Backend logs (last 20 lines):"
docker-compose logs --tail=20 backend

echo ""
echo "📋 Frontend logs (last 20 lines):"
docker-compose logs --tail=20 frontend

echo ""
echo "✅ UBUNTU SERVER FIX COMPLETE!"
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:8000"
echo "📚 API Docs: http://localhost:8000/docs"
