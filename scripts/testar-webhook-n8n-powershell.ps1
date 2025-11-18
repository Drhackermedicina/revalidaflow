# Teste do Webhook N8N - PowerShell
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Teste do N8N Webhook - REVALIDAFLOW" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/3] Verificando se N8N está rodando..." -ForegroundColor Yellow
docker ps --filter "name=n8n-local" --format "{{.Names}} - {{.Status}}"
Write-Host ""

Write-Host "[2/3] Testando webhook do N8N..." -ForegroundColor Yellow
Write-Host "IMPORTANTE: Execute o workflow no N8N primeiro (botão 'Execute workflow' no canvas)!" -ForegroundColor Red
Write-Host ""

$body = @{
    userId = "test-user-123"
    estacaoId = "est001"
    pergunta = "Quais são os sintomas de infarto agudo do miocárdio?"
    respostaUsuario = "O paciente apresenta dor precordial em aperto, falta de ar, sudorese e náuseas."
    gabarito = "Dor precordial: Tipicamente em aperto ou queimação`nDispneia: Falta de ar`nDiaforese: Sudorese`nNáuseas e vômitos: Sintomas associados"
    conversationHistory = @()
    timestamp = "2025-11-03T14:00:00Z"
} | ConvertTo-Json

$headers = @{
    "Content-Type" = "application/json"
}

try {
    Write-Host "Enviando requisição para: http://localhost:5678/webhook-test/webhook/analisar-resposta" -ForegroundColor Green
    $response = Invoke-RestMethod -Uri "http://localhost:5678/webhook-test/webhook/analisar-resposta" -Method POST -Headers $headers -Body $body
    
    Write-Host ""
    Write-Host "[3/3] Resposta recebida:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
    Write-Host ""
    Write-Host "✅ Teste concluído com sucesso!" -ForegroundColor Green
} catch {
    Write-Host ""
    Write-Host "❌ Erro ao testar webhook:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Dicas:" -ForegroundColor Yellow
    Write-Host "1. Verifique se o workflow está ATIVO no N8N" -ForegroundColor Yellow
    Write-Host "2. Clique em 'Execute workflow' no canvas do N8N ANTES de testar" -ForegroundColor Yellow
    Write-Host "3. Verifique se o webhook está 'Listening for test event' (verde)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Próximos passos:" -ForegroundColor Cyan
Write-Host "1. Execute o workflow no N8N (botão 'Execute workflow')" -ForegroundColor White
Write-Host "2. Depois execute este script novamente" -ForegroundColor White
Write-Host "3. Para produção, use a URL: http://localhost:5678/webhook/analisar-resposta" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan








