#!/bin/bash

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

clear
echo -e "${RED}╔══════════════════════════════════════════════╗${NC}"
echo -e "${RED}║   FORCE REBUILD FRONTEND - NO CACHE          ║${NC}"
echo -e "${RED}╚══════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${CYAN}Step 1: Checking what's CURRENTLY in the frontend container...${NC}"
echo ""
echo -e "${YELLOW}Current files in /app/src/components:${NC}"
docker-compose exec frontend ls -la /app/src/components/ 2>/dev/null || echo "Container not running or error"
echo ""
echo -e "${YELLOW}Current files in /app/src/app:${NC}"
docker-compose exec frontend ls -la /app/src/app/ 2>/dev/null || echo "Container not running or error"
echo ""

echo -e "${CYAN}Step 2: Stopping frontend container...${NC}"
docker-compose stop frontend
echo ""

echo -e "${CYAN}Step 3: REMOVING frontend container and image...${NC}"
docker-compose rm -f frontend
docker rmi speed-send-frontend 2>/dev/null || echo "Image already removed"
echo ""

echo -e "${CYAN}Step 4: Pulling LATEST code from GitHub...${NC}"
git pull origin main
echo ""

echo -e "${CYAN}Step 5: Verifying new files exist in repo...${NC}"
echo ""
echo -e "${YELLOW}Checking for new pages:${NC}"
ls -la frontend/src/app/dashboard/page.tsx 2>/dev/null && echo "✅ dashboard/page.tsx exists" || echo "❌ MISSING!"
ls -la frontend/src/app/contacts/page.tsx 2>/dev/null && echo "✅ contacts/page.tsx exists" || echo "❌ MISSING!"
ls -la frontend/src/app/analytics/page.tsx 2>/dev/null && echo "✅ analytics/page.tsx exists" || echo "❌ MISSING!"
echo ""
echo -e "${YELLOW}Checking for new UI components:${NC}"
ls -la frontend/src/components/ui/label.tsx 2>/dev/null && echo "✅ label.tsx exists" || echo "❌ MISSING!"
ls -la frontend/src/components/ui/textarea.tsx 2>/dev/null && echo "✅ textarea.tsx exists" || echo "❌ MISSING!"
ls -la frontend/src/components/ui/select.tsx 2>/dev/null && echo "✅ select.tsx exists" || echo "❌ MISSING!"
ls -la frontend/src/components/ui/checkbox.tsx 2>/dev/null && echo "✅ checkbox.tsx exists" || echo "❌ MISSING!"
echo ""
echo -e "${YELLOW}Checking Sidebar.tsx:${NC}"
grep -n "Speed-Send" frontend/src/components/Sidebar.tsx && echo "✅ Sidebar updated" || echo "❌ Sidebar NOT updated!"
echo ""

echo -e "${CYAN}Step 6: REBUILDING frontend with --no-cache...${NC}"
docker-compose build --no-cache --progress=plain frontend 2>&1 | tee /tmp/frontend-build.log
echo ""

if grep -q "Failed to compile" /tmp/frontend-build.log; then
    echo -e "${RED}❌ BUILD FAILED! Checking errors...${NC}"
    grep -A 5 "Failed to compile" /tmp/frontend-build.log
    echo ""
    echo -e "${YELLOW}Common fixes:${NC}"
    echo "1. Missing dependencies - check package.json"
    echo "2. Syntax errors in new files"
    echo "3. Import errors"
    exit 1
fi

echo -e "${GREEN}✅ Build completed!${NC}"
echo ""

echo -e "${CYAN}Step 7: Starting frontend container...${NC}"
docker-compose up -d frontend
echo ""

echo -e "${CYAN}Step 8: Waiting for frontend to start...${NC}"
sleep 10
echo ""

echo -e "${CYAN}Step 9: Verifying new files are IN the container...${NC}"
echo ""
echo -e "${YELLOW}Files in container /app/src/app:${NC}"
docker-compose exec frontend ls -la /app/src/app/ | grep -E "dashboard|contacts|analytics"
echo ""
echo -e "${YELLOW}Files in container /app/src/components/ui:${NC}"
docker-compose exec frontend ls -la /app/src/components/ui/ | grep -E "label|textarea|select|checkbox"
echo ""

echo -e "${CYAN}Step 10: Checking frontend logs...${NC}"
docker-compose logs --tail=50 frontend
echo ""

echo -e "${GREEN}════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ FRONTEND FORCE REBUILD COMPLETE!${NC}"
echo -e "${GREEN}════════════════════════════════════════════${NC}"
echo ""

echo -e "${YELLOW}🌐 NOW TEST IN BROWSER (INCOGNITO MODE):${NC}"
echo -e "   ${CYAN}http://$(hostname -I | awk '{print $1}'):3000/${NC}"
echo ""
echo -e "${YELLOW}What you SHOULD see:${NC}"
echo -e "   ✅ Sidebar says ${GREEN}'Speed-Send'${NC} (not 'Gmail Bulk Sender')"
echo -e "   ✅ Menu has ${GREEN}'Contacts'${NC} and ${GREEN}'Analytics'${NC}"
echo -e "   ✅ Dashboard shows ${GREEN}stat cards${NC}"
echo -e "   ✅ Campaign builder is ${GREEN}single page${NC} (not multi-step)"
echo ""
echo -e "${RED}If you STILL see old UI:${NC}"
echo -e "   1. Open browser DevTools (F12)"
echo -e "   2. Go to Network tab"
echo -e "   3. Refresh page"
echo -e "   4. Check if files are loading from cache"
echo -e "   5. Screenshot and send me"
echo ""

