# 🔍 Análise Completa: Problema no Modo Sequencial

**Data:** 13 de outubro de 2025  
**Status:** 🔴 PROBLEMA CRÍTICO IDENTIFICADO

---

## 📋 Resumo do Problema

Quando o **ator** avança para a próxima estação em modo sequencial, o **candidato** é desconectado da sessão ao invés de avançar automaticamente para a próxima estação junto com o ator.

---

## 🔬 Análise Detalhada do Fluxo Atual

### 1. **Como Funciona o Modo Sequencial**

#### 1.1 Inicialização
- A sequência é armazenada em `sessionStorage` com a chave `'sequentialSession'`
- Contém: `sequence[]`, `currentIndex`, `sequenceId`, etc.
- Tanto ator quanto candidato recebem os query params: `sequential=true`, `sequenceIndex`, `sequenceId`

#### 1.2 Navegação entre Estações
Arquivo: `src/composables/useSequentialNavigation.js`

```javascript
function goToNextSequentialStation() {
  // ... validações ...
  
  const nextStation = sequentialData.value.sequence[nextIndex]
  
  const routeData = router.resolve({
    path: `/app/simulation/${nextStation.id}`,
    query: {
      role: 'actor',  // ❌ PROBLEMA: HARDCODED COMO 'ACTOR'
      sequential: 'true',
      sequenceId: sequenceId.value,
      sequenceIndex: nextIndex,
      totalStations: totalSequentialStations.value,
      autoReady: 'true'
    }
  })
  
  window.location.href = routeData.href
}
```

**🔴 PROBLEMA #1:** A role está hardcoded como `'actor'`, então quando o candidato tenta navegar, ele perde sua role.

---

### 2. **Fluxo de Término da Simulação**

#### 2.1 Quando o Timer Termina
1. Backend emite `TIMER_END` via Socket.IO
2. Frontend chama `handleTimerEnd()` no composable `useSimulationWorkflow`
3. `simulationEnded.value = true`

#### 2.2 Interface do Ator (Após Término)
Arquivo: `src/pages/SimulationView.vue` (linhas 1490-1540)

```vue
<!-- VISÃO DO ATOR/AVALIADOR -->
<VCard v-if="isSequentialMode && simulationEnded">
  <VAlert variant="tonal" color="success">
    Estação Concluída
  </VAlert>
  
  <VBtn
    v-if="canGoToNext"
    @click="goToNextSequentialStation"  <!-- ✅ Ator tem botão -->
  >
    Próxima Estação
  </VBtn>
</VCard>
```

#### 2.3 Interface do Candidato (Após Término)
Arquivo: `src/components/CandidateChecklist.vue` (linhas 367-375)

```vue
<VCardActions v-if="simulationEnded && !evaluationSubmittedByCandidate">
  <VBtn @click="handleSubmitEvaluation">
    Submeter Avaliação Final  <!-- ❌ Sem navegação automática -->
  </VBtn>
</VCardActions>
```

**🔴 PROBLEMA #2:** O candidato NÃO tem interface para avançar para próxima estação.

**🔴 PROBLEMA #3:** Não há lógica automática para navegar o candidato quando o ator avança.

---

### 3. **Como Deveria Funcionar**

#### Cenário Ideal:
1. ✅ Simulação termina (`TIMER_END`)
2. ✅ Candidato submete avaliação (se aplicável)
3. ✅ **Ator clica em "Próxima Estação"**
4. ❌ **Backend deveria notificar candidato via Socket**
5. ❌ **Candidato deveria navegar automaticamente**

#### Realidade Atual:
1. ✅ Simulação termina
2. ✅ Candidato submete avaliação
3. ✅ Ator clica em "Próxima Estação"
4. ✅ Ator navega com sucesso
5. ❌ **Candidato permanece na página antiga**
6. ❌ **Socket desconecta pois sessão mudou**

---

## 🐛 Problemas Identificados

