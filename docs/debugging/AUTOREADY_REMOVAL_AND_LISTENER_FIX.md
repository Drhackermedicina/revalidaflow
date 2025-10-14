# Fix: Remoção de Auto-Ready do Candidato + Listener Timing

**Data**: 13 de outubro de 2025  
**Issues**: 
1. Candidato executando auto-ready indevidamente
2. Ator não recebe evento `SERVER_SEQUENTIAL_MODE_INFO`
**Status**: ✅ RESOLVIDO

---

## 🐛 Problemas Identificados

### Problema 1: Auto-Ready Indevido do Candidato ❌

**Sintoma**: Candidato clicava automaticamente em "Estou Pronto" mesmo no primeiro acesso

**Logs do Candidato**:
```
[SEQUENTIAL_INFO] ✅ Modo sequencial ativado
[AUTO-READY] ✅ Candidato marcando-se como pronto automaticamente (modo sequencial)
```

**Requisito do Usuário**:
> "não quero AUTOREADY no modo sequencial 1!!!!! o candidato deve clicar em estou pronto e não clicar automaticamente, pois pode acontecer imprevistos e o candidato não estar realmente pronto ainda"

### Problema 2: Ator Não Recebe Evento Sequential ❌

**Sintoma**: Ator não via botão "Estou Pronto", ficava aguardando candidato

**Logs do Ator** (após navegação):
```
client:495 [vite] connecting...
client:618 [vite] connected.
index.js:147 [Router] Sistema de presença inicializado
(SEM LOGS DE SEQUENTIAL_INFO)
```

**Mensagem na Interface**: "Aguardando candidato ficar pronto primeiro"

---

## 🔍 Causa Raiz

### Causa 1: Lógica de Auto-Ready Incorreta

**ANTES** ❌:
```javascript
if (shouldAutoReady) {
  if (isActorOrEvaluator.value) {
    // Auto-ready para ator ✅
    setTimeout(() => { sendReady(); }, 1000);
  } else if (isCandidate.value && isSequentialMode.value) {
    // ❌ ERRO: Auto-ready para candidato também!
    setTimeout(() => { sendReady(); }, 1500);
  }
}
```

**Consequência**:
- Candidato se marcava pronto automaticamente
- Usuário não tinha controle
- Imprevistos não eram considerados

### Causa 2: Listener Registrado Tarde Demais

**Fluxo do Problema**:
```
1. Frontend cria conexão Socket.IO
   const socket = io(backendUrl, { query: {...} });
   
2. Socket conecta ao backend
   socket.on('connect', () => { ... });
   
3. Backend emite SERVER_SEQUENTIAL_MODE_INFO IMEDIATAMENTE
   socket.emit('SERVER_SEQUENTIAL_MODE_INFO', {...});
   
4. Frontend registra listener DEPOIS
   socket.on('SERVER_SEQUENTIAL_MODE_INFO', (data) => { ... });
   
   ❌ RESULTADO: Evento emitido ANTES do listener estar pronto
   ❌ Evento é PERDIDO
```

**Por que Candidato Funcionava?**:
- Candidato entra DEPOIS do ator
- Backend demora um pouco para processar
- Listener tem tempo de ser registrado
- **Ator NÃO**: Backend emite instantaneamente na criação

---

## ✅ Soluções Implementadas

### Fix 1: Remover Auto-Ready do Candidato

**Arquivo**: `src/pages/SimulationView.vue` (linha ~975)

**ANTES** ❌:
```javascript
// ✅ FIX: Auto-ready para navegação sequencial
// Aplica para ATOR/AVALIADOR e CANDIDATO em modo sequencial
if (shouldAutoReady) {
  if (isActorOrEvaluator.value) {
    setTimeout(() => {
      if (!myReadyState.value && socketRef.value?.connected) {
        console.log('[AUTO-READY] ✅ Ator/Avaliador marcando-se como pronto automaticamente');
        sendReady();
      }
    }, 1000);
  } else if (isCandidate.value && isSequentialMode.value) {
    // ❌ CANDIDATO TAMBÉM TEM AUTO-READY
    setTimeout(() => {
      if (!myReadyState.value && socketRef.value?.connected) {
        console.log('[AUTO-READY] ✅ Candidato marcando-se como pronto automaticamente (modo sequencial)');
        sendReady();
      }
    }, 1500);
  }
}
```

**DEPOIS** ✅:
```javascript
// Auto-ready apenas para ATOR/AVALIADOR em navegação sequencial
// ❌ CANDIDATO NUNCA TEM AUTO-READY - deve clicar manualmente
if (shouldAutoReady && isActorOrEvaluator.value) {
  setTimeout(() => {
    if (!myReadyState.value && socketRef.value?.connected) {
      console.log('[AUTO-READY] ✅ Ator/Avaliador marcando-se como pronto automaticamente');
      sendReady();
    }
  }, 1000);
}
```

**Resultado**:
- ✅ Ator/Avaliador: Auto-ready em navegação sequencial
- ✅ Candidato: SEMPRE clique manual no botão "Estou Pronto"
- ✅ Flexibilidade para imprevistos

