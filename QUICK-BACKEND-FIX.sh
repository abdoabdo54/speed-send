#!/bin/bash

echo "🚀 QUICK BACKEND FIX"
echo "===================="

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: docker-compose.yml not found. Please run this script from the project root."
    exit 1
fi

echo "📋 Step 1: Stopping backend..."
docker-compose stop backend

echo ""
echo "📋 Step 2: Rebuilding backend with updated error handling..."
docker-compose build backend

echo ""
echo "📋 Step 3: Starting backend..."
docker-compose up -d backend

echo "⏳ Waiting for backend to start..."
sleep 15

echo ""
echo "📋 Step 4: Testing backend health..."
for i in {1..5}; do
    if curl -s http://localhost:8000/health > /dev/null; then
        echo "✅ Backend health check passed!"
        break
    else
        echo "⏳ Backend not ready yet, attempt $i/5..."
        sleep 5
    fi
done

echo ""
echo "📋 Step 5: Testing API endpoints..."
echo "Health endpoint:"
curl -s http://localhost:8000/health

echo ""
echo "Accounts API:"
curl -s http://localhost:8000/api/v1/accounts/

echo ""
echo "Users API:"
curl -s http://localhost:8000/api/v1/users/

echo ""
echo "📊 Final status:"
docker-compose ps

echo ""
echo "📋 Backend logs (last 20 lines):"
docker-compose logs --tail=20 backend

echo ""
echo "✅ QUICK BACKEND FIX COMPLETE!"
echo "🌐 Backend should now be running properly at http://localhost:8000"
