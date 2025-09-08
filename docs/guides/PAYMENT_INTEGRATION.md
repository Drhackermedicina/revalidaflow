# Integração de Pagamentos - REVALIDAFLOW

Este documento descreve como configurar e integrar gateways de pagamento no projeto REVALIDAFLOW.

## Gateways Suportados

### 1. Stripe
- **Métodos**: Cartão de Crédito
- **Configuração**:
  - Obter chaves API do [Stripe Dashboard](https://dashboard.stripe.com)
  - Configurar variáveis de ambiente:
    ```
    VITE_STRIPE_PUBLISHABLE_KEY=pk_live_sua_chave_aqui
    STRIPE_SECRET_KEY=sk_live_sua_chave_secreta_aqui
    ```

### 2. Mercado Pago
- **Métodos**: Pix, Boleto Bancário
- **Configuração**:
  - Obter chaves API do [Mercado Pago](https://www.mercadopago.com.br/developers)
  - Configurar variáveis de ambiente:
    ```
    VITE_MERCADOPAGO_PUBLIC_KEY=APP_USR_sua_chave_publica
    MERCADOPAGO_ACCESS_TOKEN=APP_USR_sua_chave_secreta
    ```

## Variáveis de Ambiente

### Desenvolvimento (.env.local)
```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_mock_key_123456
VITE_MERCADOPAGO_PUBLIC_KEY=TEST-mock-key-123456
VITE_PAYMENT_SUCCESS_URL=http://localhost:5173/payment-success
VITE_PAYMENT_CANCEL_URL=http://localhost:5173/payment-cancel
```

### Produção
Configure via Secret Manager ou variáveis de ambiente do Cloud Run:
- `STRIPE_SECRET_KEY`
- `MERCADOPAGO_ACCESS_TOKEN` 
- `VITE_STRIPE_PUBLISHABLE_KEY`
- `VITE_MERCADOPAGO_PUBLIC_KEY`

## Implementação Backend

### Endpoints Necessários

1. **Criar Sessão de Pagamento**
   - `POST /api/payments/create-session`
   - Parâmetros: `plan`, `paymentMethod`, `amount`, `userId`, `userEmail`
   - Retorna: URL de redirecionamento para o gateway

2. **Webhook de Pagamento**
   - `POST /api/payments/webhook`
   - Processa confirmações de pagamento
   - Atualiza status no Firestore

### Exemplo de Implementação

```javascript
// backend/server.js
app.post('/api/payments/create-session', async (req, res) => {
  // Implementar integração real com Stripe/Mercado Pago
});

app.post('/api/payments/webhook', async (req, res) => {
  // Validar e processar webhooks
});
```

## Frontend

### Página de Pagamento
- Localização: `src/pages/pagamento.vue`
- Funcionalidades:
  - Seleção de plano
  - Escolha de método de pagamento
  - Redirecionamento para gateway
  - Feedback visual

### URLs de Callback
- Sucesso: `/payment-success`
- Cancelamento: `/payment-cancel`
- Configurar no dashboard do gateway

## Fluxo de Pagamento

1. Usuário seleciona plano e método
2. Frontend chama API para criar sessão
3. Backend integra com gateway
4. Usuário é redirecionado para gateway
5. Gateway processa pagamento
6. Webhook notifica backend
7. Backend atualiza status no Firestore
8. Usuário recebe confirmação

## Testes

### Modo Desenvolvimento
- Usa URLs mock dos gateways
- Simula redirecionamento
- Não processa pagamentos reais

### Modo Produção
- Integração real com gateways
- Processamento real de pagamentos
- Webhooks ativos

## Próximos Passos

1. [ ] Implementar integração real com Stripe
2. [ ] Implementar integração real com Mercado Pago  
3. [ ] Criar endpoints backend para processamento
4. [ ] Configurar webhooks
5. [ ] Criar páginas de sucesso/erro
6. [ ] Implementar lógica de assinatura no Firestore
