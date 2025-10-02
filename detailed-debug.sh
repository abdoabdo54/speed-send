#!/bin/bash

echo "=============================================="
echo "  DETAILED CELERY DEBUG"
echo "=============================================="
echo ""

echo "1. Testing sync endpoint (without jq)..."
curl -s "http://localhost:8000/api/v1/test/sync/1?admin_email=selina@kpgsrypj7nx1tnctr.brightlegals.co.uk"
echo ""
echo ""

echo "2. Last 100 lines of Celery Worker logs..."
docker-compose logs --tail=100 celery_worker
echo ""

echo "3. Celery worker status..."
docker-compose exec celery_worker celery -A app.celery_app inspect active 2>&1 || echo "Failed to inspect"
echo ""

echo "4. Redis connection test..."
docker-compose exec -T redis redis-cli ping
echo ""

echo "5. Check Redis for queued tasks..."
docker-compose exec -T redis redis-cli llen celery
echo ""

echo "=============================================="
echo "  END DEBUG"
echo "=============================================="

