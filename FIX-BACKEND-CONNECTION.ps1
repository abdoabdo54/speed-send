# FIX BACKEND CONNECTION ISSUES
Write-Host "🔧 FIXING BACKEND CONNECTION ISSUES" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan

# Check if we're in the right directory
if (-not (Test-Path "docker-compose.yml")) {
    Write-Host "❌ Error: docker-compose.yml not found. Please run this script from the project root." -ForegroundColor Red
    exit 1
}

Write-Host "📋 Current Docker status:" -ForegroundColor Yellow
docker-compose ps

Write-Host ""
Write-Host "🔄 Restarting backend services..." -ForegroundColor Yellow
docker-compose restart backend

Write-Host ""
Write-Host "⏳ Waiting for backend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host ""
Write-Host "🔍 Checking backend health..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod -Uri "http://localhost:8000/health" -Method Get -TimeoutSec 10
    Write-Host "✅ Backend health check passed: $healthResponse" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend health check failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "🔍 Testing API endpoints..." -ForegroundColor Yellow
Write-Host "Accounts API:" -ForegroundColor Cyan
try {
    $accountsResponse = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/accounts/" -Method Get -TimeoutSec 10
    Write-Host "✅ Accounts API working: $($accountsResponse.Count) accounts found" -ForegroundColor Green
} catch {
    Write-Host "❌ Accounts API failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Users API:" -ForegroundColor Cyan
try {
    $usersResponse = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/users/" -Method Get -TimeoutSec 10
    Write-Host "✅ Users API working: $($usersResponse.Count) users found" -ForegroundColor Green
} catch {
    Write-Host "❌ Users API failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "📊 Backend logs (last 20 lines):" -ForegroundColor Yellow
docker-compose logs --tail=20 backend

Write-Host ""
Write-Host "✅ Backend connection fix complete!" -ForegroundColor Green
Write-Host "🌐 Frontend should now be able to connect to backend at http://localhost:8000" -ForegroundColor Cyan
