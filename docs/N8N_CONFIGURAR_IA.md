# 🤖 Como Configurar IA no N8N

Guia completo para integrar diferentes modelos de IA no N8N para usar no REVALIDAFLOW.

## 📋 Índice

1. [Opções de IA Disponíveis](#opções-de-ia-disponíveis)
2. [Google Gemini (Recomendado - Já no Projeto)](#google-gemini)
3. [OpenAI (GPT-4, GPT-3.5)](#openai)
4. [Anthropic Claude](#anthropic-claude)
5. [Exemplos de Workflows com IA](#exemplos-de-workflows-com-ia)
6. [Melhores Práticas](#melhores-práticas)

---

## 🎯 Opções de IA Disponíveis

O N8N suporta vários modelos de IA:

- ✅ **Google Gemini** (Já configurado no projeto)
- ✅ **OpenAI** (GPT-4, GPT-3.5, GPT-4 Turbo)
- ✅ **Anthropic Claude** (Claude 3, Claude 3.5)
- ✅ **Hugging Face** (Modelos open-source)
- ✅ **Replicate** (Diversos modelos)
- ✅ **OpenRouter** (Gateway para múltiplas IAs)

---

## 🌟 Google Gemini (Recomendado)

### Por que usar Gemini?

- ✅ **Já está configurado** no projeto REVALIDAFLOW
- ✅ **12 chaves API** disponíveis com load balancing
- ✅ **Gratuito** com limites generosos
- ✅ **Rápido** e eficiente
- ✅ **Suporta multimodal** (texto, imagem, áudio)

### Configuração no N8N

#### Opção 1: Via HTTP Request (Mais Flexível)

**Passo 1: Criar Credential no N8N**

1. Acesse N8N → **Settings** → **Credentials**
2. Clique em **Add Credential**
3. Procure por **HTTP Header Auth**
4. Configure:
   - **Name:** `Google Gemini API`
   - **Authentication:** Header Auth
   - **Name:** `x-goog-api-key`
   - **Value:** `AIzaSyB6Lj_5p11hJKbZAnb3oRK5h3lxgVZIl8U` (sua chave)

**Passo 2: Criar Node HTTP Request**

1. Adicione node **HTTP Request**
2. Configure:
   - **Method:** POST
   - **URL:** `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={{$credentials.googleGeminiApi.header.xGoogApiKey}}`
   - **Headers:**
     ```json
     {
       "Content-Type": "application/json"
     }
     ```
   - **Body:**
     ```json
     {
       "contents": [{
         "parts": [{
           "text": "{{$json.prompt}}"
         }]
       }],
       "generationConfig": {
         "temperature": 0.7,
         "topP": 0.8,
         "topK": 40,
         "maxOutputTokens": 2048
       }
     }
     ```

**Passo 3: Processar Resposta**

1. Adicione node **Set**
2. Configure para extrair:
   ```json
   {
     "response": "{{$json.candidates[0].content.parts[0].text}}"
   }
   ```

---

#### Opção 2: Via Node Custom Code (Mais Simples)

**Passo 1: Instalar Node do Google AI**

1. Acesse **Settings** → **Community Nodes**
2. Procure: `@google/generative-ai`
3. Instale o node

**Passo 2: Configurar Node**

1. Adicione node **Google Generative AI**
2. Configure:
   - **API Key:** `AIzaSyB6Lj_5p11hJKbZAnb3oRK5h3lxgVZIl8U`
   - **Model:** `gemini-2.5-flash`
   - **Prompt:** `{{$json.prompt}}`
   - **Temperature:** 0.7
   - **Max Tokens:** 2048

---

### Chaves Gemini Disponíveis no Projeto

Você já tem **12 chaves API** configuradas no projeto:

```env
GOOGLE_API_KEY_1=AIzaSyB6Lj_5p11hJKbZAnb3oRK5h3lxgVZIl8U
GOOGLE_API_KEY_2=AIzaSyAlvMR2zOJDZbwBBpP0sl1JHp2fb9uQiy4
GOOGLE_API_KEY_3=AIzaSyB7Pm5fFzuSxxLI4ogBgJoUxukDW-wCP4g
# ... até GOOGLE_API_KEY_12
```

**Recomendação:** Use uma chave por workflow ou crie um sistema de rotação.

---

## 🚀 OpenAI (GPT-4, GPT-3.5)

### Configuração

**Passo 1: Obter API Key**

1. Acesse: https://platform.openai.com/api-keys
2. Crie uma conta ou faça login
3. Gere uma nova API Key
4. Copie a chave (começa com `sk-`)

**Passo 2: Instalar Node no N8N**

1. Acesse **Settings** → **Community Nodes**
2. Procure: `@n8n/n8n-nodes-openai`
3. Instale o node

**Passo 3: Configurar Credentials**

1. Adicione credencial **OpenAI**
2. Cole sua API Key
3. Salve

**Passo 4: Usar no Workflow**

1. Adicione node **OpenAI**
2. Configure:
   - **Operation:** Create Chat Message
   - **Model:** `gpt-4` ou `gpt-3.5-turbo`
   - **Messages:**
     ```json
     [
       {
         "role": "system",
         "content": "Você é um assistente médico especializado."
       },
       {
         "role": "user",
         "content": "{{$json.prompt}}"
       }
     ]
     ```

---

## 🧠 Anthropic Claude

### Configuração

**Passo 1: Obter API Key**

1. Acesse: https://console.anthropic.com/
2. Crie uma conta
3. Gere uma API Key
4. Copie a chave (começa com `sk-ant-`)

**Passo 2: Via HTTP Request**

1. Adicione node **HTTP Request**
2. Configure:
   - **Method:** POST
   - **URL:** `https://api.anthropic.com/v1/messages`
   - **Headers:**
     ```json
     {
       "Content-Type": "application/json",
       "x-api-key": "sk-ant-sua-chave-aqui",
       "anthropic-version": "2023-06-01"
     }
     ```
   - **Body:**
     ```json
     {
       "model": "claude-3-5-sonnet-20241022",
       "max_tokens": 1024,
       "messages": [{
         "role": "user",
         "content": "{{$json.prompt}}"
       }]
     }
     ```

---

## 📝 Exemplos de Workflows com IA

### Workflow 1: Análise Automática de Respostas

**Objetivo:** Analisar respostas de simulações com IA

```
Trigger: Webhook (Resposta de simulação)
  ↓
Node: Set (Preparar dados)
  - pergunta: {{$json.pergunta}}
  - resposta: {{$json.resposta}}
  - gabarito: {{$json.gabarito}}
  ↓
Node: Google Gemini (Analisar resposta)
  Prompt: "Analise a resposta do candidato em relação ao gabarito..."
  ↓
Node: Set (Processar análise)
  - feedback: {{$json.response}}
  - pontuacao: {{$json.pontuacao}}
  ↓
Node: Firebase (Salvar análise)
  Collection: analises_ia
```

---

### Workflow 2: Geração Automática de Feedback

**Objetivo:** Gerar feedback personalizado com IA

```
Trigger: Schedule (Diário às 8h)
  ↓
Node: Firebase (Buscar simulações do dia)
  Collection: sessoes_simulacao
  Where: createdAt >= hoje
  ↓
Node: Loop (Para cada simulação)
  ↓
Node: Google Gemini (Gerar feedback)
  Prompt: "Gere feedback construtivo para esta simulação: {{$json.dados}}"
  ↓
Node: Firebase (Atualizar simulação)
  Collection: sessoes_simulacao
  Data: { feedbackIA: {{$json.response}} }
  ↓
Node: SendGrid (Enviar email)
  To: {{$json.usuario.email}}
  Subject: Seu feedback da simulação
  Body: {{$json.feedbackIA}}
```

---

### Workflow 3: Resumo de Estatísticas com IA

**Objetivo:** Criar resumo inteligente de dados

```
Trigger: Schedule (Semanal domingo às 9h)
  ↓
Node: Firebase (Buscar dados da semana)
  - Total de simulações
  - Usuários ativos
  - Tempo médio
  ↓
Node: Set (Preparar dados para IA)
  - dados: {{$json}}
  ↓
Node: Google Gemini (Gerar resumo)
  Prompt: "Analise estes dados e crie um resumo executivo: {{$json.dados}}"
  ↓
Node: SendGrid (Enviar para admin)
  Subject: Resumo Semanal
  Body: {{$json.resumoIA}}
```

---

### Workflow 4: Classificação Automática de Estações

**Objetivo:** Usar IA para classificar e taggear estações

```
Trigger: Webhook (Nova estação criada)
  ↓
Node: Firebase (Buscar estação)
  Collection: estacoes_clinicas
  Document ID: {{$json.estacaoId}}
  ↓
Node: Google Gemini (Classificar)
  Prompt: "Classifique esta estação clínica: {{$json.descricao}}"
  ↓
Node: Set (Extrair tags e categoria)
  - categoria: {{$json.categoria}}
  - tags: {{$json.tags}}
  ↓
Node: Firebase (Atualizar estação)
  Collection: estacoes_clinicas
  Data: { 
    categoriaIA: {{$json.categoria}},
    tagsIA: {{$json.tags}}
  }
```

---

## 💡 Melhores Práticas

### 1. **Gestão de Chaves API**

- ✅ Use uma chave por workflow para isolamento
- ✅ Configure rate limiting
- ✅ Monitore uso de tokens
- ✅ Tenha chaves de backup

### 2. **Otimização de Custos**

- ✅ Use modelos menores quando possível (gemini-flash vs gemini-pro)
- ✅ Configure maxOutputTokens adequado
- ✅ Cache respostas similares
- ✅ Evite chamadas desnecessárias

### 3. **Segurança**

- ✅ Nunca exponha chaves no frontend
- ✅ Use variáveis de ambiente no N8N
- ✅ Rotacione chaves regularmente
- ✅ Monitore uso anormal

### 4. **Performance**

- ✅ Use processamento assíncrono
- ✅ Configure timeouts adequados
- ✅ Implemente retry logic
- ✅ Monitore latência

---

## 🔐 Configurar Credenciais com Segurança

### Opção 1: Variáveis de Ambiente (Recomendado)

1. Acesse **Settings** → **Variables**
2. Adicione variável:
   - **Name:** `GEMINI_API_KEY`
   - **Value:** `AIzaSy...`
3. Use no workflow: `{{$env.GEMINI_API_KEY}}`

### Opção 2: Credentials do N8N

1. Acesse **Settings** → **Credentials**
2. Crie credencial específica para cada IA
3. Configure e teste
4. Use nos nodes automaticamente

---

## 📊 Monitoramento de Uso

### Verificar Uso de API

1. **Google Gemini:**
   - https://aistudio.google.com/app/apikey
   - Veja uso e limites

2. **OpenAI:**
   - https://platform.openai.com/usage
   - Monitora tokens e custos

3. **Anthropic:**
   - https://console.anthropic.com/settings/usage
   - Verifica uso e limites

---

## 🎯 Recomendação para REVALIDAFLOW

### Use Google Gemini Porque:

1. ✅ **Já está configurado** no projeto
2. ✅ **12 chaves disponíveis** (load balancing)
3. ✅ **Gratuito** com limites generosos
4. ✅ **Rápido** para processos em tempo real
5. ✅ **Suporta contexto médico** (já usado no projeto)

### Casos de Uso Ideais:

- 📝 Análise automática de respostas
- 💬 Geração de feedback personalizado
- 📊 Resumos inteligentes de dados
- 🏷️ Classificação automática de conteúdo
- 📧 Emails personalizados gerados por IA

---

## 🔗 Links Úteis

- **Google Gemini:** https://ai.google.dev/
- **OpenAI:** https://platform.openai.com/
- **Anthropic Claude:** https://www.anthropic.com/
- **N8N AI Nodes:** https://n8n.io/integrations/?category=ai

---

## 📚 Próximos Passos

1. ✅ Configurar Google Gemini no N8N
2. 🔄 Criar primeiro workflow com IA
3. 🔄 Testar com dados reais
4. 🔄 Otimizar prompts
5. 🔄 Monitorar uso e custos

---

**Última atualização:** 2025-11-03  
**Versão:** 1.0.0







