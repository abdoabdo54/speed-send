@echo off
echo 🔍 COMPREHENSIVE FRONTEND-BACKEND DIAGNOSTIC AND FIX
echo ==================================================

echo.
echo 1. CHECKING DOCKER SERVICES...
docker-compose ps

echo.
echo 2. CHECKING BACKEND HEALTH...
curl -s http://localhost:8000/health

echo.
echo 3. CHECKING BACKEND API ENDPOINTS...
echo Testing /api/v1/accounts/:
curl -s http://localhost:8000/api/v1/accounts/

echo.
echo 4. CHECKING FRONTEND ACCESS...
curl -s http://localhost:3000

echo.
echo 5. FORCE REBUILDING FRONTEND...
docker-compose stop frontend
docker-compose rm -f frontend
docker-compose build --no-cache frontend
docker-compose up -d frontend

echo.
echo 6. WAITING FOR FRONTEND TO START...
timeout /t 30

echo.
echo 7. FINAL HEALTH CHECKS...
echo Backend health:
curl -s http://localhost:8000/health

echo.
echo Frontend health:
curl -s http://localhost:3000

echo.
echo ✅ DIAGNOSTIC COMPLETE
echo Now test in browser: http://172.236.219.75:3000/campaigns/new
echo If still showing error, check browser console (F12) for JavaScript errors
