#!/bin/bash

echo "🔍 COMPREHENSIVE FRONTEND-BACKEND DIAGNOSTIC AND FIX"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

cd /opt/speed-send

echo -e "${BLUE}1. CHECKING DOCKER SERVICES...${NC}"
docker-compose ps

echo -e "\n${BLUE}2. CHECKING BACKEND HEALTH...${NC}"
curl -s http://localhost:8000/health || echo -e "${RED}❌ Backend health check failed${NC}"

echo -e "\n${BLUE}3. CHECKING BACKEND API ENDPOINTS...${NC}"
echo "Testing /api/v1/accounts/:"
curl -s http://localhost:8000/api/v1/accounts/ | head -n 3

echo -e "\n${BLUE}4. CHECKING FRONTEND ACCESS...${NC}"
curl -s http://localhost:3000 | head -n 3

echo -e "\n${BLUE}5. CHECKING NETWORK CONNECTIVITY...${NC}"
# Check if frontend can reach backend
docker exec gmail_saas_frontend curl -s http://backend:8000/health || echo -e "${RED}❌ Frontend cannot reach backend${NC}"

echo -e "\n${BLUE}6. CHECKING FRONTEND LOGS...${NC}"
docker-compose logs --tail=10 frontend

echo -e "\n${BLUE}7. CHECKING BACKEND LOGS...${NC}"
docker-compose logs --tail=10 backend

echo -e "\n${BLUE}8. FORCE REBUILDING FRONTEND...${NC}"
docker-compose stop frontend
docker-compose rm -f frontend
docker-compose build --no-cache frontend
docker-compose up -d frontend

echo -e "\n${BLUE}9. WAITING FOR FRONTEND TO START...${NC}"
sleep 30

echo -e "\n${BLUE}10. FINAL HEALTH CHECKS...${NC}"
echo "Backend health:"
curl -s http://localhost:8000/health

echo -e "\nFrontend health:"
curl -s http://localhost:3000 | head -n 1

echo -e "\n${GREEN}✅ DIAGNOSTIC COMPLETE${NC}"
echo -e "${YELLOW}Now test in browser: http://172.236.219.75:3000/campaigns/new${NC}"
echo -e "${YELLOW}If still showing error, check browser console (F12) for JavaScript errors${NC}"
