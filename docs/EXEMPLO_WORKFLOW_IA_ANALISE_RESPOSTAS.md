# 🤖 Exemplo: Workflow N8N com IA para Análise de Respostas

Este é um exemplo prático e completo de como criar um workflow no N8N que usa **GLM-4.5 ou GLM-4.6 via OpenRouter (ZAI_API_KEY)** para analisar automaticamente respostas de simulações clínicas no REVALIDAFLOW.

## 🎯 Objetivo

Quando um usuário completa uma simulação:
1. Capturar resposta e gabarito
2. Usar IA (Gemini) para analisar
3. Gerar feedback automático
4. Salvar análise no Firestore
5. Enviar feedback ao usuário

---

## 📋 Pré-requisitos

1. ✅ N8N rodando (já configurado)
2. ✅ ZAI_API_KEY configurada (OpenRouter - já tem no projeto!)
   - Valor: `8a02b7c0d6564feea066b7e897207484.8kwdZuX7C70OLUBC`
3. ⚠️ Node do Firebase instalado no N8N (opcional)
4. ⚠️ Credenciais do SendGrid (opcional para emails)

**Nota:** Este workflow usa OpenRouter (via ZAI_API_KEY) com GLM-4.5 ou GLM-4.6 da ZAI para análise de respostas.

---

## 🚀 Passo 1: Criar Workflow no N8N

### Estrutura do Workflow

```
1. Webhook (Receber dados da simulação)
   ↓
2. Set (Preparar prompt para IA)
   ↓
3. HTTP Request (Chamar Google Gemini)
   ↓
4. Set (Processar resposta da IA)
   ↓
5. Firebase (Salvar análise)
   ↓
6. SendGrid (Enviar feedback ao usuário)
```

---

## 📝 Passo 2: Configurar Cada Node

### Node 1: Webhook

**Configuração:**
- **Name:** `Webhook - Análise de Resposta`
- **HTTP Method:** POST
- **Path:** `/webhook/analisar-resposta`
- **Response Mode:** `Response Node`
- **Response Code:** 200

**Salvar URL:** `http://localhost:5678/webhook/analisar-resposta`

---

### Node 2: Set (Preparar Prompt)

**Configuração:**
- **Mode:** Manual
- **Values:**
  ```json
  {
    "userId": "{{$json.userId}}",
    "estacaoId": "{{$json.estacaoId}}",
    "pergunta": "{{$json.pergunta}}",
    "respostaUsuario": "{{$json.respostaUsuario}}",
    "gabarito": "{{$json.gabarito}}",
    "prompt": "Você é um avaliador médico especializado em exames clínicos OSCE (Objective Structured Clinical Examination) para o REVALIDA (Exame de Revalidação de Diploma Médico no Brasil).\n\nCONTEXTO DA ESTAÇÃO:\nTítulo: {{$json.pergunta}}\n\nGABARITO ESPERADO (Critérios do PEP):\n{{$json.gabarito}}\n\nRESPOSTA DO CANDIDATO:\n{{$json.respostaUsuario}}\n\nHISTÓRICO DA CONVERSAÇÃO (se disponível):\n{{#if $json.conversationHistory}}{{#each $json.conversationHistory}}{{this.role}}: {{this.content}}\n{{/each}}{{/if}}\n\nINSTRUÇÕES DE ANÁLISE:\nAnalise a resposta do candidato considerando:\n1. Correção técnica (acurácia médica)\n2. Completude da resposta (todos os pontos do gabarito cobertos)\n3. Relevância clínica (aplicabilidade prática)\n4. Organização e estrutura\n5. Comunicação efetiva\n6. Segurança do paciente\n7. Protocolos brasileiros de saúde\n\nFORMATO DE RESPOSTA (JSON OBRIGATÓRIO):\n{\n  \"pontuacao\": número de 0 a 100,\n  \"feedback\": \"texto detalhado do feedback construtivo\",\n  \"pontosFortes\": [\"item1\", \"item2\", \"item3\"],\n  \"pontosMelhorar\": [\"item1\", \"item2\", \"item3\"],\n  \"sugestoes\": [\"item1\", \"item2\", \"item3\"],\n  \"analiseDetalhada\": \"análise mais profunda de cada aspecto avaliado\"\n}\n\nIMPORTANTE: Retorne APENAS JSON válido, sem texto adicional."
  }
  ```

