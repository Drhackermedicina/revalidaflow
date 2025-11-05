# 🔄 Workflow N8N com Fallback de Múltiplas Chaves Gemini

Este documento descreve como configurar o workflow N8N para análise de respostas usando **GLM-4.5/GLM-4.6 da ZAI** como principal e **Gemini 2.0 Flash** como fallback, com múltiplas chaves de API.

---

## 🎯 Objetivo

Criar workflow que:
1. Tenta usar **GLM-4.5/GLM-4.6 da ZAI** primeiro (API Direta)
2. Se falhar, usa **Gemini 2.0 Flash** com fallback de múltiplas chaves
3. Garante análise mesmo se uma API falhar

---

## 📋 Pré-requisitos

- ✅ N8N rodando em http://localhost:5678
- ✅ Chaves Gemini válidas no .env (já testadas e validadas):
  - `GOOGLE_API_KEY_1`
  - `GOOGLE_API_KEY_2`
  - `VITE_GOOGLE_API_KEY_1`
  - `VITE_GOOGLE_API_KEY_2`
  - `VITE_GOOGLE_API_KEY_3`
  - `VITE_GOOGLE_API_KEY_6`
- ✅ `ZAI_API_KEY` configurada no N8N

---

## 🔧 Estrutura do Workflow

```
1. Webhook (Receber dados)
   ↓
2. Set (Preparar Prompt)
   ↓
3. Switch (Decidir qual API usar)
   ├─ Branch 1: Tentar ZAI (GLM-4.5)
   │   ↓
   │   3a. HTTP Request (API ZAI)
   │   ↓
   │   3b. IF (Sucesso?)
   │       ├─ Sim → Continuar
   │       └─ Não → Tentar Gemini
   │
   └─ Branch 2: Fallback Gemini (se ZAI falhar)
       ↓
       4a. HTTP Request (Gemini com Chave 1)
       ↓
       4b. IF (Sucesso?)
           ├─ Sim → Continuar
           └─ Não → Tentar Chave 2
               ↓
               4c. HTTP Request (Gemini com Chave 2)
               ↓
               (repetir para todas as chaves válidas)
   ↓
5. Set (Processar Resposta)
   ↓
6. Code (Parsear JSON)
   ↓
7. Respond to Webhook
```

---

## 📝 Configuração Passo a Passo

### Node 1: Webhook

