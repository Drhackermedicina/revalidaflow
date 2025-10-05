/**
 * useEvaluation.ts
 *
 * Composable para gerenciar avaliações de simulações
 * Extrai lógica de avaliação do SimulationView.vue
 *
 * Responsabilidades:
 * - Gerenciamento de pontuações (evaluationScores)
 * - Cálculo de pontuação total
 * - Submissão de avaliações pelo candidato
 * - Liberação de PEP para candidato
 * - Sincronização de avaliações via WebSocket
 * - Registro de conclusão no Firestore
 */

import { ref, computed, type Ref } from 'vue'
import { registrarConclusaoEstacao } from '@/services/stationEvaluationService.js'

interface EvaluationParams {
  socket: Ref<any>
  sessionId: Ref<string | null>
  stationId: Ref<string | null>
  userRole: Ref<string | null>
  currentUser: Ref<any>
  stationData: Ref<any>
  checklistData: Ref<any>
  simulationEnded: Ref<boolean>
  showNotification: (message: string, type: string) => void
}

export function useEvaluation({
  socket,
  sessionId,
  stationId,
  userRole,
  currentUser,
  stationData,
  checklistData,
  simulationEnded,
  showNotification
}: EvaluationParams) {

  // --- Estado de avaliação ---
  const evaluationScores = ref<Record<string, number>>({})
  const candidateReceivedScores = ref<Record<string, number>>({})
  const candidateReceivedTotalScore = ref(0)
  const evaluationSubmittedByCandidate = ref(false)
  const pepReleasedToCandidate = ref(false)

  /**
   * Calcula pontuação total das avaliações
   */
  const totalScore = computed(() => {
    return Object.values(evaluationScores.value).reduce((sum, score) => {
      const numScore = parseFloat(score as any)
      return sum + (isNaN(numScore) ? 0 : numScore)
    }, 0)
  })

  /**
   * Verifica se todas as avaliações do PEP estão completas
   */
  const allEvaluationsCompleted = computed(() => {
    if (!checklistData.value?.itensAvaliacao?.length) return false

    return checklistData.value.itensAvaliacao.every((item: any) => {
      const score = evaluationScores.value[item.idItem]
      return score !== undefined && score !== null && score !== ''
    })
  })

  /**
   * Submete avaliação final pelo candidato
   */
  async function submitEvaluation() {
    if (userRole.value !== 'candidate') {
      console.error('[DEBUG] submitEvaluation: ERRO - Não é candidato')
      alert('Apenas o candidato pode submeter avaliação.')
      return
    }

    if (!socket.value?.connected || !sessionId.value) {
      console.error('[DEBUG] submitEvaluation: ERRO - Não conectado ou sem sessionId')
      alert('Não conectado a uma sessão válida.')
      return
    }

    // Verificar se é o candidato que tem os scores (recebidos do avaliador)
    const scoresToSubmit = candidateReceivedScores.value && Object.keys(candidateReceivedScores.value).length > 0
      ? candidateReceivedScores.value
      : evaluationScores.value

    if (Object.keys(scoresToSubmit).length === 0) {
      console.error('[DEBUG] submitEvaluation: ERRO - Nenhuma pontuação registrada')
      alert('Nenhuma pontuação foi registrada pelo avaliador.')
      return
    }

    try {
      socket.value.emit('CANDIDATE_SUBMIT_EVALUATION', {
        sessionId: sessionId.value,
        stationId: stationId.value,
        candidateId: currentUser.value?.uid,
        scores: scoresToSubmit,
        totalScore: candidateReceivedTotalScore.value || totalScore.value
      })

      // Marcar como submetido
      evaluationSubmittedByCandidate.value = true
    } catch (error) {
      console.error('[DEBUG] submitEvaluation: ERRO ao emitir evento:', error)
      alert('Erro ao submeter avaliação. Veja o console para detalhes.')
      return
    }

    // --- Integração Firestore: registrar avaliação NO CANDIDATO ---
    const candidateUid = currentUser.value?.uid

    // Validação final
    if (!candidateUid) {
      console.error('[DEBUG] submitEvaluation: ERRO - UID do candidato não disponível')
      alert('Não foi possível identificar o candidato para registrar a avaliação.')
      return
    }

    // Registro da avaliação
    const finalScore = candidateReceivedTotalScore.value || totalScore.value
    if (stationId.value && typeof finalScore === 'number') {
      try {
        const avaliacaoData = {
          uid: candidateUid,
          idEstacao: stationId.value,
          nota: finalScore,
          data: new Date(),
          nomeEstacao: stationData.value?.tituloEstacao || 'Estação Clínica',
          especialidade: stationData.value?.especialidade || 'Geral',
          origem: stationData.value?.origem || 'SIMULACAO'
        }
        await registrarConclusaoEstacao(avaliacaoData)

        // Mostrar notificação de sucesso
        showNotification('Avaliação submetida com sucesso!', 'success')
      } catch (err) {
        console.error('[DEBUG] submitEvaluation: ERRO ao registrar no Firestore:', err)
        alert('Erro ao registrar avaliação. Veja o console para detalhes.')
      }
    } else {
      console.error('[DEBUG] submitEvaluation: Dados insuficientes para registrar')
      console.error('[DEBUG] submitEvaluation: stationId =', stationId.value)
      console.error('[DEBUG] submitEvaluation: finalScore =', finalScore)
      alert('Dados insuficientes para registrar avaliação.')
    }
  }

  /**
   * Libera PEP para o candidato após fim da simulação
   */
  function releasePepToCandidate() {
    if (!socket.value?.connected || !sessionId.value) {
      alert('Erro: Não conectado.')
      return
    }

    if (pepReleasedToCandidate.value) {
      return
    }

    if (userRole.value !== 'actor' && userRole.value !== 'evaluator') {
      alert('Não autorizado.')
      return
    }

    // Só permite liberar o PEP após o fim da estação
    if (!simulationEnded.value) {
      alert('O PEP só pode ser liberado após o encerramento da estação.')
      return
    }

    // SINCRONIZAÇÃO: Envia avaliações atuais junto com a liberação do PEP
    const currentScores: Record<string, number> = {}
    Object.keys(evaluationScores.value).forEach(key => {
      const score = evaluationScores.value[key]
      currentScores[key] = typeof score === 'string' ? parseFloat(score as any) : score
    })

    const currentTotal = Object.values(currentScores).reduce((sum, v) => sum + (isNaN(v) ? 0 : v), 0)

    // Libera o PEP após verificar todas as condições
    const payload = { sessionId: sessionId.value }
    socket.value.emit('ACTOR_RELEASE_PEP', payload)

    // SINCRONIZAÇÃO: Força envio das avaliações atuais imediatamente após liberação
    setTimeout(() => {
      if (Object.keys(currentScores).length > 0) {
        socket.value.emit('EVALUATOR_SCORES_UPDATED_FOR_CANDIDATE', {
          sessionId: sessionId.value,
          scores: currentScores,
          totalScore: currentTotal,
          forceSync: true // Flag especial para sincronização forçada
        })
      }
    }, 100) // Pequeno delay para garantir que o PEP foi liberado primeiro

    pepReleasedToCandidate.value = true
  }

  /**
   * Atualiza pontuação de um item específico
   */
  function updateEvaluationScore(itemId: string, score: number) {
    evaluationScores.value = {
      ...evaluationScores.value,
      [itemId]: score
    }
  }

  /**
   * Limpa todas as pontuações
   */
  function clearEvaluationScores() {
    evaluationScores.value = {}
    candidateReceivedScores.value = {}
    candidateReceivedTotalScore.value = 0
    evaluationSubmittedByCandidate.value = false
    pepReleasedToCandidate.value = false
  }

  /**
   * Atualiza scores recebidos pelo candidato (via WebSocket)
   */
  function updateCandidateReceivedScores(scores: Record<string, number>, total: number) {
    candidateReceivedScores.value = scores
    candidateReceivedTotalScore.value = total
  }

  return {
    // Estado
    evaluationScores,
    candidateReceivedScores,
    candidateReceivedTotalScore,
    evaluationSubmittedByCandidate,
    pepReleasedToCandidate,

    // Computeds
    totalScore,
    allEvaluationsCompleted,

    // Métodos
    submitEvaluation,
    releasePepToCandidate,
    updateEvaluationScore,
    clearEvaluationScores,
    updateCandidateReceivedScores
  }
}
