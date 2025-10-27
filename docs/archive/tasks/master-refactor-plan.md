# Master Refactor Plan – RevalidaFlow

Este plano organiza o trabalho de médio prazo em fases, priorizando a maturidade do fluxo de simulação com IA e a modularização do backend.

## Fase 1 — Fluxo IA (em andamento)
- [ ] **SimulationViewAI.vue → < 500 linhas**: aplicar o plano detalhado em `docs/tasks/simulation-view-ai-refactor.md`, com foco em:
  - [ ] Reutilizar composables existentes (`useSimulationSession`, `useSimulationWorkflow`, `useSimulationPEP`, `useEvaluation`, `useSimulationData`, `useImagePreloading`).
    - [x] `useSimulationSession` integrado para carregar estação/checklist/duração.
    - [x] `useSimulationWorkflowStandalone` criado e conectado no fluxo IA.
    - [ ] Extrair PEP, avaliação e liberação de materiais para composables compartilhados.
  - [ ] Criar `useSimulationAiChat` encapsulando integração com Gemini, heurísticas de liberação e estado específico da IA.
  - [ ] Extrair módulo `useSpeechInteraction` para reconhecimento/síntese de voz com VAD.
  - [ ] Substituir template por componentes já existentes (`SimulationControls`, `CandidateContentPanel`, `CandidateChecklist`, `CandidateImpressosPanel`, `SimulationSidebar`, `ImageZoomModal`) sem alterar o layout aprovado do fluxo IA.
  - [ ] Padronizar logs/feedbacks, remover `document.write`, documentar fluxo IA atualizado.
  - [ ] Adicionar testes unitários/integrados cobrindo chat IA, liberação de material, avaliação automática.
  - [x] Implementar requisitos funcionais recentes: timer visível, timeout de gravação de 30 s, ícones atualizados.

## Fase 2 — Convergência dos fluxos humano e IA
- [ ] Revisitar `SimulationView.vue` após estabilizar a etapa IA para extrair o mesmo conjunto de subcomponentes/composables.
- [ ] Mapear diferenças funcionais entre os dois modos e documentar regras compartilhadas vs. específicas.
- [ ] Garantir que ajustes nos composables suportem ambos cenários sem bifurcações excessivas.

## Fase 3 — Modularização do backend (não iniciado)
- [ ] Fatiar `backend/server.js` em camadas (`controllers/`, `socket/handlers/`, `services/`), preservando contratos.
- [ ] Dividir `backend/routes/aiChat.js` e correlatos em serviços reutilizáveis (sem alterar endpoints/payloads).
- [ ] Completar adoção do `services/logger.js` nas rotas/utilitários restantes (ex.: `routes/aiSimulation.js`, scripts).
- [ ] Adicionar testes unitários para serviços críticos (cache, AI provider, PEP evaluation).

## Fase 4 — Componentes de grande porte no frontend
- [ ] Planejar refatoração de `EditStationView.vue` em submódulos (editor, previews, histórico).
- [ ] Repetir abordagem para `AdminUpload.vue`, `questoes.vue` e demais arquivos identificados como grandes.
- [ ] Revisar guidelines em `docs/architecture` e alinhar a ownership por feature.

## Fase 5 — Cobertura de testes e infraestrutura
- [ ] Preencher `tests/unit` e `tests/integration` (composables, fluxos IA/humano).
- [ ] Atualizar `tests/setup.js` com mocks de navegador/voz/IA.
- [ ] Garantir que o pipeline CI execute `npm run test` e Playwright para cenários essenciais.
- [ ] Manter documentado em `docs/testing` o status de cobertura mínima antes de deploy.

## Sprints priorizadas

### Sprint 2 — Backend modularizado & observabilidade
- **Objetivo**: reduzir o monólito `server.js`/`aiChat.js` e finalizar a adoção do logger central.
- **Backlog sugerido**:
  1. Executar P1-B01/P1-B03 – mover endpoints HTTP para `backend/controllers/` mantendo contratos e testes (~24h).
  2. Executar P1-B02 – fatiar `routes/aiChat.js` em serviços (`chatService`, `materialRelease`, `promptBuilder`) (~20h).
  3. Concluir migração para `services/logger.js` nos utilitários/rotas remanescentes e definir `LOG_LEVEL` por ambiente (~8h).
  4. Parametrizar métricas no Sentry (spans Firestore/Gemini) e documentar `SENTRY_TRACES_SAMPLE_RATE` (3h).
  5. Adicionar testes unitários para os novos serviços (cache/logging/prompt) e ajustar integração existentes (8h).

### Sprint 3 — Refatoração SimulationViewAI e reconexão
- **Objetivo**: consolidar fluxo IA com componentes reutilizáveis e UX resiliente.
- **Backlog sugerido**:
  1. Concluir tarefas pendentes da Fase 1 (extrações, `useSimulationAiChat`, `useSpeechInteraction`).
  2. Reaproveitar componentes do fluxo humano e remover duplicações no template IA.
  3. Introduzir persistência via Pinia (eliminando `sessionStorage` crítico).
  4. Implementar feedback de reconexão/auto-ready em `useSimulationSocket` e criar testes Vitest + Playwright.
  5. Atualizar `docs/analysis/FRONTEND_EXECUTIVE_SUMMARY.md` e `docs/tasks/simulation-view-ai-refactor.md` com a nova arquitetura.

## Próximos passos imediatos
1. **Kickoff Sprint 2**: quebrar `server.js` em módulos (`controllers/`, `socket/handlers/`) preparando terreno para testar extrações.
2. **Consolidar logger**: mapear arquivos restantes com `console.*`, migrá-los para `services/logger.js` e definir política de nível (`LOG_LEVEL`, `LOG_NAMESPACE`).
3. **Planejar reconexão no frontend**: levantar requisitos de UX/técnicos para a Sprint 3 (estado persistido, toasts, testes E2E) e atualizar `docs/tasks/simulation-view-ai-refactor.md` com dependências.
