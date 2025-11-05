@echo off
REM Script para iniciar N8N local no Windows
echo ========================================
echo Iniciando N8N Local para integracao MCP
echo ========================================
echo.

REM Verificar se n8n esta instalado
where n8n >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] N8N nao encontrado!
    echo.
    echo Instale o N8N com:
    echo   npm install -g n8n
    echo.
    pause
    exit /b 1
)

echo [INFO] N8N encontrado. Iniciando...
echo.
echo [INFO] N8N sera iniciado em: http://localhost:5678
echo [INFO] Pressione Ctrl+C para parar
echo.
echo ========================================
echo.

REM Iniciar N8N
n8n start

pause





