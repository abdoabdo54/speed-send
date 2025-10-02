#!/bin/bash

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  DEPLOYING NEW CAMPAIGN SYSTEM${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

echo -e "${CYAN}📥 Step 1: Pulling latest changes...${NC}"
git pull origin main

echo ""
echo -e "${CYAN}🗄️  Step 2: Adding new database columns...${NC}"

# Add new columns to campaigns table
docker-compose exec -T postgres psql -U gmailsaas -d gmail_saas << 'SQL'
-- Add new campaign fields if they don't exist
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS from_name VARCHAR(255);
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS from_email VARCHAR(255);
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS reply_to VARCHAR(255);
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS return_path VARCHAR(255);
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS use_ip_pool BOOLEAN DEFAULT FALSE;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS ip_pool JSON;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS prepared_at TIMESTAMPTZ;

-- Show confirmation
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'campaigns' 
ORDER BY ordinal_position;
SQL

echo ""
echo -e "${GREEN}✅ Database migration complete!${NC}"

echo ""
echo -e "${CYAN}🛑 Step 3: Stopping services...${NC}"
docker-compose stop backend frontend celery_worker

echo ""
echo -e "${CYAN}🔨 Step 4: Rebuilding containers...${NC}"
docker-compose build backend frontend

echo ""
echo -e "${CYAN}🚀 Step 5: Starting all services...${NC}"
docker-compose up -d

echo ""
echo -e "${CYAN}⏳ Step 6: Waiting for services to be ready...${NC}"
sleep 10

echo ""
echo -e "${CYAN}📊 Step 7: Checking service status...${NC}"
docker-compose ps

echo ""
echo -e "${CYAN}📋 Step 8: Backend logs (last 30 lines)...${NC}"
docker-compose logs --tail=30 backend

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ DEPLOYMENT COMPLETE!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}📌 What's New:${NC}"
echo -e "   • Single-page professional campaign builder"
echo -e "   • Prepare → Launch workflow (not queued anymore)"
echo -e "   • Advanced sender settings (From Name, Reply-To, Return-Path)"
echo -e "   • Test mode toggle"
echo -e "   • Custom headers support"
echo -e "   • New campaign statuses: DRAFT → PREPARING → READY → SENDING → COMPLETED"
echo ""
echo -e "${YELLOW}📖 How to use:${NC}"
echo -e "   1. Create a campaign (all settings in one page)"
echo -e "   2. Click 'Prepare' to create all email logs"
echo -e "   3. Click 'Launch' to send all emails instantly"
echo ""
echo -e "${CYAN}🌐 Access your app at:${NC}"
echo -e "   Frontend: http://$(hostname -I | awk '{print $1}'):3000"
echo -e "   Backend: http://$(hostname -I | awk '{print $1}'):8000"
echo ""

