const express = require('express');
const { getDb } = require('../config/firebase');
const { AISimulationEngine } = require('../services/aiSimulationEngine');
const { getGeminiManager } = require('../utils/geminiApiManager');
const router = express.Router();

const PERFORMANCE_KEYWORDS = [
  { key: 'investigacaoAnamnese', patterns: ['anam', 'queixa', 'hist', 'entrevista', 'sintoma'] },
  { key: 'antecedentesRelevantes', patterns: ['anteced', 'comorb', 'familiar', 'social'] },
  { key: 'historicoClinico', patterns: ['histórico clínico', 'historia clínica'] },
  { key: 'sinaisVitaisEssenciais', patterns: ['sinal vital', 'press', 'temp', 'frequ', 'satur', 'pa', 'fc', 'fr'] },
  { key: 'exameFisicoEssencial', patterns: ['exame físico', 'palpa', 'percuss', 'inspec', 'auscult'] },
  { key: 'examesLaboratoriaisEssenciais', patterns: ['labor', 'hemograma', 'marcador', 'bioqu', 'soro', 'urina'] },
  { key: 'examesImagemEssenciais', patterns: ['imagem', 'raio', 'rx', 'ultra', 'tomog', 'resson', 'ecografia', 'tc'] },
  { key: 'examesComplementaresAdicionais', patterns: ['complementar', 'teste', 'escala', 'score', 'avaliar'] },
  { key: 'diagnosticosPrincipais', patterns: ['diagnóstic', 'diagnostic'] },
  { key: 'diagnosticosDiferenciais', patterns: ['diferencial'] },
  { key: 'condutaGeral', patterns: ['conduta', 'manejo', 'plano'] },
  { key: 'tratamentoConservador', patterns: ['conservador', 'expectante', 'observação'] },
  { key: 'tratamentoNaoFarmacologico', patterns: ['não farmac', 'educa', 'fisiot', 'orient', 'cuidado'] },
  { key: 'tratamentoFarmacologico', patterns: ['farmac', 'medic', 'droga', 'medicação', 'prescrição'] },
  { key: 'tratamentoCirurgico', patterns: ['cirúrg', 'operat', 'procedimento', 'intervenção'] },
  { key: 'condutasEmergencia', patterns: ['emerg'] },
  { key: 'condutasUrgencia', patterns: ['urgên'] },
  { key: 'condutasHospitalares', patterns: ['hospital', 'leito', 'internação'] },
  { key: 'estrategiasAmbulatoriais', patterns: ['ambulator', 'consultório'] },
  { key: 'orientacoesPaciente', patterns: ['orienta', 'aconsel', 'educa'] },
  { key: 'sinaisAlerta', patterns: ['alerta', 'alarme'] },
  { key: 'fatoresRisco', patterns: ['risco', 'fator'] },
  { key: 'complicacoesPotenciais', patterns: ['complica'] },
  { key: 'planoSeguimento', patterns: ['seguimento', 'follow', 'retorno'] },
  { key: 'prioridadesEstudo', patterns: ['estudo', 'treino', 'revisar', 'osce'] },
  { key: 'criteriosEncaminhamento', patterns: ['encaminh'] },
  { key: 'criteriosInternacao', patterns: ['internação', 'internar'] },
  { key: 'criteriosTratamentoAmbulatorial', patterns: ['ambulatorial'] },
  { key: 'indicadoresCriticos', patterns: ['crítico', 'critico'] }
];

