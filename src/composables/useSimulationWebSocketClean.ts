import { ref, nextTick, triggerRef } from 'vue'
import { io } from 'socket.io-client'
import { backendUrl } from '@/utils/backendUrl.js'

export function useSimulationWebSocket({
  sessionId,
  userRole,
  stationId,
  currentUser,
  // Callbacks para eventos do socket
  onConnect = () => {},
  onDisconnect = () => {},
  onError = (error) => console.error('Socket error:', error),
  onPartnerJoined = (partner) => {},
  onPartnerLeft = () => {},
  onPartnerReady = (data) => {},
  onSimulationStart = (data) => {},
  onTimerUpdate = (data) => {},
  onTimerEnd = () => {},
  onTimerStopped = (data) => {},
  onPepVisibilityChange = (payload) => {},
  onScoresUpdated = (data) => {},
  onSubmissionConfirmed = (data) => {},
  onCandidateSubmitted = (data) => {},
  onInternalInviteReceived = (data) => {},
  onOnlineUsersList = (users) => {},
  onCandidateReceiveData = (data) => {},
  // Serviços injetados
  playSoundEffect = async () => {},
  showNotification = (message, type) => {},
  captureSimulationError = (error, context) => {},
  captureWebSocketError = (error, context) => {}
}) {
  const socketRef = ref(null)
  const connectionStatus = ref('')

  const connectWebSocket = () => {
    if (!sessionId.value || !userRole.value || !stationId.value || !currentUser.value?.uid) {
      console.error("SOCKET: Dados essenciais faltando para conexão.")
      return
    }

    connectionStatus.value = 'Conectando'
    if (socketRef.value && socketRef.value.connected) {
      socketRef.value.disconnect()
    }

    const socket = io(backendUrl, {
      transports: ['websocket'],
      query: {
        sessionId: sessionId.value,
        userId: currentUser.value?.uid,
        role: userRole.value,
        stationId: stationId.value,
        displayName: currentUser.value?.displayName
      }
    })

    socket.on('connect', () => {
      connectionStatus.value = 'Conectado'
      socketRef.value = socket
      console.log('SOCKET: Conectado.')
      onConnect()
    })

    socket.on('disconnect', (reason) => {
      connectionStatus.value = 'Desconectado'
      onDisconnect()

      const isCandidateReviewing = userRole.value === 'candidate' && simulationStarted.value

      if (isCandidateReviewing) {
        if (reason !== 'io client disconnect' && reason !== 'io client disconnect forced close by client') {
          showNotification("Conexão perdida. Você pode continuar revisando os dados da estação.", 'warning')
        }
      } else {
        if (reason !== 'io client disconnect' && reason !== 'io client disconnect forced close by client') {
          showNotification("Conexão com o servidor de simulação perdida.", 'error')
        }
      }
    })

    socket.on('connect_error', (err) => {
      connectionStatus.value = 'Erro de Conexão'
      onError(err)
      captureWebSocketError(err, {
        socketId: socket?.id,
        sessionId: sessionId.value,
        connectionState: 'failed',
        lastEvent: 'connect_error'
      })
    })

    socket.on('SERVER_ERROR', (data) => {
      console.error('SOCKET: Erro do Servidor:', data.message)
      onError(new Error(data.message))
      captureSimulationError(new Error(data.message), {
        sessionId: sessionId.value,
        userRole: userRole.value,
        stationId: stationId.value,
        simulationState: simulationStarted.value ? 'started' : 'preparing'
      })
    })

    socket.on('SERVER_PARTNER_JOINED', (participantInfo) => {
      if (participantInfo && participantInfo.userId !== currentUser.value?.uid) {
        onPartnerJoined(participantInfo)
      }
    })

    socket.on('SERVER_PARTNER_LEFT', (data) => {
      onPartnerLeft()
    })

    socket.on('SERVER_PARTNER_READY', (data) => {
      if (data && data.userId !== currentUser.value?.uid) {
        onPartnerReady(data)
      }
    })

    socket.on('SERVER_START_SIMULATION', (data) => {
      onSimulationStart(data)
      playSoundEffect()
    })

    socket.on('TIMER_UPDATE', (data) => {
      onTimerUpdate(data)
    })

    socket.on('TIMER_END', () => {
      onTimerEnd()
      playSoundEffect()

      if (userRole.value === 'candidate') {
        showNotification('Tempo finalizado! Aguardando avaliação do examinador...', 'info')
      }
    })

    socket.on('TIMER_STOPPED', (data) => {
      onTimerStopped(data)
      playSoundEffect()
    })

    socket.on('CANDIDATE_RECEIVE_PEP_VISIBILITY', (payload) => {
      console.log('[CANDIDATE_PEP] 📥 Recebido CANDIDATE_RECEIVE_PEP_VISIBILITY')

      if (userRole.value === 'candidate' && payload && typeof payload.shouldBeVisible === 'boolean') {
        onPepVisibilityChange(payload)

        nextTick(() => {
          triggerRef(isChecklistVisibleForCandidate)

          if (payload.shouldBeVisible) {
            showNotification('O PEP (checklist de avaliação) foi liberado pelo examinador!', 'success')
          }
        })
      }
    })

    socket.on('CANDIDATE_RECEIVE_UPDATED_SCORES', (data) => {
      if (userRole.value === 'candidate' && data && data.scores) {
        onScoresUpdated(data)
      }
    })

    socket.on('SERVER_BOTH_PARTICIPANTS_READY', () => {
      onPartnerReady({ isReady: true })
    })

    socket.on('EVALUATOR_SCORES_UPDATED_FOR_CANDIDATE', (data) => {
      if (userRole.value === 'candidate' && data.sessionId === sessionId.value) {
        onScoresUpdated(data)
      }
    })

    socket.on('INTERNAL_INVITE_RECEIVED', onInternalInviteReceived)

    socket.on('SUBMISSION_CONFIRMED', (data) => {
      if (data.success) {
        onSubmissionConfirmed(data)
        showNotification('Avaliação confirmada pelo servidor!', 'success')
      }
    })

    socket.on('CANDIDATE_SUBMITTED_EVALUATION', (data) => {
      if (userRole.value === 'actor' || userRole.value === 'evaluator') {
        onCandidateSubmitted(data)
        showNotification(`Candidato submeteu avaliação final. Nota: ${data.totalScore?.toFixed(2) || 'N/A'}`, 'info')
      }
    })

    socket.on('SERVER_ONLINE_USERS', onOnlineUsersList)
    socket.on('CANDIDATE_RECEIVE_DATA', onCandidateReceiveData)
  }

  const disconnect = () => {
    if (socketRef.value) {
      socketRef.value.disconnect()
    }
  }

  const emit = (event, data) => {
    if (socketRef.value && socketRef.value.connected) {
      socketRef.value.emit(event, data)
    }
  }

  return {
    socketRef,
    connectionStatus,
    connectWebSocket,
    disconnect,
    emit
  }
}