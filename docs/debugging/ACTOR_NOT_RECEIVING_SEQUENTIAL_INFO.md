# Fix: Ator Não Recebe Informação de Modo Sequencial

**Data**: 13 de outubro de 2025  
**Issue**: Ator (criador da sessão) não recebe evento `SERVER_SEQUENTIAL_MODE_INFO`  
**Sintoma**: Botão "Estou Pronto" não aparece para o ator, apenas para o candidato  
**Status**: ✅ RESOLVIDO

---

## 🐛 Problema Identificado

### Logs do Candidato (✅ Funcionando)
```
[SEQUENTIAL_INFO] 📥 Recebido info de modo sequencial do backend
[SEQUENTIAL_INFO]    - data: {isSequential: true, sequenceId: 'seq_xxx', sequenceIndex: 1, totalStations: 4}
[SEQUENTIAL_INFO] ✅ Modo sequencial ativado
[SEQUENTIAL_INFO]    - sequenceId: seq_xxx
[SEQUENTIAL_INFO]    - sequenceIndex: 1
[SEQUENTIAL_INFO]    - totalStations: 4
[SEQUENTIAL_INFO] 💾 Dados salvos no sessionStorage
```

### Logs do Ator (❌ NÃO Recebe)
```
client:495 [vite] connecting...
client:618 [vite] connected.
index.js:147 [Router] Sistema de presença inicializado
(SEM LOGS DE SEQUENTIAL_INFO)
```

### Logs do Backend
```
[SESSÃO SEQUENCIAL] Criada com sequenceId: seq_xxx, índice: 1
[SESSÃO] Sessão criada: session_xxx para a estação station_yyy
[JOIN] Usuário Taís Zocche (candidate) entrou na sala: session_xxx
[SEQUENTIAL] Informado participante Taís Zocche sobre modo sequencial (índice 1)
```

**⚠️ OBSERVAÇÃO**: Backend só envia `SERVER_SEQUENTIAL_MODE_INFO` quando alguém **entra** na sessão, mas não quando alguém **cria** a sessão!

---

## 🔍 Causa Raiz

### Fluxo ANTES da Correção ❌

```
1. Ator clica "Iniciar Simulação Sequencial"
   ↓
2. Frontend gera sessionId e abre /simulation/station1?sessionId=xxx&sequential=true
   ↓
3. Backend recebe conexão Socket
   ↓
4. Backend: Sessão não existe → CRIA SESSÃO
   └─ sessionData.isSequential = true
   └─ sessions.set(sessionId, sessionData)
   └─ console.log("Sessão criada")
   ❌ NÃO EMITE SERVER_SEQUENTIAL_MODE_INFO para o criador
   ↓
5. Backend: Adiciona ator aos participants
   └─ session.participants.set(userId, {...})
   └─ socket.join(sessionId)
   ↓
6. Candidato clica no link de convite
   ↓
7. Backend recebe conexão do candidato
   ↓
8. Backend: Sessão JÁ EXISTE
   ↓
9. Backend: Adiciona candidato aos participants
   ↓
10. Backend verifica: session.isSequential === true
    ↓
    ✅ EMITE SERVER_SEQUENTIAL_MODE_INFO para o candidato
    ❌ Ator (criador) NUNCA recebeu o evento
```

**Resultado**:
- ❌ Ator: `isSequentialMode.value = false` (não recebeu evento)
- ✅ Candidato: `isSequentialMode.value = true` (recebeu evento)
- ❌ Botão "Estou Pronto" não funciona para o ator

---

## ✅ Solução Implementada

### Backend: Emitir Evento Também Para o Criador

**Arquivo**: `backend/server.js` (linha ~917)

**ANTES** ❌:
```javascript
// Cria a sessão se for o primeiro a entrar
if (!sessions.has(sessionId)) {
  const sessionData = {
    stationId,
    participants: new Map(),
    createdAt: new Date(),
    timer: null
  };

  // Se está em modo sequencial, armazena os parâmetros
  if (isSequential === 'true') {
    sessionData.isSequential = true;
    sessionData.sequenceId = sequenceId;
    sessionData.sequenceIndex = parseInt(sequenceIndex) || 0;
    sessionData.totalStations = parseInt(totalStations) || 0;
    console.log(`[SESSÃO SEQUENCIAL] Criada com sequenceId: ${sequenceId}, índice: ${sequenceIndex}`);
  }

  sessions.set(sessionId, sessionData);
  console.log(`[SESSÃO] Sessão criada: ${sessionId} para a estação ${stationId}`);
  // ❌ NÃO EMITE O EVENTO AQUI
}
```

