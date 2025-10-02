# Quick Start Guide

Get up and running with Gmail Bulk Sender SaaS in 5 minutes!

## Prerequisites

- Docker & Docker Compose installed
- Google Cloud service account JSON with domain-wide delegation
- Admin access to Google Workspace

## Step 1: Clone and Setup (2 minutes)

```bash
# Clone the repository
git clone <your-repo-url>
cd gmail-bulk-sender-saas

# Copy environment file
cp .env.example .env

# Edit .env and set your keys
nano .env
```

Minimal `.env` configuration:

```env
SECRET_KEY=your-random-secret-key-min-32-chars
ENCRYPTION_KEY=your-encryption-key-32-bytes!!
POSTGRES_PASSWORD=secure_db_password
```

## Step 2: Start Application (1 minute)

```bash
# Start all services
docker-compose up -d

# Wait for services to start
sleep 10

# Check status
docker-compose ps
```

## Step 3: Access the App (30 seconds)

Open your browser:
- **Frontend**: http://localhost:3000
- **API Docs**: http://localhost:8000/docs

## Step 4: Add Service Account (1 minute)

1. Go to http://localhost:3000/accounts
2. Click **"Add Account"**
3. Enter a name (e.g., "My Workspace")
4. Paste your service account JSON
5. Click **"Upload"**

## Step 5: Sync Users (30 seconds)

1. Click the **Sync** button (refresh icon) on your account
2. Enter an admin email from your Workspace domain
3. Wait for sync to complete
4. Users will appear in the **Users** page

## Step 6: Create Your First Campaign (1 minute)

1. Go to **Campaigns** → **New Campaign**

2. **Step 1 - Select Senders**: Check your account

3. **Step 2 - Recipients**: 
   - Campaign name: "Test Campaign"
   - Recipients (one per line):
   ```
   recipient1@example.com, John Doe, Acme Corp
   recipient2@example.com, Jane Smith, Tech Inc
   ```

4. **Step 3 - Compose**:
   - Subject: `Hello {{name}}!`
   - Body: `Hi {{name}} from {{company}}, this is a test email.`

5. **Step 4 - Review**: Click "Create Campaign"

## Step 7: Launch Campaign (30 seconds)

1. Go back to **Campaigns**
2. Find your campaign (status: DRAFT)
3. Click the **Play** button
4. Watch the progress bar!

## 🎉 Done!

You've just:
- ✅ Deployed a full-stack email platform
- ✅ Connected Google Workspace
- ✅ Sent your first bulk campaign

## Next Steps

### Test Mode
Before sending to all recipients, test with a few:
- Set smaller recipient list
- Monitor the **Logs** section
- Check email delivery

### Scale Up
Ready for production?
- Add more service accounts
- Increase concurrency in settings
- Monitor quota usage in dashboard

### Campaign Management
- **Pause**: Click pause button during sending
- **Resume**: Click play to continue
- **Duplicate**: Clone successful campaigns
- **Monitor**: Real-time progress on dashboard

## Common Commands

```bash
# View logs
docker-compose logs -f

# Restart services
docker-compose restart

# Stop everything
docker-compose down

# Update and rebuild
git pull
docker-compose build
docker-compose up -d
```

## Troubleshooting

### Can't upload service account
- Verify JSON is valid
- Check domain-wide delegation is enabled
- Ensure all required scopes are added in Workspace Admin

### Emails not sending
- Check Celery worker logs: `docker-compose logs celery_worker`
- Verify admin email has necessary permissions
- Confirm OAuth scopes in Google Workspace Admin Console

### Frontend can't connect to backend
- Verify both containers are running: `docker-compose ps`
- Check `NEXT_PUBLIC_API_URL` in `.env`
- Look at browser console for errors

## Need Help?

- 📖 Full documentation: `README.md`
- 🚀 Production deployment: `DEPLOYMENT.md`
- 🐛 Check logs: `docker-compose logs`
- 📊 API docs: http://localhost:8000/docs

## Google Workspace Setup Reminder

If emails aren't sending, verify:

1. **Service Account has domain-wide delegation**
2. **OAuth scopes configured in Workspace Admin**:
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/gmail.compose`
   - `https://www.googleapis.com/auth/gmail.insert`
   - `https://www.googleapis.com/auth/gmail.modify`
   - `https://www.googleapis.com/auth/admin.directory.user.readonly`
3. **Admin email used for sync has super admin role**

---

Happy sending! 📧

