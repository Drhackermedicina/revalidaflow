# 🔄 Atualizar Chaves de API no N8N

Guia rápido para atualizar as chaves de API do `.env` no N8N após modificações.

---

## 🚀 Atualização Rápida

### Passo 1: Parar o N8N

```bash
docker-compose -f docker-compose.n8n.yml down
```

### Passo 2: Reiniciar o N8N

```bash
docker-compose -f docker-compose.n8n.yml up -d
```

### Passo 3: Verificar

Acesse http://localhost:5678 e teste as chaves em um workflow usando `{{$env.CHAVE_NOME}}`

---

## ✅ Chaves Configuradas

Após reiniciar, as seguintes chaves estarão disponíveis:

- `{{$env.GOOGLE_API_KEY_1}}`
- `{{$env.GOOGLE_API_KEY_2}}`
- `{{$env.VITE_GOOGLE_API_KEY_1}}`
- `{{$env.VITE_GOOGLE_API_KEY_2}}`
- `{{$env.VITE_GOOGLE_API_KEY_3}}`
- `{{$env.VITE_GOOGLE_API_KEY_6}}`
- `{{$env.ZAI_API_KEY}}`
- `{{$env.VITE_ZAI_API_KEY}}`

---

## 🔍 Verificar Chaves Disponíveis

### Via N8N (Node Code)

```javascript
// Listar todas as chaves API disponíveis
const apiKeys = Object.keys($env).filter(key => 
  key.includes('API_KEY') || key.includes('ZAI')
);

const result = {};
apiKeys.forEach(key => {
  const value = $env[key];
  result[key] = value ? '✅ Configurada (' + value.substring(0, 10) + '...)' : '❌ Não encontrada';
});

return [{ json: { chaves: result } }];
```

### Via Docker

```bash
# Ver todas as variáveis de ambiente do N8N
docker exec n8n-local env | grep API_KEY
```

---

## 📝 Notas

- **Chaves são carregadas do `docker-compose.n8n.yml`**
- **Após editar `.env`, atualize também o `docker-compose.n8n.yml`**
- **Reinicie o N8N após alterações no `docker-compose.n8n.yml`**

---

**Última atualização:** 2025-11-03








