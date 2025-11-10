#!/bin/bash
set -euo pipefail

# Comprehensive Speed-Send Deployment Script
# This script handles the complete deployment process with error checking

# Error recovery function
cleanup_on_error() {
    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
        log_error "Deployment failed with exit code $exit_code"
        log_info "Starting error recovery procedures..."
        
        # Stop any partially started containers
        docker compose down --remove-orphans 2>/dev/null || true
        
        # Show recent logs for debugging
        log_info "Recent container logs:"
        docker compose logs --tail=20 2>/dev/null || true
        
        # Check disk space
        log_info "Current disk usage:"
        df -h / 2>/dev/null || true
        
        log_info "Recovery completed. Please check the logs above and retry deployment."
    fi
}

# Set up error trap
trap cleanup_on_error EXIT

echo "🚀 Starting Speed-Send Comprehensive Deployment"
echo "==============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if running in project directory
if [ ! -f "docker-compose.yml" ]; then
    log_error "docker-compose.yml not found. Please run this script from the project root."
    exit 1
fi

# Step 1: Pre-deployment checks
log_step "1. Pre-deployment validation"

# Check if Docker is installed
if ! command -v docker >/dev/null 2>&1; then
    log_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker compose >/dev/null 2>&1; then
    log_error "Docker Compose is not available. Please install Docker Compose."
    exit 1
fi

log_info "Docker and Docker Compose are available"

# Step 2: Verify critical files
log_step "2. Verifying critical application files"

# Check frontend files
FRONTEND_FILES=(
    "frontend/package.json"
    "frontend/src/lib/api.ts"
    "frontend/src/app/campaigns/page.tsx"
    "frontend/Dockerfile"
)

for file in "${FRONTEND_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        log_error "Critical frontend file missing: $file"
        exit 1
    fi
done

# Check backend files
BACKEND_FILES=(
    "backend/requirements.txt"
    "backend/app/main.py"
    "backend/Dockerfile"
)

for file in "${BACKEND_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        log_error "Critical backend file missing: $file"
        exit 1
    fi
done

log_info "All critical files present"

# Step 3: Environment setup
log_step "3. Setting up environment configuration"

if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        log_warn ".env file not found. Copying from .env.example"
        cp .env.example .env
        log_warn "⚠️  IMPORTANT: Please edit .env file with your actual configuration!"
    else
        log_error ".env.example file not found. Cannot create environment configuration."
        exit 1
    fi
else
    log_info "Environment file (.env) found"
fi

# Step 4: Clean previous builds
log_step "4. Cleaning previous builds and containers"

log_info "Stopping existing containers..."
docker compose down --remove-orphans 2>/dev/null || true

log_info "Removing unused Docker resources..."
docker system prune -f >/dev/null 2>&1 || true

# Step 5: Build and start services
log_step "5. Building and starting services"

log_info "Building services (this may take several minutes)..."

# Check disk space before build
AVAILABLE_SPACE=$(df / | tail -1 | awk '{print $4}')
REQUIRED_SPACE=2097152  # 2GB in KB
if [ "$AVAILABLE_SPACE" -lt "$REQUIRED_SPACE" ]; then
    log_error "❌ Insufficient disk space. Required: 2GB, Available: $((AVAILABLE_SPACE/1024/1024))GB"
    exit 1
fi

# Create backup snapshot
BACKUP_TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
log_info "Creating backup snapshot..."
docker compose ps --format json > "/tmp/speedsend_backup_${BACKUP_TIMESTAMP}.json" 2>/dev/null || true

if docker compose build --no-cache; then
    log_info "✅ Build completed successfully"
else
    log_error "❌ Build failed. Check the output above for errors."
    
    # Try to restore previous state if backup exists
    if [ -f "/tmp/speedsend_backup_${BACKUP_TIMESTAMP}.json" ] && [ -s "/tmp/speedsend_backup_${BACKUP_TIMESTAMP}.json" ]; then
        log_info "Attempting to restore previous state..."
        docker compose up -d 2>/dev/null || true
    fi
    exit 1
fi

log_info "Starting services..."
if docker compose up -d; then
    log_info "✅ Services started successfully"
else
    log_error "❌ Failed to start services"
    exit 1
fi

# Step 6: Health checks
log_step "6. Performing health checks"

log_info "Waiting for services to initialize..."
sleep 30

# Check container status
log_info "Checking container status:"
docker compose ps

# Check if services are responding
log_info "Testing service connectivity..."

# Test backend health
BACKEND_HEALTHY=false
for i in {1..10}; do
    if curl -s http://localhost:8000/health >/dev/null 2>&1; then
        BACKEND_HEALTHY=true
        break
    fi
    log_info "Waiting for backend to be ready... (attempt $i/10)"
    sleep 5
done

if [ "$BACKEND_HEALTHY" = true ]; then
    log_info "✅ Backend is healthy"
else
    log_warn "⚠️  Backend health check failed"
fi

# Test frontend
FRONTEND_HEALTHY=false
for i in {1..10}; do
    if curl -s http://localhost:3000 >/dev/null 2>&1; then
        FRONTEND_HEALTHY=true
        break
    fi
    log_info "Waiting for frontend to be ready... (attempt $i/10)"
    sleep 5
done

if [ "$FRONTEND_HEALTHY" = true ]; then
    log_info "✅ Frontend is healthy"
else
    log_warn "⚠️  Frontend health check failed"
fi

# Step 7: Display results
log_step "7. Deployment Summary"

echo ""
echo "🎉 Speed-Send Deployment Complete!"
echo "=================================="
echo ""
log_info "📊 Service Status:"
docker compose ps

echo ""
log_info "🌐 Access URLs:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:8000"
echo "   API Documentation: http://localhost:8000/docs"
echo "   Health Check: http://localhost:8000/health"

echo ""
log_info "📋 Useful Commands:"
echo "   View logs: docker compose logs -f"
echo "   View specific service logs: docker compose logs -f [service_name]"
echo "   Stop services: docker compose down"
echo "   Restart services: docker compose restart"
echo "   Update and redeploy: ./deploy-comprehensive.sh"

echo ""
if [ "$BACKEND_HEALTHY" = true ] && [ "$FRONTEND_HEALTHY" = true ]; then
    echo -e "${GREEN}🎯 All services are running successfully!${NC}"
    echo ""
    log_info "🔧 Next Steps:"
    echo "   1. Configure your Google Workspace service accounts"
    echo "   2. Set up your email campaigns"
    echo "   3. Test email sending functionality"
    echo "   4. Monitor application logs and performance"
else
    echo -e "${YELLOW}⚠️  Some services may not be fully ready yet.${NC}"
    echo "   Check individual service logs for details:"
    echo "   docker compose logs backend"
    echo "   docker compose logs frontend"
fi

echo ""
log_warn "🔐 Security Reminder:"
echo "   - Change default passwords in .env file"
echo "   - Configure firewall rules for production"
echo "   - Set up SSL certificates for HTTPS"
echo "   - Regular security updates"

echo ""
echo "✨ Speed-Send is now ready for use!"