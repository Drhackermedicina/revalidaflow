import { ref, unref } from 'vue'
import { currentUser } from '@/plugins/auth.js'
import { backendUrl } from '@/utils/backendUrl.js'

function sanitizeText(value) {
  if (!value || typeof value !== 'string') return ''
  return value.replace(/ausente/gi, '').trim()
}

function sanitizeList(list) {
  if (!Array.isArray(list)) return []
  return list
    .map(sanitizeText)
    .filter(Boolean)
}

function normalizePerformanceSummary(performance = {}) {
  const summary = {
    visaoGeral: sanitizeText(performance.visaoGeral),
    pontosFortes: sanitizeList(performance.pontosFortes),
    pontosDeMelhoria: sanitizeList(performance.pontosDeMelhoria),
    recomendacoesOSCE: sanitizeList(performance.recomendacoesOSCE),
    indicadoresCriticos: sanitizeList(performance.indicadoresCriticos)
  }

  if (!summary.visaoGeral) {
    summary.visaoGeral = 'Resumo indisponível. Revise cada item do PEP, reforçando segurança do paciente, comunicação estruturada e execução completa das tarefas obrigatórias.'
  }
  if (!summary.pontosFortes.length) {
    summary.pontosFortes.push('Identifique os itens do PEP já dominados e mantenha a prática estruturada do roteiro da estação.')
  }
  if (!summary.pontosDeMelhoria.length) {
    summary.pontosDeMelhoria.push('Mapeie e treine os itens do PEP não realizados ou parcialmente executados, repetindo o roteiro em voz alta.')
  }
  if (!summary.recomendacoesOSCE.length) {
    summary.recomendacoesOSCE.push('Realize simulações OSCE cronometradas e revise protocolos nacionais relacionados ao tema da estação.')
  }
  if (!summary.indicadoresCriticos.length) {
    summary.indicadoresCriticos.push('Garanta o cumprimento dos critérios críticos do PEP (segurança, comunicação e condutas prioritárias).')
  }

  return summary
}

