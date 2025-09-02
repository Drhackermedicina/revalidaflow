@echo off
REM This script stops the Cloudflare tunnel by killing the cloudflared process
taskkill /IM cloudflared-windows-amd64.exe /F
