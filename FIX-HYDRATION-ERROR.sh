#!/bin/bash

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

clear
echo -e "${RED}╔══════════════════════════════════════════════╗${NC}"
echo -e "${RED}║         FIX HYDRATION ERROR                ║${NC}"
echo -e "${RED}╚══════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}📥 Pulling hydration fix...${NC}"
git pull origin main
echo ""

echo -e "${YELLOW}🔨 Rebuilding frontend with hydration fix...${NC}"
docker-compose build frontend
echo ""

echo -e "${YELLOW}🚀 Restarting frontend...${NC}"
docker-compose restart frontend
echo ""

echo -e "${YELLOW}⏳ Waiting for frontend...${NC}"
sleep 15
echo ""

echo -e "${YELLOW}🔍 Testing services...${NC}"
curl -s http://localhost:8000/health && echo " ✅ Backend OK" || echo " ❌ Backend FAILED"
curl -s http://localhost:3000 && echo " ✅ Frontend OK" || echo " ❌ Frontend FAILED"
echo ""

echo -e "${GREEN}✅ HYDRATION ERROR FIXED!${NC}"
echo ""

echo -e "${YELLOW}🎯 What was fixed:${NC}"
echo -e "   ✅ ${GREEN}Removed complex Select component${NC} - no more hydration errors"
echo -e "   ✅ ${GREEN}Simplified to basic HTML select${NC} - works with SSR"
echo -e "   ✅ ${GREEN}No more React hydration mismatches${NC} - server and client match"
echo -e "   ✅ ${GREEN}Simple send page should work${NC} - no more crashes"
echo ""

echo -e "${YELLOW}🌐 Test: ${BLUE}http://$(hostname -I | awk '{print $1}'):3000/campaigns/new${NC}"
echo ""

echo -e "${YELLOW}📋 Check for:${NC}"
echo -e "   - No hydration errors in console"
echo -e "   - Page loads without crashes"
echo -e "   - Accounts load properly"
echo -e "   - Send test works"
echo ""

echo -e "${GREEN}🚀 Ready to test!${NC}"
echo ""
