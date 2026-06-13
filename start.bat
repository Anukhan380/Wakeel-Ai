@echo off
echo =======================================
echo   WakeelAI v2 - Pakistani Legal AI
echo =======================================
echo.
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js not installed!
    echo Download from: https://nodejs.org
    pause
    exit
)
echo Node.js found. Starting WakeelAI v2...
echo.
echo Pages available:
echo   Main App:      http://localhost:3000
echo   Documents:     http://localhost:3000/documents
echo   Lawyer Portal: http://localhost:3000/lawyer-portal
echo   Admin Panel:   http://localhost:3000/admin
echo   Test:          http://localhost:3000/test
echo.
timeout /t 2 /nobreak >nul
start http://localhost:3000
node server.js
pause
