# Plano de Correções ESLint - RevalidaFlow

**Data**: 29/10/2025  
**Status**: Pronto para Implementação  
**Total de Warnings**: 61

## Objetivo
Eliminar 80%+ dos warnings de lint através de limpeza estratégica de código não utilizado.

## Estrutura de Correções

### 🔴 **PRIORIDADE 1 - CRÍTICA**

#### 1.1. SimulationViewAI.vue (20 warnings - 32.8%)
**Comando de Correção**:
```bash
npm run lint -- src/pages/SimulationViewAI.vue --fix
```

**Variáveis para Remover**:
```javascript
// Linha 11: 'backendUrl' não utilizada
// Linha 12: 'getInfrastructureColor' não utilizada  
// Linha 13: 'getInfrastructureIcon' não utilizada
// Linha 14: 'processInfrastructureItems' não utilizada
// Linha 63: 'updateTimerDisplayFromSelection' não utilizada
// Linha 75: 'isInSimulationAiPage' não utilizada
// Linha 99: 'isSpeaking' não utilizada
// Linha 104: 'stopSpeaking' não utilizada
// Linha 127: 'canSendMessage' não utilizada
// Linha 161: 'toggleVoiceRecording' não utilizada
// Linha 176: 'expandedPanels' não utilizada
// Linha 184: 'aiStats' não utilizada
// Linha 287: 'contextKeywordMap' não utilizada
// Linha 318: 'setRequestContext' não utilizada
// Linha 378: 'forceLoadPEP' não utilizada
// Linha 423: 'getMessageStyle' não utilizada
// Linha 462: 'getClassificacaoFromPontuacao' não utilizada
// Linha 481: 'speechEnabled' não utilizada
```

**Impacto Esperado**: 
- ✅ Remove 20 warnings (32.8% do total)
- ✅ Melhora significativamente a qualidade do código
- ✅ Reduz bundle size

---

### 🟡 **PRIORIDADE 2 - ALTA**

#### 2.1. StationList.vue (11 warnings - 18.0%)
**Comando de Correção**:
```bash
npm run lint -- src/pages/StationList.vue --fix
```

**Variáveis para Remover**:
```javascript
// Linha 2: 'nextTick' não utilizada
// Linha 7: 'SpecialtySection' não utilizada
// Linha 8: 'INEPPeriodSection' não utilizada
// Linha 9: 'SearchBar' não utilizada
// Linha 32: 'getUserStationScore' não utilizada
// Linha 41: 'getSpecialty' não utilizada
// Linha 45: 'filteredRevalidaFacilStations' não utilizada
// Linha 52: 'filteredStationsByInepPeriod' não utilizada
// Linha 53: 'globalAutocompleteItems' não utilizada
// Linha 56: 'getStationBackgroundColor' não utilizada
// Linha 84: 'creatingSessionForStationId' não utilizada
// Linha 86: 'goToEditStation' não utilizada
// Linha 98: 'inepPeriods' não utilizada
// Linha 156: 'handleStartSimulation' não utilizada
```

---

### 🟢 **PRIORIDADE 3 - MÉDIA**

#### 3.1. Componentes UI (11 warnings totais)

**SimulationPauseButton.vue** (5 warnings):
```bash
npm run lint -- src/components/SimulationPauseButton.vue --fix
```

**RankingCard.vue** (2 warnings):
```bash
npm run lint -- src/components/dashboard/RankingCard.vue --fix
```

**AITrainingModal.vue** (2 warnings):
```bash
npm run lint -- src/components/station/AITrainingModal.vue --fix
```

**StationListHeader.vue** (1 warning):
```bash
npm run lint -- src/components/station/StationListHeader.vue --fix
```

**DebugDashboard.vue** (1 warning):
```bash
npm run lint -- src/components/DebugDashboard.vue --fix
```

---

### 🔵 **PRIORIDADE 4 - BAIXA**

#### 4.1. Composables (5 warnings totais)

**useSimulationPersistence.js** (2 warnings):
```bash
npm run lint -- src/composables/useSimulationPersistence.js --fix
```

**Outros Composables** (3 warnings):
```bash
npm run lint -- src/composables/useSimulationHelpers.js --fix
npm run lint -- src/composables/useStationNavigation.js --fix
npm run lint -- src/composables/useUserStatusManager.js --fix
```

