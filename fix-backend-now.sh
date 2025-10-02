#!/bin/bash

echo "🔧 FIXING BACKEND - MISSING EMAIL-VALIDATOR"
echo "============================================="
echo ""

# Pull latest code
echo "1. Pulling latest code from GitHub..."
git pull origin main
echo ""

# Fix .env with correct API URL
echo "2. Setting correct API URL for frontend..."
SERVER_IP=$(hostname -I | awk '{print $1}')
if [ ! -f .env ]; then
    touch .env
fi
if grep -q "NEXT_PUBLIC_API_URL" .env; then
    sed -i "s|NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=http://$SERVER_IP:8000|" .env
else
    echo "NEXT_PUBLIC_API_URL=http://$SERVER_IP:8000" >> .env
fi
echo "✓ API URL set to: http://$SERVER_IP:8000"
echo ""

# Stop all services
echo "3. Stopping all services..."
docker-compose down
echo ""

# Rebuild backend and frontend with new requirements
echo "4. Rebuilding all services (this may take 2-3 minutes)..."
docker-compose build --no-cache
echo ""

# Start all services
echo "5. Starting all services..."
docker-compose up -d
echo ""

# Wait for services to start
echo "6. Waiting for services to start (30 seconds)..."
sleep 30
echo ""

# Test backend
echo "7. Testing backend..."
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ BACKEND IS NOW RUNNING!"
else
    echo "⚠️ Backend not responding yet, checking logs..."
    docker-compose logs --tail=30 backend
fi
echo ""

# Test frontend
echo "8. Testing frontend..."
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ FRONTEND IS RUNNING!"
else
    echo "⚠️ Frontend not responding yet, checking logs..."
    docker-compose logs --tail=30 frontend
fi
echo ""

# Show .env configuration
echo "9. Current configuration:"
echo "   NEXT_PUBLIC_API_URL=$(grep NEXT_PUBLIC_API_URL .env)"
echo ""

echo "============================================="
echo "🎉 FIX COMPLETE!"
echo "============================================="
echo ""
echo "Access your app at:"
echo "  Frontend: http://$(hostname -I | awk '{print $1}'):3000"
echo "  Backend:  http://$(hostname -I | awk '{print $1}'):8000"
echo "  API Docs: http://$(hostname -I | awk '{print $1}'):8000/docs"
echo ""
echo "⚠️  IMPORTANT: Open the frontend URL in your browser"
echo "    and press F12 to check the Console for API configuration"
echo ""
echo "View logs:    docker-compose logs -f"
echo "Restart all:  docker-compose restart"
echo ""