**Configuração:**
- **Name:** `Webhook - Análise de Resposta`
- **HTTP Method:** POST
- **Path:** `/webhook/analisar-resposta`
- **Response Mode:** `Response Node`
- **Response Code:** 200

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
  "conversationHistory": "{{$json.conversationHistory}}",
  "prompt": "Você é um avaliador médico especializado em exames clínicos OSCE para o REVALIDA (Exame de Revalidação de Diploma Médico no Brasil).\n\nCONTEXTO DA ESTAÇÃO:\nTítulo: {{$json.pergunta}}\n\nGABARITO ESPERADO (Critérios do PEP):\n{{$json.gabarito}}\n\nRESPOSTA DO CANDIDATO:\n{{$json.respostaUsuario}}\n\nHISTÓRICO DA CONVERSAÇÃO (se disponível):\n{{#if $json.conversationHistory}}{{#each $json.conversationHistory}}{{this.role}}: {{this.content}}\n{{/each}}{{/if}}\n\nINSTRUÇÕES DE ANÁLISE:\nAnalise a resposta do candidato considerando:\n1. Correção técnica (acurácia médica)\n2. Completude da resposta (todos os pontos do gabarito cobertos)\n3. Relevância clínica (aplicabilidade prática)\n4. Organização e estrutura\n5. Comunicação efetiva\n6. Segurança do paciente\n7. Protocolos brasileiros de saúde\n\nFORMATO DE RESPOSTA (JSON OBRIGATÓRIO):\n{\n  \"pontuacao\": número de 0 a 100,\n  \"feedback\": \"texto detalhado do feedback construtivo\",\n  \"pontosFortes\": [\"item1\", \"item2\", \"item3\"],\n  \"pontosMelhorar\": [\"item1\", \"item2\", \"item3\"],\n  \"sugestoes\": [\"item1\", \"item2\", \"item3\"],\n  \"analiseDetalhada\": \"análise mais profunda de cada aspecto avaliado\"\n}\n\nIMPORTANTE: Retorne APENAS JSON válido, sem texto adicional."
}
```

---

### Node 3a: HTTP Request (Tentar ZAI - GLM-4.5)

**Configuração:**
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
        "content": "Você é um avaliador médico especializado em exames clínicos OSCE para o REVALIDA. Analise respostas de simulações clínicas e forneça feedback detalhado e construtivo. Retorne APENAS JSON válido."
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

---

### Node 3b: IF (Verificar Sucesso da ZAI)

**Configuração:**
- **Condition:** `{{$json.choices}}` exists AND `{{$json.choices[0].message.content}}` exists
- **True Output:** Continuar com resposta da ZAI
- **False Output:** Tentar Gemini

---

### Node 4a: HTTP Request (Gemini - Chave 1)

**Configuração:**
- **Method:** POST
- **URL:** `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key={{$env.GOOGLE_API_KEY_1}}`
- **Headers:**
  ```json
  {
    "Content-Type": "application/json"
  }
  ```
- **Body:**
  ```json
  {
    "contents": [
      {
        "parts": [
          {
            "text": "{{$('Set').item.json.prompt}}\n\nIMPORTANTE: Retorne APENAS JSON válido no formato:\n{\n  \"pontuacao\": número de 0 a 100,\n  \"feedback\": \"texto detalhado\",\n  \"pontosFortes\": [\"item1\", \"item2\"],\n  \"pontosMelhorar\": [\"item1\", \"item2\"],\n  \"sugestoes\": [\"item1\", \"item2\"],\n  \"analiseDetalhada\": \"análise detalhada\"\n}\nSem texto adicional, apenas JSON."
          }
        ]
      }
    ],
    "generationConfig": {
      "temperature": 0.3,
      "maxOutputTokens": 2048,
      "responseMimeType": "application/json"
    }
  }
  ```

**⚠️ Importante:** Configure `GOOGLE_API_KEY_1` como variável no N8N (Settings → Variables)

---

### Node 4b: IF (Verificar Sucesso Gemini Chave 1)

**Configuração:**
- **Condition:** `{{$json.candidates}}` exists AND `{{$json.candidates[0].content.parts[0].text}}` exists
- **True Output:** Continuar com resposta Gemini
- **False Output:** Tentar próxima chave

---

### Node 4c: HTTP Request (Gemini - Chave 2)

**Configuração:**
Igual ao Node 4a, mas usando `{{$env.GOOGLE_API_KEY_2}}`

---

### Node 4d: HTTP Request (Gemini - Chave 3)

**Configuração:**
Igual ao Node 4a, mas usando `{{$env.VITE_GOOGLE_API_KEY_1}}`

**Nota:** Repita para todas as chaves válidas:
- `GOOGLE_API_KEY_1`
- `GOOGLE_API_KEY_2`
- `VITE_GOOGLE_API_KEY_1`
- `VITE_GOOGLE_API_KEY_2`
- `VITE_GOOGLE_API_KEY_3`
- `VITE_GOOGLE_API_KEY_6`

---

### Node 5: Set (Normalizar Resposta)

**Configuração:**
- **Mode:** Manual
- **Values:**

```json
{
  "userId": "{{$('Set').item.json.userId}}",
  "estacaoId": "{{$('Set').item.json.estacaoId}}",
  "respostaIA": "{{$json.choices?.[0]?.message?.content || $json.candidates?.[0]?.content?.parts?.[0]?.text || 'Erro: resposta vazia'}}",
  "fonte": "{{$json.choices ? 'ZAI_GLM-4.5' : 'Gemini_2.0-Flash'}}",
  "chaveUsada": "{{$json.choices ? 'ZAI_API_KEY' : ($env.GOOGLE_API_KEY_1 || 'N/A')}}",
  "timestamp": "{{$now}}"
}
```

---

### Node 6: Code (Parsear JSON)

**Configuração:**
- **Language:** JavaScript
- **Code:**

```javascript
const respostaTexto = $input.item.json.respostaIA;
const fonte = $input.item.json.fonte;

