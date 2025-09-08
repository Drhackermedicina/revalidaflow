@echo off
title Verificar Status - RevalidaFlow

echo ========================================
echo    REVALIDAFLOW - VERIFICAÇÃO DE STATUS
echo ========================================

echo Verificando processos do Node.js...
tasklist /fi "imagename eq node.exe" | find /i "node.exe" >nul
if %errorlevel% == 0 (
    echo ✅ Node.js está em execução
    tasklist /fi "imagename eq node.exe"
) else (
    echo ❌ Nenhum processo Node.js encontrado
)

echo.
echo Verificando portas...
echo Porta 5173 (Frontend):
netstat -an | findstr :5173 >nul
if %errorlevel% == 0 (
    echo ✅ Porta 5173 está em uso
) else (
    echo ❌ Porta 5173 não está em uso
)

echo Porta 3000 (Backend):
netstat -an | findstr :3000 >nul
if %errorlevel% == 0 (
    echo ✅ Porta 3000 está em uso
) else (
    echo ❌ Porta 3000 não está em uso
)

echo.
echo ========================================
echo    VERIFICAÇÃO CONCLUÍDA
echo ========================================
pause