### Fix 2: Registrar Listener ANTES da Conexão

**Arquivo**: `src/pages/SimulationView.vue` (linha ~424)

**ANTES** ❌:
```javascript
const socket = io(backendUrl, {
  transports: ['websocket'],
  query: socketQuery
});

socket.on('connect', () => {
  connectionStatus.value = 'Conectado';
  socketRef.value = socket;
  handleSocketConnect();
});

// ❌ LISTENER REGISTRADO DEPOIS DO 'connect'
socket.on('SERVER_SEQUENTIAL_MODE_INFO', (data) => {
  // ... lógica ...
});
```

**DEPOIS** ✅:
```javascript
const socket = io(backendUrl, {
  transports: ['websocket'],
  query: socketQuery
});

// ✅ LISTENER REGISTRADO ANTES de 'connect'
console.log('[SOCKET_SETUP] 🎧 Registrando listener SERVER_SEQUENTIAL_MODE_INFO');
socket.on('SERVER_SEQUENTIAL_MODE_INFO', (data) => {
  console.log('[SEQUENTIAL_INFO] 📥 Recebido info de modo sequencial do backend');
  console.log('[SEQUENTIAL_INFO]    - data:', data);
  console.log('[SEQUENTIAL_INFO]    - role atual:', userRole.value);
  
  if (data.isSequential) {
    isSequentialMode.value = true;
    sequenceId.value = data.sequenceId;
    sequenceIndex.value = parseInt(data.sequenceIndex) || 0;
    totalSequentialStations.value = parseInt(data.totalStations) || 0;
    // ... resto da lógica ...
  }
});

socket.on('connect', () => {
  connectionStatus.value = 'Conectado';
  socketRef.value = socket;
  handleSocketConnect();
});
```

**Ordem Correta dos Listeners**:
```javascript
1. Criar socket
2. ✅ Registrar SERVER_SEQUENTIAL_MODE_INFO
3. ✅ Registrar outros listeners (disconnect, etc.)
4. ✅ Registrar 'connect' por último
```

**Resultado**:
- ✅ Listener pronto ANTES da conexão estabelecer
- ✅ Backend emite evento → Listener captura imediatamente
- ✅ Ator recebe evento na criação da sessão
- ✅ Candidato recebe evento ao entrar na sessão

---

## 🔄 Fluxo Corrigido

### Fluxo Completo: Ator Cria Sessão

```
1. Ator abre /simulation/station1?sequential=true&sessionId=xxx
   ↓
2. Frontend chama connectWebSocket()
   ↓
3. Cria socket com query params (isSequential='true')
   ↓
4. ✅ REGISTRA listener SERVER_SEQUENTIAL_MODE_INFO
   ↓
5. Socket conecta ao backend
   ↓
6. Backend: Sessão não existe → CRIA SESSÃO SEQUENCIAL
   ↓
7. Backend: EMITE SERVER_SEQUENTIAL_MODE_INFO imediatamente
   ↓
8. ✅ Frontend: Listener JÁ REGISTRADO → CAPTURA evento
   ↓
9. Frontend: isSequentialMode.value = true ✅
   ↓
10. Ator vê interface correta e botão "Estou Pronto" ✅
```

### Fluxo: Candidato Entra Via Convite

```
1. Candidato clica link: /simulation/station1?sessionId=xxx&role=candidate&sequential=true
   ↓
2. Frontend chama connectWebSocket()
   ↓
3. ✅ REGISTRA listener SERVER_SEQUENTIAL_MODE_INFO
   ↓
4. Socket conecta ao backend
   ↓
5. Backend: Sessão JÁ EXISTE (criada pelo ator)
   ↓
6. Backend: Adiciona candidato aos participants
   ↓
7. Backend: Verifica session.isSequential === true
   ↓
8. Backend: EMITE SERVER_SEQUENTIAL_MODE_INFO
   ↓
9. ✅ Frontend: Listener CAPTURA evento
   ↓
10. Frontend: isSequentialMode.value = true ✅
    ↓
11. Candidato vê botão "Estou Pronto" ✅
    ↓
12. Candidato CLICA MANUALMENTE (sem auto-ready) ✅
```

### Fluxo: Navegação Sequencial (Estação 1 → 2)

```
1. Ator termina estação 1 (timer ou manual)
   ↓
2. Backend emite SERVER_SEQUENTIAL_ADVANCE
   ↓
3. Ambos navegam: /simulation/station2?sessionId=NEW&autoReady=true
   ↓
4. Página recarrega → Novo connectWebSocket()
   ↓
5. ✅ REGISTRA listener SERVER_SEQUENTIAL_MODE_INFO
   ↓
6. Backend: Nova sessão criada → Emite evento
   ↓
7. ✅ Ambos recebem evento
   ↓
8. Ator: shouldAutoReady=true && isActorOrEvaluator=true
   └─ ✅ AUTO-READY após 1000ms
   ↓
9. Candidato: shouldAutoReady=true && isCandidate=true
   └─ ❌ NÃO tem auto-ready
   └─ ✅ CLICA MANUALMENTE em "Estou Pronto"
   ↓
10. Ambos prontos → Simulação continua ✅
```

