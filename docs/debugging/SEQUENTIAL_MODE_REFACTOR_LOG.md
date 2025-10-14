# Refatoração Modo Sequencial — Diário Técnico

## 1. Diagnóstico Inicial (concluído)
- Revisão completa de `src/composables/useSequentialMode.js`, `useSequentialNavigation.js`, `useSimulationSession.js`, `useSimulationSocket.js` e `src/pages/SimulationView.vue`.
- Inspeção do backend em `backend/server.js`, focando no fluxo `ACTOR_ADVANCE_SEQUENTIAL` ➜ `SERVER_SEQUENTIAL_ADVANCE`.
- Conclusão: cada estação gera `sessionId` próprio; ator e candidato caminham para sessões diferentes após a primeira estação. Navegação usa `window.open`/`window.location`, sem persistir `sessionId`. Backend não envia `sessionId` no evento de avanço, forçando clientes a criar um novo.

## 2. Próximos Passos
- Tornar o `sessionId` único para toda a sequência e persistir no `sessionStorage`.
- Garantir que eventos socket usem e propaguem o mesmo `sessionId`.
- Refatorar navegação para evitar múltiplas conexões simultâneas e preparar reconexão consistente.

## 3. Refatoração em Andamento
- Ajustado `useSequentialMode` para gerar `sharedSessionId` reaproveitado em todas as estações e registrar no `sessionStorage`.
- Atualizado `useSequentialNavigation` para transportar o `sessionId` compartilhado, emitir `ACTOR_ADVANCE_SEQUENTIAL` com esse identificador e navegar via `router.push` mantendo `autoReady=false`.
- Backend agora propaga `sessionId` no evento `SERVER_SEQUENTIAL_ADVANCE`, atualizando metadados da sessão sequencial.
- `SimulationView.vue` sincroniza o `sessionId` recebido, persiste em `sessionStorage`, navega sem gerar IDs diferentes e removeu o uso duplicado de `useSimulationSocket`.
