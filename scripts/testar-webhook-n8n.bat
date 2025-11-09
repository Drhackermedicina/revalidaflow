@echo off
REM Script para testar webhook do N8N (Windows)
echo ========================================
echo Testar Webhook N8N - Analise de Respostas
echo ========================================
echo.

REM Verificar se curl esta disponivel
where curl >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] curl nao encontrado!
    echo.
    echo Instale curl ou use PowerShell:
    echo   Invoke-WebRequest -Uri http://localhost:5678/webhook/analisar-resposta -Method POST -ContentType "application/json" -Body '{"userId":"test","estacaoId":"est001","pergunta":"Teste","respostaUsuario":"Teste","gabarito":"Teste"}'
    echo.
    pause
    exit /b 1
)

echo [INFO] Testando webhook do N8N...
echo [INFO] URL: http://localhost:5678/webhook/analisar-resposta
echo.

curl -X POST http://localhost:5678/webhook/analisar-resposta ^
  -H "Content-Type: application/json" ^
  -d "{\"userId\":\"test-user-123\",\"estacaoId\":\"est001\",\"pergunta\":\"Quais sao os sintomas de infarto agudo do miocardio?\",\"respostaUsuario\":\"Dor no peito, falta de ar, sudorese\",\"gabarito\":\"Dor precordial em aperto, irradiacao para braco esquerdo, dispneia, diaforese, nauseas, palpitacoes\",\"conversationHistory\":[],\"timestamp\":\"2025-11-03T10:00:00Z\"}"

if %errorlevel% equ 0 (
    echo.
    echo.
    echo [SUCESSO] Webhook testado!
    echo.
    echo Verifique no N8N:
    echo   1. Acesse http://localhost:5678
    echo   2. Va em Executions
    echo   3. Veja a execucao mais recente
    echo.
) else (
    echo.
    echo [ERRO] Falha ao testar webhook
    echo.
    echo Verifique:
    echo   - N8N esta rodando? http://localhost:5678
    echo   - Workflow esta Active?
    echo   - Webhook esta configurado corretamente?
    echo.
)

pause





