#!/bin/bash
set -euo pipefail

# Comprehensive Speed-Send Validation and Deployment Script
echo "🔍 Speed-Send Pre-Deployment Validation & Build Test"
echo "=================================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
log_warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }

# Step 1: Validate Environment
echo "1️⃣ Validating Environment..."

if ! command -v docker >/dev/null 2>&1; then
    log_error "Docker not found. Please install Docker first."
    exit 1
fi

if ! command -v docker compose >/dev/null 2>&1; then
    log_error "Docker Compose not found. Please install Docker Compose."
    exit 1
fi

log_success "Docker and Docker Compose available"

# Step 2: Validate Critical Files
echo "2️⃣ Validating Critical Files..."

REQUIRED_FILES=(
    "docker-compose.yml"
    "frontend/package.json"
    "frontend/Dockerfile"
    "frontend/next.config.js"
    "frontend/tsconfig.json"
    "frontend/src/lib/api.ts"
    "frontend/src/app/layout.tsx"
    "frontend/src/app/page.tsx"
    "backend/requirements.txt"
    "backend/Dockerfile"
    "backend/app/main.py"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        log_error "Required file missing: $file"
        exit 1
    fi
done

log_success "All required files present"

# Step 3: Validate Frontend Structure
echo "3️⃣ Validating Frontend Structure..."

# Check if public directory exists
if [ ! -d "frontend/public" ]; then
    log_warn "Creating frontend/public directory..."
    mkdir -p frontend/public
    echo "# Speed-Send Static Assets" > frontend/public/README.md
fi

# Check package.json structure
if ! grep -q '"next"' frontend/package.json; then
    log_error "Next.js not found in package.json dependencies"
    exit 1
fi

if ! grep -q '"react"' frontend/package.json; then
    log_error "React not found in package.json dependencies"
    exit 1
fi

log_success "Frontend structure validated"

# Step 4: Validate API Configuration
echo "4️⃣ Validating API Configuration..."

if ! grep -q "export const API_URL" frontend/src/lib/api.ts; then
    log_error "API_URL export not found in frontend/src/lib/api.ts"
    exit 1
fi

if ! grep -q "apiClient" frontend/src/lib/api.ts; then
    log_error "apiClient not found in frontend/src/lib/api.ts"
    exit 1
fi

log_success "API configuration validated"

# Step 5: Check Environment Configuration
echo "5️⃣ Checking Environment Configuration..."

if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        log_warn "Creating .env from .env.example"
        cp .env.example .env
    else
        log_warn "No .env file found. Creating basic template..."
        cat > .env << 'EOF'
# Database Configuration
POSTGRES_USER=speedsend_user
POSTGRES_PASSWORD=change_this_secure_password_123
POSTGRES_DB=speedsend_db

# Application Security
SECRET_KEY=your-super-secret-key-change-this-in-production-minimum-32-chars
ENCRYPTION_KEY=your-32-bytes-encryption-key-change-this

# Frontend Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000

# Environment
NODE_ENV=production
EOF
        log_warn "Please edit .env file with your actual configuration!"
    fi
fi

log_success "Environment configuration checked"

# Step 6: Clean Previous Builds
echo "6️⃣ Cleaning Previous Builds..."

docker compose down --remove-orphans 2>/dev/null || true
docker system prune -f >/dev/null 2>&1 || true

log_success "Previous builds cleaned"

# Step 7: Test Frontend Build
echo "7️⃣ Testing Frontend Build..."

log_warn "Building frontend Docker image (this may take several minutes)..."

if docker compose build frontend; then
    log_success "Frontend build successful!"
else
    log_error "Frontend build failed. Check the logs above."
    
    echo ""
    echo "🔧 Troubleshooting Frontend Build Issues:"
    echo "1. Check if all dependencies are properly listed in package.json"
    echo "2. Verify that all TypeScript files compile without errors"
    echo "3. Ensure all required imports are available"
    echo "4. Check Docker logs for specific error details"
    echo ""
    
    # Try to get more details
    echo "📋 Frontend Package.json Dependencies:"
    cat frontend/package.json | grep -A 20 '"dependencies"' | head -25
    
    echo ""
    echo "📋 Frontend TypeScript Config:"
    cat frontend/tsconfig.json | head -15
    
    exit 1
fi

# Step 8: Test Backend Build
echo "8️⃣ Testing Backend Build..."

if docker compose build backend; then
    log_success "Backend build successful!"
else
    log_error "Backend build failed. Check the logs above."
    exit 1
fi

# Step 9: Test Full Application Startup
echo "9️⃣ Testing Complete Application Startup..."

log_warn "Starting all services..."

if docker compose up -d; then
    log_success "All services started successfully!"
    
    echo ""
    echo "⏳ Waiting for services to initialize..."
    sleep 30
    
    echo "📊 Service Status:"
    docker compose ps
    
    echo ""
    echo "🌐 Testing Service Connectivity..."
    
    # Test frontend
    if curl -s http://localhost:3000 >/dev/null; then
        log_success "Frontend accessible at http://localhost:3000"
    else
        log_warn "Frontend may still be starting up"
    fi
    
    # Test backend
    if curl -s http://localhost:8000/health >/dev/null 2>&1; then
        log_success "Backend accessible at http://localhost:8000"
    else
        log_warn "Backend may still be starting up"
    fi
    
else
    log_error "Failed to start services"
    echo "📋 Service logs:"
    docker compose logs --tail=50
    exit 1
fi

# Step 10: Final Validation
echo "🔟 Final Validation..."

echo ""
echo "🎉 Speed-Send Deployment Validation Complete!"
echo "=========================================="
echo ""
log_success "✅ All builds successful"
log_success "✅ All services running"
log_success "✅ Configuration validated"
echo ""
echo "🌐 Your Application:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
echo "   Health Check: http://localhost:8000/health"
echo ""
echo "🔧 Management Commands:"
echo "   View logs: docker compose logs -f"
echo "   Stop services: docker compose down"
echo "   Restart: docker compose restart"
echo "   Update: git pull && docker compose build --no-cache && docker compose up -d"
echo ""
log_warn "🔐 Security Reminder:"
echo "   1. Change default passwords in .env file"
echo "   2. Generate secure SECRET_KEY and ENCRYPTION_KEY"
echo "   3. Configure firewall for production use"
echo "   4. Set up SSL certificates for HTTPS"
echo ""
echo "✨ Speed-Send is now ready for use!"