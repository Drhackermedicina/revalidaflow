# Análise Completa: `SimulationViewAI.vue`

**Data da Análise**: 26 de outubro de 2025
**Autor**: Gemini
**Propósito**: Gerar um relatório técnico detalhado sobre o componente `SimulationViewAI.vue`, suas funções, arquitetura, interações com o backend e infraestrutura, e identificar pontos de melhoria.

---

## 1. Visão Geral e Finalidade

O `SimulationViewAI.vue` é o componente central da funcionalidade de **Treinamento com IA** do RevalidaFlow. Sua principal finalidade é proporcionar uma experiência de simulação de estação clínica onde o usuário (candidato) interage com um **paciente virtual totalmente controlado por Inteligência Artificial (Google Gemini)**.

Diferente do `SimulationView.vue` (que gerencia a interação entre dois humanos), esta versão é *standalone*, ou seja, não depende de uma conexão WebSocket em tempo real com outro usuário. Todo o fluxo de conversa, liberação de materiais e avaliação é gerenciado através de chamadas HTTP para um backend Node.js que, por sua vez, se comunica com a API do Gemini.

## 2. Arquitetura e Funcionamento Interno

O componente é um **monólito de mais de 2.600 linhas**, concentrando uma vasta gama de funcionalidades. A análise dos documentos `docs/tasks/simulation-view-ai-refactor.md` e `docs/analysis/FRONTEND_EXECUTIVE_SUMMARY.md` confirma que a refatoração deste arquivo é uma tarefa de alta prioridade.

### 2.1. Composables e Gerenciamento de Estado

O componente utiliza composables para modularizar parte de sua lógica, uma prática que já foi iniciada:

-   **`useSimulationSession.js`**: Utilizado para carregar os dados essenciais da estação clínica (`stationData`, `checklistData`) do Firestore. Ele também configura a duração da simulação.
-   **`useSimulationWorkflowStandalone.js`**: Uma versão adaptada do `useSimulationWorkflow` para operar sem a necessidade de um socket. Ele gerencia o ciclo de vida da simulação localmente:
    -   Estado de "pronto" (`myReadyState`).
    -   Início e fim da simulação (`simulationStarted`, `simulationEnded`).
    -   Controle do timer (`timerDisplay`) de forma autônoma.

### 2.2. Fluxo da Simulação com IA

1.  **Preparação**: O usuário clica em "Estou Pronto", o que inicia uma contagem regressiva de 3 segundos.
2.  **Início da Simulação**: O timer principal começa, e o sistema de reconhecimento de voz é ativado.
3.  **Interação via Voz e Texto**:
    -   **Voz (Padrão)**: O componente usa a API de `SpeechRecognition` do navegador para transcrever a fala do usuário em tempo real. Possui um sistema de **Detecção de Atividade de Voz (VAD)** que para a gravação após 2 segundos de silêncio e envia a mensagem automaticamente.
    -   **Texto**: O usuário pode desativar o modo de gravação automática e enviar mensagens digitadas.
4.  **Processamento da IA (Backend)**: A mensagem do usuário é enviada para o endpoint `POST /ai-chat/chat`. O backend constrói um prompt detalhado para o Gemini, incluindo o roteiro do paciente, o histórico da conversa e o contexto da estação, e retorna a resposta da IA.
5.  **Síntese de Voz**: A resposta da IA é falada usando a API `SpeechSynthesis` do navegador, com uma voz selecionada dinamicamente com base no sexo e idade extraídos do roteiro do paciente.
6.  **Liberação de Materiais (Impressos)**: A lógica para liberar impressos é complexa e baseada em heurísticas. A função `findSpecificMaterial` analisa a mensagem do usuário e o conteúdo de todos os impressos disponíveis, calcula um "score de compatibilidade" e libera o material com o maior score, desde que ultrapasse um limiar de 20%.
7.  **Fim da Simulação**: Ao final do tempo (ou com encerramento manual), a simulação é finalizada e o PEP (checklist) é liberado para o candidato.
8.  **Avaliação Automática**: O componente envia o histórico completo da conversa e o checklist para o endpoint `POST /ai-chat/evaluate-pep`. O backend usa o Gemini para analisar a performance do candidato e retorna uma avaliação preenchida, que é exibida na tela.

## 3. Interação com o Backend (Node.js / Cloud Run)

A comunicação é feita via HTTP para o backend Node.js, que está configurado para rodar no Google Cloud Run. O arquivo principal no backend para essa funcionalidade é o `backend/routes/aiChat.js`.

### Endpoints Principais:

