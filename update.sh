#!/bin/bash

################################################################################
# Gmail Bulk Sender SaaS - UPDATE SCRIPT
# 
# This script updates an existing installation to the latest version
# Usage: chmod +x update.sh && ./update.sh
################################################################################

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m'

clear
echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║          Gmail Bulk Sender - Update Script                  ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Backup .env
if [ -f .env ]; then
    echo -e "${BLUE}📦 Backing up configuration...${NC}"
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    echo -e "${GREEN}✓ Configuration backed up${NC}"
fi

# Pull latest changes
echo -e "${BLUE}📥 Pulling latest changes from repository...${NC}"
git pull origin main || git pull

# Rebuild containers
echo -e "${BLUE}🏗️  Rebuilding containers with latest code...${NC}"
docker-compose build --parallel --no-cache

# Stop old containers
echo -e "${BLUE}🛑 Stopping old containers...${NC}"
docker-compose down

# Start new containers
echo -e "${BLUE}🚀 Starting updated containers...${NC}"
docker-compose up -d

# Wait for services
echo -e "${BLUE}⏳ Waiting for services to start...${NC}"
sleep 10

# Check status
echo -e "${GREEN}✅ Update complete!${NC}"
echo ""
docker-compose ps

echo ""
echo -e "${CYAN}🎉 Your application has been updated!${NC}"
echo -e "${WHITE}Access at: http://$(hostname -I | awk '{print $1}'):3000${NC}"
echo ""

