# Production Deployment Guide for Ubuntu Server

This guide covers deploying the Gmail Bulk Sender SaaS on an Ubuntu server (VPS, cloud instance, or dedicated server).

## Prerequisites

- Ubuntu 20.04 LTS or later
- Minimum 2GB RAM, 20GB disk space
- Root or sudo access
- (Optional) Domain name for SSL

## Automated Deployment

We provide an automated deployment script for Ubuntu:

```bash
# Clone repository
git clone <your-repo-url>
cd gmail-bulk-sender-saas

# Make deployment script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

The script will:
1. Install Docker and Docker Compose
2. Generate secure random keys
3. Create `.env` file
4. Build Docker images
5. Start all services

## Manual Deployment

### Step 1: Install Docker & Docker Compose

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout and login for group changes to take effect
```

### Step 2: Clone Repository

```bash
git clone <your-repo-url>
cd gmail-bulk-sender-saas
```

### Step 3: Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Generate secure keys
SECRET_KEY=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 24)
DB_PASSWORD=$(openssl rand -base64 16)

# Edit .env file
nano .env
```

Update these values:

```env
# Database
POSTGRES_PASSWORD=<DB_PASSWORD from above>

# Security
SECRET_KEY=<SECRET_KEY from above>
ENCRYPTION_KEY=<ENCRYPTION_KEY from above>

# Frontend (use your domain or server IP)
NEXT_PUBLIC_API_URL=https://your-domain.com

# Environment
ENVIRONMENT=production
```

### Step 4: Build and Start

```bash
# Build images
docker-compose build

# Start services in background
docker-compose up -d

# Check status
docker-compose ps
```

## Setting Up Nginx Reverse Proxy

### Install Nginx

```bash
sudo apt install nginx -y
```

### Configure Nginx

Create a new site configuration:

```bash
sudo nano /etc/nginx/sites-available/gmail-saas
```

Add this configuration:

```nginx
# Upstream backends
upstream frontend {
    server localhost:3000;
}

upstream backend {
    server localhost:8000;
}

# HTTP server - redirect to HTTPS
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    # Redirect all other HTTP to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL certificates (will be added by certbot)
    # ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Frontend
    location / {
        proxy_pass http://frontend;
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
    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS headers
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, PATCH, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization' always;
    }

    # Backend docs
    location /docs {
        proxy_pass http://backend;
        proxy_set_header Host $host;
    }

    # Max upload size for service account JSONs
    client_max_body_size 10M;
}
```

Enable the site:

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/gmail-saas /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

## SSL Certificate with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

Certificates will auto-renew via cron job.

## Firewall Configuration

```bash
# Allow SSH
sudo ufw allow OpenSSH

# Allow HTTP and HTTPS
sudo ufw allow 'Nginx Full'

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

## Auto-Start on Boot

Create a systemd service:

```bash
sudo nano /etc/systemd/system/gmail-saas.service
```

Add:

```ini
[Unit]
Description=Gmail Bulk Sender SaaS
Requires=docker.service
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/your-username/gmail-bulk-sender-saas
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
User=your-username
Group=your-username

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable gmail-saas
sudo systemctl start gmail-saas
```

## Monitoring and Logs

### View all logs
```bash
docker-compose logs -f
```

### View specific service
```bash
docker-compose logs -f backend
docker-compose logs -f celery_worker
```

### Check service status
```bash
docker-compose ps
```

### Monitor resource usage
```bash
docker stats
```

## Backup Strategy

### Database Backup

Create a backup script:

```bash
nano ~/backup-gmail-saas.sh
```

Add:

```bash
#!/bin/bash
BACKUP_DIR="/home/your-username/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

cd /home/your-username/gmail-bulk-sender-saas
docker-compose exec -T postgres pg_dump -U gmailsaas gmail_saas > $BACKUP_DIR/backup_$DATE.sql

# Keep only last 7 days
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete
```

Make executable:

```bash
chmod +x ~/backup-gmail-saas.sh
```

Add to crontab (daily at 2 AM):

```bash
crontab -e
```

Add line:

```
0 2 * * * /home/your-username/backup-gmail-saas.sh
```

### Restore from Backup

```bash
cd gmail-bulk-sender-saas
cat /path/to/backup.sql | docker-compose exec -T postgres psql -U gmailsaas gmail_saas
```

## Scaling for High Volume

### Increase Worker Concurrency

Edit `docker-compose.yml`:

```yaml
celery_worker:
  # ...
  command: celery -A app.celery_app worker --loglevel=info --concurrency=20
```

### Add More Workers

```bash
docker-compose up -d --scale celery_worker=3
```

### Optimize PostgreSQL

Edit PostgreSQL configuration for better performance:

```bash
docker-compose exec postgres bash
nano /var/lib/postgresql/data/postgresql.conf
```

Increase these values based on your RAM:

```
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
max_connections = 200
```

Restart:

```bash
docker-compose restart postgres
```

## Troubleshooting

### Check if services are running
```bash
docker-compose ps
```

### Restart all services
```bash
docker-compose restart
```

### Rebuild after code changes
```bash
docker-compose down
git pull
docker-compose build
docker-compose up -d
```

### Clear Redis cache
```bash
docker-compose exec redis redis-cli FLUSHALL
```

### Database connection issues
```bash
# Check PostgreSQL logs
docker-compose logs postgres

# Verify database exists
docker-compose exec postgres psql -U gmailsaas -c "\l"
```

## Security Best Practices

1. **Change default passwords** in `.env`
2. **Use strong encryption keys** (32+ characters)
3. **Enable firewall** (UFW)
4. **Use HTTPS** (Let's Encrypt)
5. **Regular backups** (automated)
6. **Keep Docker updated**: `sudo apt update && sudo apt upgrade`
7. **Monitor logs** for suspicious activity
8. **Restrict database access** (not exposed publicly)
9. **Use private networks** for Docker containers
10. **Regular security updates**: `docker-compose pull && docker-compose up -d`

## Performance Tips

1. **Use SSD storage** for database
2. **Allocate enough RAM** (4GB+ recommended for high volume)
3. **Monitor disk space** (logs can grow large)
4. **Configure log rotation**
5. **Use Redis persistence** for important queue data
6. **Monitor campaign performance** and adjust concurrency
7. **Optimize recipient batch sizes**

## Support

For deployment issues:
1. Check logs: `docker-compose logs`
2. Verify environment variables in `.env`
3. Ensure all ports are available
4. Check firewall rules
5. Review nginx error logs: `sudo tail -f /var/log/nginx/error.log`

---

**Deployment completed successfully! 🚀**

