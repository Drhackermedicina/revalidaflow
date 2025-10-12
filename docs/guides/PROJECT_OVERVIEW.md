# Visão Geral do Projeto REVALIDAFLOW

Este documento fornece uma visão geral abrangente do projeto REVALIDAFLOW, detalhando sua arquitetura, funcionalidades, tecnologias utilizadas e desafios atuais.

## 1. Visão Geral e Objetivo

O REVALIDAFLOW é um aplicativo desenvolvido para auxiliar estudantes de medicina na preparação para exames, focando em simulações de estações clínicas em tempo real. Ele permite que dois usuários interajam em um cenário simulado, onde um atua como ator/avaliador e o outro como candidato.

**Tipo de Projeto:** Monorepo contendo um frontend e um backend.
*   **Frontend:** Desenvolvido em Vue.js, hospedado no Firebase Hosting.
*   **Backend:** Desenvolvido em Node.js, localizado na pasta `backend`, hospedado na Google Cloud Run.

## 2. Funcionalidades Principais

### 2.1. Simulação de Estações Clínicas em Tempo Real

*   **Seleção de Estação:** O usuário ator/avaliador escolhe uma estação clínica em `@src/pages/StationList.vue`.
*   **Modo de Estudo:** Possibilidade de visualizar o conteúdo da estação apenas para estudo, sem iniciar uma simulação.
*   **Geração de Link de Convite:** Para iniciar uma simulação, o ator/avaliador gera um link em `@src/pages/SimulationView.vue` e o envia para o candidato.
*   **Experiência do Candidato:** Ao acessar o link, o candidato entra na página de simulação com visualização restrita, vendo apenas o roteiro do ator, os impressos (liberados sob demanda pelo ator/avaliador) e o PEP (Padrão Esperado de Procedimento - a correção da simulação, liberada ao final do tempo ou manualmente).
*   **Duração da Estação:** As estações têm um limite máximo de 10 minutos.

### 2.2. Outras Funcionalidades do Frontend

*   **Ranking e Performance:** Páginas dedicadas para acompanhar o desempenho dos usuários.
*   **Histórico:** Registro das simulações realizadas.
*   **Banco de Questões Comentadas:** Funcionalidade para estudo de questões.
*   **Chat:** Funcionalidade de comunicação entre usuários.
*   **Assistente de Edição com IA (`@src/components/AIFieldAssistant.vue`):** Integrado nos campos de edição em `@src/pages/EditStationView.vue`. Atualmente em testes e precisa de integração da memória na coleção do Firestore (sem índice).
*   **Página de Upload de Estações (`@src/pages/AdminUpload.vue`):** Permite o upload de estações em formato JSON. **Desafio:** Deveria ter uma opção para upload de questões (lógica existente foi removida, mas a coleção no Firebase Storage para questões já existe).
*   **Página de Administração (`@src/pages/AdminView.vue`):** Contém a página de upload e verificação das estações e suas edições. **Desafio:** Problemas de filtragem e inconsistência de dados nos campos da coleção `estacoes_clinicas` no Firestore. O arquivo `adminuploadview.vue` (provavelmente `AdminUpload.vue`) deveria padronizar esses dados.
*   **Página de Pagamentos:** Atualmente inativa e sem redirecionamento.
*   **Buscador de Usuários:** Em desenvolvimento.
*   **Assistente de Agente IA Global (`@src/components/AdminAgentAssistant.vue`):** Tentativa de implementação para auxiliar os editores (administradores).
*   **Integração Gemini Chat:** Desejo de integrar um chat Gemini 2.5 Flash por API Key no botão existente no header da página (atualmente redireciona para gemini.com, a ideia é que abra o chat na própria página).

## 3. Tecnologias Utilizadas

*   **Frontend:** Vue.js
*   **Backend:** Node.js
*   **Banco de Dados:** Google Firestore (coleções `estacoes_clinicas`, `usuarios`)
*   **Armazenamento de Arquivos:** Firebase Storage (para impressos e questões)
*   **Hospedagem Frontend:** Firebase Hosting
*   **Hospedagem Backend:** Google Cloud Run
*   **Autenticação:** Firebase Authentication
*   **Comunicação em Tempo Real:** WebSockets (para simulação)

