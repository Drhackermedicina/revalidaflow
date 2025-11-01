# feat(ai-sim-view): sanitização de chat, sincronização do timer e cleanup

## Resumo
- Adiciona sanitização de mensagens no `useAiChat` e renderização segura no `SimulationViewAI`.
- Sincroniza `timerDisplay` com `selectedDurationMinutes` antes do início da simulação.
- Habilita botão de prontidão após carregar dados da estação.
- Limpa imports/funções não utilizados e melhora ciclo de vida/cleanup.
- Inclui metadados na submissão de avaliação: `userId`, `stationTitle`, `period`.

## Detalhes
- Segurança: uso de `useChatInput().formatMessageText` na view e no `useAiChat` (candidato, IA e mensagens do sistema).
- Timer: `watch(selectedDurationMinutes, updateTimerDisplayFromSelection)` na view.
- UX: `candidateReadyButtonEnabled` só é habilitado após `loadSimulationData`.
- Navegação: `router.push({ name: 'station-list' })`.
- Cleanup: remoção de `toggleVoiceRecording`, `expandedPanels`, `backendUrl` import na view, `isSpeaking/isInSimulationAiPage`, comentários de `getMessageStyle` e `forceLoadPEP`.
- Watchers: consolidação do `simulationEnded` em um único watcher (finaliza, libera PEP, faz autoavaliação e atualiza status após 5s).

## Testes & Lint
- `npm run lint`: 0 erros (warnings fora do escopo).
- `npm run test`: falhas existentes em middlewares e alguns componentes; não relacionadas a este PR.

## Riscos mitigados
- XSS via `v-html` no chat.
- Inconsistência do timer pré-simulação.
- Cleanup de listeners/lifecycle.

## Próximos passos
- Unificar status watchers por completo (início e fim) se necessário.
- Regras Firestore para `avaliacoes_ai` (ver snippet anexo).
- Extrair Chat e Pré-simulação para componentes e mover CSS para `src/assets/styles/simulation-view.scss`.
- Integrar Sentry em pontos críticos (IA, voz, avaliação).
- Criar testes unitários: sanitização, timer, liberação de materiais, finalização.

## Arquivos alterados
- `src/pages/SimulationViewAI.vue`
- `src/composables/useAiChat.js`

