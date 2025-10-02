#!/bin/bash

echo "🔍 Backend Diagnostic Script"
echo "============================"
echo ""

# Check if backend container is running
echo "1. Backend container status:"
docker-compose ps backend
echo ""

# Check backend logs
echo "2. Backend logs (last 50 lines):"
docker-compose logs --tail=50 backend
echo ""

# Try to enter backend container
echo "3. Checking if we can enter backend container:"
docker-compose exec -T backend python --version 2>&1 || echo "Cannot enter backend container"
echo ""

# Check if all Python files exist
echo "4. Checking Python files in backend:"
docker-compose exec -T backend ls -la /app/app/ 2>&1 || echo "Cannot list files"
echo ""

# Check database connection
echo "5. Testing database connection:"
docker-compose exec -T postgres psql -U gmailsaas -d gmail_saas -c "SELECT 1;" 2>&1 || echo "Database not accessible"
echo ""

# Check Redis connection
echo "6. Testing Redis connection:"
docker-compose exec -T redis redis-cli ping 2>&1 || echo "Redis not accessible"
echo ""

echo "✅ Diagnostic complete!"

