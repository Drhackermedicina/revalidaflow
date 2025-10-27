# Frontend Executive Summary – REVALIDAFLOW

**Analysis Date**: 2025-10-21  
**Scope**: `src/pages/`, `src/composables/`, `src/components/`, `src/plugins/`, stores e serviços Vue  
**Pages Contadas**: 27 (conforme `npm run update-prd`)

---

## ✅ Evolução Desde 2025-10-14
- **RBAC completo**: `userStore` busca `role` + `permissions` no Firestore e expõe helpers (`isAdmin`, `canManageUsers`, etc.). UIDs hardcoded foram removidos.
- **Integração com backend seguro**: chamadas (`useSimulationSocket`, `useAdminAuth`, `useAuthPermissions`) alinham-se aos novos middlewares.
- **Testes**: diretório `tests/unit/` ganhou cenários (`useChatMessages`, `useSimulationWorkflow`, `useUserPresence`) e há integrações em `tests/integration/` cobrindo endpoints críticos.
- **Build**: `config/vite.config.js` aplica `drop_console` em produção, manual chunks e aliases padronizados; diretório `genkit/` preparado para flows MCP.

---

## 🎯 Estado Atual

| Pilar             | Score (0-10) | Observações                                                                                |
|-------------------|--------------|-------------------------------------------------------------------------------------------|
| Arquitetura       | **6/10**     | Composables bem distribuídos, porém páginas principais voltaram a crescer (>1.5 k linhas). |
| Experiência       | **7/10**     | Fluxos de simulação e chat sólidos; ausência de fallback reconectivo completo.           |
| Desempenho        | **6/10**     | Virtual scroll + caching local; bundle segue grande sem análise recente.                 |
| Testes            | **5/10**     | Suite inicial presente; falta cobertura para autenticação, layouts e SimulationViewAI.   |
| Prontidão Geral   | **6.5/10**   | Pronto para uso interno/controlado; precisa modularização e melhorias de UX resiliente.  |

---

## ✅ Pontos Fortes
- **Organização por domínio**: `src/composables` subdividido (simulation, station, chat, dashboard, auth).  
- **Plugins isolados**: `firebase.js`, `socket.js`, `sentry.js`, `privateChatListener.js` e `router/` centralizam integrações.  
- **Serviços AI**: `geminiService.js` com pool de chaves, fallback, caching em memória e testes dedicados.  
- **UI responsiva**: Vuetify 3, temas (`useAppTheme` / `useThemeConfig`), lazyload, skeletons (`StationSkeleton`).  
- **Novas verticais**: páginas `DescriptiveQuestionsList.vue` e `EditQuestaoView.vue` alinhadas aos serviços discursivos.

---

## ⚠️ Principais Riscos e Débts

1. **Páginas gigantes**
   - `SimulationViewAI.vue` **2 694 → ~400 linhas (✅ REATORADO)**; `SimulationView.vue` **1 588** linhas.
   - Consequência: Manutenção do `SimulationViewAI` agora é significativamente mais simples. O débito técnico principal foi resolvido, embora `SimulationView.vue` continue grande.
   - Ação: Aplicar o mesmo padrão de refatoração para `SimulationView.vue`.

2. **Dependência de `sessionStorage`**  
   - Usado para `sequentialSession`, `selectedCandidate`, timers.  
   - Problema: estado volátil; dificulta reconexão e múltiplas abas.  
   - Ação: migrar para Pinia persistida + sincronização com backend.

3. **Recuperação de conexão parcial**  
   - `useSimulationSocket` detecta disconnects, mas não restaura automaticamente estados (ready/timer).  
   - Ação: implementar reconexão automática, toasts de status e testes E2E.

4. **Controle de erros disperso**  
   - Diversos `try/catch` com `console.error` direto.  
   - Ação: usar `utils/logger.js` + central de notificações para feedback consistente.

5. **Performance sem monitoramento**  
   - Falta análise do bundle pós-refatorações; `SimulationView` carrega muitos componentes.  
   - Ação: gerar bundle report, aplicar lazy load e medir impacto.

---

## Estrutura Mais Relevante

- **Páginas**: `SimulationView.vue`, `SimulationViewAI.vue`, `AdminUpload.vue`, `EditStationView.vue`, `DescriptiveQuestionsList.vue`, `pagamento.vue`.  
- **Composables recentes**: `useSimulationWorkflowStandalone`, `useAuthPermissions`, `useDescriptiveEvaluation`.  
- **Stores**: `userStore.js` (roles/perms), `privateChatStore.js`, `notificationStore.js`.  
- **Plugins**: `privateChatListener.js` garante sync em background; `socket.js` injeta headers (`sessionId`, `userRole`).  
- **Scripts auxiliares**: `scripts/` para rodar testes, substituir consoles e virtualizar seções grandes.

---

## Métricas Atualizadas

| Item                           | Quantidade |
|--------------------------------|------------|
| Páginas (`src/pages`)          | 27         |
| Componentes (`src/components`) | 42         |
| Composables (`src/composables`)| 45         |
| Services (`src/services`)      | 9          |
| Stores (Pinia)                 | 3          |

*(Fonte: `docs/.prd-metadata.json`, atualizado em 2025-10-21)*  

---

## Próximos Passos Recomendados

1. **Executar refatoração planejada da SimulationViewAI**  
   - Extrair `useSimulationAiChat`, `useSpeechInteraction`, `Candidate*` para componentes compartilhados.  
   - Reaproveitar composables do fluxo humano.

2. **Criar camada de persistência com Pinia Plugins**  
   - Mover `sessionStorage` para stores persistidos.  
   - Sincronizar estado com backend (SessionIntegration).

3. **Melhorar UX de reconexão**  
   - Mostrar status claro, botão “Tentar reconectar”, reaplicar `myReadyState`/timer após reconexão.  
   - Cobrir cenários com testes Playwright.

4. **Auditoria de acessibilidade**  
   - Padronizar `aria-labels`, foco visível, navegação por teclado nos painéis modais.  
   - Documentar guidelines em `docs/guides/FRONTEND_NOTES.md`.

5. **Cobertura de testes adicionais**  
   - Criar specs para `useAuthPermissions`, `useSimulationSocket` e componentes críticos (`SimulationControls`).  
   - Adicionar snapshot tests para `DescriptiveQuestionsList`.

Com essas ações, o frontend pode recuperar o score 7+/10 e reduzir o esforço de manutenção dos fluxos IA/humano.
