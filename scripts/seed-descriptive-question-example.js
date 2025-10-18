import admin from 'firebase-admin';
import 'dotenv/config';

function getServiceAccountFromEnv() {
  const {
    FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY
  } = process.env;

  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    throw new Error('Variáveis de ambiente Firebase inválidas. Verifique FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY.');
  }

  return {
    type: 'service_account',
    project_id: FIREBASE_PROJECT_ID.trim(),
    client_email: FIREBASE_CLIENT_EMAIL.trim(),
    private_key: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  };
}

function initializeFirebaseAdmin() {
  const serviceAccount = getServiceAccountFromEnv();

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id
    });
  }

  return admin.firestore();
}

const descriptiveQuestionDocument = {
  id: 'revalida-2025-1-discursiva-q1',
  source: 'Revalida INEP 2025/1',
  year: 2025,
  specialty: 'Clínica Médica',
  theme: 'Hepatites Virais',
  case_presentation: 'Homem de 58 anos, procedente de zona rural, procura atendimento na unidade básica de saúde com queixa de fadiga crônica há 6 meses e de episódios esporádicos de desconforto abdominal. Relata histórico de transfusão de sangue na infância. Ao exame físico, não apresenta alterações significativas. Testes rápidos para triagem de hepatites virais crônicas apresentam resultados reagentes para hepatite B e hepatite C.',
  items: [
    {
      id: 'a',
      question: 'É necessária a realização de exames confirmatórios após o teste rápido para hepatite B? Justifique.',
      max_points: 2.0,
      expected_answer: {
        summary: 'Não é necessário outro exame confirmatório, pois o teste-rápido para hepatite B pesquisa o HBsAg, e seu resultado reagente já confirma a infecção ativa.',
        scoring_criteria: [
          {
            description: 'Resposta completa e justificada corretamente.',
            points: 2.0
          },
          {
            description: 'Resposta correta mas com justificativa parcial ou ausente.',
            points: 0.5
          }
        ]
      }
    },
    {
      id: 'b',
      question: 'É necessária a realização de exames confirmatórios após o teste rápido para hepatite C? Justifique.',
      max_points: 2.0,
      expected_answer: {
        summary: 'Sim, é necessário. O teste rápido anti-HCV positivo requer confirmação com a detecção do genoma viral (HCV-RNA/PCR) para diferenciar infecção ativa de infecção curada ou falso-positivo.',
        scoring_criteria: [
          {
            description: 'Resposta completa e justificada corretamente.',
            points: 2.0
          },
          {
            description: 'Resposta correta mas com justificativa parcial ou ausente.',
            points: 0.5
          }
        ]
      }
    },
    {
      id: 'c',
      question: 'Quais exames complementares adicionais são essenciais para avaliação da gravidade e impacto clínico e funcional da doença hepática? Justifique.',
      max_points: 4.0,
      expected_answer: {
        summary: 'Devem ser solicitados exames bioquímicos (Transaminases, Bilirrubinas, Hemograma, Albumina, TP/INR, Fosfatase Alcalina, Gama-GT), exames de imagem (Ultrassonografia de abdome, Elastografia hepática) e sorologias (HIV, Hepatite A) para avaliar dano hepatocelular, função hepática, fibrose, complicações e coinfecções.',
        scoring_criteria: [
          {
            description: 'Citar corretamente exames bioquímicos com justificativas.',
            points: 2.0
          },
          {
            description: 'Citar corretamente exames de imagem com justificativas.',
            points: 1.0
          },
          {
            description: 'Citar corretamente sorologias com justificativas.',
            points: 1.0
          }
        ]
      }
    },
    {
      id: 'd',
      question: 'Elabore 2 orientações iniciais para o paciente, considerando o manejo das hepatites virais crônicas e possíveis medidas de prevenção direcionadas a contatos domiciliares.',
      max_points: 2.0,
      expected_answer: {
        summary: 'As orientações incluem: 1) Rastrear e vacinar contatos domiciliares contra hepatite B. 2) Não compartilhar objetos de uso pessoal cortantes ou perfurantes (lâminas, alicates) e escovas de dente. 3) Usar preservativo nas relações sexuais.',
        scoring_criteria: [
          {
            description: 'Citar duas orientações válidas e completas.',
            points: 2.0
          },
          {
            description: 'Citar apenas uma orientação válida.',
            points: 1.0
          }
        ]
      }
    }
  ],
  total_points: 10.0
};

async function seedDescriptiveQuestion() {
  const firestore = initializeFirebaseAdmin();

  try {
    const docRef = firestore.collection('descriptiveQuestions').doc(descriptiveQuestionDocument.id);
    await docRef.set(descriptiveQuestionDocument, { merge: true });
    console.log('✅ Documento de exemplo criado na coleção descriptiveQuestions:', descriptiveQuestionDocument.id);
  } catch (error) {
    console.error('❌ Falha ao criar documento de exemplo:', error.message);
    process.exitCode = 1;
  } finally {
    if (admin.apps.length) {
      await admin.app().delete();
    }
  }
}

seedDescriptiveQuestion().catch((error) => {
  console.error('❌ Erro inesperado ao executar o seed:', error.message);
  process.exitCode = 1;
});