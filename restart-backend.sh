#!/bin/bash

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   RESTARTING BACKEND${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

echo -e "${YELLOW}🔄 Pulling latest changes...${NC}"
git pull origin main

echo ""
echo -e "${YELLOW}🛑 Stopping backend...${NC}"
docker-compose stop backend

echo ""
echo -e "${YELLOW}🔨 Rebuilding backend with new code...${NC}"
docker-compose build backend

echo ""
echo -e "${YELLOW}🚀 Starting backend...${NC}"
docker-compose up -d backend

echo ""
echo -e "${YELLOW}⏳ Waiting for backend to be ready...${NC}"
sleep 5

echo ""
echo -e "${GREEN}✅ Backend restarted!${NC}"
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${YELLOW}📋 Backend logs (last 30 lines):${NC}"
echo -e "${BLUE}========================================${NC}"
docker-compose logs --tail=30 backend

echo ""
echo -e "${GREEN}✅ Done! Try syncing users now!${NC}"
echo ""

