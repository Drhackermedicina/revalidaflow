# 🎯 Criar Workflow N8N para SimulationView.vue - Guia Completo

Guia passo a passo para criar o workflow N8N completo que recebe dados do `SimulationView.vue` e analisa respostas usando **todas as chaves de API** disponíveis com fallback automático.

---

## 📋 Pré-requisitos

- ✅ N8N rodando em http://localhost:5678 (via Docker)
- ✅ Todas as chaves de API já configuradas via `docker-compose.n8n.yml`:
  - `GOOGLE_API_KEY_1`, `GOOGLE_API_KEY_2`
  - `VITE_GOOGLE_API_KEY_1`, `VITE_GOOGLE_API_KEY_2`, `VITE_GOOGLE_API_KEY_3`, `VITE_GOOGLE_API_KEY_6`
  - `ZAI_API_KEY`, `VITE_ZAI_API_KEY`

---

## 🚀 Passo a Passo: Criar o Workflow

### Passo 1: Acessar N8N

1. Acesse: http://localhost:5678
2. Login: `admin` / `admin`
3. Clique em **+ Add workflow**
4. Nome: `Análise de Respostas - SimulationView`
5. Clique em **Save** no canto superior direito

---

### Passo 2: Node Webhook (Receber Dados do SimulationView)

1. Clique em **+** para adicionar um node
2. Procure por **Webhook**
3. Configure:

**General:**
- **HTTP Method:** POST
- **Path:** `/webhook/analisar-resposta`
- **Response Mode:** Respond to Webhook
- **Response Code:** 200

**Options:**
- **Response Data:** `Last Node Output`

4. Clique em **Listen for Test Event** para ativar o webhook
5. Copie a URL que aparece: `http://localhost:5678/webhook/analisar-resposta`
6. Salve o node (Ctrl+S ou botão Save)

---

### Passo 3: Node Set (Preparar Dados e Prompt)

1. Conecte um novo node após o Webhook
2. Procure por **Set**
3. Configure:

**Mode:** Manual

**Values (clique em Add Value para cada campo):**

| Name | Value | Type |
|------|-------|------|
| `userId` | `={{$json.userId}}` | String |
| `estacaoId` | `={{$json.estacaoId}}` | String |
| `pergunta` | `={{$json.pergunta}}` | String |
| `respostaUsuario` | `={{$json.respostaUsuario}}` | String |
| `gabarito` | `={{$json.gabarito}}` | String |
| `conversationHistory` | `={{$json.conversationHistory}}` | Array |
| `aiEvaluationResult` | `={{$json.aiEvaluationResult}}` | Object |
| `simulationEnded` | `={{$json.simulationEnded}}` | Boolean |
| `timestamp` | `={{$json.timestamp}}` | String |

**Prompt Completo:**

Adicione mais um campo:

| Name | Value |
|------|-------|
| `prompt` | Veja o valor abaixo |