function createPerformanceSkeleton(stationData = {}) {
  return {
    temaEstacao: stationData.tituloEstacao || 'Estação clínica',
    contextoClinico: stationData.especialidade
      ? `${stationData.especialidade} | Utilize roteiro do paciente e checklist PEP para estruturar a abordagem.`
      : 'Revise o contexto clínico da estação integrando roteiro do paciente e checklist PEP.',
    resumoEstacao: '',
    visaoGeral: '',
    investigacaoAnamnese: [],
    antecedentesRelevantes: [],
    historicoClinico: [],
    sinaisVitaisEssenciais: [],
    exameFisicoEssencial: [],
    examesLaboratoriaisEssenciais: [],
    examesImagemEssenciais: [],
    examesComplementaresAdicionais: [],
    diagnosticosPrincipais: [],
    diagnosticosDiferenciais: [],
    condutaGeral: [],
    tratamentoConservador: [],
    tratamentoNaoFarmacologico: [],
    tratamentoFarmacologico: [],
    tratamentoCirurgico: [],
    condutasEmergencia: [],
    condutasUrgencia: [],
    condutasHospitalares: [],
    estrategiasAmbulatoriais: [],
    orientacoesPaciente: [],
    sinaisAlerta: [],
    fatoresRisco: [],
    complicacoesPotenciais: [],
    planoSeguimento: [],
    prioridadesEstudo: [],
    criteriosEncaminhamento: [],
    criteriosInternacao: [],
    criteriosTratamentoAmbulatorial: [],
    pontosFortes: [],
    pontosDeMelhoria: [],
    recomendacoesOSCE: [],
    indicadoresCriticos: [],
    observacoesIA: []
  };
}

function pushUnique(array, value) {
  if (!value) return;
  const normalized = value.trim();
  if (!normalized) return;
  if (!array.some(entry => entry.toLowerCase() === normalized.toLowerCase())) {
    array.push(normalized);
  }
}

function distributeChecklistItem(description, performance) {
  if (!description) return;
  const normalized = description.toLowerCase();
  let matched = false;

  PERFORMANCE_KEYWORDS.forEach(({ key, patterns }) => {
    if (patterns.some(pattern => normalized.includes(pattern))) {
      pushUnique(performance[key], description);
      matched = true;
    }
  });

  if (!matched) {
    pushUnique(performance.condutaGeral, description);
  }
}

function ensureArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map(entry => (typeof entry === 'string' ? entry.trim() : entry))
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }
  return [];
}

function sanitizePerformance(performance) {
  const result = { ...performance };
  Object.keys(result).forEach((key) => {
    if (Array.isArray(result[key])) {
      result[key] = result[key]
        .map(entry => (typeof entry === 'string' ? entry.trim() : entry))
        .filter(Boolean);
    } else if (typeof result[key] === 'string') {
      result[key] = result[key].trim();
    }
  });
  return result;
}

function normalizeEvaluationResponse(rawEvaluation, checklistData = {}, conversationHistory = []) {
  if (!rawEvaluation) return null;

  const items = checklistData.itensAvaliacao || [];
  const candidateMessages = conversationHistory.filter(entry => entry.role === 'candidate');

  if (rawEvaluation.scores || rawEvaluation.performance || rawEvaluation.details) {
    const scores = {};
    let total = 0;

    Object.entries(rawEvaluation.scores || {}).forEach(([itemId, value]) => {
      const numeric = Number(value);
      if (!Number.isNaN(numeric)) {
        scores[itemId] = numeric;
        total += numeric;
      }
    });

    return {
      scores,
      total,
      details: ensureArray(rawEvaluation.details).map(detail => ({
        itemId: detail?.itemId || null,
        pontuacao: typeof detail?.pontuacao === 'number' ? detail.pontuacao : null,
        observacao: detail?.observacao || ''
      })),
      performance: sanitizePerformance(rawEvaluation.performance || {})
    };
  }

  const scores = {};
  let total = 0;
  const details = [];

  Object.entries(rawEvaluation).forEach(([itemId, evaluationArray], index) => {
    const item = items.find(candidate => candidate.idItem === itemId) || items[index];
    if (!item) return;

    const adequado = item.pontuacoes?.adequado?.pontos ?? 5;
    const parcial = item.pontuacoes?.parcialmenteAdequado?.pontos ?? adequado / 2;
    const inadequado = item.pontuacoes?.inadequado?.pontos ?? 0;

    let score = inadequado;
    if (Array.isArray(evaluationArray) && evaluationArray.length > 0) {
      const trueCount = evaluationArray.filter(Boolean).length;
      const ratio = trueCount / evaluationArray.length;
      if (ratio >= 0.75) score = adequado;
      else if (ratio >= 0.35) score = parcial;
      else score = inadequado;
    } else if (candidateMessages.length >= 6) {
      score = adequado;
    } else if (candidateMessages.length >= 3) {
      score = parcial;
    }

    scores[item.idItem] = Number(score);
    total += Number(score);

    details.push({
      itemId: item.idItem,
      pontuacao: Number(score),
      observacao: `Avaliação automática baseada nos critérios do PEP para "${item.descricaoItem}".`
    });
  });

  return {
    scores,
    total,
    details,
    performance: {}
  };
}

