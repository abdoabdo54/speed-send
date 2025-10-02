#!/bin/bash

#==============================================================================
# FORCE FIX - Discards local changes and applies complete fix
#==============================================================================

set -e  # Exit on any error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║           FORCE FIX - Discard Local Changes              ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Get server IP
SERVER_IP=$(hostname -I | awk '{print $1}')
echo -e "${YELLOW}📍 Detected Server IP: ${GREEN}$SERVER_IP${NC}"
echo ""

# Step 1: Discard local changes
echo -e "${YELLOW}1️⃣  Discarding local changes...${NC}"
git reset --hard HEAD
git clean -fd
echo -e "${GREEN}✓ Local changes discarded${NC}"
echo ""

# Step 2: Pull latest code
echo -e "${YELLOW}2️⃣  Pulling latest code from GitHub...${NC}"
git pull origin main
echo -e "${GREEN}✓ Code updated${NC}"
echo ""

# Step 3: Clean database (fresh start)
echo -e "${YELLOW}3️⃣  Cleaning database for fresh start...${NC}"
docker-compose down -v  # Remove volumes to clean database
echo -e "${GREEN}✓ Old database removed${NC}"
echo ""

# Step 4: Create/Update .env file
echo -e "${YELLOW}4️⃣  Configuring environment variables...${NC}"

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo -e "${BLUE}Creating new .env file...${NC}"
    cat > .env << EOF
# Database Configuration
POSTGRES_USER=gmailsaas
POSTGRES_PASSWORD=gmailsaas123
POSTGRES_DB=gmail_saas

# Backend Configuration
SECRET_KEY=$(openssl rand -hex 32)
ENCRYPTION_KEY=$(openssl rand -hex 16)
ENVIRONMENT=production

# Frontend Configuration - CRITICAL!
NEXT_PUBLIC_API_URL=http://$SERVER_IP:8000
EOF
else
    echo -e "${BLUE}Updating existing .env file...${NC}"
    # Update or add NEXT_PUBLIC_API_URL
    if grep -q "NEXT_PUBLIC_API_URL" .env; then
        sed -i "s|NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=http://$SERVER_IP:8000|" .env
    else
        echo "NEXT_PUBLIC_API_URL=http://$SERVER_IP:8000" >> .env
    fi
    
    # Ensure other vars exist
    grep -q "ENVIRONMENT" .env || echo "ENVIRONMENT=production" >> .env
fi

echo -e "${GREEN}✓ Environment configured${NC}"
echo -e "   API URL: ${BLUE}http://$SERVER_IP:8000${NC}"
echo ""

# Step 5: Rebuild all images (no cache)
echo -e "${YELLOW}5️⃣  Rebuilding all Docker images (this takes 3-5 minutes)...${NC}"
docker-compose build --no-cache --parallel
echo -e "${GREEN}✓ Images rebuilt${NC}"
echo ""

# Step 6: Start all services
echo -e "${YELLOW}6️⃣  Starting all services...${NC}"
docker-compose up -d
echo -e "${GREEN}✓ Services started${NC}"
echo ""

# Step 7: Wait for services to be ready
echo -e "${YELLOW}7️⃣  Waiting for services to initialize...${NC}"
echo -n "   "
for i in {1..30}; do
    echo -n "▓"
    sleep 1
done
echo ""
echo -e "${GREEN}✓ Services ready${NC}"
echo ""

# Step 8: Verify backend
echo -e "${YELLOW}8️⃣  Testing backend connection...${NC}"
BACKEND_TRIES=0
BACKEND_OK=false
while [ $BACKEND_TRIES -lt 10 ]; do
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        BACKEND_OK=true
        break
    fi
    BACKEND_TRIES=$((BACKEND_TRIES+1))
    sleep 2
done

if [ "$BACKEND_OK" = true ]; then
    echo -e "${GREEN}✓ Backend is responding!${NC}"
else
    echo -e "${RED}✗ Backend not responding${NC}"
    echo -e "${YELLOW}Showing backend logs:${NC}"
    docker-compose logs --tail=30 backend
fi
echo ""

# Step 9: Verify frontend
echo -e "${YELLOW}9️⃣  Testing frontend connection...${NC}"
FRONTEND_TRIES=0
FRONTEND_OK=false
while [ $FRONTEND_TRIES -lt 10 ]; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        FRONTEND_OK=true
        break
    fi
    FRONTEND_TRIES=$((FRONTEND_TRIES+1))
    sleep 2
done

if [ "$FRONTEND_OK" = true ]; then
    echo -e "${GREEN}✓ Frontend is responding!${NC}"
else
    echo -e "${RED}✗ Frontend not responding${NC}"
    echo -e "${YELLOW}Showing frontend logs:${NC}"
    docker-compose logs --tail=30 frontend
fi
echo ""

# Step 10: Show configuration
echo -e "${YELLOW}🔟 Current Configuration:${NC}"
echo -e "   ${BLUE}Environment Variables:${NC}"
grep NEXT_PUBLIC_API_URL .env | sed 's/^/   /'
echo ""

# Step 11: Final status
echo -e "${GREEN}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║                   🎉 FIX COMPLETE! 🎉                    ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo -e "${GREEN}📱 Access Your Application:${NC}"
echo -e "   Frontend:  ${BLUE}http://$SERVER_IP:3000${NC}"
echo -e "   Backend:   ${BLUE}http://$SERVER_IP:8000${NC}"
echo -e "   API Docs:  ${BLUE}http://$SERVER_IP:8000/docs${NC}"
echo ""
echo -e "${GREEN}📋 Useful Commands:${NC}"
echo -e "   View logs:        ${BLUE}docker-compose logs -f${NC}"
echo -e "   View backend:     ${BLUE}docker-compose logs -f backend${NC}"
echo -e "   View frontend:    ${BLUE}docker-compose logs -f frontend${NC}"
echo -e "   Restart all:      ${BLUE}docker-compose restart${NC}"
echo -e "   Stop all:         ${BLUE}docker-compose down${NC}"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT NEXT STEPS:${NC}"
echo -e "   1. Open ${BLUE}http://$SERVER_IP:3000${NC} in your browser"
echo -e "   2. Press ${BLUE}F12${NC} to open Developer Console"
echo -e "   3. Check Console for: ${GREEN}'API Configuration: { API_URL: \"http://$SERVER_IP:8000\" }'${NC}"
echo -e "   4. Upload your service account JSON"
echo ""
echo -e "${GREEN}✅ Your app is now ready to send emails at PowerMTA speed!${NC}"
echo ""

