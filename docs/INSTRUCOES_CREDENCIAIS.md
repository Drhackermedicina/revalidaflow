# 🔐 Como Configurar as Credenciais do Mercado Pago

## ✅ Seu Access Token está correto!

Você tem o **Access Token** correto do Mercado Pago:
```
APP_USR-1232997769271276-103106-47fa63dce3e212b3c4ce466be2dd37f2-380115539
```

## 📝 Passos para Configurar:

### 1. Criar/Editar arquivo `.env` na raiz do projeto

O backend carrega o arquivo `.env` da **raiz do projeto** (não da pasta `backend/`).

Caminho: `D:\PROJETOS VS CODE\REVALIDAFLOW\FRONTEND E BACKEND\.env`

### 2. Adicionar a variável de ambiente

Adicione esta linha no arquivo `.env`:

```bash
MERCADOPAGO_ACCESS_TOKEN=APP_USR-1232997769271276-103106-47fa63dce3e212b3c4ce466be2dd37f2-380115539
```

### 3. Se o arquivo `.env` não existir

Se o arquivo não existir, crie um novo arquivo chamado `.env` na raiz do projeto com:

```bash
# Mercado Pago
MERCADOPAGO_ACCESS_TOKEN=APP_USR-1232997769271276-103106-47fa63dce3e212b3c4ce466be2dd37f2-380115539

# Outras variáveis de ambiente que você já tenha
# (mantenha as que já estão configuradas)
```

### 4. Reiniciar o backend

Após adicionar a variável:
1. Pare o servidor backend (se estiver rodando)
2. Reinicie o servidor
3. Verifique os logs - deve aparecer: `Mercado Pago inicializado com sucesso`

## 🔍 Como Verificar se Está Funcionando:

1. **Iniciar o backend**:
   ```bash
   cd backend
   npm start
   ```

2. **Verificar logs**: Deve aparecer:
   ```
   Mercado Pago inicializado com sucesso
   ```

3. **Testar pagamento**: Acesse `/pagamento` e tente criar um checkout

## ⚠️ Importante:

- ✅ O arquivo `.env` está no `.gitignore` (não será commitado)
- ✅ **NUNCA** compartilhe seu Access Token publicamente
- ✅ Use o **Access Token de Test** para desenvolvimento
- ✅ Use o **Access Token de Production** apenas em produção

## 📚 Documentação Completa:

Veja `docs/CONFIGURACAO_MERCADOPAGO.md` para instruções completas de configuração.


