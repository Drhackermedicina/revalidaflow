/**
 * Serviço de avaliação com IA usando Google Gemini
 * Responsável por gerar feedback avaliativo para respostas descritivas
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

const MODEL_PRIMARY = 'gemini-2.5-flash';
const MODEL_FALLBACK = 'gemini-2.5-flash-lite';
const MAX_OUTPUT_TOKENS = 2048;

let keyPool = [];
let currentClientIndex = 0;
let poolInitialized = false;

function collectIndexedKeys(prefix) {
  return Object.keys(process.env)
    .filter(name => name.startsWith(prefix) && process.env[name])
    .map(name => ({
      index: Number.parseInt(name.replace(prefix, ''), 10) || 0,
      value: process.env[name]
    }))
    .filter(item => !Number.isNaN(item.index) && item.index > 0)
    .sort((a, b) => a.index - b.index)
    .map(item => item.value);
}

function loadGeminiApiKeys() {
  const keys = [];
  const pushKey = value => {
    const key = (value || '').trim();
    if (key && !keys.includes(key)) {
      keys.push(key);
    }
  };

  pushKey(process.env.GEMINI_API_KEY);

  for (let index = 1; index <= 10; index++) {
    pushKey(process.env[`GEMINI_API_KEY_${index}`]);
  }

  pushKey(process.env.GOOGLE_API_KEY);

  for (const key of collectIndexedKeys('GOOGLE_API_KEY_')) {
    pushKey(key);
  }

  for (const key of collectIndexedKeys('VITE_GOOGLE_API_KEY_')) {
    pushKey(key);
  }

  return keys;
}

function ensureKeyPool() {
  if (!poolInitialized || keyPool.length === 0) {
    const keys = loadGeminiApiKeys();

    if (keys.length === 0) {
      throw new Error('Nenhuma chave da API Gemini configurada. Configure GOOGLE_API_KEY_X ou GEMINI_API_KEY no .env');
    }

    keyPool = keys.map(key => ({
      key,
      client: new GoogleGenerativeAI(key),
      active: true,
      failures: 0,
      lastError: null
    }));

    currentClientIndex = 0;
    poolInitialized = true;
    console.log(`✅ [GEMINI_EVAL] ${keyPool.length} chave(s) API carregada(s)`);
  }

  return keyPool;
}

function getActiveClientEntry() {
  const pool = ensureKeyPool();
  const total = pool.length;

  for (let attempt = 0; attempt < total; attempt++) {
    const index = (currentClientIndex + attempt) % total;
    const entry = pool[index];

    if (entry.active !== false) {
      currentClientIndex = (index + 1) % total;
      return { entry, index };
    }
  }

  throw new Error('Nenhuma chave ativa disponível para avaliação com Gemini');
}

function deactivateClient(index, reason) {
  if (!keyPool[index]) return;

  keyPool[index].active = false;
  keyPool[index].lastError = reason;

  console.warn(`🚫 [GEMINI_EVAL] Chave #${index} desativada: ${reason}`);

  const activeCount = keyPool.filter(item => item.active).length;
  if (activeCount === 0) {
    console.error('❌ [GEMINI_EVAL] Todas as chaves foram desativadas. Atualize o arquivo .env com credenciais válidas.');
  }
}

function isInvalidApiKeyError(error) {
  if (!error) return false;

  const message = (error.message || '').toLowerCase();
  if (message.includes('api key expired') || message.includes('api_key_invalid') || message.includes('invalid api key')) {
    return true;
  }

  const details = error.errorDetails || error.details || [];
  return Array.isArray(details) && details.some(detail => (detail.reason || '').toLowerCase() === 'api_key_invalid');
}

function isQuotaError(error) {
  if (!error) return false;

  const message = (error.message || '').toLowerCase();
  return message.includes('quota') || message.includes('resource_exhausted') || message.includes('rate exceeded');
}

function handleKeyError(index, entry, error) {
  if (typeof index !== 'number' || !entry) {
    return;
  }

  if (isInvalidApiKeyError(error)) {
    deactivateClient(index, 'API_KEY_INVALID');
    return;
  }

  if (isQuotaError(error)) {
    entry.failures += 1;
    console.warn(`⚠️ [GEMINI_EVAL] Quota excedida para chave #${index}. Tentando fallback...`);

    if (entry.failures >= 3) {
      deactivateClient(index, 'QUOTA_EXCEEDED');
    }

    return;
  }

  entry.failures += 1;
  entry.lastError = error?.message || 'Erro desconhecido';

  if (entry.failures >= 5) {
    deactivateClient(index, 'FALHAS_REPETIDAS');
  }
}

function getGeminiKeyStats() {
  try {
    ensureKeyPool();
  } catch (error) {
    return {
      total: 0,
      active: 0,
      inactive: 0,
      failures: [],
      error: error.message
    };
  }

  const total = keyPool.length;
  const active = keyPool.filter(item => item.active).length;

  return {
    total,
    active,
    inactive: total - active,
    failures: keyPool.map((item, index) => ({
      index,
      failures: item.failures,
      active: item.active,
      lastError: item.lastError || null
    }))
  };
}

function getGeminiClient() {
  const { entry } = getActiveClientEntry();
  return entry.client;
}

/**
 * Constrói o prompt JSON para avaliação da resposta
 * @param {string} question - Texto da pergunta original
 * @param {string} expectedAnswer - Gabarito detalhado
 * @param {string} userAnswerText - Resposta transcrita do usuário
 * @returns {Object} Objeto de request para a API Gemini
 */
