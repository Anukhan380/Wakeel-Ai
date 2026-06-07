@echo off
echo =======================================
echo   WakeelAI - Pakistani Legal Assistant
echo =======================================
echo.
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js not installed!
    echo Download from: https://nodejs.org
    pause
    exit
)
echo Node.js found. Starting...
echo.
node server.js
pause
