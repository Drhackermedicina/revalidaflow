@echo off
REM This script starts the Cloudflare tunnel for the backend
REM Assumes the backend is already running on localhost:3000
cloudflared_bin\cloudflared-windows-amd64.exe tunnel --url http://localhost:3000 run backend-revalida
