# 🧪 Testar N8N Local - Guia Passo a Passo

Guia completo para testar a integração N8N com SimulationView.vue localmente.

---

## ✅ Checklist Pré-Teste

- [ ] N8N está rodando (Docker): `docker ps --filter "name=n8n-local"`
- [ ] N8N acessível: http://localhost:5678
- [ ] Variáveis configuradas no `.env`:
  - [ ] `VITE_N8N_WEBHOOK_URL=http://localhost:5678/webhook/analisar-resposta`
  - [ ] `VITE_N8N_ENABLED=true`
- [ ] Frontend rodando: `npm run dev`

---

## 🚀 Passo 1: Verificar N8N

### 1.1 Verificar se N8N está rodando

```bash
docker ps --filter "name=n8n-local"
```

**Resultado esperado:**
```
n8n-local - Up X minutes (healthy)
```

### 1.2 Acessar N8N

1. Abra navegador: http://localhost:5678
2. Login: `admin` / `admin`
3. Você deve ver o dashboard do N8N

---

## 📝 Passo 2: Criar Workflow no N8N

### 2.1 Criar Novo Workflow

1. No N8N, clique em **+ Add workflow**
2. Nome: `Análise de Respostas - SimulationView`
3. Salve (Ctrl+S ou botão Save)

### 2.2 Criar Node Webhook

1. Clique em **+** para adicionar node
2. Procure por **Webhook**
3. Configure:
   - **HTTP Method:** POST
   - **Path:** `/webhook/analisar-resposta`
   - **Response Mode:** Respond to Webhook
   - **Response Code:** 200
4. Clique em **Listen for Test Event** (o ícone fica verde quando ativo)
5. Copie a URL que aparece: `http://localhost:5678/webhook/analisar-resposta`
6. Salve o node

### 2.3 Criar Node Set (Preparar Dados)

1. Conecte um novo node após o Webhook
2. Procure por **Set**
3. Configure:

**Mode:** Manual

**Values (clique em Add Value para cada):**

| Name | Value |
|------|-------|
| `userId` | `={{$json.userId}}` |
| `estacaoId` | `={{$json.estacaoId}}` |
| `pergunta` | `={{$json.pergunta}}` |
| `respostaUsuario` | `={{$json.respostaUsuario}}` |
| `gabarito` | `={{$json.gabarito}}` |
| `timestamp` | `={{$json.timestamp}}` |

4. Salve o node

### 2.4 Criar Node Respond to Webhook

1. Conecte após o Set
2. Procure por **Respond to Webhook**
3. Configure:

**Respond With:** JSON

**Response Body:**
```json
{
  "success": true,
  "message": "Dados recebidos com sucesso!",
  "data": {
    "userId": "{{$json.userId}}",
    "estacaoId": "{{$json.estacaoId}}",
    "pergunta": "{{$json.pergunta}}"
  },
  "timestamp": "{{$json.timestamp}}"
}
```

4. Salve o node

### 2.5 Ativar Workflow

1. Clique no **toggle** no canto superior direito
2. O workflow deve ficar **ativo** (verde)

**Importante:** Para testar completo com IA, siga `docs/CRIAR_WORKFLOW_N8N_SIMULATIONVIEW.md`

---

## 🧪 Passo 3: Testar Webhook Manualmente

### 3.1 Teste com cURL

Abra terminal e execute:

```bash
curl -X POST http://localhost:5678/webhook/analisar-resposta \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "estacaoId": "est001",
    "pergunta": "Quais são os sintomas de infarto agudo do miocárdio?",
    "respostaUsuario": "O paciente apresenta dor precordial em aperto, falta de ar, sudorese e náuseas.",
    "gabarito": "Dor precordial: Tipicamente em aperto ou queimação\nDispneia: Falta de ar\nDiaforese: Sudorese\nNáuseas e vômitos: Sintomas associados",
    "conversationHistory": [],
    "timestamp": "2025-11-03T14:00:00Z"
  }'
```

**Resultado esperado:**
```json
{
  "success": true,
  "message": "Dados recebidos com sucesso!",
  "data": {
    "userId": "test-user-123",
    "estacaoId": "est001",
    "pergunta": "Quais são os sintomas de infarto agudo do miocárdio?"
  },
  "timestamp": "2025-11-03T14:00:00Z"
}
```

### 3.2 Verificar no N8N