try {
  // Tentar parsear diretamente
  const analise = JSON.parse(respostaTexto);
  
  return {
    ...analise,
    userId: $('Set').item.json.userId,
    estacaoId: $('Set').item.json.estacaoId,
    timestamp: new Date().toISOString(),
    modeloIA: fonte,
    chaveUsada: $input.item.json.chaveUsada
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
        modeloIA: fonte,
        chaveUsada: $input.item.json.chaveUsada
      };
    } catch (parseError) {
      return {
        erro: 'Erro ao parsear JSON',
        respostaBruta: respostaTexto,
        modeloIA: fonte,
        chaveUsada: $input.item.json.chaveUsada
      };
    }
  }
  
  return {
    erro: 'JSON não encontrado na resposta',
    respostaBruta: respostaTexto,
    modeloIA: fonte,
    chaveUsada: $input.item.json.chaveUsada
  };
}
```

---

### Node 7: Respond to Webhook

**Configuração:**
- **Respond With:** JSON
- **Response Body:** `{{$json}}`

---

## 🔑 Configurar Variáveis no N8N

1. Acesse N8N → **Settings** → **Variables**
2. Adicione as seguintes variáveis:

| Variável | Valor |
|----------|-------|
| `ZAI_API_KEY` | `8a02b7c0d6564feea066b7e897207484.8kwdZuX7C70OLUBC` |
| `GOOGLE_API_KEY_1` | `AIzaSyB6Lj_5p11hJKbZAnb3oRK5h3lxgVZIl8U` |
| `GOOGLE_API_KEY_2` | `AIzaSyAlvMR2zOJDZbwBBpP0sl1JHp2fb9uQiy4` |
| `VITE_GOOGLE_API_KEY_1` | `AIzaSyB6Lj_5p11hJKbZAnb3oRK5h3lxgVZIl8U` |
| `VITE_GOOGLE_API_KEY_2` | `AIzaSyAlvMR2zOJDZbwBBpP0sl1JHp2fb9uQiy4` |
| `VITE_GOOGLE_API_KEY_3` | `AIzaSyB7Pm5fFzuSxxLI4ogBgJoUxukDW-wCP4g` |
| `VITE_GOOGLE_API_KEY_6` | `AIzaSyDAbZJiK4EaTJkMfl3D0kreBPxFuoEuAUY` |

**⚠️ Nota:** As chaves `VITE_GOOGLE_API_KEY_*` têm os mesmos valores que `GOOGLE_API_KEY_*` correspondentes. No N8N, use qualquer um deles.

---

## 🎯 Ordem de Prioridade

1. **Primeiro:** ZAI (GLM-4.5) - API Direta
2. **Fallback 1:** Gemini com `GOOGLE_API_KEY_1`
3. **Fallback 2:** Gemini com `GOOGLE_API_KEY_2`
4. **Fallback 3:** Gemini com `VITE_GOOGLE_API_KEY_1`
5. **Fallback 4:** Gemini com `VITE_GOOGLE_API_KEY_2`
6. **Fallback 5:** Gemini com `VITE_GOOGLE_API_KEY_3`
7. **Fallback 6:** Gemini com `VITE_GOOGLE_API_KEY_6`

---

## 📊 Benefícios

✅ **Alta Disponibilidade:** Se ZAI falhar, usa Gemini
✅ **Múltiplas Chaves:** Se uma chave Gemini falhar, tenta próxima
✅ **Redundância:** Sistema robusto com múltiplos fallbacks
✅ **Monitoramento:** Logs indicam qual API/chave foi usada

---

## 🐛 Troubleshooting

### Problema: Todas as APIs falham

**Solução:**
- Verifique variáveis no N8N (Settings → Variables)
- Teste cada chave individualmente
- Verifique logs no N8N (Executions)

### Problema: Gemini retorna erro 429 (Quota)

**Solução:**
- Essa chave será pulada automaticamente
- Workflow tentará próxima chave
- Aguarde reset da quota (diário)

### Problema: JSON não parseado

**Solução:**
- Verifique node Code (parse JSON)
- Veja resposta bruta no node Set anterior
- Ajuste prompt para forçar formato JSON

---

## 📚 Documentação Relacionada

- **Como Usar Workflow:** `docs/COMO_USAR_WORKFLOW_N8N.md`
- **Exemplo Completo:** `docs/EXEMPLO_WORKFLOW_IA_ANALISE_RESPOSTAS.md`
- **Modelos GLM:** `docs/N8N_MODELOS_GLM_ZAI.md`
- **Limpeza de Chaves:** `docs/RESUMO_LIMPEZA_CHAVES_GEMINI.md`

---

**Última atualização:** 2025-11-03  
**Versão:** 1.0.0



