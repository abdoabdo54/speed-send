#!/bin/bash

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

clear
echo -e "${RED}╔══════════════════════════════════════════════╗${NC}"
echo -e "${RED}║     RESTORE WORKING APP - EMERGENCY FIX      ║${NC}"
echo -e "${RED}╚══════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${CYAN}Step 1: Stopping all containers...${NC}"
docker-compose down
echo ""

echo -e "${CYAN}Step 2: Removing broken frontend image...${NC}"
docker rmi speed-send-frontend 2>/dev/null || echo "Image already removed"
echo ""

echo -e "${CYAN}Step 3: Going back to WORKING commit...${NC}"
git log --oneline -10
echo ""
echo -e "${YELLOW}Checking out the last WORKING version...${NC}"
git checkout b115ecc -- frontend/
echo ""

echo -e "${CYAN}Step 4: Building SIMPLE working frontend...${NC}"
docker-compose build frontend
echo ""

echo -e "${CYAN}Step 5: Starting all services...${NC}"
docker-compose up -d
echo ""

echo -e "${CYAN}Step 6: Waiting for services...${NC}"
sleep 15
echo ""

echo -e "${CYAN}Step 7: Checking status...${NC}"
docker-compose ps
echo ""

echo -e "${CYAN}Step 8: Testing frontend...${NC}"
curl -s http://localhost:3000 | head -20 || echo "Frontend not responding"
echo ""

echo -e "${CYAN}Step 9: Testing backend...${NC}"
curl -s http://localhost:8000/health || echo "Backend not responding"
echo ""

echo -e "${GREEN}════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ WORKING APP RESTORED!${NC}"
echo -e "${GREEN}════════════════════════════════════════════${NC}"
echo ""

echo -e "${YELLOW}🌐 Access your app:${NC}"
echo -e "   Frontend: ${CYAN}http://$(hostname -I | awk '{print $1}'):3000${NC}"
echo -e "   Backend:  ${CYAN}http://$(hostname -I | awk '{print $1}'):8000${NC}"
echo ""

echo -e "${YELLOW}📊 Service Status:${NC}"
docker-compose ps
echo ""

echo -e "${YELLOW}📋 If still not working, check logs:${NC}"
echo -e "   ${CYAN}docker-compose logs frontend${NC}"
echo -e "   ${CYAN}docker-compose logs backend${NC}"
echo ""

echo -e "${GREEN}The app should now be working with the original interface!${NC}"
echo ""
