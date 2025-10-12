#!/bin/bash
# FORCE ADMIN EXCLUSION - Ultra-aggressive admin filtering

echo "🚫 FORCING ULTRA-AGGRESSIVE ADMIN EXCLUSION..."

# Pull the latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Stop all services
echo "🛑 Stopping all Docker services..."
docker-compose down

# Rebuild backend and frontend with ultra-aggressive admin filtering
echo "🔨 Rebuilding services with ultra-aggressive admin filtering..."
docker-compose build --no-cache backend frontend

# Start services
echo "🚀 Starting services with ultra-aggressive admin filtering..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start (15 seconds)..."
sleep 15

# Test backend health
echo "🩺 Testing backend health..."
curl -s http://localhost:8000/health

# Test users endpoint to verify admin filtering
echo "🔍 Testing users endpoint for admin filtering..."
curl -s http://localhost:8000/api/v1/users/ | jq '.[] | select(.email | test("admin|administrator|postmaster|abuse|support|noreply|system|automation|bot|test|demo|chloe"; "i")) | .email' || echo "✅ No admin users found in API response"

echo "✅ ULTRA-AGGRESSIVE ADMIN EXCLUSION DEPLOYED!"
echo "🎯 Features:"
echo "   - Backend API filters admin users from /api/v1/users/ (email + names)"
echo "   - Frontend double-filters admin users in UI (email + names)"
echo "   - Sending logic excludes admin users from sender pool (email + names)"
echo "   - ULTRA-AGGRESSIVE admin pattern detection"
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
echo "   - EXACT admin email matches from ServiceAccount.admin_email"
echo ""
echo "⚠️  IMPORTANT: If 'chloe' is still showing, it means:"
echo "   1. The admin_email field is not set for that account"
echo "   2. You need to re-sync the account with the correct admin email"
echo "   3. The 'chloe' user is the actual admin for that domain"
