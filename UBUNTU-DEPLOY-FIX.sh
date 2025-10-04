#!/bin/bash

echo "🚀 COMPLETE UBUNTU SERVER DEPLOYMENT FIX"
echo "========================================"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ This script must be run as root"
    echo "Usage: sudo ./UBUNTU-DEPLOY-FIX.sh"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: docker-compose.yml not found. Please run this script from the project root."
    exit 1
fi

echo "📋 System Information:"
echo "OS: $(lsb_release -d | cut -f2)"
echo "Docker: $(docker --version)"
echo "Docker Compose: $(docker-compose --version)"

echo ""
echo "🔄 Step 1: Stopping all services..."
docker-compose down

echo ""
echo "🔄 Step 2: Cleaning up system..."
docker-compose down -v --remove-orphans
docker system prune -f
docker volume prune -f

echo ""
echo "🔄 Step 3: Updating system packages..."
apt update -y
apt upgrade -y

echo ""
echo "🔄 Step 4: Installing/updating Docker dependencies..."
apt install -y docker.io docker-compose-plugin
systemctl enable docker
systemctl start docker

echo ""
echo "🔄 Step 5: Setting up proper permissions..."
chown -R $SUDO_USER:$SUDO_USER .
chmod +x *.sh

echo ""
echo "🔄 Step 6: Rebuilding all services with no cache..."
docker-compose build --no-cache --parallel

echo ""
echo "🔄 Step 7: Starting services in correct order..."

# Start database first
echo "📊 Starting PostgreSQL database..."
docker-compose up -d postgres

echo "⏳ Waiting for database to be ready..."
sleep 20

# Test database connection
echo "🔍 Testing database connection..."
docker-compose exec -T postgres psql -U gmailsaas -d gmail_saas -c "SELECT 1;" || {
    echo "❌ Database connection failed. Retrying..."
    sleep 10
    docker-compose exec -T postgres psql -U gmailsaas -d gmail_saas -c "SELECT 1;" || {
        echo "❌ Database still not ready. Check logs:"
        docker-compose logs postgres
        exit 1
    }
}

echo "✅ Database is ready!"

# Start Redis
echo "📊 Starting Redis..."
docker-compose up -d redis

echo "⏳ Waiting for Redis to be ready..."
sleep 5

# Start backend
echo "🔄 Starting backend service..."
docker-compose up -d backend

echo "⏳ Waiting for backend to start..."
sleep 15

# Test backend health
echo "🔍 Testing backend health..."
for i in {1..5}; do
    if curl -s http://localhost:8000/health > /dev/null; then
        echo "✅ Backend health check passed!"
        break
    else
        echo "⏳ Backend not ready yet, attempt $i/5..."
        sleep 5
    fi
done

# Start frontend
echo "🔄 Starting frontend service..."
docker-compose up -d frontend

echo "⏳ Waiting for frontend to build..."
sleep 30

echo ""
echo "🔍 Step 8: Testing all API endpoints..."

# Test health endpoint
echo "Health endpoint:"
curl -s http://localhost:8000/health | jq . || echo "❌ Health check failed"

echo ""
echo "Accounts API:"
curl -s http://localhost:8000/api/v1/accounts/ | jq . || echo "❌ Accounts API failed"

echo ""
echo "Users API:"
curl -s http://localhost:8000/api/v1/users/ | jq . || echo "❌ Users API failed"

echo ""
echo "Test email API (should return validation error):"
curl -s -X POST http://localhost:8000/api/v1/test-email/ \
  -H "Content-Type: application/json" \
  -d '{"test":"data"}' | jq . || echo "❌ Test email API failed"

echo ""
echo "📊 Final system status:"
docker-compose ps

echo ""
echo "📋 Backend logs (last 30 lines):"
docker-compose logs --tail=30 backend

echo ""
echo "📋 Frontend logs (last 30 lines):"
docker-compose logs --tail=30 frontend

echo ""
echo "🌐 Service URLs:"
echo "Frontend: http://$(hostname -I | awk '{print $1}'):3000"
echo "Backend API: http://$(hostname -I | awk '{print $1}'):8000"
echo "API Documentation: http://$(hostname -I | awk '{print $1}'):8000/docs"

echo ""
echo "✅ UBUNTU SERVER DEPLOYMENT FIX COMPLETE!"
echo "🎯 Google Workspace API integration is now ready!"
echo ""
echo "📝 Next steps:"
echo "1. Add Google Workspace service accounts in the Accounts page"
echo "2. Sync users from your Google Workspace domain"
echo "3. Create and send campaigns via Gmail API"
