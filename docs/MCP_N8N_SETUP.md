# 🚀 Guia de Configuração MCP para N8N Local no Cursor

Este guia explica como configurar e executar o Model Context Protocol (MCP) para integrar N8N local com o Cursor IDE.

## 📋 Pré-requisitos

1. **Node.js** (versão 18 ou superior)
   ```bash
   node --version  # v18.0.0+
   ```

2. **N8N instalado e rodando localmente**
   - Instalação: `npm install -g n8n`
   - Iniciar: `n8n start` (padrão: http://localhost:5678)

3. **Chave de API do N8N**
   - Acesse: http://localhost:5678/settings/api
   - Gere uma chave de API ou use a padrão se for desenvolvimento local

## 🔧 Instalação do Servidor MCP do N8N

### Opção 1: Instalação Global (Recomendado)

```bash
npm install -g @kernel.salacoste/n8n-workflow-builder
```

### Opção 2: Instalação Local no Projeto

```bash
npm install --save-dev @kernel.salacoste/n8n-workflow-builder
```

## ⚙️ Configuração no Cursor

### 1. Atualizar o arquivo de configuração MCP

O arquivo `.kilocode/mcp.json` deve ser atualizado para incluir o servidor N8N:

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npm",
      "args": [
        "run",
        "mcp:serve"
      ]
    },
    "context7": {
      "command": "npx",
      "args": [
        "-y",
        "@upstash/context7-mcp"
      ],
      "env": {
        "DEFAULT_MINIMUM_TOKENS": ""
      }
    },
    "n8n-local": {
      "command": "npx",
      "args": [
        "-y",
        "@kernel.salacoste/n8n-workflow-builder"
      ],
      "env": {
        "N8N_HOST": "http://localhost:5678/api/v1",
        "N8N_API_KEY": "sua-api-key-aqui"
      }
    }
  }
}
```

### 2. Configurar Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto (se ainda não existir) e adicione:

```env
# Configuração N8N Local
N8N_HOST=http://localhost:5678/api/v1
N8N_API_KEY=sua-api-key-aqui
```

**Importante:** O arquivo `.env.local` está no `.gitignore` e não será versionado.

### 3. Obter a Chave de API do N8N

Se você estiver usando N8N local sem autenticação personalizada, a chave de API padrão geralmente está vazia ou pode ser encontrada em:

- **Localização**: `~/.n8n/config` (Linux/Mac) ou `%APPDATA%\n8n\config` (Windows)
- **Arquivo**: `credentials.json` ou `config`

Para gerar uma nova chave:

1. Acesse http://localhost:5678
2. Vá em **Settings** → **API**
3. Clique em **Create API Key**
4. Copie a chave gerada

**Para desenvolvimento local sem autenticação**, você pode deixar `N8N_API_KEY` vazio ou usar `""`.

## 🚀 Como Executar

### Opção 1: Iniciar via npm (Instalação Global)

#### Passo 1: Instalar o N8N globalmente

```bash
npm install -g n8n
```

#### Passo 2: Iniciar o N8N

**Windows:**
```bash
scripts\iniciar-n8n-local.bat
```

**Linux/Mac:**
```bash
./scripts/iniciar-n8n-local.sh
```

**Ou manualmente:**
```bash
n8n start
```

O N8N será iniciado em: **http://localhost:5678**

---

### Opção 2: Iniciar via Docker (Recomendado para isolamento)

#### Pré-requisitos Docker

1. **Docker Desktop instalado**
   - Windows/Mac: https://www.docker.com/products/docker-desktop
   - Linux: `sudo apt-get install docker.io docker-compose`

2. **Docker rodando**
   - Verifique: `docker info` ou `docker ps`

#### Passo 1: Usar docker-compose (Recomendado)

**Windows:**
```bash
scripts\iniciar-n8n-docker.bat
```

**Linux/Mac:**
```bash
./scripts/iniciar-n8n-docker.sh
```

**Ou manualmente:**
```bash
docker-compose -f docker-compose.n8n.yml up -d
```

#### Passo 2: Verificar se está rodando

```bash
docker ps | grep n8n
```

#### Passo 3: Acessar o N8N

Abra no navegador: **http://localhost:5678**

**Credenciais padrão:**
- Usuário: `admin`
- Senha: `admin`

⚠️ **Importante:** Altere essas credenciais em produção!

#### Comandos Docker úteis

```bash
# Ver logs do N8N
docker-compose -f docker-compose.n8n.yml logs -f

# Parar o N8N
docker-compose -f docker-compose.n8n.yml down

# Parar e remover volumes (limpa dados)
docker-compose -f docker-compose.n8n.yml down -v

# Reiniciar o N8N
docker-compose -f docker-compose.n8n.yml restart

# Ver status
docker-compose -f docker-compose.n8n.yml ps
```

#### Opção alternativa: Docker direto (sem docker-compose)

```bash
# Iniciar N8N via Docker (Windows)
docker run -it --rm --name n8n-local -p 5678:5678 -v n8n_data:/home/node/.n8n n8nio/n8n:latest

