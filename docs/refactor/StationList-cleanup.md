# Plano de Limpeza e Refatoração do `StationList.vue`

## 1. Visão Geral Atual
- Arquivo com **~1.2k linhas** concentrando lógica de dados, filtragem, navegação e UI.
- Importa múltiplos composables/componentes (`useStationData`, `useCandidateSearch`, `useSequentialMode`, `useStationNavigation`, `SectionHeroCard`, etc.).
- Controla estado derivado (`currentState`, `selectedMode`, `showSequentialConfig`) com watchers reativos e sincronização via query params (`mode`).
- Contém blocos legacy (comentários extensos, gradientes, classes utilitárias duplicadas) e lógica mista (UI + negócio).

## 2. Dependências Críticas
- **Composables**: `useStationData`, `useStationFilteringOptimized`, `useSequentialMode`, `useCandidateSearch`, `useStationNavigation`, `useUserManagement`.
- **Componentes**: `CandidateSearchBar`, `ModeSelectionCard`, `SequentialConfigPanel`, `SectionHeroCard`, `SelectedCandidateCard`, `AdminUploadCard`.
- **Backend/Navegação**: `stationRepository`, `useStationNavigation` (criação de sessões), rotas `/app/simulation*`, `/app/stations-*`.
- **Armazenamento**: `sessionStorage` (seleção de candidato), `localStorage` (candidatos recentes).

## 3. Objetivo da Refatoração
- Reduzir `StationList.vue` para **< 500 linhas**, extraindo responsabilidades para composables/componentes específicos.
- Eliminar código morto, duplicações, watchers redundantes e `console` logs.
- Manter comportamento: seleção de candidato, modos de treinamento, painel sequencial, contadores de estações.

## 4. Passos Detalhados

### 4.1 Inventário e Limpeza Inicial
1. Mapear estados e watchers usados; remover variáveis não utilizadas.
2. Revisar comentários/pseudo-temas e excluir blocos CSS redundantes (`hero-section-modern`, classes utilitárias não usadas).
3. Padronizar imports (alfabética/modular) e remover componentes não renderizados.

### 4.2 Extração para Composables/Componentes
1. **Estado da UI**: mover lógica de `currentState`, `selectedMode`, `applyRouteState`, watchers correlatos para um novo composable (`useStationListState`).
2. **Controles de filtragem/contagem**: encapsular cálculo de `allStationsForCounts`, `expandFirstSection` num helper.
3. **UI Seletiva**: considerar criação de wrapper para bloco "Modo de Treinamento" (dois `ModeSelectionCard`).
4. Sincronizar rotas/query via composable dedicado (evita duplicação com `StationRevalidaSections.vue`/`StationInepSections.vue`).

### 4.3 Revisão de Dependências
1. Validar chamadas de `useStationNavigation` e `stationRepository` para garantir que extrações não quebrem backend.
2. Confirmar compatibilidade com `useCandidateSearch` (cache local) e ajustar se movermos lógica de sessão.

### 4.4 Testes e Garantia de Qualidade
1. `npm run lint` + `npm run test` (quando aplicável).
2. Navegação manual nas rotas:
   - `/app/station-list` (sem candidato, com candidato, explorar sem seleção).
   - `/app/station-list?mode=simple-training` e `?mode=simulation`.
   - Fluxo de simulação sequencial e acesso aos hubs (`stations-hub`, `stations-inep/revalida`).
3. Validar dark/light mode, responsividade (<768px) e acessibilidade básica (teclado, foco).
4. Conferir integridade das integrações com backend (logs e erros do `useStationNavigation`).

### 4.5 Entregáveis
- `StationList.vue` reorganizado (<500 linhas).
- Novos composables/componentes documentados.
- Atualização deste plano com decisões finais e pontos de atenção remanescentes.

## 5. Riscos e Mitigações
- **Regressão de fluxo** (candidato/mode): manter testes manuais após cada extração.
- **Dependências compartilhadas** (ex.: `useStationData`): verificar se outros arquivos dependem do estado original antes de alterar.
- **Estilos globais**: extração de CSS deve respeitar tokens em `modern-tokens.scss` para evitar inconsistências.

## 6. Próximos Passos
1. Implementar limpeza inicial + remoção de CSS/JS redundante.
2. Criar composables/componentes conforme seções 4.2/4.3.
3. Realizar testes e atualizar resultados nesta documentação.

## 7. Execução (Atualização)
- Script reduzido para `useStationListState` (novo composable) centralizando estado, watchers e navegação.
- `StationList.vue` agora possui ~200 linhas (script enxuto + template). Estilos migrados para `src/pages/StationList.scss`.
- Dependências obsoletas (`SearchBar`, `SpecialtySection`, `INEPPeriodSection`) removidas; `modeInfo` e estados não utilizados excluídos.
- Nenhum console/log remanescente; lint executado com sucesso em `StationList.vue` e `useStationListState.js`.
- Próximos passos: avaliar extrações adicionais (ex.: cartões categoria/modos) se surgir necessidade futura.
