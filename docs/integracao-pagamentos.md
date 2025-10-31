# Guia de Integração de Pagamentos - Mercado Pago e PicPay

## 📋 Visão Geral

Para receber pagamentos **PIX, Cartão de Crédito e Boleto** diretamente na sua conta Mercado Pago ou PicPay, é necessário usar as **APIs oficiais** dessas plataformas. Não é possível gerar códigos PIX válidos manualmente que funcionem em apps bancários.

---

## 🟢 Mercado Pago

### Documentação Oficial
- **Portal Developers**: https://www.mercadopago.com.br/developers
- **Documentação API**: https://www.mercadopago.com.br/developers/pt/docs
- **Dashboard**: https://www.mercadopago.com.br/developers/panel

### Opções de Integração

#### 1. **Checkout Pro** (Mais Fácil)
- Página de pagamento hospedada pelo Mercado Pago
- Suporta: PIX, Cartão de Crédito, Boleto
- **SDK Node.js**: `npm install mercadopago`
- **Documentação**: https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/landing

#### 2. **Checkout Transparente** (Customizável)
- Pagamento direto no seu site
- Mais controle sobre a experiência
- **SDK Node.js**: `npm install mercadopago`
- **Documentação**: https://www.mercadopago.com.br/developers/pt/docs/checkout-api/landing

#### 3. **QR Code PIX Dinâmico** (API Direta)
- Gera QR Code PIX válido via API
- Atualiza status do pagamento automaticamente
- **Documentação**: https://www.mercadopago.com.br/developers/pt/docs/qr-code/landing

### Credenciais Necessárias

1. **Acess Token** (Production ou Test)
2. **Public Key** (para frontend)
3. **User ID** (identificador da conta)

**Como obter:**
1. Acesse: https://www.mercadopago.com.br/developers/panel
2. Crie uma aplicação
3. Copie as credenciais

### Exemplo de Integração Básica (Node.js)

```javascript
// Instalar: npm install mercadopago
const mercadopago = require('mercadopago');

// Configurar credenciais
mercadopago.configure({
  access_token: 'SEU_ACCESS_TOKEN'
});

// Criar preferência de pagamento
async function criarPagamento(valor, descricao) {
  const preference = {
    items: [
      {
        title: descricao,
        quantity: 1,
        unit_price: valor
      }
    ],
    payment_methods: {
      excluded_payment_types: [],
      installments: 12
    },
    back_urls: {
      success: 'https://seusite.com/sucesso',
      failure: 'https://seusite.com/erro',
      pending: 'https://seusite.com/pendente'
    },
    auto_return: 'approved'
  };

  const response = await mercadopago.preferences.create(preference);
  return response.body;
}

// Para PIX dinâmico
async function criarPixPagamento(valor, descricao) {
  const payment = {
    transaction_amount: valor,
    description: descricao,
    payment_method_id: 'pix',
    payer: {
      email: 'cliente@email.com'
    }
  };

  const response = await mercadopago.payment.create(payment);
  return response.body;
}
```

---

## 🟡 PicPay

### Documentação Oficial
- **Portal Developers**: https://developer.picpay.com/
- **API Documentation**: https://developer.picpay.com/doc

### Opções de Integração

#### 1. **PicPay Business API**
- API REST para integração
- Suporta: PIX, Cartão de Crédito
- **Autenticação**: OAuth 2.0
- **Documentação**: https://developer.picpay.com/doc

### Credenciais Necessárias

1. **Client ID**
2. **Client Secret**
3. **Authorization Token**

**Como obter:**
1. Acesse: https://developer.picpay.com/
2. Registre sua aplicação
3. Copie as credenciais

### Exemplo de Integração Básica

```javascript
// Criar pedido no PicPay
async function criarPedidoPicPay(valor, referencia) {
  const response = await fetch('https://appws.picpay.com/ecommerce/public/payments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-picpay-token': 'SEU_TOKEN'
    },
    body: JSON.stringify({
      referenceId: referencia,
      callbackUrl: 'https://seusite.com/callback',
      value: valor,
      returnUrl: 'https://seusite.com/retorno'
    })
  });

  return await response.json();
}
```

---

## 🚀 Implementação Recomendada

### Opção 1: Mercado Pago Checkout Pro (Mais Simples)

**Vantagens:**
- ✅ Implementação rápida
- ✅ Segurança total (PCI compliance)
- ✅ Suporta todos os métodos de pagamento
- ✅ Webhook para confirmação automática

**Passos:**
1. Instalar SDK do Mercado Pago
2. Criar endpoint no backend para gerar preferência
3. Redirecionar usuário para checkout do Mercado Pago
4. Configurar webhooks para confirmação

### Opção 2: Mercado Pago QR Code Dinâmico (PIX Específico)

**Vantagens:**
- ✅ QR Code válido e funcional
- ✅ Atualização automática de status
- ✅ Webhook para confirmação

**Passos:**
1. Criar pagamento PIX via API
2. Receber QR Code válido do Mercado Pago
3. Exibir QR Code na página
4. Aguardar webhook de confirmação

---

## 📦 Estrutura de Implementação Sugerida

```
backend/
  routes/
    payment.js          # Rotas de pagamento
  services/
    mercadopago.js      # Serviço Mercado Pago
    picpay.js           # Serviço PicPay (opcional)
  controllers/
    payment.js          # Controller de pagamentos
```

---

## 🔐 Segurança

1. **NUNCA** exponha tokens de produção no frontend
2. Use variáveis de ambiente (`.env`)
3. Valide webhooks assinados
4. Use HTTPS em produção
5. Implemente rate limiting

---

## 📝 Próximos Passos

1. **Escolher plataforma** (Mercado Pago recomendado)
2. **Criar conta de desenvolvedor**
3. **Obter credenciais**
4. **Instalar SDK**
5. **Implementar endpoint de pagamento**
6. **Configurar webhooks**
7. **Testar em sandbox antes de produção**

---

## 🔗 Links Úteis

### Mercado Pago
- Developers Portal: https://www.mercadopago.com.br/developers
- SDK Node.js: https://github.com/mercadopago/sdk-nodejs
- Status API: https://status.mercadopago.com/

### PicPay
- Developers Portal: https://developer.picpay.com/
- Documentação: https://developer.picpay.com/doc

---

## ⚠️ Notas Importantes

1. **Códigos PIX estáticos gerados manualmente NÃO funcionam** em apps bancários
2. É necessário usar API oficial para gerar QR Codes válidos
3. Mercado Pago é mais completo e documentado que PicPay
4. Teste sempre em sandbox antes de produção
5. Implemente webhooks para confirmação automática de pagamentos



