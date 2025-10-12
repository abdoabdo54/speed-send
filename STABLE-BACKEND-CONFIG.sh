#!/bin/bash
# STABLE BACKEND CONFIG - Reduce concurrency for stability

echo "🔧 APPLYING STABLE BACKEND CONFIGURATION..."

# Stop all services
echo "🛑 Stopping all services..."
docker-compose down

# Create a stable docker-compose override
echo "📝 Creating stable configuration..."
cat > docker-compose.override.yml << 'EOF'
version: '3.8'

services:
  backend:
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
    restart: unless-stopped

  celery_worker:
    command: celery -A app.celery_app worker --loglevel=info --concurrency=100 --pool=threads --prefetch-multiplier=100
    restart: unless-stopped

  celery_beat:
    command: celery -A app.celery_app beat --loglevel=info
    restart: unless-stopped
EOF

echo "✅ Stable configuration created"

# Start services with stable configuration
echo "🚀 Starting services with stable configuration..."
docker-compose up -d

# Wait for services
echo "⏳ Waiting for services to start (20 seconds)..."
sleep 20

# Test backend
echo "🩺 Testing backend..."
curl -s http://localhost:8000/health && echo "✅ Backend is online!" || echo "❌ Backend still offline"

# Check logs if needed
echo "📋 If backend is still offline, check logs:"
echo "docker-compose logs -f backend"

echo "✅ STABLE CONFIGURATION APPLIED!"
echo "🎯 Backend should be stable now"
echo "🎯 Reduced concurrency for stability"
echo "🎯 Can increase concurrency later once stable"
