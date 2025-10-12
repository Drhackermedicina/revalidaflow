import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'

// Mock das dependências
vi.mock('@/utils/simulationUtils', () => ({
  formatTime: (seconds) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`
}))

vi.mock('@/plugins/auth.js', () => ({
  currentUser: ref({ uid: 'user-123' })
}))

import { useSimulationWorkflow } from '../../src/composables/useSimulationWorkflow'

describe('useSimulationWorkflow - Testes Essenciais', () => {
  let mockSocket
  let mockPartner

  beforeEach(() => {
    vi.clearAllMocks()
    mockSocket = {
      connected: true,
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn()
    }
    mockPartner = ref({ userId: 'partner-123' })
  })

  it('deve inicializar com estados padrão', () => {
    const simulationTimeSeconds = ref(600)
    const timerDisplay = ref('10:00')

    const result = useSimulationWorkflow({
      socketRef: ref(mockSocket),
      sessionId: ref('test-session'),
      userRole: ref('actor'),
      partner: mockPartner,
      stationData: ref({}),
      simulationTimeSeconds,
      timerDisplay,
      selectedDurationMinutes: ref(10),
      inviteLinkToShow: ref(''),
      backendUrl: 'http://localhost:3000'
    })

    expect(result.myReadyState.value).toBe(false)
    expect(result.partnerReadyState.value).toBe(false)
    expect(result.simulationStarted.value).toBe(false)
    expect(result.simulationEnded.value).toBe(false)
    expect(result.backendActivated.value).toBe(false)
    expect(result.bothParticipantsReady.value).toBe(false)
  })

  it('sendReady deve marcar como pronto e enviar evento', () => {
    const simulationTimeSeconds = ref(600)
    const timerDisplay = ref('10:00')

    const { sendReady, myReadyState } = useSimulationWorkflow({
      socketRef: ref(mockSocket),
      sessionId: ref('test-session'),
      userRole: ref('actor'),
      partner: mockPartner,
      stationData: ref({}),
      simulationTimeSeconds,
      timerDisplay,
      selectedDurationMinutes: ref(10),
      inviteLinkToShow: ref(''),
      backendUrl: 'http://localhost:3000'
    })

    sendReady()

    expect(myReadyState.value).toBe(true)
    expect(mockSocket.emit).toHaveBeenCalledWith('CLIENT_IM_READY', {
      sessionId: 'test-session',
      userId: 'actor'
    })
  })

  it('activateBackend deve ativar o backend', () => {
    const simulationTimeSeconds = ref(600)
    const timerDisplay = ref('10:00')

    const { activateBackend, backendActivated } = useSimulationWorkflow({
      socketRef: ref(mockSocket),
      sessionId: ref('test-session'),
      userRole: ref('actor'),
      partner: mockPartner,
      stationData: ref({}),
      simulationTimeSeconds,
      timerDisplay,
      selectedDurationMinutes: ref(10),
      inviteLinkToShow: ref(''),
      backendUrl: 'http://localhost:3000'
    })

    activateBackend()

    expect(backendActivated.value).toBe(true)
  })

  it('handlePartnerReady deve atualizar estado do parceiro', () => {
    const simulationTimeSeconds = ref(600)
    const timerDisplay = ref('10:00')

    const { handlePartnerReady, partnerReadyState } = useSimulationWorkflow({
      socketRef: ref(mockSocket),
      sessionId: ref('test-session'),
      userRole: ref('actor'),
      partner: mockPartner,
      stationData: ref({}),
      simulationTimeSeconds,
      timerDisplay,
      selectedDurationMinutes: ref(10),
      inviteLinkToShow: ref(''),
      backendUrl: 'http://localhost:3000'
    })

    handlePartnerReady({ isReady: true })

    expect(partnerReadyState.value).toBe(true)
  })

  it('bothParticipantsReady deve ser true quando ambos prontos', () => {
    const simulationTimeSeconds = ref(600)
    const timerDisplay = ref('10:00')

    const { sendReady, handlePartnerReady, bothParticipantsReady } = useSimulationWorkflow({
      socketRef: ref(mockSocket),
      sessionId: ref('test-session'),
      userRole: ref('actor'),
      partner: mockPartner,
      stationData: ref({}),
      simulationTimeSeconds,
      timerDisplay,
      selectedDurationMinutes: ref(10),
      inviteLinkToShow: ref(''),
      backendUrl: 'http://localhost:3000'
    })

    expect(bothParticipantsReady.value).toBe(false)

    sendReady()
    expect(bothParticipantsReady.value).toBe(false)

    handlePartnerReady({ isReady: true })
    expect(bothParticipantsReady.value).toBe(true)
  })

  it('manuallyEndSimulation deve encerrar quando ativa', () => {
    const simulationTimeSeconds = ref(600)
    const timerDisplay = ref('10:00')

    const {
      manuallyEndSimulation,
      simulationStarted,
      simulationEnded,
      simulationWasManuallyEndedEarly
    } = useSimulationWorkflow({
      socketRef: ref(mockSocket),
      sessionId: ref('test-session'),
      userRole: ref('actor'),
      partner: mockPartner,
      stationData: ref({}),
      simulationTimeSeconds,
      timerDisplay,
      selectedDurationMinutes: ref(10),
      inviteLinkToShow: ref(''),
      backendUrl: 'http://localhost:3000'
    })

    // Simular simulação ativa
    simulationStarted.value = true
    simulationEnded.value = false

    manuallyEndSimulation()

    expect(mockSocket.emit).toHaveBeenCalledWith('CLIENT_MANUAL_END_SIMULATION', {
      sessionId: 'test-session'
    })
    expect(simulationEnded.value).toBe(true)
    expect(simulationWasManuallyEndedEarly.value).toBe(true)
  })

  it('handleSimulationStart deve iniciar simulação', () => {
    const simulationTimeSeconds = ref(600)
    const timerDisplay = ref('10:00')

    const { handleSimulationStart, simulationStarted, simulationEnded } = useSimulationWorkflow({
      socketRef: ref(mockSocket),
      sessionId: ref('test-session'),
      userRole: ref('actor'),
      partner: mockPartner,
      stationData: ref({}),
      simulationTimeSeconds,
      timerDisplay,
      selectedDurationMinutes: ref(10),
      inviteLinkToShow: ref(''),
      backendUrl: 'http://localhost:3000'
    })

    handleSimulationStart({ durationSeconds: 600 })

    expect(simulationStarted.value).toBe(true)
    expect(simulationEnded.value).toBe(false)
  })

  it('handleTimerEnd deve finalizar timer', () => {
    const simulationTimeSeconds = ref(600)
    const timerDisplay = ref('10:00')

    const { handleTimerEnd, simulationEnded } = useSimulationWorkflow({
      socketRef: ref(mockSocket),
      sessionId: ref('test-session'),
      userRole: ref('actor'),
      partner: mockPartner,
      stationData: ref({}),
      simulationTimeSeconds,
      timerDisplay,
      selectedDurationMinutes: ref(10),
      inviteLinkToShow: ref(''),
      backendUrl: 'http://localhost:3000'
    })

    handleTimerEnd()

    expect(simulationEnded.value).toBe(true)
  })

  it('handleTimerStopped deve marcar como encerrado manualmente', () => {
    const simulationTimeSeconds = ref(600)
    const timerDisplay = ref('10:00')

    const {
      handleTimerStopped,
      simulationEnded,
      simulationWasManuallyEndedEarly
    } = useSimulationWorkflow({
      socketRef: ref(mockSocket),
      sessionId: ref('test-session'),
      userRole: ref('actor'),
      partner: mockPartner,
      stationData: ref({}),
      simulationTimeSeconds,
      timerDisplay,
      selectedDurationMinutes: ref(10),
      inviteLinkToShow: ref(''),
      backendUrl: 'http://localhost:3000'
    })

    handleTimerStopped({ reason: 'manual' })

    expect(simulationEnded.value).toBe(true)
    expect(simulationWasManuallyEndedEarly.value).toBe(true)
  })
})