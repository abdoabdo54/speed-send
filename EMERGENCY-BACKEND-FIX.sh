#!/bin/bash

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

clear
echo -e "${RED}╔══════════════════════════════════════════════╗${NC}"
echo -e "${RED}║         EMERGENCY BACKEND FIX               ║${NC}"
echo -e "${RED}╚══════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}🔍 Checking what's running...${NC}"
docker-compose ps
echo ""

echo -e "${YELLOW}📋 Checking if backend container exists...${NC}"
docker ps -a | grep backend
echo ""

echo -e "${YELLOW}🔧 Starting ALL services...${NC}"
docker-compose up -d
echo ""

echo -e "${YELLOW}⏳ Waiting for services to start...${NC}"
sleep 15
echo ""

echo -e "${YELLOW}🔍 Checking status after start...${NC}"
docker-compose ps
echo ""

echo -e "${YELLOW}📋 Backend logs (last 30 lines)...${NC}"
docker-compose logs --tail=30 backend
echo ""

echo -e "${YELLOW}🌐 Testing backend connection...${NC}"
curl -s http://localhost:8000/health && echo " ✅ Backend is responding!" || echo " ❌ Backend still not responding"
echo ""

echo -e "${YELLOW}🔍 Testing from external IP...${NC}"
curl -s http://172.236.219.75:8000/health && echo " ✅ External access working!" || echo " ❌ External access failed"
echo ""

echo -e "${YELLOW}📋 If backend is still failing, checking for specific errors...${NC}"
docker-compose logs backend | grep -i "error\|failed\|exception" | tail -10
echo ""

echo -e "${GREEN}✅ EMERGENCY FIX COMPLETE!${NC}"
echo ""

echo -e "${YELLOW}🌐 Test URLs:${NC}"
echo -e "   Local:    ${BLUE}http://localhost:8000/health${NC}"
echo -e "   External: ${BLUE}http://172.236.219.75:8000/health${NC}"
echo -e "   Frontend: ${BLUE}http://172.236.219.75:3000${NC}"
echo ""

echo -e "${YELLOW}📋 If still failing, try:${NC}"
echo -e "   docker-compose down"
echo -e "   docker-compose up -d"
echo -e "   docker-compose logs backend"
echo ""
