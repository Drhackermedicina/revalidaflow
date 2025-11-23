const express = require('express');
const multer = require('multer');
const { getGeminiAudioTranscription } = require('../services/geminiAudioTranscription');

const router = express.Router();

// Configurar multer para aceitar arquivos em memória
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB (Gemini suporta até 25MB por requisição)
  },
  fileFilter: (req, file, cb) => {
    // Aceitar apenas arquivos de áudio
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos de áudio são permitidos'));
    }
  }
});

/**
 * POST /api/audio-transcription/transcribe
 * Transcreve áudio do candidato usando Gemini 2.0 Flash
 */
router.post('/transcribe', upload.single('audio'), async (req, res) => {
  const startTime = Date.now();

  try {
    console.log('📥 [AUDIO_API] Requisição de transcrição recebida');

    // Validações
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Arquivo de áudio é obrigatório'
      });
    }

    const { sessionId, userId, role, timestamp } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID é obrigatório'
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID é obrigatório'
      });
    }

    console.log('📊 [AUDIO_API] Informações da requisição:', {
      sessionId,
      userId,
      role,
      audioSize: req.file.size,
      mimeType: req.file.mimetype,
      timestamp
    });

    // Obter serviço de transcrição
    const transcriptionService = getGeminiAudioTranscription();

    // Transcrever áudio
    const result = await transcriptionService.transcribeAudio(req.file.buffer, {
      mimeType: req.file.mimetype,
      estimatedDuration: req.body.estimatedDuration || 'desconhecido'
    });

    const totalDuration = Date.now() - startTime;

    if (!result.success) {
      console.error('❌ [AUDIO_API] Erro na transcrição:', result.error);
      return res.status(503).json({
        success: false,
        error: result.error || 'Erro ao transcrever áudio',
        errors: result.errors || null,
        duration: totalDuration
      });
    }

    console.log('✅ [AUDIO_API] Transcrição concluída com sucesso!', {
      transcriptionLength: result.transcription.length,
      wordCount: result.metadata.wordCount,
      duration: totalDuration
    });

    // Retornar resultado
    res.json({
      success: true,
      transcription: result.transcription,
      metadata: {
        ...result.metadata,
        totalDurationMs: totalDuration,
        sessionId,
        userId,
        role,
        timestamp: timestamp || new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ [AUDIO_API] Erro no endpoint:', error);

    res.status(500).json({
      success: false,
      error: 'Erro interno ao processar transcrição',
      details: error.message,
      duration: Date.now() - startTime
    });
  }
});

/**
 * POST /api/audio-transcription/transcribe-chunks
 * Transcreve múltiplos chunks de áudio sequencialmente
 */
router.post('/transcribe-chunks', upload.array('audioChunks', 20), async (req, res) => {
  const startTime = Date.now();

  try {
    console.log('📥 [AUDIO_API] Requisição de transcrição em chunks recebida');

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Pelo menos um chunk de áudio é obrigatório'
      });
    }

    const { sessionId, userId, role } = req.body;

    console.log('📊 [AUDIO_API] Processando chunks:', {
      sessionId,
      userId,
      role,
      chunksCount: req.files.length,
      totalSize: req.files.reduce((sum, f) => sum + f.size, 0)
    });

    // Obter serviço de transcrição
    const transcriptionService = getGeminiAudioTranscription();

    // Transcrever chunks
    const audioBuffers = req.files.map(file => file.buffer);
    const result = await transcriptionService.transcribeAudioChunks(audioBuffers);

    const totalDuration = Date.now() - startTime;

    if (!result.success) {
      console.error('❌ [AUDIO_API] Erro na transcrição de chunks');
      return res.status(500).json({
        success: false,
        error: 'Erro ao transcrever chunks de áudio',
        duration: totalDuration
      });
    }

    console.log('✅ [AUDIO_API] Chunks transcritos com sucesso!', {
      successfulChunks: result.metadata.successfulChunks,
      totalChunks: result.metadata.totalChunks,
      duration: totalDuration
    });

    res.json({
      success: true,
      transcription: result.transcription,
      metadata: {
        ...result.metadata,
        totalDurationMs: totalDuration,
        sessionId,
        userId,
        role
      }
    });

  } catch (error) {
    console.error('❌ [AUDIO_API] Erro no endpoint de chunks:', error);

    res.status(500).json({
      success: false,
      error: 'Erro interno ao processar chunks',
      details: error.message,
      duration: Date.now() - startTime
    });
  }
});

/**
 * GET /api/audio-transcription/test
 * Testa conectividade com Gemini 2.0 Flash
 */
router.get('/test', async (req, res) => {
  try {
    const transcriptionService = getGeminiAudioTranscription();
    const stats = transcriptionService.getKeyStats();

    res.json({
      success: true,
      message: 'Serviço de transcrição Gemini 2.0 Flash disponível',
      keysLoaded: stats.total,
      activeKeys: stats.active,
      inactiveKeys: stats.inactive,
      model: require('../config/ai').transcription.model,
      maxAudioDuration: '8.4 horas',
      maxFileSize: '25MB por chunk',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [AUDIO_API] Erro no teste:', error);

    res.status(500).json({
      success: false,
      error: 'Serviço de transcrição indisponível',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/audio-transcription/health
 * Health check do serviço
 */
router.get('/health', async (req, res) => {
  try {
    const transcriptionService = getGeminiAudioTranscription();
    const stats = transcriptionService.getKeyStats();

    res.json({
      status: 'healthy',
      service: 'Gemini Audio Transcription',
      model: require('../config/ai').transcription.model,
      keysLoaded: stats.total,
      activeKeys: stats.active,
      inactiveKeys: stats.inactive,
      capabilities: {
        maxAudioDuration: '8.4 horas',
        maxFileSize: '25MB',
        supportedFormats: [
          'audio/webm',
          'audio/mp3',
          'audio/wav',
          'audio/ogg',
          'audio/flac',
          'audio/mp4'
        ],
        streaming: false,
        chunking: true
      },
      timestamp: new Date().toISOString(),
      keyStatus: stats.failures
    });

  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      details: error.stack || undefined,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;













