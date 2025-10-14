# ✅ CORREÇÃO IMPLEMENTADA: Modo Sequencial - Sincronização Ator/Candidato

**Data:** 13 de outubro de 2025  
**Status:** ✅ IMPLEMENTADO E PRONTO PARA TESTES

---

## 📝 Resumo das Correções

### **Problema Original**
Quando o ator avançava para a próxima estação no modo sequencial, o candidato era desconectado ao invés de avançar automaticamente junto com o ator.

### **Causa Raiz**
1. **Role hardcoded:** A função `goToNextSequentialStation` sempre navegava com `role: 'actor'`, fazendo o candidato perder sua role
2. **Falta de sincronização:** Não havia comunicação via Socket.IO para notificar o candidato
3. **Navegação individual:** Cada usuário navegava independentemente, sem coordenação

---

## 🔧 Alterações Implementadas

### **1. Backend (`backend/server.js`)**

#### ✅ Novo Evento Socket: `ACTOR_ADVANCE_SEQUENTIAL`
```javascript
socket.on('ACTOR_ADVANCE_SEQUENTIAL', (data) => {
  // Valida que é ator/avaliador
  // Emite SERVER_SEQUENTIAL_ADVANCE para TODOS na sessão
  io.to(sessionId).emit('SERVER_SEQUENTIAL_ADVANCE', {
    nextStationId,
    sequenceIndex,
    sequenceId,
    message: 'Avançando para próxima estação...'
  });
});
```

**Função:** Quando o ator clica "Próxima Estação", o backend notifica todos os participantes da sessão (incluindo o candidato).

---

### **2. Frontend - Composable (`src/composables/useSequentialNavigation.js`)**

#### ✅ Correção #1: Role Dinâmica
```javascript
export function useSequentialNavigation({
  // ... parâmetros existentes
  userRole,      // ✅ NOVO
  socketRef,     // ✅ NOVO
  sessionId      // ✅ NOVO
})
```

#### ✅ Correção #2: Query Params com Role Correta
```javascript
query: {
  role: userRole.value,  // ✅ FIX: Era hardcoded 'actor'
  sequential: 'true',
  // ...
}
```

#### ✅ Correção #3: Emissão de Evento Socket
```javascript
function goToNextSequentialStation() {
  // ...
  
  // Se for ator/avaliador E houver Socket conectado
  if ((userRole.value === 'actor' || userRole.value === 'evaluator') 
      && socketRef?.value?.connected) {
    
    // Emitir evento para backend
    socketRef.value.emit('ACTOR_ADVANCE_SEQUENTIAL', {
      sessionId: sessionId.value,
      nextStationId: nextStation.id,
      sequenceIndex: nextIndex,
      sequenceId: sequenceId.value
    });
  }
  
  // Navegar (ator navega imediatamente, candidato via evento Socket)
  window.location.href = routeData.href;
}
```

---

### **3. Frontend - SimulationView (`src/pages/SimulationView.vue`)**

#### ✅ Correção #1: Passar Parâmetros para Composable
```javascript
const { ... } = useSequentialNavigation({
  // ... parâmetros existentes
  userRole,    // ✅ NOVO
  socketRef,   // ✅ NOVO
  sessionId    // ✅ NOVO
});
```

#### ✅ Correção #2: Listener para Navegação Sincronizada
```javascript
socket.on('SERVER_SEQUENTIAL_ADVANCE', (data) => {
  const { nextStationId, sequenceIndex: nextIndex, sequenceId: seqId } = data;
  
  // Atualizar sessionStorage
  const updatedData = { ...sequentialData.value };
  updatedData.currentIndex = nextIndex;
  sessionStorage.setItem('sequentialSession', JSON.stringify(updatedData));
  
  // Navegar (mantém role original do usuário)
  const routeData = router.resolve({
    path: `/app/simulation/${nextStationId}`,
    query: {
      role: userRole.value,  // ✅ Mantém role
      sequential: 'true',
      sequenceId: seqId,
      sequenceIndex: nextIndex,
      totalStations: totalSequentialStations.value,
      autoReady: 'true'
    }
  });
  
  // Pequeno delay para processar evento
  setTimeout(() => {
    window.location.href = routeData.href;
  }, 100);
});
```

