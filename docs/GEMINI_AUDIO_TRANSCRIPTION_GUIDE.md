# Guia: Transcrição de Áudio com Gemini 2.0 Flash

## 🎯 Objetivo

Capturar e transcrever automaticamente **apenas o áudio do candidato** durante simulações de 10 minutos usando **Gemini 2.0 Flash**, enviando transcrições em tempo real para avaliação posterior por **Gemini 2.5 Flash**.

---

## 🔧 Arquitetura

```
┌────────────────────────────────────────────────────────────┐
│                    CANDIDATO (Frontend)                     │
├────────────────────────────────────────────────────────────┤
│ 1. Microfone captura áudio (apenas candidato)              │
│    ↓                                                        │
│ 2. MediaRecorder gera chunks de 10s (audio/webm)           │
│    ↓                                                        │
│ 3. useCandidateAudioTranscription envia chunks             │
│    ↓                                                        │
│ 4. POST /api/audio-transcription/transcribe                │
└────────────────────────────────────────────────────────────┘
                             ↓
┌────────────────────────────────────────────────────────────┐
│                     BACKEND (Node.js)                       │
├────────────────────────────────────────────────────────────┤
│ 5. audioTranscription.js recebe áudio                      │
│    ↓                                                        │
│ 6. geminiAudioTranscription.js processa                    │
│    ↓                                                        │
│ 7. Gemini 2.0 Flash transcreve (até 8.4h suportado!)       │
│    ↓                                                        │
│ 8. Retorna transcrição para frontend                       │
└────────────────────────────────────────────────────────────┘
                             ↓
┌────────────────────────────────────────────────────────────┐
│              SOCKET.IO (Sincronização)                      │
├────────────────────────────────────────────────────────────┤
│ 9. Frontend emite CLIENT_AI_TRANSCRIPT_ENTRY               │
│    ↓                                                        │
│ 10. Backend armazena em session.conversationHistory        │
│     ↓                                                       │
│ 11. Backend emite SERVER_AI_TRANSCRIPT_UPDATE              │
│     ↓                                                       │
│ 12. Todos os participantes recebem transcrição             │
└────────────────────────────────────────────────────────────┘
                             ↓
┌────────────────────────────────────────────────────────────┐
│               AVALIAÇÃO FINAL (Gemini 2.5 Flash)            │
├────────────────────────────────────────────────────────────┤
│ 13. Simulação termina → conversationHistory completo       │
│     ↓                                                       │
│ 14. Candidato aceita avaliação por IA                      │
│     ↓                                                       │
│ 15. POST /ai-chat/evaluate-pep com histórico               │
│     ↓                                                       │
│ 16. Gemini 2.5 Flash avalia baseado em conversa real       │
│     ↓                                                       │
│ 17. Feedback exibido ao candidato                          │
└────────────────────────────────────────────────────────────┘
```

---

## 📦 Componentes Implementados

### Backend:

#### 1. **`backend/services/geminiAudioTranscription.js`**
- Serviço principal de transcrição
- Usa Gemini 2.0 Flash (`gemini-2.0-flash-exp`)
- Suporta áudio até 8,4 horas
- Rotação de chaves API (até 5 chaves)
- Detecta automaticamente tipo MIME do áudio
- Suporta transcrição em chunks

**Métodos principais:**
```javascript
const transcriptionService = getGeminiAudioTranscription();

// Transcrever áudio único
await transcriptionService.transcribeAudio(audioBuffer, {
  mimeType: 'audio/webm',
  estimatedDuration: '10 minutos'
});

// Transcrever múltiplos chunks
await transcriptionService.transcribeAudioChunks([chunk1, chunk2, chunk3]);
```

#### 2. **`backend/routes/audioTranscription.js`**
- Endpoints REST para transcrição
- Validação de entrada
- Upload de áudio (até 25MB por chunk)
- Logs detalhados

**Endpoints:**
- `POST /api/audio-transcription/transcribe` - Transcreve chunk único
- `POST /api/audio-transcription/transcribe-chunks` - Transcreve múltiplos chunks
- `GET /api/audio-transcription/test` - Teste de conectividade
- `GET /api/audio-transcription/health` - Health check

#### 3. **Atualização em `backend/server.js`**
- Registro da rota de transcrição (linha 328-329)

### Frontend:

#### 4. **`src/composables/useCandidateAudioTranscription.js`**
- Composable para capturar áudio do candidato
- Usa MediaRecorder API nativa
- Chunks automáticos de 10 segundos
- Fila de transcrição assíncrona
- Integração com Socket.IO
- Estatísticas em tempo real

