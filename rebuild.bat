@echo off
echo 🧹 Cleaning up Docker to free space...

echo Stopping containers...
docker compose down

echo Cleaning up Docker system...
docker system prune -af

echo Removing old images...
docker rmi gmail-saas-backend gmail-saas-frontend 2>nul

echo Cleaning up unused volumes...
docker volume prune -f

echo Current disk usage:
dir C:\ /-c

echo 🚀 Rebuilding with optimized Dockerfile...

echo Building backend image...
docker compose build backend

echo Starting all services...
docker compose up -d

echo ✅ Rebuild complete!
echo Check status with: docker compose ps
echo Check logs with: docker compose logs -f
