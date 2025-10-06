/**
 * useSimulationWorkflow.ts
 *
 * Composable para gerenciar o fluxo completo da simulação
 * Extrai lógica de ciclo de vida (ready/start/end) do SimulationView.vue
 *
 * Responsabilidades:
 * - Gerenciar estados de preparação (ready states)
 * - Controlar início e fim da simulação
 * - Ativar backend quando ambos participantes prontos
 * - Processar eventos de timer via socket
 * - Atualizar timer display a partir de seleção de duração
 * - Gerenciar estado de botões e habilitação
 */

import { ref, computed, watch, type Ref } from 'vue'
import { formatTime } from '@/utils/simulationUtils'

interface SimulationWorkflowParams {
  socket: Ref<any>
  sessionId: Ref<string | null>
  userRole: Ref<string | null>
  partner: Ref<any>
  stationData: Ref<any>
  simulationTimeSeconds: Ref<number>
  timerDisplay: Ref<string>
  selectedDurationMinutes: Ref<number>
  inviteLinkToShow: Ref<string>
  backendUrl: string
}

export function useSimulationWorkflow({
  socket,
  sessionId,
  userRole,
  partner,
  stationData,
  simulationTimeSeconds,
  timerDisplay,
  selectedDurationMinutes,
  inviteLinkToShow,
  backendUrl
}: SimulationWorkflowParams) {

  // --- Estado de preparação (ready) ---

  /**
   * Estado "pronto" do usuário atual
   */
  const myReadyState = ref<boolean>(false)

  /**
   * Estado "pronto" do parceiro
   */
  const partnerReadyState = ref<boolean>(false)

  /**
   * Controla se candidato pode clicar em "Estou pronto"
   * Habilitado após conexão bem-sucedida
   */
  const candidateReadyButtonEnabled = ref<boolean>(false)

  // --- Estado da simulação ---

  /**
   * Se a simulação foi iniciada
   */
  const simulationStarted = ref<boolean>(false)

  /**
   * Se a simulação terminou
   */
  const simulationEnded = ref<boolean>(false)

  /**
   * Se a simulação foi encerrada manualmente antes do tempo
   */
  const simulationWasManuallyEndedEarly = ref<boolean>(false)

  /**
   * Se o backend foi ativado (delayed activation)
   */
  const backendActivated = ref<boolean>(false)

  // --- Computeds ---

  /**
   * Verifica se ambos participantes estão prontos
   */
  const bothParticipantsReady = computed(() =>
    myReadyState.value && partnerReadyState.value && !!partner.value
  )

  // --- Métodos ---

  /**
   * Envia estado "pronto" via socket
   * Primeiro clique: marca como pronto localmente
   * Segundo clique (undo): desmarca estado pronto
   */
  function sendReady() {
    // First click: Set local ready state
    if (!myReadyState.value) {
      myReadyState.value = true

      // Emitir evento via socket
      if (socket.value?.connected && sessionId.value) {
        socket.value.emit('CLIENT_READY', {
          sessionId: sessionId.value,
          userId: userRole.value
        })
      }
    } else {
      // Second click: Undo ready state
      myReadyState.value = false

      if (socket.value?.connected && sessionId.value) {
        socket.value.emit('CLIENT_NOT_READY', {
          sessionId: sessionId.value,
          userId: userRole.value
        })
      }
    }
  }

  /**
   * Ativa o backend quando ambos usuários estão prontos
   * Faz requisição para /api/activate-backend
   */
  async function activateBackend() {
    if (backendActivated.value) {
      return
    }

    if (!sessionId.value) {
      console.error('[BACKEND ACTIVATION] sessionId não definido')
      return
    }

    try {
      const response = await fetch(`${backendUrl}/api/activate-backend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: sessionId.value
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log('[BACKEND ACTIVATION] Backend ativado:', data)

      // Mark backend as activated
      backendActivated.value = true

      // A emissão de CLIENT_START_SIMULATION será feita pelo watch(bothParticipantsReady)
      // ou pelo clique no botão "Iniciar Simulação" se for ator/avaliador.

    } catch (error) {
      console.error('[BACKEND ACTIVATION] Erro ao ativar backend:', error)
      alert(`Erro ao ativar o backend: ${error.message}`)

      // Reset ready states on error
      myReadyState.value = false
      partnerReadyState.value = false
      backendActivated.value = false
    }
  }

  /**
   * Manipula clique no botão "Iniciar Simulação" (ator/avaliador)
   */
  function handleStartSimulationClick() {
    if (
      backendActivated.value &&
      socket.value?.connected &&
      sessionId.value &&
      (userRole.value === 'actor' || userRole.value === 'evaluator') &&
      bothParticipantsReady.value &&
      !simulationStarted.value
    ) {
      const durationToSend = selectedDurationMinutes.value

      socket.value.emit('CLIENT_START_SIMULATION', {
        sessionId: sessionId.value,
        durationMinutes: durationToSend
      })
    } else if (!backendActivated.value) {
      alert("Aguarde ambos os usuários clicarem em 'Estou Pronto' para ativar o backend.")
    } else if (!bothParticipantsReady.value) {
      alert("Aguarde ambos os usuários marcarem 'Estou Pronto' antes de iniciar.")
    } else if (simulationStarted.value) {
      alert("A simulação já foi iniciada.")
    } else if (!socket.value?.connected) {
      alert("Erro: Não conectado ao servidor.")
    } else {
      alert("Erro: Condições não satisfeitas para iniciar a simulação.")
    }
  }

  /**
   * Encerra simulação manualmente antes do tempo
   */
  function manuallyEndSimulation() {
    if (!simulationStarted.value || simulationEnded.value) {
      return
    }

    if (!socket.value?.connected || !sessionId.value) {
      alert("Erro: Não conectado para encerrar.")
      return
    }

    socket.value.emit('CLIENT_MANUALLY_END_SIMULATION', {
      sessionId: sessionId.value
    })

    simulationEnded.value = true
    simulationWasManuallyEndedEarly.value = true
    timerDisplay.value = "00:00"
  }

  /**
   * Atualiza display do timer quando a duração selecionada muda
   * Previne mudanças após simulação iniciada ou link gerado
   */
  function updateTimerDisplayFromSelection() {
    if (selectedDurationMinutes.value) {
      const newTimeInSeconds = parseInt(String(selectedDurationMinutes.value)) * 60

      if (!simulationStarted.value && !inviteLinkToShow.value) {
        if (simulationTimeSeconds.value !== newTimeInSeconds) {
          simulationTimeSeconds.value = newTimeInSeconds
          timerDisplay.value = formatTime(simulationTimeSeconds.value)
        }
      } else if (simulationStarted.value) {
        console.warn("Não é possível alterar a duração após o início da simulação.")
      } else if (inviteLinkToShow.value) {
        // Se o link já foi gerado, a duração está "travada" com a duração do link.
        // Resetar o dropdown para o valor correto caso o usuário mude e tente iniciar de novo.
        // O `selectedDurationMinutes` deve ser o que foi usado para gerar o link (que é o que está no timerDisplay)
        const currentDurationInMinutes = Math.round(simulationTimeSeconds.value / 60)
        const validOptions = [5, 6, 7, 8, 9, 10]

        if (
          selectedDurationMinutes.value !== currentDurationInMinutes &&
          validOptions.includes(currentDurationInMinutes)
        ) {
          selectedDurationMinutes.value = currentDurationInMinutes
        }

        console.warn("Duração travada após geração do link. Use o valor previamente selecionado.")
      }
    }
  }

  /**
   * Reseta todos os estados da simulação
   * Chamado ao desconectar ou limpar sessão
   */
  function resetWorkflowState() {
    myReadyState.value = false
    partnerReadyState.value = false
    simulationStarted.value = false
    simulationEnded.value = false
    simulationWasManuallyEndedEarly.value = false
    candidateReadyButtonEnabled.value = false
    backendActivated.value = false
  }

  /**
   * Processa evento de parceiro pronto
   * @param data - Dados do evento
   */
  function handlePartnerReady(data: any) {
    if (data?.ready !== undefined) {
      partnerReadyState.value = data.ready
    }
  }

  /**
   * Processa evento de início da simulação
   * @param data - Dados do evento com durationSeconds
   */
  function handleSimulationStart(data: any) {
    if (data && typeof data.durationSeconds === 'number') {
      simulationTimeSeconds.value = data.durationSeconds
      timerDisplay.value = formatTime(data.durationSeconds)
    } else {
      console.warn(
        '[CLIENT] SERVER_START_SIMULATION não continha durationSeconds. Timer pode estar dessincronizado.'
      )
      timerDisplay.value = formatTime(simulationTimeSeconds.value)
    }

    simulationStarted.value = true
    simulationEnded.value = false
    simulationWasManuallyEndedEarly.value = false
  }

  /**
   * Processa atualização do timer via socket
   * @param data - Dados com remainingSeconds
   */
  function handleTimerUpdate(data: any) {
    if (data?.remainingSeconds !== undefined) {
      timerDisplay.value = formatTime(data.remainingSeconds)
    }
  }

  /**
   * Processa evento de fim do timer
   */
  function handleTimerEnd() {
    timerDisplay.value = "00:00"
    simulationEnded.value = true
  }

  /**
   * Processa evento de timer parado manualmente
   * @param data - Dados do evento
   */
  function handleTimerStopped(data: any) {
    console.log('[CLIENT] TIMER_STOPPED recebido:', data)
    simulationEnded.value = true
    simulationWasManuallyEndedEarly.value = true
  }

  /**
   * Processa desconexão do parceiro
   * Reseta estados se não estiver em modo de revisão (candidato após fim)
   */
  function handlePartnerDisconnect() {
    partner.value = null

    const isCandidateReviewing =
      userRole.value === 'candidate' && stationData.value && simulationStarted.value

    if (!isCandidateReviewing) {
      myReadyState.value = false
      partnerReadyState.value = false

      if (!simulationStarted.value) {
        timerDisplay.value = formatTime(selectedDurationMinutes.value * 60)
      }
    }
  }

  /**
   * Processa conexão bem-sucedida
   * Habilita botão "Estou pronto" para candidato
   */
  function handleSocketConnect() {
    if (userRole.value === 'candidate') {
      candidateReadyButtonEnabled.value = true
    }
  }

  /**
   * Processa desconexão do socket
   * Desabilita botão para candidato
   */
  function handleSocketDisconnect() {
    if (userRole.value === 'candidate') {
      candidateReadyButtonEnabled.value = false
    }
  }

  // --- Watchers ---

  /**
   * Watch para ativar backend automaticamente quando ambos prontos
   * E iniciar simulação automaticamente para ator/avaliador
   */
  watch(bothParticipantsReady, (newValue) => {
    if (newValue && !backendActivated.value) {
      activateBackend()
    } else if (
      newValue &&
      backendActivated.value &&
      !simulationStarted.value &&
      !simulationEnded.value
    ) {
      // Backend is activated, proceed with simulation start
      if (userRole.value === 'actor' || userRole.value === 'evaluator') {
        // Auto-start da simulação para ator/avaliador
        const durationToSend = selectedDurationMinutes.value

        if (socket.value?.connected && sessionId.value) {
          socket.value.emit('CLIENT_START_SIMULATION', {
            sessionId: sessionId.value,
            durationMinutes: durationToSend
          })
        }
      } else if (userRole.value === 'candidate' && !simulationStarted.value) {
        // Candidato aguarda ator iniciar
      }
    }
  })

  return {
    // Estado
    myReadyState,
    partnerReadyState,
    candidateReadyButtonEnabled,
    simulationStarted,
    simulationEnded,
    simulationWasManuallyEndedEarly,
    backendActivated,

    // Computeds
    bothParticipantsReady,

    // Métodos
    sendReady,
    activateBackend,
    handleStartSimulationClick,
    manuallyEndSimulation,
    updateTimerDisplayFromSelection,
    resetWorkflowState,

    // Handlers de eventos (para uso nos listeners de socket)
    handlePartnerReady,
    handleSimulationStart,
    handleTimerUpdate,
    handleTimerEnd,
    handleTimerStopped,
    handlePartnerDisconnect,
    handleSocketConnect,
    handleSocketDisconnect
  }
}