**Valor do campo `prompt`:**
```
Você é um avaliador médico especializado em exames clínicos OSCE para o REVALIDA (Exame de Revalidação de Diploma Médico no Brasil).

CONTEXTO DA ESTAÇÃO:
Título: {{$json.pergunta}}

GABARITO ESPERADO (Critérios do PEP):
{{$json.gabarito}}

RESPOSTA DO CANDIDATO:
{{$json.respostaUsuario}}

HISTÓRICO DA CONVERSAÇÃO (se disponível):
{{#if $json.conversationHistory}}{{#each $json.conversationHistory}}{{this.role}}: {{this.content}}

{{/each}}{{/if}}

AVALIAÇÃO PREVIA POR IA (se disponível):
{{#if $json.aiEvaluationResult}}
Nota Total: {{$json.aiEvaluationResult.total}}/100
{{#if $json.aiEvaluationResult.performance}}
Visão Geral: {{$json.aiEvaluationResult.performance.visaoGeral}}
{{/if}}
{{/if}}

INSTRUÇÕES DE ANÁLISE:
Analise a resposta do candidato considerando:
1. Correção técnica (acurácia médica)
2. Completude da resposta (todos os pontos do gabarito cobertos)
3. Relevância clínica (aplicabilidade prática)
4. Organização e estrutura
5. Comunicação efetiva
6. Segurança do paciente
7. Protocolos brasileiros de saúde

FORMATO DE RESPOSTA (JSON OBRIGATÓRIO):
{
  "pontuacao": número de 0 a 100,
  "feedback": "texto detalhado do feedback construtivo",
  "pontosFortes": ["item1", "item2", "item3"],
  "pontosMelhorar": ["item1", "item2", "item3"],
  "sugestoes": ["item1", "item2", "item3"],
  "analiseDetalhada": "análise mais profunda de cada aspecto avaliado",
  "comparacaoComAI": "comparação com avaliação prévia por IA (se disponível)",
  "chaveUsada": "nome da chave API utilizada"
}

IMPORTANTE: Retorne APENAS JSON válido, sem texto adicional ou markdown.
```

4. Salve o node

---

### Passo 4: Node Code (Selecionar Primeira Chave com Fallback)

1. Conecte um novo node após o Set
2. Procure por **Code**
3. Configure:

**Language:** JavaScript

**Code:**
```javascript
// Lista de chaves disponíveis (prioridade: ZAI > Gemini)
const apiKeys = [
  {
    provider: 'ZAI',
    model: 'glm-4.5',
    url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    key: $env.ZAI_API_KEY,
    headerKey: 'Authorization',
    headerValue: `Bearer ${$env.ZAI_API_KEY}`,
    bodyTemplate: (prompt) => ({
      model: 'glm-4.5',
      messages: [
        {
          role: 'system',
          content: 'Você é um avaliador médico especializado. Retorne APENAS JSON válido, sem texto adicional.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2048,
      response_format: { type: 'json_object' }
    })
  },
  {
    provider: 'Gemini',
    model: 'gemini-2.5-flash',
    url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    key: $env.GOOGLE_API_KEY_1,
    headerKey: 'x-goog-api-key',
    headerValue: $env.GOOGLE_API_KEY_1,
    bodyTemplate: (prompt) => ({
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json'
      }
    })
  },
  {
    provider: 'Gemini',
    model: 'gemini-2.5-flash',
    url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    key: $env.GOOGLE_API_KEY_2,
    headerKey: 'x-goog-api-key',
    headerValue: $env.GOOGLE_API_KEY_2,
    bodyTemplate: (prompt) => ({
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json'
      }
    })
  },
  {
    provider: 'Gemini',
    model: 'gemini-2.5-flash',
    url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    key: $env.VITE_GOOGLE_API_KEY_3,
    headerKey: 'x-goog-api-key',
    headerValue: $env.VITE_GOOGLE_API_KEY_3,
    bodyTemplate: (prompt) => ({
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json'
      }
    })
  },
  {
    provider: 'Gemini',
    model: 'gemini-2.5-flash',
    url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    key: $env.VITE_GOOGLE_API_KEY_6,
    headerKey: 'x-goog-api-key',
    headerValue: $env.VITE_GOOGLE_API_KEY_6,
    bodyTemplate: (prompt) => ({
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json'
      }
    })
  }
].filter(item => item.key); // Filtrar apenas chaves válidas

// Selecionar primeira chave disponível
const selectedKey = apiKeys[0];
const prompt = $json.prompt;
const requestBody = selectedKey.bodyTemplate(prompt);

return [{
  json: {
    ...$json,
    apiKey: selectedKey.key,
    apiProvider: selectedKey.provider,
    apiModel: selectedKey.model,
    apiUrl: selectedKey.url,
    headerKey: selectedKey.headerKey,
    headerValue: selectedKey.headerValue,
    requestBody: requestBody,
    keyIndex: 0,
    totalKeys: apiKeys.length,
    allApiKeys: apiKeys // Manter lista completa para fallback
  }
}];
```

