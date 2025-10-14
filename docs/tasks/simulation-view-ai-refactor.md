# SimulationViewAI.vue Refactor Tasks

## Objetivos
- Reduzir `src/pages/SimulationViewAI.vue` para menos de 500 linhas sem perda de funcionalidades.
- Reaproveitar ao máximo a infraestrutura já consolidada em `SimulationView.vue` (composables e componentes).
- Melhorar manutenibilidade, desempenho e cobertura de testes das funcionalidades críticas (chat, voz, PEP, liberação de materiais).

## Principais Problemas Observados
- Componente monolítico (~3 000 linhas) concentrando carregamento de dados, fluxo, IA, voz, UI e estilos em um único arquivo (`src/pages/SimulationViewAI.vue:1`).
- Duplicação de lógica já existente nos composables do fluxo “humano” (`useSimulationSession`, `useSimulationWorkflow`, `useEvaluation`, `useSimulationPEP`, `useSimulationData`) (`src/pages/SimulationViewAI.vue:83-224`, `src/pages/SimulationView.vue:18-276`).
- Histórico do chat mistura formatos (`role`, `sender`, `message`), dificultando reutilização e estilização (`src/pages/SimulationViewAI.vue:260`, `src/pages/SimulationViewAI.vue:429`).
- Heurísticas/dicionários médicos recriados a cada chamada de liberação de material (`src/pages/SimulationViewAI.vue:459-770`).
- Bloco de voz e VAD espalhado sem guards e com timeouts não rastreados, tornando difícil testes ou SSR (`src/pages/SimulationViewAI.vue:1271-1654`).
- Template/CSS replicam componentes já disponíveis (`CandidateContentPanel`, `CandidateChecklist`, `CandidateImpressosPanel`, `SimulationSidebar`) e usam `document.write` para pré-visualização (`src/pages/SimulationViewAI.vue:1047-2660`).
- Logs de debug verbosos (`??`, `?`) despejados em produção (`src/pages/SimulationViewAI.vue:138-1985`).

## Plano de Refatoração

### 1. Reuso de Composables Existentes
- Estado atual: refs duplicadas para `stationData`, `checklistData`, `simulationTimeSeconds`, `timerDisplay`, `selectedDurationMinutes`, `sessionId`, `stationId`, flags de carregamento e erros (`src/pages/SimulationViewAI.vue:30-120`). Todas essas estruturas são fornecidas diretamente por `useSimulationSession`.
- [x] Substituir refs e métodos manuais por `useSimulationSession`, configurando `userRole` como `candidate` e adicionando suporte opcional a "parceiro IA" no composable quando não houver WebSocket (`src/pages/SimulationViewAI.vue:40-140`, `src/composables/useSimulationSession.js`).
- Diagnóstico `useSimulationWorkflow`: depende de `socketRef` conectado para `sendReady`, `handleStartSimulationClick`, `activateBackend` e eventos de timer; exige `partner.value` real e marca `bothParticipantsReady` com base nisso; dispara alertas de erro de socket e atualiza o timer a partir de mensagens do servidor (`src/composables/useSimulationWorkflow.js:45-407`).
- Ajustes necessários para IA:
  - Permitir modo `standalone` sem socket (no-op para `sendReady`, `activateBackend` e handlers).
  - Fornecer parceiro virtual e `partnerReadyState` inicializado como `true`.
  - Garantir que o timer funcione via `setInterval` local quando não houver eventos do backend.
  - Tornar opcionais alertas UI relacionados a falhas de socket/backend.
- [x] Criar variante `useSimulationWorkflowStandalone` específica para o fluxo IA, encapsulando timer local, `sendReady` e `manuallyEndSimulation` (`src/composables/useSimulationWorkflowStandalone.js`, `src/pages/SimulationViewAI.vue:40-210`).
- [ ] Integrar `useSimulationWorkflow` (ou adaptar variante standalone) para gerenciar `myReadyState`, `simulationStarted`, `simulationEnded` e timer, fornecendo adaptador que cria um parceiro virtual sempre pronto e elimina watchers manuais (`src/composables/useSimulationWorkflow.js`).
- [ ] Reutilizar `useSimulationPEP` e `useEvaluation` para marcação do PEP e submissão de notas, extraindo dependências de socket para permitir operação local/IA (ex.: método `submitEvaluationLocal`) (`src/pages/SimulationViewAI.vue:1728-1934`, `src/composables/useSimulationPEP.js`, `src/composables/useEvaluation.js`).
- [ ] Ajustar `useSimulationData` para aceitar uma estratégia de liberação “local” (sem `socket.emit`) e adotá-lo no fluxo IA para manter `releasedData`, `isChecklistVisibleForCandidate` e contadores (`src/pages/SimulationViewAI.vue:394-873`, `src/composables/useSimulationData.js`).
- [ ] Reaproveitar `useImagePreloading` e `ImageZoomModal` para zoom/cache de imagens, removendo implementação paralela e `document.write` (`src/pages/SimulationViewAI.vue:886-1140`, `src/composables/useImagePreloading.js`, `src/components/ImageZoomModal.vue`).