-   `POST /ai-chat/chat`:
    -   Recebe a mensagem do usuário, o histórico da conversa e os dados da estação.
    -   Constrói um prompt robusto para o Gemini, instruindo-o a agir como o paciente virtual, usando apenas as informações do roteiro.
    -   Implementa uma lógica de **rotação de chaves de API** para gerenciar cotas de uso do Gemini.
    -   Retorna a resposta gerada pela IA.

-   `POST /ai-chat/evaluate-pep`:
    -   Recebe o histórico completo da conversa e a estrutura do checklist (PEP).
    -   Constrói um prompt instruindo a IA a atuar como um avaliador médico sênior.
    -   Pede à IA para preencher o checklist, fornecendo uma pontuação e uma justificativa para cada item, retornando o resultado em formato JSON.
    -   Possui uma lógica de validação e fallback para garantir que a resposta seja sempre um JSON válido.

## 4. Infraestrutura e Dependências

-   **Firebase**:
    -   **Firestore**: Utilizado para ler a coleção `estacoes_clinicas` e obter todos os dados necessários para a simulação. As avaliações geradas pela IA são salvas na coleção `avaliacoes_ai`.
    -   **Authentication**: O `currentUser.accessToken` é usado para autorizar as requisições ao backend, que por sua vez valida o token com o Firebase Admin SDK.
    -   **Hosting**: O frontend é hospedado no Firebase Hosting, com regras de cache e uma Política de Segurança de Conteúdo (CSP) configurada no `firebase.json`.

-   **Cloud Run**: O backend Node.js é containerizado (via `Dockerfile`) e implantado no Cloud Run, o que permite escalabilidade automática.

-   **Build (Vite)**: O arquivo `config/vite.config.js` define otimizações importantes:
    -   **`drop_console: true`**: Remove `console.log` em produção para reduzir custos de logging no Cloud Run.
    -   **`manualChunks`**: Estratégia de divisão de código para otimizar o carregamento, separando bibliotecas (Vue, Vuetify, Firebase) e funcionalidades (simulação, admin) em arquivos diferentes.

## 5. Análise Crítica e Pontos de Melhoria

Conforme documentado em `docs/tasks/simulation-view-ai-refactor.md`, o componente possui débitos técnicos significativos:

1.  **Componente Monolítico**: Com quase 3.000 linhas, o arquivo é extremamente difícil de ler, manter e depurar. Ele mistura lógica de UI, gerenciamento de estado, interações com API e manipulação de dados complexos.
2.  **Duplicação de Lógica**: Muita da lógica de gerenciamento de sessão (timer, dados da estação) é uma recriação do que já existe nos composables da simulação humana (`SimulationView.vue`), embora uma refatoração parcial já tenha começado a unificar isso.
3.  **Lógica de Negócio Complexa no Frontend**: Funções como `findSpecificMaterial` contêm heurísticas complexas e dicionários médicos que seriam mais adequados e testáveis no backend.
4.  **Acoplamento Elevado**: A lógica de voz, chat e avaliação está fortemente acoplada, tornando impossível testar ou reutilizar qualquer uma delas de forma isolada.
5.  **Falta de Testes**: A estrutura atual impede a criação de testes unitários ou de integração eficazes.

## 6. Conclusão e Recomendações

O `SimulationViewAI.vue` é uma das funcionalidades mais inovadoras e complexas do RevalidaFlow, oferecendo um valor imenso aos usuários. No entanto, seu estado técnico atual representa um risco para a manutenibilidade e evolução do projeto.

**Recomendações:**

1.  **Priorizar a Refatoração**: É crucial seguir o plano detalhado em `docs/tasks/simulation-view-ai-refactor.md`.
2.  **Extrair Lógica para Composables**:
    -   Criar `useSimulationAiChat` para encapsular a lógica de chat com Gemini.
    -   Criar `useSpeechInteraction` para isolar o reconhecimento e a síntese de voz.
    -   Reutilizar e adaptar `useSimulationPEP` e `useEvaluation` para o fluxo de IA.
3.  **Componentizar a UI**: Substituir o template monolítico por componentes reutilizáveis já existentes, como `CandidateContentPanel`, `CandidateChecklist`, e `SimulationControls`.
4.  **Mover Heurísticas para o Backend**: A lógica de decisão para liberação de materiais deveria ser movida para o backend, simplificando o frontend e permitindo melhorias na IA de forma centralizada.
5.  **Adicionar Testes**: Após a refatoração, criar testes unitários para os novos composables e testes de integração para o fluxo completo.

A execução deste plano de refatoração transformará o `SimulationViewAI.vue` em um módulo robusto, testável e fácil de manter, alinhado com as melhores práticas do restante do projeto.
