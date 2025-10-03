# Speed-Send - Gmail Bulk Sender SaaS (PowerMTA Mode)

Professional bulk email sender using Google Workspace accounts with PowerMTA-style instant sending capabilities.

## 🚀 Features

- **Multi-Account Management** - Manage multiple Google Workspace service accounts
- **PowerMTA-Style Sending** - Send 15,000 emails in <15 seconds
- **Google Workspace Integration** - Sync and use workspace users as recipients
- **Campaign Management** - Create, test, and launch email campaigns
- **Real-time Tracking** - Monitor campaign status and delivery
- **High Performance** - 100 concurrent workers, 10k emails/hour rate limit

## 📋 Requirements

- Ubuntu 20.04+ or Debian 11+
- 2GB RAM minimum (4GB recommended)
- Docker and Docker Compose (auto-installed by deploy script)
- Google Workspace service account with domain-wide delegation

## 🔧 Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/abdoabdo54/speed-send.git
cd speed-send
```

### 2. Deploy

```bash
chmod +x deploy.sh
./deploy.sh
```

The script will:
- ✅ Install Docker and Docker Compose
- ✅ Generate secure keys
- ✅ Build and start all services
- ✅ Display access URLs

### 3. Access Application

- **Frontend**: `http://YOUR_SERVER_IP:3000`
- **Backend**: `http://YOUR_SERVER_IP:8000`
- **API Docs**: `http://YOUR_SERVER_IP:8000/docs`

## 🔑 Google Workspace Setup

### Required Scopes

Configure these scopes in Google Admin Console for domain-wide delegation:

```
https://www.googleapis.com/auth/admin.directory.user
https://www.googleapis.com/auth/admin.directory.user.security
https://www.googleapis.com/auth/admin.directory.orgunit
https://www.googleapis.com/auth/admin.directory.domain.readonly
https://www.googleapis.com/auth/gmail.send
https://www.googleapis.com/auth/gmail.compose
https://www.googleapis.com/auth/gmail.insert
https://www.googleapis.com/auth/gmail.modify
https://www.googleapis.com/auth/gmail.readonly
```

### Add Service Account

1. Go to **Accounts** page
2. Click **Add Account**
3. Upload service account JSON file
4. Enter admin email for delegation
5. Click **Upload & Sync**

## 📧 Sending Campaigns

### Create Campaign

1. Go to **New Campaign** page
2. Fill in:
   - Campaign Name
   - From Name
   - Subject
   - Email Message (HTML)
3. Add recipients:
   - From synced Google Workspace users
   - Or paste email addresses (one per line)
4. Send test email first
5. Launch campaign

### Features

- **Auto-Account Selection** - Uses all available accounts automatically
- **Smart Rotation** - Round-robin distribution across senders
- **Test Mode** - Send test before launching
- **High Concurrency** - 100 concurrent workers
- **Rate Limiting** - 10,000 emails/hour per account

## 🛠 Management

### View Logs

```bash
docker-compose logs -f
docker-compose logs backend
docker-compose logs frontend
```

### Restart Services

```bash
docker-compose restart
docker-compose restart backend
docker-compose restart frontend
```

### Stop/Start

```bash
docker-compose stop
docker-compose start
```

### Rebuild

```bash
docker-compose build
docker-compose up -d
```

## 🏗 Architecture

- **Frontend**: Next.js 14, React, Tailwind CSS, Shadcn/ui
- **Backend**: FastAPI (Python), PostgreSQL, Redis, Celery
- **Email Engine**: Gmail API with thread-pool parallelization
- **Queue**: Celery with Redis broker
- **Database**: PostgreSQL
- **Containerization**: Docker, Docker Compose

## ⚡ PowerMTA Mode

Optimized for instant parallel sending:

- **100 concurrent workers** - Multiple emails sent simultaneously
- **Thread-pool execution** - Parallel sending per account
- **Smart distribution** - Even load across all senders
- **Instant launch** - All tasks fired at once (no queuing delay)
- **<15 second delivery** - 15,000 emails in under 15 seconds

## 📊 Performance

- **Concurrency**: 100 workers
- **Rate Limit**: 10,000 emails/hour per account
- **Typical Speed**: 15,000 emails in <15 seconds with 600 users
- **Scalability**: Add more accounts for higher throughput

## 🔒 Security

- **AES-256 Encryption** - Service account JSONs encrypted at rest
- **Secure Keys** - Auto-generated SECRET_KEY and ENCRYPTION_KEY
- **Environment Variables** - Sensitive data in .env file
- **Domain-Wide Delegation** - Secure Google Workspace integration

## 📝 License

Proprietary - All Rights Reserved

## 🤝 Support

For issues or questions, please contact the development team.

---

**Speed-Send v2.0 Pro - PowerMTA Mode ⚡**
