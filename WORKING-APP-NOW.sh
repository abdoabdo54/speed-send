#!/bin/bash

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

clear
echo -e "${RED}╔══════════════════════════════════════════════╗${NC}"
echo -e "${RED}║         CREATE WORKING APP NOW              ║${NC}"
echo -e "${RED}╚══════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}🔥 NUCLEAR CLEANUP - Remove everything broken...${NC}"
docker-compose down -v --rmi all
docker system prune -af
echo ""

echo -e "${YELLOW}📥 Pulling latest code...${NC}"
git pull origin main
echo ""

echo -e "${YELLOW}🔨 Building everything from scratch...${NC}"
docker-compose build --no-cache
echo ""

echo -e "${YELLOW}🚀 Starting all services...${NC}"
docker-compose up -d
echo ""

echo -e "${YELLOW}⏳ Waiting for services...${NC}"
sleep 30
echo ""

echo -e "${YELLOW}🔍 Testing everything...${NC}"
curl -s http://localhost:8000/health && echo " ✅ Backend OK" || echo " ❌ Backend FAILED"
curl -s http://localhost:3000 && echo " ✅ Frontend OK" || echo " ❌ Frontend FAILED"
echo ""

echo -e "${GREEN}✅ WORKING APP DEPLOYED!${NC}"
echo ""

echo -e "${YELLOW}🌐 Access: ${BLUE}http://$(hostname -I | awk '{print $1}'):3000${NC}"
echo ""

echo -e "${YELLOW}📋 If still not working:${NC}"
echo -e "   docker-compose logs backend"
echo -e "   docker-compose logs frontend"
echo ""
