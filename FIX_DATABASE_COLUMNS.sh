#!/bin/bash

echo "🔧 Fixing missing database columns..."

# Navigate to project directory
cd /opt/speed-send

# Pull latest code
echo "📥 Pulling latest code..."
git pull origin main

# Apply database migration
echo "🗄️ Adding missing columns to campaigns table..."
docker-compose exec db psql -U postgres -d speed_send -c "
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS test_after_email VARCHAR(255);
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS test_after_count INTEGER DEFAULT 0;
UPDATE campaigns SET test_after_count = 0 WHERE test_after_count IS NULL;
"

# Rebuild and restart backend
echo "🔄 Rebuilding backend..."
docker-compose build --no-cache backend
docker-compose up -d backend

# Wait for backend to start
echo "⏳ Waiting for backend to start..."
sleep 10

# Test the fix
echo "🧪 Testing database connection..."
docker-compose exec backend python -c "
from app.database import SessionLocal
from app.models import Campaign
db = SessionLocal()
try:
    campaign = db.query(Campaign).first()
    print('✅ Database connection successful')
    print(f'✅ Campaign model loaded: {campaign.name if campaign else \"No campaigns\"}')
except Exception as e:
    print(f'❌ Database error: {e}')
finally:
    db.close()
"

echo "✅ Database migration complete!"
echo "🎯 The Test After feature should now work properly."
