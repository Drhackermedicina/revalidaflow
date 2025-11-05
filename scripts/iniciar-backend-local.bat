@echo off
title Backend Local - RevalidaFlow

echo ========================================
echo    REVALIDAFLOW - BACKEND LOCAL
echo ========================================
echo Backend: http://localhost:3000
echo ========================================

echo Iniciando servidor backend...
cd backend
node -r dotenv/config server.js dotenv_config_path=../.env
