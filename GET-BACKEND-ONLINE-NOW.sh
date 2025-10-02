#!/bin/bash

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

clear
echo -e "${RED}╔══════════════════════════════════════════════╗${NC}"
echo -e "${RED}║         GET BACKEND ONLINE NOW               ║${NC}"
echo -e "${RED}╚══════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}🔍 Checking what containers are running...${NC}"
docker-compose ps
echo ""

echo -e "${YELLOW}📋 Checking all containers (including stopped)...${NC}"
docker ps -a
echo ""

echo -e "${YELLOW}🔧 Starting backend service specifically...${NC}"
docker-compose up -d backend
echo ""

echo -e "${YELLOW}⏳ Waiting for backend to start...${NC}"
sleep 10
echo ""

echo -e "${YELLOW}🔍 Checking backend status...${NC}"
docker-compose ps backend
echo ""

echo -e "${YELLOW}📋 Backend logs (last 20 lines)...${NC}"
docker-compose logs --tail=20 backend
echo ""

echo -e "${YELLOW}🌐 Testing backend connection...${NC}"
curl -s http://localhost:8000/health && echo " ✅ Backend is responding!" || echo " ❌ Backend still not responding"
echo ""

echo -e "${YELLOW}🔍 If backend is failing, checking for specific errors...${NC}"
docker-compose logs backend | grep -i "error\|failed\|exception\|traceback" | tail -10
echo ""

echo -e "${YELLOW}🔧 If backend is not running, trying to start all services...${NC}"
docker-compose up -d
echo ""

echo -e "${YELLOW}⏳ Waiting for all services...${NC}"
sleep 15
echo ""

echo -e "${YELLOW}🔍 Final status check...${NC}"
docker-compose ps
echo ""

echo -e "${YELLOW}🌐 Final backend test...${NC}"
curl -s http://localhost:8000/health && echo " ✅ Backend is responding!" || echo " ❌ Backend still not responding"
echo ""

echo -e "${GREEN}✅ BACKEND DIAGNOSTIC COMPLETE!${NC}"
echo ""

echo -e "${YELLOW}🌐 Test URLs:${NC}"
echo -e "   Local:    ${BLUE}http://localhost:8000/health${NC}"
echo -e "   External: ${BLUE}http://172.236.219.75:8000/health${NC}"
echo ""

echo -e "${YELLOW}📋 If backend is still failing, the logs above will show the exact error.${NC}"
echo ""
