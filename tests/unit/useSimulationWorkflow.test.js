import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'

// Mock do simulationUtils
vi.mock('@/utils/simulationUtils', () => ({
  formatTime: (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
}))

// Mock do currentUser
const mockCurrentUser = ref({ uid: 'user-123' })
vi.mock('@/plugins/auth.js', () => ({
  currentUser: mockCurrentUser
}))

// Mock do partner
const mockPartner = ref({ userId: 'partner-123' })
vi.mock('@/composables/useSimulationInvites.js', () => ({
  useSimulationInvites: () => ({
    partner: mockPartner
  })
}))

import { useSimulationWorkflow } from '../../src/composables/useSimulationWorkflow'

// Mock do socket
const mockSocket = {
  connected: true,
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn()
}

describe('useSimulationWorkflow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock partner
    mockPartner.value = { userId: 'partner-123' }
  })

  describe('Inicialização', () => {
    it('deve inicializar com os estados corretos', () => {
      const socketRef = ref(mockSocket)
      const sessionId = ref('test-session-123')
      const userRole = ref('actor')
      const selectedDurationMinutes = ref(10)
      const simulationTimeSeconds = ref(600)
      const timerDisplay = ref('10:00')

      const {
        myReadyState,
        partnerReadyState,
        candidateReadyButtonEnabled,
        simulationStarted,
        simulationEnded,
        simulationWasManuallyEndedEarly,
        backendActivated,
        bothParticipantsReady
      } = useSimulationWorkflow({
        socketRef,
        sessionId,
        userRole,
        partner: mockPartner,
        stationData: ref({}),
        simulationTimeSeconds,
        timerDisplay,
        selectedDurationMinutes,
        inviteLinkToShow: ref(''),
        backendUrl: 'http://localhost:3000'
      })

      // Estados iniciais devem ser false
      expect(myReadyState.value).toBe(false)
      expect(partnerReadyState.value).toBe(false)
      expect(candidateReadyButtonEnabled.value).toBe(false)
      expect(simulationStarted.value).toBe(false)
      expect(simulationEnded.value).toBe(false)
      expect(simulationWasManuallyEndedEarly.value).toBe(false)
      expect(backendActivated.value).toBe(false)
      expect(bothParticipantsReady.value).toBe(false)
    })
  })

  describe('sendReady', () => {
    it('deve enviar evento CLIENT_IM_READY quando socket está conectado', () => {
      const socketRef = ref(mockSocket)
      const sessionId = ref('test-session-123')
      const userRole = ref('actor')
      const selectedDurationMinutes = ref(10)
      const simulationTimeSeconds = ref(600)
      const timerDisplay = ref('10:00')

      const { sendReady, myReadyState } = useSimulationWorkflow({
        socketRef,
        sessionId,
        userRole,
        partner: mockPartner,
        stationData: ref({}),
        simulationTimeSeconds,
        timerDisplay,
        selectedDurationMinutes,
        inviteLinkToShow: ref(''),
        backendUrl: 'http://localhost:3000'
      })

      sendReady()

      expect(mockSocket.emit).toHaveBeenCalledWith('CLIENT_IM_READY', {
        sessionId: 'test-session-123',
        userId: 'actor'
      })
      expect(myReadyState.value).toBe(true)
    })

    it('não deve enviar evento quando socket não está conectado', () => {
      const socketRef = ref({ connected: false })
      const sessionId = ref('test-session-123')
      const userRole = ref('actor')
      const selectedDurationMinutes = ref(10)
      const simulationTimeSeconds = ref(600)
      const timerDisplay = ref('10:00')

      const { sendReady, myReadyState } = useSimulationWorkflow({
        socketRef,
        sessionId,
        userRole,
        partner: mockPartner,
        stationData: ref({}),
        simulationTimeSeconds,
        timerDisplay,
        selectedDurationMinutes,
        inviteLinkToShow: ref(''),
        backendUrl: 'http://localhost:3000'
      })

      sendReady()

      expect(mockSocket.emit).not.toHaveBeenCalled()
      expect(myReadyState.value).toBe(false)
    })
  })

  describe('activateBackend', () => {
    it('deve ativar backend quando chamado', () => {
      const socketRef = ref(mockSocket)
      const sessionId = ref('test-session-123')
      const userRole = ref('actor')
      const selectedDurationMinutes = ref(10)

      const { activateBackend, backendActivated } = useSimulationWorkflow({
        socketRef,
        sessionId,
        userRole,
        selectedDurationMinutes,
        inviteLinkToShow: ref(''),
        backendUrl: 'http://localhost:3000'
      })

      activateBackend()

      expect(backendActivated.value).toBe(true)
    })

    it('não deve ativar backend se já estiver ativado', () => {
      const socketRef = ref(mockSocket)
      const sessionId = ref('test-session-123')
      const userRole = ref('actor')
      const selectedDurationMinutes = ref(10)

      const { activateBackend, backendActivated } = useSimulationWorkflow({
        socketRef,
        sessionId,
        userRole,
        selectedDurationMinutes,
        inviteLinkToShow: ref(''),
        backendUrl: 'http://localhost:3000'
      })

      // Primeira ativação
      activateBackend()
      expect(backendActivated.value).toBe(true)

      // Reset mock
      vi.clearAllMocks()

      // Segunda ativação não deve fazer nada
      activateBackend()
      expect(backendActivated.value).toBe(true)
    })

    it('não deve ativar backend quando sessionId é nulo', () => {
      const socketRef = ref(mockSocket)
      const sessionId = ref(null)
      const userRole = ref('actor')
      const selectedDurationMinutes = ref(10)

      const { activateBackend, backendActivated } = useSimulationWorkflow({
        socketRef,
        sessionId,
        userRole,
        selectedDurationMinutes,
        inviteLinkToShow: ref(''),
        backendUrl: 'http://localhost:3000'
      })

      activateBackend()

      expect(backendActivated.value).toBe(false)
    })
  })

  describe('handlePartnerReady', () => {
    it('deve atualizar partnerReadyState quando recebe isReady', () => {
      const socketRef = ref(mockSocket)
      const sessionId = ref('test-session-123')
      const userRole = ref('actor')
      const selectedDurationMinutes = ref(10)

      const { handlePartnerReady, partnerReadyState } = useSimulationWorkflow({
        socketRef,
        sessionId,
        userRole,
        selectedDurationMinutes,
        inviteLinkToShow: ref(''),
        backendUrl: 'http://localhost:3000'
      })

      handlePartnerReady({ isReady: true })

      expect(partnerReadyState.value).toBe(true)
    })

    it('deve ignorar quando isReady não está presente', () => {
      const socketRef = ref(mockSocket)
      const sessionId = ref('test-session-123')
      const userRole = ref('actor')
      const selectedDurationMinutes = ref(10)

      const { handlePartnerReady, partnerReadyState } = useSimulationWorkflow({
        socketRef,
        sessionId,
        userRole,
        selectedDurationMinutes,
        inviteLinkToShow: ref(''),
        backendUrl: 'http://localhost:3000'
      })

      handlePartnerReady({ ready: true }) // Note: ready em vez de isReady

      expect(partnerReadyState.value).toBe(false)
    })
  })

  describe('manuallyEndSimulation', () => {
    it('deve encerrar simulação quando está ativa', () => {
      const socketRef = ref(mockSocket)
      const sessionId = ref('test-session-123')
      const userRole = ref('actor')
      const selectedDurationMinutes = ref(10)

      const {
        manuallyEndSimulation,
        simulationStarted,
        simulationEnded,
        simulationWasManuallyEndedEarly
      } = useSimulationWorkflow({
        socketRef,
        sessionId,
        userRole,
        selectedDurationMinutes,
        inviteLinkToShow: ref(''),
        backendUrl: 'http://localhost:3000'
      })

      // Simular simulação ativa
      simulationStarted.value = true
      simulationEnded.value = false

      manuallyEndSimulation()

      expect(mockSocket.emit).toHaveBeenCalledWith('CLIENT_MANUAL_END_SIMULATION', {
        sessionId: 'test-session-123'
      })
      expect(simulationEnded.value).toBe(true)
      expect(simulationWasManuallyEndedEarly.value).toBe(true)
    })

    it('não deve encerrar quando simulação não está ativa', () => {
      const socketRef = ref(mockSocket)
      const sessionId = ref('test-session-123')
      const userRole = ref('actor')
      const selectedDurationMinutes = ref(10)

      const { manuallyEndSimulation } = useSimulationWorkflow({
        socketRef,
        sessionId,
        userRole,
        selectedDurationMinutes,
        inviteLinkToShow: ref(''),
        backendUrl: 'http://localhost:3000'
      })

      manuallyEndSimulation()

      expect(mockSocket.emit).not.toHaveBeenCalled()
    })
  })

  describe('bothParticipantsReady computed', () => {
    it('deve retornar true quando ambos estão prontos e existe parceiro', () => {
      const socketRef = ref(mockSocket)
      const sessionId = ref('test-session-123')
      const userRole = ref('actor')
      const selectedDurationMinutes = ref(10)

      const { sendReady, handlePartnerReady, bothParticipantsReady } = useSimulationWorkflow({
        socketRef,
        sessionId,
        userRole,
        selectedDurationMinutes,
        inviteLinkToShow: ref(''),
        backendUrl: 'http://localhost:3000'
      })

      // Inicialmente false
      expect(bothParticipantsReady.value).toBe(false)

      // Usuario fica pronto
      sendReady()
      expect(bothParticipantsReady.value).toBe(false)

      // Parceiro fica pronto
      handlePartnerReady({ isReady: true })
      expect(bothParticipantsReady.value).toBe(true)
    })

    it('deve retornar false quando não há parceiro', () => {
      const socketRef = ref(mockSocket)
      const sessionId = ref('test-session-123')
      const userRole = ref('actor')
      const selectedDurationMinutes = ref(10)

      const { sendReady, bothParticipantsReady } = useSimulationWorkflow({
        socketRef,
        sessionId,
        userRole,
        selectedDurationMinutes,
        inviteLinkToShow: ref(''),
        backendUrl: 'http://localhost:3000'
      })

      // Limpar partner
      mockPartner.value = null

      sendReady()
      expect(bothParticipantsReady.value).toBe(false)
    })
  })

  describe('Handlers de eventos da simulação', () => {
    it('deve processar handleSimulationStart corretamente', () => {
      const socketRef = ref(mockSocket)
      const sessionId = ref('test-session-123')
      const userRole = ref('actor')
      const selectedDurationMinutes = ref(10)

      const { handleSimulationStart, simulationStarted, simulationEnded } = useSimulationWorkflow({
        socketRef,
        sessionId,
        userRole,
        selectedDurationMinutes,
        inviteLinkToShow: ref(''),
        backendUrl: 'http://localhost:3000'
      })

      handleSimulationStart({ durationSeconds: 600 })

      expect(simulationStarted.value).toBe(true)
      expect(simulationEnded.value).toBe(false)
    })

    it('deve processar handleTimerEnd corretamente', () => {
      const socketRef = ref(mockSocket)
      const sessionId = ref('test-session-123')
      const userRole = ref('actor')
      const selectedDurationMinutes = ref(10)

      const { handleTimerEnd, simulationEnded } = useSimulationWorkflow({
        socketRef,
        sessionId,
        userRole,
        selectedDurationMinutes,
        inviteLinkToShow: ref(''),
        backendUrl: 'http://localhost:3000'
      })

      handleTimerEnd()

      expect(simulationEnded.value).toBe(true)
    })

    it('deve processar handleTimerStopped corretamente', () => {
      const socketRef = ref(mockSocket)
      const sessionId = ref('test-session-123')
      const userRole = ref('actor')
      const selectedDurationMinutes = ref(10)

      const { handleTimerStopped, simulationEnded, simulationWasManuallyEndedEarly } = useSimulationWorkflow({
        socketRef,
        sessionId,
        userRole,
        selectedDurationMinutes,
        inviteLinkToShow: ref(''),
        backendUrl: 'http://localhost:3000'
      })

      handleTimerStopped({ reason: 'manual' })

      expect(simulationEnded.value).toBe(true)
      expect(simulationWasManuallyEndedEarly.value).toBe(true)
    })
  })
})