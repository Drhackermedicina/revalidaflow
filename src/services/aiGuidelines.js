/**
 * 🧠 ORIENTAÇÕES GLOBAIS DA IA
 * Sistema de instruções que serão sempre consideradas pela IA
 * em todas as correções e desmembramentos
 */

export const globalAIGuidelines = {
  
  // 🎯 DESMEMBRAMENTO INTELIGENTE
  desmembramento: {
    title: "Regras de Desmembramento Médico",
    rules: [
      "Identifique conceitos médicos distintos através de análise semântica",
      "Use nomenclatura médica específica e precisa",
      "Evite redundância entre título e descrição",
      "Agrupe informações relacionadas ao mesmo sintoma/condição",
      "Mantenha descrições concisas e clinicamente relevantes",
      "Separe sempre: sintomas múltiplos, hábitos diversos, antecedentes distintos"
    ],
    examples: [
      {
        input: "Alteração do estado mental: Sim, sinto uma confusão mental, dificuldade para me concentrar e estou mais sonolento que o normal. Não consigo pensar direito.",
        output: [
          "Confusão mental: \"Sim, estou confuso\"",
          "Concentração: \"Tenho dificuldade para me concentrar, não consigo pensar direito\"",
          "Sonolência: \"Estou mais sonolento que o normal\""
        ]
      },
      {
        input: "Hábitos: Fuma 1 maço por dia há 10 anos, bebe socialmente nos fins de semana e nega uso de drogas ilícitas",
        output: [
          "Tabagismo: \"Fuma 1 maço por dia há 10 anos\"",
          "Etilismo: \"Bebe socialmente nos fins de semana\"",
          "Drogas ilícitas: \"Nega uso\""
        ]
      }
    ]
  },

  // 🏥 CONTEXTO MÉDICO GERAL
  contextoMedico: {
    title: "Diretrizes Clínicas Gerais",
    rules: [
      "Mantenha precisão técnica médica em todos os termos",
      "Use linguagem clara e objetiva apropriada para profissionais de saúde",
      "Preserve informações clinicamente relevantes",
      "Organize informações por sistemas ou categorias médicas",
      "Mantenha cronologia quando relevante (tempo de evolução, duração)"
    ]
  },

  // ✂️ SELEÇÃO E EDIÇÃO
  edicao: {
    title: "Regras de Edição Inteligente",
    rules: [
      "Quando texto estiver selecionado, processe APENAS a seleção",
      "Mantenha contexto e coerência com o restante do conteúdo",
      "Preserve formatação e estrutura existente",
      "Evite duplicações ou sobreposições de informação"
    ]
  },

  // 📝 QUALIDADE DO CONTEÚDO
  qualidade: {
    title: "Padrões de Qualidade",
    rules: [
      "Seja específico e detalhado sem ser verboso",
      "Elimine redundâncias e repetições desnecessárias",
      "Mantenha consistência terminológica",
      "Use estrutura paralela em listas e enumerações",
      "Priorize clareza e objetividade"
    ]
  }
}

/**
 * 🎯 Gerar prompt com orientações globais
 * @param {string} specificInstruction - Instrução específica da ação
 * @param {string} content - Conteúdo a ser processado
 * @param {string} context - Contexto da estação
 * @returns {string} Prompt completo com orientações globais
 */
export const buildPromptWithGuidelines = (specificInstruction, content, context = '') => {
  
  const globalRules = [
    ...globalAIGuidelines.desmembramento.rules,
    ...globalAIGuidelines.contextoMedico.rules,
    ...globalAIGuidelines.edicao.rules,
    ...globalAIGuidelines.qualidade.rules
  ].map((rule, index) => `${index + 1}. ${rule}`).join('\n')

  const examples = globalAIGuidelines.desmembramento.examples
    .map(ex => `ENTRADA: ${ex.input}\nSAÍDA:\n${ex.output.join('\n')}`)
    .join('\n\n')

  return `
🧠 ORIENTAÇÕES GLOBAIS SEMPRE ATIVAS:
${globalRules}

📚 EXEMPLOS DE REFERÊNCIA:
${examples}

🎯 INSTRUÇÃO ESPECÍFICA:
${specificInstruction}

🏥 CONTEXTO DA ESTAÇÃO:
${context}

📝 CONTEÚDO PARA PROCESSAR:
${content}

✅ RESULTADO:
`
}

/**
 * 🔄 Atualizar orientações (permite adicionar novas regras dinamicamente)
 * @param {string} category - Categoria das orientações
 * @param {Array} newRules - Novas regras a adicionar
 */
export const updateGuidelines = (category, newRules) => {
  if (globalAIGuidelines[category]) {
    globalAIGuidelines[category].rules.push(...newRules)
  }
}

export default globalAIGuidelines
