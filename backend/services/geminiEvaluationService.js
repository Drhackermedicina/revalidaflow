/**
 * Serviço de avaliação com IA usando Google Gemini
 * Responsável por gerar feedback avaliativo para respostas descritivas
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

// Configurações da API Gemini
const API_KEY = process.env.GOOGLE_API_KEY_1 || process.env.GOOGLE_API_KEY;

// Cache para instância do cliente (singleton pattern)
let geminiClient = null;

/**
 * Inicializa e retorna o cliente Gemini
 * @returns {GoogleGenerativeAI} Instância do cliente Gemini
 */
function getGeminiClient() {
  if (!geminiClient) {
    if (!API_KEY) {
      throw new Error('GOOGLE_API_KEY não configurada');
    }

    geminiClient = new GoogleGenerativeAI(API_KEY);
    console.log('✅ Cliente Gemini inicializado');
  }

  return geminiClient;
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
  try {
    const client = getGeminiClient();

    // Usar Gemini 2.5 Flash para velocidade
    const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Construir o prompt
    const request = buildEvaluationPrompt(question, expectedAnswer, userAnswerText);

    // Fazer a chamada para a API
    const result = await model.generateContent(request);
    const response = result.response;
    const feedbackText = response.text();

    // Estruturar a resposta
    return {
      success: true,
      feedback: feedbackText,
      timestamp: new Date().toISOString(),
      metadata: {
        model: 'gemini-1.5-flash',
        temperature: 0.7,
        maxTokens: 2048
      }
    };

  } catch (error) {
    console.error('❌ Erro na avaliação com Gemini:', error.message);

    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      feedback: null
    };
  }
}

/**
 * Testa a conectividade com a API Gemini
 * @returns {Promise<Object>} Resultado do teste
 */
async function testGeminiConnection() {
  try {
    const client = getGeminiClient();
    const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' });

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
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ Erro no teste de conectividade com Gemini:', error.message);
    return {
      success: false,
      message: 'Falha na conexão com Gemini',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = {
  evaluateAnswer,
  testGeminiConnection,
  getGeminiClient
};