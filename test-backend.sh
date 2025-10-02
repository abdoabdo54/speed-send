#!/bin/bash

echo "🔍 Testing Backend Connection..."
echo ""

# Test health endpoint
echo "1. Testing backend health endpoint..."
curl -v http://172.236.219.75:8000/health
echo ""
echo ""

# Test API root
echo "2. Testing API root..."
curl -v http://172.236.219.75:8000/
echo ""
echo ""

# Test API v1
echo "3. Testing API v1 accounts endpoint..."
curl -v http://172.236.219.75:8000/api/v1/accounts
echo ""
echo ""

# Check if backend container is running
echo "4. Checking backend container..."
docker-compose ps backend
echo ""

# Check backend logs
echo "5. Backend logs (last 20 lines)..."
docker-compose logs --tail=20 backend
echo ""

echo "✅ Test complete!"