function buildEvaluationPrompt(question, expectedAnswer, userAnswerText) {
  const promptText = `### INSTRUÇÕES PARA A IA ###
Você é um tutor sênior de medicina, especialista em preparar estudantes para provas de residência. Sua tarefa é avaliar a resposta verbal de um aluno a um caso clínico, aplicando a Técnica Feynman. Analise a resposta do aluno com base no gabarito fornecido. Seu feedback deve ser construtivo, amigável e estruturado em quatro seções: 'Pontos Fortes e Precisão', 'Pontos a Melhorar (Identificação de Gaps)', 'O Desafio Feynman (Clareza e Simplicidade)' e 'Score de Coerência e Estrutura (0 a 10)'. Não forneça o gabarito diretamente, mas guie o aluno a chegar lá.

### PERGUNTA ORIGINAL APRESENTADA AO ALUNO ###
${question}

### GABARITO / PONTOS-CHAVE ESPERADOS ###
${expectedAnswer}

### RESPOSTA VERBAL DO ALUNO (TRANSCRITA) ###
${userAnswerText}

### GERE O FEEDBACK AGORA ###`;

  return {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: promptText
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.7,
      topP: 1,
      topK: 1,
      maxOutputTokens: 2048
    }
  };
}

/**
 * Avalia uma resposta do usuário usando Gemini
 * @param {string} question - Texto da pergunta original
 * @param {string} expectedAnswer - Gabarito detalhado da questão
 * @param {string} userAnswerText - Texto transcrito da resposta do usuário
 * @returns {Promise<Object>} Feedback estruturado da IA
 */
async function evaluateAnswer(question, expectedAnswer, userAnswerText) {
  const errors = [];

  let request;

  try {
    ensureKeyPool();
    request = buildEvaluationPrompt(question, expectedAnswer, userAnswerText);
  } catch (error) {
    console.error('❌ [GEMINI_EVAL] Falha ao preparar avaliação:', error.message);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      feedback: null,
      errors: []
    };
  }

  for (let attempt = 0; attempt < keyPool.length; attempt++) {
    let entry;
    let index;

    try {
      const pick = getActiveClientEntry();
      entry = pick.entry;
      index = pick.index;
    } catch (selectionError) {
      errors.push({
        keyIndex: null,
        message: selectionError.message
      });
      break;
    }

    try {
      const models = [MODEL_PRIMARY, MODEL_FALLBACK];
      let feedbackText = null;
      let modelUsed = null;

      for (const modelName of models) {
        try {
          const model = entry.client.getGenerativeModel({ model: modelName });
          const result = await model.generateContent(request);
          const response = result.response;
          feedbackText = response.text();
          modelUsed = modelName;
          break;
        } catch (innerError) {
          console.warn(`⚠️ [GEMINI_EVAL] Falha com modelo ${modelName}:`, innerError.message);
          continue;
        }
      }

      if (!feedbackText) {
        throw new Error('Nenhum modelo retornou feedback');
      }

      return {
        success: true,
        feedback: feedbackText,
        timestamp: new Date().toISOString(),
        metadata: {
          model: modelUsed,
          temperature: 0.7,
          maxTokens: MAX_OUTPUT_TOKENS,
          keyIndex: index,
          fallbacksTried: attempt,
          provider: 'gemini'
        }
      };
    } catch (error) {
      const message = error?.message || 'Erro desconhecido';
      console.error(`❌ [GEMINI_EVAL] Erro na avaliação (chave #${index}):`, message);

      errors.push({
        keyIndex: index,
        message
      });

      handleKeyError(index, entry, error);
    }
  }

  return {
    success: false,
    error: 'Todas as chaves falharam ou estão indisponíveis',
    timestamp: new Date().toISOString(),
    feedback: null,
    errors
  };
}

/**
 * Testa a conectividade com a API Gemini
 * @returns {Promise<Object>} Resultado do teste
 */
async function testGeminiConnection() {
  const errors = [];

  try {
    ensureKeyPool();
  } catch (error) {
    return {
      success: false,
      message: 'Falha na conexão com Gemini',
      error: error.message,
      timestamp: new Date().toISOString(),
      errors
    };
  }

  for (let attempt = 0; attempt < keyPool.length; attempt++) {
    let entry;
    let index;

    try {
      const pick = getActiveClientEntry();
      entry = pick.entry;
      index = pick.index;
    } catch (selectionError) {
      errors.push({
        keyIndex: null,
        message: selectionError.message
      });
      break;
    }

    try {
      const model = entry.client.getGenerativeModel({ model: MODEL_PRIMARY });

      const testPrompt = {
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: 'Olá Gemini, você está funcionando? Responda apenas "Sim" se estiver operacional.'
              }
            ]
          }
        ]
      };

      const result = await model.generateContent(testPrompt);
      const response = result.response;

      return {
        success: true,
        message: 'Conexão com Gemini estabelecida com sucesso',
        response: response.text(),
        timestamp: new Date().toISOString(),
        metadata: {
          keyIndex: index,
          fallbacksTried: attempt,
          provider: 'gemini'
        }
      };
    } catch (error) {
      const message = error?.message || 'Erro desconhecido';
      console.error(`❌ [GEMINI_EVAL] Erro no teste de conectividade (chave #${index}):`, message);

      errors.push({
        keyIndex: index,
        message
      });

      handleKeyError(index, entry, error);
    }
  }

  return {
    success: false,
    message: 'Falha na conexão com Gemini',
    error: 'Todas as chaves falharam ou estão indisponíveis',
    timestamp: new Date().toISOString(),
    errors
  };
}

module.exports = {
  evaluateAnswer,
  testGeminiConnection,
  getGeminiClient,
  getGeminiKeyStats
};
