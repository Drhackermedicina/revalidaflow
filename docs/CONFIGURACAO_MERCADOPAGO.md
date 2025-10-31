# Configuração do Mercado Pago Checkout Pro

## 🚀 Passo a Passo de Configuração

### 1. Criar Conta de Desenvolvedor no Mercado Pago

1. Acesse: https://www.mercadopago.com.br/developers
2. Faça login com sua conta Mercado Pago
3. Crie uma nova aplicação
4. Copie o **Access Token** (Production ou Test)

### 2. Configurar Variáveis de Ambiente

No arquivo `.env` ou nas variáveis de ambiente do seu servidor, adicione:

```bash
# Mercado Pago
MERCADOPAGO_ACCESS_TOKEN=seu_access_token_aqui

# URLs do Frontend e Backend (já configuradas)
FRONTEND_URL=http://localhost:5173  # ou https://www.revalidaflow.com.br em produção
BACKEND_URL=http://localhost:3000    # ou URL do Cloud Run em produção
```

### 3. Configurar Webhook (Produção)

O webhook é necessário para receber notificações de pagamento confirmado.

1. No painel do Mercado Pago Developers:
   - Acesse sua aplicação
   - Vá em "Webhooks" ou "Notificações"
   - Adicione a URL: `https://seu-backend.com/api/payment/webhook`

**IMPORTANTE:** O webhook precisa ser acessível publicamente (HTTPS em produção)

### 4. Testar em Sandbox (Desenvolvimento)

Para testar sem usar dinheiro real:

1. Use o **Access Token de Test** no `.env`
2. As transações serão simuladas
3. Cartões de teste: https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/test-cards

### 5. URLs de Retorno

O sistema está configurado para retornar automaticamente após o pagamento:

- **Sucesso**: `/pagamento/sucesso?reference=RF_xxx`
- **Falha**: `/pagamento/erro?reference=RF_xxx`
- **Pendente**: `/pagamento/pendente?reference=RF_xxx`

Essas rotas precisam ser criadas no frontend se ainda não existirem.

## 📋 Fluxo de Pagamento

1. **Cliente seleciona plano** na página `/pagamento`
2. **Sistema cria checkout** via `/api/payment/create`
3. **Cliente é redirecionado** para checkout do Mercado Pago
4. **Cliente escolhe forma de pagamento** (PIX, Cartão, Boleto)
5. **Cliente realiza pagamento** no Mercado Pago
6. **Mercado Pago envia webhook** para `/api/payment/webhook`
7. **Sistema processa confirmação** e libera acesso

## 🔐 Segurança

- ✅ Access Token **NUNCA** deve ser exposto no frontend
- ✅ Webhook valida assinatura do Mercado Pago
- ✅ Todas as rotas de pagamento usam HTTPS em produção
- ✅ Rate limiting aplicado automaticamente

## 🐛 Troubleshooting

### Erro: "Mercado Pago não está configurado"
- Verifique se `MERCADOPAGO_ACCESS_TOKEN` está definido
- Verifique se o token é válido (não expirou)

### Webhook não está recebendo notificações
- Verifique se a URL está acessível publicamente
- Use ferramentas como ngrok para desenvolvimento local
- Verifique logs do backend: `backend/services/logger`

### Checkout não redireciona
- Verifique console do navegador para erros
- Verifique se `backendUrl` está configurado corretamente no frontend
- Verifique se o backend está respondendo na rota `/api/payment/create`

## 📚 Documentação Adicional

- **Mercado Pago Developers**: https://www.mercadopago.com.br/developers
- **Checkout Pro**: https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/landing
- **Webhooks**: https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks

## ✅ Checklist de Configuração

- [ ] Conta de desenvolvedor criada no Mercado Pago
- [ ] Access Token obtido (Production ou Test)
- [ ] Variável `MERCADOPAGO_ACCESS_TOKEN` configurada
- [ ] Backend rodando e acessível
- [ ] Webhook configurado (produção)
- [ ] URLs de retorno funcionando
- [ ] Testado com sandbox (desenvolvimento)


