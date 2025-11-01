# Jira tasks propostas

1) Consolidar watchers de `simulationEnded` em `SimulationViewAI`
- Descrição: Unificar liberação de PEP, stop de voz, autoavaliação e atualização de status em um único watcher.
- Critérios de aceite: Ordem determinística; sem efeitos duplicados; logs claros.
- Componentes: `src/pages/SimulationViewAI.vue`.

2) Regras Firestore para `avaliacoes_ai`
- Descrição: Atualizar `firestore.rules` para permitir escrita autenticada e exigir campos obrigatórios: `stationId`, `sessionId`, `userId`, `evaluations`, `timestamp`.
- Critérios: Tentativas sem auth ou campos obrigatórios devem ser negadas; requests válidas aceitas.
- Componentes: `firestore.rules`.

3) Refactor UI: extrair Chat/Pré-simulação e mover CSS
- Descrição: Criar `ChatPanel.vue` e `PreSimulationPanel.vue`; mover estilos para `src/assets/styles/simulation-view.scss`.
- Critérios: Render e UX idênticos; view simplificada.
- Componentes: `src/pages/SimulationViewAI.vue`, `src/assets/styles/simulation-view.scss`.

4) Instrumentação Sentry
- Descrição: Instrumentar erros nos fluxos de IA/voz/avaliação conforme `docs/SENTRY_SETUP.md`.
- Critérios: Erros aparecendo no Sentry com contexto (stationId, sessionId, userId quando aplicável).
- Componentes: `SimulationViewAI.vue`, `useAiChat.js`, `useAiEvaluation.js`, `useSpeechInteraction.js`.

5) Testes unitários para AI Simulation
- Descrição: Criar specs para sanitização (chat), timer (pré-simulação), releaseAllPendingMaterials e finalização populando `candidateReceived*`.
- Critérios: Testes passando; sem flakiness; cobertura adequada.
- Componentes: `tests/unit/` (novos), possivelmente `tests/setup.js` para mocks.

