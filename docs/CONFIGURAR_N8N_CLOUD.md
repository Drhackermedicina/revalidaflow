# ☁️ Configurar N8N Cloud - Guia Passo a Passo

Guia completo para configurar N8N Cloud para uso em produção no REVALIDAFLOW.

---

## 🎯 Objetivo

Configurar N8N Cloud para receber dados do `SimulationView.vue` e analisar respostas usando todas as chaves de API disponíveis.

---

## 📋 Pré-requisitos

- ✅ Conta no N8N Cloud (https://n8n.io)
- ✅ Conta gratuita funciona (até 100 execuções/mês)
- ✅ Todas as chaves de API disponíveis

---

## 🚀 Passo 1: Criar Conta no N8N Cloud

1. Acesse: https://n8n.io
2. Clique em **Sign up** (ou **Log in** se já tiver conta)
3. Crie sua conta:
   - Email
   - Senha
   - Nome

4. Confirme seu email (verifique sua caixa de entrada)

5. Faça login no N8N Cloud

---

## 🚀 Passo 2: Criar Workflow

1. Após login, você verá o dashboard
2. Clique em **+ Add workflow**
3. Nome: `Análise de Respostas - SimulationView`
4. Clique em **Save** no canto superior direito

**Importante:** Siga o guia `docs/CRIAR_WORKFLOW_N8N_SIMULATIONVIEW.md` para criar o workflow completo.

---

## 🔑 Passo 3: Configurar Variáveis de Ambiente

### Via Interface Web (Recomendado)

1. No N8N Cloud, clique no **ícone de engrenagem** (⚙️) no canto superior direito
2. Clique em **Variables**
3. Adicione cada variável clicando em **+ Add variable**:

| Name | Value |
|------|-------|
| `ZAI_API_KEY` | `8a02b7c0d6564feea066b7e897207484.8kwdZuX7C70OLUBC` |
| `GOOGLE_API_KEY_1` | `AIzaSyB6Lj_5p11hJKbZAnb3oRK5h3lxgVZIl8U` |
| `GOOGLE_API_KEY_2` | `AIzaSyAlvMR2zOJDZbwBBpP0sl1JHp2fb9uQiy4` |
| `VITE_GOOGLE_API_KEY_1` | `AIzaSyB6Lj_5p11hJKbZAnb3oRK5h3lxgVZIl8U` |
| `VITE_GOOGLE_API_KEY_2` | `AIzaSyAlvMR2zOJDZbwBBpP0sl1JHp2fb9uQiy4` |
| `VITE_GOOGLE_API_KEY_3` | `AIzaSyB7Pm5fFzuSxxLI4ogBgJoUxukDW-wCP4g` |
| `VITE_GOOGLE_API_KEY_6` | `AIzaSyDAbZJiK4EaTJkMfl3D0kreBPxFuoEuAUY` |

**Importante:**
- ✅ Use exatamente o mesmo nome (case-sensitive)
- ✅ Clique em **Save** após adicionar cada variável
- ✅ As variáveis ficam disponíveis via `{{$env.VARIAVEL_NOME}}` no workflow

---

## 🔗 Passo 4: Obter URL do Webhook

1. No workflow, clique no node **Webhook**
2. Copie a **Production URL** que aparece:
   ```
   https://seu-workspace.n8n.cloud/webhook/analisar-resposta
   ```
   OU
   ```
   https://seu-workspace.n8n.cloud/webhook/SEU-WORKFLOW-ID/analisar-resposta
   ```

3. Salve esta URL (você vai precisar dela no próximo passo)

---

## ⚙️ Passo 5: Configurar no Frontend (Produção)

### Opção A: Variáveis de Ambiente (Firebase Hosting)

1. Acesse Firebase Console: https://console.firebase.google.com
2. Selecione seu projeto
3. Vá em **Hosting** → **Build configuration**
4. Clique em **Add environment variable**
5. Adicione:

| Name | Value |
|------|-------|
| `VITE_N8N_WEBHOOK_URL` | `https://seu-workspace.n8n.cloud/webhook/analisar-resposta` |
| `VITE_N8N_ENABLED` | `true` |

6. Salve as alterações
7. Faça um novo deploy do frontend:
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

### Opção B: Arquivo `.env.production`

1. Crie arquivo `.env.production` na raiz do projeto:
   ```env
   VITE_N8N_WEBHOOK_URL=https://seu-workspace.n8n.cloud/webhook/analisar-resposta
   VITE_N8N_ENABLED=true
   ```

2. Faça build e deploy:
   ```bash
   npm run build:prod
   firebase deploy --only hosting
   ```

**Importante:**
- ✅ Use HTTPS (não HTTP)
- ✅ URL completa do webhook (com `/webhook/analisar-resposta`)
- ✅ `VITE_N8N_ENABLED=true` para ativar

---

## ✅ Passo 6: Testar Workflow

### Teste Manual (cURL)

```bash
curl -X POST https://seu-workspace.n8n.cloud/webhook/analisar-resposta \
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

### Teste no N8N Cloud

1. No workflow, clique em **Execute Workflow**
2. Ou clique no node **Webhook** → **Listen for Test Event**
3. Envie uma requisição POST usando Postman ou cURL
4. Verifique a execução em **Executions**

### Teste no SimulationView.vue

1. Complete uma simulação como candidato
2. Verifique logs do navegador:
   - Procure por `[N8N_WORKFLOW]`
   - Deve ver: `✅ N8N notificado com sucesso`
3. Verifique no N8N Cloud:
   - Acesse **Executions**
   - Deve ver uma execução nova

---

## 🔍 Troubleshooting

### Problema: CORS Error

**Solução:**
O N8N Cloud já está configurado para aceitar requisições de qualquer origem. Se ainda tiver problemas:

1. Verifique se está usando HTTPS (não HTTP)
2. Verifique se o webhook está **ativo** (toggle verde)
3. Verifique se a URL está correta

### Problema: Variáveis não funcionam

**Solução:**
1. Verifique se o nome está correto (case-sensitive)
2. Verifique se a variável foi criada via Settings → Variables
3. Use `{{$env.VARIAVEL_NOME}}` no workflow (não `{{$env.variavel_nome}}`)

### Problema: Workflow não executa

**Solução:**
1. Verifique se o workflow está **ativo** (toggle verde)
2. Verifique se o webhook está **listening** (ícone verde)
3. Verifique logs em **Executions** no N8N Cloud
4. Verifique se as variáveis estão configuradas

### Problema: Limite de execuções excedido (Free Plan)

**Solução:**
- Upgrade para plano pago (Starter: $20/mês - 5.000 exec/mês)
- Ou use N8N Self-Hosted (sem limites)

---

## 📊 Monitoramento

### Verificar Execuções

1. No N8N Cloud, clique em **Executions**
2. Veja histórico de execuções
3. Clique em uma execução para ver detalhes
4. Verifique se houve erros

### Estatísticas

- **Execuções do mês**: Visível no dashboard
- **Execuções restantes** (Free Plan): 100 - execuções usadas
- **Logs detalhados**: Em cada execução

---

## 🎉 Pronto!

Agora o N8N Cloud está configurado e pronto para receber dados do `SimulationView.vue`!

**Checklist:**
- [ ] Conta criada no N8N Cloud
- [ ] Workflow criado e configurado
- [ ] Variáveis de ambiente configuradas
- [ ] URL do webhook copiada
- [ ] Frontend configurado com URL do webhook
- [ ] Testado com cURL
- [ ] Testado com SimulationView.vue
- [ ] Workflow ativo (toggle verde)

---

## 📚 Referências

- **N8N Cloud**: https://n8n.io
- **N8N Docs**: https://docs.n8n.io
- **Pricing**: https://n8n.io/pricing
- **Workflow Completo**: `docs/CRIAR_WORKFLOW_N8N_SIMULATIONVIEW.md`
- **Local vs Cloud**: `docs/N8N_LOCAL_VS_CLOUD.md`

---

**Última atualização:** 2025-11-03  
**Versão:** 1.0.0



