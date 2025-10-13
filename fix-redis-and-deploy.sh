#!/bin/bash

echo "🔧 Fixing Redis read-only issue and deploying..."

# Stop all services
echo "🛑 Stopping all services..."
docker-compose down

# Remove Redis data to clear any corrupted state
echo "🗑️ Clearing Redis data..."
docker volume rm gmail_saas_redis_data 2>/dev/null || true

# Remove Redis container if it exists
echo "🗑️ Removing Redis container..."
docker rm gmail_saas_redis 2>/dev/null || true

# Rebuild and start services
echo "🔨 Rebuilding and starting services..."
docker-compose build --no-cache redis backend
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check Redis status
echo "🔍 Checking Redis status..."
docker-compose exec redis redis-cli ping

# Check if Redis is writable
echo "🔍 Testing Redis write capability..."
docker-compose exec redis redis-cli set test_key "test_value"
docker-compose exec redis redis-cli get test_key
docker-compose exec redis redis-cli del test_key

# Check backend health
echo "🔍 Checking backend health..."
curl -s http://localhost:8000/health || echo "Backend not ready yet"

echo "✅ Redis fix and deployment complete!"
echo "🚀 You can now try preparing campaigns again."
