/**
 * Serviço para gerenciamento de respostas descritivas dos usuários
 * Responsável por persistir tentativas de avaliação no Firestore
 */

const { getDb } = require('../config/firebase');

/**
 * Salva uma tentativa de resposta descritiva no Firestore
 * @param {string} userId - UID do usuário autenticado
 * @param {string} questionId - ID da questão descritiva
 * @param {string} transcription - Texto transcrito do áudio
 * @param {string} feedback - Feedback estruturado da IA
 * @param {number|null} score - Score extraído (0-10) ou null
 * @param {number|null} duration - Duração em segundos ou null
 * @returns {Promise<Object>} Documento criado
 */
async function saveAttempt(userId, questionId, transcription, feedback, score, duration) {
  try {
    // Gerar ID único para a tentativa
    const attemptId = `attempt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Buscar o número da tentativa para este usuário/questão
    const firestore = getDb();
    const existingAttempts = await firestore.collection('userDescriptiveAnswers')
      .where('userId', '==', userId)
      .where('questionId', '==', questionId)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    const attemptNumber = existingAttempts.empty ? 1 : (existingAttempts.docs[0].data().attemptNumber + 1);

    // Criar documento da tentativa
    const attemptData = {
      id: attemptId,
      userId,
      questionId,
      transcription,
      feedback,
      score,
      duration,
      attemptNumber,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        aiModel: 'gemini-2.5-flash-lite',
        temperature: 0.7,
        maxTokens: 2048
      }
    };

    // Salvar no Firestore
    await firestore.collection('userDescriptiveAnswers').doc(attemptId).set(attemptData);

    console.log(`[USER ANSWER] Tentativa salva: ${attemptId} (usuário: ${userId}, questão: ${questionId}, tentativa: ${attemptNumber})`);

    return attemptData;

  } catch (error) {
    console.error('[USER ANSWER] Erro ao salvar tentativa:', error);
    throw new Error(`Falha ao salvar tentativa: ${error.message}`);
  }
}

module.exports = {
  saveAttempt
};
