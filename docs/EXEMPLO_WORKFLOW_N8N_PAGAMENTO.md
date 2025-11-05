# 💳 Exemplo Prático: Workflow N8N para Processar Pagamentos

Este é um exemplo prático e completo de como criar um workflow no N8N para processar pagamentos aprovados do Mercado Pago no REVALIDAFLOW.

## 🎯 Objetivo

Quando um pagamento é aprovado via Mercado Pago:
1. Atualizar status do usuário no Firestore
2. Enviar email de confirmação
3. Notificar administradores
4. Registrar no log de transações

---

## 📋 Pré-requisitos

1. ✅ N8N rodando (já configurado)
2. ✅ Backend com webhook do Mercado Pago (já existe)
3. ⚠️ Node do Firebase instalado no N8N
4. ⚠️ Credenciais do SendGrid/Mailchimp (opcional para emails)

---

## 🔧 Passo 1: Atualizar Webhook no Backend

Modifique `backend/routes/payment.js` para notificar o N8N:

```javascript
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const notification = req.body;
    const pagamento = await mercadopagoService.processarWebhook(notification);

    if (pagamento && pagamento.status === 'approved') {
      // Notificar N8N (assíncrono, não bloqueia resposta)
      const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/pagamento-aprovado';
      
      fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: pagamento.id,
          userId: pagamento.externalReference?.split('_')[1], // Extrair userId do referenceId
          amount: pagamento.transaction_amount,
          plan: pagamento.metadata?.plan,
          email: pagamento.payer?.email,
          status: pagamento.status,
          timestamp: new Date().toISOString()
        })
      }).catch(err => {
        logger.warn('Erro ao notificar N8N', { error: err.message });
      });
    }

    res.status(200).json({ received: true });
  } catch (error) {
    logger.error('Erro ao processar webhook', { error: error.message });
    res.status(200).json({ received: true, error: 'Erro ao processar' });
  }
});
```

**Variável de ambiente:**
```env
N8N_WEBHOOK_URL=http://localhost:5678/webhook/pagamento-aprovado
```

---

## 🚀 Passo 2: Criar Workflow no N8N

### Estrutura do Workflow

```
1. Webhook (Receber dados do pagamento)
   ↓
2. IF (Validar se status é approved)
   ↓ SIM
3. Set (Preparar dados para Firestore)
   ↓
4. Firebase - Read Document (Buscar usuário)
   ↓
5. Set (Preparar dados de atualização)
   ↓
6. Firebase - Update Document (Atualizar usuário)
   ↓
7. HTTP Request (Notificar admin via Telegram/Slack)
   ↓
8. SendGrid (Enviar email de confirmação)
```

---

## 📝 Passo 3: Configurar Cada Node

### Node 1: Webhook

**Configuração:**
- **Name:** `Webhook - Pagamento Aprovado`
- **HTTP Method:** POST
- **Path:** `/webhook/pagamento-aprovado`
- **Response Mode:** `Response Node`
- **Response Code:** 200

**Salvar URL do webhook** que aparecerá (ex: `http://localhost:5678/webhook/pagamento-aprovado`)

---

### Node 2: IF (Validar Pagamento)

**Configuração:**
- **Condition:** `{{$json.status}}` equals `approved`

**Ações:**
- **True:** Continuar workflow
- **False:** Encerrar workflow

---

### Node 3: Set (Preparar Dados)

**Configuração:**
- **Mode:** Manual
- **Values:**
  ```json
  {
    "paymentId": "{{$json.paymentId}}",
    "userId": "{{$json.userId}}",
    "amount": "{{$json.amount}}",
    "plan": "{{$json.plan}}",
    "email": "{{$json.email}}",
    "timestamp": "{{$json.timestamp}}"
  }
  ```

---

### Node 4: Firebase - Read Document

**Pré-requisito:** Instalar node `@n8n/n8n-nodes-firebase`

**Configuração:**
- **Operation:** Read
- **Collection:** `usuarios`
- **Document ID:** `{{$json.userId}}`

**Credenciais Firebase:**
1. Vá em **Settings** → **Credentials**
2. Adicione credencial do Firebase
3. Cole o JSON de service account

---

### Node 5: Set (Preparar Atualização)