export function useAiEvaluation({ checklistData, stationData, conversationHistory, sessionId, releasedData }) {
  const isEvaluating = ref(false)
  const evaluationCompleted = ref(false)
  const evaluationPerformance = ref(null)

  function buildFallbackPerformance(messagePrefix = '') {
    const prefix = messagePrefix ? `${messagePrefix} ` : ''
    return normalizePerformanceSummary({
      visaoGeral: `${prefix}Revise o checklist ponto a ponto e treine novamente a estação.`,
      pontosFortes: [],
      pontosDeMelhoria: [
        'Complete cada subitem do PEP seguindo o roteiro do paciente.',
        'Justifique condutas com base em protocolos brasileiros.'
      ],
      recomendacoesOSCE: [
        'Simule a estação com cronômetro e feedback de um tutor.',
        'Reforce comunicação, segurança do paciente e critérios objetivos.'
      ],
      indicadoresCriticos: []
    })
  }

  async function runAiEvaluation() {
    if (!checklistData.value?.itensAvaliacao?.length) {
      console.log('❌ Não há itens de avaliação no PEP para a IA avaliar.')
      return null
    }

    console.log('🤖 IA iniciando avaliação inteligente do PEP...')
    isEvaluating.value = true

    try {
      const payloadSessionId = unref(sessionId) ?? null
      const payloadStation = unref(stationData) || {}
      const payloadChecklist = unref(checklistData) || {}
      const payloadConversation = unref(conversationHistory) || []
      const payloadReleasedData = unref(releasedData) || {}

      const clone = value => {
        if (value == null) return value
        if (typeof structuredClone === 'function') {
          try {
            return structuredClone(value)
          } catch (cloneError) {
            // Fallback para JSON.stringify logo abaixo
          }
        }
        try {
          return JSON.parse(JSON.stringify(value))
        } catch (cloneError) {
          return value
        }
      }

      const response = await fetch(`${backendUrl}/ai-chat/evaluate-pep`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': currentUser.value?.uid || currentUser.value?.userId || '',
        },
        body: JSON.stringify({
          sessionId: payloadSessionId,
          stationData: clone(payloadStation),
          conversationHistory: clone(payloadConversation),
          checklistData: clone(payloadChecklist),
          releasedData: clone(payloadReleasedData) || {},
        }),
      })

      if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`)

      const aiEvaluation = await response.json()
      const metadata = aiEvaluation.metadata ?? null
      const evaluationPayload =
        aiEvaluation.evaluation ??
        aiEvaluation.evaluations ??
        aiEvaluation

      const result = processAIEvaluation(evaluationPayload)
      const enrichedResult = {
        ...result,
        metadata
      }

      evaluationPerformance.value = enrichedResult?.performance || null
      return enrichedResult
    } catch (error) {
      console.error('❌ Erro na avaliação automática por IA:', error)
      const fallback = autoEvaluatePEPFallback()
      const enrichedFallback = {
        ...fallback,
        metadata: {
          mode: 'fallback',
          reason: error.message,
          timestamp: new Date().toISOString(),
          generatedBy: {
            displayName: 'IA (fallback)'
          }
        }
      }
      evaluationPerformance.value = enrichedFallback?.performance || null
      return enrichedFallback
    }
  }

  function processAIEvaluation(evaluationData) {
    let evaluations = evaluationData
    if (typeof evaluationData === 'string') {
      try {
        evaluations = JSON.parse(evaluationData)
      } catch (error) {
        return processAIEvaluationSimple(evaluationData)
      }
    }

    if (evaluations && !Array.isArray(evaluations.items) && typeof evaluations === 'object') {
      const items = checklistData.value?.itensAvaliacao || []
      const scores = {}
      let total = 0
      const details = []

      Object.entries(evaluations).forEach(([itemId, evaluationArray], index) => {
        const item =
          items.find(candidate => candidate.idItem === itemId) ||
          items[index]

        if (!item) return

        const adequadoPts = item.pontuacoes?.adequado?.pontos ?? 5
        const parcialDef = item.pontuacoes?.parcialmenteAdequado?.pontos
        const hasParcial = typeof parcialDef === 'number'
        const parcialPts = hasParcial ? parcialDef : null
        const inadequadoPts = item.pontuacoes?.inadequado?.pontos ?? 0

        let score = inadequadoPts
        if (Array.isArray(evaluationArray) && evaluationArray.length > 0) {
          const trueCount = evaluationArray.filter(Boolean).length
          const ratio = trueCount / evaluationArray.length
          if (hasParcial) {
            if (ratio >= 0.75) score = adequadoPts
            else if (ratio >= 0.35) score = parcialPts
            else score = inadequadoPts
          } else {
            // Sem nível parcial: binário (tudo cumprido = adequado; caso contrário = inadequado)
            score = ratio >= 1 ? adequadoPts : inadequadoPts
          }
        }

        scores[item.idItem] = Number(score)
        total += Number(score)

        const trueCount = Array.isArray(evaluationArray)
          ? evaluationArray.filter(Boolean).length
          : 0
        const criteriaCount = Array.isArray(evaluationArray)
          ? evaluationArray.length
          : 0
        const percentage = criteriaCount > 0 ? Math.round((trueCount / criteriaCount) * 100) : 0

        details.push({
          itemId: item.idItem,
          pontuacao: Number(score),
          observacao: `Avaliação automática: ${percentage}% dos critérios cumpridos`
        })
      })

      evaluationCompleted.value = true
      isEvaluating.value = false

      return {
        scores,
        total,
        details,
        performance: normalizePerformanceSummary(evaluations.performance || {})
      }
    }

    if (!evaluations || !Array.isArray(evaluations.items)) {
      return processAIEvaluationSimple(JSON.stringify(evaluations ?? {}))
    }

    const scores = {}
    let total = 0
    const details = []

    evaluations.items.forEach((itemEval, index) => {
      const item = checklistData.value.itensAvaliacao[index]
      if (!item) return

      const pontuacaoRaw = Number(itemEval.pontuacao ?? itemEval.score ?? 0)
      const justificativa = sanitizeText(itemEval.justificativa || itemEval.observacao || 'Avaliado pela IA')

      // Clamp para níveis existentes no item
      const adequados = item.pontuacoes?.adequado?.pontos
      const parciais = item.pontuacoes?.parcialmenteAdequado?.pontos
      const inadequados = item.pontuacoes?.inadequado?.pontos ?? 0
      const candidatePoints = []
      if (typeof inadequados === 'number') candidatePoints.push(inadequados)
      if (typeof parciais === 'number') candidatePoints.push(parciais)
      if (typeof adequados === 'number') candidatePoints.push(adequados)
      const pontuacao = candidatePoints.length
        ? candidatePoints.reduce((best, cur) => Math.abs(cur - pontuacaoRaw) < Math.abs(best - pontuacaoRaw) ? cur : best, candidatePoints[0])
        : pontuacaoRaw

      scores[item.idItem] = pontuacao
      total += pontuacao
      details.push({ itemId: item.idItem, pontuacao, observacao: justificativa })
    })

    evaluationCompleted.value = true
    isEvaluating.value = false

    return {
      scores,
      total,
      details,
      performance: normalizePerformanceSummary(evaluations.performance || {})
    }
  }

  function processAIEvaluationSimple(evaluationText) {
    const scores = {}
    let total = 0
    const details = []
    const items = checklistData.value?.itensAvaliacao || []

    const numberMatches = Array.from(String(evaluationText || '').matchAll(/\((\d+)\)\s*([0-9]+(?:\.[0-9]+)?)/g))
    const byIndexScore = new Map(numberMatches.map(match => [Number(match[1]) - 1, Number(match[2])]))

    items.forEach((item, idx) => {
      const adequadoPts = item.pontuacoes?.adequado?.pontos ?? 5
      const parcialPts = item.pontuacoes?.parcialmenteAdequado?.pontos
      const inadequadoPts = item.pontuacoes?.inadequado?.pontos ?? 0

      // Default em fallback: se não há informação, usar inadequado (0) e nunca inventar parcial
      let score = byIndexScore.has(idx) ? byIndexScore.get(idx) : inadequadoPts
      const candidates = [inadequadoPts]
      if (typeof parcialPts === 'number') candidates.push(parcialPts)
      candidates.push(adequadoPts)
      score = candidates.reduce((prev, cur) => Math.abs(cur - score) < Math.abs(prev - score) ? cur : prev, candidates[0])

      const observacao = 'Avaliação automática (fallback simples)'
      scores[item.idItem] = Number(score)
      total += Number(score)
      details.push({ itemId: item.idItem, pontuacao: Number(score), observacao })
    })

    evaluationCompleted.value = true
    isEvaluating.value = false

    return {
      scores,
      total,
      details,
      performance: buildFallbackPerformance()
    }
  }

  function autoEvaluatePEPFallback() {
    console.log('⚠️ Usando avaliação fallback simples...')
    const candidateMessages = conversationHistory.value.filter(msg => msg.role === 'candidate')
    const totalMessages = candidateMessages.length

    const scores = {}
    let total = 0
    const details = []

    checklistData.value.itensAvaliacao.forEach(item => {
      const adequadoPts = item.pontuacoes?.adequado?.pontos ?? 5
      const parcialPts = item.pontuacoes?.parcialmenteAdequado?.pontos ?? 2.5
      const inadequadoPts = item.pontuacoes?.inadequado?.pontos ?? 0
      let score = inadequadoPts
      let observacao = 'Avaliação automática (fallback): participação insuficiente.'

      if (totalMessages >= 6) {
        score = adequadoPts
        observacao = 'Avaliação automática (fallback): participação consistente.'
      } else if (totalMessages >= 3) {
        score = parcialPts
        observacao = 'Avaliação automática (fallback): participação parcial.'
      }

      scores[item.idItem] = Number(score)
      total += Number(score)
      details.push({ itemId: item.idItem, pontuacao: Number(score), observacao })
    })

    evaluationCompleted.value = true
    isEvaluating.value = false

    return {
      scores,
      total,
      details,
      performance: buildFallbackPerformance('Resumo gerado por fallback.')
    }
  }

  return {
    isEvaluating,
    evaluationCompleted,
    evaluationPerformance,
    runAiEvaluation
  }
}

/**
 * Função auxiliar para classificar a pontuação (pode ser movida para um utilitário).
 * @param {number} pontuacao
 * @param {object} item
 */
export function getClassificacaoFromPontuacao(pontuacao, item) {
  // Se não houver definição de pontuações, aplicar uma heurística genérica
  if (!item?.pontuacoes) {
    if (pontuacao <= 0) return { label: 'Inadequado', color: 'error' }
    if (pontuacao >= 5) return { label: 'Adequado', color: 'success' }
    return { label: 'Parcialmente Adequado', color: 'warning' }
  }

  const adequados = item.pontuacoes.adequado?.pontos
  const parciais = item.pontuacoes.parcialmenteAdequado?.pontos
  const inadequados = item.pontuacoes.inadequado?.pontos ?? 0

  const candidates = []
  candidates.push({ label: 'Inadequado', color: 'error', pontos: inadequados })
  if (typeof parciais === 'number') {
    candidates.push({ label: 'Parcialmente Adequado', color: 'warning', pontos: parciais })
  }
  if (typeof adequados === 'number') {
    candidates.push({ label: 'Adequado', color: 'success', pontos: adequados })
  }

  // Escolher o rótulo cujo valor definido é mais próximo da pontuação
  const best = candidates.reduce((prev, cur) =>
    Math.abs(cur.pontos - pontuacao) < Math.abs(prev.pontos - pontuacao) ? cur : prev,
    candidates[0]
  )

  return { label: best.label, color: best.color }
}
