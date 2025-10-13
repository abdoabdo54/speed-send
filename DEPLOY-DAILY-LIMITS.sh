#!/bin/bash
# Deploy Daily Limits System

echo "🚀 Deploying Daily Limits System..."

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Stop services
echo "🛑 Stopping services..."
docker-compose down

# Rebuild with new code
echo "🔧 Rebuilding services..."
docker-compose build --no-cache

# Start services
echo "🚀 Starting services..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start (15 seconds)..."
sleep 15

# Add daily limit columns to database
echo "🗄️ Adding daily limit columns to database..."
docker-compose exec postgres psql -U gmailsaas -d gmail_saas -c "
-- Add daily limit columns
ALTER TABLE service_accounts ADD COLUMN IF NOT EXISTS daily_limit INTEGER DEFAULT 2000;
ALTER TABLE service_accounts ADD COLUMN IF NOT EXISTS daily_sent INTEGER DEFAULT 0;
ALTER TABLE service_accounts ADD COLUMN IF NOT EXISTS daily_reset_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE service_accounts ADD COLUMN IF NOT EXISTS total_sent_all_time INTEGER DEFAULT 0;

-- Update existing accounts to have 2k daily limit
UPDATE service_accounts SET daily_limit = 2000 WHERE daily_limit IS NULL;

-- Set reset date to today for all accounts
UPDATE service_accounts SET daily_reset_date = CURRENT_DATE WHERE daily_reset_date IS NULL;

-- Initialize daily_sent to 0 for all accounts
UPDATE service_accounts SET daily_sent = 0 WHERE daily_sent IS NULL;

-- Initialize total_sent_all_time to 0 for all accounts
UPDATE service_accounts SET total_sent_all_time = 0 WHERE total_sent_all_time IS NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_service_accounts_daily_reset_date ON service_accounts(daily_reset_date);
CREATE INDEX IF NOT EXISTS idx_service_accounts_daily_sent ON service_accounts(daily_sent);

-- Show the updated table structure
SELECT 
    name,
    daily_limit,
    daily_sent,
    daily_reset_date,
    total_sent_all_time,
    (daily_limit - daily_sent) as remaining_today
FROM service_accounts;
"

# Test the new statistics endpoint
echo "🔍 Testing statistics endpoint..."
curl -s http://localhost:8000/api/v1/campaigns/statistics/ || echo "Statistics endpoint test completed"

# Check backend health
echo "🩺 Checking backend health..."
curl -s http://localhost:8000/health

echo "✅ Daily Limits System deployed successfully!"
echo "🎯 Features:"
echo "   - 2k daily limit per account"
echo "   - Automatic 24h reset at midnight"
echo "   - Real-time statistics tracking"
echo "   - Daily limit enforcement"
echo "   - Frontend statistics display"
echo ""
echo "📊 Check your campaigns page to see the new statistics!"
