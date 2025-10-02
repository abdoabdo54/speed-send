#!/bin/bash

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

clear
echo -e "${RED}╔══════════════════════════════════════════════╗${NC}"
echo -e "${RED}║         FINAL FIX FOR ACCOUNTS LOADING      ║${NC}"
echo -e "${RED}╚══════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}📥 Pulling latest fixes...${NC}"
git pull origin main
echo ""

echo -e "${YELLOW}🔨 Rebuilding frontend with account loading fixes...${NC}"
docker-compose build frontend
echo ""

echo -e "${YELLOW}🚀 Restarting frontend...${NC}"
docker-compose restart frontend
echo ""

echo -e "${YELLOW}⏳ Waiting for frontend to start...${NC}"
sleep 15
echo ""

echo -e "${YELLOW}🔍 Checking services...${NC}"
docker-compose ps
echo ""

echo -e "${YELLOW}🌐 Testing connections...${NC}"
curl -s http://localhost:8000/health && echo " ✅ Backend OK" || echo " ❌ Backend FAILED"
curl -s http://localhost:3000 && echo " ✅ Frontend OK" || echo " ❌ Frontend FAILED"
echo ""

echo -e "${YELLOW}📋 Testing accounts API...${NC}"
curl -s http://localhost:8000/api/v1/accounts && echo " ✅ Accounts API OK" || echo " ❌ Accounts API FAILED"
echo ""

echo -e "${GREEN}✅ ACCOUNTS LOADING FIX DEPLOYED!${NC}"
echo ""

echo -e "${YELLOW}🎯 What's Fixed:${NC}"
echo -e "   ✅ ${GREEN}Better error handling${NC} - Shows specific error messages"
echo -e "   ✅ ${GREEN}Console logging${NC} - Check browser console for details"
echo -e "   ✅ ${GREEN}Refresh button${NC} - Manual refresh if accounts don't load"
echo -e "   ✅ ${GREEN}Alert messages${NC} - User-friendly error notifications"
echo ""

echo -e "${YELLOW}🌐 Test URLs:${NC}"
echo -e "   Campaign Builder: ${BLUE}http://$(hostname -I | awk '{print $1}'):3000/campaigns/new${NC}"
echo -e "   Accounts Page:    ${BLUE}http://$(hostname -I | awk '{print $1}'):3000/accounts${NC}"
echo ""

echo -e "${YELLOW}📋 How to test:${NC}"
echo -e "   1. Go to Campaign Builder page"
echo -e "   2. Check browser console for loading messages"
echo -e "   3. Click 'Refresh' button if accounts don't load"
echo -e "   4. Check if error messages appear"
echo ""

echo -e "${GREEN}🚀 Ready to test accounts loading!${NC}"
echo ""
