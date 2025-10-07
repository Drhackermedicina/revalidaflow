import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'

// Mock do alert global
global.alert = vi.fn()

// Mock do showNotification
const mockShowNotification = vi.fn()
vi.mock('@/composables/useSimulationNotifications', () => ({
  useSimulationNotifications: () => ({
    showNotification: mockShowNotification
  })
}))

// Mock do stationEvaluationService
vi.mock('@/services/stationEvaluationService.js', () => ({
  registrarConclusaoEstacao: vi.fn().mockResolvedValue(true)
}))

import { useEvaluation } from '../../src/composables/useEvaluation'

describe('useEvaluation - Testes Essenciais', () => {
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

  it('deve inicializar com estados padrão', () => {
    const result = useEvaluation({
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

    expect(result.evaluationScores.value).toEqual({})
    expect(result.evaluationSubmittedByCandidate.value).toBe(false)
    expect(result.pepReleasedToCandidate.value).toBe(false)
    expect(result.candidateReceivedScores.value).toEqual({})
    expect(result.candidateReceivedTotalScore.value).toBe(0)
  })

  it('updateEvaluationScore deve atualizar score para ator/avaliador', () => {
    const { updateEvaluationScore, evaluationScores } = useEvaluation({
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

    updateEvaluationScore('item-1', 5)

    expect(evaluationScores.value['item-1']).toBe(5)
    // updateEvaluationScore não emite eventos, apenas atualiza o estado
  })

  it('updateEvaluationScore não deve emitir para candidato', () => {
    const { updateEvaluationScore, evaluationScores } = useEvaluation({
      socket: ref(mockSocket),
      sessionId: ref('test-session'),
      userRole: ref('candidate'),
      stationData: ref({})
    })

    updateEvaluationScore('item-1', 5)

    expect(evaluationScores.value['item-1']).toBe(5)
    expect(mockSocket.emit).not.toHaveBeenCalledWith('EVALUATOR_UPDATED_SCORE')
  })

  it('releasePepToCandidate deve liberar PEP quando condições atendidas', () => {
    const simulationEnded = ref(true)

    const { releasePepToCandidate, pepReleasedToCandidate } = useEvaluation({
      socket: ref(mockSocket),
      sessionId: ref('test-session'),
      userRole: ref('actor'),
      stationData: ref({}),
      simulationEnded
    })

    releasePepToCandidate()

    expect(mockSocket.emit).toHaveBeenCalledWith('ACTOR_RELEASE_PEP', {
      sessionId: 'test-session'
    })
    expect(pepReleasedToCandidate.value).toBe(true)
  })

  it('releasePepToCandidate não deve liberar se simulação não terminou', () => {
    const simulationEnded = ref(false)

    const { releasePepToCandidate, pepReleasedToCandidate } = useEvaluation({
      socket: ref(mockSocket),
      sessionId: ref('test-session'),
      userRole: ref('actor'),
      stationData: ref({}),
      simulationEnded
    })

    releasePepToCandidate()

    expect(mockSocket.emit).not.toHaveBeenCalled()
    expect(pepReleasedToCandidate.value).toBe(false)
  })

  it('releasePepToCandidate não deve liberar para candidato', () => {
    const simulationEnded = ref(true)

    const { releasePepToCandidate } = useEvaluation({
      socket: ref(mockSocket),
      sessionId: ref('test-session'),
      userRole: ref('candidate'),
      stationData: ref({}),
      simulationEnded
    })

    releasePepToCandidate()

    expect(mockSocket.emit).not.toHaveBeenCalled()
  })

  it('submitEvaluation deve submeter avaliação do candidato', () => {
    const checklistData = ref({
      itensAvaliacao: [
        { id: 'item-1', peso: 1 },
        { id: 'item-2', peso: 2 }
      ]
    })
    const evaluationScores = ref({
      'item-1': 5,
      'item-2': 4
    })

    const { submitEvaluation, evaluationSubmittedByCandidate } = useEvaluation({
      socket: ref(mockSocket),
      sessionId: ref('test-session'),
      userRole: ref('candidate'),
      stationData: ref({}),
      checklistData,
      evaluationScores
    })

    submitEvaluation()

    expect(mockSocket.emit).toHaveBeenCalledWith('CANDIDATE_SUBMIT_EVALUATION', {
      sessionId: 'test-session',
      scores: { 'item-1': 5, 'item-2': 4 },
      totalScore: 4.33, // (5*1 + 4*2) / 3
      itemsCount: 2
    })
    expect(evaluationSubmittedByCandidate.value).toBe(true)
  })

  it('submitEvaluation não deve permitir submissão duplicada', () => {
    const { submitEvaluation, evaluationSubmittedByCandidate } = useEvaluation({
      socket: ref(mockSocket),
      sessionId: ref('test-session'),
      userRole: ref('candidate'),
      stationData: ref({}),
      checklistData: ref({ itensAvaliacao: [] }),
      evaluationScores: ref({})
    })

    evaluationSubmittedByCandidate.value = true
    vi.clearAllMocks()

    submitEvaluation()

    expect(mockSocket.emit).not.toHaveBeenCalled()
  })

  it('markItemAsDoubtful deve marcar item como duvidoso', () => {
    const { markItemAsDoubtful, markedPepItems } = useEvaluation({
      socket: ref(mockSocket),
      sessionId: ref('test-session'),
      userRole: ref('actor'),
      stationData: ref({})
    })

    markItemAsDoubtful('item-1', true)

    expect(markedPepItems.value['item-1']).toBe(true)
    expect(mockSocket.emit).toHaveBeenCalledWith('EVALUATOR_MARKED_DOUBT', {
      sessionId: 'test-session',
      itemId: 'item-1',
      isDoubtful: true
    })
  })

  it('markItemAsDoubtful deve desmarcar item', () => {
    const { markItemAsDoubtful, markedPepItems } = useEvaluation({
      socket: ref(mockSocket),
      sessionId: ref('test-session'),
      userRole: ref('actor'),
      stationData: ref({})
    })

    markedPepItems.value['item-1'] = true
    markItemAsDoubtful('item-1', false)

    expect(markedPepItems.value['item-1']).toBe(false)
    expect(mockSocket.emit).toHaveBeenCalledWith('EVALUATOR_MARKED_DOUBT', {
      sessionId: 'test-session',
      itemId: 'item-1',
      isDoubtful: false
    })
  })

  it('totalScore deve calcular pontuação corretamente', () => {
    const checklistData = ref({
      itensAvaliacao: [
        { id: 'item-1', peso: 2 },
        { id: 'item-2', peso: 1 }
      ]
    })
    const evaluationScores = ref({
      'item-1': 5,
      'item-2': 3
    })

    const { totalScore } = useEvaluation({
      socket: ref(mockSocket),
      sessionId: ref('test-session'),
      userRole: ref('actor'),
      stationData: ref({}),
      checklistData,
      evaluationScores
    })

    expect(totalScore.value).toBe(4.33) // (5*2 + 3*1) / 3
  })

  it('totalScore deve retornar 0 quando não há scores', () => {
    const { totalScore } = useEvaluation({
      socket: ref(mockSocket),
      sessionId: ref('test-session'),
      userRole: ref('actor'),
      stationData: ref({})
    })

    expect(totalScore.value).toBe(0)
  })

  it('markedItemsCount deve contar itens marcados', () => {
    const markedPepItems = ref({
      'item-1': true,
      'item-2': false,
      'item-3': true
    })

    const { markedItemsCount } = useEvaluation({
      socket: ref(mockSocket),
      sessionId: ref('test-session'),
      userRole: ref('actor'),
      stationData: ref({}),
      markedPepItems
    })

    expect(markedItemsCount.value).toBe(2)
  })
})