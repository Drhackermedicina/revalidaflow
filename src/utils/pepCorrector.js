export const pepStandardLibrary = {
  apresentacao: [
    {
      descricaoItem: "Apresentação, empatia e profissionalismo",
      pontuacoes: {
        adequado: { criterio: "Apresentou-se, estabeleceu comunicação empática e demonstrou profissionalismo.", pontos: 0.5 },
        parcialmenteAdequado: { criterio: "Falhou em um dos aspectos (apresentação, empatia ou profissionalismo).", pontos: 0.25 },
        inadequado: { criterio: "Não se apresentou ou foi desrespeitoso.", pontos: 0.0 }
      }
    }
  ],
  anamnese: [
    {
      descricaoItem: "Anamnese: Coleta da Queixa Principal e HDA",
      pontuacoes: {
        adequado: { criterio: "Coletou a queixa principal e explorou a HDA de forma completa.", pontos: 1.0 },
        parcialmenteAdequado: { criterio: "Coletou a HDA de forma incompleta.", pontos: 0.5 },
        inadequado: { criterio: "Não coletou a HDA.", pontos: 0.0 }
      }
    }
  ],
  exameFisico: [
    {
      descricaoItem: "Exame Físico: Realização e Descrição de Achados",
      pontuacoes: {
        adequado: { criterio: "Realizou o exame físico direcionado e descreveu os achados corretamente.", pontos: 1.5 },
        parcialmenteAdequado: { criterio: "Realizou o exame de forma incompleta ou descreveu os achados com imprecisões.", pontos: 0.75 },
        inadequado: { criterio: "Não realizou o exame físico ou o fez de forma incorreta.", pontos: 0.0 }
      }
    }
  ],
  diagnostico: [
    {
      descricaoItem: "Diagnóstico e Tratamento",
      pontuacoes: {
        adequado: { criterio: "Formulou a hipótese diagnóstica principal correta e instituiu a conduta terapêutica adequada.", pontos: 2.0 },
        parcialmenteAdequado: { criterio: "Formulou a hipótese correta, mas a conduta foi parcial; ou a hipótese foi incompleta, mas a conduta foi adequada para a emergência.", pontos: 1.0 },
        inadequado: { criterio: "Formulou hipótese incorreta e/ou a conduta foi inadequada/prejudicial.", pontos: 0.0 }
      }
    }
  ],
  diagnosticosDiferenciais: [
    {
      descricaoItem: "Diagnósticos Diferenciais e Complicações",
      pontuacoes: {
        adequado: { criterio: "Listou os principais diagnósticos diferenciais relevantes para o caso e reconheceu possíveis complicações.", pontos: 1.5 },
        parcialmenteAdequado: { criterio: "Listou diferenciais menos relevantes ou omitiu complicações importantes.", pontos: 0.75 },
        inadequado: { criterio: "Não listou diagnósticos diferenciais ou o fez de forma incorreta.", pontos: 0.0 }
      }
    }
  ],
  examesImagem: [
    {
      descricaoItem: "Solicitação e Interpretação de Exames de Imagem",
      pontuacoes: {
        adequado: { criterio: "Solicitou o exame de imagem correto para a suspeita e interpretou os achados principais corretamente.", pontos: 1.0 },
        parcialmenteAdequado: { criterio: "Solicitou o exame correto, mas a interpretação foi incompleta; ou solicitou exame não ideal, mas que ajudou no raciocínio.", pontos: 0.5 },
        inadequado: { criterio: "Não solicitou o exame quando indicado, ou o interpretou incorretamente.", pontos: 0.0 }
      }
    }
  ],
  examesLaboratoriais: [
    {
      descricaoItem: "Solicitação e Interpretação de Exames Laboratoriais",
      pontuacoes: {
        adequado: { criterio: "Solicitou os exames laboratoriais pertinentes e interpretou os resultados de forma correta.", pontos: 1.0 },
        parcialmenteAdequado: { criterio: "Solicitou exames em excesso ou omitiu algum exame importante; ou a interpretação foi parcial.", pontos: 0.5 },
        inadequado: { criterio: "Não solicitou exames necessários ou interpretou os resultados de forma incorreta.", pontos: 0.0 }
      }
    }
  ]
};

const categoryWeights = {
  diagnostico: 5,
  diagnosticosDiferenciais: 4,
  exameFisico: 3,
  examesImagem: 3,
  anamnese: 2,
  examesLaboratoriais: 2,
  apresentacao: 1,
};

