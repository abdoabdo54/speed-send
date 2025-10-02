#!/bin/bash

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

clear
echo -e "${RED}╔══════════════════════════════════════════════╗${NC}"
echo -e "${RED}║     FORCE REBUILD FRONTEND - NUCLEAR FIX     ║${NC}"
echo -e "${RED}╚══════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}🔥 NUCLEAR CLEANUP - Removing everything...${NC}"
docker-compose down -v --rmi all
docker system prune -af
echo ""

echo -e "${YELLOW}📥 Pulling latest code...${NC}"
git pull origin main
echo ""

echo -e "${YELLOW}🔧 Checking frontend files...${NC}"
ls -la frontend/src/components/ui/
echo ""

echo -e "${YELLOW}🔨 Building frontend with NO CACHE...${NC}"
docker-compose build --no-cache frontend
echo ""

echo -e "${YELLOW}🚀 Starting all services...${NC}"
docker-compose up -d
echo ""

echo -e "${YELLOW}⏳ Waiting for services...${NC}"
sleep 15
echo ""

echo -e "${YELLOW}🔍 Checking container status...${NC}"
docker-compose ps
echo ""

echo -e "${YELLOW}📋 Frontend logs (last 20 lines)...${NC}"
docker-compose logs --tail=20 frontend
echo ""

echo -e "${YELLOW}🌐 Testing connections...${NC}"
curl -s http://localhost:8000/health && echo " ✅ Backend OK" || echo " ❌ Backend FAILED"
curl -s http://localhost:3000 && echo " ✅ Frontend OK" || echo " ❌ Frontend FAILED"
echo ""

echo -e "${GREEN}✅ FORCE REBUILD COMPLETE!${NC}"
echo ""

echo -e "${YELLOW}🌐 Access URLs:${NC}"
echo -e "   Frontend: ${BLUE}http://$(hostname -I | awk '{print $1}'):3000${NC}"
echo -e "   Backend:  ${BLUE}http://$(hostname -I | awk '{print $1}'):8000${NC}"
echo ""

echo -e "${YELLOW}📋 If still failing, check:${NC}"
echo -e "   docker-compose logs frontend"
echo -e "   docker-compose logs backend"
echo ""
