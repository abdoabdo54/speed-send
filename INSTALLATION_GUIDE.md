# 🚀 Speed-Send Complete Installation Guide

## Prerequisites
- Ubuntu 22.04 LTS server
- Root or sudo access
- At least 2GB RAM and 10GB disk space
- Internet connection

## Quick Installation

### 1. Download and run the installation script:
```bash
# Download the installation script
wget https://raw.githubusercontent.com/yourusername/speed-send/main/setup.sh
# or
curl -fsSL https://raw.githubusercontent.com/yourusername/speed-send/main/setup.sh -o setup.sh

# Make executable and run
chmod +x setup.sh
sudo bash setup.sh
```

### 2. Clone the application:
```bash
# Navigate to application directory
cd /opt/speed-send

# Clone your repository
sudo -u speedsend git clone https://github.com/yourusername/speed-send.git .

# Copy environment template
sudo -u speedsend cp .env.example .env
```

### 3. Configure environment:
```bash
# Edit the environment file
sudo nano /opt/speed-send/.env
```

**Important**: Change these values in `.env`:
- `POSTGRES_PASSWORD` - Set a strong password
- `SECRET_KEY` - Generate a 32+ character secret
- `ENCRYPTION_KEY` - Generate a 32-byte encryption key
- `NEXT_PUBLIC_API_URL` - Set to your domain or IP

### 4. Start the application:
```bash
# Start services
sudo systemctl start speedsend

# Check status
sudo systemctl status speedsend

# View logs
sudo journalctl -u speedsend -f
```

## Manual Installation (Alternative)

If the automated script doesn't work, follow these manual steps:

### Step 1: Update System
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git build-essential
```

### Step 2: Install Docker
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

### Step 3: Install Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Step 4: Clone and Configure
```bash
git clone https://github.com/yourusername/speed-send.git
cd speed-send
cp .env.example .env
nano .env  # Edit configuration
```

### Step 5: Build and Run
```bash
docker compose up -d --build
```

## Troubleshooting

### Build Fails with Missing Dependencies
If you get build errors, ensure all dependencies are installed:
```bash
# Frontend dependencies
cd frontend
npm install --legacy-peer-deps
npm run build

# Backend dependencies
cd ../backend
pip install -r requirements.txt
```

### Port Already in Use
```bash
# Check what's using the ports
sudo netstat -tulpn | grep :3000
sudo netstat -tulpn | grep :8000

# Stop conflicting services
sudo systemctl stop apache2  # if using Apache
sudo systemctl stop nginx    # if not configured for proxy
```

### Docker Issues
```bash
# Restart Docker
sudo systemctl restart docker

# Clean Docker cache
docker system prune -af
docker volume prune -f

# Rebuild without cache
docker compose build --no-cache
```

### Database Connection Issues
```bash
# Check if PostgreSQL is running
docker compose ps

# View database logs
docker compose logs postgres

# Reset database (WARNING: deletes all data)
docker compose down -v
docker compose up -d
```

## Post-Installation

### Setup SSL Certificate (Production)
```bash
# Install Certbot (already done in setup.sh)
sudo certbot --nginx -d yourdomain.com

# Auto-renewal
sudo systemctl enable certbot.timer
```

### Configure Firewall
```bash
# Basic firewall (already done in setup.sh)
sudo ufw status

# Allow additional ports if needed
sudo ufw allow 443  # HTTPS
```

### Monitoring
```bash
# View application status
/opt/speed-send/status.sh

# View logs
/opt/speed-send/logs.sh

# Restart services
sudo systemctl restart speedsend
```

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `POSTGRES_USER` | Database username | `speedsend_user` |
| `POSTGRES_PASSWORD` | Database password | `secure_password_123` |
| `POSTGRES_DB` | Database name | `speedsend_db` |
| `SECRET_KEY` | JWT secret key | `your-32-char-secret` |
| `ENCRYPTION_KEY` | Data encryption key | `32-bytes-encryption-key` |
| `NEXT_PUBLIC_API_URL` | Frontend API URL | `https://api.yourdomain.com` |
| `SMTP_HOST` | Email server host | `smtp.gmail.com` |
| `SMTP_USER` | Email username | `your-email@gmail.com` |
| `SMTP_PASS` | Email password | `app-specific-password` |

## Performance Tuning

### For High Volume Email Sending
Edit `docker-compose.yml`:
```yaml
celery_worker:
  command: celery -A app.celery_app worker --loglevel=info --concurrency=100 --pool=threads --prefetch-multiplier=200
```

### For Limited Resources
```yaml
celery_worker:
  command: celery -A app.celery_app worker --loglevel=info --concurrency=10 --pool=threads
```

## Support

If you encounter issues:

1. Check the logs: `/opt/speed-send/logs.sh`
2. Verify configuration: `cat /opt/speed-send/.env`
3. Check service status: `sudo systemctl status speedsend`
4. Review Docker containers: `docker compose ps`
5. Check system resources: `htop` or `/opt/speed-send/status.sh`

## Security Checklist

- [ ] Changed default passwords in `.env`
- [ ] Generated secure SECRET_KEY and ENCRYPTION_KEY
- [ ] Configured firewall (UFW)
- [ ] Setup SSL certificates for production
- [ ] Configured fail2ban for SSH protection
- [ ] Regular security updates: `sudo apt update && sudo apt upgrade`