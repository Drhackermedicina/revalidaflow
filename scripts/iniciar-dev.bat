@echo off
title Desenvolvimento Local - RevalidaFlow

echo ========================================
echo    REVALIDAFLOW - AMBIENTE DE DESENVOLVIMENTO LOCAL
echo ========================================
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:3000
echo ========================================

:: Iniciar backend em segundo plano
echo Iniciando backend...
cd backend
start "Backend - RevalidaFlow" cmd /k "title Backend RevalidaFlow && node server.js"
cd ..

:: Aguardar um momento para o backend iniciar
timeout /t 3 /nobreak >nul

:: Iniciar frontend
echo Iniciando frontend...
npm run dev

echo.
echo ========================================
echo    AMBIENTE ENCERRADO
echo ========================================
pause