function buildFallbackEvaluation({ checklistData, stationData, conversationHistory, releasedData }) {
  const items = checklistData?.itensAvaliacao || [];
  const candidateMessages = (conversationHistory || []).filter(entry => entry.role === 'candidate');
  const conversationLength = candidateMessages.length;
  const performance = createPerformanceSkeleton(stationData);
  const scores = {};
  const details = [];

  performance.resumoEstacao = conversationLength > 0
    ? 'A avaliação automática oficial não pôde ser concluída. Utilize este resumo estruturado e o PEP para revisar cada aspecto da estação antes de uma nova tentativa.'
    : 'Nenhuma transcrição do candidato foi registrada. Execute novamente a estação garantindo a captura do áudio ou utilize este roteiro como guia para repetição supervisionada.';

  performance.visaoGeral = 'Resumo gerado em modo fallback. Valide cada item crítico com o examinador e repita o roteiro priorizando segurança do paciente, comunicação estruturada e execução completa do PEP.';

  items.forEach((item) => {
    const adequado = item.pontuacoes?.adequado?.pontos ?? 5;
    const parcial = item.pontuacoes?.parcialmenteAdequado?.pontos ?? adequado / 2;
    const inadequado = item.pontuacoes?.inadequado?.pontos ?? 0;

    let score = inadequado;
    if (conversationLength >= 6) {
      score = adequado;
    } else if (conversationLength >= 3) {
      score = parcial;
    }

    scores[item.idItem] = Number(score);
    details.push({
      itemId: item.idItem,
      pontuacao: Number(score),
      observacao: `Revisar o item "${item.descricaoItem}" no PEP e garantir execução completa em próxima tentativa.`
    });

    distributeChecklistItem(item.descricaoItem, performance);
  });

  const releasedCount = releasedData ? Object.keys(releasedData).length : 0;

  if (performance.diagnosticosPrincipais.length === 0) {
    pushUnique(performance.diagnosticosPrincipais, 'Defina o diagnóstico principal correlacionando história clínica, exame físico e propedêutica solicitada.');
  }

  if (performance.diagnosticosDiferenciais.length === 0) {
    pushUnique(performance.diagnosticosDiferenciais, 'Liste diagnósticos diferenciais plausíveis e indique como confirmá-los ou descartá-los.');
  }

  if (performance.orientacoesPaciente.length === 0) {
    pushUnique(performance.orientacoesPaciente, 'Forneça orientações claras, sinais de alarme e instruções de retorno para o paciente ou cuidador.');
  }

  if (performance.sinaisAlerta.length === 0) {
    pushUnique(performance.sinaisAlerta, 'Reforce os sinais de alerta que exigem reavaliação imediata ou busca por emergência.');
  }

  if (performance.fatoresRisco.length === 0) {
    pushUnique(performance.fatoresRisco, 'Mapeie fatores de risco modificáveis e comorbidades que agravam o quadro.');
  }

  if (performance.complicacoesPotenciais.length === 0) {
    pushUnique(performance.complicacoesPotenciais, 'Identifique possíveis complicações e descreva como preveni-las ou monitorá-las.');
  }

  if (performance.planoSeguimento.length === 0) {
    pushUnique(performance.planoSeguimento, 'Estabeleça plano de seguimento com prazos definidos e critérios de sucesso terapêutico.');
  }

  if (performance.prioridadesEstudo.length === 0) {
    pushUnique(performance.prioridadesEstudo, 'Revise protocolos nacionais, diretrizes atualizadas e treine a estação em voz alta seguindo o PEP.');
  }

  if (performance.recomendacoesOSCE.length === 0) {
    pushUnique(performance.recomendacoesOSCE, 'Simule a estação com cronômetro, receba feedback de um tutor e reforce comunicação centrada no paciente.');
  }

  if (performance.indicadoresCriticos.length === 0) {
    pushUnique(performance.indicadoresCriticos, 'Garanta execução dos critérios críticos do PEP (segurança, comunicação e condutas obrigatórias).');
  }

  if (performance.pontosFortes.length === 0) {
    pushUnique(performance.pontosFortes, 'Reconheça domínio dos itens já consolidados e mantenha o padrão utilizando checklist.');
  }

  if (performance.pontosDeMelhoria.length === 0) {
    pushUnique(performance.pontosDeMelhoria, 'Treine os tópicos parcialmente executados, repetindo o roteiro e registrando autoavaliação após cada tentativa.');
  }

  pushUnique(performance.observacoesIA, `Fallback ativado: serviço Gemini indisponível. Materiais liberados nesta sessão: ${releasedCount}.`);

  const total = Object.values(scores).reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0);

  return {
    scores,
    total,
    details,
    performance: sanitizePerformance(performance)
  };
}
// Log de todas as requisições para esta rota
router.use((req, res, next) => {
  console.log(`🔥 [AI-SIM] ${req.method} ${req.path} - Headers:`, JSON.stringify(req.headers, null, 2));
  next();
});

