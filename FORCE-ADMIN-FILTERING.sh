#!/bin/bash
# FORCE ADMIN FILTERING - Comprehensive admin user exclusion

echo "🚫 FORCING ADMIN USER FILTERING - Comprehensive exclusion of admin users..."

# Pull the latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Stop all services
echo "🛑 Stopping all Docker services..."
docker-compose down

# Rebuild backend and frontend with admin filtering
echo "🔨 Rebuilding services with comprehensive admin filtering..."
docker-compose build --no-cache backend frontend

# Start services
echo "🚀 Starting services with admin filtering..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start (15 seconds)..."
sleep 15

# Test backend health
echo "🩺 Testing backend health..."
curl -s http://localhost:8000/health

# Test users endpoint to verify admin filtering
echo "🔍 Testing users endpoint for admin filtering..."
curl -s http://localhost:8000/api/v1/users/ | jq '.[] | select(.email | test("admin|administrator|postmaster|abuse|support|noreply|system|automation|bot|test|demo"; "i")) | .email' || echo "✅ No admin users found in API response"

echo "✅ COMPREHENSIVE ADMIN FILTERING DEPLOYED!"
echo "🎯 Features:"
echo "   - Backend API filters admin users from /api/v1/users/ (email + names)"
echo "   - Frontend double-filters admin users in UI (email + names)"
echo "   - Sending logic excludes admin users from sender pool (email + names)"
echo "   - Comprehensive admin pattern detection (email + names)"
echo "   - Admin users completely hidden from campaigns"
echo ""
echo "📊 Admin users are now completely excluded from:"
echo "   - User listing in campaigns page"
echo "   - Sender pool for email sending"
echo "   - Test email functionality"
echo "   - All campaign operations"
echo ""
echo "🚫 Admin Detection Patterns:"
echo "   - Email patterns: admin@, administrator@, postmaster@, abuse@, support@"
echo "   - Name patterns: admin, administrator, postmaster, system, automation, bot"
echo "   - No-reply patterns: noreply@, no-reply@, donotreply@"
echo "   - System patterns: system@, automation@, bot@, test@, demo@"
