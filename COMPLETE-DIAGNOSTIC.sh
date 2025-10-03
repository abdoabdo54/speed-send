#!/bin/bash

echo "========================================"
echo "🔍 COMPLETE SENDING PROCESS DIAGNOSTIC"
echo "========================================"
echo ""

cd /opt/speed-send || exit 1

echo "1️⃣ Pulling latest code..."
git pull origin main

echo ""
echo "2️⃣ Checking all services..."
docker-compose ps

echo ""
echo "3️⃣ Testing backend API directly..."
echo "Testing campaign creation endpoint..."

# Test campaign creation
echo "Creating test campaign..."
CREATE_RESPONSE=$(curl -s -X POST "http://localhost:8000/api/v1/campaigns/" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "DIAGNOSTIC-TEST",
    "subject": "Diagnostic Test",
    "body_html": "<h1>Test</h1>",
    "body_plain": "Test",
    "from_name": "Test",
    "recipients": [{"email": "salssapp@gmail.com", "variables": {}}],
    "sender_account_ids": [1]
  }')

echo "Campaign creation response:"
echo "$CREATE_RESPONSE"

# Extract campaign ID
CAMPAIGN_ID=$(echo "$CREATE_RESPONSE" | jq -r '.id' 2>/dev/null)

if [ "$CAMPAIGN_ID" != "null" ] && [ -n "$CAMPAIGN_ID" ]; then
    echo ""
    echo "Campaign ID: $CAMPAIGN_ID"
    
    echo ""
    echo "4️⃣ Testing prepare endpoint..."
    PREPARE_RESPONSE=$(curl -s -X POST "http://localhost:8000/api/v1/campaigns/$CAMPAIGN_ID/prepare")
    echo "Prepare response:"
    echo "$PREPARE_RESPONSE"
    
    echo ""
    echo "5️⃣ Testing launch endpoint..."
    LAUNCH_RESPONSE=$(curl -s -X POST "http://localhost:8000/api/v1/campaigns/$CAMPAIGN_ID/launch")
    echo "Launch response:"
    echo "$LAUNCH_RESPONSE"
    
    echo ""
    echo "6️⃣ Checking database after launch..."
    echo "Campaign status:"
    docker-compose exec postgres psql -U gmailsaas -d gmailsaas -c "SELECT id,name,status,sent_count,failed_count FROM campaigns WHERE id = $CAMPAIGN_ID;"
    
    echo ""
    echo "Email logs:"
    docker-compose exec postgres psql -U gmailsaas -d gmailsaas -c "SELECT campaign_id,recipient_email,sender_email,status,message_id,sent_at FROM email_logs WHERE campaign_id = $CAMPAIGN_ID;"
    
else
    echo "❌ Failed to create campaign"
    echo "Response: $CREATE_RESPONSE"
fi

echo ""
echo "7️⃣ Checking backend logs..."
echo "Last 50 lines of backend logs:"
docker-compose logs --tail=50 backend

echo ""
echo "8️⃣ Checking if accounts and users exist..."
echo "Service accounts:"
docker-compose exec postgres psql -U gmailsaas -d gmailsaas -c "SELECT id,name,client_email,total_users FROM service_accounts;"

echo ""
echo "Workspace users:"
docker-compose exec postgres psql -U gmailsaas -d gmailsaas -c "SELECT id,email,service_account_id,is_active FROM workspace_users LIMIT 10;"

echo ""
echo "9️⃣ Testing direct Gmail API again..."
docker-compose exec backend python /tmp/test-gmail-api-direct.py

echo ""
echo "========================================"
echo "✅ DIAGNOSTIC COMPLETE"
echo "========================================"
echo ""
echo "🔍 Key things to check:"
echo "   - Campaign creation should return campaign ID"
echo "   - Prepare should return success message"
echo "   - Launch should return success with sent/failed counts"
echo "   - Database should show campaign status as COMPLETED"
echo "   - Email logs should show SENT status with message_id"
echo "   - Backend logs should show Gmail API calls"
echo ""
