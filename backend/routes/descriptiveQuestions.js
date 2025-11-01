const express = require('express');
const router = express.Router();
const multer = require('multer');

const { getDescriptiveQuestionById, getDescriptiveQuestions, createDescriptiveQuestion } = require('../services/descriptiveQuestionService');
const { transcribeAudio } = require('../services/speechToTextService');
const { evaluateAnswer } = require('../services/geminiEvaluationService');
const { saveAttempt } = require('../services/userDescriptiveAnswerService');
const { requireAdmin } = require('../middleware/adminAuth');

// Configuração do multer para upload de arquivos em memória
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', async (req, res) => {
  try {
    const { year, specialty } = req.query;

    // Construir filtros opcionais
    const filters = {};
    if (year) filters.year = year;
    if (specialty) filters.specialty = specialty;

    const questions = await getDescriptiveQuestions(filters);

    return res.json(questions);
  } catch (error) {
    return res.status(500).json({
      error: 'Erro ao buscar questões descritivas',
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'Parâmetro id é obrigatório' });
    }

    const question = await getDescriptiveQuestionById(id);

    if (!question) {
      return res.status(404).json({ error: 'Questão descritiva não encontrada' });
    }

    return res.json(question);
  } catch (error) {
    return res.status(500).json({
      error: 'Erro ao buscar questão descritiva',
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
});

router.post('/:id/evaluate', upload.single('audio'), async (req, res) => {
  const startTime = Date.now();

  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'Parâmetro id é obrigatório' });
    }

    // Verificar se o arquivo de áudio foi enviado
    if (!req.file) {
      return res.status(400).json({ error: 'Arquivo de áudio é obrigatório' });
    }

    // Buscar a questão descritiva
    const question = await getDescriptiveQuestionById(id);

    if (!question) {
      return res.status(404).json({ error: 'Questão descritiva não encontrada' });
    }

    // Transcrever o áudio
    const transcription = await transcribeAudio(req.file.buffer);

    // Preparar o gabarito esperado (concatenar todas as respostas dos itens)
    const expectedAnswer = question.gabarito?.itens?.map(item => item.resposta).join('\n\n') || '';

    // Avaliar a resposta usando Gemini
    const evaluation = await evaluateAnswer(question.enunciado, expectedAnswer, transcription);

    if (!evaluation.success) {
      return res.status(500).json({
        error: 'Erro na avaliação da resposta',
        details: evaluation.error
      });
    }

    // Extrair score do feedback (formato: "Score de Coerência e Estrutura (0 a 10): X")
    const scoreMatch = evaluation.feedback.match(/Score de Coerência e Estrutura \(0 a 10\):\s*(\d+)/);
    const score = scoreMatch ? parseInt(scoreMatch[1], 10) : null;

    // Calcular duração em segundos
    const duration = Math.round((Date.now() - startTime) / 1000);

    // Obter userId do token de autenticação
    const userId = req.user?.uid;
    if (!userId) {
      console.warn('[EVALUATION] Usuário não autenticado, pulando salvamento da tentativa');
      return res.json({
        transcription,
        feedback: evaluation.feedback,
        timestamp: evaluation.timestamp,
        metadata: evaluation.metadata,
        saveAttemptWarning: 'Tentativa não foi salva devido à falta de autenticação'
      });
    }

    // Salvar tentativa no Firestore
    let saveAttemptResult = null;
    try {
      saveAttemptResult = await saveAttempt(userId, id, transcription, evaluation.feedback, score, duration);
    } catch (saveError) {
      console.error('[EVALUATION] Erro ao salvar tentativa:', saveError);
      // Não falhar a requisição, apenas adicionar aviso
    }

    return res.json({
      transcription,
      feedback: evaluation.feedback,
      timestamp: evaluation.timestamp,
      metadata: evaluation.metadata,
      attemptSaved: !!saveAttemptResult,
      saveAttemptWarning: saveAttemptResult ? null : 'Tentativa não foi salva devido a um erro interno'
    });

  } catch (error) {
    console.error('Erro no endpoint de avaliação:', error);
    return res.status(500).json({
      error: 'Erro interno do servidor durante a avaliação',
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
});

// Rota protegida para criação de questões descritivas (apenas admins)
router.post('/admin/descriptive-questions', requireAdmin, async (req, res) => {
  try {
    const { title, specialty, year, type, statement, items } = req.body;

    // Validação básica
    if (!title || !specialty || !year || !type || !statement || !items || !Array.isArray(items)) {
      return res.status(400).json({
        error: 'Dados inválidos',
        message: 'Todos os campos são obrigatórios: title, specialty, year, type, statement, items (array)'
      });
    }

    // Validar itens
    for (const item of items) {
      if (!item.description || !item.expectedAnswer) {
        return res.status(400).json({
          error: 'Dados inválidos',
          message: 'Cada item deve ter description e expectedAnswer'
        });
      }
    }

    // Preparar dados para criação
    const questionData = {
      title,
      specialty,
      year: parseInt(year),
      type,
      statement,
      items: items.map(item => ({
        description: item.description,
        expectedAnswer: item.expectedAnswer,
        weight: item.weight || 0
      })),
      createdBy: req.user.email || req.user.uid
    };

    const newQuestion = await createDescriptiveQuestion(questionData);

    return res.status(201).json({
      success: true,
      message: 'Questão descritiva criada com sucesso',
      question: newQuestion
    });
  } catch (error) {
    console.error('Erro ao criar questão descritiva:', error);
    return res.status(500).json({
      error: 'Erro interno do servidor',
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
});

module.exports = router;