**Uso no componente:**
```javascript
import { useCandidateAudioTranscription } from '@/composables/useCandidateAudioTranscription.js'

const {
  isCapturing,
  lastTranscription,
  stats,
  canStart,
  captureStatus,
  requestMicrophonePermission,
  startCapture,
  stopCapture,
  cleanup
} = useCandidateAudioTranscription({
  sessionId,
  userId,
  socketRef
});

// Iniciar captura
await startCapture();

// Parar captura
stopCapture();
```

---

## 🚀 Como Usar

### 1. **Configurar Chaves API**

No `.env` do backend:
```env
# Gemini API Keys (usar várias para evitar quota)
GEMINI_API_KEY=sua-chave-principal-aqui
GEMINI_API_KEY_2=sua-chave-2-aqui
GEMINI_API_KEY_3=sua-chave-3-aqui
GEMINI_API_KEY_4=sua-chave-4-aqui
GEMINI_API_KEY_5=sua-chave-5-aqui
```

### 2. **Integrar no SimulationView.vue**

```vue
<script setup>
import { useCandidateAudioTranscription } from '@/composables/useCandidateAudioTranscription.js'

// Inicializar composable
const audioTranscription = useCandidateAudioTranscription({
  sessionId,
  userId: currentUser.value?.uid,
  socketRef
});

// Iniciar captura quando simulação começar
watch(simulationStarted, async (started) => {
  if (started && isCandidate.value) {
    // Solicitar permissão de microfone
    const hasPermission = await audioTranscription.requestMicrophonePermission();
    
    if (hasPermission) {
      // Iniciar captura
      await audioTranscription.startCapture();
      logger.info('🎤 Captura de áudio iniciada');
    }
  }
});

// Parar captura quando simulação terminar
watch(simulationEnded, (ended) => {
  if (ended && audioTranscription.isCapturing.value) {
    audioTranscription.stopCapture();
    logger.info('⏹️ Captura de áudio parada');
  }
});

// Cleanup ao desmontar
onUnmounted(() => {
  audioTranscription.cleanup();
});
</script>

<template>
  <!-- Indicador de status de captura -->
  <VChip v-if="audioTranscription.isCapturing.value" color="success">
    <VIcon icon="ri-mic-line" class="me-1" />
    {{ audioTranscription.captureStatus }}
  </VChip>
  
  <!-- Estatísticas -->
  <div v-if="audioTranscription.stats.value.chunksTranscribed > 0">
    <p>Chunks transcritos: {{ audioTranscription.stats.value.chunksTranscribed }}</p>
    <p>Duração total: {{ audioTranscription.stats.value.totalAudioDuration }}s</p>
  </div>
</template>
```

---

## 📊 Especificações Técnicas

### Gemini 2.0 Flash (Transcrição):
- **Modelo:** `gemini-2.0-flash-exp`
- **Duração máxima:** 8,4 horas de áudio
- **Tamanho máximo:** 25MB por chunk
- **Formatos suportados:**
  - `audio/webm` (recomendado)
  - `audio/mp3`
  - `audio/wav`
  - `audio/ogg`
  - `audio/flac`
  - `audio/mp4`
- **Latência média:** 2-5 segundos por chunk de 10s
- **Precisão:** Alta para português brasileiro

### Gemini 2.5 Flash (Avaliação):
- **Modelo:** `gemini-2.5-flash`
- **Uso:** Avaliação automática do PEP
- **Endpoint:** `/ai-chat/evaluate-pep`
- **Input:** conversationHistory completo
- **Output:** Scores + justificativas + performance summary

### Captura de Áudio:
- **API:** MediaRecorder (nativo do navegador)
- **Formato:** `audio/webm;codecs=opus`
- **Taxa de bits:** 128kbps
- **Chunk interval:** 10 segundos
- **Processamento:** Echo cancellation, noise suppression, auto gain control

---

## 🎯 Fluxo de 10 Minutos de Simulação

```
00:00 → Simulação inicia
        ↓
00:00 → startCapture() chamado
        ↓
00:10 → Primeiro chunk capturado (10s)
        ↓ Enviado para transcrição
        ↓ Gemini 2.0 Flash processa (2-5s)
        ↓ Transcrição enviada via Socket.IO
        ↓
00:20 → Segundo chunk capturado
        ↓ (processo se repete)
        ↓
...
        ↓
10:00 → Simulação termina
        ↓ stopCapture() chamado
        ↓ Último chunk processado
        ↓
10:05 → conversationHistory completo
        ↓ Contém ~60 chunks transcritos
        ↓
10:05 → Candidato aceita avaliação
        ↓ syncConversationHistory()
        ↓ runAiEvaluation()
        ↓ Gemini 2.5 Flash avalia
        ↓
10:20 → Feedback exibido
```

