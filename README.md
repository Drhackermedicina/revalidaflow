# REVALIDAFLOW

Bem-vindo ao REVALIDAFLOW, um aplicativo para estudantes de medicina focado em simulações de estações clínicas em tempo real.

## 🎯 Visão Geral do Projeto

Este projeto é um monorepo que contém o frontend (Vue.js) e o backend (Node.js). O objetivo principal é fornecer uma plataforma interativa para o treinamento de estações clínicas, permitindo simulações entre dois usuários (ator/avaliador e candidato).

Para uma visão detalhada da arquitetura, funcionalidades e desafios do projeto, consulte o arquivo `docs/guides/PROJECT_OVERVIEW.md`.

## 📁 Estrutura Organizada do Projeto

O projeto foi recentemente reorganizado para melhorar a manutenção e escalabilidade:

```
REVALIDAFLOW/
├── backend/                 # Backend (Node.js + Express)
│   ├── config/              # Configurações do backend
│   ├── docs/                # Documentação do backend
│   ├── routes/              # Rotas da API
│   ├── scripts/             # Scripts de deploy
│   ├── utils/               # Funções utilitárias
│   └── ...                  # Outros arquivos do backend
├── config/                  # Configurações gerais do projeto
├── docs/                    # Documentação completa do projeto (organizada)
│   ├── architecture/        # Arquitetura do projeto
│   ├── composables/         # Documentação dos composables
│   ├── development/         # Guias de desenvolvimento
│   ├── guides/              # Guias gerais
│   ├── testing/            # Documentação de testes
│   └── README.md            # Documentação da pasta docs
├── public/                  # Arquivos públicos do frontend
├── scripts/                 # Scripts de desenvolvimento
├── src/                     # Código fonte do frontend (Vue.js)
├── tests/                   # Testes automatizados
├── .roo/                    # Regras para agentes AI
├── .vscode/                 # Configurações do VS Code
├── auto-imports.d.ts        # Tipos auto-gerados
├── components.d.ts          # Tipos de componentes
├── index.html               # Ponto de entrada HTML
├── package-lock.json        # Bloqueio de versões
├── package.json             # Dependências e scripts
└── README.md                # Este arquivo
```

Para detalhes completos da estrutura, consulte:
- `docs/architecture/ESTRUTURA_ATUAL.md` - Estrutura detalhada do projeto
- `docs/architecture/ESTRUTURA_ORGANIZADA.md` - Documentação da organização
- `docs/README.md` - Documentação completa da pasta docs

## 🚀 Como Configurar e Rodar o Projeto

### 📋 Pré-requisitos

*   Node.js (versão 16 ou superior)
*   npm (gerenciador de pacotes do Node.js)
*   Firebase CLI (para interagir com o Firebase)

### ⚙️ Configuração Inicial

1.  **Clone o Repositório:**
    ```bash
    git clone <URL_DO_SEU_REPOSITORIO>
    cd REVALIDAFLOW/FRONTEND E BACKEND
    ```

2.  **Instale as Dependências do Frontend:**
    ```bash
    npm install
    ```

3.  **Instale as Dependências do Backend:**
    ```bash
    cd backend
    npm install
    cd ..
    ```

4.  **Configuração do Firebase:**
    *   Certifique-se de ter um projeto Firebase configurado com Firestore e Hosting ativados.
    *   Faça login no Firebase CLI:
        ```bash
        firebase login
        ```
    *   Associe seu projeto local ao projeto Firebase:
        ```bash
        firebase use --add <SEU_PROJECT_ID_FIREBASE>
        ```

### ▶️ Rodar o Projeto Localmente

1.  **Rodar o Frontend:**
    ```bash
    npm run dev
    ```
    O frontend estará disponível em `http://localhost:5173`

2.  **Rodar o Backend:**
    ```bash
    cd backend
    npm start
    ```
    O backend estará disponível em `http://localhost:3000`

3.  **Rodar Ambos Simultaneamente (Scripts Personalizados):**
    
    Para facilitar o desenvolvimento, foram criados scripts personalizados:
    
    *   **Windows:** Execute `scripts/iniciar-dev.bat` para iniciar ambos frontend e backend
    *   **Backend apenas:** Execute `scripts/iniciar-backend-local.bat` para iniciar apenas o backend
    
    Estes scripts iniciam os serviços nas portas padrão:
    *   Frontend: `http://localhost:5173`
    *   Backend: `http://localhost:3000`
    
    Para mais detalhes sobre os scripts de desenvolvimento, consulte `docs/development/SCRIPTS_DESENVOLVIMENTO.md`.

## 🧪 Testes

O projeto inclui testes automatizados usando Vitest:

```bash
# Rodar todos os testes
npm test

# Rodar testes interativamente
scripts/rodar-testes.bat
```

### Documentação de Testes
- `docs/testing/TESTES_GUIA_COMPLETO.md` - Guia completo sobre testes
- `docs/development/SCRIPTS_DESENVOLVIMENTO.md` - Scripts de desenvolvimento e testes

Para informações detalhadas sobre como criar e executar testes, consulte a documentação completa em `docs/testing/TESTES_GUIA_COMPLETO.md`.

## 📚 Navegação na Documentação

A documentação está organizada em categorias para facilitar a navegação:

### 🏗️ Arquitetura
- `docs/architecture/` - Estrutura e organização do projeto

### 🧠 Composables
- `docs/composables/` - Documentação dos composables Vue.js

### 🛠️ Desenvolvimento
- `docs/development/` - Guias e scripts de desenvolvimento

### 📖 Guias Gerais
- `docs/guides/` - Visão geral e diretrizes do projeto

### 🧪 Testes
- `docs/testing/` - Documentação completa de testes

Para ver a estrutura completa da documentação, consulte `docs/README.md`.

## 📦 Implantação

Para implantar o frontend no Firebase Hosting e o backend na Google Cloud Run, consulte a documentação específica do Firebase e Google Cloud.

## 🤝 Contribuição

Contribuições são bem-vindas! Por favor, leia:
- `docs/guides/PROJECT_OVERVIEW.md` - Visão geral do projeto
- `docs/development/DEVELOPMENT_HISTORY.md` - Histórico de desenvolvimento
- `docs/guides/AGENTS.md` - Diretrizes para agentes

## 📄 Licença

[Informações sobre a licença, se aplicável]

## 🆘 Suporte

Para suporte, entre em contato com a equipe de desenvolvimento ou consulte a documentação em `docs/`.