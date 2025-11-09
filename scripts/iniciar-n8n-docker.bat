@echo off
REM Script para iniciar N8N local via Docker (Windows)
echo ========================================
echo Iniciando N8N Local via Docker
echo ========================================
echo.

REM Verificar se docker esta instalado
where docker >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Docker nao encontrado!
    echo.
    echo Instale o Docker Desktop em:
    echo   https://www.docker.com/products/docker-desktop
    echo.
    pause
    exit /b 1
)

REM Verificar se docker esta rodando
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Docker nao esta rodando!
    echo.
    echo Inicie o Docker Desktop e tente novamente.
    echo.
    pause
    exit /b 1
)

echo [INFO] Docker encontrado. Iniciando N8N...
echo.
echo [INFO] N8N sera iniciado em: http://localhost:5678
echo [INFO] Credenciais padrao:
echo [INFO]   Usuario: admin
echo [INFO]   Senha: admin
echo.
echo [INFO] Para parar, pressione Ctrl+C ou execute:
echo [INFO]   docker-compose -f docker-compose.n8n.yml down
echo.
echo ========================================
echo.

REM Iniciar N8N via docker-compose
docker-compose -f docker-compose.n8n.yml up -d

if %errorlevel% equ 0 (
    echo.
    echo [SUCESSO] N8N iniciado com sucesso!
    echo.
    echo Aguardando N8N estar pronto...
    timeout /t 5 /nobreak >nul
    
    echo.
    echo ========================================
    echo N8N esta rodando!
    echo ========================================
    echo URL: http://localhost:5678
    echo Usuario: admin
    echo Senha: admin
    echo.
    echo Para ver os logs:
    echo   docker-compose -f docker-compose.n8n.yml logs -f
    echo.
    echo Para parar:
    echo   docker-compose -f docker-compose.n8n.yml down
    echo.
) else (
    echo.
    echo [ERRO] Falha ao iniciar N8N via Docker
    echo.
)

pause







