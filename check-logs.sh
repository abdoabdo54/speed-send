#!/bin/bash

echo "=============================================="
echo "  CHECKING BACKEND & CELERY LOGS FOR ERRORS"
echo "=============================================="
echo ""

echo "1. Checking if backend is running..."
docker-compose ps backend
echo ""

echo "2. Last 50 lines of BACKEND logs:"
echo "-------------------------------------------"
docker-compose logs --tail=50 backend | grep -E "(ERROR|WARN|sync|Fetch|403|401|500)" || docker-compose logs --tail=50 backend
echo ""

echo "3. Last 50 lines of CELERY WORKER logs:"
echo "-------------------------------------------"
docker-compose logs --tail=50 celery_worker | grep -E "(ERROR|WARN|sync|Fetch|403|401|500)" || docker-compose logs --tail=50 celery_worker
echo ""

echo "4. Checking database for synced users..."
docker-compose exec -T postgres psql -U gmailsaas -d gmail_saas -c "SELECT id, email, service_account_id FROM workspace_users LIMIT 10;" 2>&1 || echo "Database query failed"
echo ""

echo "5. Checking service accounts..."
docker-compose exec -T postgres psql -U gmailsaas -d gmail_saas -c "SELECT id, name, client_email, total_users, last_synced FROM service_accounts;" 2>&1 || echo "Database query failed"
echo ""

echo "=============================================="
echo "  DIAGNOSTIC COMPLETE"
echo "=============================================="

