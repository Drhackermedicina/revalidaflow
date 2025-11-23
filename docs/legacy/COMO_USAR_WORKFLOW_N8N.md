# 🚀 Como Usar o Workflow N8N - Passo a Passo

Guia prático para criar e usar o workflow N8N com GLM-4.5/GLM-4.6 da ZAI no REVALIDAFLOW.

## 📋 Pré-requisitos

- ✅ N8N rodando em http://localhost:5678
- ✅ Docker com N8N configurado (já está rodando!)
- ✅ Todas as chaves de API já estão configuradas via `docker-compose.n8n.yml`

### 🔑 Chaves Disponíveis

Todas as chaves do `.env` já estão disponíveis no N8N:

- **Google Gemini (Backend):** `GOOGLE_API_KEY_1`, `GOOGLE_API_KEY_2`
- **Google Gemini (Frontend):** `VITE_GOOGLE_API_KEY_1`, `VITE_GOOGLE_API_KEY_2`, `VITE_GOOGLE_API_KEY_3`, `VITE_GOOGLE_API_KEY_6`
- **ZAI:** `ZAI_API_KEY`, `VITE_ZAI_API_KEY`

**Use no N8N:** `{{$env.CHAVE_NOME}}` (ex: `{{$env.ZAI_API_KEY}}`)

> 💡 **Nota:** As chaves já estão configuradas automaticamente via Docker. Não é necessário configurar manualmente, mas você pode fazer isso se preferir (veja `docs/N8N_TODAS_CHAVES_API.md`).

---

## 🔧 Passo 2: Criar o Workflow

### 2.1. Criar Novo Workflow

1. Na página principal do N8N, clique em **+ Add workflow**
2. Dê um nome: `Análise de Respostas - GLM-4.5`

### 2.2. Adicionar Node Webhook

1. Clique em **+** para adicionar um node
2. Procure por **Webhook**
3. Configure:
   - **HTTP Method:** POST
   - **Path:** `/webhook/analisar-resposta`
   - **Response Mode:** Respond to Webhook
   - **Response Code:** 200

4. Clique em **Listen for Test Event** para ativar o webhook
5. **Copie a URL** que aparece (ex: `http://localhost:5678/webhook/analisar-resposta`)
6. Clique em **Save** no node

### 2.3. Adicionar Node Set (Preparar Prompt)

1. Conecte um novo node após o Webhook
2. Procure por **Set**
3. Configure:
   - **Mode:** Manual
   - **Values:** Adicione os seguintes campos:

```json
{
  "userId": "{{$json.userId}}",
  "estacaoId": "{{$json.estacaoId}}",
  "pergunta": "{{$json.pergunta}}",
  "respostaUsuario": "{{$json.respostaUsuario}}",
  "gabarito": "{{$json.gabarito}}",
  "conversationHistory": "{{$json.conversationHistory}}",
  "prompt": "Você é um avaliador médico especializado em exames clínicos OSCE para o REVALIDA (Exame de Revalidação de Diploma Médico no Brasil).\n\nCONTEXTO DA ESTAÇÃO:\nTítulo: {{$json.pergunta}}\n\nGABARITO ESPERADO (Critérios do PEP):\n{{$json.gabarito}}\n\nRESPOSTA DO CANDIDATO:\n{{$json.respostaUsuario}}\n\nHISTÓRICO DA CONVERSAÇÃO (se disponível):\n{{#if $json.conversationHistory}}{{#each $json.conversationHistory}}{{this.role}}: {{this.content}}\n{{/each}}{{/if}}\n\nINSTRUÇÕES DE ANÁLISE:\nAnalise a resposta do candidato considerando:\n1. Correção técnica (acurácia médica)\n2. Completude da resposta (todos os pontos do gabarito cobertos)\n3. Relevância clínica (aplicabilidade prática)\n4. Organização e estrutura\n5. Comunicação efetiva\n6. Segurança do paciente\n7. Protocolos brasileiros de saúde\n\nFORMATO DE RESPOSTA (JSON OBRIGATÓRIO):\n{\n  \"pontuacao\": número de 0 a 100,\n  \"feedback\": \"texto detalhado do feedback construtivo\",\n  \"pontosFortes\": [\"item1\", \"item2\", \"item3\"],\n  \"pontosMelhorar\": [\"item1\", \"item2\", \"item3\"],\n  \"sugestoes\": [\"item1\", \"item2\", \"item3\"],\n  \"analiseDetalhada\": \"análise mais profunda de cada aspecto avaliado\"\n}\n\nIMPORTANTE: Retorne APENAS JSON válido, sem texto adicional."
}
```

