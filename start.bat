@echo off
title Voice Drawing Tool

echo.
echo ========================================
echo    Voice Drawing Tool - Starting...
echo ========================================
echo.

set "SCRIPT_DIR=%~dp0"
set "NODE=C:\Program Files\nodejs\node.exe"

if not exist "%NODE%" (
    echo [ERROR] Node.js not found
    echo Please install Node.js: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

if not exist "%SCRIPT_DIR%node_modules" (
    echo First run, installing dependencies...
    cd /d "%SCRIPT_DIR%"
    call npm install
    echo.
)

echo Starting server...
cd /d "%SCRIPT_DIR%"
start /b "" "%NODE%" server.js

echo Waiting for server...
timeout /t 3 /nobreak >nul

echo Opening browser...
start http://localhost:3001

echo.
echo ========================================
echo   Success!
echo.
echo   Browser opened. If not, visit:
echo   http://localhost:3001
echo.
echo   Close this window to stop server
echo ========================================
echo.

pause >nul