---

### Node 3: HTTP Request (Chamar API Direta da ZAI com GLM-4.5 ou GLM-4.6)

**Configuração Completa:**
- **Method:** POST
- **URL:** `https://open.bigmodel.cn/api/paas/v4/chat/completions`
- **Headers:**
  ```json
  {
    "Content-Type": "application/json",
    "Authorization": "Bearer {{$env.ZAI_API_KEY}}"
  }
  ```
- **Body:**
  ```json
  {
    "model": "glm-4.5",
    "messages": [
      {
        "role": "system",
        "content": "Você é um avaliador médico especializado em exames clínicos. Analise respostas de simulações clínicas e forneça feedback detalhado e construtivo."
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

**⚠️ Importante:** 
- Configure `ZAI_API_KEY` como variável de ambiente no N8N (Settings → Variables)
- Valor: `8a02b7c0d6564feea066b7e897207484.8kwdZuX7C70OLUBC`
- **Modelo:** Use `glm-4.5` ou `glm-4.6`
- **URL da API:** `https://open.bigmodel.cn/api/paas/v4/chat/completions`
- **Documentação ZAI:** Verifique a documentação oficial da ZAI para modelos disponíveis

**Nota:** Esta configuração usa a API Direta da ZAI. Para usar via OpenRouter (alternativa), veja `docs/N8N_MODELOS_GLM_ZAI.md`.

---

### Node 4: Set (Processar Resposta da IA)

**Configuração:**
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

**Opcional:** Adicionar node **Code** para parsear JSON da resposta (OpenRouter retorna JSON diretamente):

