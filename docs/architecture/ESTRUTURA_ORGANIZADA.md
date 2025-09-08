# 📁 ESTRUTURA ORGANIZADA DO PROJETO

Este documento descreve a nova estrutura organizada do projeto RevalidaFlow.

## 🗺️ Estrutura Atual Organizada

```
REVALIDAFLOW/
├── backend/                 # Backend (Node.js + Express)
├── config/                  # Arquivos de configuração
├── docs/                    # Documentação do projeto
├── public/                  # Arquivos públicos
├── scripts/                 # Scripts de desenvolvimento
├── src/                     # Frontend (Vue.js)
├── tests/                   # Testes automatizados
├── .roo/                    # Regras para agentes AI
├── .vscode/                 # Configurações do VS Code
├── auto-imports.d.ts        # Tipos auto-gerados
├── components.d.ts          # Tipos de componentes
├── index.html               # Ponto de entrada HTML
├── package-lock.json        # Bloqueio de versões
├── package.json             # Dependências e scripts
└── README.md                # Documentação principal
```

## 📁 Detalhamento das Pastas

### 📁 `backend/`
Contém todo o código do backend, incluindo:
- `server.js` - Servidor principal
- `cache.js` - Sistema de cache
- Scripts de deploy
- Rotas da API

### 📁 `config/`
Arquivos de configuração do projeto:
- `.eslintrc.cjs` - Configuração do ESLint
- `.gitignore` - Arquivos ignorados pelo Git
- `tsconfig.json` - Configuração do TypeScript
- `vite.config.js` - Configuração do Vite
- Arquivos de configuração do Firebase

### 📁 `docs/`
Toda a documentação do projeto:
- `PROJECT_OVERVIEW.md` - Visão geral do projeto
- `ESTRUTURA_ATUAL.md` - Estrutura detalhada
- `COMPOSABLES_DOCUMENTACAO.md` - Documentação de composables
- `SCRIPTS_DESENVOLVIMENTO.md` - Guia de scripts
- Outros documentos de suporte

### 📁 `public/`
Arquivos públicos servidos diretamente:
- Assets estáticos
- Ícones
- Manifestos

### 📁 `scripts/`
Scripts de desenvolvimento e utilitários:
- `iniciar-dev.bat` - Inicia frontend e backend
- `rodar-testes.bat` - Executa testes
- Scripts de utilidade variada

### 📁 `src/`
Código fonte do frontend (Vue.js):
- Componentes
- Composables
- Páginas
- Serviços
- Stores

### 📁 `tests/`
Testes automatizados:
- `unit/` - Testes unitários
- `integration/` - Testes de integração
- `e2e/` - Testes end-to-end

## 🎯 Benefícios da Nova Estrutura

✅ **Organização Clara** - Cada tipo de arquivo tem seu lugar apropriado
✅ **Fácil Navegação** - Menos arquivos na raiz facilita encontrar o que precisa
✅ **Manutenção Simples** - Saber onde cada tipo de arquivo está localizado
✅ **Escalabilidade** - Estrutura pronta para crescer sem ficar confusa
✅ **Padronização** - Segue boas práticas da indústria

Esta estrutura torna o projeto muito mais profissional e fácil de manter!