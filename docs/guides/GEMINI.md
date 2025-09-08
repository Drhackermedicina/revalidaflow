# Contexto do Projeto REVALIDAFLOW para Gemini

Este documento serve como um guia abrangente para o agente Gemini, fornecendo um entendimento aprofundado do projeto REVALIDAFLOW, sua arquitetura, funcionalidades, tecnologias, e convenções de desenvolvimento. Ele consolida informações de vários arquivos de documentação e configuração.

## 1. Visão Geral do Projeto

O REVALIDAFLOW é um aplicativo monorepo focado em simulações de estações clínicas em tempo real para estudantes de medicina. Ele permite a interação entre dois usuários (ator/avaliador e candidato) em cenários simulados. O projeto é dividido em um frontend (Vue.js) e um backend (Node.js).

*   **Frontend:** Desenvolvido em Vue.js, hospedado no Firebase Hosting.
*   **Backend:** Desenvolvido em Node.js, localizado na pasta `backend`, hospedado na Google Cloud Run.

Para uma visão geral mais detalhada das funcionalidades e desafios, consulte `PROJECT_OVERVIEW.md`.

## 2. Estrutura do Projeto e Tecnologias

### 2.1. Estrutura de Pastas

*   **Raiz do Projeto:** Contém arquivos de configuração globais (`package.json`, `firebase.json`, `vite.config.js`), e documentação principal (`README.md`, `PROJECT_OVERVIEW.md`, `DEVELOPMENT_HISTORY.md`).
*   **`src/` (Frontend):** Contém o código-fonte da aplicação Vue.js, organizada em módulos como `components/`, `pages/`, `services/`, `plugins/`, etc. Detalhes adicionais podem ser encontrados em `FRONTEND_NOTES.md`.
*   **`backend/` (Backend):** Contém o código-fonte da aplicação Node.js, com `server.js` como ponto de entrada e rotas definidas em `routes/`. Detalhes adicionais podem ser encontrados em `backend/BACKEND_NOTES.md`.

### 2.2. Tecnologias Principais

*   **Frontend:** Vue.js, Vuetify (framework UI), Pinia (gerenciamento de estado), Vue Router.
*   **Backend:** Node.js, Express.js (inferido), WebSockets (Socket.IO).
*   **Banco de Dados:** Google Firestore (coleções `estacoes_clinicas`, `usuarios`).
*   **Armazenamento de Arquivos:** Firebase Storage.
*   **Hospedagem:** Firebase Hosting (Frontend), Google Cloud Run (Backend).
*   **Autenticação:** Firebase Authentication.
*   **Outros:** Integração com Ollama (via proxy no Vite), Firebase CLI.

## 3. Construção e Execução do Projeto

### 3.1. Pré-requisitos

*   Node.js (versão 16 ou superior)
*   npm
*   Firebase CLI

### 3.2. Comandos Essenciais

Para configurar e rodar o projeto localmente:

*   **Instalação de Dependências (na raiz do projeto):**
    ```bash
    npm install
    cd backend
    npm install
    cd ..
    ```

*   **Rodar o Frontend (na raiz do projeto):**
    ```bash
    npm run dev
    # Ou para desenvolvimento local com proxy para backend local
    npm run dev:local
    ```

*   **Rodar o Backend (na pasta `backend`):**
    ```bash
    npm start
    ```

*   **Build do Frontend (na raiz do projeto):**
    ```bash
    npm run build
    # Para build de produção
    npm run build:prod
    ```

*   **Implantação Firebase (na raiz do projeto):**
    ```bash
    firebase login
    firebase use --add <SEU_PROJECT_ID_FIREBASE>
    firebase deploy
    ```

*   **Testes:**
    ```bash
    npm test
    ```

## 4. Convenções de Desenvolvimento

O projeto segue as seguintes convenções para garantir a qualidade e padronização do código:

*   **Linting e Formatação:**
    *   ESLint (`.eslintrc.cjs`)
    *   Prettier (`.prettierrc.json`)
    *   Stylelint (`.stylelintrc.json`)
*   **Estrutura de Componentes Vue.js:** Segue uma abordagem modular, com componentes bem definidos e uso da Composition API.
*   **Gerenciamento de Estado:** Utiliza Pinia para o gerenciamento de estado global.

## 5. Desafios e Problemas Atuais

Os principais desafios e problemas identificados no projeto incluem:

*   **Custos do Backend:** Gastos excessivos na Google Cloud Run devido à alta frequência de requisições, especialmente durante a avaliação da simulação.
*   **Inconsistência de Dados:** Problemas de filtragem e padronização de dados na coleção `estacoes_clinicas` no Firestore.
*   **Upload de Questões:** A funcionalidade de upload de questões foi removida do `AdminUpload.vue`, mas a coleção no Firebase Storage para questões ainda existe.
*   **Impressos no Cloud Storage:** Duplicação de impressos em um bucket na Cloud além do Firebase Storage.
*   **Integração Gemini Chat:** Necessidade de implementar o chat diretamente na página, em vez de redirecionar para o site oficial.
*   **AIFieldAssistant:** Necessidade de integrar a memória na coleção do Firestore sem índice.

Para mais detalhes sobre esses desafios, consulte os arquivos de documentação específicos (`PROJECT_OVERVIEW.md`, `FRONTEND_NOTES.md`, `backend/BACKEND_NOTES.md`).
