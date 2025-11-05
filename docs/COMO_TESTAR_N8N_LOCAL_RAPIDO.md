# ⚡ Teste Rápido N8N Local - Guia Simplificado

Guia rápido para testar a integração N8N com SimulationView.vue localmente.

---

## ✅ Status Atual

- ✅ **Código está implementado** no `SimulationView.vue`
- ✅ **N8N está rodando** (Docker: `n8n-local`)
- ✅ **Variáveis configuradas** no `.env`
- ✅ **Pronto para testar!**

---

## 🚀 Teste Rápido (3 passos)

### Passo 1: Criar Workflow Mínimo no N8N

1. Acesse: http://localhost:5678
2. Login: `admin` / `admin`
3. Clique em **+ Add workflow**
4. Nome: `Teste SimulationView`

#### Criar Node Webhook:

1. Clique em **+** → Procure por **Webhook**
2. Configure:
   - **HTTP Method:** POST
   - **Path:** `/analisar-resposta` ⚠️ **IMPORTANTE:** Sem o prefixo `/webhook/` (o N8N adiciona automaticamente)
   - **Response Mode:** Respond to Webhook
3. Clique em **Listen for Test Event** (ícone fica verde)
4. Salve (Ctrl+S)

#### Criar Node Respond to Webhook:

1. Conecte após o Webhook
2. Procure por **Respond to Webhook**
3. Configure:
   - **Respond With:** JSON
   - **Response Body:** `{"success": true, "message": "Dados recebidos!", "data": {{$json}}}`

4. **Ative o workflow** (toggle verde no canto superior direito)

---

### Passo 2: Testar Webhook (cURL)

**Opção A: Usar script (Windows)**

```bash
scripts\testar-n8n-local.bat
```

**Opção B: Comando manual**

```bash
curl -X POST http://localhost:5678/webhook/analisar-resposta \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"test-123\",\"estacaoId\":\"est001\",\"pergunta\":\"Teste\",\"respostaUsuario\":\"Teste resposta\",\"gabarito\":\"Teste gabarito\",\"timestamp\":\"2025-11-03T14:00:00Z\"}"
```

**Resultado esperado:**
```json
{"success": true, "message": "Dados recebidos!", "data": {...}}
```

**Verificar no N8N:**
- Acesse **Executions** no menu lateral
- Você deve ver uma execução nova

---

### Passo 3: Testar no SimulationView.vue

1. **Reinicie o servidor de desenvolvimento:**
   ```bash
   # Pare o servidor (Ctrl+C)
   npm run dev
   ```

2. **Abrir o app:**
   - http://localhost:5173

3. **Fazer login e iniciar simulação:**
   - Faça login como candidato
   - Inicie uma simulação
   - Complete a simulação

4. **Verificar logs no navegador:**
   - Abra DevTools (F12) → Console
   - Procure por: `[N8N_WORKFLOW] ✅ N8N notificado com sucesso`

5. **Verificar no N8N:**
   - Acesse **Executions** no N8N
   - Você deve ver uma nova execução com os dados da simulação

---

## 🔍 Verificações Rápidas

### Verificar N8N está rodando:
```bash
docker ps --filter "name=n8n-local"
```

**Deve mostrar:**
```
n8n-local - Up X minutes (healthy)
```

### Verificar variáveis no .env:
```bash
# Deve ter:
VITE_N8N_WEBHOOK_URL=http://localhost:5678/webhook/analisar-resposta
VITE_N8N_ENABLED=true
```

✅ **Já configurado!** (linhas 74-76 do `.env`)

### Verificar se frontend está usando as variáveis:

1. Abra o console do navegador (F12)
2. Digite:
   ```javascript
   console.log(import.meta.env.VITE_N8N_WEBHOOK_URL)
   ```
3. Deve mostrar: `http://localhost:5678/webhook/analisar-resposta`

---

## ❌ Problemas Comuns

### "N8N não configurado" no console

**Solução:**
1. Verifique `.env` tem as variáveis
2. **Reinicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

### "CORS Error"

**Solução:**
- Use `http://localhost:5678` (não `127.0.0.1`)

### Workflow não executa

**Solução:**
1. Verifique se workflow está **ativo** (toggle verde)
2. Verifique se webhook está **listening** (ícone verde)
3. Verifique se path está correto: `/webhook/analisar-resposta`

---

## 📊 Onde os Dados são Enviados

O `SimulationView.vue` envia dados para o N8N em **2 momentos**:

1. **Após avaliação por IA** (linha 666):
   - Quando candidato completa avaliação por IA
   - Inclui `aiEvaluationResult`

2. **Quando simulação termina** (linha 1613):
   - Quando `simulationEnded` se torna `true`
   - Inclui histórico de conversa

---

## ✅ Checklist de Teste

- [ ] N8N está rodando (Docker)
- [ ] N8N acessível: http://localhost:5678
- [ ] Workflow criado no N8N
- [ ] Workflow ativo (toggle verde)
- [ ] Webhook listening (ícone verde)
- [ ] Variáveis configuradas no `.env`
- [ ] Frontend reiniciado (`npm run dev`)
- [ ] Teste cURL funciona
- [ ] Teste SimulationView.vue funciona
- [ ] Logs aparecem no console do navegador
- [ ] Execução aparece no N8N

---

## 🎯 Próximos Passos

Depois que o teste básico funcionar:

1. **Criar workflow completo com IA:**
   - Siga: `docs/CRIAR_WORKFLOW_N8N_SIMULATIONVIEW.md`

2. **Testar análise completa:**
   - Complete uma simulação real
   - Verifique análise gerada pelo N8N

---

## 📚 Referências

- **Teste Completo:** `docs/TESTAR_N8N_LOCAL.md`
- **Criar Workflow Completo:** `docs/CRIAR_WORKFLOW_N8N_SIMULATIONVIEW.md`
- **Integração:** `docs/INTEGRACAO_N8N_SIMULATIONVIEW.md`

---

**Última atualização:** 2025-11-03  
**Versão:** 1.0.0