4. Clique em **Save**

### 2.4. Adicionar Node HTTP Request (Chamar API da ZAI)

1. Conecte um novo node após o Set
2. Procure por **HTTP Request**
3. Configure:

**General:**
- **Method:** POST
- **URL:** `https://open.bigmodel.cn/api/paas/v4/chat/completions`

**Headers:**
- Clique em **Add Header**
- **Name:** `Content-Type`
- **Value:** `application/json`
- Clique em **Add Header** novamente
- **Name:** `Authorization`
- **Value:** `Bearer {{$env.ZAI_API_KEY}}`

**Body:**
- **Body Content Type:** JSON
- **Body:** Cole o JSON abaixo:

```json
{
  "model": "glm-4.5",
  "messages": [
    {
      "role": "system",
      "content": "Você é um avaliador médico especializado em exames clínicos OSCE para o REVALIDA. Analise respostas de simulações clínicas e forneça feedback detalhado e construtivo."
    },
    {
      "role": "user",
      "content": "{{$json.prompt}}"
    }
  ],
  "temperature": 0.3,
  "max_tokens": 2048,
  "response_format": {
    "type": "json_object"
  }
}
```

4. Clique em **Save**

### 2.5. Adicionar Node Set (Processar Resposta)

1. Conecte um novo node após o HTTP Request
2. Procure por **Set**
3. Configure:
   - **Mode:** Manual
   - **Values:**

```json
{
  "userId": "{{$('Set').item.json.userId}}",
  "estacaoId": "{{$('Set').item.json.estacaoId}}",
  "respostaIA": "{{$json.choices[0].message.content}}",
  "timestamp": "{{$now}}"
}
```

4. Clique em **Save**

### 2.6. Adicionar Node Code (Parsear JSON) - Opcional mas Recomendado

1. Conecte um novo node após o Set anterior
2. Procure por **Code**
3. Selecione **JavaScript**
4. Cole o código abaixo:

```javascript
const respostaTexto = $input.item.json.respostaIA;

try {
  // Tentar parsear diretamente (ZAI retorna JSON estruturado)
  const analise = JSON.parse(respostaTexto);
  
  return {
    ...analise,
    userId: $('Set').item.json.userId,
    estacaoId: $('Set').item.json.estacaoId,
    timestamp: new Date().toISOString(),
    modeloIA: 'glm-4.5'
  };
} catch (e) {
  // Fallback: tentar extrair JSON do texto
  const jsonMatch = respostaTexto.match(/\{[\s\S]*\}/);
  
  if (jsonMatch) {
    try {
      const analise = JSON.parse(jsonMatch[0]);
      return {
        ...analise,
        userId: $('Set').item.json.userId,
        estacaoId: $('Set').item.json.estacaoId,
        timestamp: new Date().toISOString(),
        modeloIA: 'glm-4.5'
      };
    } catch (parseError) {
      return {
        erro: 'Erro ao parsear JSON',
        respostaBruta: respostaTexto
      };
    }
  }
  
  return {
    erro: 'JSON não encontrado na resposta',
    respostaBruta: respostaTexto
  };
}
```

5. Clique em **Save**

### 2.7. Adicionar Node Response (Retornar Resposta)

1. Conecte um novo node após o Code
2. Procure por **Respond to Webhook**
3. Configure:
   - **Respond With:** JSON
   - **Response Body:** `{{$json}}`
4. Clique em **Save**

---

## ✅ Passo 3: Ativar o Workflow

1. No topo do workflow, clique no toggle **Inactive** → **Active**
2. Aguarde alguns segundos
3. O status deve mudar para **Active** ✅

---

## 🧪 Passo 4: Testar o Workflow

### 4.1. Testar via Terminal

```bash
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
```

### 4.2. Verificar Execução

1. No N8N, vá em **Executions** (no menu lateral)
2. Você deve ver uma nova execução
3. Clique na execução para ver os detalhes
4. Veja cada node e verifique se houve erros

---

## 🔄 Passo 5: Integração Automática com SimulationView.vue

