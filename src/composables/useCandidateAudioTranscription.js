import { ref, computed } from 'vue'
import { backendUrl } from '@/utils/backendUrl.js'
import Logger from '@/utils/logger.js'

const logger = new Logger('CandidateAudioTranscription');

/**
 * Composable para capturar e transcrever áudio do candidato usando Gemini 2.0 Flash
 * Apenas o áudio do candidato é capturado e transcrito
 */
export function useCandidateAudioTranscription({ sessionId, userId, socketRef }) {
  // Estados
  const isCapturing = ref(false);
  const isCaptureAllowed = ref(false);
  const audioChunks = ref([]);
  const mediaRecorder = ref(null);
  const transcriptionQueue = ref([]);
  const isTranscribing = ref(false);
  const lastTranscription = ref('');
  const transcriptionError = ref(null);

  // Estatísticas
  const stats = ref({
    chunksRecorded: 0,
    chunksSent: 0,
    chunksTranscribed: 0,
    transcriptionErrors: 0,
    totalAudioDuration: 0,
    startTime: null
  });

  // Computed
  const canStart = computed(() => {
    return !isCapturing.value && isCaptureAllowed.value;
  });

  const captureStatus = computed(() => {
    if (isCapturing.value) return 'Capturando áudio...';
    if (isCaptureAllowed.value) return 'Pronto para capturar';
    return 'Permissão de microfone necessária';
  });

  /**
   * Solicita permissão de microfone
   */
  async function requestMicrophonePermission() {
    try {
      logger.info('[MIC_PERMISSION] 🎤 Solicitando permissão de microfone...');

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }
      });

      // Parar o stream imediatamente (só queremos verificar permissão)
      stream.getTracks().forEach(track => track.stop());

      isCaptureAllowed.value = true;
      logger.info('[MIC_PERMISSION] ✅ Permissão de microfone concedida');
      
      return true;
    } catch (error) {
      logger.error('[MIC_PERMISSION] ❌ Erro ao solicitar permissão:', error);
      isCaptureAllowed.value = false;
      transcriptionError.value = 'Permissão de microfone negada';
      
      return false;
    }
  }

  /**
   * Envia chunk de áudio para transcrição
   */
  async function transcribeAudioChunk(audioBlob) {
    try {
      logger.info('[TRANSCRIBE] 📤 Enviando chunk para transcrição...', {
        size: audioBlob.size,
        type: audioBlob.type
      });

      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio-chunk.webm');
      formData.append('sessionId', sessionId.value);
      formData.append('userId', userId.value);
      formData.append('role', 'candidate');
      formData.append('timestamp', new Date().toISOString());

      const response = await fetch(`${backendUrl}/api/audio-transcription/transcribe`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erro na transcrição');
      }

      logger.info('[TRANSCRIBE] ✅ Transcrição recebida!', {
        length: result.transcription.length,
        wordCount: result.metadata.wordCount
      });

      // Atualizar estado
      lastTranscription.value = result.transcription;
      stats.value.chunksTranscribed++;

      // Enviar via Socket.IO para o histórico de conversa
      if (socketRef?.value?.connected && result.transcription.trim()) {
        logger.info('[TRANSCRIBE] 📡 Enviando transcrição via Socket.IO...');
        
        socketRef.value.emit('CLIENT_AI_TRANSCRIPT_ENTRY', {
          text: result.transcription,
          role: 'candidate',
          timestamp: result.metadata.timestamp,
          speakerId: userId.value,
          speakerName: 'Candidato'
        });
      }

      return result;

    } catch (error) {
      logger.error('[TRANSCRIBE] ❌ Erro na transcrição:', error);
      stats.value.transcriptionErrors++;
      transcriptionError.value = error.message;
      throw error;
    }
  }

  /**
   * Processa fila de transcrições
   */
  async function processTranscriptionQueue() {
    if (isTranscribing.value || transcriptionQueue.value.length === 0) {
      return;
    }

    isTranscribing.value = true;

    while (transcriptionQueue.value.length > 0) {
      const audioBlob = transcriptionQueue.value.shift();
      
      try {
        await transcribeAudioChunk(audioBlob);
      } catch (error) {
        logger.error('[QUEUE] ❌ Erro ao processar chunk da fila');
      }
    }

    isTranscribing.value = false;
  }

  /**
   * Inicia captura de áudio
   */
  async function startCapture() {
    if (isCapturing.value) {
      logger.warn('[CAPTURE] ⚠️ Captura já está em andamento');
      return false;
    }

    try {
      logger.info('[CAPTURE] 🎙️ Iniciando captura de áudio do candidato...');

      // Verificar permissão
      if (!isCaptureAllowed.value) {
        const hasPermission = await requestMicrophonePermission();
        if (!hasPermission) {
          return false;
        }
      }

      // Obter stream de áudio
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }
      });

      // Criar MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      mediaRecorder.value = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000
      });

      // Reset de chunks
      audioChunks.value = [];

      // Handler para chunks de áudio
      mediaRecorder.value.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunks.value.push(event.data);
          stats.value.chunksRecorded++;
          
          logger.info('[CAPTURE] 📦 Chunk capturado', {
            size: event.data.size,
            totalChunks: audioChunks.value.length
          });

          // Adicionar à fila de transcrição
          transcriptionQueue.value.push(event.data);
          stats.value.chunksSent++;

          // Processar fila
          processTranscriptionQueue();
        }
      };

      // Handler para quando gravação para
      mediaRecorder.value.onstop = () => {
        logger.info('[CAPTURE] ⏹️ Captura finalizada');
        
        // Parar todas as tracks
        stream.getTracks().forEach(track => track.stop());
        
        isCapturing.value = false;
      };

      // Handler para erros
      mediaRecorder.value.onerror = (error) => {
        logger.error('[CAPTURE] ❌ Erro no MediaRecorder:', error);
        transcriptionError.value = 'Erro na captura de áudio';
        stopCapture();
      };

      // Iniciar gravação com chunks de 10 segundos
      // Isso permite transcrição em tempo real
      mediaRecorder.value.start(10000); // 10 segundos por chunk

      isCapturing.value = true;
      stats.value.startTime = Date.now();

      logger.info('[CAPTURE] ✅ Captura iniciada com sucesso!', {
        mimeType,
        chunkInterval: '10 segundos'
      });

      return true;

    } catch (error) {
      logger.error('[CAPTURE] ❌ Erro ao iniciar captura:', error);
      transcriptionError.value = error.message;
      isCapturing.value = false;
      
      return false;
    }
  }

  /**
   * Para a captura de áudio
   */
  function stopCapture() {
    if (!isCapturing.value || !mediaRecorder.value) {
      logger.warn('[CAPTURE] ⚠️ Nenhuma captura em andamento');
      return false;
    }

    try {
      logger.info('[CAPTURE] ⏹️ Parando captura...');

      if (mediaRecorder.value.state !== 'inactive') {
        mediaRecorder.value.stop();
      }

      // Calcular duração total
      if (stats.value.startTime) {
        stats.value.totalAudioDuration = Math.floor((Date.now() - stats.value.startTime) / 1000);
      }

      logger.info('[CAPTURE] ✅ Captura parada', {
        totalChunks: stats.value.chunksRecorded,
        transcribedChunks: stats.value.chunksTranscribed,
        duration: stats.value.totalAudioDuration + 's'
      });

      return true;

    } catch (error) {
      logger.error('[CAPTURE] ❌ Erro ao parar captura:', error);
      return false;
    }
  }

  /**
   * Limpa recursos e reset de estado
   */
  function cleanup() {
    logger.info('[CLEANUP] 🧹 Limpando recursos...');

    if (isCapturing.value) {
      stopCapture();
    }

    audioChunks.value = [];
    transcriptionQueue.value = [];
    mediaRecorder.value = null;
    lastTranscription.value = '';
    transcriptionError.value = null;

    // Reset stats
    stats.value = {
      chunksRecorded: 0,
      chunksSent: 0,
      chunksTranscribed: 0,
      transcriptionErrors: 0,
      totalAudioDuration: 0,
      startTime: null
    };

    logger.info('[CLEANUP] ✅ Recursos limpos');
  }

  return {
    // Estados
    isCapturing,
    isCaptureAllowed,
    lastTranscription,
    transcriptionError,
    stats,

    // Computed
    canStart,
    captureStatus,

    // Métodos
    requestMicrophonePermission,
    startCapture,
    stopCapture,
    cleanup
  };
}


















