#!/bin/bash

echo "🔍 DEBUGGING TEST AFTER FEATURE..."

cd /opt/speed-send

echo "📥 Pulling latest code..."
git pull origin main

echo "🔄 Rebuilding backend..."
docker-compose build --no-cache backend
docker-compose up -d backend

echo "⏳ Waiting for backend to start..."
sleep 15

echo "🧪 Testing Test After feature..."

# Test 1: Check if campaign has test_after settings
echo "1. Checking campaign test_after settings..."
docker-compose exec backend python -c "
from app.database import SessionLocal
from app.models import Campaign
db = SessionLocal()
try:
    campaigns = db.query(Campaign).all()
    for c in campaigns:
        print(f'Campaign {c.id}: {c.name}')
        print(f'  test_after_email: {c.test_after_email}')
        print(f'  test_after_count: {c.test_after_count}')
        print(f'  sent_count: {c.sent_count}')
        print('---')
except Exception as e:
    print(f'Error: {e}')
finally:
    db.close()
"

# Test 2: Check Redis for campaign progress
echo "2. Checking Redis campaign progress..."
docker-compose exec redis redis-cli keys "campaign:*"

# Test 3: Test Redis write operations
echo "3. Testing Redis write operations..."
docker-compose exec redis redis-cli set test_key "test_value"
docker-compose exec redis redis-cli get test_key
docker-compose exec redis redis-cli del test_key

echo "✅ Debug complete!"
echo "🎯 Check the output above to see if test_after settings are saved correctly."
