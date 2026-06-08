@echo off
title Promise Paradise - Wedding Planner
echo.
echo  ========================================
echo   Promise Paradise - Starting Services
echo  ========================================
echo.

:: Start backend server in background
echo  [1/2] Starting Backend Server (port 5000)...
cd /d "%~dp0backend"
start /B cmd /c "npm start"

:: Wait a moment for backend to initialize
timeout /t 3 /nobreak >nul

:: Start frontend dev server in background
echo  [2/2] Starting Frontend (port 3000)...
cd /d "%~dp0frontend"
start /B cmd /c "npm start"

:: Wait for frontend to be ready
echo.
echo  Waiting for servers to start...
timeout /t 5 /nobreak >nul

:: Open browser
echo  Opening browser at http://localhost:3000
start http://localhost:3000

echo.
echo  ========================================
echo   Both servers are running!
echo   Backend:  http://localhost:5000
echo   Frontend: http://localhost:3000
echo  ========================================
echo.
echo  Press Ctrl+C or close this window to stop.
echo.
pause >nul
