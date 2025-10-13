#!/bin/bash

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

clear
echo -e "${RED}╔══════════════════════════════════════════════╗${NC}"
echo -e "${RED}║         CLEAN DEPLOY - FORCE REBUILD         ║${NC}"
echo -e "${RED}╚══════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}📥 Step 1: Pulling latest code...${NC}"
git pull origin main
echo ""

echo -e "${YELLOW}🧹 Step 2: Cleaning Docker build cache...${NC}"
docker builder prune -af
echo ""

echo -e "${YELLOW}🔥 Step 3: Stopping and removing containers...${NC}"
docker-compose down -v
echo ""

echo -e "${YELLOW}🗑️  Step 4: Removing old images...${NC}"
docker-compose down --rmi all
echo ""

echo -e "${YELLOW}🔨 Step 5: Building with no cache...${NC}"
docker-compose build --no-cache
echo ""

echo -e "${YELLOW}🚀 Step 6: Starting services...${NC}"
docker-compose up -d
echo ""

echo -e "${YELLOW}⏳ Step 7: Waiting for services...${NC}"
sleep 30
echo ""

echo -e "${YELLOW}🔍 Step 8: Testing services...${NC}"
curl -s http://localhost:8000/health && echo " ✅ Backend OK" || echo " ❌ Backend FAILED"
curl -s http://localhost:3000 && echo " ✅ Frontend OK" || echo " ❌ Frontend FAILED"
echo ""

echo -e "${GREEN}✅ CLEAN DEPLOY COMPLETE!${NC}"
echo ""

echo -e "${YELLOW}🌐 Access URLs:${NC}"
echo -e "   Frontend: ${BLUE}http://$(hostname -I | awk '{print $1}'):3000${NC}"
echo -e "   Backend:  ${BLUE}http://$(hostname -I | awk '{print $1}'):8000${NC}"
echo ""

echo -e "${YELLOW}📋 If build still fails:${NC}"
echo -e "   docker-compose logs frontend"
echo -e "   docker-compose logs backend"
echo ""