4. Salve o node

---

### Passo 5: Node HTTP Request (Tentar Primeira Chave)

1. Conecte um novo node após o Code
2. Procure por **HTTP Request**
3. Configure:

**General:**
- **Method:** POST
- **URL:** `={{$json.apiUrl}}`

**Headers:**
- Clique em **Add Header**
- **Name:** `={{$json.headerKey}}`
- **Value:** `={{$json.headerValue}}`
- Clique em **Add Header** novamente
- **Name:** `Content-Type`
- **Value:** `application/json`

**Body:**
- **Body Content Type:** JSON
- **Body:** `={{JSON.stringify($json.requestBody)}}`

**Options:**
- **Timeout:** 30000 (30 segundos)
- **Redirect:** Follow

4. Salve o node

---

### Passo 6: Node IF (Verificar Sucesso)

1. Conecte um novo node após o HTTP Request
2. Procure por **IF**
3. Configure:

**Conditions:**
- **Value 1:** `={{$json.statusCode}}`
- **Operation:** Equal
- **Value 2:** `200`

4. Salve o node

---

### Passo 7: Node Function (Processar Resposta - Sucesso)

1. Conecte ao **IF** (ramo TRUE - sucesso)
2. Procure por **Code**
3. Configure:

**Language:** JavaScript

**Code:**
```javascript
const data = $json;
let content = '';
let analysis = {};

// Processar resposta baseado no provider
if (data.apiProvider === 'ZAI') {
  // Resposta ZAI está em data.body.choices[0].message.content
  content = data.body?.choices?.[0]?.message?.content || 
            data.body?.content || 
            JSON.stringify(data.body || {});
} else if (data.apiProvider === 'Gemini') {
  // Resposta Gemini está em data.body.candidates[0].content.parts[0].text
  content = data.body?.candidates?.[0]?.content?.parts?.[0]?.text || 
            data.body?.text || 
            JSON.stringify(data.body || {});
}

// Tentar extrair JSON da resposta
try {
  // Tentar parsear diretamente
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    analysis = JSON.parse(jsonMatch[0]);
    analysis.chaveUsada = `${data.apiProvider} (${data.apiModel})`;
  } else {
    throw new Error('JSON não encontrado na resposta');
  }
} catch (error) {
  // Fallback: criar análise básica
  analysis = {
    pontuacao: null,
    feedback: content || 'Erro ao processar resposta da IA',
    pontosFortes: [],
    pontosMelhorar: ['Erro ao parsear resposta JSON'],
    sugestoes: ['Verifique logs do N8N'],
    analiseDetalhada: content || 'Resposta vazia',
    erro: error.message,
    chaveUsada: `${data.apiProvider} (${data.apiModel})`
  };
}

return [{
  json: {
    ...data,
    analysis: analysis,
    success: true,
    respostaBruta: content.substring(0, 500) // Primeiros 500 chars para debug
  }
}];
```

4. Salve o node

---

### Passo 8: Node Code (Fallback para Próxima Chave)

1. Conecte ao **IF** (ramo FALSE - erro)
2. Procure por **Code**
3. Configure:

**Language:** JavaScript