#### 4.2. Plugins e Core

**firebase.js** (2 warnings):
```bash
npm run lint -- src/plugins/firebase.js --fix
```

#### 4.3. Páginas Adicionais

**App.vue** (3 warnings):
```bash
npm run lint -- src/App.vue --fix
```

**Outras Páginas** (6 warnings):
```bash
npm run lint -- src/pages/ChatGroupView.vue --fix
npm run lint -- src/pages/ChatPrivateView.vue --fix
npm run lint -- src/pages/StationInepSections.vue --fix
npm run lint -- src/pages/StationRevalidaSections.vue --fix
```

---

### ⚫ **PRIORIDADE 5 - REVISÃO MANUAL**

#### 5.1. Testes E2E (4 warnings)
**Nota**: Parametros `expect` podem ser necessários para estrutura de testes

```bash
npm run lint -- tests/e2e/*.spec.js
```

**Verificar manualmente**:
- `tests/e2e/medstudier-checklist-simple.spec.js`
- `tests/e2e/medstudier-diagnosis.spec.js`
- `tests/e2e/medstudier-extraction.spec.js`
- `tests/e2e/medstudier-navigation.spec.js`

---

## Script de Automação

### Comando Único para Todas as Correções
```bash
#!/bin/bash
# Corrigir todos os arquivos de uma vez

echo "🚀 Iniciando correções de lint..."

# Prioridade 1 - Crítica
npm run lint -- src/pages/SimulationViewAI.vue --fix

# Prioridade 2 - Alta
npm run lint -- src/pages/StationList.vue --fix

# Prioridade 3 - Média
npm run lint -- src/components/**/*.vue --fix

# Prioridade 4 - Baixa
npm run lint -- src/composables/**/*.js --fix
npm run lint -- src/plugins/**/*.js --fix
npm run lint -- src/pages/*.vue --fix

# Verificação final
npm run lint

echo "✅ Correções concluídas!"
```

### Execução Manual Passo a Passo

1. **Execução Interativa**:
```bash
# 1. Executar correções automáticas
npm run lint --fix

# 2. Verificar resultado
npm run lint

# 3. Se ainda houver warnings, aplicar correções manuais
# 4. Repetir até 0 warnings ou apenas warnings aceitos
```

2. **Verificação Final**:
```bash
# Verificar se não há erros
npm run lint --quiet

# Executar testes para garantir que nada foi quebrado
npm run test
```

---

## Validação e Testes

### Checklist de Validação

- [ ] **Funcionalidade**: Todas as páginas carregam corretamente
- [ ] **Navegação**: Routing funciona sem erros
- [ ] **Simulação**: SimulationViewAI funciona adequadamente
- [ ] **Listas**: StationList exibe corretamente
- [ ] **Componentes**: Componentes UI renderizam sem problemas
- [ ] **Testes**: Testes E2E continuam passando
- [ ] **Build**: npm run build executa sem erros

### Critérios de Sucesso

- [ ] **Redução de 80%+**: De 61 para ≤ 12 warnings
- [ ] **Zero erros**: Nenhum erro de lint
- [ ] **Funcionalidade preservada**: Todas as features operacionais
- [ ] **Performance mantida**: Bundle size similar ou menor

---

## Recomendações Futuras

### Prevenção de Novos Problemas

1. **Pre-commit Hooks**:
```bash
# Adicionar ao package.json scripts
"lint-staged": {
  "*.{js,vue}": ["eslint --fix"]
}
```

2. **Configuração IDE**:
```json
// .vscode/settings.json
{
  "eslint.validate": ["javascript", "vue"],
  "eslint.autoFixOnSave": true
}
```

3. **CI/CD Integration**:
```yaml
# .github/workflows/lint.yml
- name: Lint Code
  run: npm run lint
```

---

## Tempo Estimado

- **Prioridade 1**: ~15 minutos
- **Prioridade 2**: ~10 minutos  
- **Prioridade 3**: ~20 minutos
- **Prioridade 4**: ~10 minutos
- **Prioridade 5**: ~5 minutos
- **Validação**: ~15 minutos

**Total Estimado**: 75 minutos (1h15min)

---

**Última Atualização**: 29/10/2025 11:56  
**Responsável**: Kilo Code - Diagnóstico Automático  
**Próxima Revisão**: Após implementação das correções
