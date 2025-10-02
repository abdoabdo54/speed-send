#!/bin/bash

echo "🔧 Complete Fix and Deploy Script"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Stop all services
echo -e "${YELLOW}1. Stopping all services...${NC}"
docker-compose down
echo ""

# Remove old images to force rebuild
echo -e "${YELLOW}2. Removing old images...${NC}"
docker-compose rm -f
docker rmi $(docker images -q speed-send*) 2>/dev/null || true
echo ""

# Update .env with correct API URL
echo -e "${YELLOW}3. Updating .env file...${NC}"
SERVER_IP=$(hostname -I | awk '{print $1}')
if grep -q "NEXT_PUBLIC_API_URL" .env; then
    sed -i "s|NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=http://$SERVER_IP:8000|" .env
else
    echo "NEXT_PUBLIC_API_URL=http://$SERVER_IP:8000" >> .env
fi
echo -e "${GREEN}✓ API URL set to: http://$SERVER_IP:8000${NC}"
echo ""

# Build with no cache
echo -e "${YELLOW}4. Building fresh images (this may take 3-5 minutes)...${NC}"
docker-compose build --no-cache --parallel
echo ""

# Start services
echo -e "${YELLOW}5. Starting all services...${NC}"
docker-compose up -d
echo ""

# Wait for services
echo -e "${YELLOW}6. Waiting for services to initialize (30 seconds)...${NC}"
sleep 30
echo ""

# Check status
echo -e "${YELLOW}7. Checking service status...${NC}"
docker-compose ps
echo ""

# Test backend
echo -e "${YELLOW}8. Testing backend connection...${NC}"
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health)
if [ "$BACKEND_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ Backend is responding!${NC}"
else
    echo -e "${RED}✗ Backend is not responding (HTTP $BACKEND_STATUS)${NC}"
fi
echo ""

# Test frontend
echo -e "${YELLOW}9. Testing frontend connection...${NC}"
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
if [ "$FRONTEND_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ Frontend is responding!${NC}"
else
    echo -e "${RED}✗ Frontend is not responding (HTTP $FRONTEND_STATUS)${NC}"
fi
echo ""

# Display access info
echo -e "${GREEN}=================================="
echo -e "🎉 Deployment Complete!"
echo -e "==================================${NC}"
echo ""
echo -e "Access your application:"
echo -e "  Frontend: ${GREEN}http://$SERVER_IP:3000${NC}"
echo -e "  Backend:  ${GREEN}http://$SERVER_IP:8000${NC}"
echo -e "  API Docs: ${GREEN}http://$SERVER_IP:8000/docs${NC}"
echo ""
echo -e "Management commands:"
echo -e "  View logs:    docker-compose logs -f"
echo -e "  Restart:      docker-compose restart"
echo -e "  Stop:         docker-compose down"
echo ""

