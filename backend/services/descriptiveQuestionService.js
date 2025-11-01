const { getDb } = require('../config/firebase');

async function getDescriptiveQuestionById(id) {
  if (!id) {
    throw new Error('ID da questão descritiva é obrigatório');
  }

  const docRef = getDb().collection('descriptiveQuestions').doc(id);
  const snapshot = await docRef.get();

  if (!snapshot || !snapshot.exists) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data()
  };
}

async function getDescriptiveQuestions(filters = {}) {
  try {
    let query = getDb().collection('descriptiveQuestions');

    // Aplicar filtros opcionais
    if (filters.year) {
      query = query.where('year', '==', filters.year);
    }

    if (filters.specialty) {
      query = query.where('specialty', '==', filters.specialty);
    }

    const snapshot = await query.get();

    if (snapshot.empty) {
      return [];
    }

    const questions = [];
    snapshot.forEach(doc => {
      questions.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return questions;
  } catch (error) {
    throw new Error(`Erro ao buscar questões descritivas: ${error.message}`);
  }
}

async function createDescriptiveQuestion(questionData) {
  if (!questionData) {
    throw new Error('Dados da questão descritiva são obrigatórios');
  }

  // Gerar ID único baseado no título, especialidade, ano e tipo
  const id = `${questionData.title.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 50)}-${questionData.year}-${questionData.specialty.toLowerCase().replace(/[^a-z]/g, '').substring(0, 3)}-${questionData.type.toLowerCase()}`;

  // Estrutura da questão baseada no exemplo do seed
  const question = {
    id,
    titulo: questionData.title,
    especialidade: questionData.specialty,
    ano: questionData.year,
    tipo: questionData.type,
    enunciado: questionData.statement,
    itens: questionData.items.map((item, index) => ({
      id: `item-${index + 1}`,
      descricao: item.description,
      peso: item.weight || 0
    })),
    gabarito: {
      itens: questionData.items.map((item, index) => ({
        id: `item-${index + 1}`,
        resposta: item.expectedAnswer,
        pontos_chave: [] // Pode ser preenchido posteriormente
      }))
    },
    metadata: {
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: questionData.createdBy || 'admin',
      status: 'active',
      difficulty: 'intermediario',
      tempoEstimado: 30,
      palavrasChave: []
    }
  };

  const docRef = getDb().collection('descriptiveQuestions').doc(id);
  await docRef.set(question);

  return {
    id,
    ...question
  };
}

module.exports = {
  getDescriptiveQuestionById,
  getDescriptiveQuestions,
  createDescriptiveQuestion
};
