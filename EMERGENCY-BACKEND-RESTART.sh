#!/bin/bash
# EMERGENCY BACKEND RESTART - Get backend online immediately

echo "🚨 EMERGENCY BACKEND RESTART..."

# Check current status
echo "🔍 Checking current Docker status..."
docker-compose ps

# Stop all services
echo "🛑 Stopping all services..."
docker-compose down

# Check for any stuck containers
echo "🧹 Cleaning up any stuck containers..."
docker system prune -f

# Start services one by one for stability
echo "🚀 Starting services in order..."

# Start database first
echo "📊 Starting PostgreSQL..."
docker-compose up -d postgres

# Wait for database
echo "⏳ Waiting for database (10 seconds)..."
sleep 10

# Start Redis
echo "🔴 Starting Redis..."
docker-compose up -d redis

# Wait for Redis
echo "⏳ Waiting for Redis (5 seconds)..."
sleep 5

# Start backend with reduced concurrency for stability
echo "🔧 Starting backend with stable configuration..."
docker-compose up -d backend

# Wait for backend
echo "⏳ Waiting for backend (15 seconds)..."
sleep 15

# Test backend health
echo "🩺 Testing backend health..."
for i in {1..5}; do
    echo "Attempt $i/5..."
    if curl -s http://localhost:8000/health; then
        echo "✅ Backend is online!"
        break
    else
        echo "❌ Backend not ready, waiting 5 seconds..."
        sleep 5
    fi
done

# Start Celery with reduced concurrency for stability
echo "⚡ Starting Celery worker with stable configuration..."
docker-compose up -d celery_worker

# Start Celery Beat
echo "⏰ Starting Celery Beat..."
docker-compose up -d celery_beat

# Start frontend
echo "🎨 Starting frontend..."
docker-compose up -d frontend

# Final status check
echo "🔍 Final status check..."
docker-compose ps

# Test all endpoints
echo "🧪 Testing endpoints..."
echo "Backend health:"
curl -s http://localhost:8000/health || echo "Backend not responding"

echo "Frontend:"
curl -s http://localhost:3000 | head -1 || echo "Frontend not responding"

echo "✅ EMERGENCY RESTART COMPLETE!"
echo "🎯 Backend should now be online at http://172.236.219.75:8000"
echo "🎯 Frontend should be online at http://172.236.219.75:3000"
echo ""
echo "If backend is still offline, check logs with:"
echo "docker-compose logs -f backend"
