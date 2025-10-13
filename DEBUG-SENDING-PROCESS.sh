#!/bin/bash

echo "========================================"
echo "🔍 DEBUGGING SENDING PROCESS"
echo "========================================"
echo ""

cd /opt/speed-send || exit 1

echo "1️⃣ Pulling latest code..."
git pull origin main

echo ""
echo "2️⃣ Checking Docker services..."
docker-compose ps

echo ""
echo "3️⃣ Checking Celery workers..."
docker-compose logs --tail=20 celery_worker

echo ""
echo "4️⃣ Checking Redis..."
docker-compose logs --tail=10 redis

echo ""
echo "5️⃣ Testing Gmail API directly..."
docker-compose exec backend python /opt/speed-send/test-gmail-api-direct.py

echo ""
echo "6️⃣ Checking campaign status in database..."
docker-compose exec postgres psql -U gmailsaas -d gmailsaas -c "
SELECT 
    c.id, 
    c.name, 
    c.status, 
    c.total_recipients,
    c.sent_count,
    c.failed_count,
    c.celery_task_id
FROM campaigns c 
ORDER BY c.id DESC 
LIMIT 5;
"

echo ""
echo "7️⃣ Checking email logs..."
docker-compose exec postgres psql -U gmailsaas -d gmailsaas -c "
SELECT 
    el.id,
    el.campaign_id,
    el.recipient_email,
    el.sender_email,
    el.status,
    el.sent_at
FROM email_logs el 
ORDER BY el.id DESC 
LIMIT 10;
"

echo ""
echo "8️⃣ Checking Celery task queue..."
docker-compose exec redis redis-cli llen celery

echo ""
echo "9️⃣ Checking Celery task results..."
docker-compose exec redis redis-cli keys "celery-task-meta-*" | head -5

echo ""
echo "========================================"
echo "🔧 FIXING CELERY WORKERS..."
echo "========================================"

echo "Restarting Celery workers..."
docker-compose restart celery_worker

echo "Waiting for workers to start..."
sleep 5

echo "Checking worker status..."
docker-compose logs --tail=10 celery_worker

echo ""
echo "========================================"
echo "🧪 TESTING COMPLETE SENDING FLOW..."
echo "========================================"

echo "Creating test campaign via API..."
curl -X POST "http://localhost:8000/api/v1/campaigns/" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "DEBUG-TEST",
    "subject": "Debug Test",
    "body_html": "<h1>Debug Test</h1>",
    "body_plain": "Debug Test",
    "from_name": "Debug",
    "recipients": [{"email": "salssapp@gmail.com", "variables": {}}],
    "sender_account_ids": [1]
  }' | jq .

echo ""
echo "Getting campaign ID..."
CAMPAIGN_ID=$(docker-compose exec postgres psql -U gmailsaas -d gmailsaas -t -c "SELECT id FROM campaigns WHERE name = 'DEBUG-TEST' ORDER BY id DESC LIMIT 1;" | tr -d ' ')

if [ -n "$CAMPAIGN_ID" ]; then
    echo "Campaign ID: $CAMPAIGN_ID"
    
    echo ""
    echo "Preparing campaign..."
    curl -X POST "http://localhost:8000/api/v1/campaigns/$CAMPAIGN_ID/prepare" | jq .
    
    echo ""
    echo "Launching campaign..."
    curl -X POST "http://localhost:8000/api/v1/campaigns/$CAMPAIGN_ID/launch" | jq .
    
    echo ""
    echo "Waiting 10 seconds for processing..."
    sleep 10
    
    echo ""
    echo "Checking campaign status..."
    docker-compose exec postgres psql -U gmailsaas -d gmailsaas -c "
    SELECT 
        c.id, 
        c.name, 
        c.status, 
        c.sent_count,
        c.failed_count,
        c.celery_task_id
    FROM campaigns c 
    WHERE c.id = $CAMPAIGN_ID;
    "
    
    echo ""
    echo "Checking email logs..."
    docker-compose exec postgres psql -U gmailsaas -d gmailsaas -c "
    SELECT 
        el.recipient_email,
        el.sender_email,
        el.status,
        el.sent_at,
        el.message_id
    FROM email_logs el 
    WHERE el.campaign_id = $CAMPAIGN_ID;
    "
else
    echo "❌ No campaign found"
fi

echo ""
echo "========================================"
echo "✅ DEBUG COMPLETE!"
echo "========================================"
echo ""
echo "🔍 Check the output above for issues:"
echo "   - Gmail API test should show '✅ Email sent successfully!'"
echo "   - Campaign should have status 'SENDING' or 'COMPLETED'"
echo "   - Email logs should show 'SENT' status"
echo "   - Celery workers should be running"
echo ""
