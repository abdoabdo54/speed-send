#!/bin/bash

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

clear
echo -e "${RED}╔══════════════════════════════════════════════╗${NC}"
echo -e "${RED}║         MANUAL API TEST                     ║${NC}"
echo -e "${RED}╚══════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}🔍 Step 1: Testing accounts API without jq...${NC}"
curl -s http://localhost:8000/api/v1/accounts
echo ""
echo ""

echo -e "${YELLOW}🌐 Step 2: Testing from external IP...${NC}"
curl -s http://172.236.219.75:8000/api/v1/accounts
echo ""
echo ""

echo -e "${YELLOW}📋 Step 3: Testing with headers...${NC}"
curl -s -H "Accept: application/json" http://localhost:8000/api/v1/accounts
echo ""
echo ""

echo -e "${YELLOW}🔍 Step 4: Testing CORS headers specifically...${NC}"
curl -s -I http://localhost:8000/api/v1/accounts
echo ""

echo -e "${YELLOW}🌐 Step 5: Testing CORS from external...${NC}"
curl -s -I http://172.236.219.75:8000/api/v1/accounts
echo ""

echo -e "${GREEN}✅ MANUAL TEST COMPLETE!${NC}"
echo ""

echo -e "${YELLOW}📋 What to look for:${NC}"
echo -e "   1. JSON response with accounts data"
echo -e "   2. CORS headers: Access-Control-Allow-Origin"
echo -e "   3. Any error messages"
echo ""
