#!/bin/bash

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

clear
echo -e "${RED}╔══════════════════════════════════════════════╗${NC}"
echo -e "${RED}║         DEPLOY SIMPLE SEND PAGE             ║${NC}"
echo -e "${RED}╚══════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}📥 Pulling simple send page...${NC}"
git pull origin main
echo ""

echo -e "${YELLOW}🔨 Rebuilding frontend...${NC}"
docker-compose build frontend
echo ""

echo -e "${YELLOW}🚀 Restarting frontend...${NC}"
docker-compose restart frontend
echo ""

echo -e "${YELLOW}⏳ Waiting for frontend...${NC}"
sleep 15
echo ""

echo -e "${YELLOW}🔍 Testing services...${NC}"
curl -s http://localhost:8000/health && echo " ✅ Backend OK" || echo " ❌ Backend FAILED"
curl -s http://localhost:3000 && echo " ✅ Frontend OK" || echo " ❌ Frontend FAILED"
echo ""

echo -e "${GREEN}✅ SIMPLE SEND PAGE DEPLOYED!${NC}"
echo ""

echo -e "${YELLOW}🎯 What's New:${NC}"
echo -e "   ✅ ${GREEN}Simple, clean interface${NC} - no complex settings"
echo -e "   ✅ ${GREEN}Just 6 fields${NC} - Campaign Name, From Name, Subject, Message, Recipients, Test Email"
echo -e "   ✅ ${GREEN}Auto-loads accounts${NC} - shows available accounts automatically"
echo -e "   ✅ ${GREEN}Test email button${NC} - send test before campaign"
echo -e "   ✅ ${GREEN}Send campaign button${NC} - launch to all recipients"
echo -e "   ✅ ${GREEN}Works immediately${NC} - no complex configuration needed"
echo ""

echo -e "${YELLOW}🌐 Access: ${BLUE}http://$(hostname -I | awk '{print $1}'):3000/campaigns/new${NC}"
echo ""

echo -e "${YELLOW}📋 How to use:${NC}"
echo -e "   1. Fill in: Campaign Name, From Name, Subject, Message"
echo -e "   2. Add recipients (one email per line)"
echo -e "   3. Add test email and click 'Send Test'"
echo -e "   4. Click 'Send Campaign' to launch"
echo ""

echo -e "${GREEN}🚀 Ready to send emails!${NC}"
echo ""
