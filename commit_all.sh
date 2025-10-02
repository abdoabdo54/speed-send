#!/bin/bash

echo "🚀 Committing all files to Git..."
echo ""

# Make scripts executable
chmod +x deploy.sh update.sh commit_all.sh

# Add all files
echo "📦 Adding all files..."
git add .

# Show what will be committed
echo ""
echo "📋 Files to be committed:"
git status --short

echo ""
read -p "Continue with commit? (y/n): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Commit
    echo "💾 Committing..."
    git commit -m "🚀 Complete Gmail Bulk Sender SaaS - PowerMTA Mode

✨ Features:
- One-command installation (deploy.sh)
- PowerMTA mode: 15,000 emails in <15 seconds
- Multi-account Google Workspace support
- FastAPI + Next.js + PostgreSQL + Redis + Celery
- Thread pools: 50 per sender, 100 worker concurrency
- Auto-configuration with secure key generation
- Pause/resume/duplicate campaigns
- Real-time progress tracking
- Complete documentation

🔧 Components:
- Backend: FastAPI with Celery workers
- Frontend: Next.js with shadcn/ui
- Database: PostgreSQL with 6 tables
- Queue: Redis + Celery
- Deployment: Docker Compose

📚 Documentation:
- START_HERE.md - Quick start guide
- README.md - Complete documentation
- POWERMTA_MODE.md - Performance guide
- DEPLOYMENT.md - Production deployment
- 15 total markdown files

⚡ Performance:
- Instant parallel sending across all users
- Round-robin distribution
- Automatic retry with exponential backoff
- Configurable concurrency and rate limits

🚀 Installation:
chmod +x deploy.sh && ./deploy.sh

📊 Example:
12 accounts × 50 users × 25 emails = 15,000 emails in <15 seconds"

    echo ""
    echo "✅ Committed successfully!"
    echo ""
    echo "📤 Now push to GitHub:"
    echo "   git push -u origin main"
    echo ""
    echo "Or if authentication fails, use token:"
    echo "   git push https://YOUR_TOKEN@github.com/abdoabdo54/speed-send.git main"
else
    echo "❌ Commit cancelled"
fi

