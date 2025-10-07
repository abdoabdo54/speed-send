#!/bin/bash

echo "🚨 EMERGENCY DATABASE FIX - Adding missing columns..."

cd /opt/speed-send

echo "📥 Pulling latest code..."
git pull origin main

echo "🗄️ Connecting to database and adding columns..."

# Connect to PostgreSQL and add the missing columns
docker-compose exec -T db psql -U postgres -d speed_send << 'EOF'
-- Add the missing columns
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS test_after_email VARCHAR(255);
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS test_after_count INTEGER DEFAULT 0;

-- Update existing records
UPDATE campaigns SET test_after_count = 0 WHERE test_after_count IS NULL;

-- Verify the columns exist
\d campaigns;

-- Show the new columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'campaigns' 
AND column_name IN ('test_after_email', 'test_after_count');
EOF

echo "🔄 Rebuilding backend with new model..."
docker-compose build --no-cache backend

echo "🚀 Restarting backend..."
docker-compose up -d backend

echo "⏳ Waiting for backend to start..."
sleep 15

echo "🧪 Testing database connection..."
docker-compose exec backend python -c "
import sys
sys.path.append('/app')
from app.database import SessionLocal
from app.models import Campaign
from sqlalchemy import text

db = SessionLocal()
try:
    # Test basic connection
    result = db.execute(text('SELECT 1'))
    print('✅ Database connection successful')
    
    # Test if columns exist
    result = db.execute(text('SELECT column_name FROM information_schema.columns WHERE table_name = \\'campaigns\\' AND column_name IN (\\'test_after_email\\', \\'test_after_count\\')'))
    columns = [row[0] for row in result.fetchall()]
    print(f'✅ Found columns: {columns}')
    
    if 'test_after_email' in columns and 'test_after_count' in columns:
        print('✅ All required columns exist!')
        # Test Campaign model
        campaign = db.query(Campaign).first()
        print(f'✅ Campaign model works: {campaign.name if campaign else \"No campaigns\"}')
    else:
        print('❌ Missing columns still exist')
        
except Exception as e:
    print(f'❌ Database error: {e}')
    import traceback
    traceback.print_exc()
finally:
    db.close()
"

echo "✅ Database fix complete!"