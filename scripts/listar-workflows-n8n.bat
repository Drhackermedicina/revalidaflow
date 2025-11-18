@echo off
REM Script para listar workflows do N8N via API
echo ========================================
echo Listar Workflows do N8N
echo ========================================
echo.

REM Verificar se N8N esta rodando
docker ps | findstr n8n-local >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] N8N nao esta rodando!
    echo.
    echo Inicie o N8N com:
    echo   docker-compose -f docker-compose.n8n.yml up -d
    echo.
    pause
    exit /b 1
)

echo [INFO] N8N esta rodando.
echo.
echo Para listar workflows, voce precisa de uma API Key do N8N.
echo.
echo OPCAO 1: Usar via Chat do Cursor (Recomendado)
echo   - Abra o Chat do Cursor (Ctrl+L)
echo   - Digite: "Liste os workflows do N8N"
echo   - O MCP fara a conexao automaticamente
echo.
echo OPCAO 2: Obter API Key manualmente
echo   1. Acesse: http://localhost:5678
echo   2. Login: admin / admin
echo   3. Settings ^> API ^> Create API Key
echo   4. Copie a chave gerada
echo   5. Execute: curl -H "X-N8N-API-KEY: SUA_CHAVE" http://localhost:5678/api/v1/workflows
echo.
echo OPCAO 3: Verificar se ja existe API key configurada
echo   Verifique o arquivo .kilocode\mcp.json
echo.

REM Tentar listar workflows se API key estiver no arquivo de config
if exist ".kilocode\mcp.json" (
    echo [INFO] Arquivo de configuracao encontrado.
    echo [INFO] Verifique se N8N_API_KEY esta configurada.
    echo.
)

pause








