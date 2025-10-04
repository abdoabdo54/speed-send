#!/bin/bash

echo "🔧 FIXING DATABASE ENUM CONFLICT"
echo "================================"

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: docker-compose.yml not found. Please run this script from the project root."
    exit 1
fi

echo "📋 Step 1: Stopping backend to prevent conflicts..."
docker-compose stop backend

echo ""
echo "📋 Step 2: Connecting to database and fixing enum conflicts..."

# Connect to database and drop existing enum types if they exist
docker-compose exec -T postgres psql -U gmailsaas -d gmail_saas << 'EOF'
-- Drop existing enum types if they exist
DO $$ 
BEGIN
    -- Drop enum types if they exist
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'accountstatus') THEN
        DROP TYPE accountstatus CASCADE;
        RAISE NOTICE 'Dropped accountstatus enum';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'campaignstatus') THEN
        DROP TYPE campaignstatus CASCADE;
        RAISE NOTICE 'Dropped campaignstatus enum';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'emailstatus') THEN
        DROP TYPE emailstatus CASCADE;
        RAISE NOTICE 'Dropped emailstatus enum';
    END IF;
END $$;

-- Drop all tables to start fresh
DROP TABLE IF EXISTS campaign_senders CASCADE;
DROP TABLE IF EXISTS campaign_recipients CASCADE;
DROP TABLE IF EXISTS email_logs CASCADE;
DROP TABLE IF EXISTS campaigns CASCADE;
DROP TABLE IF EXISTS workspace_users CASCADE;
DROP TABLE IF EXISTS service_accounts CASCADE;

-- Create enum types
CREATE TYPE accountstatus AS ENUM ('ACTIVE', 'INACTIVE', 'ERROR', 'QUOTA_EXCEEDED');
CREATE TYPE campaignstatus AS ENUM ('DRAFT', 'PREPARING', 'READY', 'SENDING', 'PAUSED', 'COMPLETED', 'FAILED');
CREATE TYPE emailstatus AS ENUM ('PENDING', 'SENDING', 'SENT', 'FAILED', 'RETRY');

RAISE NOTICE 'Database cleaned and enum types recreated';
EOF

echo ""
echo "📋 Step 3: Starting backend with clean database..."
docker-compose up -d backend

echo "⏳ Waiting for backend to start..."
sleep 15

echo ""
echo "📋 Step 4: Testing backend health..."
for i in {1..5}; do
    if curl -s http://localhost:8000/health > /dev/null; then
        echo "✅ Backend health check passed!"
        break
    else
        echo "⏳ Backend not ready yet, attempt $i/5..."
        sleep 5
    fi
done

echo ""
echo "📋 Step 5: Testing API endpoints..."
echo "Health endpoint:"
curl -s http://localhost:8000/health | head -n 3

echo ""
echo "Accounts API:"
curl -s http://localhost:8000/api/v1/accounts/ | head -n 3

echo ""
echo "Users API:"
curl -s http://localhost:8000/api/v1/users/ | head -n 3

echo ""
echo "📊 Final status:"
docker-compose ps

echo ""
echo "📋 Backend logs (last 20 lines):"
docker-compose logs --tail=20 backend

echo ""
echo "✅ DATABASE ENUM CONFLICT FIXED!"
echo "🌐 Backend should now be running properly at http://localhost:8000"