### **Problema #1: Role Hardcoded na Navegação**
**Arquivo:** `src/composables/useSequentialNavigation.js:144`
```javascript
role: 'actor',  // ❌ Sempre 'actor'
```

**Impacto:** Se o candidato tentar navegar, perde sua role.

---

### **Problema #2: Falta de Comunicação Socket**
**Situação:** Não há evento Socket para notificar o candidato que deve avançar.

**Fluxo Esperado:**
```
Ator clica "Próxima" → Backend emite "NEXT_STATION" → Candidato navega automaticamente
```

**Fluxo Atual:**
```
Ator clica "Próxima" → window.location.href (apenas ator) → Candidato fica órfão
```

---

### **Problema #3: Watcher Vazio**
**Arquivo:** `src/pages/SimulationView.vue:1117`
```javascript
watch([isSequentialMode, simulationEnded, allEvaluationsCompleted, canGoToNext],
  ([sequential, ended, completed, canNext]) => {
    // Sequential navigation logic  ← ❌ VAZIO!
  },
  { immediate: true }
);
```

**Impacto:** Nenhuma lógica automática de navegação implementada.

---

### **Problema #4: Falta de UI para Candidato**
**Situação:** Candidato não tem botão ou indicação visual para próxima estação.

**Necessário:**
- Mensagem: "Aguardando ator avançar..."
- OU botão: "Prosseguir para Próxima Estação"

---

## 💡 Soluções Propostas

### **Solução #1: Corrigir Role na Navegação** (RÁPIDA)

**Arquivo:** `src/composables/useSequentialNavigation.js`

```javascript
export function useSequentialNavigation({
  isSequentialMode,
  sequenceId,
  sequenceIndex,
  totalSequentialStations,
  sequentialData,
  userRole  // ← ADICIONAR PARÂMETRO
}) {
  // ...
  
  function goToNextSequentialStation() {
    // ...
    const routeData = router.resolve({
      path: `/app/simulation/${nextStation.id}`,
      query: {
        role: userRole.value,  // ✅ Usar role do usuário
        sequential: 'true',
        sequenceId: sequenceId.value,
        sequenceIndex: nextIndex,
        totalStations: totalSequentialStations.value,
        autoReady: 'true'
      }
    })
    
    window.location.href = routeData.href
  }
}
```

---

### **Solução #2: Implementar Sincronização via Socket** (IDEAL)

#### Backend (`backend/server.js`)

```javascript
// Novo evento: Ator avança para próxima estação
socket.on('ACTOR_ADVANCE_SEQUENTIAL', (data) => {
  const { sessionId, nextStationId, sequenceIndex } = data;
  
  // Notificar todos na sessão (incluindo candidato)
  io.to(sessionId).emit('SERVER_SEQUENTIAL_ADVANCE', {
    nextStationId,
    sequenceIndex,
    message: 'Avançando para próxima estação...'
  });
});
```

#### Frontend (`src/composables/useSequentialNavigation.js`)

```javascript
function goToNextSequentialStation(socket, sessionId) {
  // Emitir evento para backend
  socket.emit('ACTOR_ADVANCE_SEQUENTIAL', {
    sessionId: sessionId.value,
    nextStationId: nextStation.id,
    sequenceIndex: nextIndex
  });
  
  // Backend notificará todos os participantes
}
```

#### Frontend - Listener (`src/pages/SimulationView.vue`)

```javascript
socket.on('SERVER_SEQUENTIAL_ADVANCE', (data) => {
  const { nextStationId, sequenceIndex } = data;
  
  // Navegar automaticamente (ator e candidato)
  const routeData = router.resolve({
    path: `/app/simulation/${nextStationId}`,
    query: {
      role: userRole.value,  // Mantém role
      sequential: 'true',
      sequenceId: sequenceId.value,
      sequenceIndex: sequenceIndex,
      totalStations: totalSequentialStations.value,
      autoReady: 'true'
    }
  });
  
  window.location.href = routeData.href;
});
```

