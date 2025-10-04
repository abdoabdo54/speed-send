#!/bin/bash

echo "🧪 TESTING BACKEND DIRECTLY"
echo "============================"

echo "📋 Step 1: Check if backend container is running..."
docker-compose ps backend

echo ""
echo "📋 Step 2: Check backend process inside container..."
docker-compose exec backend ps aux | grep uvicorn

echo ""
echo "📋 Step 3: Test backend from inside the container..."
docker-compose exec backend curl -s http://localhost:8000/health

echo ""
echo "📋 Step 4: Test backend from host machine..."
curl -s http://localhost:8000/health

echo ""
echo "📋 Step 5: Check if port 8000 is actually listening..."
netstat -tlnp | grep :8000

echo ""
echo "📋 Step 6: Test with verbose curl..."
curl -v http://localhost:8000/health

echo ""
echo "📋 Step 7: Check backend logs for any errors..."
docker-compose logs --tail=20 backend

echo ""
echo "📋 Step 8: Test if backend is responding to different endpoints..."
curl -s http://localhost:8000/
curl -s http://localhost:8000/api/v1/accounts/

echo ""
echo "✅ BACKEND DIRECT TEST COMPLETE!"