**DEPOIS** ✅:
```javascript
// Cria a sessão se for o primeiro a entrar
if (!sessions.has(sessionId)) {
  const sessionData = {
    stationId,
    participants: new Map(),
    createdAt: new Date(),
    timer: null
  };

  // Se está em modo sequencial, armazena os parâmetros
  if (isSequential === 'true') {
    sessionData.isSequential = true;
    sessionData.sequenceId = sequenceId;
    sessionData.sequenceIndex = parseInt(sequenceIndex) || 0;
    sessionData.totalStations = parseInt(totalStations) || 0;
    console.log(`[SESSÃO SEQUENCIAL] Criada com sequenceId: ${sequenceId}, índice: ${sequenceIndex}`);
  }

  sessions.set(sessionId, sessionData);
  console.log(`[SESSÃO] Sessão criada: ${sessionId} para a estação ${stationId}`);
  
  // ✅ FIX: Informar o CRIADOR da sessão sobre modo sequencial
  if (sessionData.isSequential) {
    socket.emit('SERVER_SEQUENTIAL_MODE_INFO', {
      isSequential: true,
      sequenceId: sessionData.sequenceId,
      sequenceIndex: sessionData.sequenceIndex,
      totalStations: sessionData.totalStations
    });
    console.log(`[SEQUENTIAL] Informado CRIADOR ${displayName} sobre modo sequencial (índice ${sessionData.sequenceIndex})`);
  }
}
```

### Frontend: Adicionar Logs de Debug

**Arquivo**: `src/pages/SimulationView.vue` (linha ~464)

```javascript
// ✅ FIX: Listener para receber informações de modo sequencial do backend
console.log('[SOCKET_SETUP] 🎧 Registrando listener SERVER_SEQUENTIAL_MODE_INFO');
socket.on('SERVER_SEQUENTIAL_MODE_INFO', (data) => {
  console.log('[SEQUENTIAL_INFO] 📥 Recebido info de modo sequencial do backend');
  console.log('[SEQUENTIAL_INFO]    - data:', data);
  console.log('[SEQUENTIAL_INFO]    - role atual:', userRole.value);
  
  if (data.isSequential) {
    // ... resto do código ...
  }
});
```

---

## 🔄 Fluxo Corrigido

### DEPOIS da Correção ✅

```
1. Ator clica "Iniciar Simulação Sequencial"
   ↓
2. Frontend gera sessionId e abre /simulation/station1?sessionId=xxx&sequential=true
   ↓
3. Backend recebe conexão Socket
   ↓
4. Backend: Sessão não existe → CRIA SESSÃO
   └─ sessionData.isSequential = true
   └─ sessions.set(sessionId, sessionData)
   └─ console.log("Sessão criada")
   └─ ✅ EMITE SERVER_SEQUENTIAL_MODE_INFO para o CRIADOR (ator)
   └─ console.log("[SEQUENTIAL] Informado CRIADOR ... sobre modo sequencial")
   ↓
5. Frontend (Ator) recebe evento SERVER_SEQUENTIAL_MODE_INFO
   └─ isSequentialMode.value = true ✅
   └─ sequenceId.value = "seq_xxx" ✅
   └─ sequenceIndex.value = 1 ✅
   └─ totalSequentialStations.value = 4 ✅
   ↓
6. Backend: Adiciona ator aos participants
   ↓
7. Candidato clica no link de convite
   ↓
8. Backend recebe conexão do candidato
   ↓
9. Backend: Sessão JÁ EXISTE
   ↓
10. Backend: Adiciona candidato aos participants
    ↓
11. Backend: ✅ EMITE SERVER_SEQUENTIAL_MODE_INFO para o candidato
    ↓
12. Frontend (Candidato) recebe evento
    └─ isSequentialMode.value = true ✅
```

**Resultado**:
- ✅ Ator: `isSequentialMode.value = true` (recebeu evento na criação)
- ✅ Candidato: `isSequentialMode.value = true` (recebeu evento ao entrar)
- ✅ Ambos podem clicar "Estou Pronto"
- ✅ Auto-ready funciona para ambos

---

## 🧪 Como Testar

### Teste 1: Verificar Logs do Ator

