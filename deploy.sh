#!/bin/bash

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m'

# --- Helper Functions ---
print_section() { echo -e "\n${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━\n${WHITE}$1${NC}\n${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; }
print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; exit 1; }
command_exists() { command -v "$1" >/dev/null 2>&1; }

# --- Sudo detection ---
SUDO_CMD=""
if [ "$(id -u)" -ne 0 ]; then
    print_info "Regular user detected, will use sudo."
    if ! command_exists sudo; then
        print_error "Script requires sudo to be installed for non-root users."
    fi
    SUDO_CMD="sudo"
else
    print_info "Root user detected."
fi

# --- Command Passthrough Handling ---
# Allows running commands like: ./deploy.sh alembic upgrade head
if [ "$1" == "alembic" ]; then
    shift
    print_section "Running Alembic command: $@"
    docker compose exec backend alembic "$@"
    print_success "Alembic command finished."
    exit 0
fi

# --- Main Script ---

# Banner
clear
echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║     Gmail Bulk Sender SaaS - Automated Deployment           ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝${NC}\n"

# Install Docker if not present
print_section "🐳 Docker & Docker Compose Check"
if ! command_exists docker; then
    print_info "Installing Docker..."
    $SUDO_CMD apt-get update -y
    $SUDO_CMD apt-get install -y ca-certificates curl gnupg
    $SUDO_CMD install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | $SUDO_CMD gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    $SUDO_CMD chmod a+r /etc/apt/keyrings/docker.gpg
    echo \
      "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
      $SUDO_CMD tee /etc/apt/sources.list.d/docker.list > /dev/null
    $SUDO_CMD apt-get update -y
    $SUDO_CMD apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    print_success "Docker installed successfully."
else
    print_success "Docker is already installed."
fi

# Check for Docker Compose v2 (plugin)
if ! docker compose version >/dev/null 2>&1; then
    print_error "Docker Compose (v2 plugin) not found. Please ensure it is installed correctly."
fi
print_success "Docker Compose is available."

# Environment Configuration
print_section "🔐 Environment Configuration"
if [ ! -f .env ]; then
    print_info "Generating .env file..."
    SECRET_KEY=$(openssl rand -hex 32)
    DB_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)
    ENCRYPTION_KEY=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)
    cat > .env << EOF
SECRET_KEY=${SECRET_KEY}
ENCRYPTION_KEY=${ENCRYPTION_KEY}
DATABASE_URL=postgresql://gmailsaas:${DB_PASSWORD}@postgres:5432/gmailsaas
POSTGRES_USER=gmailsaas
POSTGRES_PASSWORD=${DB_PASSWORD}
POSTGRES_DB=gmailsaas
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0
NEXT_PUBLIC_API_URL=http://localhost:8000
EOF
    print_success ".env file created with secure keys."
else
    print_success ".env file already exists."
fi

# Build and Start
print_section "🚀 Build & Launch"
print_info "Building images and starting services..."
docker compose build --no-cache
docker compose up -d

# Health Check
print_section "⏳ Waiting for Services"
print_info "Waiting for backend to be healthy..."
max_attempts=30
attempt=0
until curl -s http://localhost:8000/health > /dev/null; do
    if [ $attempt -ge $max_attempts ]; then
        print_error "Backend failed to start. Check logs with: docker compose logs backend"
    fi
    echo -n "."
    sleep 2
    ((attempt++))
done
echo ""
print_success "Backend is healthy!"

# Final Info
SERVER_IP=$(hostname -I | awk '{print $1}')
print_section "✅ Deployment Complete"
echo -e "${GREEN}Your Gmail Bulk Sender is now running!${NC}\n"
echo -e "   Frontend:  ${WHITE}http://${SERVER_IP}:3000${NC}"
echo -e "   Backend:   ${WHITE}http://${SERVER_IP}:8000${NC}"
echo -e "   API Docs:  ${WHITE}http://${SERVER_IP}:8000/docs${NC}\n"
echo -e "To view logs, run: ${CYAN}docker compose logs -f${NC}"
echo -e "To stop, run: ${CYAN}docker compose stop${NC}"
