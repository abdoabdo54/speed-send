#!/bin/bash

echo "🚀 Fixing empty database by adding sample data..."

# Navigate to the project directory
cd /opt/speed-send

# Copy the script into the container and run it
echo "📊 Adding sample accounts, users, and contacts..."
docker cp backend/add_sample_data.py gmail_saas_backend:/app/add_sample_data.py
docker exec -it gmail_saas_backend python /app/add_sample_data.py

echo "✅ Database fix completed!"
echo "🔄 Please refresh your frontend to see the accounts and contacts."
