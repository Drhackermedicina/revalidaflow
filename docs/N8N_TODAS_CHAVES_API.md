# 🔑 N8N - Usando Todas as Chaves de API do .env

Guia completo sobre como usar todas as chaves de API disponíveis no arquivo `.env` dentro do N8N.

---

## 📊 Chaves Disponíveis no N8N

Todas as seguintes chaves estão disponíveis como variáveis de ambiente no N8N:

### 🔵 Google Gemini (Backend)
- `GOOGLE_API_KEY_1`
- `GOOGLE_API_KEY_2`

### 🟢 Google Gemini (Frontend - também disponíveis)
- `VITE_GOOGLE_API_KEY_1`
- `VITE_GOOGLE_API_KEY_2`
- `VITE_GOOGLE_API_KEY_3`
- `VITE_GOOGLE_API_KEY_6`

### 🔴 ZAI (Zhipu AI - GLM-4.5/GLM-4.6)
- `ZAI_API_KEY`
- `VITE_ZAI_API_KEY`

---

## 🚀 Como Usar no N8N

### Opção 1: Variáveis de Ambiente (Recomendado)

As chaves já estão configuradas no `docker-compose.n8n.yml` e são automaticamente disponibilizadas no N8N como variáveis de ambiente.

**No N8N, use assim:**
```
{{$env.GOOGLE_API_KEY_1}}
{{$env.GOOGLE_API_KEY_2}}
{{$env.VITE_GOOGLE_API_KEY_1}}
{{$env.VITE_GOOGLE_API_KEY_2}}
{{$env.VITE_GOOGLE_API_KEY_3}}
{{$env.VITE_GOOGLE_API_KEY_6}}
{{$env.ZAI_API_KEY}}
{{$env.VITE_ZAI_API_KEY}}
```

### Opção 2: Configurar Manualmente no N8N (Alternativa)

Se preferir configurar manualmente:

1. **Acesse o N8N:**
   - Abra: http://localhost:5678
   - Login: `admin` / `admin`

2. **Configure as Variáveis:**
   - Clique em **Settings** (⚙️) no menu lateral
   - Clique em **Variables**
   - Clique em **+ Add Variable** para cada chave:
   
   | Key | Value |
   |-----|-------|
   | `GOOGLE_API_KEY_1` | `AIzaSyB6Lj_5p11hJKbZAnb3oRK5h3lxgVZIl8U` |
   | `GOOGLE_API_KEY_2` | `AIzaSyAlvMR2zOJDZbwBBpP0sl1JHp2fb9uQiy4` |
   | `VITE_GOOGLE_API_KEY_1` | `AIzaSyB6Lj_5p11hJKbZAnb3oRK5h3lxgVZIl8U` |
   | `VITE_GOOGLE_API_KEY_2` | `AIzaSyAlvMR2zOJDZbwBBpP0sl1JHp2fb9uQiy4` |
   | `VITE_GOOGLE_API_KEY_3` | `AIzaSyB7Pm5fFzuSxxLI4ogBgJoUxukDW-wCP4g` |
   | `VITE_GOOGLE_API_KEY_6` | `AIzaSyDAbZJiK4EaTJkMfl3D0kreBPxFuoEuAUY` |
   | `ZAI_API_KEY` | `8a02b7c0d6564feea066b7e897207484.8kwdZuX7C70OLUBC` |
   | `VITE_ZAI_API_KEY` | `8a02b7c0d6564feea066b7e897207484.8kwdZuX7C70OLUBC` |

---

## 💡 Exemplos de Uso

### Exemplo 1: Usar Gemini com Fallback de Chaves

**Node: HTTP Request**
```json
{
  "url": "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
  "method": "POST",
  "headers": {
    "Content-Type": "application/json",
    "x-goog-api-key": "{{$env.GOOGLE_API_KEY_1}}"
  },
  "body": {
    "contents": [{
      "parts": [{"text": "{{$json.prompt}}"}]
    }]
  }
}
```

**Com Fallback:**
Use um node **Switch** ou **IF** para tentar outras chaves se a primeira falhar:

```javascript
// Node: Code (para selecionar chave com fallback)
const keys = [
  $env.GOOGLE_API_KEY_1,
  $env.GOOGLE_API_KEY_2,
  $env.VITE_GOOGLE_API_KEY_3,
  $env.VITE_GOOGLE_API_KEY_6
];

const selectedKey = keys[Math.floor(Math.random() * keys.length)]; // Rotação aleatória
// ou
const selectedKey = keys[$runIndex % keys.length]; // Rotação sequencial

return [{ json: { apiKey: selectedKey } }];
```

### Exemplo 2: Usar ZAI API (GLM-4.5/GLM-4.6)