---

## 🎯 Fluxo Completo Corrigido

### **Antes (QUEBRADO)**
```
1. ⏱️ Timer termina
2. 👤 Candidato submete avaliação
3. 🎭 Ator clica "Próxima Estação"
4. 🎭 Ator navega com role: 'actor' ✅
5. 👤 Candidato permanece na página ❌
6. 🔌 Socket desconecta (sessão mudou) ❌
```

### **Agora (CORRIGIDO)**
```
1. ⏱️ Timer termina
2. 👤 Candidato submete avaliação
3. 🎭 Ator clica "Próxima Estação"
4. 📡 Socket emite ACTOR_ADVANCE_SEQUENTIAL
5. 🔄 Backend emite SERVER_SEQUENTIAL_ADVANCE para TODOS
6. 🎭 Ator navega com role: 'actor' ✅
7. 👤 Candidato recebe evento e navega com role: 'candidate' ✅
8. ✅ Ambos chegam na próxima estação sincronizados
```

---

## 📋 Arquivos Modificados

| Arquivo | Mudanças |
|---------|----------|
| `backend/server.js` | Adicionado evento `ACTOR_ADVANCE_SEQUENTIAL` e `SERVER_SEQUENTIAL_ADVANCE` |
| `src/composables/useSequentialNavigation.js` | Corrigido role hardcoded, adicionado emissão Socket |
| `src/pages/SimulationView.vue` | Adicionado listener `SERVER_SEQUENTIAL_ADVANCE`, passados novos parâmetros |

---

## 🧪 Como Testar

### **Pré-requisitos:**
- Backend rodando (`npm run backend:local`)
- Frontend rodando (`npm run dev`)
- 2 navegadores/janelas (ou incógnito)

### **Teste 1: Navegação Básica**

1. **Setup Sequência:**
   - Acesse `/app/stations`
   - Selecione 3+ estações
   - Clique "Iniciar Modo Sequencial"

2. **Entrar como Ator:**
   - Copie o link de convite
   - Abra em uma janela
   - Role: Actor

3. **Entrar como Candidato:**
   - Cole o link em OUTRA janela/navegador
   - Role: Candidate

4. **Iniciar Simulação:**
   - Candidato clica "Estou Pronto"
   - Ator clica "Estou Pronto"
   - Simulação inicia automaticamente

5. **Completar Estação 1:**
   - Aguardar timer ou encerrar manualmente
   - Candidato submete avaliação (se aplicável)

6. **Avançar para Estação 2:**
   - **Ator:** Clicar "Próxima Estação"
   - **Verificar Console Ator:**
     ```
     [SEQUENTIAL] Emitindo ACTOR_ADVANCE_SEQUENTIAL via Socket
     [SEQUENTIAL] ✅ Evento emitido
     ```
   - **Verificar Console Candidato:**
     ```
     [SEQUENTIAL_SYNC] 📥 Evento SERVER_SEQUENTIAL_ADVANCE recebido
     [SEQUENTIAL_SYNC] ✅ SessionStorage atualizado
     [SEQUENTIAL_SYNC] 🚀 Navegando para: ...
     ```
   
7. **Resultado Esperado:**
   - ✅ Ator navega para Estação 2
   - ✅ Candidato navega para Estação 2 (automaticamente)
   - ✅ Ambos mantêm suas roles
   - ✅ Socket permanece conectado

### **Teste 2: Sequência Completa**

Repetir o Teste 1 para todas as estações da sequência:
- ✅ Estação 1 → Estação 2
- ✅ Estação 2 → Estação 3
- ✅ Estação 3 → Finalização

### **Teste 3: Desconexão e Reconexão**

1. Completar Estação 1
2. **Desconectar candidato** (fechar aba)
3. Ator avança para Estação 2
4. **Reconectar candidato** (reabrir link)
5. **Verificar:**
   - ✅ Candidato deve estar na Estação 2
   - ✅ sessionStorage deve ter índice correto

### **Teste 4: Navegação Anterior**

