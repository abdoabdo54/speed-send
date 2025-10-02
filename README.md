# Gmail Bulk Sender SaaS - PowerMTA Mode ⚡

**Send 15,000 emails in <15 seconds!**

A professional, full-stack web application for sending bulk emails via Google Workspace accounts using service account JSONs with domain-wide delegation. Built with PowerMTA-style instant parallel sending.

## ⚡ **ONE-COMMAND INSTALLATION**

```bash
git clone https://github.com/abdoabdo54/speed-send.git
cd speed-send
chmod +x deploy.sh && ./deploy.sh
```

**Done!** Everything installs automatically in 5-10 minutes.

---

## 🚀 Features

### Core Capabilities
- **Multi-Account Management**: Upload and manage multiple Google Cloud service account JSON files
- **Auto-Fetch Users**: Automatically fetch all users in your Workspace domain via Admin SDK
- **Campaign Management**: PowerMTA-style campaign builder with pause/resume/duplicate functionality
- **High-Performance Sending**: Send thousands of emails in parallel with smart rotation and rate limiting
- **Queue Management**: Full campaign lifecycle with persistent state (survives restarts)
- **Test Mode**: Send test emails before launching full campaigns
- **Professional UI**: Modern SaaS-quality interface with dark/light mode support

### Technical Features
- **Smart Rotation**: Round-robin distribution across accounts and users
- **Rate Limiting**: Respect Gmail quotas (500/day personal, 2000/day Workspace)
- **Concurrency Control**: Configurable per-account and global concurrency
- **Encryption**: AES-256 encrypted storage of service account credentials
- **Personalization**: Variable substitution in subject and body ({{name}}, {{company}}, etc.)
- **Retry Logic**: Automatic retry with exponential backoff
- **Real-time Updates**: Live campaign progress tracking

## 🏗️ Architecture

### Tech Stack

**Frontend**
- Next.js 14 (React 18)
- TypeScript
- Tailwind CSS + shadcn/ui components
- Axios for API calls

**Backend**
- Python 3.11
- FastAPI (REST API)
- SQLAlchemy (ORM)
- PostgreSQL (Database)
- Celery (Task Queue)
- Redis (Message Broker)

**Google APIs**
- Gmail API (sending)
- Admin SDK Directory API (user fetching)
- Service Account with Domain-Wide Delegation

**Infrastructure**
- Docker & Docker Compose
- Production: Can be deployed on any Ubuntu server, VPS, or cloud platform

## 📋 Prerequisites

### For Development
- Docker & Docker Compose
- Git

### For Production (Ubuntu Server)
- Ubuntu 20.04 or later
- Docker & Docker Compose
- At least 2GB RAM
- Domain name (optional, for SSL)

### Google Cloud Setup
1. **Create a Google Cloud Project**
2. **Enable APIs**:
   - Gmail API
   - Admin SDK API
3. **Create Service Account**:
   - Go to IAM & Admin → Service Accounts
   - Create new service account
   - Generate JSON key
4. **Enable Domain-Wide Delegation**:
   - In service account details, enable domain-wide delegation
   - Note the Client ID
5. **Configure OAuth Scopes in Workspace Admin**:
   - Go to Google Workspace Admin Console
   - Security → API Controls → Domain-wide Delegation
   - Add your service account Client ID
   - Add scopes:
     - `https://www.googleapis.com/auth/gmail.send`
     - `https://www.googleapis.com/auth/gmail.compose`
     - `https://www.googleapis.com/auth/gmail.insert`
     - `https://www.googleapis.com/auth/gmail.modify`
     - `https://www.googleapis.com/auth/admin.directory.user.readonly`

## 🚀 Quick Start - ONE COMMAND INSTALLATION! ⚡

### **100% Automated - Zero Configuration Required!**

```bash
# 1. Clone repository
git clone https://github.com/abdoabdo54/speed-send.git
cd speed-send

# 2. Run ONE command (installs EVERYTHING automatically!)
chmod +x deploy.sh && ./deploy.sh
```

### **That's It! 🎉**

The automated installer will:
- ✅ Install Docker & Docker Compose
- ✅ Install all system dependencies  
- ✅ Generate secure encryption keys automatically
- ✅ Configure PostgreSQL database
- ✅ Build all containers
- ✅ Start all services
- ✅ Wait for services to be ready
- ✅ Open application in browser

**Total Time: 5-10 minutes**

### **For Windows Users:**

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop)
2. Double-click `deploy.bat`
3. Done!

### **Access Your Application:**

After installation completes:
- 🌐 **Frontend**: http://YOUR_IP:3000
- ⚙️ **Backend API**: http://YOUR_IP:8000  
- 📚 **API Docs**: http://YOUR_IP:8000/docs

(The installer displays your IP automatically)

### **Quick Start Guide:**

1. **Upload Service Account** (Accounts page)
   - Click "Add Account"
   - Paste your Google Cloud service account JSON
   - Click "Sync" to fetch users

