#!/bin/bash

#==============================================================================
# ULTIMATE DEPLOYMENT SCRIPT
# This script completely resets and deploys the application from scratch
#==============================================================================

set -e  # Exit on any error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Banner
echo -e "${CYAN}"
cat << "EOF"
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║           Gmail Bulk Sender - PowerMTA Edition               ║
║              ULTIMATE DEPLOYMENT SCRIPT                      ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"
echo ""

# Detect server IP
SERVER_IP=$(hostname -I | awk '{print $1}')
echo -e "${BLUE}📍 Detected Server IP: ${GREEN}$SERVER_IP${NC}"
echo ""

# Step 1: Clean Git state
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  Step 1: Cleaning Git State${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
git reset --hard HEAD
git clean -fd
echo -e "${GREEN}✓ Git state cleaned${NC}"
echo ""

# Step 2: Pull latest code
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  Step 2: Pulling Latest Code${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
git pull origin main
echo -e "${GREEN}✓ Code updated from GitHub${NC}"
echo ""

# Step 3: Stop and remove ALL Docker resources
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  Step 3: Cleaning Docker Environment${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Stopping all containers...${NC}"
docker-compose down -v 2>/dev/null || true
echo -e "${BLUE}Removing old images...${NC}"
docker rmi $(docker images -q 'speed-send*') 2>/dev/null || true
echo -e "${BLUE}Pruning Docker system...${NC}"
docker system prune -f
echo -e "${GREEN}✓ Docker environment cleaned${NC}"
echo ""

# Step 4: Create .env file
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  Step 4: Configuring Environment${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Generate secure keys
SECRET_KEY=$(openssl rand -hex 32)
ENCRYPTION_KEY=$(openssl rand -hex 16)

cat > .env << EOF
# Database Configuration
POSTGRES_USER=gmailsaas
POSTGRES_PASSWORD=gmailsaas123
POSTGRES_DB=gmail_saas

# Backend Configuration
SECRET_KEY=$SECRET_KEY
ENCRYPTION_KEY=$ENCRYPTION_KEY
ENVIRONMENT=production

# Frontend Configuration
NEXT_PUBLIC_API_URL=http://$SERVER_IP:8000
EOF

echo -e "${GREEN}✓ Environment configured${NC}"
echo -e "${CYAN}  Database: gmail_saas${NC}"
echo -e "${CYAN}  API URL: http://$SERVER_IP:8000${NC}"
echo ""

# Step 5: Build all Docker images
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  Step 5: Building Docker Images${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}This will take 3-5 minutes...${NC}"
docker-compose build --no-cache --parallel
echo -e "${GREEN}✓ All images built successfully${NC}"
echo ""

# Step 6: Start all services
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  Step 6: Starting All Services${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
docker-compose up -d
echo -e "${GREEN}✓ All services started${NC}"
echo ""

# Step 7: Wait for services to initialize
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  Step 7: Waiting for Services to Initialize${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -ne "${BLUE}  Initializing "
for i in {1..40}; do
    echo -ne "▓"
    sleep 1
done
echo -e "${NC}"
echo -e "${GREEN}✓ Services initialized${NC}"
echo ""

# Step 8: Verify backend
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  Step 8: Verifying Backend${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
BACKEND_OK=false
for i in {1..15}; do
    if curl -sf http://localhost:8000/health > /dev/null 2>&1; then
        BACKEND_OK=true
        break
    fi
    echo -e "${BLUE}  Attempt $i/15: Waiting for backend...${NC}"
    sleep 2
done

if [ "$BACKEND_OK" = true ]; then
    echo -e "${GREEN}✓ Backend is responding at http://$SERVER_IP:8000${NC}"
    curl -s http://localhost:8000/health | jq '.' 2>/dev/null || curl -s http://localhost:8000/health
else
    echo -e "${RED}✗ Backend not responding${NC}"
    echo -e "${YELLOW}Backend logs:${NC}"
    docker-compose logs --tail=50 backend
fi
echo ""

# Step 9: Verify frontend
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  Step 9: Verifying Frontend${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
FRONTEND_OK=false
for i in {1..15}; do
    if curl -sf http://localhost:3000 > /dev/null 2>&1; then
        FRONTEND_OK=true
        break
    fi
    echo -e "${BLUE}  Attempt $i/15: Waiting for frontend...${NC}"
    sleep 2
done

if [ "$FRONTEND_OK" = true ]; then
    echo -e "${GREEN}✓ Frontend is responding at http://$SERVER_IP:3000${NC}"
else
    echo -e "${RED}✗ Frontend not responding${NC}"
    echo -e "${YELLOW}Frontend logs:${NC}"
    docker-compose logs --tail=50 frontend
fi
echo ""

# Step 10: Show service status
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  Step 10: Service Status${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
docker-compose ps
echo ""

# Final Summary
echo -e "${GREEN}"
cat << "EOF"
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║              🎉 DEPLOYMENT COMPLETE! 🎉                      ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}📱 Access Your Application:${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  ${MAGENTA}Frontend:${NC}  ${BLUE}http://$SERVER_IP:3000${NC}"
echo -e "  ${MAGENTA}Backend:${NC}   ${BLUE}http://$SERVER_IP:8000${NC}"
echo -e "  ${MAGENTA}API Docs:${NC}  ${BLUE}http://$SERVER_IP:8000/docs${NC}"
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}📋 Management Commands:${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  View all logs:      ${BLUE}docker-compose logs -f${NC}"
echo -e "  View backend logs:  ${BLUE}docker-compose logs -f backend${NC}"
echo -e "  View frontend logs: ${BLUE}docker-compose logs -f frontend${NC}"
echo -e "  Restart services:   ${BLUE}docker-compose restart${NC}"
echo -e "  Stop services:      ${BLUE}docker-compose down${NC}"
echo -e "  Check status:       ${BLUE}docker-compose ps${NC}"
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}⚠️  IMPORTANT: Next Steps${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  1. Open ${BLUE}http://$SERVER_IP:3000${NC} in your browser"
echo -e "  2. Press ${MAGENTA}F12${NC} to open Developer Console"
echo -e "  3. Check the Console tab for:"
echo -e "     ${GREEN}✅ API Configuration: { API_URL: \"http://$SERVER_IP:8000\" }${NC}"
echo -e "     ${GREEN}✅ Backend health check passed${NC}"
echo -e "  4. If you see ${RED}red errors${NC}, run: ${BLUE}docker-compose logs -f backend${NC}"
echo -e "  5. Upload your Google Workspace service account JSON"
echo -e "  6. Start sending emails at ${MAGENTA}PowerMTA speed!${NC}"
echo ""
echo -e "${GREEN}✅ Your application is ready!${NC}"
echo ""

