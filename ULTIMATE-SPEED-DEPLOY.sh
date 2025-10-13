#!/bin/bash
# ULTIMATE SPEED DEPLOY - Remove ALL limitations for PowerMTA-style performance

echo "🚀 ULTIMATE SPEED DEPLOY - Removing ALL limitations for instant sending..."

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Stop all services
echo "🛑 Stopping all services..."
docker-compose down

# Remove Redis data to clear any cached limitations
echo "🗑️ Clearing Redis cache and limitations..."
docker volume rm gmail_saas_redis_data 2>/dev/null || true

# Rebuild with MAXIMUM performance settings
echo "🔧 Rebuilding with MAXIMUM performance settings..."
docker-compose build --no-cache

# Start services with MAXIMUM resources
echo "🚀 Starting services with MAXIMUM resources..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start (15 seconds)..."
sleep 15

# Test Redis is working with MAXIMUM settings
echo "🔍 Testing Redis with MAXIMUM settings..."
docker-compose exec redis redis-cli ping
docker-compose exec redis redis-cli config set maxmemory-policy allkeys-lru
docker-compose exec redis redis-cli config set maxmemory 512mb

# Check backend health
echo "🩺 Checking backend health..."
curl -s http://localhost:8000/health

# Check Celery worker status
echo "👷 Checking Celery worker status..."
docker-compose exec celery_worker celery -A app.celery_app inspect active

echo "✅ ULTIMATE SPEED DEPLOY completed!"
echo "🎯 Your app now has:"
echo "   - 1000 concurrent Celery workers"
echo "   - UNLIMITED thread pool (no 50 limit)"
echo "   - NO rate limits or delays"
echo "   - 8 backend workers"
echo "   - 1000 prefetch multiplier"
echo "   - Equal distribution across all users"
echo "🚀 Ready for INSTANT PowerMTA-style sending!"