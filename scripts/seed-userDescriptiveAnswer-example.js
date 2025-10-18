// Carregar variáveis de ambiente do .env
require('dotenv').config({ path: './.env' });

const admin = require('firebase-admin');

// Inicializar Firebase Admin usando variáveis de ambiente (como no backend/server.js)
if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PROJECT_ID) {
  // Limpar e normalizar a chave privada
  function stripSurroundingQuotes(s) {
    if (!s || typeof s !== 'string') return s;
    s = s.trim();
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
      s = s.slice(1, -1);
    }
    return s;
  }

  const serviceAccount = {
    type: 'service_account',
    project_id: stripSurroundingQuotes(process.env.FIREBASE_PROJECT_ID).replace(/\r?\n/g, ''),
    private_key: stripSurroundingQuotes(process.env.FIREBASE_PRIVATE_KEY).replace(/\\n/g, '\n'),
    client_email: stripSurroundingQuotes(process.env.FIREBASE_CLIENT_EMAIL).replace(/\r?\n/g, '')
  };

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id
  });

  console.log('✅ Firebase Admin inicializado com variáveis de ambiente');
} else {
  console.error('❌ Variáveis de ambiente do Firebase não encontradas');
  console.error('   Verifique se FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL e FIREBASE_PROJECT_ID estão configuradas em backend/.env');
  process.exit(1);
}

const db = admin.firestore();

// Dados de exemplo para resposta descritiva do usuário
const exemploUserDescriptiveAnswer = {
  id: 'attempt_' + Date.now(), // ID único baseado no timestamp
  userId: 'KiSITAxXMAY5uU3bOPW5JMQPent2', // UID do usuário de exemplo
  questionId: 'exemplo-2025-1-pep-001', // ID da questão descritiva
  transcription: 'Paciente apresenta dor abdominal intensa no quadrante superior direito, com sinal de Murphy positivo. Suspeito de colecistite aguda. Solicitaria ultrassonografia abdominal e enzimas hepáticas.',
  feedback: '### Pontos Fortes e Precisão\n- Identificou corretamente a localização da dor\n- Reconheceu o sinal de Murphy positivo\n\n### Pontos a Melhorar (Identificação de Gaps)\n- Não mencionou hipóteses diferenciais\n- Falta detalhar exames complementares\n\n### O Desafio Feynman (Clareza e Simplicidade)\nA explicação poderia ser mais estruturada e simples.\n\n### Score de Coerência e Estrutura (0 a 10)\n7',
  score: 7,
  duration: 45, // segundos
  attemptNumber: 1,
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  metadata: {
    aiModel: 'gemini-1.5-flash',
    temperature: 0.7,
    maxTokens: 2048,
    processingTime: 2500 // ms
  }
};

async function seedUserDescriptiveAnswers() {
  try {
    console.log('🚀 Iniciando seed da coleção userDescriptiveAnswers...');

    // Adicionar documento de exemplo
    const docRef = db.collection('userDescriptiveAnswers').doc(exemploUserDescriptiveAnswer.id);
    await docRef.set(exemploUserDescriptiveAnswer);

    console.log('✅ Documento de exemplo adicionado com sucesso:', exemploUserDescriptiveAnswer.id);
    console.log('📋 Coleção userDescriptiveAnswers criada/inicializada com sucesso!');

  } catch (error) {
    console.error('❌ Erro ao criar documento na coleção userDescriptiveAnswers:', error);
  } finally {
    // Fechar conexão
    admin.app().delete();
    console.log('🔚 Conexão com Firebase encerrada.');
  }
}

// Executar o seed
seedUserDescriptiveAnswers();