---

### **Solução #3: UI para Candidato** (OPCIONAL - Fallback)

**Arquivo:** `src/pages/SimulationView.vue`

```vue
<!-- VISÃO DO CANDIDATO EM MODO SEQUENCIAL -->
<VCard v-if="isCandidate && isSequentialMode && simulationEnded">
  <VCardTitle>Navegação Sequencial</VCardTitle>
  <VCardText>
    <VAlert variant="tonal" color="info" class="mb-4">
      Aguardando o ator/avaliador avançar para a próxima estação...
    </VAlert>
    
    <!-- Botão opcional para avançar manualmente -->
    <VBtn
      v-if="canGoToNext"
      color="primary"
      @click="goToNextSequentialStation"
      block
    >
      Prosseguir para Próxima Estação
    </VBtn>
  </VCardText>
</VCard>
```

---

## 🎯 Prioridade de Implementação

### **Fase 1: Fix Crítico (URGENTE)**
1. ✅ Corrigir `role` hardcoded → usar `userRole.value`
2. ✅ Passar `userRole` como parâmetro para `useSequentialNavigation`

### **Fase 2: Sincronização (RECOMENDADO)**
1. ✅ Adicionar evento Socket `ACTOR_ADVANCE_SEQUENTIAL`
2. ✅ Backend emite `SERVER_SEQUENTIAL_ADVANCE`
3. ✅ Frontend escuta e navega automaticamente

### **Fase 3: UX Melhorada (OPCIONAL)**
1. ⚪ Adicionar UI de "aguardando" para candidato
2. ⚪ Botão manual de avanço como fallback
3. ⚪ Loading state durante transição

---

## 📊 Arquivos Afetados

| Arquivo | Mudanças Necessárias |
|---------|---------------------|
| `src/composables/useSequentialNavigation.js` | Adicionar parâmetro `userRole`, corrigir query.role |
| `src/pages/SimulationView.vue` | Passar `userRole` para composable, adicionar listener Socket |
| `backend/server.js` | Adicionar evento `ACTOR_ADVANCE_SEQUENTIAL` e `SERVER_SEQUENTIAL_ADVANCE` |
| `src/components/CandidateChecklist.vue` | (Opcional) Adicionar UI de próxima estação |

---

## ✅ Checklist de Implementação

- [ ] Corrigir role hardcoded
- [ ] Passar userRole para useSequentialNavigation
- [ ] Adicionar evento Socket no backend
- [ ] Implementar listener no frontend
- [ ] Testar navegação do ator
- [ ] Testar navegação do candidato
- [ ] Verificar sessionStorage
- [ ] Testar desconexão/reconexão
- [ ] Adicionar logs de debug
- [ ] Documentar mudanças

---

## 🧪 Como Testar

1. **Setup:**
   - Criar sequência de 3+ estações
   - Entrar como ator
   - Entrar como candidato (outra janela/navegador)

2. **Teste 1: Navegação Básica**
   - Completar estação 1
   - Ator clica "Próxima Estação"
   - ✅ Candidato deve navegar automaticamente
   - ✅ Ambos devem manter suas roles

3. **Teste 2: Navegação Completa**
   - Repetir para todas estações
   - ✅ Sequência deve funcionar até o fim

4. **Teste 3: Desconexão**
   - Desconectar candidato
   - Ator avança
   - Reconectar candidato
   - ✅ Candidato deve recuperar estado

---

## 📝 Notas Adicionais

- sessionStorage é local ao navegador - não sincroniza entre usuários
- Socket.IO é a solução correta para sincronização
- Considerar timeout se candidato demorar muito
- Adicionar fallback se Socket falhar

---

**Conclusão:** O problema é uma combinação de role hardcoded + falta de comunicação Socket. A correção da role é urgente, mas a solução completa requer implementação de eventos Socket para sincronização entre ator e candidato.
