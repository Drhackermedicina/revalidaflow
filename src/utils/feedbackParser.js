/**
 * Utilitário para parsing de feedback da IA
 * Converte diferentes formatos de feedback em um objeto estruturado
 */

/**
 * Parseia feedback da IA em formato estruturado
 * @param {string|object} feedback - Feedback bruto da IA
 * @returns {object} Feedback estruturado
 */
export function parseDescriptiveFeedback(feedback) {
  // Se já for objeto, retornar como está
  if (typeof feedback === 'object' && feedback !== null) {
    return {
      scoreGeral: feedback.scoreGeral || feedback.score || null,
      transcricao: feedback.transcricao || feedback.transcription || '',
      analiseCriterios: feedback.analiseCriterios || feedback.criterios || [],
      resumoGeral: feedback.resumoGeral || feedback.resumo || feedback.feedback || ''
    }
  }

  // Se for string, tentar diferentes estratégias de parsing
  if (typeof feedback === 'string') {
    return parseFeedbackString(feedback)
  }

  // Fallback para objeto vazio
  return {
    scoreGeral: null,
    transcricao: '',
    analiseCriterios: [],
    resumoGeral: ''
  }
}

/**
 * Parseia string de feedback estruturada
 * @param {string} feedbackText - Texto do feedback
 * @returns {object} Feedback estruturado
 */
function parseFeedbackString(feedbackText) {
  const result = {
    scoreGeral: null,
    transcricao: '',
    analiseCriterios: [],
    resumoGeral: ''
  }

  if (!feedbackText) return result

  // Dividir em seções baseado em quebras de linha duplas
  const sections = feedbackText.split(/\n\s*\n/).filter(section => section.trim())

  sections.forEach(section => {
    const lowerSection = section.toLowerCase().trim()

    // Extrair score geral
    if (lowerSection.includes('score') && /\d+/.test(section)) {
      const scoreMatch = section.match(/(\d+)(?:\s*\/\s*10)?/)
      if (scoreMatch) {
        result.scoreGeral = parseInt(scoreMatch[1], 10)
      }
    }

    // Identificar seções estruturadas
    if (lowerSection.startsWith('pontos fortes') || lowerSection.includes('precisão')) {
      result.resumoGeral += `**Pontos Fortes e Precisão**\n${section}\n\n`
    } else if (lowerSection.startsWith('pontos a melhorar') || lowerSection.includes('gaps')) {
      result.resumoGeral += `**Pontos a Melhorar**\n${section}\n\n`
    } else if (lowerSection.includes('desafio feynman') || lowerSection.includes('clareza')) {
      result.resumoGeral += `**Clareza e Simplicidade**\n${section}\n\n`
    } else if (lowerSection.includes('score') && lowerSection.includes('estrutura')) {
      // Já processado acima
    } else {
      // Conteúdo geral vai para resumo se não identificado
      if (!result.resumoGeral.includes(section.substring(0, 50))) {
        result.resumoGeral += `${section}\n\n`
      }
    }
  })

  // Limpar resumo geral
  result.resumoGeral = result.resumoGeral.trim()

  return result
}

/**
 * Valida se o feedback tem estrutura completa
 * @param {object} feedback - Objeto de feedback
 * @returns {boolean} Verdadeiro se válido
 */
export function isValidFeedback(feedback) {
  return feedback &&
         typeof feedback === 'object' &&
         (feedback.scoreGeral !== null || feedback.resumoGeral || feedback.analiseCriterios?.length > 0)
}

/**
 * Formata feedback para exibição
 * @param {object} feedback - Objeto de feedback
 * @returns {object} Feedback formatado
 */
export function formatFeedbackForDisplay(feedback) {
  const parsed = parseDescriptiveFeedback(feedback)

  return {
    ...parsed,
    // Garantir que arrays sejam arrays
    analiseCriterios: Array.isArray(parsed.analiseCriterios) ? parsed.analiseCriterios : [],
    // Garantir que textos sejam strings
    transcricao: String(parsed.transcricao || ''),
    resumoGeral: String(parsed.resumoGeral || ''),
    // Garantir que score seja número ou null
    scoreGeral: typeof parsed.scoreGeral === 'number' ? parsed.scoreGeral : null
  }
}