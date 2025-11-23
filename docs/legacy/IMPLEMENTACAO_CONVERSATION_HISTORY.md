# Implementação: Coleta de Histórico de Conversa para Avaliação por IA

## ✅ Status: IMPLEMENTADO

Data: 30/10/2025
Arquivo: `src/pages/SimulationView.vue`

---

## 📋 Resumo

Implementada a coleta automática de histórico de conversa (`conversationHistory`) no `SimulationView.vue` para permitir que a avaliação automática por IA funcione corretamente em simulações com ator humano.

---

## 🔧 Mudanças Implementadas

### 1. **Listeners Socket.IO para Transcrições** (Linhas 851-897)

Adicionados dois novos listeners Socket.IO na função `connectWebSocket()`:

#### `SERVER_AI_TRANSCRIPT_UPDATE`
- Captura novas transcrições em tempo real
- Adiciona ao `conversationHistory` automaticamente
- Inclui limite de segurança (máx 500 entradas)

```javascript
socket.on('SERVER_AI_TRANSCRIPT_UPDATE', (entry) => {
  if (!entry || !entry.text) return;
  
  logger.info('[CONVERSATION_HISTORY] 📝 Nova transcrição recebida');
  
  conversationHistory.value.push({
    role: entry.role,
    content: entry.text,
    timestamp: entry.timestamp || new Date().toISOString(),
    speakerId: entry.speakerId,
    speakerName: entry.speakerName
  });
  
  if (conversationHistory.value.length > 500) {
    conversationHistory.value.shift();
  }
});
```

#### `SERVER_AI_TRANSCRIPT_SYNC`
- Sincroniza histórico completo com backend
- Mapeia formato do backend para formato frontend
- Usado para recuperar histórico ao iniciar avaliação

```javascript
socket.on('SERVER_AI_TRANSCRIPT_SYNC', (data) => {
  if (data && Array.isArray(data.conversationHistory)) {
    conversationHistory.value = data.conversationHistory.map(entry => ({
      role: entry.role,
      content: entry.text || entry.content,
      timestamp: entry.timestamp,
      speakerId: entry.speakerId,
      speakerName: entry.speakerName
    }));
  }
});
```

---

### 2. **Função de Sincronização** (Linhas 423-481)

Criada função `syncConversationHistory()` com:
- Promise para controle assíncrono
- Timeout de 5 segundos
- Tratamento de erros robusto
- Logs detalhados

```javascript
const syncConversationHistory = () => {
  return new Promise((resolve, reject) => {
    if (!socketRef.value?.connected) {
      logger.warn('[CONVERSATION_HISTORY] ⚠️ Socket não conectado');
      resolve([]);
      return;
    }
    
    const timeout = setTimeout(() => {
      logger.warn('[CONVERSATION_HISTORY] ⏱️ Timeout ao aguardar sincronização');
      resolve(conversationHistory.value);
    }, 5000);
    
    const syncHandler = (data) => {
      clearTimeout(timeout);
      // ... mapear dados e resolver
      socketRef.value.off('SERVER_AI_TRANSCRIPT_SYNC', syncHandler);
    };
    
    socketRef.value.once('SERVER_AI_TRANSCRIPT_SYNC', syncHandler);
    socketRef.value.emit('CLIENT_REQUEST_AI_TRANSCRIPT_SYNC');
  });
}
```

---

### 3. **Modificação em handleAIEvaluationAccept** (Linhas 390-434)

Atualizada para sincronizar histórico antes de avaliar:

**ANTES:**
```javascript
const handleAIEvaluationAccept = async () => {
  showAIEvaluationDialog.value = false
  enableAIEvaluation.value = true
  
  const result = await runAiEvaluation(); // ❌ conversationHistory vazio
  // ...
}
```

