#!/usr/bin/env bash
set -euo pipefail

# Comprehensive Speed-Send Installation Script for Ubuntu 22.04
# This script installs all required dependencies and sets up the entire application

echo "🚀 Starting Speed-Send Installation..."
echo "==================================="

# Check if running as root
if [ "${EUID}" -ne 0 ]; then
  echo "❌ Please run as root: sudo bash setup.sh"
  exit 1
fi

# Set non-interactive mode for automated installation
export DEBIAN_FRONTEND=noninteractive

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Update system packages
log_info "Updating system packages..."
apt-get update -y
apt-get upgrade -y

# Install essential packages
log_info "Installing essential packages..."
apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    wget \
    apt-transport-https \
    software-properties-common \
    build-essential \
    git \
    unzip \
    zip \
    nano \
    vim \
    htop \
    ufw \
    fail2ban \
    nginx \
    certbot \
    python3-certbot-nginx

# Install Node.js 18+ (required for frontend)
log_info "Installing Node.js 18..."
if ! command -v node >/dev/null 2>&1 || [[ "$(node -v)" < "v18" ]]; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    apt-get install -y nodejs
else
    log_info "Node.js 18+ already installed"
fi

# Install Docker Engine and Docker Compose plugin
install_docker() {
    if command -v docker >/dev/null 2>&1; then
        log_info "Docker already installed"
        return
    fi

    log_info "Installing Docker Engine..."
    install_dir=/etc/apt/keyrings
    mkdir -p "$install_dir"
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o "$install_dir/docker.gpg"
    chmod a+r "$install_dir/docker.gpg"

    echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=$install_dir/docker.gpg] https://download.docker.com/linux/ubuntu \
        $(. /etc/os-release && echo $VERSION_CODENAME) stable" | \
        tee /etc/apt/sources.list.d/docker.list > /dev/null

    apt-get update -y
    apt-get install -y \
        docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    systemctl enable docker
    systemctl start docker
    log_info "Docker installed successfully"
}

install_docker

# Install Python 3.11+ (required for backend)
log_info "Installing Python 3.11..."
if ! command -v python3.11 >/dev/null 2>&1; then
    add-apt-repository -y ppa:deadsnakes/ppa
    apt-get update -y
    apt-get install -y python3.11 python3.11-dev python3.11-venv python3-pip
    update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1
else
    log_info "Python 3.11+ already installed"
fi

# Install PostgreSQL client tools
log_info "Installing PostgreSQL client..."
apt-get install -y postgresql-client-14

# Create application user
APP_USER="speedsend"
if ! id "$APP_USER" >/dev/null 2>&1; then
    log_info "Creating application user: $APP_USER"
    useradd -m -s /bin/bash "$APP_USER"
    usermod -aG docker "$APP_USER"
else
    log_info "Application user $APP_USER already exists"
fi

# Allow current user to run docker
if id "${SUDO_USER:-$USER}" >/dev/null 2>&1; then
    usermod -aG docker "${SUDO_USER:-$USER}" || true
    usermod -aG docker "$APP_USER" || true
fi

# Setup application directory
APP_DIR="/opt/speed-send"
log_info "Setting up application directory: $APP_DIR"
mkdir -p "$APP_DIR"
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

# Setup basic firewall
log_info "Configuring firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80
ufw allow 443
ufw allow 3000  # Frontend
ufw allow 8000  # Backend API
ufw --force enable

# Setup fail2ban for SSH protection
log_info "Configuring fail2ban..."
systemctl enable fail2ban
systemctl start fail2ban

