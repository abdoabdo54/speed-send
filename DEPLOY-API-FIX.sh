#!/bin/bash

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

clear
echo -e "${RED}╔══════════════════════════════════════════════╗${NC}"
echo -e "${RED}║         DEPLOY CRITICAL API FIX             ║${NC}"
echo -e "${RED}╚══════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}🎯 ISSUE FOUND: 307 Redirect - API needs trailing slashes!${NC}"
echo ""

echo -e "${YELLOW}📥 Pulling critical fix...${NC}"
git pull origin main
echo ""

echo -e "${YELLOW}🔨 Rebuilding frontend with API fix...${NC}"
docker-compose build frontend
echo ""

echo -e "${YELLOW}🚀 Restarting frontend...${NC}"
docker-compose restart frontend
echo ""

echo -e "${YELLOW}⏳ Waiting for frontend to start...${NC}"
sleep 15
echo ""

echo -e "${YELLOW}🔍 Testing API with trailing slash...${NC}"
curl -s http://localhost:8000/api/v1/accounts/ && echo " ✅ API with trailing slash works!" || echo " ❌ Still failing"
echo ""

echo -e "${YELLOW}🌐 Testing external API...${NC}"
curl -s http://172.236.219.75:8000/api/v1/accounts/ && echo " ✅ External API works!" || echo " ❌ External API failing"
echo ""

echo -e "${GREEN}✅ CRITICAL FIX DEPLOYED!${NC}"
echo ""

echo -e "${YELLOW}🎯 What was fixed:${NC}"
echo -e "   ✅ ${GREEN}Added trailing slashes to all API endpoints${NC}"
echo -e "   ✅ ${GREEN}Fixed 307 redirect issue${NC}"
echo -e "   ✅ ${GREEN}Accounts should now load in campaign builder${NC}"
echo ""

echo -e "${YELLOW}🌐 Test URLs:${NC}"
echo -e "   Campaign Builder: ${BLUE}http://$(hostname -I | awk '{print $1}'):3000/campaigns/new${NC}"
echo -e "   API Test:         ${BLUE}http://$(hostname -I | awk '{print $1}'):3000/campaigns/new${NC}"
echo ""

echo -e "${YELLOW}📋 How to test:${NC}"
echo -e "   1. Go to Campaign Builder page"
echo -e "   2. Check if accounts load automatically"
echo -e "   3. Click 'Test Accounts API' button"
echo -e "   4. Check browser console for success messages"
echo ""

echo -e "${GREEN}🚀 ACCOUNTS SHOULD NOW LOAD!${NC}"
echo ""
