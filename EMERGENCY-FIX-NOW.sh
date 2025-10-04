#!/bin/bash

echo "🚨 EMERGENCY FIX - FIXING BACKEND CONNECTION NOW"
echo "================================================"

# Stop everything
echo "📋 Step 1: Stopping all services..."
docker-compose down

# Pull latest code
echo "📋 Step 2: Pulling latest code..."
git pull origin main

# Rebuild everything from scratch
echo "📋 Step 3: Rebuilding all services from scratch..."
docker-compose build --no-cache

# Start services
echo "📋 Step 4: Starting all services..."
docker-compose up -d

# Wait for services to start
echo "⏳ Waiting 30 seconds for services to start..."
sleep 30

# Test backend
echo "📋 Step 5: Testing backend..."
curl -s http://localhost:8000/health && echo "✅ Backend OK" || echo "❌ Backend FAILED"

# Test accounts API
echo "📋 Step 6: Testing accounts API..."
curl -s http://localhost:8000/api/v1/accounts/ && echo "✅ Accounts API OK" || echo "❌ Accounts API FAILED"

# Get server IP
SERVER_IP=$(hostname -I | awk '{print $1}')

# Test external access
echo "📋 Step 7: Testing external access..."
curl -s http://$SERVER_IP:8000/health && echo "✅ External access OK" || echo "❌ External access FAILED"

# Show service status
echo "📋 Step 8: Service status..."
docker-compose ps

# Show backend logs
echo "📋 Step 9: Backend logs (last 10 lines)..."
docker-compose logs --tail=10 backend

# Show frontend logs
echo "📋 Step 10: Frontend logs (last 10 lines)..."
docker-compose logs --tail=10 frontend

echo ""
echo "🌐 ACCESS URLS:"
echo "Frontend: http://$SERVER_IP:3000"
echo "Backend: http://$SERVER_IP:8000"
echo ""
echo "✅ EMERGENCY FIX COMPLETE!"
echo "🔄 Please refresh your browser and try again!"
