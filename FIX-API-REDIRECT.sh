#!/bin/bash

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

clear
echo -e "${RED}╔══════════════════════════════════════════════╗${NC}"
echo -e "${RED}║         FIX API REDIRECT ISSUE              ║${NC}"
echo -e "${RED}╚══════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}🔍 Step 1: Testing with trailing slash...${NC}"
curl -s http://localhost:8000/api/v1/accounts/
echo ""
echo ""

echo -e "${YELLOW}🌐 Step 2: Testing external with trailing slash...${NC}"
curl -s http://172.236.219.75:8000/api/v1/accounts/
echo ""
echo ""

echo -e "${YELLOW}📋 Step 3: Testing CORS headers with trailing slash...${NC}"
curl -s -I http://localhost:8000/api/v1/accounts/
echo ""

echo -e "${YELLOW}🌐 Step 4: Testing external CORS with trailing slash...${NC}"
curl -s -I http://172.236.219.75:8000/api/v1/accounts/
echo ""

echo -e "${GREEN}✅ REDIRECT TEST COMPLETE!${NC}"
echo ""

echo -e "${YELLOW}📋 The issue is:${NC}"
echo -e "   ❌ API endpoint needs trailing slash: /api/v1/accounts/"
echo -e "   ❌ Frontend is calling: /api/v1/accounts (no slash)"
echo -e "   ✅ Solution: Update frontend API calls to include trailing slash"
echo ""
