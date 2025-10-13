#!/bin/bash

# Force update script - run on server to fix git conflicts
echo "🔥 Force updating repository..."
git reset --hard HEAD
git clean -fd
git pull origin main
echo "✅ Repository updated!"
echo ""
echo "Now run: chmod +x deploy.sh && ./deploy.sh"

