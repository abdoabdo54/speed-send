#!/bin/bash

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

clear
echo -e "${RED}╔══════════════════════════════════════════════╗${NC}"
echo -e "${RED}║         DEBUG ACCOUNTS API ISSUE            ║${NC}"
echo -e "${RED}╚══════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}🔍 Step 1: Testing backend health...${NC}"
curl -s http://localhost:8000/health && echo " ✅ Backend OK" || echo " ❌ Backend FAILED"
echo ""

echo -e "${YELLOW}📋 Step 2: Testing accounts API directly...${NC}"
curl -s http://localhost:8000/api/v1/accounts | jq . || echo " ❌ Accounts API FAILED or no JSON"
echo ""

echo -e "${YELLOW}🔍 Step 3: Checking backend logs for errors...${NC}"
docker-compose logs --tail=20 backend | grep -i "error\|exception\|traceback" || echo "No errors in logs"
echo ""

echo -e "${YELLOW}🌐 Step 4: Testing from external IP...${NC}"
curl -s http://172.236.219.75:8000/api/v1/accounts | jq . || echo " ❌ External API FAILED"
echo ""

echo -e "${YELLOW}🔍 Step 5: Checking frontend console errors...${NC}"
echo "Open browser console (F12) and check for:"
echo "  - Network errors in Console tab"
echo "  - Failed requests in Network tab"
echo "  - CORS errors"
echo ""

echo -e "${YELLOW}📋 Step 6: Testing CORS headers...${NC}"
curl -I http://localhost:8000/api/v1/accounts 2>/dev/null | grep -i "access-control" || echo "No CORS headers found"
echo ""

echo -e "${GREEN}✅ DEBUG COMPLETE!${NC}"
echo ""

echo -e "${YELLOW}🔧 Quick Fixes to Try:${NC}"
echo -e "   1. Check browser console for API errors"
echo -e "   2. Check if CORS is blocking the request"
echo -e "   3. Check if API URL is correct in frontend"
echo -e "   4. Check if backend is responding to accounts endpoint"
echo ""

echo -e "${YELLOW}🌐 Test URLs:${NC}"
echo -e "   Backend:  ${BLUE}http://172.236.219.75:8000/api/v1/accounts${NC}"
echo -e "   Frontend: ${BLUE}http://172.236.219.75:3000/campaigns/new${NC}"
echo ""
