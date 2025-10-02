#!/bin/bash

echo "🔧 FIXING BACKEND - MISSING EMAIL-VALIDATOR"
echo "============================================="
echo ""

# Pull latest code
echo "1. Pulling latest code from GitHub..."
git pull origin main
echo ""

# Stop and remove backend container
echo "2. Stopping backend container..."
docker-compose stop backend celery_worker celery_beat
echo ""

# Rebuild backend with new requirements
echo "3. Rebuilding backend (this may take 1-2 minutes)..."
docker-compose build --no-cache backend
echo ""

# Start all services
echo "4. Starting all services..."
docker-compose up -d
echo ""

# Wait for services to start
echo "5. Waiting for backend to start (15 seconds)..."
sleep 15
echo ""

# Test backend
echo "6. Testing backend..."
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ BACKEND IS NOW RUNNING!"
else
    echo "⚠️ Backend not responding yet, checking logs..."
    docker-compose logs --tail=20 backend
fi
echo ""

# Test frontend
echo "7. Testing frontend..."
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ FRONTEND IS RUNNING!"
else
    echo "⚠️ Frontend not responding yet"
fi
echo ""

echo "============================================="
echo "🎉 FIX COMPLETE!"
echo "============================================="
echo ""
echo "Access your app at:"
echo "  Frontend: http://$(hostname -I | awk '{print $1}'):3000"
echo "  Backend:  http://$(hostname -I | awk '{print $1}'):8000"
echo ""
echo "View logs:    docker-compose logs -f"
echo "Restart all:  docker-compose restart"
echo ""

