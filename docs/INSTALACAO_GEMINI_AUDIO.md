# Instalação Rápida: Sistema de Transcrição Gemini

## 📋 Pré-requisitos

- Node.js 18+ instalado
- Chaves da API Gemini ([obter aqui](https://makersuite.google.com/app/apikey))
- Projeto REVALIDAFLOW funcionando

---

## 🚀 Instalação em 5 Minutos

### Passo 1: Configurar Variáveis de Ambiente

Edite o arquivo `backend/.env`:

```env
# ✅ Adicione suas chaves da API Gemini
# Recomendado: Usar múltiplas chaves para evitar limites de quota

GEMINI_API_KEY=AIza...sua-chave-principal-aqui
GEMINI_API_KEY_2=AIza...sua-chave-2-aqui
GEMINI_API_KEY_3=AIza...sua-chave-3-aqui
GEMINI_API_KEY_4=AIza...sua-chave-4-aqui
GEMINI_API_KEY_5=AIza...sua-chave-5-aqui

# Nota: Mínimo 1 chave, recomendado 3-5 chaves
```

### Passo 2: Instalar Dependências

```bash
cd backend
npm install @google/generative-ai multer
```

### Passo 3: Verificar Arquivos Criados

Certifique-se de que os seguintes arquivos existem:

**Backend:**
- ✅ `backend/services/geminiAudioTranscription.js`
- ✅ `backend/routes/audioTranscription.js`
- ✅ `backend/server.js` (atualizado com nova rota)

**Frontend:**
- ✅ `src/composables/useCandidateAudioTranscription.js`

### Passo 4: Reiniciar Backend

```bash
# Parar backend (Ctrl+C)
# Iniciar novamente
npm start
```

### Passo 5: Testar

```bash
# Health check
curl http://localhost:3000/api/audio-transcription/health

# Deve retornar:
{
  "status": "healthy",
  "service": "Gemini Audio Transcription",
  "model": "gemini-2.0-flash-exp",
  "keysLoaded": 5
}
```

---

## 🧪 Teste Rápido

### Teste Backend (Terminal):

```bash
# Conectividade com Gemini
curl http://localhost:3000/api/audio-transcription/test
```

Resposta esperada:
```json
{
  "success": true,
  "message": "Serviço de transcrição Gemini 2.0 Flash disponível",
  "keysLoaded": 5,
  "model": "gemini-2.0-flash-exp",
  "maxAudioDuration": "8.4 horas",
  "maxFileSize": "25MB por chunk"
}
```

### Teste Frontend (Console do Navegador):

1. Abra o console do navegador (F12)
2. Cole e execute:

```javascript
// Testar permissão de microfone
navigator.mediaDevices.getUserMedia({ audio: true })
  .then(stream => {
    console.log('✅ Permissão de microfone concedida!');
    stream.getTracks().forEach(track => track.stop());
  })
  .catch(error => {
    console.error('❌ Erro:', error);
  });
```

---

## 🎯 Integração no SimulationView.vue

### Passo 1: Importar Composable

Adicione no início de `<script setup>`:

```javascript
import { useCandidateAudioTranscription } from '@/composables/useCandidateAudioTranscription.js'
```

### Passo 2: Inicializar Composable

Após as outras inicializações:

```javascript
// Inicializar captura de áudio do candidato
const audioTranscription = useCandidateAudioTranscription({
  sessionId,
  userId: computed(() => currentUser.value?.uid),
  socketRef
});
```

### Passo 3: Adicionar Watchers

```javascript
// Iniciar captura quando simulação começar (APENAS PARA CANDIDATO)
watch(simulationStarted, async (started) => {
  if (started && isCandidate.value) {
    logger.info('[AUDIO] 🎤 Iniciando captura de áudio do candidato...');
    
    const hasPermission = await audioTranscription.requestMicrophonePermission();
    
    if (hasPermission) {
      const captureStarted = await audioTranscription.startCapture();
      
      if (captureStarted) {
        logger.info('[AUDIO] ✅ Captura de áudio iniciada com sucesso');
        showNotification('Captura de áudio iniciada', 'info');
      } else {
        logger.error('[AUDIO] ❌ Falha ao iniciar captura');
        showNotification('Erro ao iniciar captura de áudio', 'error');
      }
    } else {
      logger.warn('[AUDIO] ⚠️ Permissão de microfone negada');
      showNotification('Permissão de microfone necessária', 'warning');
    }
  }
});

// Parar captura quando simulação terminar
watch(simulationEnded, (ended) => {
  if (ended && audioTranscription.isCapturing.value) {
    logger.info('[AUDIO] ⏹️ Parando captura de áudio...');
    audioTranscription.stopCapture();
    
    logger.info('[AUDIO] 📊 Estatísticas finais:', {
      chunksRecorded: audioTranscription.stats.value.chunksRecorded,
      chunksTranscribed: audioTranscription.stats.value.chunksTranscribed,
      duration: audioTranscription.stats.value.totalAudioDuration + 's'
    });
  }
});

// Cleanup ao desmontar
onUnmounted(() => {
  if (audioTranscription.isCapturing.value) {
    audioTranscription.cleanup();
    logger.info('[AUDIO] 🧹 Recursos de áudio limpos');
  }
});
```

### Passo 4: Adicionar Indicador Visual (Opcional)

No template, adicione um indicador de status:

```vue
<template>
  <!-- Indicador de captura de áudio (apenas para candidato) -->
  <VChip
    v-if="isCandidate && audioTranscription.isCapturing.value"
    color="success"
    variant="elevated"
    class="audio-capture-indicator"
  >
    <VIcon icon="ri-mic-line" class="me-1" size="small" />
    Gravando áudio
  </VChip>
</template>

<style scoped>
.audio-capture-indicator {
  position: fixed;
  bottom: 20px;
  left: 20px;
  z-index: 1000;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
</style>
```

---

## ✅ Checklist de Instalação

- [ ] Chaves API configuradas em `backend/.env`
- [ ] Dependências instaladas (`@google/generative-ai`, `multer`)
- [ ] Backend reiniciado
- [ ] Health check passou (`/api/audio-transcription/health`)
- [ ] Teste de conectividade passou (`/api/audio-transcription/test`)
- [ ] Composable importado em `SimulationView.vue`
- [ ] Watchers adicionados
- [ ] Cleanup implementado
- [ ] Indicador visual adicionado (opcional)
- [ ] Teste manual realizado

---

## 🐛 Problemas Comuns

### "Error: No API keys configured"

**Causa:** Variáveis `GEMINI_API_KEY` não encontradas

**Solução:**
1. Verificar se `.env` está no diretório `backend/`
2. Verificar se variável está correta: `GEMINI_API_KEY=AIza...`
3. Reiniciar backend após alterar `.env`

### "Permission denied for microphone"

**Causa:** Navegador bloqueou acesso ao microfone

**Solução:**
1. Clicar no ícone de cadeado na barra de endereços
2. Permitir acesso ao microfone
3. Recarregar a página

### "HTTP 429: Quota exceeded"

**Causa:** Limite de quota da API Gemini

**Solução:**
1. Adicionar mais chaves API em `.env`
2. Aguardar alguns minutos e tentar novamente
3. Verificar quota no [Google AI Studio](https://makersuite.google.com/)

### "Transcrição vazia"

**Causa:** Áudio muito baixo ou sem fala

**Solução:**
1. Verificar se microfone está funcionando
2. Testar em outra aplicação (ex: gravador de voz)
3. Aumentar volume do microfone
4. Falar mais próximo ao microfone

---

## 📊 Logs para Verificação

### Logs Backend (esperados):

```
🎤 [GEMINI_AUDIO] Iniciando transcrição com Gemini 2.0 Flash...
📊 [GEMINI_AUDIO] Informações do áudio:
  - mimeType: audio/webm
  - sizeBytes: 125432
  - estimatedDuration: 10s
✅ [GEMINI_AUDIO] Transcrição concluída!
  - durationMs: 2341
  - transcriptionLength: 156
  - wordsEstimate: 28
```

### Logs Frontend (esperados):

```
[AUDIO] 🎤 Iniciando captura de áudio do candidato...
[MIC_PERMISSION] 🎤 Solicitando permissão de microfone...
[MIC_PERMISSION] ✅ Permissão de microfone concedida
[CAPTURE] 🎙️ Iniciando captura de áudio do candidato...
[CAPTURE] ✅ Captura iniciada com sucesso!
[CAPTURE] 📦 Chunk capturado (size: 125432, totalChunks: 1)
[TRANSCRIBE] 📤 Enviando chunk para transcrição...
[TRANSCRIBE] ✅ Transcrição recebida! (length: 156, wordCount: 28)
[TRANSCRIBE] 📡 Enviando transcrição via Socket.IO...
```

---

## 🎓 Próximos Passos

Após instalação bem-sucedida:

1. **Testar em simulação real** (10 minutos)
2. **Verificar qualidade da transcrição** (precisão)
3. **Ajustar chunks** se necessário (atualmente 10s)
4. **Monitorar custos** da API Gemini
5. **Adicionar feedback visual** para o candidato

---

## 📚 Documentação Completa

- **Guia Completo:** [`GEMINI_AUDIO_TRANSCRIPTION_GUIDE.md`](./GEMINI_AUDIO_TRANSCRIPTION_GUIDE.md)
- **Sincronização:** [`IMPLEMENTACAO_CONVERSATION_HISTORY.md`](./IMPLEMENTACAO_CONVERSATION_HISTORY.md)
- **Uso Rápido:** [`GUIA_RAPIDO_AVALIACAO_IA.md`](./GUIA_RAPIDO_AVALIACAO_IA.md)

---

## 💬 Suporte

Se encontrar problemas:

1. Verificar logs do backend e frontend
2. Consultar seção "Troubleshooting" do guia completo
3. Verificar health check: `/api/audio-transcription/health`
4. Testar com áudio curto primeiro (30 segundos)

---

**Data:** 30 de outubro de 2025  
**Status:** ✅ Pronto para Instalação  
**Tempo estimado:** 5-10 minutos







