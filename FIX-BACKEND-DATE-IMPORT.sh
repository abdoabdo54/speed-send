#!/bin/bash
# Fix backend Date import issue

echo "🔧 Fixing backend Date import issue..."

# Stop services
echo "🛑 Stopping services..."
docker-compose down

# Rebuild backend with the fix
echo "🔨 Rebuilding backend..."
docker-compose build --no-cache backend

# Start services
echo "🚀 Starting services..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start (15 seconds)..."
sleep 15

# Check backend logs
echo "🔍 Checking backend status..."
docker-compose logs backend | tail -20

# Test backend health
echo "🩺 Testing backend health..."
curl -s http://localhost:8000/health || echo "Backend not responding yet"

echo "✅ Backend fix completed!"
echo "🎯 The Date import issue should now be resolved."
