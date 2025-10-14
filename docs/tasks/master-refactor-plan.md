# Master Refactor Plan – RevalidaFlow

Este plano organiza o trabalho de médio prazo em fases, priorizando a migração primeiro da experiência de simulação com IA e alinhando esforços futuros no frontend e backend.

## Fase 1 — Fluxo IA (em andamento)
- [ ] **SimulationViewAI.vue → < 500 linhas**: aplicar o plano detalhado em `docs/tasks/simulation-view-ai-refactor.md`, com foco em:
  - [ ] Reutilizar composables existentes (`useSimulationSession`, `useSimulationWorkflow`, `useSimulationPEP`, `useEvaluation`, `useSimulationData`, `useImagePreloading`).
  - [ ] Criar `useSimulationAiChat` encapsulando integração com Gemini, heurísticas de liberação e estado específico da IA.
  - [ ] Extrair módulo `useSpeechInteraction` para reconhecimento/síntese de voz com VAD.
  - [ ] Substituir template por componentes já existentes (`SimulationControls`, `CandidateContentPanel`, `CandidateChecklist`, `CandidateImpressosPanel`, `SimulationSidebar`, `ImageZoomModal`).
  - [ ] Padronizar logs/feedbacks, remover `document.write`, documentar fluxo IA atualizado.
  - [ ] Adicionar testes unitários/integrados cobrindo chat IA, liberação de material, avaliação automática.

## Fase 2 — Convergência dos fluxos humano e IA
- [ ] Revisitar `SimulationView.vue` após concluir a etapa IA para extrair o mesmo conjunto de subcomponentes/composables, minimizando divergência entre os flows.
- [ ] Mapear diferenças funcionais entre os dois modos e documentar regras compartilhadas vs. específicas.
- [ ] Garantir que ajustes nos composables suportem ambos cenários sem bifurcações excessivas.

## Fase 3 — Modularização do backend (não iniciado)
- [ ] Fatiar `backend/server.js` em camadas (`middlewares/`, `controllers/`, `services/`) mantendo contratos atuais das rotas.
- [ ] Dividir `backend/routes/aiChat.js` e correlatos em controllers + serviços reutilizáveis (sem alterar endpoints ou payloads).
- [ ] Introduzir utilitário de logging condicionado a `NODE_ENV` para eliminar `console.log` em produção.
- [ ] Adicionar testes unitários para serviços críticos (cache, AI provider, PEP evaluation).

## Fase 4 — Componentes de grande porte no frontend
- [ ] Planejar refatoração de `EditStationView.vue` (161k linhas) em módulos menores (ex.: editor, previews, histórico), após estabilizar o fluxo IA.
- [ ] Repetir abordagem para `AdminUpload.vue`, `questoes.vue` e demais arquivos identificados como grandes no levantamento (`src/pages/...`).
- [ ] Revisar guidelines em `docs/architecture` e alinhar estrutura de pastas/ownership por feature.

## Fase 5 — Cobertura de testes e infraestrutura
- [ ] Preencher `tests/unit` e `tests/integration` com os novos cenários cobertos (composables, fluxos IA/humano).
- [ ] Atualizar `tests/setup.js` com mocks de navegador/voz/IA.
- [ ] Garantir que o pipeline CI execute `npm run test` e (quando aplicável) cenários e2e essenciais.
- [ ] Manter documentado em `docs/testing` o status de cobertura mínima e execuções necessárias antes de deploy.

## Próximos passos imediatos
1. Seguir com a Fase 1: iniciar pela integração de `useSimulationSession`/`useSimulationWorkflow` em `SimulationViewAI.vue`.
2. Capturar quaisquer obstáculos durante a migração IA e atualizar o plano específico (`docs/tasks/simulation-view-ai-refactor.md`).
3. Quando a Fase 1 estiver estável, revisar este plano e priorizar as tarefas da Fase 2.
