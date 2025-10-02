#!/bin/bash

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

clear
echo -e "${RED}╔══════════════════════════════════════════════╗${NC}"
echo -e "${RED}║         FIX ACCOUNTS LOADING ISSUE           ║${NC}"
echo -e "${RED}╚══════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}🔍 Step 1: Checking what's running...${NC}"
docker-compose ps
echo ""

echo -e "${YELLOW}🔧 Step 2: Starting backend service...${NC}"
docker-compose up -d backend
echo ""

echo -e "${YELLOW}⏳ Step 3: Waiting for backend to start...${NC}"
sleep 15
echo ""

echo -e "${YELLOW}📋 Step 4: Backend logs (last 30 lines)...${NC}"
docker-compose logs --tail=30 backend
echo ""

echo -e "${YELLOW}🌐 Step 5: Testing backend health...${NC}"
curl -s http://localhost:8000/health && echo " ✅ Backend is responding!" || echo " ❌ Backend still not responding"
echo ""

echo -e "${YELLOW}🔍 Step 6: If backend is failing, checking for errors...${NC}"
docker-compose logs backend | grep -i "error\|failed\|exception\|traceback" | tail -10
echo ""

echo -e "${YELLOW}🔧 Step 7: Starting all services if backend alone failed...${NC}"
docker-compose up -d
echo ""

echo -e "${YELLOW}⏳ Step 8: Waiting for all services...${NC}"
sleep 20
echo ""

echo -e "${YELLOW}🔍 Step 9: Final status check...${NC}"
docker-compose ps
echo ""

echo -e "${YELLOW}🌐 Step 10: Final backend test...${NC}"
curl -s http://localhost:8000/health && echo " ✅ Backend is responding!" || echo " ❌ Backend still not responding"
echo ""

echo -e "${YELLOW}📋 Step 11: Testing accounts API...${NC}"
curl -s http://localhost:8000/api/v1/accounts && echo " ✅ Accounts API working!" || echo " ❌ Accounts API failed"
echo ""

echo -e "${GREEN}✅ ACCOUNTS LOADING FIX COMPLETE!${NC}"
echo ""

echo -e "${YELLOW}🌐 Test URLs:${NC}"
echo -e "   Backend Health: ${BLUE}http://172.236.219.75:8000/health${NC}"
echo -e "   Accounts API:   ${BLUE}http://172.236.219.75:8000/api/v1/accounts${NC}"
echo -e "   Frontend:       ${BLUE}http://172.236.219.75:3000${NC}"
echo ""

echo -e "${YELLOW}📋 If accounts still not loading:${NC}"
echo -e "   1. Check if backend is running: curl http://172.236.219.75:8000/health"
echo -e "   2. Check accounts API: curl http://172.236.219.75:8000/api/v1/accounts"
echo -e "   3. Check frontend console for errors"
echo -e "   4. Make sure you have uploaded accounts in the Accounts section"
echo ""
