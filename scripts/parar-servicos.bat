@echo off
title Parar Serviços - RevalidaFlow

echo ========================================
echo    REVALIDAFLOW - PARAR SERVIÇOS
echo ========================================

echo Encerrando processos do Node.js...
taskkill /f /im node.exe >nul 2>&1

if %errorlevel% == 0 (
    echo ✅ Todos os processos Node.js foram encerrados
) else (
    echo ℹ️  Nenhum processo Node.js estava em execução
)

echo.
echo Verificando se os processos foram encerrados...
tasklist /fi "imagename eq node.exe" | find /i "node.exe" >nul
if %errorlevel% == 0 (
    echo ❌ Ainda existem processos Node.js em execução
) else (
    echo ✅ Todos os processos foram encerrados com sucesso

)

echo.
echo ========================================
echo    SERVIÇOS ENCERRADOS
echo ========================================
pause