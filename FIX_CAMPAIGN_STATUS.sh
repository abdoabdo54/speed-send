#!/bin/bash

echo "🔧 Fixing campaign statuses for existing campaigns..."

# Navigate to the project directory
cd /opt/speed-send

# Pull the latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Run the campaign status fix script
echo "🔍 Running campaign status fix..."
docker-compose exec backend python /app/fix_campaign_status.py

echo "✅ Campaign status fix completed!"
echo "🎯 Check your campaigns page - FAILED campaigns with 0 failed emails should now show COMPLETED"
