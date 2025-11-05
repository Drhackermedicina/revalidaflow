# 🎯 Workflow N8N Completo para SimulationView.vue

Workflow completo e pronto para uso no N8N, configurado para receber dados do `SimulationView.vue` e analisar respostas usando múltiplas chaves de API com fallback automático.

---

## 📋 Pré-requisitos

- ✅ N8N rodando em http://localhost:5678
- ✅ Todas as chaves de API já configuradas via `docker-compose.n8n.yml`:
  - `GOOGLE_API_KEY_1`, `GOOGLE_API_KEY_2`
  - `VITE_GOOGLE_API_KEY_1`, `VITE_GOOGLE_API_KEY_2`, `VITE_GOOGLE_API_KEY_3`, `VITE_GOOGLE_API_KEY_6`
  - `ZAI_API_KEY`, `VITE_ZAI_API_KEY`

---

## 🚀 Criar o Workflow

### Passo 1: Criar Novo Workflow

1. Acesse: http://localhost:5678
2. Login: `admin` / `admin`
3. Clique em **+ Add workflow**
4. Nome: `Análise de Respostas - SimulationView`

---

### Passo 2: Node Webhook (Receber Dados)

1. Clique em **+** para adicionar node
2. Procure por **Webhook**
3. Configure:

**General:**
- **HTTP Method:** POST
- **Path:** `/webhook/analisar-resposta`
- **Response Mode:** Respond to Webhook
- **Response Code:** 200

4. Clique em **Listen for Test Event** para ativar
5. Copie a URL: `http://localhost:5678/webhook/analisar-resposta`
6. Salve o node

---

### Passo 3: Node Set (Preparar Prompt)

1. Conecte um novo node após o Webhook
2. Procure por **Set**
3. Configure:

**Mode:** Manual

**Values (adicionar cada campo):**

| Name | Value | Type |
|------|-------|------|
| `userId` | `{{$json.userId}}` | String |
| `estacaoId` | `{{$json.estacaoId}}` | String |
| `pergunta` | `{{$json.pergunta}}` | String |
| `respostaUsuario` | `{{$json.respostaUsuario}}` | String |
| `gabarito` | `{{$json.gabarito}}` | String |
| `conversationHistory` | `{{$json.conversationHistory}}` | Array |
| `aiEvaluationResult` | `{{$json.aiEvaluationResult}}` | Object |
| `simulationEnded` | `{{$json.simulationEnded}}` | Boolean |
| `timestamp` | `{{$json.timestamp}}` | String |

**Prompt Completo:**

Adicione mais um campo:

| Name | Value | Type |
|------|-------|------|
| `prompt` | Veja abaixo | String |

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

### Passo 4: Node Code (Selecionar Chave com Fallback)

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
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 2048
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
        temperature: 0.7,
        maxOutputTokens: 2048
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
        temperature: 0.7,
        maxOutputTokens: 2048
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
        temperature: 0.7,
        maxOutputTokens: 2048
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
        temperature: 0.7,
        maxOutputTokens: 2048
      }
    })
  }
].filter(item => item.key); // Filtrar apenas chaves válidas

// Selecionar primeira chave disponível
const selectedKey = apiKeys[0];

// Preparar requisição
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
    totalKeys: apiKeys.length
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
- **URL:** `{{$json.apiUrl}}`

**Headers:**
- Clique em **Add Header**
- **Name:** `{{$json.headerKey}}`
- **Value:** `{{$json.headerValue}}`
- Clique em **Add Header** novamente
- **Name:** `Content-Type`
- **Value:** `application/json`

**Body:**
- **Body Content Type:** JSON
- **Body:** `{{$json.requestBody}}`

**Options:**
- **Timeout:** 30000 (30 segundos)

4. Salve o node

---

### Passo 6: Node IF (Verificar Sucesso)

1. Conecte um novo node após o HTTP Request
2. Procure por **IF**
3. Configure:

**Conditions:**
- **Value 1:** `{{$json.statusCode}}`
- **Operation:** Equal
- **Value 2:** `200`

4. Salve o node

---

### Passo 7: Node Function (Processar Resposta ZAI)

1. Conecte ao **IF** (ramo TRUE - sucesso)
2. Procure por **Code**
3. Configure:

**Language:** JavaScript

