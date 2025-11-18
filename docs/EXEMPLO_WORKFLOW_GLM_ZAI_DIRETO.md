# 🚀 Workflow N8N com API Direta da ZAI (GLM-4.5/GLM-4.6)

Configuração simplificada para usar a **API Direta da ZAI** com GLM-4.5 ou GLM-4.6 no N8N.

## 🎯 Configuração Rápida

### Passo 1: Configurar Variável no N8N

1. Acesse **Settings** → **Variables**
2. Adicione:
   - **Name:** `ZAI_API_KEY`
   - **Value:** `8a02b7c0d6564feea066b7e897207484.8kwdZuX7C70OLUBC`

### Passo 2: Criar Node HTTP Request

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

### Passo 3: Processar Resposta

**Node Set (Processar Resposta):**
```json
{
  "userId": "{{$('Set').item.json.userId}}",
  "estacaoId": "{{$('Set').item.json.estacaoId}}",
  "respostaIA": "{{$json.choices[0].message.content}}",
  "timestamp": "{{$now}}"
}
```

### Passo 4: Parsear JSON (Opcional)

**Node Code:**
```javascript
const respostaTexto = $input.item.json.respostaIA;

try {
  const analise = JSON.parse(respostaTexto);
  return {
    ...analise,
    userId: $('Set').item.json.userId,
    estacaoId: $('Set').item.json.estacaoId,
    timestamp: new Date().toISOString(),
    modeloIA: 'glm-4.5'
  };
} catch (e) {
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

## ✅ Testar API Direta

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

## 🔧 Modelos Disponíveis

- **GLM-4.5:** `glm-4.5`
- **GLM-4.6:** `glm-4.6`
- **GLM-4:** `glm-4` (versão base)

## 🔍 Troubleshooting

### Erro 401/403
- Verifique se a ZAI_API_KEY está correta
- Verifique créditos na conta ZAI
- Teste a API diretamente via curl

### Modelo não encontrado
- Verifique se `glm-4.5` ou `glm-4.6` está disponível na sua conta
- Tente usar `glm-4` como alternativa

---

**Última atualização:** 2025-11-03  
**Versão:** 1.0.0







