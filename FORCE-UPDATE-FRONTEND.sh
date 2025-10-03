#!/bin/bash

echo "========================================"
echo "🔥 FORCE UPDATING FRONTEND"
echo "========================================"
echo ""

cd /opt/speed-send || exit 1

echo "1️⃣ Pulling latest code..."
git pull origin main

echo ""
echo "2️⃣ Stopping ALL containers..."
docker-compose down

echo ""
echo "3️⃣ Removing ALL containers and images..."
docker-compose rm -f
docker rmi $(docker images -q speed-send*) 2>/dev/null || true

echo ""
echo "4️⃣ Cleaning Docker cache..."
docker system prune -f

echo ""
echo "5️⃣ Rebuilding EVERYTHING from scratch..."
docker-compose build --no-cache --pull

echo ""
echo "6️⃣ Starting all services..."
docker-compose up -d

echo ""
echo "7️⃣ Waiting for services to start..."
sleep 10

echo ""
echo "8️⃣ Checking all services..."
docker-compose ps

echo ""
echo "9️⃣ Frontend logs (last 30 lines)..."
docker-compose logs --tail=30 frontend

echo ""
echo "========================================"
echo "✅ FORCE UPDATE COMPLETE!"
echo "========================================"
echo ""
echo "🌐 Open: http://172.236.219.75:3000/campaigns/new"
echo ""
echo "🔍 To see live logs:"
echo "   docker-compose logs -f frontend"
echo ""