1. Estação 2 ativa
2. Ator clica "Estação Anterior"
3. **Verificar:**
   - ✅ Ambos voltam para Estação 1
   - ✅ Roles mantidas

---

## 🐛 Debug e Logs

### **Console Logs Importantes**

#### Ator ao Avançar:
```
[SEQUENTIAL] goToNextSequentialStation called
[SEQUENTIAL] Next index: 1
[SEQUENTIAL] Emitindo ACTOR_ADVANCE_SEQUENTIAL via Socket
[SEQUENTIAL] ✅ Evento emitido - Backend notificará todos
```

#### Backend ao Receber:
```
[SEQUENTIAL] Ator/Avaliador <userId> avançando para próxima estação
[SEQUENTIAL]   - Próxima estação: <stationId>
[SEQUENTIAL]   - Índice: 1
[SEQUENTIAL] ✅ Evento SERVER_SEQUENTIAL_ADVANCE emitido
```

#### Candidato ao Receber:
```
[SEQUENTIAL_SYNC] 📥 Evento SERVER_SEQUENTIAL_ADVANCE recebido
[SEQUENTIAL_SYNC]    - userRole: candidate
[SEQUENTIAL_SYNC]    - isSequentialMode: true
[SEQUENTIAL_SYNC] ✅ SessionStorage atualizado com índice: 1
[SEQUENTIAL_SYNC] 🚀 Navegando para: /app/simulation/<stationId>?role=candidate&...
```

### **Verificar sessionStorage**

No console do navegador:
```javascript
// Ver dados da sequência
JSON.parse(sessionStorage.getItem('sequentialSession'))

// Deve retornar:
{
  sequence: [...],
  currentIndex: <número>,
  sequenceId: '...',
  // ...
}
```

---

## ⚠️ Possíveis Problemas e Soluções

### **Problema:** Candidato não navega
**Verificar:**
1. Console do candidato tem logs `[SEQUENTIAL_SYNC]`?
2. Socket está conectado? (`socketRef.value.connected`)
3. `isSequentialMode.value === true`?

**Solução:**
- Verificar se backend está emitindo evento
- Verificar se listener está registrado
- Checar se sessionStorage tem dados da sequência

---

### **Problema:** Roles sendo perdidas
**Verificar:**
1. Query param `role` na URL
2. Console log de `userRole.value`

**Solução:**
- Garantir que `userRole` está sendo passado para o composable
- Verificar que query params incluem `role: userRole.value`

---

### **Problema:** sessionStorage perdido
**Verificar:**
1. `sessionStorage.getItem('sequentialSession')`
2. Logs `[SEQUENTIAL] Reconstructed sequentialData`

**Solução:**
- sessionStorage é por aba - se fechar aba, perde dados
- Implementar recuperação via query params como fallback

---

## ✅ Checklist de Validação

Após implementação, verificar:

- [x] Código corrigido em todos os arquivos
- [x] Lint passou sem erros (apenas warnings pré-existentes)
- [ ] Backend deployado com novo evento
- [ ] Frontend deployado com correções
- [ ] Teste 1 (Navegação Básica) passou
- [ ] Teste 2 (Sequência Completa) passou
- [ ] Teste 3 (Desconexão) passou
- [ ] Teste 4 (Navegação Anterior) passou
- [ ] Logs aparecem corretamente
- [ ] Não há erros no console
- [ ] Documentação atualizada

---

## 📚 Documentação Relacionada

- **Análise Completa:** `docs/debugging/SEQUENTIAL_MODE_ANALYSIS.md`
- **Composable:** `src/composables/useSequentialNavigation.js`
- **Backend Socket:** `backend/server.js` (linha ~1065)
- **Frontend Listener:** `src/pages/SimulationView.vue` (linha ~789)

---

## 🎉 Conclusão

A correção implementa uma sincronização robusta via Socket.IO, garantindo que:
- ✅ Ator e candidato navegam juntos
- ✅ Roles são mantidas durante toda a sequência
- ✅ SessionStorage é atualizado corretamente
- ✅ Não há desconexões inesperadas
- ✅ Logs detalhados para debugging

**Status Final:** ✅ PRONTO PARA PRODUÇÃO após testes validados
