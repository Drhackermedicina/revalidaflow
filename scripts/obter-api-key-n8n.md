# Como obter a API Key do N8N

Para listar workflows via API ou usar o MCP, você precisa de uma API Key:

## Passo 1: Acessar o N8N
1. Abra http://localhost:5678 no navegador
2. Faça login:
   - Usuário: `admin`
   - Senha: `admin`

## Passo 2: Criar API Key
1. Vá em **Settings** (⚙️) no menu lateral
2. Clique em **API**
3. Clique em **Create API Key**
4. Dê um nome (ex: "MCP-Key")
5. Copie a chave gerada

## Passo 3: Atualizar configuração MCP
Atualize o arquivo `.kilocode/mcp.json`:

```json
"n8n-local": {
  "command": "npx",
  "args": [
    "-y",
    "@kernel.salacoste/n8n-workflow-builder"
  ],
  "env": {
    "N8N_HOST": "http://localhost:5678/api/v1",
    "N8N_API_KEY": "cole-sua-api-key-aqui"
  }
}
```

## Passo 4: Testar via Terminal
```bash
# Substitua YOUR_API_KEY pela chave gerada
curl -H "X-N8N-API-KEY: YOUR_API_KEY" http://localhost:5678/api/v1/workflows
```

## Alternativa: Usar o Chat do Cursor
No chat do Cursor (Ctrl+L), pergunte:
- "Liste os workflows do N8N"
- O MCP fará a conexão automaticamente se a API key estiver configurada




