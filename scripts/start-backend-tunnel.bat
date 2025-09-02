@echo off
REM This script starts the backend server and then the Cloudflare tunnel
REM Start backend in background
start /B node backend.js
REM Wait 5 seconds for backend to initialize
timeout /t 5 /nobreak > nul
REM Start Cloudflare tunnel
cloudflared_bin\cloudflared-windows-amd64.exe tunnel --url http://localhost:3000 run backend-revalida