**Code:**
```javascript
const data = $json;
const currentIndex = data.keyIndex || 0;
const apiKeys = data.allApiKeys || [];
const totalKeys = apiKeys.length;

// Verificar se há mais chaves disponíveis
if (currentIndex + 1 >= totalKeys) {
  // Todas as chaves falharam
  return [{
    json: {
      ...data,
      success: false,
      error: 'Todas as chaves API falharam',
      analysis: {
        pontuacao: null,
        feedback: 'Erro: Não foi possível analisar a resposta. Todas as chaves API falharam. Status: ' + (data.statusCode || 'unknown'),
        pontosFortes: [],
        pontosMelhorar: ['Todas as APIs falharam', 'Verifique logs do N8N'],
        sugestoes: ['Verifique conectividade', 'Verifique quotas das APIs'],
        erro: 'Todas as chaves API falharam',
        chaveUsada: 'Nenhuma (todas falharam)'
      }
    }
  }];
}

// Selecionar próxima chave
const nextKey = apiKeys[currentIndex + 1];
const prompt = data.prompt;
const requestBody = nextKey.bodyTemplate(prompt);

return [{
  json: {
    ...data,
    apiKey: nextKey.key,
    apiProvider: nextKey.provider,
    apiModel: nextKey.model,
    apiUrl: nextKey.url,
    headerKey: nextKey.headerKey,
    headerValue: nextKey.headerValue,
    requestBody: requestBody,
    keyIndex: currentIndex + 1,
    totalKeys: totalKeys,
    previousError: data.statusCode || data.error || 'Erro desconhecido',
    tentativas: (data.tentativas || 0) + 1
  }
}];
```

4. Salve o node

---

### Passo 9: Criar Loop de Fallback

1. Conecte o node **Code (Fallback)** de volta ao **HTTP Request**
   - Isso criará um loop que tenta todas as chaves até uma funcionar

2. **Importante:** O loop será controlado pelo node **IF** que verifica sucesso

---

### Passo 10: Node Respond to Webhook (Retornar Resultado)

1. Conecte após o **Function (Processar Resposta)**
2. Procure por **Respond to Webhook**
3. Configure:

**Respond With:** JSON

**Response Body:**
```json
{
  "success": "{{$json.success}}",
  "analysis": {
    "pontuacao": {{$json.analysis.pontuacao || null}},
    "feedback": "{{$json.analysis.feedback}}",
    "pontosFortes": {{JSON.stringify($json.analysis.pontosFortes || [])}},
    "pontosMelhorar": {{JSON.stringify($json.analysis.pontosMelhorar || [])}},
    "sugestoes": {{JSON.stringify($json.analysis.sugestoes || [])}},
    "analiseDetalhada": "{{$json.analysis.analiseDetalhada}}",
    "chaveUsada": "{{$json.analysis.chaveUsada}}"
  },
  "metadata": {
    "userId": "{{$json.userId}}",
    "estacaoId": "{{$json.estacaoId}}",
    "timestamp": "{{$json.timestamp}}",
    "apiProvider": "{{$json.apiProvider}}",
    "apiModel": "{{$json.apiModel}}",
    "tentativas": {{$json.tentativas || 1}}
  }
}
```

4. Salve o node

---

### Passo 11: Ativar o Workflow

1. Clique no toggle no canto superior direito para **ativar** o workflow
2. O workflow deve mostrar status **Active** (verde)

---

## 🧪 Testar o Workflow

### Teste Manual (cURL)

```bash
curl -X POST http://localhost:5678/webhook/analisar-resposta \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "estacaoId": "est001",
    "pergunta": "Quais são os sintomas de infarto agudo do miocárdio?",
    "respostaUsuario": "O paciente apresenta dor precordial em aperto, irradiação para braço esquerdo, falta de ar, sudorese e náuseas.",
    "gabarito": "Dor precordial: Tipicamente em aperto ou queimação\nDispneia: Falta de ar\nDiaforese: Sudorese\nNáuseas e vômitos: Sintomas associados",
    "conversationHistory": [
      {
        "role": "user",
        "content": "Paciente de 55 anos, sexo masculino",
        "timestamp": "2025-11-03T14:00:00Z"
      }
    ],
    "timestamp": "2025-11-03T14:00:00Z"
  }'
```

### Teste do SimulationView.vue

1. Complete uma simulação como candidato
2. Verifique logs do navegador:
   - Procure por `[N8N_WORKFLOW]`
   - Deve ver: `✅ N8N notificado com sucesso`
3. Acesse **Executions** no N8N:
   - Deve ver uma execução nova
   - Veja a análise gerada