### 2. Composable Específico da IA
- [ ] Consolidar apenas a lógica diferenciadora da IA (histórico, chamadas Gemini, heurísticas de material, controle de fala) em um novo composable `useSimulationAiChat` que dependa dos composables compartilhados para estado base (`src/pages/SimulationViewAI.vue:252-882`).
- [ ] Padronizar o modelo de mensagem com interface única (`role`, `content`, `timestamp`, `meta`) e migrar todas as inserções/leitura do histórico para essa estrutura (`src/pages/SimulationViewAI.vue:260-305`, `src/pages/SimulationViewAI.vue:429-799`).
- [ ] Externalizar `sendMessage`, `processAIResponse`, `shouldReleaseSimple`, `findSpecificMaterial` para módulos testáveis, mantendo dicionários/heurísticas em cache configurável (`src/pages/SimulationViewAI.vue:252-770`).

### 3. Voz e Áudio
- [ ] Isolar reconhecimento e síntese de fala (`initSpeechRecognition`, `startListening`, `stopListening`, `selectVoiceForPatient`, `speakText`) em um composable `useSpeechInteraction`, com guards para ambientes sem `window` e limpeza centralizada de timeouts/VAD (`src/pages/SimulationViewAI.vue:1271-1654`).
- [ ] Injetar callbacks do composable de voz no fluxo IA para retomar gravação automática após respostas e permitir testes com mocks (`src/pages/SimulationViewAI.vue:274-305`, `src/pages/SimulationViewAI.vue:1309-1418`).

### 4. PEP e Avaliação Automática
- [ ] Mover `aiEvaluatePEP`, `autoEvaluatePEPFallback`, `getClassificacaoFromPontuacao` para serviço dedicado reutilizado por `useEvaluation`, validando payload com schema (Zod ou similar) e padronizando mensagens de erro (`src/pages/SimulationViewAI.vue:1728-1934`).
- [ ] Expor API de marcação programática no `useSimulationPEP` (ex.: `setPepItemMarks`) para que a IA aplique as avaliações usando o mesmo mecanismo dos avaliadores reais (`src/composables/useSimulationPEP.js:36-86`).

### 5. Interface e Componentização
- [ ] Substituir markup duplicada por componentes existentes: `CandidateContentPanel`, `CandidateChecklist`, `CandidateImpressosPanel`, `SimulationSidebar`, conectando-os ao estado proveniente dos composables (`src/pages/SimulationViewAI.vue:2060-2660`, `src/components/*.vue`).
- [ ] Reaproveitar `SimulationControls`/`SimulationHeader` sempre que possível, ocultando apenas ações específicas do ator humano (convites, Google Meet) (`src/components/SimulationControls.vue`, `src/components/SimulationHeader.vue`).
- [ ] Remover `window.open` + `document.write`, utilizando modais de pré-visualização já existentes ou rotas dedicadas (`src/pages/SimulationViewAI.vue:1047-1140`).
- [ ] Externalizar estilos restantes para módulos SCSS compartilhados ou estender `simulation-view.scss`, mantendo tokens de design alinhados (`src/pages/SimulationViewAI.vue:2792-3055`).

### 6. Observabilidade e Limpeza
- [ ] Substituir logs de debug soltos por `Logger` (mesma abordagem dos composables) e condicionar saída a `import.meta.env.DEV` (`src/pages/SimulationViewAI.vue:138-1985`, `src/utils/logger.js`).
- [ ] Padronizar feedbacks visuais (snackbars/alerts) reaproveitando `showNotification` e padrões de `SimulationView.vue` (`src/pages/SimulationView.vue:185-204`, `src/pages/SimulationViewAI.vue:303-312`).
- [ ] Documentar fluxo IA atualizado em `docs/guides`, destacando diferenças em relação à simulação com ator humano e instruções de teste.

### 7. Testes e Garantia de Qualidade
- [ ] Cobrir novos composables com testes unitários (`tests/unit/composables/useSimulationAiChat.spec.ts`, `useSpeechInteraction.spec.ts`, etc.).
- [ ] Criar testes de integração validando início automático da simulação IA, chat, liberação de material e avaliação automática (`tests/integration/simulationViewAi.spec.ts`).
- [ ] Atualizar `tests/setup.js` e mocks para APIs de voz/navegador e endpoints Gemini antes de habilitar o pipeline CI.
