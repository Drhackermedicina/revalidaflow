import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'

// Mock do alert global
global.alert = vi.fn()

// Mock do showNotification
const mockShowNotification = vi.fn()

// Mock do stationEvaluationService
vi.mock('@/services/stationEvaluationService.js', () => ({
  registrarConclusaoEstacao: vi.fn().mockResolvedValue(true)
}))

import { useEvaluation } from '../../src/composables/useEvaluation'

describe('useEvaluation - Testes Corrigidos', () => {
  let mockSocket

  beforeEach(() => {
    vi.clearAllMocks()
    mockSocket = {
      connected: true,
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn()
    }
  })

  // Mock parameters padrão para todos os testes
  const getDefaultParams = () => ({
    socket: ref(mockSocket),
    sessionId: ref('test-session'),
    stationId: ref('test-station'),
    userRole: ref('actor'),
    currentUser: ref({ uid: 'user-123' }),
    stationData: ref({}),
    checklistData: ref({}),
    simulationEnded: ref(false),
    showNotification: mockShowNotification
  })

  describe('Inicialização', () => {
    it('deve inicializar com estados padrão', () => {
      const result = useEvaluation(getDefaultParams())

      expect(result.evaluationScores.value).toEqual({})
      expect(result.candidateReceivedScores.value).toEqual({})
      expect(result.candidateReceivedTotalScore.value).toBe(0)
      expect(result.evaluationSubmittedByCandidate.value).toBe(false)
      expect(result.pepReleasedToCandidate.value).toBe(false)
      expect(result.totalScore.value).toBe(0)
      expect(result.allEvaluationsCompleted.value).toBe(false)
    })
  })

  describe('updateEvaluationScore', () => {
    it('deve atualizar score de um item', () => {
      const { updateEvaluationScore, evaluationScores, totalScore } = useEvaluation(getDefaultParams())

      updateEvaluationScore('item-1', 5)

      expect(evaluationScores.value['item-1']).toBe(5)
      expect(totalScore.value).toBe(5)
    })

    it('deve atualizar score existente', () => {
      const { updateEvaluationScore, evaluationScores, totalScore } = useEvaluation(getDefaultParams())

      updateEvaluationScore('item-1', 3)
      updateEvaluationScore('item-1', 7)

      expect(evaluationScores.value['item-1']).toBe(7)
      expect(totalScore.value).toBe(7)
    })

    it('deve acumular scores de múltiplos itens', () => {
      const { updateEvaluationScore, evaluationScores, totalScore } = useEvaluation(getDefaultParams())

      updateEvaluationScore('item-1', 5)
      updateEvaluationScore('item-2', 4)
      updateEvaluationScore('item-3', 3)

      expect(Object.keys(evaluationScores.value)).toHaveLength(3)
      expect(totalScore.value).toBe(12) // 5 + 4 + 3
    })
  })

  describe('totalScore computed', () => {
    it('deve calcular pontuação total corretamente', () => {
      const { updateEvaluationScore, totalScore } = useEvaluation(getDefaultParams())

      updateEvaluationScore('item-1', 5.5)
      updateEvaluationScore('item-2', 4.2)

      expect(totalScore.value).toBe(9.7)
    })

    it('deve ignorar valores NaN', () => {
      const { updateEvaluationScore, evaluationScores, totalScore } = useEvaluation(getDefaultParams())

      updateEvaluationScore('item-1', 5)
      evaluationScores.value['item-2'] = NaN

      expect(totalScore.value).toBe(5)
    })

    it('deve retornar 0 quando não há scores', () => {
      const { totalScore } = useEvaluation(getDefaultParams())

      expect(totalScore.value).toBe(0)
    })
  })

  describe('allEvaluationsCompleted computed', () => {
    it('deve retornar false quando não há itens no checklist', () => {
      const params = getDefaultParams()
      params.checklistData = ref({ itensAvaliacao: [] })
      const { allEvaluationsCompleted } = useEvaluation(params)

      expect(allEvaluationsCompleted.value).toBe(false)
    })

    it('deve retornar false quando há itens não avaliados', () => {
      const params = getDefaultParams()
      params.checklistData = ref({
        itensAvaliacao: [
          { idItem: 'item-1' },
          { idItem: 'item-2' }
        ]
      })
      const { updateEvaluationScore, allEvaluationsCompleted } = useEvaluation(params)

      updateEvaluationScore('item-1', 5) // Apenas item-1 avaliado

      expect(allEvaluationsCompleted.value).toBe(false)
    })

    it('deve retornar true quando todos os itens estão avaliados', () => {
      const params = getDefaultParams()
      params.checklistData = ref({
        itensAvaliacao: [
          { idItem: 'item-1' },
          { idItem: 'item-2' }
        ]
      })
      const { updateEvaluationScore, allEvaluationsCompleted } = useEvaluation(params)

      updateEvaluationScore('item-1', 5)
      updateEvaluationScore('item-2', 4)

      expect(allEvaluationsCompleted.value).toBe(true)
    })
  })

  describe('releasePepToCandidate', () => {
    it('deve liberar PEP quando condições atendidas', () => {
      const params = getDefaultParams()
      params.simulationEnded = ref(true) // Simulação terminou
      const { releasePepToCandidate, pepReleasedToCandidate } = useEvaluation(params)

      releasePepToCandidate()

      expect(mockSocket.emit).toHaveBeenCalledWith('ACTOR_RELEASE_PEP', {
        sessionId: 'test-session'
      })
      expect(pepReleasedToCandidate.value).toBe(true)
    })

    it('não deve liberar PEP se simulação não terminou', () => {
      const { releasePepToCandidate, pepReleasedToCandidate } = useEvaluation(getDefaultParams())

      releasePepToCandidate()

      expect(global.alert).toHaveBeenCalledWith('O PEP só pode ser liberado após o encerramento da estação.')
      expect(mockSocket.emit).not.toHaveBeenCalled()
      expect(pepReleasedToCandidate.value).toBe(false)
    })

    it('não deve liberar PEP para candidato', () => {
      const params = getDefaultParams()
      params.userRole = ref('candidate')
      params.simulationEnded = ref(true)
      const { releasePepToCandidate } = useEvaluation(params)

      releasePepToCandidate()

      expect(global.alert).toHaveBeenCalledWith('Não autorizado.')
      expect(mockSocket.emit).not.toHaveBeenCalled()
    })

    it('não deve liberar PEP se já foi liberado', () => {
      const params = getDefaultParams()
      params.simulationEnded = ref(true)
      const { releasePepToCandidate, pepReleasedToCandidate } = useEvaluation(params)

      pepReleasedToCandidate.value = true
      vi.clearAllMocks()

      releasePepToCandidate()

      expect(mockSocket.emit).not.toHaveBeenCalled()
    })
  })

  describe('updateCandidateReceivedScores', () => {
    it('deve atualizar scores recebidos pelo candidato', () => {
      const { updateCandidateReceivedScores, candidateReceivedScores, candidateReceivedTotalScore } = useEvaluation(getDefaultParams())

      const testScores = { 'item-1': 5, 'item-2': 4 }
      const testTotal = 9

      updateCandidateReceivedScores(testScores, testTotal)

      expect(candidateReceivedScores.value).toEqual(testScores)
      expect(candidateReceivedTotalScore.value).toBe(testTotal)
    })
  })

  describe('clearEvaluationScores', () => {
    it('deve limpar todos os scores', () => {
      const {
        updateEvaluationScore,
        updateCandidateReceivedScores,
        clearEvaluationScores,
        evaluationScores,
        candidateReceivedScores,
        candidateReceivedTotalScore,
        evaluationSubmittedByCandidate,
        pepReleasedToCandidate
      } = useEvaluation(getDefaultParams())

      // Adicionar alguns dados
      updateEvaluationScore('item-1', 5)
      updateCandidateReceivedScores({ 'item-1': 5 }, 5)
      evaluationSubmittedByCandidate.value = true
      pepReleasedToCandidate.value = true

      // Limpar
      clearEvaluationScores()

      expect(evaluationScores.value).toEqual({})
      expect(candidateReceivedScores.value).toEqual({})
      expect(candidateReceivedTotalScore.value).toBe(0)
      expect(evaluationSubmittedByCandidate.value).toBe(false)
      expect(pepReleasedToCandidate.value).toBe(false)
    })
  })

  describe('submitEvaluation', () => {
    it('não deve permitir submissão por não-candidato', () => {
      const { submitEvaluation } = useEvaluation(getDefaultParams())

      submitEvaluation()

      expect(global.alert).toHaveBeenCalledWith('Apenas o candidato pode submeter avaliação.')
      expect(mockSocket.emit).not.toHaveBeenCalled()
    })

    it('não deve permitir submissão duplicada', () => {
      const params = getDefaultParams()
      params.userRole = ref('candidate')
      const { submitEvaluation, evaluationSubmittedByCandidate } = useEvaluation(params)

      evaluationSubmittedByCandidate.value = true
      vi.clearAllMocks()

      submitEvaluation()

      expect(mockSocket.emit).not.toHaveBeenCalled()
    })
  })
})