---

## 📊 Estrutura Final do Workflow

```
Webhook
  ↓
Set (Prompt)
  ↓
Code (Selecionar Chave)
  ↓
HTTP Request (Tentar Chave)
  ↓
IF (Sucesso?)
  ├─ TRUE → Function (Processar) → Respond to Webhook
  └─ FALSE → Code (Fallback) → [Loop de volta para HTTP Request]
```

---

## ✅ Checklist de Configuração

- [ ] N8N rodando em http://localhost:5678
- [ ] Todas as chaves configuradas no `docker-compose.n8n.yml`
- [ ] N8N reiniciado após atualizar `docker-compose.n8n.yml`
- [ ] Webhook criado com path `/webhook/analisar-resposta`
- [ ] Prompt configurado no node Set
- [ ] Node Code seleciona primeira chave (ZAI)
- [ ] Node HTTP Request configurado
- [ ] Node IF verifica statusCode === 200
- [ ] Node Function processa resposta
- [ ] Node Code (Fallback) tenta próxima chave
- [ ] Loop criado (Fallback → HTTP Request)
- [ ] Node Respond to Webhook configurado
- [ ] Workflow ativado (status Active)
- [ ] Testado com cURL
- [ ] Testado com SimulationView.vue

---

## 🔍 Troubleshooting

### Problema: Workflow não executa

**Soluções:**
1. Verifique se o workflow está **ativo** (toggle verde)
2. Verifique se o webhook está **listening** (ícone verde no node Webhook)
3. Verifique logs em **Executions** no N8N

### Problema: Erro 401/403 nas APIs

**Soluções:**
1. Verifique se as chaves estão configuradas: `{{$env.CHAVE_NOME}}`
2. Teste cada chave individualmente:
   ```bash
   curl -X POST https://open.bigmodel.cn/api/paas/v4/chat/completions \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer $ZAI_API_KEY" \
     -d '{"model": "glm-4.5", "messages": [{"role": "user", "content": "teste"}]}'
   ```
3. Verifique se o N8N foi reiniciado após atualizar `docker-compose.n8n.yml`

### Problema: Loop infinito

**Soluções:**
1. Verifique se o node **IF** está verificando `statusCode === 200` corretamente
2. Verifique se o node **Code (Fallback)** está incrementando `keyIndex`
3. Adicione limite máximo no node **Code (Fallback)**: `if (tentativas >= totalKeys) return error`

### Problema: JSON não parseado

**Soluções:**
1. Verifique o node **Function (Processar Resposta)**
2. Veja a resposta bruta em `respostaBruta` no output
3. Ajuste o prompt para forçar formato JSON
4. Use `responseMimeType: 'application/json'` no Gemini

---

## 📚 Referências

- **Documentação Completa:** `docs/WORKFLOW_N8N_SIMULATIONVIEW_COMPLETO.md`
- **Integração SimulationView:** `docs/INTEGRACAO_N8N_SIMULATIONVIEW.md`
- **Exemplo de Workflow:** `docs/EXEMPLO_WORKFLOW_IA_ANALISE_RESPOSTAS.md`
- **Todas as Chaves:** `docs/N8N_TODAS_CHAVES_API.md`
- **Workflow JSON:** `workflows/n8n-simulationview-workflow.json`

---

## 🎉 Pronto!

Agora o workflow está configurado e pronto para receber dados do `SimulationView.vue`!

**Dados que o SimulationView.vue envia:**
- Quando simulação termina (linha 1613)
- Após avaliação por IA ser concluída (linha 666)

**O workflow:**
1. Recebe os dados via webhook
2. Prepara o prompt
3. Tenta ZAI (GLM-4.5) primeiro
4. Se falhar, tenta todas as chaves Gemini em sequência
5. Processa a resposta
6. Retorna análise completa

---

**Última atualização:** 2025-11-03  
**Versão:** 1.0.0








