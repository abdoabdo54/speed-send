#!/bin/bash

###############################################################################
# V2 PowerMTA Engine - Complete Deployment Script
# This script deploys the full V2 upgrade with Redis-backed preparation
# and instant resume functionality
###############################################################################

set -e  # Exit on error

echo "======================================================================"
echo "🚀 V2 PowerMTA Engine - Complete Deployment"
echo "======================================================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Navigate to project directory
cd "$(dirname "$0")"
PROJECT_DIR=$(pwd)

echo -e "${BLUE}📂 Project Directory: ${PROJECT_DIR}${NC}"
echo ""

# Step 1: Git pull latest changes
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Step 1: Pulling latest code from Git${NC}"
echo -e "${YELLOW}========================================${NC}"
git pull origin main
echo -e "${GREEN}✅ Git pull complete${NC}"
echo ""

# Step 2: Stop all containers
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Step 2: Stopping all containers${NC}"
echo -e "${YELLOW}========================================${NC}"
docker-compose down
echo -e "${GREEN}✅ Containers stopped${NC}"
echo ""

# Step 3: Remove old images (optional - for clean rebuild)
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Step 3: Cleaning up old images${NC}"
echo -e "${YELLOW}========================================${NC}"
docker-compose rm -f
echo -e "${GREEN}✅ Old containers removed${NC}"
echo ""

# Step 4: Build backend with V2 tasks
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Step 4: Building backend (V2 engine)${NC}"
echo -e "${YELLOW}========================================${NC}"
docker-compose build --no-cache backend
echo -e "${GREEN}✅ Backend built${NC}"
echo ""

# Step 5: Build frontend with V2 UI
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Step 5: Building frontend (V2 UI)${NC}"
echo -e "${YELLOW}========================================${NC}"
docker-compose build --no-cache frontend
echo -e "${GREEN}✅ Frontend built${NC}"
echo ""

# Step 6: Start all services
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Step 6: Starting all services${NC}"
echo -e "${YELLOW}========================================${NC}"
docker-compose up -d
echo -e "${GREEN}✅ All services started${NC}"
echo ""

# Step 7: Wait for services to be healthy
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Step 7: Waiting for services to be ready${NC}"
echo -e "${YELLOW}========================================${NC}"
sleep 10
echo -e "${GREEN}✅ Services should be ready${NC}"
echo ""

# Step 8: Show service status
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Step 8: Service Status${NC}"
echo -e "${YELLOW}========================================${NC}"
docker-compose ps
echo ""

# Step 9: Show backend logs (last 30 lines)
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Step 9: Backend Logs (last 30 lines)${NC}"
echo -e "${YELLOW}========================================${NC}"
docker-compose logs backend --tail=30
echo ""

# Step 10: Show Celery worker logs (last 20 lines)
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Step 10: Celery Worker Logs (V2 Engine)${NC}"
echo -e "${YELLOW}========================================${NC}"
docker-compose logs celery_worker --tail=20
echo ""

# Final summary
echo -e "${GREEN}======================================================================"
echo -e "🎉 V2 PowerMTA Engine Deployment Complete!"
echo -e "======================================================================${NC}"
echo ""
echo -e "${BLUE}📋 What's New in V2:${NC}"
echo -e "  ✅ Redis-backed task pre-generation"
echo -e "  ✅ Instant Resume (< 10 seconds for 15k emails)"
echo -e "  ✅ Campaign state machine: DRAFT → PREPARING → READY → SENDING"
echo -e "  ✅ SSE live updates (real-time dashboard)"
echo -e "  ✅ Per-account progress tracking"
echo -e "  ✅ Configurable 5ms micro-delay per email"
echo -e "  ✅ Structured logging with request IDs"
echo ""
echo -e "${BLUE}🌐 Access Points:${NC}"
echo -e "  Frontend:  http://$(hostname -I | awk '{print $1}'):3000"
echo -e "  Backend:   http://$(hostname -I | awk '{print $1}'):8000"
echo -e "  API Docs:  http://$(hostname -I | awk '{print $1}'):8000/docs"
echo ""
echo -e "${BLUE}🔄 V2 Workflow:${NC}"
echo -e "  1. Create campaign (status: DRAFT)"
echo -e "  2. Click 'Prepare' → pre-generates all tasks to Redis (status: READY)"
echo -e "  3. Click 'Resume' → instant parallel send from Redis (status: SENDING)"
echo -e "  4. Watch live SSE dashboard for real-time progress"
echo ""
echo -e "${BLUE}⚡ Performance Targets:${NC}"
echo -e "  • Preparation: Full pre-render before sending"
echo -e "  • Resume speed: < 10 seconds for 15,000 emails"
echo -e "  • Concurrency: 100 workers (configurable in docker-compose.yml)"
echo -e "  • UI latency: ≤ 1 second for live updates"
echo ""
echo -e "${YELLOW}📝 To view live logs:${NC}"
echo -e "  docker-compose logs -f backend"
echo -e "  docker-compose logs -f celery_worker"
echo -e "  docker-compose logs -f frontend"
echo ""
echo -e "${GREEN}✨ Deployment successful! Your V2 PowerMTA engine is ready.${NC}"
echo ""

