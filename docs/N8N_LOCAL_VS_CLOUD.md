# 🌐 N8N: Local vs Cloud - Guia Completo

Guia completo explicando as diferenças entre N8N local e N8N Cloud, e como configurar cada um para uso no REVALIDAFLOW.

---

## ❓ Resposta Rápida

**NÃO, você NÃO precisa rodar N8N localmente!**

Você pode usar:
- ✅ **N8N Local** (via Docker ou npm) - Para desenvolvimento
- ✅ **N8N Cloud** (https://n8n.io) - Para produção (recomendado)
- ✅ **N8N Self-Hosted** (VPS/Cloud Run) - Para maior controle

---

## 🏠 N8N Local (Desenvolvimento)

### Quando usar:
- ✅ Desenvolvimento e testes locais
- ✅ Experimentação com workflows
- ✅ Desenvolvimento offline

### Configuração Atual:
```env
# .env ou .env.local
VITE_N8N_WEBHOOK_URL=http://localhost:5678/webhook/analisar-resposta
VITE_N8N_ENABLED=true
```

### Como rodar:
1. **Via Docker (Recomendado):**
   ```bash
   docker-compose -f docker-compose.n8n.yml up -d
   ```
   - Acesse: http://localhost:5678
   - Login: `admin` / `admin`

2. **Via npm:**
   ```bash
   npm install -g n8n
   n8n start
   ```

### Vantagens:
- ✅ Gratuito
- ✅ Controle total
- ✅ Funciona offline
- ✅ Sem limites de execução

### Desvantagens:
- ❌ Precisa rodar manualmente
- ❌ Não disponível quando computador está desligado
- ❌ Não escala automaticamente
- ❌ IP local não acessível externamente

---

## ☁️ N8N Cloud (Produção - RECOMENDADO)

### Quando usar:
- ✅ Produção (recomendado)
- ✅ Workflows que precisam rodar 24/7
- ✅ Quando não quer gerenciar infraestrutura

### Configuração:

#### Passo 1: Criar Conta no N8N Cloud

1. Acesse: https://n8n.io
2. Clique em **Sign up** (ou **Log in** se já tiver conta)
3. Crie sua conta gratuita ou escolha um plano

**Planos:**
- **Free**: Até 100 execuções/mês
- **Starter**: $20/mês - 5.000 execuções/mês
- **Pro**: $50/mês - 20.000 execuções/mês

#### Passo 2: Criar Workflow no N8N Cloud

1. Após criar conta, você será redirecionado para o dashboard
2. Clique em **+ Add workflow**
3. Crie o workflow (mesmo processo do local)
4. Ative o workflow (toggle no canto superior direito)

#### Passo 3: Obter URL do Webhook

1. No workflow, clique no node **Webhook**
2. Copie a **Production URL**:
   ```
   https://seu-workspace.n8n.cloud/webhook/analisar-resposta
   ```
   OU
   ```
   https://seu-workspace.n8n.cloud/webhook/SEU-WORKFLOW-ID/analisar-resposta
   ```

#### Passo 4: Configurar Variáveis de Ambiente no N8N Cloud

**Opção A: Via Interface Web (Recomendado)**

1. No N8N Cloud, vá em **Settings** (engrenagem no canto superior direito)
2. Clique em **Variables**
3. Adicione cada variável:

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
- ✅ Clique em **Add** para cada variável
- ✅ Use o mesmo nome das variáveis (case-sensitive)
- ✅ As variáveis ficam disponíveis via `{{$env.VARIAVEL_NOME}}`

**Opção B: Via API (Avançado)**

```bash
# Obter API key do N8N Cloud
# Acesse: Settings → API → Create API Key

curl -X POST https://seu-workspace.n8n.cloud/api/v1/environments/variables \
  -H "Content-Type: application/json" \
  -H "X-N8N-API-KEY: sua-api-key" \
  -d '{
    "key": "ZAI_API_KEY",
    "value": "8a02b7c0d6564feea066b7e897207484.8kwdZuX7C70OLUBC"
  }'
```

#### Passo 5: Configurar no Frontend (Produção)

Atualize o `.env` ou variáveis de ambiente do Firebase Hosting:

```env
# Produção
VITE_N8N_WEBHOOK_URL=https://seu-workspace.n8n.cloud/webhook/analisar-resposta
VITE_N8N_ENABLED=true
```

**Para Firebase Hosting:**
1. Acesse Firebase Console → Hosting
2. Vá em **Build configuration**
3. Adicione variáveis de ambiente:
   - `VITE_N8N_WEBHOOK_URL`: URL do webhook do N8N Cloud
   - `VITE_N8N_ENABLED`: `true`

### Vantagens:
- ✅ Funciona 24/7 (sem precisar rodar manualmente)
- ✅ HTTPS automaticamente
- ✅ Escalável automaticamente
- ✅ Backup automático
- ✅ UI moderna
- ✅ Acessível de qualquer lugar

### Desvantagens:
- ❌ Limite de execuções no plano gratuito (100/mês)
- ❌ Precisa internet
- ❌ Planos pagos para uso intensivo

---

## 🖥️ N8N Self-Hosted (VPS/Cloud Run)

### Quando usar:
- ✅ Máximo controle
- ✅ Workflows sensíveis (dados privados)
- ✅ Muitas execuções sem custo extra
- ✅ Compliance com dados locais

### Opções de Deploy:

#### 1. Google Cloud Run (Recomendado)

```dockerfile
# Dockerfile
FROM n8nio/n8n:latest

ENV N8N_HOST=0.0.0.0
ENV N8N_PORT=5678
ENV N8N_PROTOCOL=https
ENV WEBHOOK_URL=https://seu-n8n.cloud.run.app/

# Variáveis de ambiente via Secrets Manager
ENV GOOGLE_API_KEY_1=${GOOGLE_API_KEY_1}
ENV ZAI_API_KEY=${ZAI_API_KEY}
# ... outras variáveis
```

```bash
# Deploy no Cloud Run
gcloud run deploy n8n \
  --source . \
  --platform managed \
  --region southamerica-east1 \
  --allow-unauthenticated \
  --set-secrets "ZAI_API_KEY=zai-api-key:latest" \
  --set-secrets "GOOGLE_API_KEY_1=google-api-key-1:latest"
```

#### 2. VPS (DigitalOcean, AWS EC2, etc.)

```bash
# Instalar N8N no VPS
npm install -g n8n

# Rodar como serviço (systemd)
sudo systemctl start n8n
sudo systemctl enable n8n
```

---

## 🔄 Migração: Local → Cloud

### Passo 1: Exportar Workflow Local

1. No N8N local, abra seu workflow
2. Clique nos **três pontos** (⋮) no canto superior direito
3. Clique em **Download** → **Download Workflow**
4. Salve o arquivo JSON

### Passo 2: Importar no N8N Cloud

1. No N8N Cloud, clique em **+ Add workflow**
2. Clique nos **três pontos** (⋮) → **Import from File**
3. Selecione o arquivo JSON exportado
4. O workflow será importado com todos os nodes

### Passo 3: Configurar Variáveis

1. Configure todas as variáveis no N8N Cloud (Settings → Variables)
2. Teste o workflow com **Execute Workflow** ou **Test webhook**

### Passo 4: Atualizar URL no Frontend

1. Copie a URL do webhook do N8N Cloud
2. Atualize `VITE_N8N_WEBHOOK_URL` no `.env` de produção
3. Faça deploy do frontend

---

## 📊 Comparação: Local vs Cloud

| Característica | Local | Cloud |
|----------------|-------|-------|
| **Custo** | Gratuito | Gratuito até 100 exec/mês |
| **Disponibilidade** | Quando PC ligado | 24/7 |
| **Escalabilidade** | Manual | Automática |
| **HTTPS** | Não (precisa configurar) | Sim (automático) |
| **Backup** | Manual | Automático |
| **Limites** | Sem limites | 100 exec/mês (free) |
| **Controle** | Total | Limitado |
| **Configuração** | Mais complexa | Mais simples |

---

## 🎯 Recomendação

### Desenvolvimento:
- ✅ Use **N8N Local** (Docker)
- ✅ Configure: `VITE_N8N_WEBHOOK_URL=http://localhost:5678/webhook/analisar-resposta`

### Produção:
- ✅ Use **N8N Cloud** (recomendado)
- ✅ Configure: `VITE_N8N_WEBHOOK_URL=https://seu-workspace.n8n.cloud/webhook/analisar-resposta`
- ✅ Configure variáveis via Settings → Variables no N8N Cloud

### Alta Demanda:
- ✅ Use **N8N Self-Hosted** no Cloud Run
- ✅ Escalável e sem limites de execução
- ✅ Mantém controle total

---

## 🔍 Troubleshooting

### Problema: CORS Error ao chamar N8N Cloud

**Solução:**
O N8N Cloud já está configurado para aceitar requisições de qualquer origem. Se ainda tiver problemas:

1. Verifique se o webhook está **ativo** no N8N Cloud
2. Verifique se a URL está correta
3. Verifique se está usando HTTPS (não HTTP)

### Problema: Variáveis não funcionam no N8N Cloud

**Solução:**
1. Verifique se o nome está correto (case-sensitive)
2. Verifique se a variável foi criada via Settings → Variables
3. Use `{{$env.VARIAVEL_NOME}}` no workflow (não `{{$env.variavel_nome}}`)

### Problema: Workflow não executa no N8N Cloud

**Solução:**
1. Verifique se o workflow está **ativo** (toggle verde)
2. Verifique se o webhook está **listening** (ícone verde)
3. Verifique logs em **Executions** no N8N Cloud

---

## 📚 Referências

- **N8N Cloud**: https://n8n.io
- **N8N Docs**: https://docs.n8n.io
- **Pricing**: https://n8n.io/pricing
- **Workflow Local**: `docs/CRIAR_WORKFLOW_N8N_SIMULATIONVIEW.md`
- **Configuração Local**: `docker-compose.n8n.yml`

---

**Última atualização:** 2025-11-03  
**Versão:** 1.0.0








