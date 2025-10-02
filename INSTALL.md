# Installation Guide - 100% Automated

## 🚀 One-Command Installation

This project features **100% automated installation**. Just run ONE file and everything is set up automatically!

## For Linux/Ubuntu (Recommended)

### **Step 1: Download Project**

```bash
# Clone repository
git clone https://github.com/abdoabdo54/speed-send.git
cd speed-send
```

### **Step 2: Run Automated Installer**

```bash
# Make executable
chmod +x deploy.sh

# Run (ONE COMMAND DOES EVERYTHING!)
./deploy.sh
```

### **That's It!** 🎉

The script will automatically:
- ✅ Install Docker & Docker Compose
- ✅ Install all system dependencies
- ✅ Generate secure encryption keys
- ✅ Configure PostgreSQL database
- ✅ Build all Docker containers
- ✅ Start all services
- ✅ Wait for services to be ready
- ✅ Open the application in your browser
- ✅ Display access URLs

**Total time: 5-10 minutes**

---

## For Windows

### **Prerequisites:**
1. Install **Docker Desktop**: https://www.docker.com/products/docker-desktop
2. Enable WSL2
3. Start Docker Desktop

### **Installation:**

**Option 1: Double-Click (Easiest)**
1. Double-click `deploy.bat`
2. Follow prompts
3. Done!

**Option 2: Command Line**
```cmd
deploy.bat
```

---

## What Gets Installed

### Services Started:
1. **PostgreSQL** - Database (port 5432)
2. **Redis** - Message broker (port 6379)
3. **Backend API** - FastAPI (port 8000)
4. **Celery Workers** - Email sending (PowerMTA mode)
5. **Celery Beat** - Scheduled tasks
6. **Frontend** - Next.js UI (port 3000)

### Automatic Configuration:
- ✅ Secure random passwords generated
- ✅ Encryption keys created
- ✅ Database initialized
- ✅ Network configured
- ✅ PowerMTA mode enabled (100 worker concurrency)

---

## After Installation

### Access Your Application:

```
🌐 Frontend:    http://YOUR_IP:3000
⚙️  Backend:     http://YOUR_IP:8000
📚 API Docs:    http://YOUR_IP:8000/docs
```

The installer will display your server IP automatically.

### Quick Start:

1. **Open Frontend** (automatically opens in browser)
2. Go to **Accounts** → Upload service account JSON
3. Click **Sync** → Fetch Workspace users
4. Go to **Campaigns** → Create new campaign
5. Add recipients → Compose email → Click **Start**
6. **Watch 15,000 emails send in <15 seconds!** ⚡

---

## Updating Existing Installation

### Linux/Ubuntu:

```bash
# Run update script
chmod +x update.sh
./update.sh
```

### Windows:

```cmd
git pull
docker-compose build
docker-compose up -d
```

---

## Verification

### Check All Services Running:

```bash
docker-compose ps
```

You should see 6 services running:
- ✅ postgres
- ✅ redis
- ✅ backend
- ✅ celery_worker
- ✅ celery_beat
- ✅ frontend

### Test Backend:

```bash
curl http://localhost:8000/health
```

Should return: `{"status":"healthy"}`

### Test Frontend:

Open browser: `http://localhost:3000`

---

## Troubleshooting

### Issue: Port already in use

**Solution:**
```bash
# Stop conflicting services
sudo lsof -ti:3000 | xargs kill -9
sudo lsof -ti:8000 | xargs kill -9
sudo lsof -ti:5432 | xargs kill -9

# Re-run installer
./deploy.sh
```

### Issue: Docker permission denied

**Solution:**
```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Logout and login, then:
./deploy.sh
```

### Issue: Services won't start

**Solution:**
```bash
# Check Docker is running
sudo systemctl status docker

# View logs
docker-compose logs -f

# Rebuild from scratch
docker-compose down -v
./deploy.sh
```

---

## Advanced Configuration

### Scale Workers (for 600+ senders):

```bash
# Scale to 6 workers (600 concurrent senders)
docker-compose up -d --scale celery_worker=6
```

### Enable Auto-Start on Boot:

The installer asks if you want auto-start. Or manually:

```bash
sudo systemctl enable gmail-bulk-sender
```

### Change Ports:

Edit `docker-compose.yml`:
```yaml
frontend:
  ports:
    - "3000:3000"  # Change first number

backend:
  ports:
    - "8000:8000"  # Change first number
```

Then restart:
```bash
docker-compose down
docker-compose up -d
```

---

## Manual Installation (Not Recommended)

If you prefer manual installation, see `DEPLOYMENT.md` for detailed steps.

---

## System Requirements

### Minimum:
- 2 CPU cores
- 4GB RAM
- 20GB disk space
- Ubuntu 20.04+ or Windows 10+ with WSL2

### Recommended (for 15K+ emails):
- 4-8 CPU cores
- 8-16GB RAM
- 50GB SSD
- Ubuntu 22.04 LTS
- 100 Mbps network

---

## Security Notes

The installer automatically:
- ✅ Generates cryptographically secure passwords
- ✅ Creates unique encryption keys
- ✅ Configures firewall-ready setup
- ✅ Never stores credentials in plain text

Your `.env` file contains all secrets - **keep it secure!**

---

## Getting Help

### View Logs:
```bash
docker-compose logs -f
```

### Check Service Health:
```bash
# Backend health
curl http://localhost:8000/health

# Database connection
docker-compose exec postgres psql -U gmailsaas -c "\l"

# Redis connection
docker-compose exec redis redis-cli ping
```

### Full Restart:
```bash
docker-compose restart
```

### Complete Reset (⚠️ Deletes all data):
```bash
docker-compose down -v
./deploy.sh
```

---

## Success Indicators

✅ **All 6 services show "Up"**
✅ **Frontend loads at http://localhost:3000**
✅ **Backend health check returns 200**
✅ **No error logs in docker-compose logs**

---

## Next Steps

Once installed:

1. **Upload Service Accounts** (Accounts page)
2. **Sync Users** (Click sync button)
3. **Create Test Campaign** (100 recipients)
4. **Scale Workers** (for production)
5. **Setup SSL/Domain** (optional, see DEPLOYMENT.md)

---

## 🎉 That's It!

**The installer does EVERYTHING automatically.**

Just run: `./deploy.sh`

**Time: 5-10 minutes**
**Result: Fully working PowerMTA-style bulk mailer!** ⚡

---

Need help? Check:
- `README.md` - Full documentation
- `POWERMTA_MODE.md` - Performance guide
- `DEPLOYMENT.md` - Production deployment
- `docker-compose logs -f` - Real-time logs

