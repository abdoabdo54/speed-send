#!/bin/bash

echo "🧹 Cleaning up Docker to free space..."

# Stop all containers
echo "Stopping containers..."
docker compose down

# Remove unused containers, networks, images, and build cache
echo "Cleaning up Docker system..."
docker system prune -af

# Remove specific images if they exist
echo "Removing old images..."
docker rmi speed-send-backend speed-send-frontend speed-send-celery_worker speed-send-celery_beat 2>/dev/null || true

# Clean up volumes (be careful - this removes data!)
echo "Cleaning up unused volumes..."
docker volume prune -f

# Show disk usage
echo "Current disk usage:"
df -h

echo "🚀 Rebuilding with optimized Dockerfile..."

# Build only the backend first (shared image)
echo "Building backend image..."
docker compose build backend

# Now start all services (celery services will use the same image)
echo "Starting all services..."
docker compose up -d

echo "✅ Rebuild complete!"
echo "Check status with: docker compose ps"
echo "Check logs with: docker compose logs -f"