**DEPOIS:**
```javascript
const handleAIEvaluationAccept = async () => {
  showAIEvaluationDialog.value = false
  enableAIEvaluation.value = true

  // ✅ Sincronizar histórico primeiro
  logger.info('[IA_EVALUATION] 🔄 Sincronizando histórico de conversa...');
  const syncedHistory = await syncConversationHistory();
  
  if (syncedHistory.length === 0) {
    logger.warn('[IA_EVALUATION] ⚠️ Histórico vazio');
    showNotification(
      'Não há histórico de conversa para avaliar.',
      'warning'
    );
  }

  // ✅ Avaliar com histórico sincronizado
  const result = await runAiEvaluation();
  // ...
}
```

---

### 4. **Cleanup de Listeners** (Linhas 1491-1494)

Adicionado cleanup no `onUnmounted()`:

```javascript
onUnmounted(() => {
  if (socketRef.value) {
    socketRef.value.off('INTERNAL_INVITE_RECEIVED', handleInternalInviteReceived);
    
    // ✅ NOVO: Limpar listeners de transcrição
    socketRef.value.off('SERVER_AI_TRANSCRIPT_UPDATE');
    socketRef.value.off('SERVER_AI_TRANSCRIPT_SYNC');
    logger.info('[CONVERSATION_HISTORY] 🧹 Listeners removidos');
  }
});
```

---

## 🔄 Fluxo Completo

### Durante a Simulação:
1. Ator e candidato conversam
2. Backend captura transcrições (se sistema de transcrição estiver ativo)
3. Backend emite `SERVER_AI_TRANSCRIPT_UPDATE` para cada nova transcrição
4. Frontend recebe e adiciona ao `conversationHistory` automaticamente
5. Histórico é armazenado em `session.conversationHistory` no backend

### Ao Final da Simulação:
1. Candidato vê diálogo "Deseja avaliação por IA?"
2. Candidato aceita → `handleAIEvaluationAccept()` é chamada
3. Frontend solicita sincronização: `CLIENT_REQUEST_AI_TRANSCRIPT_SYNC`
4. Backend envia histórico completo: `SERVER_AI_TRANSCRIPT_SYNC`
5. Frontend mapeia dados e popula `conversationHistory`
6. Frontend chama `runAiEvaluation()` com histórico preenchido
7. IA recebe conversa completa e avalia baseada em dados reais
8. Feedback é exibido ao candidato

---

## 📊 Logs Implementados

A implementação inclui logs detalhados para debugging:

### Logs de Captura:
```
[CONVERSATION_HISTORY] 📝 Nova transcrição recebida
[CONVERSATION_HISTORY] ⚠️ Histórico atingiu limite, removendo entrada mais antiga
```

### Logs de Sincronização:
```
[CONVERSATION_HISTORY] 📡 Solicitando sincronização de histórico...
[CONVERSATION_HISTORY] 🔄 Sincronização de histórico recebida (X entries)
[CONVERSATION_HISTORY] ✅ Histórico sincronizado com sucesso (X entries)
[CONVERSATION_HISTORY] ⏱️ Timeout ao aguardar sincronização
[CONVERSATION_HISTORY] ⚠️ Socket não conectado, impossível sincronizar
```

### Logs de Avaliação:
```
[IA_EVALUATION] 🤖 Candidato aceitou avaliação por IA, iniciando...
[IA_EVALUATION] 🔄 Sincronizando histórico de conversa antes da avaliação...
[IA_EVALUATION] ⚠️ Histórico de conversa vazio após sincronização
[IA_EVALUATION] ✅ Histórico sincronizado (X entries)
[IA_EVALUATION] ✅ Avaliação por IA concluída com sucesso
```

### Logs de Cleanup:
```
[CONVERSATION_HISTORY] 🧹 Listeners de transcrição removidos no unmount
```

---

## ⚠️ Requisitos para Funcionamento Completo

### Backend deve ter:
1. ✅ Socket.IO configurado (já implementado em `backend/server.js`)
2. ✅ Listeners para `CLIENT_REQUEST_AI_TRANSCRIPT_SYNC` (já implementado)
3. ✅ Emissão de `SERVER_AI_TRANSCRIPT_UPDATE` (já implementado)
4. ✅ Emissão de `SERVER_AI_TRANSCRIPT_SYNC` (já implementado)
5. ✅ Armazenamento em `session.conversationHistory` (já implementado)