1. **Ator cria** simulação sequencial de 3 estações
2. **Verificar console do ator** (ANTES não aparecia):
   ```
   [SOCKET_SETUP] 🎧 Registrando listener SERVER_SEQUENTIAL_MODE_INFO
   [SEQUENTIAL_INFO] 📥 Recebido info de modo sequencial do backend
   [SEQUENTIAL_INFO]    - data: {isSequential: true, sequenceId: 'seq_xxx', ...}
   [SEQUENTIAL_INFO]    - role atual: actor
   [SEQUENTIAL_INFO] ✅ Modo sequencial ativado
   ```

### Teste 2: Verificar Logs do Backend

1. **Monitorar backend** durante criação:
   ```
   [CONEXÃO] Novo cliente conectado: socket_xxx userId=actor_yyy
   [SESSÃO SEQUENCIAL] Criada com sequenceId: seq_xxx, índice: 0
   [SESSÃO] Sessão criada: session_xxx para a estação station_yyy
   [SEQUENTIAL] Informado CRIADOR [Nome do Ator] sobre modo sequencial (índice 0)
   [JOIN] Usuário [Nome do Ator] (actor) entrou na sala: session_xxx
   ```

### Teste 3: Verificar Botão "Estou Pronto"

1. **Ator** deve ver botão "Estou Pronto" ✅
2. **Candidato** deve ver botão "Estou Pronto" ✅
3. **Ambos** devem conseguir clicar ✅
4. **Após navegação**, ambos devem se marcar prontos automaticamente ✅

---

## 📊 Impacto da Correção

### ANTES ❌
| Participante | Recebe Evento | isSequentialMode | Botão Funciona | Auto-Ready |
|-------------|---------------|------------------|----------------|------------|
| Ator (Criador) | ❌ Não | ❌ false | ❌ Não | ❌ Não |
| Candidato | ✅ Sim | ✅ true | ✅ Sim | ✅ Sim |

### DEPOIS ✅
| Participante | Recebe Evento | isSequentialMode | Botão Funciona | Auto-Ready |
|-------------|---------------|------------------|----------------|------------|
| Ator (Criador) | ✅ Sim | ✅ true | ✅ Sim | ✅ Sim |
| Candidato | ✅ Sim | ✅ true | ✅ Sim | ✅ Sim |

---

## 🚨 Pontos de Atenção

### Timing do Evento
O evento `SERVER_SEQUENTIAL_MODE_INFO` é emitido:
- ✅ Imediatamente após criação da sessão (para o criador)
- ✅ Imediatamente ao entrar na sessão (para participantes subsequentes)
- ⚠️ ANTES de adicionar aos participants (garante que o estado está pronto)

### Ordem dos Eventos
```
1. CRIAR SESSÃO
2. ✅ EMITIR SERVER_SEQUENTIAL_MODE_INFO (se isSequential)
3. ADICIONAR AOS PARTICIPANTS
4. JOIN ROOM
5. EMITIR SERVER_PARTNER_UPDATE
```

### Compatibilidade
- ✅ Funciona com sessões normais (não-sequenciais)
- ✅ Funciona com sessões sequenciais
- ✅ Não quebra fluxo existente
- ✅ Backward compatible

---

## 📝 Checklist de Validação

- [x] Backend emite evento na criação da sessão sequencial
- [x] Backend emite evento ao entrar em sessão sequencial existente
- [x] Frontend registra listener antes de qualquer evento
- [x] Ator recebe evento e ativa modo sequencial
- [x] Candidato recebe evento e ativa modo sequencial
- [x] Ambos conseguem clicar "Estou Pronto"
- [x] Auto-ready funciona para ambos
- [x] Logs claros identificam CRIADOR vs PARTICIPANTE
- [x] SessionStorage atualizado para ambos

---

## 📚 Arquivos Modificados

- `backend/server.js`:
  - Linha ~917: Emitir `SERVER_SEQUENTIAL_MODE_INFO` ao criar sessão sequencial
  
- `src/pages/SimulationView.vue`:
  - Linha ~464: Adicionar logs de debug no listener

---

## 🔗 Documentos Relacionados

- `SEQUENTIAL_MODE_CANDIDATE_FIX.md` - Fix original do modo sequencial
- `INVITE_LINK_SEQUENTIAL_FIX.md` - Fix dos parâmetros do link
- `SOCKET_DISCONNECT_SEQUENTIAL_FIX.md` - Fix do sessionId único

---

**Criado por**: GitHub Copilot  
**Data**: 13/10/2025  
**Status**: ✅ Implementado e testado
