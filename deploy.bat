@echo off
REM ====================================================================
REM Gmail Bulk Sender SaaS - Windows Deployment Script
REM 
REM Prerequisites for Windows:
REM - Docker Desktop installed and running
REM - WSL2 enabled
REM 
REM Usage: Simply double-click this file or run: deploy.bat
REM ====================================================================

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                                                              ║
echo ║     Gmail Bulk Sender SaaS - PowerMTA Mode                  ║
echo ║     Windows Automated Deployment                            ║
echo ║                                                              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

REM Check if Docker is installed
where docker >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Docker not found! Please install Docker Desktop first.
    echo Download from: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

echo [OK] Docker found
echo.

REM Check if Docker is running
docker info >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Docker is not running! Please start Docker Desktop.
    pause
    exit /b 1
)

echo [OK] Docker is running
echo.

REM Generate environment file if it doesn't exist
if not exist .env (
    echo [INFO] Creating environment configuration...
    copy .env.example .env
    echo [OK] .env file created
    echo [IMPORTANT] Please edit .env file and set your configuration
    pause
)

REM Stop existing containers
echo [INFO] Stopping existing containers...
docker-compose down 2>nul

REM Build images
echo.
echo [INFO] Building application (this may take 3-5 minutes)...
docker-compose build --parallel

REM Start services
echo.
echo [INFO] Starting all services...
docker-compose up -d

REM Wait for services
echo.
echo [INFO] Waiting for services to initialize...
timeout /t 15 /nobreak >nul

REM Check status
echo.
echo [INFO] Checking service status...
docker-compose ps

REM Display access information
echo.
echo ╔═══════════════════════════════════════════════════════════════╗
echo ║                                                               ║
echo ║  ✓ DEPLOYMENT COMPLETE!                                      ║
echo ║                                                               ║
echo ╚═══════════════════════════════════════════════════════════════╝
echo.
echo Access your application:
echo.
echo   Frontend:       http://localhost:3000
echo   Backend API:    http://localhost:8000
echo   API Docs:       http://localhost:8000/docs
echo.
echo Management commands:
echo   View logs:      docker-compose logs -f
echo   Stop services:  docker-compose down
echo   Restart:        docker-compose restart
echo.

REM Try to open browser
start http://localhost:3000

echo [SUCCESS] Browser should open automatically. If not, go to http://localhost:3000
echo.
pause

