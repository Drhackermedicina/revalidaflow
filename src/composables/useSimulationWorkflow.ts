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
  socketRef: Ref<any>
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
  socketRef,
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
  const bothParticipantsReady = computed(() => {
    return myReadyState.value && partnerReadyState.value && !!partner.value
  })

  // --- Métodos ---

  /**
   * Envia estado "pronto" via socket
   * Primeiro clique: marca como pronto localmente
   * Segundo clique (undo): desmarca estado pronto
   */
  function sendReady() {
    const socket = socketRef.value

    if (!socket || !socket.connected) {
      console.error('Socket não disponível ou não conectado')
      return
    }

    // First click: Set local ready state
    if (!myReadyState.value) {
      myReadyState.value = true
      socket.emit('CLIENT_IM_READY', {
        sessionId: sessionId.value,
        userId: userRole.value
      })
    } else {
      // Second click: Unready and activate backend
      myReadyState.value = false
      socket.emit('CLIENT_IM_NOT_READY', {
        sessionId: sessionId.value,
        userId: userRole.value
      })
    }
  }  /**
   * Ativa o backend quando ambos usuários estão prontos
   * NOTA: A sessão já foi criada quando o usuário entrou no SimulationView
   * Esta função apenas marca o backend como ativado para liberar o início da simulação
   */
  async function activateBackend() {
    if (backendActivated.value) {
      console.log('[WORKFLOW] Backend já estava ativado')
      return
    }

    if (!sessionId.value) {
      console.error('[WORKFLOW] ❌ Erro: sessionId não definido ao tentar ativar backend')
      return
    }

    console.log('[WORKFLOW] ✅ Ativando backend - ambos participantes prontos')
    console.log('[WORKFLOW]   - SessionId:', sessionId.value)
    console.log('[WORKFLOW]   - UserRole:', userRole.value)

    try {
      // Marca backend como ativado
      // A sessão já foi criada no backend quando o WebSocket conectou
      backendActivated.value = true

      console.log('[WORKFLOW] ✅ Backend ativado com sucesso')
      console.log('[WORKFLOW]   → O watch(backendActivated) irá emitir CLIENT_START_SIMULATION automaticamente')

    } catch (error) {
      console.error('[WORKFLOW] ❌ Erro ao ativar backend:', error)
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
      socketRef.value?.connected &&
      sessionId.value &&
      (userRole.value === 'actor' || userRole.value === 'evaluator') &&
      bothParticipantsReady.value &&
      !simulationStarted.value
    ) {
      const durationToSend = selectedDurationMinutes.value

      socketRef.value.emit('CLIENT_START_SIMULATION', {
        sessionId: sessionId.value,
        durationMinutes: durationToSend
      })
    } else if (!backendActivated.value) {
      alert("Aguarde ambos os usuários clicarem em 'Estou Pronto' para ativar o backend.")
    } else if (!bothParticipantsReady.value) {
      alert("Aguarde ambos os usuários marcarem 'Estou Pronto' antes de iniciar.")
    } else if (simulationStarted.value) {
      alert("A simulação já foi iniciada.")
    } else if (!socketRef.value?.connected) {
      alert("Erro: Não conectado ao servidor.")
    } else {
      alert("Erro: Condições não satisfeitas para iniciar a simulação.")
    }
  }

  /**
   * Encerra simulação manualmente antes do tempo
   */
  function manuallyEndSimulation() {
    console.log('[WORKFLOW] 🛑 Tentando encerrar simulação manualmente')
    console.log('[WORKFLOW]   - simulationStarted:', simulationStarted.value)
    console.log('[WORKFLOW]   - simulationEnded:', simulationEnded.value)
    console.log('[WORKFLOW]   - sessionId:', sessionId.value)

    if (!simulationStarted.value || simulationEnded.value) {
      console.warn('[WORKFLOW] ⚠️ Não é possível encerrar - simulação não iniciada ou já encerrada')
      return
    }

    if (!socketRef.value?.connected || !sessionId.value) {
      console.error('[WORKFLOW] ❌ Socket não conectado ou sessionId inválido')
      alert("Erro: Não conectado para encerrar.")
      return
    }

    console.log('[WORKFLOW] 📤 Emitindo CLIENT_MANUAL_END_SIMULATION')

    socketRef.value.emit('CLIENT_MANUAL_END_SIMULATION', {
      sessionId: sessionId.value
    })

    // Marcar estados localmente (o servidor enviará TIMER_STOPPED como confirmação)
    simulationEnded.value = true
    simulationWasManuallyEndedEarly.value = true
    timerDisplay.value = "00:00"

    console.log('[WORKFLOW] ✅ Simulação encerrada manualmente - aguardando confirmação do servidor')
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
   * @param data - Dados do evento (com isReady do servidor)
   */
  function handlePartnerReady(data: any) {
    if (data?.isReady !== undefined) {
      partnerReadyState.value = data.isReady
    }
  }

  /**
   * Processa evento de início da simulação
   * @param data - Dados do evento com durationSeconds
   */
  function handleSimulationStart(data: any) {
    console.log('[WORKFLOW] 🎬 Recebido SERVER_START_SIMULATION')
    console.log('[WORKFLOW]   - durationSeconds:', data?.durationSeconds)

    if (data && typeof data.durationSeconds === 'number') {
      simulationTimeSeconds.value = data.durationSeconds
      timerDisplay.value = formatTime(data.durationSeconds)
    } else {
      console.warn(
        '[WORKFLOW] ⚠️ SERVER_START_SIMULATION não continha durationSeconds. Timer pode estar dessincronizado.'
      )
      timerDisplay.value = formatTime(simulationTimeSeconds.value)
    }

    simulationStarted.value = true
    simulationEnded.value = false
    simulationWasManuallyEndedEarly.value = false

    console.log('[WORKFLOW] ✅ Simulação iniciada - timer começando')
  }

  /**
   * Processa atualização do timer via socket
   * @param data - Dados com remainingSeconds
   */
  function handleTimerUpdate(data: any) {
    // Ignorar atualizações se a simulação já terminou
    if (simulationEnded.value) {
      console.log('[WORKFLOW] ⏭️ Ignorando TIMER_UPDATE - simulação já encerrada')
      return
    }

    if (data?.remainingSeconds !== undefined) {
      timerDisplay.value = formatTime(data.remainingSeconds)
    }
  }

  /**
   * Processa evento de fim do timer
   */
  function handleTimerEnd() {
    console.log('[WORKFLOW] ⏰ Recebido TIMER_END - tempo esgotado')

    timerDisplay.value = "00:00"
    simulationEnded.value = true

    console.log('[WORKFLOW] ✅ Timer finalizado naturalmente')
  }

  /**
   * Processa evento de timer parado manualmente
   * @param data - Dados do evento
   */
  function handleTimerStopped(data: any) {
    console.log('[WORKFLOW] 📥 Recebido TIMER_STOPPED do servidor')
    console.log('[WORKFLOW]   - reason:', data?.reason)

    simulationEnded.value = true
    simulationWasManuallyEndedEarly.value = true

    console.log('[WORKFLOW] ✅ Timer parado - simulação encerrada')
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
   */
  watch(bothParticipantsReady, (newValue) => {
    if (newValue && !backendActivated.value) {
      activateBackend()
    }
  })

  /**
   * Watch para iniciar simulação automaticamente após backend ativado
   * (somente para ator/avaliador)
   */
  watch(backendActivated, (newValue) => {
    if (
      newValue &&
      bothParticipantsReady.value &&
      !simulationStarted.value &&
      !simulationEnded.value
    ) {
      // Backend is activated, proceed with simulation start
      if (userRole.value === 'actor' || userRole.value === 'evaluator') {
        console.log('[WORKFLOW] 🚀 Auto-start: Emitindo CLIENT_START_SIMULATION')
        console.log('[WORKFLOW]   - Duração:', selectedDurationMinutes.value, 'minutos')
        console.log('[WORKFLOW]   - SessionId:', sessionId.value)

        // Verificar se socket está conectado
        if (!socketRef.value || !socketRef.value.connected) {
          console.error('[WORKFLOW] ❌ Socket não conectado! Não é possível iniciar')
          alert('Erro: Conexão com servidor perdida. Recarregue a página.')
          return
        }

        if (!sessionId.value) {
          console.error('[WORKFLOW] ❌ SessionId não definido! Não é possível iniciar')
          return
        }

        // Auto-start da simulação para ator/avaliador
        const durationToSend = selectedDurationMinutes.value

        socketRef.value.emit('CLIENT_START_SIMULATION', {
          sessionId: sessionId.value,
          durationMinutes: durationToSend
        })

        console.log('[WORKFLOW] ✅ Evento CLIENT_START_SIMULATION emitido com sucesso')
      } else {
        console.log('[WORKFLOW] ⏳ Candidato aguardando início pelo ator/avaliador')
      }
    }
  })

  return {
    // Estado
    myReadyState,
    partnerReadyState,
    candidateReadyButtonEnabled,
    simulationStarted,
    simulationEnded, // ✅ EXPOSTO: Gerenciado pelo composable
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
