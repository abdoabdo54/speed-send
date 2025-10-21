#!/bin/bash

echo "🚀 Fixing empty database by adding sample data..."

# Navigate to the project directory
cd /opt/speed-send

# Run the sample data script
echo "📊 Adding sample accounts, users, and contacts..."
docker exec -it gmail_saas_backend python /app/add_sample_data.py

echo "✅ Database fix completed!"
echo "🔄 Please refresh your frontend to see the accounts and contacts."
