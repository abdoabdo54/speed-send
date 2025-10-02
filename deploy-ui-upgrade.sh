#!/bin/bash

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

clear

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                            ║${NC}"
echo -e "${BLUE}║      ${CYAN}SPEED-SEND UI UPGRADE v2.0${BLUE}         ║${NC}"
echo -e "${BLUE}║                                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${CYAN}📥 Step 1: Pulling latest changes from GitHub...${NC}"
git pull origin main
echo -e "${GREEN}✅ Code updated!${NC}"
echo ""

echo -e "${CYAN}🛑 Step 2: Stopping services...${NC}"
docker-compose stop backend frontend celery_worker
echo -e "${GREEN}✅ Services stopped!${NC}"
echo ""

echo -e "${CYAN}🔨 Step 3: Rebuilding frontend with new dependencies...${NC}"
echo -e "${YELLOW}   Installing: react-quill, papaparse, xlsx, recharts...${NC}"
docker-compose build frontend
echo -e "${GREEN}✅ Frontend rebuilt!${NC}"
echo ""

echo -e "${CYAN}🔨 Step 4: Rebuilding backend...${NC}"
docker-compose build backend
echo -e "${GREEN}✅ Backend rebuilt!${NC}"
echo ""

echo -e "${CYAN}🚀 Step 5: Starting all services...${NC}"
docker-compose up -d
echo -e "${GREEN}✅ All services started!${NC}"
echo ""

echo -e "${CYAN}⏳ Step 6: Waiting for services to be ready...${NC}"
sleep 10
echo -e "${GREEN}✅ Services ready!${NC}"
echo ""

echo -e "${CYAN}📊 Step 7: Checking service status...${NC}"
docker-compose ps
echo ""

echo -e "${BLUE}════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ DEPLOYMENT COMPLETE!${NC}"
echo -e "${BLUE}════════════════════════════════════════════${NC}"
echo ""

echo -e "${YELLOW}🎉 What's New:${NC}"
echo -e "   ${CYAN}✨ Professional Speed-Send Branding${NC}"
echo -e "   ${CYAN}📊 Enhanced Dashboard with live stats${NC}"
echo -e "   ${CYAN}📇 Contacts Management (Import CSV/Excel)${NC}"
echo -e "   ${CYAN}📈 Analytics & Reports page${NC}"
echo -e "   ${CYAN}⚡ PowerMTA Mode indicator${NC}"
echo -e "   ${CYAN}🎨 Modern, clean UI design${NC}"
echo ""

echo -e "${YELLOW}📱 New Pages:${NC}"
echo -e "   ${GREEN}Dashboard${NC}     - http://$(hostname -I | awk '{print $1}'):3000/"
echo -e "   ${GREEN}Accounts${NC}      - http://$(hostname -I | awk '{print $1}'):3000/accounts"
echo -e "   ${GREEN}Contacts${NC}      - http://$(hostname -I | awk '{print $1}'):3000/contacts"
echo -e "   ${GREEN}Campaigns${NC}     - http://$(hostname -I | awk '{print $1}'):3000/campaigns"
echo -e "   ${GREEN}Analytics${NC}     - http://$(hostname -I | awk '{print $1}'):3000/analytics"
echo ""

echo -e "${CYAN}🔍 Quick Test:${NC}"
echo -e "   1. Visit the ${GREEN}Dashboard${NC} to see live stats"
echo -e "   2. Go to ${GREEN}Contacts${NC} to import recipients"
echo -e "   3. Create a ${GREEN}Campaign${NC} with the new builder"
echo -e "   4. Check ${GREEN}Analytics${NC} for detailed reports"
echo ""

echo -e "${YELLOW}📋 Backend logs (last 20 lines):${NC}"
docker-compose logs --tail=20 backend
echo ""

echo -e "${GREEN}🚀 Ready to send emails at PowerMTA speed!${NC}"
echo ""

