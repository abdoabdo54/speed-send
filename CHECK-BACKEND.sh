#!/bin/bash

echo "========================================"
echo "🔍 CHECKING BACKEND STATUS"
echo "========================================"
echo ""

cd /opt/speed-send || exit 1

echo "1️⃣ Checking Docker containers..."
docker-compose ps

echo ""
echo "2️⃣ Checking backend logs..."
docker-compose logs --tail=20 backend

echo ""
echo "3️⃣ Testing backend health..."
curl -s http://localhost:8000/health || echo "❌ Backend not responding"

echo ""
echo "4️⃣ Testing launch endpoint..."
curl -s -X POST http://localhost:8000/api/v1/campaigns/1/launch || echo "❌ Launch endpoint not working"

echo ""
echo "5️⃣ Checking if backend is accessible..."
netstat -tlnp | grep :8000 || echo "❌ Port 8000 not listening"

echo ""
echo "========================================"
echo "🔧 DIAGNOSTIC COMPLETE"
echo "========================================"
echo ""
echo "If backend is not running, run:"
echo "  docker-compose up -d backend"
echo ""
echo "If backend has errors, run:"
echo "  docker-compose logs backend"
echo ""