**Node: HTTP Request**
```json
{
  "url": "https://open.bigmodel.cn/api/paas/v4/chat/completions",
  "method": "POST",
  "headers": {
    "Content-Type": "application/json",
    "Authorization": "Bearer {{$env.ZAI_API_KEY}}"
  },
  "body": {
    "model": "glm-4.5",
    "messages": [
      {
        "role": "user",
        "content": "{{$json.prompt}}"
      }
    ]
  }
}
```

### Exemplo 3: Workflow com Múltiplas Chaves (Load Balancing)

Crie um workflow que tenta diferentes chaves em sequência:

1. **Node: Webhook** - Recebe a requisição
2. **Node: Code** - Seleciona uma chave (rotação ou aleatória)
3. **Node: HTTP Request** - Tenta com a primeira chave
4. **Node: IF** - Verifica se sucesso
   - Se sucesso: retorna resultado
   - Se erro: tenta próxima chave
5. **Node: HTTP Request** - Tenta com segunda chave
6. **Node: IF** - Verifica se sucesso
   - ... e assim por diante até usar todas as chaves

---

## 🔄 Sistema de Fallback Recomendado

Para workflows robustos, implemente fallback automático:

### Workflow com Fallback Automático

```javascript
// Node 1: Code - Preparar lista de chaves
const apiKeys = [
  { key: $env.GOOGLE_API_KEY_1, name: 'GOOGLE_API_KEY_1' },
  { key: $env.GOOGLE_API_KEY_2, name: 'GOOGLE_API_KEY_2' },
  { key: $env.VITE_GOOGLE_API_KEY_3, name: 'VITE_GOOGLE_API_KEY_3' },
  { key: $env.VITE_GOOGLE_API_KEY_6, name: 'VITE_GOOGLE_API_KEY_6' }
];

return [{
  json: {
    apiKeys: apiKeys,
    currentIndex: 0,
    prompt: $json.prompt
  }
}];
```

```javascript
// Node 2: Loop - Tentar cada chave
const currentIndex = $json.currentIndex;
const apiKeys = $json.apiKeys;
const prompt = $json.prompt;

if (currentIndex >= apiKeys.length) {
  // Todas as chaves falharam
  return [{
    json: {
      success: false,
      error: 'Todas as chaves API falharam'
    }
  }];
}

const currentKey = apiKeys[currentIndex];

// Próximo node será HTTP Request usando currentKey.key
return [{
  json: {
    apiKey: currentKey.key,
    apiKeyName: currentKey.name,
    prompt: prompt,
    nextIndex: currentIndex + 1
  }
}];
```

---

## 📝 Boas Práticas

### ✅ Recomendações

1. **Use ZAI como Fallback Principal:**
   - Tente Gemini primeiro
   - Se falhar, use ZAI (GLM-4.5/GLM-4.6)

2. **Rotação de Chaves:**
   - Distribua carga entre chaves
   - Evite usar sempre a mesma chave

3. **Monitoramento:**
   - Registre qual chave foi usada
   - Monitore falhas por chave

4. **Tratamento de Erros:**
   - Implemente fallback automático
   - Retorne mensagem clara em caso de falha

### ❌ Evite

- Expor chaves diretamente no código do workflow
- Usar apenas uma chave (sem fallback)
- Ignorar erros de quota/excesso

---

## 🔍 Verificar Chaves Disponíveis

### Via N8N UI

1. Acesse: http://localhost:5678
2. Crie um novo workflow
3. Adicione um node **Code**
4. Execute:

```javascript
// Listar todas as chaves disponíveis
const envVars = Object.keys($env).filter(key => 
  key.includes('API_KEY') || key.includes('ZAI')
);

const keys = {};
envVars.forEach(key => {
  keys[key] = $env[key] ? '✅ Configurada' : '❌ Não encontrada';
});

return [{ json: { keys: keys } }];
```

### Via Docker

```bash
# Verificar variáveis no container
docker exec n8n-local env | grep API_KEY
```

---

## 🛠️ Atualizar Chaves

Se adicionar novas chaves no `.env`:

1. **Atualize `docker-compose.n8n.yml`:**
   ```yaml
   environment:
     - GOOGLE_API_KEY_NOVO=valor
   ```

2. **Reinicie o N8N:**
   ```bash
   docker-compose -f docker-compose.n8n.yml down
   docker-compose -f docker-compose.n8n.yml up -d
   ```

3. **Verifique no N8N:**
   - Use `{{$env.GOOGLE_API_KEY_NOVO}}` no workflow

---

## 📚 Referências

- **Documentação N8N:** https://docs.n8n.io/integrations/environment-variables/
- **Google Gemini API:** https://ai.google.dev/docs
- **ZAI API:** https://open.bigmodel.cn/doc/api
- **Docker Compose N8N:** `docker-compose.n8n.yml`

---

**Última atualização:** 2025-11-03  
**Versão:** 1.0.0








