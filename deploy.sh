#!/bin/bash

# Gmail Bulk Sender SaaS - Deployment Script for Ubuntu
# This script automates the deployment process on Ubuntu servers

set -e

echo "🚀 Gmail Bulk Sender SaaS - Deployment Script"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running on Ubuntu
if [ ! -f /etc/lsb-release ]; then
    echo -e "${RED}❌ This script is designed for Ubuntu. Exiting.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Ubuntu detected${NC}"

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Please do not run as root. Run as a regular user with sudo privileges.${NC}"
    exit 1
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

echo ""
echo "📦 Installing Dependencies..."
echo "=============================="

# Update system
echo "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Docker if not present
if ! command_exists docker; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    echo -e "${GREEN}✓ Docker installed${NC}"
else
    echo -e "${GREEN}✓ Docker already installed${NC}"
fi

# Install Docker Compose if not present
if ! command_exists docker-compose; then
    echo "Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo -e "${GREEN}✓ Docker Compose installed${NC}"
else
    echo -e "${GREEN}✓ Docker Compose already installed${NC}"
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo ""
    echo -e "${YELLOW}⚠️  .env file not found. Creating from .env.example...${NC}"
    cp .env.example .env
    
    # Generate random keys
    SECRET_KEY=$(openssl rand -base64 32)
    ENCRYPTION_KEY=$(openssl rand -base64 24)
    DB_PASSWORD=$(openssl rand -base64 16)
    
    # Update .env file
    sed -i "s/your-secret-key-change-in-production-min-32-characters/$SECRET_KEY/" .env
    sed -i "s/your-encryption-key-exactly-32-bytes-long-here/$ENCRYPTION_KEY/" .env
    sed -i "s/gmailsaas123/$DB_PASSWORD/" .env
    
    echo -e "${GREEN}✓ .env file created with random secrets${NC}"
    echo -e "${YELLOW}⚠️  Please edit .env file to configure NEXT_PUBLIC_API_URL and other settings${NC}"
    echo ""
    read -p "Press Enter to continue after editing .env file..."
fi

echo ""
echo "🏗️  Building Application..."
echo "============================"

# Build Docker images
docker-compose build

echo -e "${GREEN}✓ Application built successfully${NC}"

echo ""
echo "🚀 Starting Services..."
echo "======================="

# Start services
docker-compose up -d

echo -e "${GREEN}✓ Services started${NC}"

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check if services are running
echo ""
echo "📊 Service Status:"
echo "=================="
docker-compose ps

echo ""
echo "🎉 Deployment Complete!"
echo "======================="
echo ""
echo "Your application is now running:"
echo "  - Frontend: http://localhost:3000"
echo "  - Backend API: http://localhost:8000"
echo "  - API Docs: http://localhost:8000/docs"
echo ""
echo "Next steps:"
echo "  1. Configure Nginx reverse proxy (optional)"
echo "  2. Setup SSL certificate (optional)"
echo "  3. Upload your service account JSONs"
echo "  4. Create your first campaign"
echo ""
echo "Useful commands:"
echo "  - View logs: docker-compose logs -f"
echo "  - Stop services: docker-compose down"
echo "  - Restart: docker-compose restart"
echo ""
echo -e "${GREEN}Happy sending! 📧${NC}"