function getItemCategory(item) {
  const desc = item.descricaoItem.toLowerCase();
  if (desc.includes('diagnóstico e tratamento')) return 'diagnostico';
  if (desc.includes('diagnósticos diferenciais')) return 'diagnosticosDiferenciais';
  if (desc.includes('exame físico')) return 'exameFisico';
  if (desc.includes('exames de imagem')) return 'examesImagem';
  if (desc.includes('anamnese')) return 'anamnese';
  if (desc.includes('exames laboratoriais')) return 'examesLaboratoriais';
  if (desc.includes('apresentação')) return 'apresentacao';
  return 'geral';
}

// Função para quantizar pontuação para múltiplos de 0.25
function quantizeScore(score) {
  return Math.round(score * 4) / 4;
}

// Função para calcular pontuação total atual
function calculateTotalScore(items) {
  return items.reduce((sum, item) => sum + (item.pontuacoes?.adequado?.pontos || 0), 0);
}

// Função para validar e corrigir pontuações individuais
function validateItemScores(item) {
  if (!item.pontuacoes) return;

  // Garante que adequado sempre tem a maior pontuação
  const adequado = item.pontuacoes.adequado?.pontos || 0;
  const parcial = item.pontuacoes.parcialmenteAdequado?.pontos || 0;
  const inadequado = item.pontuacoes.inadequado?.pontos || 0;

  // Ajusta pontuações para manter hierarquia adequado > parcial > inadequado
  if (adequado > 0) {
    item.pontuacoes.adequado.pontos = Math.min(2.0, adequado);
    if (item.pontuacoes.parcialmenteAdequado) {
      item.pontuacoes.parcialmenteAdequado.pontos = Math.min(adequado * 0.5, parcial);
    }
    if (item.pontuacoes.inadequado) {
      item.pontuacoes.inadequado.pontos = Math.max(0, inadequado);
    }
  }

  // Quantiza todas as pontuações
  item.pontuacoes.adequado.pontos = quantizeScore(item.pontuacoes.adequado.pontos);
  if (item.pontuacoes.parcialmenteAdequado) {
    item.pontuacoes.parcialmenteAdequado.pontos = quantizeScore(item.pontuacoes.parcialmenteAdequado.pontos);
  }
  if (item.pontuacoes.inadequado) {
    item.pontuacoes.inadequado.pontos = quantizeScore(item.pontuacoes.inadequado.pontos);
  }
}

