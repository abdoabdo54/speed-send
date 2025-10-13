#!/bin/bash

echo "🔍 COMPREHENSIVE BACKEND DIAGNOSIS"
echo "=================================="

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: docker-compose.yml not found. Please run this script from the project root."
    exit 1
fi

echo "📋 Step 1: Checking Docker services status..."
docker-compose ps

echo ""
echo "📋 Step 2: Checking if backend is running..."
if docker-compose ps | grep -q "gmail_saas_backend.*Up"; then
    echo "✅ Backend container is running"
else
    echo "❌ Backend container is not running"
    echo "🔄 Starting backend..."
    docker-compose up -d backend
    sleep 10
fi

echo ""
echo "📋 Step 3: Testing backend health endpoint..."
for i in {1..5}; do
    echo "Attempt $i/5: Testing health endpoint..."
    if curl -s http://localhost:8000/health > /dev/null; then
        echo "✅ Backend health check passed!"
        break
    else
        echo "⏳ Backend not ready yet, waiting..."
        sleep 5
    fi
done

echo ""
echo "📋 Step 4: Testing database connection..."
docker-compose exec -T postgres psql -U gmailsaas -d gmail_saas -c "SELECT COUNT(*) FROM service_accounts;" || {
    echo "❌ Database connection failed"
    echo "🔄 Restarting database..."
    docker-compose restart postgres
    sleep 10
}

echo ""
echo "📋 Step 5: Testing accounts API endpoint..."
echo "Testing GET /api/v1/accounts/"
curl -s -w "\nHTTP Status: %{http_code}\n" http://localhost:8000/api/v1/accounts/ | head -n 10

echo ""
echo "📋 Step 6: Testing users API endpoint..."
echo "Testing GET /api/v1/users/"
curl -s -w "\nHTTP Status: %{http_code}\n" http://localhost:8000/api/v1/users/ | head -n 10

echo ""
echo "📋 Step 7: Testing test email API endpoint..."
echo "Testing POST /api/v1/test-email/"
curl -s -X POST http://localhost:8000/api/v1/test-email/ \
  -H "Content-Type: application/json" \
  -d '{"test":"data"}' \
  -w "\nHTTP Status: %{http_code}\n" | head -n 10

echo ""
echo "📋 Step 8: Checking backend logs for errors..."
echo "Last 30 lines of backend logs:"
docker-compose logs --tail=30 backend

echo ""
echo "📋 Step 9: Checking database logs..."
echo "Last 20 lines of database logs:"
docker-compose logs --tail=20 postgres

echo ""
echo "📋 Step 10: Testing database tables..."
echo "Service accounts table:"
docker-compose exec -T postgres psql -U gmailsaas -d gmail_saas -c "SELECT id, name, client_email, domain, status, total_users FROM service_accounts LIMIT 5;"

echo ""
echo "Workspace users table:"
docker-compose exec -T postgres psql -U gmailsaas -d gmail_saas -c "SELECT id, email, service_account_id, is_active FROM workspace_users LIMIT 5;"

echo ""
echo "✅ BACKEND DIAGNOSIS COMPLETE!"
echo "📊 Summary:"
echo "- Backend health: $(curl -s http://localhost:8000/health > /dev/null && echo "✅ OK" || echo "❌ FAILED")"
echo "- Database connection: $(docker-compose exec -T postgres psql -U gmailsaas -d gmail_saas -c "SELECT 1;" > /dev/null 2>&1 && echo "✅ OK" || echo "❌ FAILED")"
echo "- Accounts API: $(curl -s http://localhost:8000/api/v1/accounts/ > /dev/null && echo "✅ OK" || echo "❌ FAILED")"
echo "- Users API: $(curl -s http://localhost:8000/api/v1/users/ > /dev/null && echo "✅ OK" || echo "❌ FAILED")"
