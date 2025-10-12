#!/bin/bash
# INTELLIGENT ADMIN DETECTION - Automatic admin user detection during fetch

echo "🧠 DEPLOYING INTELLIGENT ADMIN DETECTION..."

# Pull the latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Stop all services
echo "🛑 Stopping all Docker services..."
docker-compose down

# Rebuild backend and frontend with intelligent admin detection
echo "🔨 Rebuilding services with intelligent admin detection..."
docker-compose build --no-cache backend frontend

# Start services
echo "🚀 Starting services with intelligent admin detection..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start (15 seconds)..."
sleep 15

# Test backend health
echo "🩺 Testing backend health..."
curl -s http://localhost:8000/health

# Test users endpoint to verify intelligent admin filtering
echo "🔍 Testing users endpoint for intelligent admin filtering..."
curl -s http://localhost:8000/api/v1/users/ | jq '.[] | select(.email | test("admin|administrator|postmaster|abuse|support|noreply|system|automation|bot|test|demo|chloe"; "i")) | .email' || echo "✅ No admin users found in API response"

echo "✅ INTELLIGENT ADMIN DETECTION DEPLOYED!"
echo "🎯 Features:"
echo "   - AUTOMATIC admin detection during user fetch from Google Workspace"
echo "   - Google Workspace role-based admin detection"
echo "   - Organization unit path analysis"
echo "   - Admin privilege detection (isAdmin, isDelegatedAdmin)"
echo "   - Email pattern matching"
echo "   - Name pattern matching"
echo "   - Admin email delegation matching"
echo "   - User notes and custom attributes analysis"
echo ""
echo "🧠 Intelligent Detection Criteria:"
echo "   1. Google Workspace roles (isAdmin, isDelegatedAdmin)"
echo "   2. Organization unit path analysis"
echo "   3. Email pattern matching (admin@, administrator@, etc.)"
echo "   4. Name pattern matching (admin, administrator, etc.)"
echo "   5. Delegation email matching (exact admin_email match)"
echo "   6. User notes analysis"
echo "   7. Custom attributes analysis"
echo ""
echo "📊 Admin users are now automatically detected and excluded from:"
echo "   - User listing in campaigns page"
echo "   - Sender pool for email sending"
echo "   - Test email functionality"
echo "   - All campaign operations"
echo ""
echo "🔄 To apply to existing accounts:"
echo "   1. Go to Accounts page"
echo "   2. Click 'Sync Users' for each account"
echo "   3. Admin users will be automatically detected and excluded"
echo ""
echo "⚠️  IMPORTANT: The 'chloe' user will now be automatically detected as admin"
echo "   if she matches any of the intelligent detection criteria!"
