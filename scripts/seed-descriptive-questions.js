const admin = require('firebase-admin');
const serviceAccount = require('../backend/service-account.json');

// Inicializar Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Dados de exemplo para questão descritiva
const exemploQuestaoDescritiva = {
  id: 'exemplo-2025-1-pep-001',
  titulo: 'Avaliação de Paciente com Dor Abdominal',
  especialidade: 'Clínica Médica',
  ano: 2025,
  tipo: 'PEP',
  enunciado: 'Paciente de 45 anos, sexo masculino, chega ao pronto-socorro queixando-se de dor abdominal intensa há 6 horas. A dor iniciou-se de forma súbita no epigástrio, com irradiação para o quadrante superior direito. Refere náuseas, mas não vômitos. Nega febre ou alterações do hábito intestinal. Possui histórico de dislipidemia e é etilista social (2-3 doses de bebida alcoólica por dia). Ao exame físico: PA 130/80 mmHg, FC 88 bpm, afebril. Abdômen globoso, depressível, com dor à palpação no hipocôndrio direito, sinal de Murphy positivo. Sem sinais de irritação peritoneal.',
  itens: [
    {
      id: 'item-1',
      descricao: 'Quais as hipóteses diagnósticas mais prováveis para este caso?',
      peso: 30
    },
    {
      id: 'item-2',
      descricao: 'Quais exames complementares você solicitaria para confirmar o diagnóstico?',
      peso: 25
    },
    {
      id: 'item-3',
      descricao: 'Descreva a conduta terapêutica inicial e o plano de seguimento.',
      peso: 25
    },
    {
      id: 'item-4',
      descricao: 'Quais as possíveis complicações se o paciente não for tratado adequadamente?',
      peso: 20
    }
  ],
  gabarito: {
    itens: [
      {
        id: 'item-1',
        resposta: 'As principais hipóteses diagnósticas incluem: 1) Colelitíase com colecistite aguda (principal hipótese dado o sinal de Murphy positivo); 2) Coledocolitíase; 3) Pancreatite aguda (considerando o uso de álcool); 4) Úlcera péptica perfurada; 5) Hepatite aguda. A localização da dor no quadrante superior direito e o sinal de Murphy apontam fortemente para patologia da vesícula biliar.',
        pontos_chave: [
          'Colelitíase com colecistite aguda',
          'Coledocolitíase',
          'Pancreatite aguda',
          'Sinal de Murphy positivo',
          'Dor no quadrante superior direito'
        ]
      },
      {
        id: 'item-2',
        resposta: 'Exames complementares essenciais: 1) Hemograma completo (leucocitose com desvio à esquerda sugere infecção); 2) Enzimas hepáticas e bilirrubinas (TGO, TGP, GGT, fosfatase alcalina, bilirrubina total e frações); 3) Amilase e lipase (para descartar pancreatite); 4) Ultrassonografia abdominal (exame de escolha para avaliar vesícula biliar e vias biliares); 5) Se necessário, Tomografia Computadorizada de abdômen para melhor avaliação de complicações.',
        pontos_chave: [
          'Hemograma completo',
          'Enzimas hepáticas e bilirrubinas',
          'Amilase e lipase',
          'Ultrassonografia abdominal',
          'Tomografia Computadorizada se necessário'
        ]
      },
      {
        id: 'item-3',
        resposta: 'Conduta terapêutica inicial: 1) Jejum oral; 2) Hidratação venosa; 3) Analgesia (dipirona ou paracetamol, evitar opioides se possível); 4) Antibioticoterapia (cefalosporina de 3ª geração + metronidazol se confirmada infecção); 5) Tratamento cirúrgico: colecistectomia videolaparoscópica (preferencialmente na mesma internação ou eletiva após controle do processo inflamatório). Plano de seguimento: acompanhamento ambulatorial pós-cirúrgico, orientações dietéticas e controle de fatores de risco.',
        pontos_chave: [
          'Jejum oral e hidratação venosa',
          'Analgesia adequada',
          'Antibioticoterapia se infecção confirmada',
          'Colecistectomia videolaparoscópica',
          'Acompanhamento ambulatorial'
        ]
      },
      {
        id: 'item-4',
        resposta: 'Complicações potenciais sem tratamento adequado: 1) Perfuração da vesícula biliar levando a peritonite; 2) Formação de abscesso hepático ou subfrênico; 3) Colangite ascendente (síndrome de Charcot); 4) Íleo biliar; 5) Sepse e choque séptico; 6) Fístula biliar; 7) Pancreatite secundária; 8) Síndrome de Mirizzi (compressão do colédoco pelo cálculo impactado no infundíbulo). Estas complicações podem evoluir para quadros graves com alta morbimortalidade.',
        pontos_chave: [
          'Perfuração vesicular e peritonite',
          'Abscesso hepático',
          'Colangite ascendente',
          'Sepse e choque séptico',
          'Pancreatite secundária'
        ]
      }
    ]
  },
  metadata: {
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    createdBy: 'system-seed',
    status: 'active',
    difficulty: 'intermediario',
    tempoEstimado: 30, // minutos
    palavrasChave: ['dor abdominal', 'colelitíase', 'colecistite', 'abdome agudo', 'clínica médica']
  }
};

async function seedDescriptiveQuestions() {
  try {
    console.log('🚀 Iniciando seed da coleção descriptiveQuestions...');
    
    // Adicionar documento de exemplo
    const docRef = db.collection('descriptiveQuestions').doc(exemploQuestaoDescritiva.id);
    await docRef.set(exemploQuestaoDescritiva);
    
    console.log('✅ Documento de exemplo adicionado com sucesso:', exemploQuestaoDescritiva.id);
    console.log('📋 Coleção descriptiveQuestions criada/inicializada com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao criar documento na coleção descriptiveQuestions:', error);
  } finally {
    // Fechar conexão
    admin.app().delete();
    console.log('🔚 Conexão com Firebase encerrada.');
  }
}

// Executar o seed
seedDescriptiveQuestions();