// Teste simples de conectividade
router.get('/test', (req, res) => {
  console.log('✅ [AI-SIM TEST] Endpoint funcionando!');
  res.json({
    success: true,
    message: 'AI Simulation API funcionando!',
    timestamp: new Date().toISOString()
  });
});

// Instância global da engine de simulação
let aiEngine = null;

function getAIEngine() {
  if (!aiEngine) {
    aiEngine = new AISimulationEngine();
  }
  return aiEngine;
}

// Middleware para validar sessão
const validateSession = (req, res, next) => {
  const { sessionId } = req.body;
  if (!sessionId) {
    return res.status(400).json({
      success: false,
      error: 'Session ID is required'
    });
  }
  next();
};

// Middleware para autenticação (reutilizar do sistema existente)
const authenticateUser = async (req, res, next) => {
  try {
    console.log('🔐 [AI-SIM AUTH] Headers:', req.headers);
    console.log('🔐 [AI-SIM AUTH] Body:', req.body);

    // Para simulação com IA, podemos usar uma autenticação mais simples
    // ou reutilizar o middleware existente do sistema
    const userId = req.headers['user-id'] || req.body.userId;
    console.log('🔐 [AI-SIM AUTH] UserID encontrado:', userId);

    if (!userId) {
      console.log('❌ [AI-SIM AUTH] UserID ausente');
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }
    req.userId = userId;
    console.log('✅ [AI-SIM AUTH] Usuário autenticado:', userId);
    next();
  } catch (error) {
    console.error('❌ [AI-SIM AUTH] Erro na autenticação:', error);
    res.status(401).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

/**
 * POST /api/ai-simulation/start
 * Iniciar nova simulação com IA
 */
router.post('/start', authenticateUser, async (req, res) => {
  try {
    console.log('🚀 [AI-SIM START] Requisição recebida');
    console.log('🚀 [AI-SIM START] Body:', req.body);

    const { stationId, userId, stationData: providedStationData } = req.body;

    if (!stationId) {
      console.log('❌ [AI-SIM START] stationId ausente');
      return res.status(400).json({
        success: false,
        error: 'Station ID is required'
      });
    }

    console.log('🚀 [AI-SIM START] stationId:', stationId);

    let stationData;

    // Se dados da estação foram fornecidos, usar eles; senão buscar no Firestore
    if (providedStationData) {
      stationData = providedStationData;
      console.log('🚀 [AI-SIM START] Usando dados da estação fornecidos');
    } else {
      // Buscar dados da estação no Firestore
      const stationRef = getDb().collection('estacoes_clinicas').doc(stationId);
      const stationDoc = await stationRef.get();

      if (!stationDoc.exists) {
        return res.status(404).json({
          success: false,
          error: 'Station not found'
        });
      }

      stationData = {
        id: stationDoc.id,
        ...stationDoc.data()
      };
    }

    // Validar se a estação tem dados necessários para simulação
    const informacoesVerbais = stationData.materiaisDisponiveis?.informacoesVerbaisSimulado;
    if (!informacoesVerbais || informacoesVerbais.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Station does not have verbal information for simulation'
      });
    }

    // Gerar ID único para a sessão
    const sessionId = `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Iniciar simulação
    const engine = getAIEngine();
    const result = await engine.startSimulation(sessionId, stationData, userId || req.userId);

    res.json({
      success: true,
      sessionId,
      stationId,
      stationTitle: stationData.tituloEstacao,
      patientProfile: result.patientProfile,
      welcomeMessage: result.welcomeMessage,
      availableMaterials: stationData.materiaisDisponiveis?.impressos?.map(item => ({
        id: item.idImpresso,
        title: item.tituloImpresso,
        type: item.tipoConteudo
      })) || []
    });

  } catch (error) {
    console.error('Error starting AI simulation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start simulation: ' + error.message
    });
  }
});

/**
 * POST /api/ai-simulation/message
 * Enviar mensagem e receber resposta do paciente simulado
 */
router.post('/message', authenticateUser, validateSession, async (req, res) => {
  try {
    const { sessionId, message, stationData, releasedData } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    const engine = getAIEngine();
    const result = await engine.processMessage(sessionId, message.trim(), {
      stationData,
      releasedData
    });

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json({
      success: true,
      aiResponse: result.patientResponse || result.aiResponse,
      contextUsed: result.contextUsed || [],
      materialsReleased: result.materialsReleased || [],
      materialNames: result.materialNames || '',
      metadata: {
        keyUsed: result.keyUsed,
        tokensUsed: result.tokensUsed,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error processing message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process message: ' + error.message,
      aiResponse: 'Desculpe, tive um problema para responder. Pode repetir a pergunta?'
    });
  }
});

/**
 * POST /api/ai-simulation/request-material
 * Solicitar material/impresso específico
 */
router.post('/request-material', authenticateUser, validateSession, async (req, res) => {
  try {
    const { sessionId, materialKeywords } = req.body;

    if (!materialKeywords) {
      return res.status(400).json({
        success: false,
        error: 'Material keywords are required'
      });
    }

    // Usar a engine para processar como solicitação de material
    const engine = getAIEngine();
    const message = `Doutor, posso ver o ${materialKeywords}?`;
    const result = await engine.processMessage(sessionId, message);

    res.json({
      success: true,
      patientResponse: result.patientResponse,
      materialsReleased: result.materialsReleased || [],
      materialNames: result.materialNames || ''
    });

  } catch (error) {
    console.error('Error requesting material:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to request material: ' + error.message
    });
  }
});

/**
 * GET /api/ai-simulation/status/:sessionId
 * Obter status atual da simulação
 */
router.get('/status/:sessionId', authenticateUser, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const engine = getAIEngine();
    const status = engine.getSimulationStatus(sessionId);

    if (!status) {
      return res.status(404).json({
        success: false,
        error: 'Simulation session not found'
      });
    }

    res.json({
      success: true,
      ...status
    });

  } catch (error) {
    console.error('Error getting simulation status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get simulation status: ' + error.message
    });
  }
});

/**
 * POST /api/ai-simulation/end
 * Finalizar simulação
 */
router.post('/end', authenticateUser, validateSession, async (req, res) => {
  try {
    const { sessionId, finalData } = req.body;

    const engine = getAIEngine();
    const result = engine.endSimulation(sessionId, finalData);

    res.json(result);

  } catch (error) {
    console.error('Error ending simulation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to end simulation: ' + error.message
    });
  }
});

/**
 * GET /api/ai-simulation/stats
 * Obter estatísticas de uso das APIs
 */
router.get('/stats', authenticateUser, async (req, res) => {
  try {
    const geminiManager = getGeminiManager();
    const stats = geminiManager.getUsageStats();

    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting API stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get API stats: ' + error.message
    });
  }
});

/**
 * GET /api/ai-simulation/health
 * Health check das APIs do Gemini
 */
router.get('/health', async (req, res) => {
  try {
    const geminiManager = getGeminiManager();
    const healthCheck = await geminiManager.healthCheck();

    res.json({
      success: true,
      health: healthCheck,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in health check:', error);
    res.status(500).json({
      success: false,
      error: 'Health check failed: ' + error.message
    });
  }
});

/**
 * POST /api/ai-simulation/evaluate-pep
 * IA avaliar automaticamente o PEP com base na conversa
 */
router.post('/evaluate-pep', authenticateUser, validateSession, async (req, res) => {
  console.log('🔄 [EVALUATE-PEP] Iniciando avaliação por IA...');
  console.log('📦 [EVALUATE-PEP] Headers recebidos:', {
    authorization: !!req.headers.authorization,
    userId: req.headers['user-id'],
    contentType: req.headers['content-type']
  });

  try {
    const { sessionId, stationData, checklistData, conversationHistory, releasedData } = req.body;

    console.log('📊 [EVALUATE-PEP] Dados recebidos:', {
      sessionId,
      userId: req.userId,
      stationTitle: stationData?.tituloEstacao || 'N/A',
      conversationLength: conversationHistory?.length || 0,
      checklistItemsCount: checklistData?.itensAvaliacao?.length || 0,
      releasedDataKeys: Object.keys(releasedData || {}).length,
      bodySize: JSON.stringify(req.body).length
    });

    if (!checklistData?.itensAvaliacao?.length) {
      console.log('❌ [EVALUATE-PEP] Erro: Nenhum item de avaliação encontrado');
      return res.json({
        success: false,
        error: 'Nenhum item de avaliação encontrado no PEP'
      });
    }

    // Criar prompt para IA avaliar o PEP
    const evaluationPrompt = `
Você é um avaliador médico experiente. Analise a conversa abaixo entre um candidato médico e um paciente virtual, e avalie a performance com base no checklist de avaliação (PEP).

**ESTAÇÃO:** ${stationData.tituloEstacao}
**ESPECIALIDADE:** ${stationData.especialidade}

**HISTÓRICO DA CONVERSA:**
${conversationHistory.map(msg => {
      if (msg.role === 'candidate') return `CANDIDATO: ${msg.content}`;
      if (msg.role === 'ai_actor') return `PACIENTE: ${msg.content}`;
      return `SISTEMA: ${msg.content}`;
    }).join('\n')}

**MATERIAIS LIBERADOS:** ${Object.keys(releasedData).length} materiais foram solicitados e liberados.

**ITENS DE AVALIAÇÃO (PEP):**
${checklistData.itensAvaliacao.map((item, index) => {
      const pontosVerificacao = item.pontosVerificacao || [];
      return `${index + 1}. ${item.descricaoItem}
   Pontos de verificação (marque true/false para cada):
   ${pontosVerificacao.map((ponto, i) => `   ${i + 1}. ${ponto.descricao} [AVALIAR]`).join('\n')}`;
    }).join('\n\n')}

**INSTRUÇÕES:**
- Avalie cada ponto de verificação com base na conversa e nos materiais liberados
- Para cada item do PEP, calcule a pontuação adequada conforme descrito abaixo
- Além da pontuação, produza um resumo clínico completo cobrindo:
  1. Dados de admissão, anamnese detalhada e histórico clínico relevante
  2. Exame físico: sinais vitais, achados e interpretação
  3. Propedêutica complementar: exames laboratoriais, de imagem e interpretação dos resultados
  4. Diagnóstico principal e diagnósticos diferenciais
  5. Condutas e tratamento: medidas conservadoras, não farmacológicas, farmacológicas e cirúrgicas quando cabível
  6. Estratificação do atendimento (ambulatorial, urgência, emergência, hospitalar) com justificativas
  7. Orientações ao paciente/cuidador, fatores de risco, sinais de alarme e complicações potenciais
  8. Critérios de encaminhamento e seguimento
  9. Síntese do tema geral da estação, destacando competências avaliadas
- Estruture o resumo em blocos claros com bullet points sempre que ajudar a leitura
- Caso algum tópico não tenha sido abordado, explique explicitamente que as informações estavam ausentes

**FORMATO DE RESPOSTA (JSON ESTRUTURADO):**
{
  "scores": {
    "itemId1": pontuacaoNumérica,
    "itemId2": pontuacaoNumérica,
    ...
  },
  "details": [
    {
      "itemId": "itemId1",
      "pontuacao": pontuacaoNumérica,
      "observacao": "Justificativa clínica objetiva citando trechos da conversa"
    }
  ],
  "performance": {
    "temaEstacao": "Resumo do tema central",
    "contextoClinico": "Contexto geral da estação",
    "resumoEstacao": "Síntese narrativa integrando anamnese, exame físico, exames e condutas",
    "visaoGeral": "Resumo global da performance",
    "investigacaoAnamnese": ["Anamnese detalhada com achados relevantes"],
    "antecedentesRelevantes": ["Histórico pessoal/familiar importante"],
    "sinaisVitaisEssenciais": ["Sinais vitais e interpretação"],
    "exameFisicoEssencial": ["Achados do exame físico"],
    "examesLaboratoriaisEssenciais": ["Exames laboratoriais solicitados e interpretação"],
    "examesImagemEssenciais": ["Exames de imagem solicitados e achados"],
    "examesComplementaresAdicionais": ["Outros exames pertinentes"],
    "diagnosticosPrincipais": ["Diagnóstico principal com justificativa"],
    "diagnosticosDiferenciais": ["Diferenciais considerados"],
    "condutaGeral": ["Síntese da conduta"],
    "tratamentoConservador": ["Medidas conservadoras/expectantes"],
    "tratamentoNaoFarmacologico": ["Medidas não farmacológicas"],
    "tratamentoFarmacologico": ["Terapia medicamentosa com doses quando citadas"],
    "tratamentoCirurgico": ["Indicações cirúrgicas se aplicável"],
    "criteriosTratamentoAmbulatorial": ["Justificativa para manejo ambulatorial"],
    "criteriosEncaminhamento": ["Critérios para encaminhar a outros níveis"],
    "criteriosInternacao": ["Critérios para internação"],
    "condutasEmergencia": ["Medidas de emergência, se cabíveis"],
    "condutasUrgencia": ["Medidas de urgência, se cabíveis"],
    "condutasHospitalares": ["Condutas hospitalares quando mencionadas"],
    "orientacoesPaciente": ["Orientações, sinais de alerta, fatores de risco e seguimento"],
    "pontosFortes": ["Aspectos positivos observados"],
    "pontosDeMelhoria": ["Oportunidades de melhora específicas"],
    "recomendacoesOSCE": ["Sugestões de estudo e prática"],
    "indicadoresCriticos": ["Critérios críticos cumpridos ou ausentes"],
    "observacoesIA": ["Observações adicionais relevantes"]
  }
}

**IMPORTANTE:**
- Utilize linguagem médica formal em português brasileiro
- Justifique cada pontuação citando evidências da conversa
- Nunca invente dados; se algo não foi mencionado, indique explicitamente essa ausência
`;

    console.log('🤖 [EVALUATE-PEP] Chamando Gemini...');
    console.log('📝 [EVALUATE-PEP] Tamanho do prompt:', evaluationPrompt.length);

    const geminiManager = getGeminiManager();
    const geminiOptions = {
      model: 'gemini-2.5-flash',
      maxOutputTokens: 2000,
      temperature: 0.3
    };

    console.log('⚙️ [EVALUATE-PEP] Configurações Gemini:', geminiOptions);

    const result = await geminiManager.generateResponse(evaluationPrompt, geminiOptions);

    console.log('📤 [EVALUATE-PEP] Resposta do Gemini:', {
      hasResult: !!result,
      hasText: !!result?.text,
      textLength: result?.text?.length || 0,
      textPreview: result?.text?.substring(0, 200) + '...'
    });

    let parsedEvaluation = null;

    try {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      console.log('🔍 [EVALUATE-PEP] Buscando JSON na resposta:', {
        hasJsonMatch: !!jsonMatch,
        matchLength: jsonMatch?.[0]?.length || 0
      });

      if (jsonMatch) {
        parsedEvaluation = JSON.parse(jsonMatch[0]);
        console.log('✅ [EVALUATE-PEP] JSON parseado com sucesso:', {
          hasEvaluation: !!parsedEvaluation,
          evaluationKeys: Object.keys(parsedEvaluation || {}),
          hasPerformance: !!parsedEvaluation?.performance
        });
      }
    } catch (parseError) {
      console.log('❌ [EVALUATE-PEP] Erro ao parsear resposta da IA:', {
        error: parseError.message,
        rawText: result.text?.substring(0, 500)
      });
    }

    let evaluationResult = normalizeEvaluationResponse(
      parsedEvaluation,
      checklistData,
      conversationHistory || []
    );

    if (!evaluationResult) {
      evaluationResult = buildFallbackEvaluation({
        checklistData,
        stationData,
        conversationHistory,
        releasedData
      });
    }

    const responseMode = evaluationResult?.performance?.observacoesIA?.some(entry =>
      entry.includes('Fallback ativado')
    )
      ? 'fallback'
      : 'gemini';

    const success = responseMode === 'gemini';

    res.json({
      success,
      evaluation: evaluationResult,
      metadata: {
        mode: responseMode,
        keyUsed: result.keyUsed,
        tokensUsed: result.tokensUsed,
        conversationLength: (conversationHistory || []).length,
        materialsReleased: releasedData ? Object.keys(releasedData).length : 0
      }
    });

  } catch (error) {
    console.error('Error evaluating PEP with AI:', error);

    const fallbackEvaluation = buildFallbackEvaluation({
      checklistData: req.body.checklistData || {},
      stationData: req.body.stationData || {},
      conversationHistory: req.body.conversationHistory || [],
      releasedData: req.body.releasedData || {}
    });

    res.status(200).json({
      success: false,
      evaluation: fallbackEvaluation,
      metadata: {
        mode: 'fallback-error',
        error: error.message,
        conversationLength: (req.body.conversationHistory || []).length,
        materialsReleased: req.body.releasedData ? Object.keys(req.body.releasedData).length : 0
      },
      error: error.message
    });
  }
});

/**
 * POST /api/ai-simulation/test
 * Endpoint para testes rápidos (apenas em desenvolvimento)
 */
router.post('/test', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      success: false,
      error: 'Test endpoint not available in production'
    });
  }

  try {
    const { prompt, model } = req.body;

    const geminiManager = getGeminiManager();
    const result = await geminiManager.generateResponse(
      prompt || 'Teste de conectividade da API Gemini',
      { model, maxOutputTokens: 100 }
    );

    res.json({
      success: true,
      response: result.text,
      metadata: {
        keyUsed: result.keyUsed,
        tokensUsed: result.tokensUsed
      }
    });

  } catch (error) {
    console.error('Error in test endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Test failed: ' + error.message
    });
  }
});

module.exports = router;
