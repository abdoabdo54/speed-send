#!/bin/bash

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

clear

echo -e "${RED}╔════════════════════════════════════════════╗${NC}"
echo -e "${RED}║    COMPLETE DIAGNOSTIC & FIX SCRIPT        ║${NC}"
echo -e "${RED}╚════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${CYAN}🔍 Step 1: Checking what's currently running...${NC}"
echo ""
echo -e "${YELLOW}Docker containers:${NC}"
docker-compose ps
echo ""

echo -e "${CYAN}🔍 Step 2: Checking frontend build status...${NC}"
docker-compose logs --tail=50 frontend | grep -i "error\|failed\|ready"
echo ""

echo -e "${CYAN}🔍 Step 3: Checking backend status...${NC}"
docker-compose logs --tail=30 backend
echo ""

echo -e "${CYAN}🔍 Step 4: Testing if backend API is responding...${NC}"
curl -s http://localhost:8000/health || echo "Backend NOT responding!"
echo ""

echo -e "${CYAN}🔍 Step 5: Checking database connection...${NC}"
docker-compose exec -T postgres psql -U gmailsaas -d gmail_saas -c "\dt" 2>&1 | head -20
echo ""

echo -e "${CYAN}🔍 Step 6: Checking campaigns table structure...${NC}"
docker-compose exec -T postgres psql -U gmailsaas -d gmail_saas -c "\d campaigns" 2>&1
echo ""

echo -e "${RED}════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Now applying COMPLETE FIX...${NC}"
echo -e "${RED}════════════════════════════════════════════${NC}"
echo ""

echo -e "${CYAN}🛑 Step 7: Stopping ALL containers...${NC}"
docker-compose down
echo ""

echo -e "${CYAN}📥 Step 8: Pulling LATEST code...${NC}"
git pull origin main
echo ""

echo -e "${CYAN}🗄️  Step 9: Updating database schema...${NC}"
docker-compose up -d postgres
sleep 5

# Add ALL new columns
docker-compose exec -T postgres psql -U gmailsaas -d gmail_saas << 'SQL'
-- Add new campaign fields
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS from_name VARCHAR(255);
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS from_email VARCHAR(255);
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS reply_to VARCHAR(255);
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS return_path VARCHAR(255);
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS use_ip_pool BOOLEAN DEFAULT FALSE;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS ip_pool JSON;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS prepared_at TIMESTAMPTZ;

-- Show what we have
SELECT column_name FROM information_schema.columns WHERE table_name = 'campaigns' ORDER BY ordinal_position;
SQL

echo ""
echo -e "${GREEN}✅ Database updated!${NC}"
echo ""

echo -e "${CYAN}🧹 Step 10: Cleaning Docker build cache...${NC}"
docker-compose build --no-cache frontend
docker-compose build --no-cache backend
echo ""

echo -e "${CYAN}🚀 Step 11: Starting ALL services...${NC}"
docker-compose up -d
echo ""

echo -e "${CYAN}⏳ Step 12: Waiting for services to start...${NC}"
sleep 15
echo ""

echo -e "${CYAN}🔍 Step 13: Final verification...${NC}"
docker-compose ps
echo ""

echo -e "${CYAN}📊 Frontend logs (checking for errors):${NC}"
docker-compose logs --tail=30 frontend
echo ""

echo -e "${CYAN}📊 Backend logs (checking for errors):${NC}"
docker-compose logs --tail=30 backend
echo ""

echo -e "${GREEN}════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ COMPLETE FIX APPLIED!${NC}"
echo -e "${GREEN}════════════════════════════════════════════${NC}"
echo ""

echo -e "${YELLOW}🌐 Access your app:${NC}"
echo -e "   Frontend: ${CYAN}http://$(hostname -I | awk '{print $1}'):3000${NC}"
echo -e "   Backend:  ${CYAN}http://$(hostname -I | awk '{print $1}'):8000${NC}"
echo ""

echo -e "${YELLOW}⚠️  IMPORTANT: Clear your browser cache!${NC}"
echo -e "   Press: ${GREEN}Ctrl + Shift + R${NC} (Windows/Linux)"
echo -e "   Or:    ${GREEN}Cmd + Shift + R${NC} (Mac)"
echo -e "   Or open in ${GREEN}Incognito/Private mode${NC}"
echo ""

echo -e "${YELLOW}🧪 Test these URLs:${NC}"
echo -e "   1. Dashboard:  ${CYAN}http://$(hostname -I | awk '{print $1}'):3000/${NC}"
echo -e "   2. Accounts:   ${CYAN}http://$(hostname -I | awk '{print $1}'):3000/accounts${NC}"
echo -e "   3. Contacts:   ${CYAN}http://$(hostname -I | awk '{print $1}'):3000/contacts${NC}"
echo -e "   4. Campaigns:  ${CYAN}http://$(hostname -I | awk '{print $1}'):3000/campaigns${NC}"
echo -e "   5. Analytics:  ${CYAN}http://$(hostname -I | awk '{print $1}'):3000/analytics${NC}"
echo ""

echo -e "${RED}If you still see the old UI, your BROWSER is caching!${NC}"
echo -e "${GREEN}Solution: Use Incognito mode or hard refresh!${NC}"
echo ""