# Setup nginx basic configuration
log_info "Setting up Nginx..."
cat > /etc/nginx/sites-available/speedsend << 'EOF'
server {
    listen 80;
    server_name _;
    
    # Frontend
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Health check
    location /health {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
EOF

ln -sf /etc/nginx/sites-available/speedsend /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

# Create environment file template
log_info "Creating environment configuration..."
cat > "$APP_DIR/.env.template" << 'EOF'
# Database Configuration
POSTGRES_USER=speedsend_user
POSTGRES_PASSWORD=change_this_secure_password_123
POSTGRES_DB=speedsend_db

# Application Security (CHANGE THESE IN PRODUCTION!)
SECRET_KEY=your-super-secret-key-change-this-in-production-minimum-32-chars
ENCRYPTION_KEY=your-32-bytes-encryption-key-change-this

# External URLs
NEXT_PUBLIC_API_URL=http://localhost:8000

# Email Configuration (Optional)
SMTP_ENABLED=false
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_USE_TLS=true
MESSAGE_ID_DOMAIN=your-domain.com

# Environment
NODE_ENV=production
EOF

# Copy environment template if .env doesn't exist
if [ ! -f "$APP_DIR/.env" ]; then
    cp "$APP_DIR/.env.template" "$APP_DIR/.env"
    log_warn "Created .env file from template. Please edit $APP_DIR/.env with your actual values!"
fi

chown -R "$APP_USER:$APP_USER" "$APP_DIR"

# Create systemd service for docker-compose management
log_info "Creating systemd service..."
cat > /etc/systemd/system/speedsend.service << EOF
[Unit]
Description=Speed-Send Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$APP_DIR
Environment=COMPOSE_PROJECT_NAME=speedsend
ExecStart=/usr/bin/docker compose up -d --build
ExecStop=/usr/bin/docker compose down
User=$APP_USER
Group=$APP_USER

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable speedsend

# Create deployment script
log_info "Creating deployment helpers..."
cat > "$APP_DIR/deploy.sh" << 'EOF'
#!/bin/bash
set -e

echo "🚀 Deploying Speed-Send..."

# Pull latest code
git pull origin main

# Rebuild and restart services
docker compose down
docker compose build --no-cache
docker compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 30

# Check health
docker compose ps
docker compose logs --tail=50

echo "✅ Deployment complete!"
echo "Frontend: http://localhost:3000"
echo "Backend API: http://localhost:8000"
echo "Health check: http://localhost:8000/health"
EOF

chmod +x "$APP_DIR/deploy.sh"

# Create maintenance scripts
cat > "$APP_DIR/logs.sh" << 'EOF'
#!/bin/bash
echo "📋 Speed-Send Logs"
echo "=================="
docker compose logs -f "${1:-}"
EOF

cat > "$APP_DIR/status.sh" << 'EOF'
#!/bin/bash
echo "📊 Speed-Send Status"
echo "===================="
docker compose ps
echo ""
echo "📈 Resource Usage"
echo "=================="
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"
EOF

chmod +x "$APP_DIR/logs.sh" "$APP_DIR/status.sh"
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

# Print installation summary
echo ""
echo "✅ Speed-Send Installation Complete!"
echo "===================================="
echo ""
log_info "📁 Application directory: $APP_DIR"
log_info "👤 Application user: $APP_USER"
log_info "🔧 Configuration file: $APP_DIR/.env"
echo ""
echo "🚀 Next Steps:"
echo "1️⃣  Edit configuration: sudo nano $APP_DIR/.env"
echo "2️⃣  Clone your repository to: $APP_DIR"
echo "    git clone https://github.com/yourusername/speed-send.git $APP_DIR"
echo "3️⃣  Start the application: sudo systemctl start speedsend"
echo "4️⃣  Check status: sudo systemctl status speedsend"
echo ""
echo "🌐 Access URLs:"
echo "   Frontend: http://your-server-ip:3000"
echo "   Backend API: http://your-server-ip:8000"
echo "   Health Check: http://your-server-ip:8000/health"
echo ""
echo "🔧 Useful Commands:"
echo "   View logs: $APP_DIR/logs.sh"
echo "   Check status: $APP_DIR/status.sh"
echo "   Deploy updates: $APP_DIR/deploy.sh"
echo ""
log_warn "⚠️  IMPORTANT: Edit $APP_DIR/.env and change all default passwords!"
log_warn "⚠️  IMPORTANT: Configure SSL certificates for production use"
echo ""
echo "Docker version: $(docker --version)"
echo "Docker Compose version: $(docker compose version 2>/dev/null || echo 'Not available')"
echo "Node.js version: $(node --version 2>/dev/null || echo 'Not available')"
echo "Python version: $(python3 --version 2>/dev/null || echo 'Not available')"