# Iniciar N8N via Docker (Linux/Mac - com timezone)
docker run -it --rm --name n8n-local -p 5678:5678 -e TZ=America/Sao_Paulo -v n8n_data:/home/node/.n8n n8nio/n8n:latest
```

#### Configurações Docker avançadas

Se precisar de configurações customizadas, edite `docker-compose.n8n.yml`:

```yaml
environment:
  - N8N_BASIC_AUTH_USER=seu-usuario
  - N8N_BASIC_AUTH_PASSWORD=sua-senha-segura
  - N8N_HOST=localhost
  - GENERIC_TIMEZONE=America/Sao_Paulo
```

#### Volumes Docker

Os dados do N8N são salvos no volume Docker `n8n_data`. Para backup:

```bash
# Backup do volume
docker run --rm -v n8n_data:/data -v $(pwd):/backup ubuntu tar czf /backup/n8n-backup.tar.gz -C /data .

# Restaurar do backup
docker run --rm -v n8n_data:/data -v $(pwd):/backup ubuntu tar xzf /backup/n8n-backup.tar.gz -C /data
```

---

### Opção 3: Iniciar via npx (Sem instalação global)

```bash
npx n8n start
```

Esta opção baixa o N8N temporariamente, útil para testes rápidos.

### Passo 2 (ou 3 se usou Docker): Verificar se o N8N está rodando

Abra no navegador: **http://localhost:5678**

Você deve ver a interface do N8N.

**Para Docker:** Se usar autenticação básica, login com:
- Usuário: `admin`
- Senha: `admin`

### Passo 3 (ou 4 se usou Docker): Reiniciar o Cursor

Após atualizar o `.kilocode/mcp.json`, **reinicie completamente o Cursor** para que as mudanças sejam carregadas.

1. Feche todas as janelas do Cursor
2. Reabra o Cursor
3. O servidor MCP do N8N será iniciado automaticamente

### Passo 4 (ou 5 se usou Docker): Verificar a Conexão

No Cursor, você pode verificar se o MCP está funcionando:

1. Abra o **Chat do Cursor** (Ctrl+L ou Cmd+L)
2. Pergunte: "Liste os workflows do N8N"
3. Ou: "Crie um novo workflow no N8N"

## 🔍 Troubleshooting

### Problema: "Connection refused" ou "ECONNREFUSED"

**Solução:**
- Verifique se o N8N está rodando: `curl http://localhost:5678/healthz`
- Verifique a porta: o padrão é `5678`, mas pode estar em outra porta
- Atualize `N8N_HOST` no `.kilocode/mcp.json` com a porta correta

### Problema: "Unauthorized" ou erro 401

**Solução:**
- Verifique se `N8N_API_KEY` está correto
- Para N8N local sem autenticação, use `N8N_API_KEY=""`
- Gere uma nova chave em http://localhost:5678/settings/api

### Problema: MCP não aparece no Cursor

**Solução:**
1. Verifique se o arquivo `.kilocode/mcp.json` está na raiz do projeto
2. Verifique a sintaxe JSON (use um validador online)
3. **Reinicie completamente o Cursor** (não apenas recarregue)
4. Verifique os logs do Cursor: Help → Toggle Developer Tools → Console

### Problema: "Command not found: npx"

**Solução:**
- Instale Node.js novamente ou atualize: https://nodejs.org/
- Verifique se `npx` está no PATH: `which npx` (Linux/Mac) ou `where npx` (Windows)

## 📝 Exemplos de Uso

### Listar Workflows

No chat do Cursor, pergunte:
```
Liste todos os workflows do N8N
```

### Criar um Workflow

```
Crie um workflow no N8N que:
- Recebe um webhook
- Envia um email
- Salva os dados no banco
```

### Atualizar um Workflow

```
Atualize o workflow "meu-workflow" para incluir uma etapa de validação
```

## 🔐 Segurança

⚠️ **Importante para Produção:**

- Nunca commit o arquivo `.env.local` com chaves de API
- Use variáveis de ambiente diferentes para desenvolvimento e produção
- Para N8N em produção, configure autenticação adequada
- Rotacione as chaves de API regularmente

## 📚 Recursos Adicionais

- [Documentação N8N](https://docs.n8n.io/)
- [N8N Workflow Builder MCP](https://github.com/salacoste/mcp-n8n-workflow-builder)
- [Model Context Protocol](https://modelcontextprotocol.io/)

## 🔄 Atualização

Para atualizar o servidor MCP do N8N:

```bash
npm update -g @kernel.salacoste/n8n-workflow-builder
```

Ou se instalou localmente:

```bash
npm update @kernel.salacoste/n8n-workflow-builder
```

---

**Última atualização:** 2025-01-XX  
**Versão:** 1.0.0

