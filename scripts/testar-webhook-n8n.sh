#!/bin/bash
# Script para testar webhook do N8N (Linux/Mac)

echo "========================================"
echo "Testar Webhook N8N - Analise de Respostas"
echo "========================================"
echo ""

echo "[INFO] Testando webhook do N8N..."
echo "[INFO] URL: http://localhost:5678/webhook/analisar-resposta"
echo ""

curl -X POST http://localhost:5678/webhook/analisar-resposta \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "estacaoId": "est001",
    "pergunta": "Quais são os sintomas de infarto agudo do miocárdio?",
    "respostaUsuario": "Dor no peito, falta de ar, sudorese",
    "gabarito": "Dor precordial em aperto, irradiação para braço esquerdo, dispneia, diaforese, náuseas, palpitações",
    "conversationHistory": [],
    "timestamp": "2025-11-03T10:00:00Z"
  }'

if [ $? -eq 0 ]; then
    echo ""
    echo ""
    echo "[SUCESSO] Webhook testado!"
    echo ""
    echo "Verifique no N8N:"
    echo "  1. Acesse http://localhost:5678"
    echo "  2. Vá em Executions"
    echo "  3. Veja a execução mais recente"
    echo ""
else
    echo ""
    echo "[ERRO] Falha ao testar webhook"
    echo ""
    echo "Verifique:"
    echo "  - N8N está rodando? http://localhost:5678"
    echo "  - Workflow está Active?"
    echo "  - Webhook está configurado corretamente?"
    echo ""
    exit 1
fi







