@echo off
echo ========================================
echo Teste do N8N Local - REVALIDAFLOW
echo ========================================
echo.

echo [1/3] Verificando se N8N está rodando...
docker ps --filter "name=n8n-local" --format "{{.Names}} - {{.Status}}"
echo.

echo [2/3] Testando webhook do N8N...
echo.
echo Enviando dados de teste para o webhook...
echo.

curl -X POST http://localhost:5678/webhook/analisar-resposta ^
  -H "Content-Type: application/json" ^
  -d "{\"userId\":\"test-user-123\",\"estacaoId\":\"est001\",\"pergunta\":\"Quais são os sintomas de infarto agudo do miocárdio?\",\"respostaUsuario\":\"O paciente apresenta dor precordial em aperto, falta de ar, sudorese e náuseas.\",\"gabarito\":\"Dor precordial: Tipicamente em aperto ou queimação\nDispneia: Falta de ar\nDiaforese: Sudorese\nNáuseas e vômitos: Sintomas associados\",\"conversationHistory\":[],\"timestamp\":\"2025-11-03T14:00:00Z\"}"
echo.
echo.

echo [3/3] Teste concluído!
echo.
echo ========================================
echo Próximos passos:
echo 1. Verifique se o N8N está rodando: http://localhost:5678
echo 2. Acesse Executions no N8N para ver a execução
echo 3. Teste no SimulationView.vue completando uma simulação
echo ========================================
echo.
pause







