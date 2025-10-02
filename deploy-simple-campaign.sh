#!/bin/bash

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

clear
echo -e "${BLUE}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     DEPLOY SIMPLE CAMPAIGN BUILDER           ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}📥 Pulling latest changes...${NC}"
git pull origin main
echo ""

echo -e "${YELLOW}🔨 Rebuilding frontend...${NC}"
docker-compose build frontend
echo ""

echo -e "${YELLOW}🚀 Restarting frontend...${NC}"
docker-compose restart frontend
echo ""

echo -e "${YELLOW}⏳ Waiting for frontend...${NC}"
sleep 10
echo ""

echo -e "${GREEN}✅ DEPLOYMENT COMPLETE!${NC}"
echo ""

echo -e "${YELLOW}🎯 What's New:${NC}"
echo -e "   ✅ ${GREEN}Simple campaign builder${NC} - no complex settings"
echo -e "   ✅ ${GREEN}Auto-selects ALL accounts${NC} - no manual selection needed"
echo -e "   ✅ ${GREEN}Only From Name required${NC} - simplified sender config"
echo -e "   ✅ ${GREEN}Test Email button${NC} - send test before campaign"
echo -e "   ✅ ${GREEN}CSV upload support${NC} - upload recipient files"
echo -e "   ✅ ${GREEN}Account status display${NC} - shows available accounts/senders"
echo ""

echo -e "${YELLOW}🌐 Access: ${BLUE}http://$(hostname -I | awk '{print $1}'):3000/campaigns/new${NC}"
echo ""

echo -e "${YELLOW}📋 How to use:${NC}"
echo -e "   1. Fill in: Campaign Name, From Name, Subject, Message"
echo -e "   2. Add recipients (paste emails or upload CSV)"
echo -e "   3. Click ${GREEN}'Send Test'${NC} to test first"
echo -e "   4. Click ${GREEN}'Create Campaign'${NC} to launch"
echo ""

echo -e "${GREEN}🚀 Ready to send emails!${NC}"
echo ""