**Code:**
```javascript
const data = $json;
let analysis = {};

// Processar resposta baseado no provider
if (data.apiProvider === 'ZAI') {
  // Resposta ZAI está em data.choices[0].message.content
  const content = data.body?.choices?.[0]?.message?.content || data.body?.content || '';
  
  try {
    // Tentar extrair JSON da resposta
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      analysis = JSON.parse(jsonMatch[0]);
    } else {
      analysis = {
        pontuacao: null,
        feedback: content,
        pontosFortes: [],
        pontosMelhorar: [],
        sugestoes: [],
        analiseDetalhada: content,
        chaveUsada: `${data.apiProvider} (${data.apiModel})`
      };
    }
  } catch (error) {
    analysis = {
      pontuacao: null,
      feedback: content,
      pontosFortes: [],
      pontosMelhorar: [],
      sugestoes: [],
      analiseDetalhada: content,
      erro: error.message,
      chaveUsada: `${data.apiProvider} (${data.apiModel})`
    };
  }
} else if (data.apiProvider === 'Gemini') {
  // Resposta Gemini está em data.body.candidates[0].content.parts[0].text
  const content = data.body?.candidates?.[0]?.content?.parts?.[0]?.text || data.body?.text || '';
  
  try {
    // Tentar extrair JSON da resposta
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      analysis = JSON.parse(jsonMatch[0]);
    } else {
      analysis = {
        pontuacao: null,
        feedback: content,
        pontosFortes: [],
        pontosMelhorar: [],
        sugestoes: [],
        analiseDetalhada: content,
        chaveUsada: `${data.apiProvider} (${data.apiModel})`
      };
    }
  } catch (error) {
    analysis = {
      pontuacao: null,
      feedback: content,
      pontosFortes: [],
      pontosMelhorar: [],
      sugestoes: [],
      analiseDetalhada: content,
      erro: error.message,
      chaveUsada: `${data.apiProvider} (${data.apiModel})`
    };
  }
}

return [{
  json: {
    ...data,
    analysis: analysis,
    success: true
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
const totalKeys = data.totalKeys || 1;

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
        feedback: 'Erro: Não foi possível analisar a resposta. Todas as chaves API falharam.',
        pontosFortes: [],
        pontosMelhorar: [],
        sugestoes: [],
        erro: 'Todas as chaves API falharam'
      }
    }
  }];
}

// Preparar lista de chaves para fallback
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
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 2048
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
        temperature: 0.7,
        maxOutputTokens: 2048
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
        temperature: 0.7,
        maxOutputTokens: 2048
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
        temperature: 0.7,
        maxOutputTokens: 2048
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
        temperature: 0.7,
        maxOutputTokens: 2048
      }
    })
  }
].filter(item => item.key);

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
    totalKeys: apiKeys.length,
    previousError: data.statusCode || data.error
  }
}];
```

4. Salve o node

---

### Passo 9: Conectar Fallback ao HTTP Request

1. Conecte o node **Code (Fallback)** de volta ao **HTTP Request** (loop)
2. Isso criará um loop de tentativas com fallback automático

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
    "pontosFortes": {{JSON.stringify($json.analysis.pontosFortes)}},
    "pontosMelhorar": {{JSON.stringify($json.analysis.pontosMelhorar)}},
    "sugestoes": {{JSON.stringify($json.analysis.sugestoes)}},
    "analiseDetalhada": "{{$json.analysis.analiseDetalhada}}",
    "chaveUsada": "{{$json.analysis.chaveUsada}}"
  },
  "metadata": {
    "userId": "{{$json.userId}}",
    "estacaoId": "{{$json.estacaoId}}",
    "timestamp": "{{$json.timestamp}}",
    "apiProvider": "{{$json.apiProvider}}",
    "apiModel": "{{$json.apiModel}}"
  }
}
```

4. Salve o node

---

### Passo 11: Ativar o Workflow

1. Clique no toggle no canto superior direito para **ativar** o workflow
2. O workflow está pronto para receber dados do `SimulationView.vue`

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
    "respostaUsuario": "O paciente apresenta dor precordial, falta de ar, sudorese e náuseas.",
    "gabarito": "Dor precordial: Tipicamente em aperto ou queimação\nDispneia: Falta de ar\nDiaforese: Sudorese\nNáuseas e vômitos: Sintomas associados",
    "conversationHistory": [],
    "timestamp": "2025-11-03T14:00:00Z"
  }'
```

### Teste do SimulationView.vue

1. Complete uma simulação como candidato
2. Verifique logs do navegador: `[N8N_WORKFLOW] ✅ N8N notificado com sucesso`
3. Acesse **Executions** no N8N para ver o workflow executado

---

## 📊 Estrutura do Workflow

```
Webhook → Set (Prompt) → Code (Selecionar Chave)
                              ↓
                    HTTP Request (Tentar Chave)
                              ↓
                           IF (Sucesso?)
                    ↙                    ↘
        Function (Processar)          Code (Fallback)
                    ↓                        ↓
        Respond to Webhook ←────────────────┘ (loop)
```

---

## 🔍 Troubleshooting

### Problema: Workflow não executa

**Soluções:**
1. Verifique se o workflow está **ativo**
2. Verifique se o webhook está **listening** (ícone verde)
3. Verifique logs em **Executions**

### Problema: Erro de API Key

**Soluções:**
1. Verifique se as chaves estão configuradas: `{{$env.CHAVE_NOME}}`
2. Verifique se o N8N foi reiniciado após atualizar `docker-compose.n8n.yml`
3. Use `docker exec n8n-local env | grep API_KEY` para verificar

### Problema: Loop infinito

**Soluções:**
1. Verifique se o node **IF** está configurado corretamente
2. Adicione limite máximo de tentativas no node **Code (Fallback)**

---

## 📚 Referências

- **Documentação N8N:** https://docs.n8n.io/
- **ZAI API:** https://open.bigmodel.cn/doc/api
- **Google Gemini API:** https://ai.google.dev/docs
- **Integração SimulationView:** `docs/INTEGRACAO_N8N_SIMULATIONVIEW.md`

---

**Última atualização:** 2025-11-03  
**Versão:** 1.0.0