```javascript
// OpenRouter já retorna JSON quando response_format é json_object
const respostaTexto = $input.item.json.respostaIA;

try {
  // Tentar parsear diretamente (OpenRouter retorna JSON estruturado)
  const analise = JSON.parse(respostaTexto);
  
  return {
    ...analise,
        userId: $('Set').item.json.userId,
        estacaoId: $('Set').item.json.estacaoId,
        timestamp: new Date().toISOString(),
        modeloIA: 'glm-4.5' // ou 'glm-4.6'
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
        modeloIA: 'glm-4.5' // ou 'glm-4.6'
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

---

### Node 5: Firebase (Salvar Análise)

**Configuração:**
- **Operation:** Create Document
- **Collection:** `analises_respostas`
- **Data:**
  ```json
  {
    "userId": "{{$json.userId}}",
    "estacaoId": "{{$json.estacaoId}}",
    "pontuacao": "{{$json.pontuacao}}",
    "feedback": "{{$json.feedback}}",
    "pontosFortes": "{{$json.pontosFortes}}",
    "pontosMelhorar": "{{$json.pontosMelhorar}}",
    "sugestoes": "{{$json.sugestoes}}",
    "timestamp": "{{$json.timestamp}}",
    "modeloIA": "glm-4.5"
  }
  ```

---

### Node 6: SendGrid (Enviar Feedback)

**Configuração:**
- **From Email:** `noreply@revalidaflow.com.br`
- **To Email:** `{{$('Firebase - Buscar Usuario').item.json.email}}`
- **Subject:** `Seu feedback da simulação clínica`
- **Email Type:** HTML
- **Content:**
  ```html
  <h1>Feedback da sua Simulação 🏥</h1>
  <h2>Pontuação: {{$json.pontuacao}}/100</h2>
  
  <h3>📝 Feedback</h3>
  <p>{{$json.feedback}}</p>
  
  <h3>✅ Pontos Fortes</h3>
  <ul>
    {{#each $json.pontosFortes}}
    <li>{{this}}</li>
    {{/each}}
  </ul>
  
  <h3>🔧 Pontos a Melhorar</h3>
  <ul>
    {{#each $json.pontosMelhorar}}
    <li>{{this}}</li>
    {{/each}}
  </ul>
  
  <h3>💡 Sugestões</h3>
  <ul>
    {{#each $json.sugestoes}}
    <li>{{this}}</li>
    {{/each}}
  </ul>
  
  <p>Equipe RevalidaFlow</p>
  ```

---

## 🔧 Passo 3: Integrar com Backend

### Atualizar Backend para Notificar N8N

Adicione no `backend/routes/descriptiveQuestions.js` ou onde processa respostas:

```javascript
// Após processar resposta
router.post('/submit-answer', async (req, res) => {
  try {
    // ... processar resposta normalmente ...
    
    // Notificar N8N para análise com IA (assíncrono)
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/analisar-resposta';
    
    fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: req.user.uid,
        estacaoId: req.body.estacaoId,
        pergunta: questaoData.pergunta,
        respostaUsuario: req.body.resposta,
        gabarito: questaoData.gabarito
      })
    }).catch(err => {
      logger.warn('Erro ao notificar N8N para análise IA', { error: err.message });
    });
    
    res.status(200).json({ success: true });
  } catch (error) {
    // ...
  }
});
```

---

## ✅ Passo 4: Testar Workflow

### Testar Localmente

```bash
curl -X POST http://localhost:5678/webhook/analisar-resposta \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "abc123",
    "estacaoId": "est001",
    "pergunta": "Quais são os sintomas de infarto agudo do miocárdio?",
    "respostaUsuario": "Dor no peito, falta de ar, sudorese",
    "gabarito": "Dor precordial em aperto, irradiação para braço esquerdo, dispneia, diaforese, náuseas, palpitações"
  }'
```

### Verificar Execução

1. Acesse N8N → **Executions**
2. Veja histórico de execuções
3. Revise resposta da IA
4. Verifique se salvou no Firestore

---

## 🎨 Melhorias Opcionais

### 1. Usar Múltiplas Chaves (Load Balancing)

Adicione node **Switch** antes do HTTP Request para escolher chave aleatoriamente:

```javascript
// Node Code: Escolher Chave Aleatória
const chaves = [
  'AIzaSyB6Lj_5p11hJKbZAnb3oRK5h3lxgVZIl8U',
  'AIzaSyAlvMR2zOJDZbwBBpP0sl1JHp2fb9uQiy4',
  'AIzaSyB7Pm5fFzuSxxLI4ogBgJoUxukDW-wCP4g'
  // ... outras chaves
];

const chaveEscolhida = chaves[Math.floor(Math.random() * chaves.length)];

return {
  apiKey: chaveEscolhida,
  prompt: $input.item.json.prompt
};
```

### 2. Cache de Análises Similares

Adicione node **Firebase Query** antes da IA para verificar se já existe análise similar.

### 3. Retry Logic

Configure retry no node HTTP Request para casos de falha da API.

---

## 🔍 Troubleshooting

### Problema: API da ZAI retorna erro 401/403

**Solução:**
- Verifique se a ZAI_API_KEY está correta
- Verifique se a API key tem créditos disponíveis
- Verifique se o modelo `glm-4.5` ou `glm-4.6` está disponível na sua conta ZAI
- Teste a API diretamente:
  ```bash
  curl -X POST https://open.bigmodel.cn/api/paas/v4/chat/completions \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer 8a02b7c0d6564feea066b7e897207484.8kwdZuX7C70OLUBC" \
    -d '{"model": "glm-4.5", "messages": [{"role": "user", "content": "teste"}]}'
  ```
- Se o modelo não estiver disponível, tente `glm-4` ou verifique a documentação da ZAI
- Verifique uso/créditos na plataforma da ZAI

### Problema: Resposta não é JSON válido

**Solução:**
- Ajuste o prompt para forçar formato JSON
- Use node **Code** para extrair JSON da resposta
- Configure `response_mime_type: "application/json"` (se suportado)

### Problema: Análise demora muito

**Solução:**
- Use modelo mais rápido (`zhipu-ai/glm-4` vs `zhipu-ai/glm-4.5` ou `zhipu-ai/glm-4.6`)
- Reduza `max_tokens` no body
- Configure timeout adequado no node HTTP Request
- Considere usar `google/gemini-2.0-flash-exp` para respostas mais rápidas

---

## 📊 Monitoramento

### Métricas Importantes

1. **Tempo de resposta** da IA
2. **Taxa de sucesso** das análises
3. **Uso de tokens** (monitorar custos)
4. **Qualidade do feedback** gerado

### Alertas

Configure alertas no N8N para:
- Falhas na chamada da API
- Timeouts
- Erros ao salvar no Firestore

---

**Última atualização:** 2025-11-03  
**Versão:** 1.0.0

