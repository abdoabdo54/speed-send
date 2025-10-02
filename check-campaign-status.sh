#!/bin/bash

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   CAMPAIGN STATUS CHECKER${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

echo -e "${CYAN}1. Checking campaigns in database...${NC}"
docker-compose exec -T postgres psql -U gmailsaas -d gmail_saas << 'SQL'
SELECT 
    id, 
    name, 
    status, 
    total_recipients,
    created_at,
    updated_at
FROM campaigns 
ORDER BY id DESC 
LIMIT 5;
SQL

echo ""
echo -e "${CYAN}2. Checking Celery worker status...${NC}"
docker-compose exec -T celery_worker celery -A app.celery_app inspect active

echo ""
echo -e "${CYAN}3. Checking Celery worker logs (last 50 lines)...${NC}"
docker-compose logs --tail=50 celery_worker

echo ""
echo -e "${CYAN}4. Checking for any task errors in Redis...${NC}"
docker-compose exec -T redis redis-cli LLEN celery

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ Check complete!${NC}"
echo -e "${BLUE}========================================${NC}"