O workflow já está integrado no `SimulationView.vue`! Quando uma simulação termina:

1. O `SimulationView.vue` automaticamente notifica o N8N
2. O workflow processa a análise com GLM-4.5
3. A resposta é retornada (você pode salvar no Firestore se quiser)

### Configurar URL do Webhook no Projeto

Adicione ao `.env` ou `.env.local`:

```env
# N8N Webhook Configuration
VITE_N8N_WEBHOOK_URL=http://localhost:5678/webhook/analisar-resposta
VITE_N8N_ENABLED=true
```

---

## 📊 Estrutura Completa do Workflow

```
1. Webhook
   └─ Recebe dados do SimulationView.vue
   ↓
2. Set (Preparar Prompt)
   └─ Monta o prompt para a IA
   ↓
3. HTTP Request (Chamar API ZAI)
   └─ Chama GLM-4.5/GLM-4.6
   ↓
4. Set (Processar Resposta)
   └─ Extrai resposta da IA
   ↓
5. Code (Parsear JSON)
   └─ Converte resposta em JSON estruturado
   ↓
6. Respond to Webhook
   └─ Retorna resultado
```

---

## 🎨 Melhorias Opcionais

### Adicionar Salvar no Firestore

1. Instale node do Firebase no N8N:
   - Settings → Community Nodes
   - Instale: `@n8n/n8n-nodes-firebase`

2. Adicione node **Firebase** após o Code:
   - **Operation:** Create Document
   - **Collection:** `analises_respostas`
   - **Data:** `{{$json}}`

### Adicionar Envio de Email

1. Configure credenciais do SendGrid no N8N
2. Adicione node **SendGrid** após salvar no Firestore
3. Configure email de feedback

---

## 🔍 Verificar se Está Funcionando

### 1. Ver Logs no N8N

1. Acesse **Executions**
2. Clique em uma execução
3. Veja os dados em cada node

### 2. Ver Logs no Navegador

1. Abra o Console do navegador (F12)
2. Procure por `[N8N_WORKFLOW]`
3. Deve ver: `✅ N8N notificado com sucesso`

### 3. Testar API Direta da ZAI

```bash
curl -X POST https://open.bigmodel.cn/api/paas/v4/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 8a02b7c0d6564feea066b7e897207484.8kwdZuX7C70OLUBC" \
  -d '{
    "model": "glm-4.5",
    "messages": [
      {
        "role": "user",
        "content": "Explique o que é um infarto do miocárdio"
      }
    ],
    "temperature": 0.3,
    "max_tokens": 2048
  }'
```

Se retornar JSON com resposta, a API está funcionando! ✅

---

## 🐛 Troubleshooting

### Problema: Workflow não executa

**Solução:**
- Verifique se o workflow está **Active** (toggle no topo)
- Verifique se o webhook está configurado corretamente
- Veja Executions para erros

### Problema: Erro 401/403 na API da ZAI

**Solução:**
- Verifique se `ZAI_API_KEY` está configurada corretamente no N8N
- Teste a API diretamente via curl (veja acima)
- Verifique se o modelo `glm-4.5` está disponível na sua conta ZAI

### Problema: JSON não parseado

**Solução:**
- Verifique o node Code (parse JSON)
- Veja a resposta bruta no node Set anterior
- Ajuste o prompt para forçar formato JSON

---

## 📚 Documentação Relacionada

- **Workflow Completo:** `docs/EXEMPLO_WORKFLOW_IA_ANALISE_RESPOSTAS.md`
- **Integração Vue:** `docs/INTEGRACAO_N8N_SIMULATIONVIEW.md`
- **Modelos GLM:** `docs/N8N_MODELOS_GLM_ZAI.md`
- **Guia Rápido:** `docs/EXEMPLO_WORKFLOW_GLM_ZAI_DIRETO.md`

---

## ✅ Checklist Rápido

- [ ] N8N rodando em http://localhost:5678
- [ ] Variável `ZAI_API_KEY` configurada no N8N
- [ ] Workflow criado com todos os nodes
- [ ] Webhook ativo e URL copiada
- [ ] Workflow **Active** (toggle verde)
- [ ] Teste via curl funcionando
- [ ] Variáveis `.env` configuradas
- [ ] `SimulationView.vue` já integrado ✅

---

**Última atualização:** 2025-11-03  
**Versão:** 1.0.0