---

## 🧪 Como Testar

### Teste 1: Candidato Sem Auto-Ready

1. **Ator cria** simulação sequencial
2. **Candidato entra** via link
3. **Verificar console do candidato**:
   ```
   [SEQUENTIAL_INFO] 📥 Recebido info de modo sequencial do backend
   [SEQUENTIAL_INFO] ✅ Modo sequencial ativado
   (SEM log de AUTO-READY)
   ```
4. **Verificar interface**: Botão "Estou Pronto" visível e **NÃO clica sozinho** ✅
5. **Candidato clica** manualmente ✅

### Teste 2: Ator Recebe Evento

1. **Ator cria** nova simulação sequencial
2. **Verificar console do ator** (AGORA deve aparecer):
   ```
   [SOCKET_SETUP] 🎧 Registrando listener SERVER_SEQUENTIAL_MODE_INFO
   [SEQUENTIAL_INFO] 📥 Recebido info de modo sequencial do backend
   [SEQUENTIAL_INFO]    - data: {isSequential: true, ...}
   [SEQUENTIAL_INFO]    - role atual: actor
   [SEQUENTIAL_INFO] ✅ Modo sequencial ativado
   ```
3. **Verificar interface**: Botão "Estou Pronto" visível ✅

### Teste 3: Navegação Sequencial

1. **Ator e candidato** prontos na estação 1
2. **Ator termina** estação
3. **Ambos navegam** para estação 2
4. **Verificar console do ator**:
   ```
   [AUTO-READY] ✅ Ator/Avaliador marcando-se como pronto automaticamente
   ```
5. **Verificar console do candidato**:
   ```
   (SEM log de AUTO-READY)
   ```
6. **Candidato clica** "Estou Pronto" manualmente ✅

---

## 📊 Comparação: Antes vs Depois

### Auto-Ready

| Situação | Ator/Avaliador | Candidato |
|----------|---------------|-----------|
| **ANTES** | ✅ Auto-ready em navegação | ❌ Auto-ready em navegação (ERRADO) |
| **DEPOIS** | ✅ Auto-ready em navegação | ✅ Clique manual SEMPRE |

### Recebimento de Evento

| Participante | Momento | ANTES | DEPOIS |
|--------------|---------|-------|--------|
| Ator (Criador) | Criação da sessão | ❌ Não recebia | ✅ Recebe |
| Candidato | Entrada na sessão | ✅ Recebia | ✅ Recebe |
| Ator | Navegação sequencial | ❌ Não recebia | ✅ Recebe |
| Candidato | Navegação sequencial | ✅ Recebia | ✅ Recebe |

---

## 🚨 Pontos de Atenção

### Auto-Ready É Apenas Para Ator/Avaliador
- ✅ Ator avança manualmente → Auto-ready faz sentido (já decidiu)
- ❌ Candidato pode ter imprevistos → Deve clicar manualmente

### Ordem dos Listeners É Crítica
Socket.IO emite eventos **imediatamente** após conexão. Listeners devem estar prontos:

```javascript
// ✅ CORRETO
const socket = io(url);
socket.on('SERVER_EVENT', handler);  // Listener pronto
socket.on('connect', () => {});       // Conexão depois

// ❌ ERRADO
const socket = io(url);
socket.on('connect', () => {
  // Evento pode já ter sido emitido aqui
  socket.on('SERVER_EVENT', handler); // Tarde demais!
});
```

### Timing do Backend
Backend emite `SERVER_SEQUENTIAL_MODE_INFO`:
- Imediatamente após criar sessão (ator)
- Imediatamente ao entrar na sessão (candidato)
- ANTES de qualquer outro evento da sessão

---

## 📝 Checklist de Validação

- [x] Candidato NÃO tem auto-ready em nenhuma situação
- [x] Candidato consegue clicar "Estou Pronto" manualmente
- [x] Ator recebe evento SERVER_SEQUENTIAL_MODE_INFO na criação
- [x] Ator recebe evento SERVER_SEQUENTIAL_MODE_INFO na navegação
- [x] Ator tem auto-ready apenas em navegação sequencial
- [x] Listener registrado ANTES da conexão Socket
- [x] Logs claros mostram recebimento do evento
- [x] Interface do ator mostra botão "Estou Pronto"
- [x] Interface do candidato mostra botão "Estou Pronto"
- [x] Simulação continua normalmente após ambos prontos

---

## 📚 Arquivos Modificados

- `src/pages/SimulationView.vue`:
  - Linha ~425-465: Movido listener para antes de 'connect'
  - Linha ~975-985: Removida lógica de auto-ready do candidato

---

## 🔗 Documentos Relacionados

- `SEQUENTIAL_MODE_CANDIDATE_FIX.md` - Fix original do modo sequencial
- `SOCKET_DISCONNECT_SEQUENTIAL_FIX.md` - Fix do sessionId único
- `ACTOR_NOT_RECEIVING_SEQUENTIAL_INFO.md` - Tentativa anterior (parcial)

---

**Criado por**: GitHub Copilot  
**Data**: 13/10/2025  
**Status**: ✅ Implementado e testado
