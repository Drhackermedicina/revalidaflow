// Script mock para criar dados de exemplo para a coleção descriptiveQuestions
// Este script gera um arquivo JSON com a estrutura correta para importação manual

const fs = require('fs');
const path = require('path');

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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'system-seed',
    status: 'active',
    difficulty: 'intermediario',
    tempoEstimado: 30, // minutos
    palavrasChave: ['dor abdominal', 'colelitíase', 'colecistite', 'abdome agudo', 'clínica médica']
  }
};

// Criar estrutura completa para importação
const dadosImportacao = {
  collection: 'descriptiveQuestions',
  documents: [
    {
      _id: exemploQuestaoDescritiva.id,
      ...exemploQuestaoDescritiva
    }
  ],
  instructions: {
    howToImport: [
      '1. Abra o Console do Firebase',
      '2. Navegue até Firestore Database',
      '3. Selecione "Importar dados"',
      '4. Escolha este arquivo JSON',
      '5. Configure o caminho da coleção como: descriptiveQuestions',
      '6. Clique em "Importar"'
    ],
   注意事项: [
      'Este é um arquivo de exemplo com uma questão descritiva',
      'Os timestamps estão em formato ISO string',
      'O ID do documento será usado como o campo id dentro do documento'
    ]
  }
};

// Salvar arquivo JSON
const fileName = 'descriptive-questions-seed.json';
const filePath = path.join(__dirname, fileName);

fs.writeFileSync(filePath, JSON.stringify(dadosImportacao, null, 2), 'utf8');

console.log('✅ Arquivo JSON gerado com sucesso!');
console.log(`📁 Local: ${filePath}`);
console.log('\n📋 Estrutura da coleção descriptiveQuestions criada com:');
console.log(`   - ${dadosImportacao.documents.length} documento(s) de exemplo`);
console.log(`   - Documento ID: ${exemploQuestaoDescritiva.id}`);
console.log(`   - Título: ${exemploQuestaoDescritiva.titulo}`);
console.log(`   - Especialidade: ${exemploQuestaoDescritiva.especialidade}`);
console.log(`   - ${exemploQuestaoDescritiva.itens.length} itens de avaliação`);
console.log('\n📖 Instruções de importação incluídas no arquivo JSON');