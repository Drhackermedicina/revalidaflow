# 🔗 Integração N8N no SimulationView.vue

Este documento explica como a integração com N8N foi implementada no `SimulationView.vue`.

## 🎯 Objetivo

Notificar automaticamente o workflow N8N quando uma simulação termina, permitindo análise automática de respostas usando GLM-4.5 ou GLM-4.6 da ZAI via OpenRouter (ZAI_API_KEY).

---

## ✅ Implementação

### 1. Configuração de Ambiente

Adicione ao `.env` ou `.env.local`:

```env
# N8N Webhook Configuration
VITE_N8N_WEBHOOK_URL=http://localhost:5678/webhook/analisar-resposta
VITE_N8N_ENABLED=true
```

**Para produção:**
```env
VITE_N8N_WEBHOOK_URL=https://seu-n8n-instance.com/webhook/analisar-resposta
VITE_N8N_ENABLED=true
```

### 2. Função de Notificação

A função `notifyN8NWorkflow()` foi adicionada ao `SimulationView.vue`:

```javascript
const notifyN8NWorkflow = async (data) => {
  const n8nWebhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/analisar-resposta';
  const n8nEnabled = import.meta.env.VITE_N8N_ENABLED === 'true' || import.meta.env.DEV;

  if (!n8nEnabled || !n8nWebhookUrl) {
    logger.debug('[N8N_WORKFLOW] ⚠️ N8N não configurado, ignorando notificação');
    return;
  }

  try {
    logger.info('[N8N_WORKFLOW] 📡 Notificando N8N para análise de resposta...');
    
    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (response.ok) {
      logger.info('[N8N_WORKFLOW] ✅ N8N notificado com sucesso');
    } else {
      logger.warn('[N8N_WORKFLOW] ⚠️ N8N retornou erro', {
        status: response.status
      });
    }
  } catch (error) {
    logger.warn('[N8N_WORKFLOW] ⚠️ Erro ao notificar N8N (não crítico)', {
      error: error.message
    });
    // Não rejeitar a promise - o N8N é opcional
  }
};
```

### 3. Pontos de Integração

A notificação N8N é acionada em dois momentos:

#### A) Quando a simulação termina (watcher `simulationEnded`)

```javascript
watch(simulationEnded, async (newValue) => {
  if (newValue && userRole.value === 'candidate') {
    // Notificar N8N quando simulação termina
    notifyN8NWorkflow({
      userId: currentUser.value?.uid || '',
      estacaoId: stationId.value,
      pergunta: stationData.value.tituloEstacao || '',
      respostaUsuario: conversationHistory.value
        .filter(entry => entry.role === 'user')
        .map(entry => entry.content)
        .join('\n'),
      gabarito: checklistData.value.itensAvaliacao
        ?.map(item => `${item.titulo}: ${item.descricao}`)
        .join('\n') || '',
      conversationHistory: conversationHistory.value,
      simulationEnded: true,
      timestamp: new Date().toISOString()
    });
  }
});
```

#### B) Após avaliação por IA ser concluída

```javascript
const result = await runAiEvaluation();

if (result) {
  // ... processar resultado ...
  
  // Notificar N8N sobre análise de resposta
  notifyN8NWorkflow({
    userId: currentUser.value?.uid || '',
    estacaoId: stationId.value,
    pergunta: stationData.value.tituloEstacao || '',
    respostaUsuario: syncedHistory
      .filter(entry => entry.role === 'user')
      .map(entry => entry.content)
      .join('\n'),
    gabarito: checklistData.value.itensAvaliacao
      ?.map(item => `${item.titulo}: ${item.descricao}`)
      .join('\n') || '',
    conversationHistory: syncedHistory,
    aiEvaluationResult: result,
    timestamp: new Date().toISOString()
  });
}
```

---

## 📋 Dados Enviados para N8N

O workflow N8N recebe os seguintes dados:

```json
{
  "userId": "abc123",
  "estacaoId": "est001",
  "pergunta": "Título da estação clínica",
  "respostaUsuario": "Texto completo das respostas do candidato",
  "gabarito": "Item 1: Descrição\nItem 2: Descrição",
  "conversationHistory": [
    {
      "role": "user",
      "content": "Texto da mensagem",
      "timestamp": "2025-11-03T10:00:00Z",
      "speakerId": "user123",
      "speakerName": "Nome do Usuário"
    }
  ],
  "aiEvaluationResult": {
    "scores": {},
    "total": 85,
    "performance": {}
  },
  "simulationEnded": true,
  "timestamp": "2025-11-03T10:00:00Z"
}
```

---

## 🔧 Configuração do N8N

### 1. Criar Workflow no N8N

1. Acesse http://localhost:5678
2. Crie novo workflow
3. Adicione node **Webhook**
4. Configure:
   - **Path:** `/webhook/analisar-resposta`
   - **Method:** POST
   - **Response Mode:** Response Node

5. Copie a URL do webhook (ex: `http://localhost:5678/webhook/analisar-resposta`)

### 2. Configurar Variáveis de Ambiente no N8N

1. Acesse **Settings** → **Variables**
2. Adicione variável:
   - **Name:** `ZAI_API_KEY`
   - **Value:** `8a02b7c0d6564feea066b7e897207484.8kwdZuX7C70OLUBC`

### 3. Seguir Exemplo de Workflow

Consulte `docs/EXEMPLO_WORKFLOW_IA_ANALISE_RESPOSTAS.md` para configuração completa do workflow com GLM-4.5 ou GLM-4.6.

---

## 🧪 Testar Integração

### 1. Testar Webhook do N8N

```bash
curl -X POST http://localhost:5678/webhook/analisar-resposta \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "estacaoId": "est001",
    "pergunta": "Quais são os sintomas de infarto?",
    "respostaUsuario": "Dor no peito, falta de ar",
    "gabarito": "Dor precordial, dispneia, diaforese",
    "conversationHistory": [],
    "timestamp": "2025-11-03T10:00:00Z"
  }'
```

### 2. Testar no SimulationView

1. Complete uma simulação como candidato
2. Verifique os logs do navegador:
   - Procure por `[N8N_WORKFLOW]`
   - Deve ver: `✅ N8N notificado com sucesso`

3. Verifique no N8N:
   - Acesse **Executions**
   - Deve ver uma execução nova

---

## 🔍 Troubleshooting

### Problema: N8N não recebe notificações

**Soluções:**
1. Verifique se `VITE_N8N_ENABLED=true` no `.env`
2. Verifique se `VITE_N8N_WEBHOOK_URL` está correto
3. Verifique se N8N está rodando: http://localhost:5678
4. Verifique logs do navegador para erros

### Problema: CORS Error

**Soluções:**
1. Se N8N estiver em outro domínio, configure CORS no N8N
2. Ou use proxy no backend para chamar N8N

### Problema: Workflow não executa

**Soluções:**
1. Verifique se o workflow está **ativo** no N8N
2. Verifique a URL do webhook no workflow
3. Verifique logs do N8N (Executions → Ver execução falha)

---

## 🎨 Melhorias Futuras

- [ ] Adicionar retry automático se N8N falhar
- [ ] Cache de notificações para evitar duplicatas
- [ ] Métricas de sucesso/falha de notificações
- [ ] UI para visualizar status do N8N

---

**Última atualização:** 2025-11-03  
**Versão:** 1.0.0