1. No N8N, vá em **Executions** (menu lateral)
2. Você deve ver uma execução nova
3. Clique na execução para ver detalhes
4. Verifique se os dados foram recebidos corretamente

---

## 🧪 Passo 4: Testar do SimulationView.vue

### 4.1 Verificar Configuração

1. Verifique se o `.env` tem:
   ```env
   VITE_N8N_WEBHOOK_URL=http://localhost:5678/webhook/analisar-resposta
   VITE_N8N_ENABLED=true
   ```

2. **Importante:** Reinicie o servidor de desenvolvimento:
   ```bash
   # Pare o servidor (Ctrl+C)
   npm run dev
   ```

### 4.2 Testar no Navegador

1. Abra o app: http://localhost:5173
2. Faça login
3. Inicie uma simulação como **candidato**
4. Complete a simulação
5. Abra o **Console do Navegador** (F12 → Console)
6. Procure por logs:
   - `[N8N_WORKFLOW] 📡 Notificando N8N para análise de resposta...`
   - `[N8N_WORKFLOW] ✅ N8N notificado com sucesso`

### 4.3 Verificar no N8N

1. No N8N, vá em **Executions**
2. Você deve ver uma nova execução
3. Clique para ver os dados recebidos

---

## 🔍 Troubleshooting

### Problema: N8N não está rodando

**Solução:**
```bash
# Iniciar N8N via Docker
docker-compose -f docker-compose.n8n.yml up -d

# Verificar status
docker ps --filter "name=n8n-local"
```

### Problema: "CORS Error" no navegador

**Solução:**
- O N8N local já aceita requisições de qualquer origem
- Se ainda tiver problema, verifique se está usando `http://localhost:5678` (não `127.0.0.1`)

### Problema: "N8N não configurado" no console

**Solução:**
1. Verifique se `.env` tem:
   - `VITE_N8N_WEBHOOK_URL=http://localhost:5678/webhook/analisar-resposta`
   - `VITE_N8N_ENABLED=true`
2. **Reinicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```
3. Verifique se a URL está correta (sem espaços extras)

### Problema: Workflow não executa no N8N

**Soluções:**
1. Verifique se o workflow está **ativo** (toggle verde)
2. Verifique se o webhook está **listening** (ícone verde no node Webhook)
3. Verifique se o path está correto: `/webhook/analisar-resposta`

### Problema: Dados não aparecem no N8N

**Soluções:**
1. Verifique logs do navegador (Console)
2. Verifique se a requisição foi enviada:
   - Abra DevTools → Network
   - Procure por requisição para `localhost:5678`
   - Verifique se o status é `200 OK`
3. Verifique Executions no N8N

---

## 📊 Verificando Logs

### Logs do Navegador

No console do navegador, você deve ver:

```
[N8N_WORKFLOW] 📡 Notificando N8N para análise de resposta... {userId: "...", estacaoId: "...", ...}
[N8N_WORKFLOW] ✅ N8N notificado com sucesso
```

### Logs do N8N

1. No N8N, vá em **Executions**
2. Clique na execução
3. Veja os dados em cada node
4. Verifique se há erros (ícone vermelho)

---

## ✅ Teste Completo

### Cenário de Teste

1. **N8N está rodando** ✅
2. **Workflow criado e ativo** ✅
3. **Variáveis configuradas no .env** ✅
4. **Frontend reiniciado** ✅
5. **Teste manual (cURL) funciona** ✅
6. **Teste do SimulationView.vue funciona** ✅

### Quando o teste é bem-sucedido:

- ✅ Console do navegador mostra: `✅ N8N notificado com sucesso`
- ✅ N8N mostra execução nova em **Executions**
- ✅ Dados aparecem corretamente no workflow

---

## 🎯 Próximos Passos

Depois que o teste básico funcionar:

1. **Adicionar análise por IA:** Siga `docs/CRIAR_WORKFLOW_N8N_SIMULATIONVIEW.md`
2. **Configurar fallback de chaves:** Todas as chaves já estão no Docker
3. **Testar análise completa:** Complete simulação com conversa real

---

## 📚 Referências

- **Criar Workflow Completo:** `docs/CRIAR_WORKFLOW_N8N_SIMULATIONVIEW.md`
- **Workflow Completo:** `docs/WORKFLOW_N8N_SIMULATIONVIEW_COMPLETO.md`
- **Integração:** `docs/INTEGRACAO_N8N_SIMULATIONVIEW.md`

---

**Última atualização:** 2025-11-03  
**Versão:** 1.0.0