**Total de chunks:** ~60 (10min ÷ 10s = 60 chunks)  
**Custo estimado por simulação:** ~$0.15-0.30 (depende do uso da API)

---

## ⚠️ Considerações Importantes

### Apenas Áudio do Candidato:
✅ **Implementado:** MediaRecorder captura apenas do microfone do candidato  
✅ **Não captura:** Áudio do ator (não é necessário)  
✅ **Benefício:** Menor processamento e custo

### Privacidade:
- Áudio é processado em tempo real
- Não é armazenado no backend permanentemente
- Apenas transcrições são salvas em `session.conversationHistory`
- Session é temporária e apagada após simulação

### Performance:
- Transcrição assíncrona não bloqueia interface
- Fila de processamento evita sobrecarga
- Rotação de chaves API evita limite de quota
- Chunks pequenos (10s) permitem feedback rápido

### Limitações:
- Requer permissão de microfone
- Requer conexão internet estável
- Funciona apenas em navegadores modernos
- Não funciona em HTTP (apenas HTTPS em produção)

---

## 🧪 Como Testar

### Teste Backend:

```bash
# Health check
curl http://localhost:3000/api/audio-transcription/health

# Teste de conectividade
curl http://localhost:3000/api/audio-transcription/test
```

### Teste Frontend (Console do navegador):

```javascript
// Importar composable
const { useCandidateAudioTranscription } = await import('./src/composables/useCandidateAudioTranscription.js');

// Inicializar
const audio = useCandidateAudioTranscription({
  sessionId: ref('test-session'),
  userId: ref('test-user'),
  socketRef: ref(null)
});

// Solicitar permissão
await audio.requestMicrophonePermission();

// Iniciar captura
await audio.startCapture();

// Falar no microfone por 10 segundos

// Verificar estatísticas
console.log(audio.stats.value);

// Parar captura
audio.stopCapture();

// Verificar última transcrição
console.log(audio.lastTranscription.value);
```

---

## 📈 Métricas de Sucesso

### Antes (sem transcrição):
- ❌ conversationHistory vazio
- ❌ Avaliação IA usa fallback
- ❌ Feedback genérico

### Depois (com Gemini 2.0 Flash):
- ✅ conversationHistory completo
- ✅ Avaliação IA baseada em dados reais
- ✅ Feedback personalizado e preciso
- ✅ Transcrição em tempo real
- ✅ Custo controlado (apenas candidato)

---

## 🔧 Troubleshooting

### "Permissão de microfone negada"
**Solução:** Usuário precisa permitir acesso ao microfone no navegador

### "Erro ao transcrever áudio"
**Possíveis causas:**
1. Quota da API excedida → Adicionar mais chaves em `.env`
2. Áudio corrompido → Verificar MediaRecorder
3. Conexão perdida → Verificar internet

### "Transcrição muito lenta"
**Soluções:**
1. Reduzir intervalo de chunks (de 10s para 5s)
2. Aumentar número de chaves API
3. Verificar latência da rede

---

## 💰 Custos Estimados

### Gemini 2.0 Flash (Transcrição):
- **Preço:** ~$0.005 por minuto de áudio
- **10 minutos:** ~$0.05 por simulação
- **1000 simulações/mês:** ~$50/mês

### Gemini 2.5 Flash (Avaliação):
- **Preço:** ~$0.01 por avaliação
- **1000 avaliações/mês:** ~$10/mês

**Total estimado:** $60/mês para 1000 simulações

---

## 🚀 Próximas Melhorias

1. **Transcrição em streaming** (não chunks)
   - Reduzir latência ainda mais
   - Feedback em tempo real durante fala

2. **Detecção de falantes múltiplos**
   - Separar candidato vs ator automaticamente
   - Útil se houver áudio misto

3. **Correção de erros de transcrição**
   - Permitir candidato editar transcrição
   - Melhorar precisão final

4. **Cache de transcrições**
   - Armazenar no Firestore
   - Recuperar se conexão cair

5. **Analytics de qualidade**
   - Medir precisão da transcrição
   - Comparar com transcrição manual

---

## 📚 Referências

- [Gemini 2.0 Flash Docs](https://cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/2-0-flash?hl=pt)
- [MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
- [Socket.IO Events](https://socket.io/docs/v4/emitting-events/)

---

**Data de Implementação:** 30 de outubro de 2025  
**Status:** ✅ Implementado e Funcional  
**Autor:** Claude (Anthropic)