export function validateAndCorrectPEP(station) {
  const pep = station.padraoEsperadoProcedimento || { itensAvaliacao: [] };
  if (!pep.itensAvaliacao) pep.itensAvaliacao = [];

  let correctionLog = [];
  
  // Se não há itens, adiciona um conjunto básico
  if (pep.itensAvaliacao.length === 0) {
    const basicItems = ['apresentacao', 'anamnese', 'exameFisico', 'diagnostico'];
    basicItems.forEach(category => {
      const itemToAdd = JSON.parse(JSON.stringify(pepStandardLibrary[category][0]));
      itemToAdd.idItem = `pep_autogen_${category}_${Date.now()}`;
      pep.itensAvaliacao.push(itemToAdd);
    });
    correctionLog.push('Itens básicos adicionados automaticamente.');
  }

  // Valida pontuações individuais
  pep.itensAvaliacao.forEach(item => {
    validateItemScores(item);
  });

  let currentTotal = calculateTotalScore(pep.itensAvaliacao);
  const TARGET_SCORE = 10.0;
  const TOLERANCE = 0.01;

  // Se a pontuação já está correta, não faz nada
  if (Math.abs(currentTotal - TARGET_SCORE) <= TOLERANCE) {
    pep.pontuacaoTotalEstacao = TARGET_SCORE;
    station.padraoEsperadoProcedimento = pep;
    return { ...station, correctionLog: correctionLog.join(' ') };
  }

  correctionLog.push(`Pontuação inicial: ${currentTotal.toFixed(2)}`);

  // Algoritmo de correção em etapas
  let attempts = 0;
  const MAX_ATTEMPTS = 10;

  while (Math.abs(currentTotal - TARGET_SCORE) > TOLERANCE && attempts < MAX_ATTEMPTS) {
    attempts++;
    const diff = TARGET_SCORE - currentTotal;
    
    // Ordena itens por prioridade (peso da categoria)
    const sortedItems = [...pep.itensAvaliacao].sort((a, b) => {
      const weightA = categoryWeights[getItemCategory(a)] || 1;
      const weightB = categoryWeights[getItemCategory(b)] || 1;
      return weightB - weightA;
    });

    if (diff > 0) {
      // Precisa aumentar pontuação
      for (const item of sortedItems) {
        if (Math.abs(diff) <= TOLERANCE) break;
        
        const currentScore = item.pontuacoes.adequado.pontos;
        const maxIncrease = Math.min(2.0 - currentScore, diff);
        const increment = quantizeScore(Math.min(0.25, maxIncrease));
        
        if (increment > 0) {
          item.pontuacoes.adequado.pontos = quantizeScore(currentScore + increment);
          currentTotal += increment;
          
          // Atualiza pontuação parcial proporcionalmente
          if (item.pontuacoes.parcialmenteAdequado) {
            item.pontuacoes.parcialmenteAdequado.pontos = quantizeScore(item.pontuacoes.adequado.pontos * 0.5);
          }
        }
      }
    } else {
      // Precisa diminuir pontuação
      for (const item of sortedItems.reverse()) {
        if (Math.abs(diff) <= TOLERANCE) break;
        
        const currentScore = item.pontuacoes.adequado.pontos;
        const maxDecrease = Math.min(currentScore, Math.abs(diff));
        const decrement = quantizeScore(Math.min(0.25, maxDecrease));
        
        if (decrement > 0) {
          item.pontuacoes.adequado.pontos = quantizeScore(currentScore - decrement);
          currentTotal -= decrement;
          
          // Atualiza pontuação parcial proporcionalmente
          if (item.pontuacoes.parcialmenteAdequado) {
            item.pontuacoes.parcialmenteAdequado.pontos = quantizeScore(item.pontuacoes.adequado.pontos * 0.5);
          }
        }
      }
    }
  }

  // Força o total exato se ainda houver diferença mínima
  const finalDiff = TARGET_SCORE - currentTotal;
  if (Math.abs(finalDiff) > TOLERANCE && Math.abs(finalDiff) <= 0.25) {
    const adjustableItem = pep.itensAvaliacao.find(item => {
      const score = item.pontuacoes.adequado.pontos;
      return finalDiff > 0 ? score < 2.0 : score > 0.25;
    });
    
    if (adjustableItem) {
      adjustableItem.pontuacoes.adequado.pontos = quantizeScore(
        adjustableItem.pontuacoes.adequado.pontos + finalDiff
      );
      currentTotal = TARGET_SCORE;
    }
  }

  pep.pontuacaoTotalEstacao = quantizeScore(currentTotal);
  station.padraoEsperadoProcedimento = pep;
  
  correctionLog.push(`Pontuação final: ${pep.pontuacaoTotalEstacao}`);
  
  return { ...station, correctionLog: correctionLog.join(' ') };
}

// Função para calcular estatísticas da pontuação
export function getPEPStats(station) {
  const pep = station.padraoEsperadoProcedimento;
  if (!pep || !pep.itensAvaliacao) {
    return {
      totalScore: 0,
      itemCount: 0,
      isValid: false,
      maxPossible: 0,
      items: []
    };
  }

  const items = pep.itensAvaliacao.map(item => ({
    id: item.idItem,
    description: item.descricaoItem,
    adequado: item.pontuacoes?.adequado?.pontos || 0,
    parcial: item.pontuacoes?.parcialmenteAdequado?.pontos || 0,
    inadequado: item.pontuacoes?.inadequado?.pontos || 0,
    category: getItemCategory(item)
  }));

  const totalScore = items.reduce((sum, item) => sum + item.adequado, 0);
  const maxPossible = items.length * 2.0;
  const isValid = Math.abs(totalScore - 10.0) <= 0.01;

  return {
    totalScore: quantizeScore(totalScore),
    itemCount: items.length,
    isValid,
    maxPossible,
    items
  };
}

// Funções adicionadas para garantir compatibilidade e evitar erros.
// Elas atuam como passthrough e não alteram os dados.

export function adaptarRoteiroAtor(roteiro) {
  // Retorna o roteiro original sem modificações.
  return roteiro || [];
}

export function adaptarItensPEP(itens) {
  // Retorna os itens originais sem modificações.
  return itens || [];
}

export function normalizarPontuacaoTotal(station) {
  // Função vazia para evitar erros. A normalização principal
  // é feita em validateAndCorrectPEP.
}
