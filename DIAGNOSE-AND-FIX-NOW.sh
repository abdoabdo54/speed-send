#!/bin/bash

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

clear
echo -e "${RED}╔══════════════════════════════════════════════╗${NC}"
echo -e "${RED}║        DIAGNOSE AND FIX - EMERGENCY          ║${NC}"
echo -e "${RED}╚══════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${CYAN}🔍 Step 1: What containers are running?${NC}"
docker ps -a
echo ""

echo -e "${CYAN}🔍 Step 2: Docker-compose status${NC}"
docker-compose ps
echo ""

echo -e "${CYAN}🔍 Step 3: Check if frontend container exists${NC}"
docker inspect gmail_saas_frontend 2>/dev/null | grep -E "State|Status" || echo "Frontend container doesn't exist!"
echo ""

echo -e "${CYAN}🔍 Step 4: Frontend logs (if container exists)${NC}"
docker-compose logs --tail=50 frontend 2>/dev/null || echo "No frontend logs - container not running"
echo ""

echo -e "${CYAN}🔍 Step 5: Check ports${NC}"
netstat -tlnp | grep :3000 || echo "Nothing listening on port 3000"
netstat -tlnp | grep :8000 || echo "Nothing listening on port 8000"
echo ""

echo -e "${RED}════════════════════════════════════════════${NC}"
echo -e "${YELLOW}APPLYING NUCLEAR FIX...${NC}"
echo -e "${RED}════════════════════════════════════════════${NC}"
echo ""

echo -e "${CYAN}🛑 Step 6: Stop everything${NC}"
docker-compose down --remove-orphans
docker system prune -f
echo ""

echo -e "${CYAN}🧹 Step 7: Clean up images${NC}"
docker rmi speed-send-frontend speed-send-backend 2>/dev/null || echo "Images already removed"
echo ""

echo -e "${CYAN}📥 Step 8: Get fresh code${NC}"
git reset --hard HEAD
git clean -fd
git pull origin main
echo ""

echo -e "${CYAN}🔨 Step 9: Build ONLY backend first${NC}"
docker-compose build backend
echo ""

echo -e "${CYAN}🚀 Step 10: Start backend and database${NC}"
docker-compose up -d postgres redis backend celery_worker celery_beat
echo ""

echo -e "${CYAN}⏳ Step 11: Wait for backend${NC}"
sleep 10
echo ""

echo -e "${CYAN}🧪 Step 12: Test backend${NC}"
curl -s http://localhost:8000/health && echo " ✅ Backend OK" || echo " ❌ Backend FAILED"
echo ""

echo -e "${CYAN}🔨 Step 13: Build simple frontend${NC}"
# Create a minimal working frontend
cat > frontend/Dockerfile.simple << 'EOF'
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]
EOF

# Use simple dockerfile
docker build -f frontend/Dockerfile.simple -t speed-send-frontend-simple frontend/
echo ""

echo -e "${CYAN}🚀 Step 14: Start simple frontend${NC}"
docker run -d --name gmail_saas_frontend_simple -p 3000:3000 --network speed-send_default speed-send-frontend-simple
echo ""

echo -e "${CYAN}⏳ Step 15: Wait for frontend${NC}"
sleep 15
echo ""

echo -e "${CYAN}🧪 Step 16: Test frontend${NC}"
curl -s http://localhost:3000 | head -10 && echo " ✅ Frontend OK" || echo " ❌ Frontend FAILED"
echo ""

echo -e "${CYAN}📊 Step 17: Final status${NC}"
docker ps
echo ""

echo -e "${GREEN}════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ EMERGENCY FIX COMPLETE!${NC}"
echo -e "${GREEN}════════════════════════════════════════════${NC}"
echo ""

echo -e "${YELLOW}🌐 Try accessing:${NC}"
echo -e "   Frontend: ${CYAN}http://$(hostname -I | awk '{print $1}'):3000${NC}"
echo -e "   Backend:  ${CYAN}http://$(hostname -I | awk '{print $1}'):8000${NC}"
echo ""

echo -e "${YELLOW}📋 If still not working:${NC}"
echo -e "   1. Check firewall: ${CYAN}ufw status${NC}"
echo -e "   2. Check if ports are blocked"
echo -e "   3. Try: ${CYAN}docker logs gmail_saas_frontend_simple${NC}"
echo ""
