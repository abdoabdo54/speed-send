#!/bin/bash

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

clear
echo -e "${RED}╔══════════════════════════════════════════════╗${NC}"
echo -e "${RED}║        EMERGENCY SERVICE RESTART             ║${NC}"
echo -e "${RED}╚══════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${CYAN}Checking current status...${NC}"
docker-compose ps
echo ""

echo -e "${CYAN}Starting ALL services...${NC}"
docker-compose up -d
echo ""

echo -e "${CYAN}Waiting 10 seconds...${NC}"
sleep 10
echo ""

echo -e "${CYAN}Service status:${NC}"
docker-compose ps
echo ""

echo -e "${CYAN}Frontend logs (last 30 lines):${NC}"
docker-compose logs --tail=30 frontend
echo ""

echo -e "${CYAN}Backend logs (last 20 lines):${NC}"
docker-compose logs --tail=20 backend
echo ""

echo -e "${GREEN}✅ Services started!${NC}"
echo ""
echo -e "${YELLOW}Access: http://$(hostname -I | awk '{print $1}'):3000${NC}"
echo ""