### Faltando Implementar:
6. ⚠️ **Sistema de captura de transcrições em tempo real**
   - Opção 1: Integrar com Speech-to-Text da gravação contínua
   - Opção 2: Implementar botão manual para enviar transcrições
   - Opção 3: Usar sistema de chat integrado

---

## 🚀 Próximos Passos Recomendados

### Prioridade Alta:
1. **Implementar captura de transcrições em tempo real**
   - Integrar com `useContinuousRecording` composable
   - Adicionar Speech-to-Text (Google Cloud Speech-to-Text API)
   - Enviar transcrições via Socket: `CLIENT_AI_TRANSCRIPT_ENTRY`

2. **Adicionar UI para visualizar histórico**
   - Componente para mostrar conversationHistory durante simulação
   - Permitir edição manual de transcrições incorretas

### Prioridade Média:
3. **Migrar para endpoint `/ai-chat/evaluate-pep`**
   - Atualizar `useAiEvaluation.js` linha 77
   - Endpoint mais robusto com 4 tentativas de parsing JSON

4. **Adicionar confirmação visual**
   - Indicador de sincronização em andamento
   - Badge mostrando quantidade de entradas no histórico

### Prioridade Baixa:
5. **Implementar cache de histórico**
   - Salvar no localStorage como backup
   - Recuperar em caso de desconexão

---

## 🧪 Como Testar

### Teste Manual:
1. Iniciar simulação com ator humano
2. Usar console do navegador para verificar logs
3. Ao final, aceitar avaliação por IA
4. Verificar logs de sincronização
5. Verificar se avaliação usa histórico sincronizado

### Teste com Mock:
```javascript
// No console do navegador após conectar socket
socketRef.value.emit('CLIENT_AI_TRANSCRIPT_ENTRY', {
  text: 'Teste de transcrição manual',
  role: 'candidate',
  timestamp: new Date().toISOString()
});

// Verificar se aparece no conversationHistory
console.log(conversationHistory.value);
```

### Verificar Sincronização:
```javascript
// Solicitar sincronização manualmente
socketRef.value.emit('CLIENT_REQUEST_AI_TRANSCRIPT_SYNC');

// Aguardar resposta e verificar
socketRef.value.once('SERVER_AI_TRANSCRIPT_SYNC', (data) => {
  console.log('Histórico sincronizado:', data.conversationHistory);
});
```

---

## 📝 Exemplo de Uso no Backend

Para popular o histórico, o backend ou frontend deve emitir:

```javascript
// Backend (backend/server.js)
socket.on('CLIENT_AI_TRANSCRIPT_ENTRY', (payload) => {
  const entry = {
    role: payload.role || role,
    text: payload.text.trim(),
    timestamp: payload.timestamp || new Date().toISOString(),
    speakerId: payload.speakerId || userId,
    speakerName: payload.speakerName || displayName
  };
  
  session.conversationHistory.push(entry);
  io.to(sessionId).emit('SERVER_AI_TRANSCRIPT_UPDATE', entry);
});
```

---

## 🔗 Arquivos Relacionados

### Modificados:
- ✅ `src/pages/SimulationView.vue` (implementação completa)

### Para Integração Futura:
- `src/composables/useContinuousRecording.js` - gravação de áudio
- `src/composables/useAiEvaluation.js` - avaliação por IA
- `backend/server.js` - Socket.IO handlers
- `backend/routes/aiChat.js` - endpoint de avaliação

---

## ✅ Conclusão

A coleta de histórico de conversa foi **implementada com sucesso** no `SimulationView.vue`. O sistema agora:

- ✅ Captura transcrições via Socket.IO
- ✅ Sincroniza com backend antes da avaliação
- ✅ Popula `conversationHistory` automaticamente
- ✅ Tem tratamento de erros robusto
- ✅ Inclui logs detalhados para debugging
- ✅ Tem cleanup adequado de recursos

**Próximo passo crítico:** Implementar o sistema de captura de transcrições em tempo real (Speech-to-Text ou chat integrado).

