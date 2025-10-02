# 🚀 START HERE - Quick Installation Guide

## Welcome to Gmail Bulk Sender SaaS!

This is a **PowerMTA-style bulk email system** that can send **15,000 emails in under 15 seconds**.

---

## ⚡ **Installation: ONE Command!**

### **Linux/Ubuntu/Mac:**

```bash
# Clone project
git clone https://github.com/abdoabdo54/speed-send.git
cd speed-send

# Run automated installer (ONE COMMAND!)
chmod +x deploy.sh && ./deploy.sh
```

### **Windows:**

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop)
2. Start Docker Desktop
3. Double-click `deploy.bat` in the project folder

---

## ✅ **What Happens During Installation**

The `deploy.sh` script automatically:

1. ✅ **Installs Docker & Docker Compose** (if not installed)
2. ✅ **Installs system dependencies** (curl, git, openssl, etc.)
3. ✅ **Generates secure random keys** (database password, encryption key)
4. ✅ **Creates .env configuration** (auto-detects your server IP)
5. ✅ **Builds Docker containers** (Backend, Frontend, Database, Workers)
6. ✅ **Starts all services** (6 containers)
7. ✅ **Waits for services** (health checks)
8. ✅ **Opens browser** (if desktop environment detected)
9. ✅ **Displays access URLs** (with your server IP)

**Zero manual configuration required!**

---

## 📊 **After Installation**

Once installation completes, you'll see:

```
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║  ✓ ALL SERVICES ARE RUNNING!                                 ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

📊 Access Your Application:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  🌐 Frontend:       http://YOUR_IP:3000
  ⚙️  Backend API:    http://YOUR_IP:8000
  📚 API Docs:       http://YOUR_IP:8000/docs
```

### **Next Steps:**

1. **Open Frontend** → http://YOUR_IP:3000
2. **Go to Accounts** → Upload Google Cloud service account JSON
3. **Click Sync** → Fetch all Workspace users
4. **Go to Campaigns** → Create new campaign
5. **Add Recipients** → Upload your email list
6. **Click Start** → Watch 15,000 emails send in <15 seconds!

---

## 🎯 **Your First Campaign**

### **Example: 15,000 Emails in 15 Seconds**

**Setup:**
- 12 Google Workspace accounts
- 50 users per account = 600 senders
- 25 emails per user = 15,000 total

**Steps:**

1. **Upload 12 Service Accounts**
   - Go to Accounts page
   - Click "Add Account" (repeat 12 times)
   - Paste each service account JSON
   - Click "Sync" for each

2. **Create Campaign**
   - Go to Campaigns → "New Campaign"
   - Select all 12 accounts
   - Paste recipient list (CSV format):
     ```
     user1@example.com,John Doe,Acme Corp
     user2@example.com,Jane Smith,Tech Inc
     ... 15,000 lines ...
     ```

3. **Compose Email**
   - Subject: `Hello {{name}}!`
   - Body: `Hi {{name}} from {{company}}...`

4. **Launch**
   - Click "Create Campaign"
   - Click "Start"
   - **Watch progress bar complete in ~12 seconds!** ⚡

---

## 🔧 **Management Commands**

```bash
# View real-time logs
docker-compose logs -f

# Check service status
docker-compose ps

# Restart services
docker-compose restart

# Stop everything
docker-compose down

# Update to latest version
./update.sh
```

---

## ⚡ **PowerMTA Performance Features**

✅ **Instant Parallel Sending**
- All 600 users send simultaneously
- Each user sends their batch in parallel (thread pools)
- No batching delays, no rate limiting waits

✅ **Smart Distribution**
- Emails distributed evenly across all users
- Round-robin rotation
- Automatic failover

✅ **Scaling**
```bash
# Scale to 6 workers (600 concurrent senders)
docker-compose up -d --scale celery_worker=6

# Scale to 12 workers (1200 concurrent senders)
docker-compose up -d --scale celery_worker=12
```

✅ **Real-Time Monitoring**
- Live progress bars
- Per-sender statistics
- Success/failure tracking
- Error logging

---

## 📖 **Documentation**

| File | Description |
|------|-------------|
| `README.md` | Complete documentation |
| `INSTALL.md` | Installation guide (you are here!) |
| `QUICKSTART.md` | 5-minute tutorial |
| `POWERMTA_MODE.md` | Performance details |
| `DEPLOYMENT.md` | Production deployment |
| `ARCHITECTURE.md` | Technical architecture |

---

## 🆘 **Troubleshooting**

### **Issue: Port already in use**

```bash
# Find and kill process using port
sudo lsof -ti:3000 | xargs kill -9
sudo lsof -ti:8000 | xargs kill -9

# Restart
docker-compose restart
```

### **Issue: Services won't start**

```bash
# Check Docker is running
docker info

# View logs
docker-compose logs -f

# Rebuild
docker-compose down
./deploy.sh
```

### **Issue: Can't access from other computers**

```bash
# Check firewall
sudo ufw allow 3000
sudo ufw allow 8000

# Or use IP in URL
http://YOUR_SERVER_IP:3000
```

---

## 💡 **Pro Tips**

### **1. For Maximum Speed:**

```bash
# Scale workers to match your senders
# Formula: workers = total_users / 100

# Example: 600 users = 6 workers
docker-compose up -d --scale celery_worker=6
```

### **2. Monitor Performance:**

```bash
# Watch logs during sending
docker-compose logs -f celery_worker | grep "⚡\|✅"

# You'll see:
# ⚡ FIRING 600 parallel senders NOW!
# ✅ Sender user1@domain.com: Completed 25 emails in 0.8s
# ✅ Campaign 1 completed in 12.34 seconds!
```

### **3. Enable Auto-Start:**

The installer asks if you want auto-start on boot. Say YES!

Or manually:
```bash
sudo systemctl enable gmail-bulk-sender
```

---

## 🎉 **You're Ready!**

**Your PowerMTA-style bulk mailer is installed and ready.**

### **Quick Commands:**

```bash
# Start: Already running after ./deploy.sh
# Access: http://YOUR_IP:3000
# Logs: docker-compose logs -f
# Stop: docker-compose down
# Update: ./update.sh
```

### **Support:**

- 📖 Full docs: `README.md`
- 🚀 Performance guide: `POWERMTA_MODE.md`
- 🐛 Check logs: `docker-compose logs -f`
- 📊 API docs: http://YOUR_IP:8000/docs

---

**Happy sending! 📧⚡**

Start at: http://YOUR_IP:3000

