import { ref } from 'vue'
import { currentUser } from '@/plugins/auth.js'
import { backendUrl } from '@/utils/backendUrl.js'

/**
 * @typedef {import('vue').Ref} Ref
 */

/**
 * Gerencia a avaliação automática do PEP (checklist) usando IA.
 * @param {{checklistData: Ref<object>, stationData: Ref<object>, conversationHistory: Ref<Array<object>>, markedPepItems: Ref<object>}} props
 */
export function useAiEvaluation({ checklistData, stationData, conversationHistory, markedPepItems }) {
  const isEvaluating = ref(false)
  const evaluationCompleted = ref(false)

  /**
   * Executa a avaliação automática do PEP.
   */
  async function runAiEvaluation() {
    if (!checklistData.value?.itensAvaliacao?.length) {
      console.log('❌ Não há itens de avaliação no PEP para a IA avaliar.')
      return
    }

    console.log('🤖 IA iniciando avaliação inteligente do PEP...')
    isEvaluating.value = true

    try {
      const response = await fetch(`${backendUrl}/ai-chat/evaluate-pep`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.value?.accessToken || ''}`,
        },
        body: JSON.stringify({
          stationData: stationData.value,
          conversationHistory: conversationHistory.value,
          checklistData: checklistData.value,
        }),
      })

      if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`)

      const aiEvaluation = await response.json()
      processAIEvaluation(aiEvaluation.evaluation)
    } catch (error) {
      console.error('❌ Erro na avaliação automática por IA:', error)
      autoEvaluatePEPFallback()
    }
  }

  /**
   * Processa o resultado estruturado da avaliação da IA.
   * @param {object | string} evaluationData
   */
  function processAIEvaluation(evaluationData) {
    let evaluations = evaluationData
    if (typeof evaluationData === 'string') {
      try {
        evaluations = JSON.parse(evaluationData)
      } catch (e) {
        return processAIEvaluationSimple(evaluationData)
      }
    }

    if (evaluations && Array.isArray(evaluations.items)) {
      evaluations.items.forEach((itemEval, index) => {
        const item = checklistData.value.itensAvaliacao[index]
        if (!item) return

        const pontuacao = itemEval.pontuacao || itemEval.score || 0
        const justificativa = itemEval.justificativa || itemEval.observacao || 'Avaliado pela IA'

        markedPepItems.value[item.idItem] = [{
          pontuacao: pontuacao,
          observacao: justificativa,
          timestamp: new Date().toISOString(),
        }]
      })
    } else {
      return processAIEvaluationSimple(typeof evaluationData === 'string' ? evaluationData : JSON.stringify(evaluationData))
    }

    evaluationCompleted.value = true
    isEvaluating.value = false
  }

  /**
   * Fallback para processar a avaliação se o formato JSON falhar.
   * @param {string} evaluationText
   */
  function processAIEvaluationSimple(evaluationText) { /* ... Lógica de fallback ... */ }

  /**
   * Fallback de emergência se a chamada à API falhar.
   */
  function autoEvaluatePEPFallback() {
    console.log('⚠️ Usando avaliação fallback simples...')
    const candidateMessages = conversationHistory.value.filter(msg => msg.role === 'candidate')
    const totalMessages = candidateMessages.length

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

      markedPepItems.value[item.idItem] = [{
        pontuacao: Number(score),
        observacao,
        timestamp: new Date().toISOString(),
      }]
    })
    evaluationCompleted.value = true
    isEvaluating.value = false
  }

  return {
    isEvaluating,
    evaluationCompleted,
    runAiEvaluation,
  }
}

/**
 * Função auxiliar para classificar a pontuação (pode ser movida para um utilitário).
 * @param {number} pontuacao
 * @param {object} item
 */
export function getClassificacaoFromPontuacao(pontuacao, item) {
  if (!item?.pontuacoes) {
    if (pontuacao >= 5) return { label: 'Adequado', color: 'success' }
    if (pontuacao >= 3) return { label: 'Parcialmente Adequado', color: 'warning' }
    return { label: 'Inadequado', color: 'error' }
  }
  const adequado = item.pontuacoes.adequado?.pontos || 1.0
  const parcial = item.pontuacoes.parcialmenteAdequado?.pontos || 0.5
  const epsilon = 0.01

  if (Math.abs(pontuacao - adequado) < epsilon || pontuacao >= adequado - epsilon) {
    return { label: 'Adequado', color: 'success' }
  }
  if (Math.abs(pontuacao - parcial) < epsilon || (pontuacao >= parcial - epsilon && pontuacao < adequado - epsilon)) {
    return { label: 'Parcialmente Adequado', color: 'warning' }
  }
  return { label: 'Inadequado', color: 'error' }
}