## 4. Desafios e Problemas Atuais

*   **Gerador de Estações:** Foi retirado deste projeto e movido para um novo projeto, rodando apenas localmente. Isso significa que o "Motor RAG Mestre" e a pasta `backend-python-agent` **NÃO** fazem parte deste projeto.
*   **Custos do Backend:** Gastos excessivos na Cloud Run. Necessidade de otimizar as requisições durante a simulação, especialmente na avaliação (cada avaliação de 15 campos gera uma requisição).
*   **Inconsistência de Dados das Estações:** Problemas de filtragem e padronização de dados na coleção `estacoes_clinicas` no Firestore, especialmente com estações recentes.
*   **Upload de Questões:** A funcionalidade de upload de questões foi removida do `AdminUpload.vue`, mas a coleção no Firebase Storage para questões ainda existe e a lógica deveria ser reintroduzida.
*   **Impressos no Cloud Storage:** Impressos são carregados no Firebase Storage, mas também estão aparecendo em um bucket na Cloud, indicando uma possível duplicação ou configuração incorreta.
*   **Página de Pagamentos:** Inativa e sem redirecionamento.
*   **Buscador de Usuários:** Em desenvolvimento.
*   **Integração Gemini Chat:** Necessidade de implementar o chat diretamente na página, em vez de redirecionar.

## 5. Documentação Atualizada

Para facilitar o entendimento e manutenção do projeto, existe um **sistema completo de documentação viva** com atualização automática.

### 📚 Sistema de Documentação Viva (PRD System)

O projeto possui um sistema automatizado que mantém a documentação sincronizada com o código:

*   **`docs/PRD_REVALIDAFLOW.md`** - Product Requirements Document completo (90+ páginas) com todas as funcionalidades
*   **`docs/FEATURES_TRACKING.md`** - Tracking de features implementadas vs planejadas (13 implementadas, 100%)
*   **`docs/CHANGELOG_PRD.md`** - Histórico de mudanças com versionamento semântico
*   **`docs/COMO_USAR_PRD_SYSTEM.md`** - Guia completo de uso do sistema de documentação
*   **`docs/.prd-metadata.json`** - Metadados auto-gerados (28 páginas, 44 componentes, 44 composables, 9 services, 3 stores)

**Como atualizar:** Execute `npm run update-prd` ou use `/update-prd` no Claude Code

### 🏗️ Documentação de Arquitetura

*   **`docs/architecture/ESTRUTURA_ATUAL.md`** - Estrutura detalhada do projeto (frontend + backend)
*   **`docs/architecture/ESTRUTURA_ORGANIZADA.md`** - Nova organização planejada de pastas

### 🧠 Documentação de Composables

*   **`docs/composables/COMPOSABLES_DOCUMENTACAO.md`** - Documentação resumida de cada composable (44 composables)
*   **`docs/composables/COMPOSABLES_DOCUMENTACAO_COMPLETA.md`** - Documentação completa com código fonte

### ⚙️ Documentação de Desenvolvimento

*   **`docs/development/SCRIPTS_DESENVOLVIMENTO.md`** - Guia completo dos scripts de desenvolvimento e testes
*   **`docs/development/DEVELOPMENT_HISTORY.md`** - Histórico de desenvolvimento

### 🧪 Documentação de Testes

*   **`docs/GUIA_TESTES.md`** - Guia completo de testes (Vitest + Playwright)
*   **`docs/testing/TESTES_GUIA_COMPLETO.md`** - Guia detalhado com exemplos práticos

### 📄 Índice Completo

*   **`docs/README.md`** - Índice completo de TODA a documentação com links organizados por categoria

**Última atualização:** 2025-10-12

## 6. Próximos Passos (Documentação)

Este documento será a base para futuras análises e desenvolvimento. Serão criados outros documentos para detalhar aspectos específicos e registrar o histórico de desenvolvimento.
