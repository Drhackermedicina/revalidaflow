# 🔧 Modelos GLM da ZAI no OpenRouter/N8N

## 📋 Modelos Disponíveis

Para usar GLM da ZAI via OpenRouter com ZAI_API_KEY:

### Modelos Principais (OpenRouter)
- **GLM-4.5:** `zhipu-ai/glm-4.5`
- **GLM-4.6:** `zhipu-ai/glm-4.6`
- **GLM-4:** `zhipu-ai/glm-4` (versão base)

### Modelos (API Direta da ZAI)
- **GLM-4.5:** `glm-4.5`
- **GLM-4.6:** `glm-4.6`
- **URL da API:** `https://open.bigmodel.cn/api/paas/v4/chat/completions`

### Verificar Modelos Disponíveis

Para verificar quais modelos estão disponíveis:

1. Acesse: https://openrouter.ai/models
2. Procure por modelos da ZAI
3. Use o identificador exato do modelo

### Testar Modelo

```bash
curl https://openrouter.ai/api/v1/models \
  -H "Authorization: Bearer 8a02b7c0d6564feea066b7e897207484.8kwdZuX7C70OLUBC" \
  | grep -i glm
```

---

## ⚙️ Configuração no N8N

### Node HTTP Request - Configuração Atualizada

**URL:** `https://openrouter.ai/api/v1/chat/completions`

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer {{$env.ZAI_API_KEY}}",
  "HTTP-Referer": "https://revalidaflow.com.br",
  "X-Title": "RevalidaFlow AI Analysis"
}
```

**Body (GLM-4.5 via OpenRouter):**
```json
{
  "model": "zhipu-ai/glm-4.5",
  "messages": [
    {
      "role": "system",
      "content": "Você é um avaliador médico especializado."
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

**Body (GLM-4.6 via OpenRouter):**
```json
{
  "model": "zhipu-ai/glm-4.6",
  "messages": [
    {
      "role": "system",
      "content": "Você é um avaliador médico especializado."
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

## 🔄 Alternar Entre Modelos

### Opção 1: Usar Node Switch

Adicione um node **Switch** antes do HTTP Request para escolher o modelo:

```javascript
// Node Code: Escolher Modelo
const modelos = ['zhipu-ai/glm-4.5', 'zhipu-ai/glm-4.6'];
const modeloEscolhido = modelos[Math.floor(Math.random() * modelos.length)];

return {
  model: modeloEscolhido,
  prompt: $input.item.json.prompt
};
```

### Opção 2: Usar Variável de Ambiente

1. Configure variável no N8N: `GLM_MODEL` = `zhipu-ai/glm-4.5` (OpenRouter) ou `glm-4.5` (API direta)
2. Use no body: `"model": "{{$env.GLM_MODEL}}"`

---

## ✅ Testar Configuração

```bash
# Teste via OpenRouter
curl -X POST https://openrouter.ai/api/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 8a02b7c0d6564feea066b7e897207484.8kwdZuX7C70OLUBC" \
  -d '{
    "model": "zhipu-ai/glm-4.5",
    "messages": [
      {
        "role": "user",
        "content": "Teste"
      }
    ]
  }'

# OU teste via API direta da ZAI
curl -X POST https://open.bigmodel.cn/api/paas/v4/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 8a02b7c0d6564feea066b7e897207484.8kwdZuX7C70OLUBC" \
  -d '{
    "model": "glm-4.5",
    "messages": [
      {
        "role": "user",
        "content": "Teste"
      }
    ]
  }'
```

---

**Última atualização:** 2025-11-03  
**Versão:** 1.0.0