**Configuração:**
- **Mode:** Manual
- **Values:**
  ```json
  {
    "status": "premium",
    "planAtivo": "{{$json.plan}}",
    "dataAtivacao": "{{$now}}",
    "ultimoPagamento": {
      "id": "{{$json.paymentId}}",
      "valor": "{{$json.amount}}",
      "data": "{{$json.timestamp}}"
    }
  }
  ```

---

### Node 6: Firebase - Update Document

**Configuração:**
- **Operation:** Update
- **Collection:** `usuarios`
- **Document ID:** `{{$('Set').item.json.userId}}`
- **Data:** `{{$json}}` (usar dados do node anterior)

---

### Node 7: HTTP Request (Notificar Admin)

**Configuração:**
- **Method:** POST
- **URL:** `https://api.telegram.org/bot<SEU_BOT_TOKEN>/sendMessage`
- **Headers:**
  ```json
  {
    "Content-Type": "application/json"
  }
  ```
- **Body:**
  ```json
  {
    "chat_id": "<SEU_CHAT_ID>",
    "text": "✅ Novo pagamento aprovado!\n\n💰 Valor: R$ {{$('Set').item.json.amount}}\n👤 Usuário: {{$('Set').item.json.userId}}\n📦 Plano: {{$('Set').item.json.plan}}\n🕐 Data: {{$('Set').item.json.timestamp}}"
  }
  ```

**Alternativa (Slack):**
```json
{
  "text": "✅ Novo pagamento aprovado!",
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "💰 Valor: R$ {{$('Set').item.json.amount}}\n👤 Usuário: {{$('Set').item.json.userId}}\n📦 Plano: {{$('Set').item.json.plan}}"
      }
    }
  ]
}
```

---

### Node 8: SendGrid (Enviar Email)

**Pré-requisito:** Credenciais do SendGrid

**Configuração:**
- **From Email:** `noreply@revalidaflow.com.br`
- **To Email:** `{{$('Firebase').item.json.email}}`
- **Subject:** `✅ Pagamento Confirmado - RevalidaFlow`
- **Email Type:** HTML
- **Content:**
  ```html
  <h1>Pagamento Confirmado! 🎉</h1>
  <p>Olá,</p>
  <p>Seu pagamento foi aprovado com sucesso!</p>
  <ul>
    <li><strong>Valor:</strong> R$ {{$('Set').item.json.amount}}</li>
    <li><strong>Plano:</strong> {{$('Set').item.json.plan}}</li>
    <li><strong>Data:</strong> {{$('Set').item.json.timestamp}}</li>
  </ul>
  <p>Agora você tem acesso completo à plataforma!</p>
  <p>Equipe RevalidaFlow</p>
  ```

---

## ✅ Passo 4: Ativar e Testar

1. **Ativar Workflow** no N8N
2. **Testar localmente:**
   ```bash
   curl -X POST http://localhost:5678/webhook/pagamento-aprovado \
     -H "Content-Type: application/json" \
     -d '{
       "paymentId": "123456789",
       "userId": "abc123",
       "amount": 99.90,
       "plan": "premium",
       "email": "teste@exemplo.com",
       "status": "approved",
       "timestamp": "2025-11-03T10:00:00Z"
     }'
   ```

3. **Verificar execução** no N8N (tab "Executions")

---

## 🔍 Troubleshooting

### Problema: Webhook não recebe dados

**Solução:**
- Verifique se o workflow está ativo
- Confirme a URL do webhook
- Verifique logs do N8N

### Problema: Firebase não conecta

**Solução:**
- Verifique credenciais do Firebase
- Confirme permissões no Firestore Rules
- Verifique formato do Document ID

### Problema: Email não envia

**Solução:**
- Verifique credenciais do SendGrid
- Confirme formato do email
- Verifique logs do SendGrid

---

## 📊 Monitoramento

### Logs do Workflow

1. Acesse **Executions** no N8N
2. Veja histórico de execuções
3. Revise erros e warnings

### Alertas de Falha

Configure alertas no N8N para:
- Falhas no Firebase
- Falhas no envio de email
- Webhooks não recebidos

---

## 🎨 Próximos Passos

1. ✅ Workflow básico funcionando
2. 🔄 Adicionar mais validações
3. 🔄 Criar template de email profissional
4. 🔄 Adicionar logs em Firestore
5. 🔄 Configurar alertas de erro

---

**Última atualização:** 2025-11-03  
**Versão:** 1.0.0