2. **Create Campaign** (Campaigns page)
   - Click "New Campaign"
   - Select your accounts (all 12 for max speed!)
   - Add recipients (email,name,company format)
   - Compose email with {{variables}}
   - Click "Create Campaign"

3. **Send at Light Speed** ⚡
   - Click **"Start"** button
   - Watch **15,000 emails send in <15 seconds!**
   - See real-time progress bars

### **Update Existing Installation:**

```bash
# One command to update
chmod +x update.sh && ./update.sh
```

## 🌐 Production Deployment (Ubuntu Server)

### 1. Prepare Ubuntu Server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add user to docker group
sudo usermod -aG docker $USER
```

### 2. Clone and Configure

```bash
# Clone repository
git clone <your-repo-url>
cd gmail-bulk-sender-saas

# Create production environment file
cp .env.example .env
nano .env
```

Update `.env` for production:

```env
POSTGRES_PASSWORD=strong_random_password_here
SECRET_KEY=generate-strong-random-key-min-32-chars
ENCRYPTION_KEY=exactly-32-character-key-here!!
NEXT_PUBLIC_API_URL=https://your-domain.com  # or http://server-ip:8000
ENVIRONMENT=production
```

### 3. Build and Run

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# Check status
docker-compose ps
```

### 4. Setup Nginx Reverse Proxy (Optional)

```bash
sudo apt install nginx -y
```

Create `/etc/nginx/sites-available/gmail-saas`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/gmail-saas /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 5. Setup SSL with Let's Encrypt (Optional)

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

### 6. Auto-Start on Boot

```bash
# Create systemd service
sudo nano /etc/systemd/system/gmail-saas.service
```

Add:

```ini
[Unit]
Description=Gmail Bulk Sender SaaS
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/path/to/gmail-bulk-sender-saas
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
User=your-username

[Install]
WantedBy=multi-user.target
```

Enable:

```bash
sudo systemctl enable gmail-saas
sudo systemctl start gmail-saas
```

## 📊 Usage Guide

### Campaign Workflow

1. **Upload Service Accounts**: Add one or more Google Workspace service accounts
2. **Sync Users**: Fetch all users from your Workspace domains
3. **Create Campaign**: Use the multi-step wizard
4. **Configure Senders**: Select which accounts/users to send from
5. **Add Recipients**: Upload recipient list (supports CSV format)
6. **Compose Email**: Write subject and body with variable substitution
7. **Review & Create**: Campaign starts in DRAFT mode
8. **Start Campaign**: Click play to begin sending
9. **Monitor Progress**: View real-time stats and progress bars
10. **Pause/Resume**: Control campaign execution anytime
11. **Duplicate**: Clone successful campaigns for reuse

### Variable Substitution

Use variables in subject and body:

```
Subject: Hello {{name}}!

Body:
Hi {{name}},

We're reaching out from {{company}}...
```

### Rate Limiting Best Practices

- **Personal Gmail**: 500 emails/day per user
- **Google Workspace**: 2000 emails/day per user (Business/Enterprise)
- **Recommended Concurrency**: 5-10 per account
- **Recommended Rate**: 500-1000 emails/hour per account

## 🔧 Maintenance

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f celery_worker
```

### Restart Services

```bash
docker-compose restart
```

### Backup Database

```bash
docker-compose exec postgres pg_dump -U gmailsaas gmail_saas > backup.sql
```

### Restore Database

```bash
cat backup.sql | docker-compose exec -T postgres psql -U gmailsaas gmail_saas
```

### Update Application

```bash
git pull
docker-compose down
docker-compose build
docker-compose up -d
```

## 🔒 Security Considerations

1. **Encryption**: Service account JSONs are encrypted with AES-256
2. **Environment Variables**: Store sensitive keys in `.env` (never commit)
3. **API Access**: Consider adding authentication middleware
4. **Firewall**: Restrict access to ports 5432 (PostgreSQL) and 6379 (Redis)
5. **HTTPS**: Always use SSL in production
6. **Backups**: Regularly backup your PostgreSQL database

## 🐛 Troubleshooting

### Issue: Emails not sending

**Check**:
1. Service account has domain-wide delegation enabled
2. OAuth scopes are configured in Workspace Admin
3. Admin email used for sync has admin privileges
4. Celery workers are running: `docker-compose logs celery_worker`

### Issue: Can't connect to database

**Check**:
1. PostgreSQL container is running: `docker-compose ps`
2. Database credentials in `.env` are correct
3. Port 5432 is not in use by another service

### Issue: Frontend can't reach backend

**Check**:
1. `NEXT_PUBLIC_API_URL` in `.env` is correct
2. CORS settings in `backend/app/config.py`
3. Both frontend and backend containers are running

## 📝 API Documentation

Interactive API documentation is available at:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Built with FastAPI, Next.js, and shadcn/ui
- Inspired by PowerMTA's campaign management
- Uses Google Workspace APIs

## 📞 Support

For issues, questions, or feature requests:
- Open an issue on GitHub
- Check the troubleshooting section
- Review API documentation

---

**Happy Sending! 📧**

