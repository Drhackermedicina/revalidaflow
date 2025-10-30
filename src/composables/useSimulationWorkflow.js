/**
 * useSimulationWorkflow.js
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

import { ref, computed, watch } from 'vue'
import { formatTime } from '@/utils/simulationUtils'
import { logger } from '@/utils/logger.js'

/**
 * @typedef {Object} SimulationWorkflowParams
 * @property {Ref<any>} socketRef
 * @property {Ref<string|null>} sessionId
 * @property {Ref<string|null>} userRole
 * @property {Ref<any>} partner
 * @property {Ref<any>} stationData
 * @property {Ref<number>} simulationTimeSeconds
 * @property {Ref<string>} timerDisplay
 * @property {Ref<number>} selectedDurationMinutes
 * @property {Ref<string>} inviteLinkToShow
 * @property {string} backendUrl
 */

export function useSimulationWorkflow({
    socketRef: incomingSocketRef,
    sessionId: incomingSessionId,
    userRole: incomingUserRole,
    partner: incomingPartner,
    stationData: incomingStationData,
    simulationTimeSeconds: incomingSimulationTimeSeconds,
    timerDisplay: incomingTimerDisplay,
    selectedDurationMinutes: incomingSelectedDurationMinutes,
    inviteLinkToShow: incomingInviteLinkToShow,
    backendUrl: _backendUrl,
    workflowOptions = {}
}) {

    const socketRef = incomingSocketRef ?? ref(null)
    const sessionId = incomingSessionId ?? ref(null)
    const userRole = incomingUserRole ?? ref('candidate')
    const partner = incomingPartner ?? ref(null)
    const stationData = incomingStationData ?? ref(null)
    const selectedDurationMinutes = incomingSelectedDurationMinutes ?? ref(10)

    const initialDurationSeconds = (selectedDurationMinutes.value ?? 0) * 60
    const simulationTimeSeconds = incomingSimulationTimeSeconds ?? ref(initialDurationSeconds)
    const timerDisplay = incomingTimerDisplay ?? ref(
        formatTime((simulationTimeSeconds.value ?? initialDurationSeconds) || 0)
    )
    const inviteLinkToShow = incomingInviteLinkToShow ?? ref('')

    const {
        standalone = false,
        virtualPartner = null,
        autoStartTimer = false,
        disableAlerts = false
    } = workflowOptions || {}

    // --- Estado de preparação (ready) ---

    /**
     * Estado "pronto" do usuário atual
     */
    const myReadyState = ref(false)

    /**
     * Estado "pronto" do parceiro
     */
    const partnerReadyState = ref(false)

    /**
     * Controla se candidato pode clicar em "Estou pronto"
     * Habilitado após conexão bem-sucedida
     */
    const candidateReadyButtonEnabled = ref(false)

    // --- Estado da simulação ---

    /**
     * Se a simulação foi iniciada
     */
    const simulationStarted = ref(false)

    /**
     * Se a simulação terminou
     */
    const simulationEnded = ref(false)
    const simulationPaused = ref(false)

    /**
     * Se a simulação foi encerrada manualmente antes do tempo
     */
    const simulationWasManuallyEndedEarly = ref(false)

    /**
     * Se o backend foi ativado (delayed activation)
     */
    const backendActivated = ref(false)

    // --- Timer Local (Frontend-Only) ---

    /**
     * Estado de pause controlado localmente (100% frontend)
     */
    const isLocallyPaused = ref(false)

    /**
     * ID do interval do timer local
     */
    let localTimerId = null

    let standaloneTimerId = null

    if (standalone) {
        candidateReadyButtonEnabled.value = true
        partnerReadyState.value = true
        if (partner && virtualPartner) {
            partner.value = virtualPartner
        }
    }

    const alertEnabled = !(standalone || disableAlerts)

    function showAlert(message) {
        if (alertEnabled) {
            alert(message)
        } else {
            console.warn(`[simulation-workflow] ${message}`)
        }
    }

    function clearStandaloneTimer() {
        if (standaloneTimerId) {
            clearInterval(standaloneTimerId)
            standaloneTimerId = null
        }
    }

    function runStandaloneTimer() {
        clearStandaloneTimer()
        let remainingSeconds = simulationTimeSeconds.value
        timerDisplay.value = formatTime(remainingSeconds)

        standaloneTimerId = setInterval(() => {
            if (simulationEnded.value) {
                clearStandaloneTimer()
                return
            }

            remainingSeconds -= 1

            if (remainingSeconds <= 0) {
                clearStandaloneTimer()
                handleTimerEnd()
            } else {
                timerDisplay.value = formatTime(remainingSeconds)
            }
        }, 1000)
    }

    function startStandaloneSimulation() {
        if (simulationStarted.value) return

        backendActivated.value = true
        const durationSeconds = selectedDurationMinutes.value * 60
        simulationTimeSeconds.value = durationSeconds
        handleSimulationStart({ durationSeconds })
        runStandaloneTimer()
    }

    // --- Computeds ---

    /**
     * Verifica se ambos participantes estão prontos
     */
    const bothParticipantsReady = computed(() => {
        if (standalone) {
            return myReadyState.value && partnerReadyState.value
        }
        return myReadyState.value && partnerReadyState.value && !!partner.value
    })

    /**
     * Controla se ator/avaliador pode clicar em "Estou pronto"
     * Habilitado somente após candidato estar pronto
     */
    const actorReadyButtonEnabled = computed(() => {
        // Se for candidato, não se aplica (sempre retorna true)
        if (standalone || userRole.value === 'candidate') {
            return true
        }

        // Para ator/avaliador: só habilita se parceiro (candidato) está pronto
        return partnerReadyState.value === true && !!partner.value
    })

    // --- Métodos ---

    // --- Timer Local (Frontend-Only) ---

    /**
     * Inicia o timer local controlado pelo frontend
     */
    function _startLocalTimer() {
        clearLocalTimer()
        let remainingSeconds = simulationTimeSeconds.value
        timerDisplay.value = formatTime(remainingSeconds)

        localTimerId = setInterval(() => {
            // Se estiver pausado localmente ou simulação terminou, ignora
            if (isLocallyPaused.value || simulationEnded.value) {
                return
            }

            remainingSeconds -= 1
            simulationTimeSeconds.value = remainingSeconds
            timerDisplay.value = formatTime(remainingSeconds)

            // Fim do timer local
            if (remainingSeconds <= 0) {
                clearLocalTimer()
                handleTimerEnd()
            }
        }, 1000)

        logger.info('[WORKFLOW] Timer local iniciado', {
            initialSeconds: remainingSeconds,
            sessionId: sessionId.value
        })
    }

    /**
     * Limpa o timer local
     */
    function clearLocalTimer() {
        if (localTimerId) {
            clearInterval(localTimerId)
            localTimerId = null
            logger.info('[WORKFLOW] Timer local limpo')
        }
    }

    /**
     * Alterna estado de pause/continue do timer local
     */
    function toggleLocalPause() {
        isLocallyPaused.value = !isLocallyPaused.value
    }

    /**
     * Envia estado "pronto" via socket
     * Primeiro clique: marca como pronto localmente
     * Segundo clique (undo): desmarca estado pronto
     */
    function sendReady() {
        if (standalone) {
            myReadyState.value = !myReadyState.value

            if (autoStartTimer && myReadyState.value) {
                startStandaloneSimulation()
            } else if (!myReadyState.value) {
                clearStandaloneTimer()
                simulationStarted.value = false
                simulationEnded.value = false
                backendActivated.value = false
            }
            return
        }

        const socket = socketRef.value

        if (!socket || !socket.connected) {
            console.error('Socket n�o dispon�vel ou n�o conectado')
            return
        }

        if (!myReadyState.value) {
            myReadyState.value = true
            socket.emit('CLIENT_IM_READY', {
                sessionId: sessionId.value,
                userId: userRole.value
            })
        } else {
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
            return
        }

        if (standalone) {
            backendActivated.value = true
            return
        }

        if (!sessionId.value) {
            return
        }

        try {
            // Marca backend como ativado
            // A sessão já foi criada no backend quando o WebSocket conectou
            backendActivated.value = true
        } catch (error) {
            console.error('Erro ao ativar backend:', error)
            showAlert(`Erro ao ativar o backend: ${error.message}`)

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
        if (standalone) {
            if (!myReadyState.value) {
                showAlert("Marque 'Estou Pronto' para iniciar a simulação.")
                return
            }
            startStandaloneSimulation()
            return
        }

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
            showAlert("Aguarde ambos os usuários clicarem em 'Estou Pronto' para ativar o backend.")
        } else if (!bothParticipantsReady.value) {
            showAlert("Aguarde ambos os usuários marcarem 'Estou Pronto' antes de iniciar.")
        } else if (simulationStarted.value) {
            showAlert("A simulação já foi iniciada.")
        } else if (!socketRef.value?.connected) {
            showAlert("Erro: Não conectado ao servidor.")
        } else {
            showAlert("Erro: Condições não satisfeitas para iniciar a simulação.")
        }
    }

    /**
     * Encerra simulação manualmente antes do tempo
     */
    function manuallyEndSimulation() {
        if (!simulationStarted.value || simulationEnded.value) {
            return
        }

        if (!socketRef.value?.connected || !sessionId.value) {
            console.error('Socket não conectado ou sessionId inválido')
            alert("Erro: Não conectado para encerrar.")
            return
        }

        socketRef.value.emit('CLIENT_MANUAL_END_SIMULATION', {
            sessionId: sessionId.value
        })

        // Marcar estados localmente (o servidor enviará TIMER_STOPPED como confirmação)
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
                const validOptions = [7, 8, 9, 10, 11, 12]

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

        // Resetar timer local
        isLocallyPaused.value = false
        clearLocalTimer()
    }

    /**
     * Processa evento de parceiro pronto
     * @param {any} data - Dados do evento (com isReady do servidor)
     */
    function handlePartnerReady(data) {
        if (data?.isReady !== undefined) {
            partnerReadyState.value = data.isReady
        }
    }

    /**
     * Processa evento de início da simulação
     * @param {any} data - Dados do evento com durationSeconds
     */
    function handleSimulationStart(data) {
        if (data && typeof data.durationSeconds === 'number') {
            simulationTimeSeconds.value = data.durationSeconds
            timerDisplay.value = formatTime(data.durationSeconds)
        } else {
            timerDisplay.value = formatTime(simulationTimeSeconds.value)
        }

        simulationStarted.value = true
        simulationEnded.value = false
        simulationWasManuallyEndedEarly.value = false

        // 🚀 Iniciar timer local para controle 100% frontend
        _startLocalTimer()
    }

    /**
     * Processa atualização do timer via socket
     * @param {any} data - Dados com remainingSeconds
     */
    function handleTimerUpdate(data) {
        // Ignorar atualizações se a simulação já terminou
        if (simulationEnded.value) {
            return
        }

        // 🚀 IMPORTANTE: Quando o timer local está ativo, ignorar completamente atualizações do backend
        // O timer local tem controle 100% frontend e não deve ser sobrescrito
        if (localTimerId) {
            // Timer local está ativo - ignorar backend completamente
            return
        }

        // Só sincronizar com backend se o timer local NÃO estiver ativo
        if (data?.remainingSeconds !== undefined) {
            const currentLocalTime = simulationTimeSeconds.value
            const backendTime = data.remainingSeconds

            // Atualizar timer local com valor do backend (apenas para sincronização)
            simulationTimeSeconds.value = backendTime
            timerDisplay.value = formatTime(backendTime)

            // Log quando houver correção de drift significativa
            const drift = Math.abs(backendTime - currentLocalTime)
            if (drift > 2) {
                logger.info('[WORKFLOW] Timer sincronizado com backend (drift corrigido)', {
                    backendTime,
                    localTime: currentLocalTime,
                    drift
                })
            }
        }
    }

    /**
     * Processa evento de fim do timer
     */
    function handleTimerEnd() {
        timerDisplay.value = "00:00"
        simulationEnded.value = true
        clearLocalTimer() // Limpar timer local também
    }

    /**
     * Processa evento de timer parado manualmente
     * @param {any} _data - Dados do evento
     */
    function handleTimerStopped(_data) {
        simulationEnded.value = true
        simulationWasManuallyEndedEarly.value = true
        clearLocalTimer() // Limpar timer local também
    }

    /**
     * Processa evento de pausa da simulação
     * @param {any} data - Dados com remainingSeconds (opcional)
     */
    function handleSimulationPaused(data) {
        simulationPaused.value = true
        if (data?.remainingSeconds !== undefined) {
            simulationTimeSeconds.value = data.remainingSeconds
            timerDisplay.value = formatTime(data.remainingSeconds)
        }
    }

    /**
     * Processa evento de retomada da simulação
     * @param {any} data - Dados com remainingSeconds (opcional)
     */
    function handleSimulationResumed(data) {
        simulationPaused.value = false
        if (data?.remainingSeconds !== undefined) {
            simulationTimeSeconds.value = data.remainingSeconds
            timerDisplay.value = formatTime(data.remainingSeconds)
        }
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
                // Verificar se socket está conectado
                if (!socketRef.value || !socketRef.value.connected) {
                    console.error('Socket não conectado! Não é possível iniciar')
                    alert('Erro: Conexão com servidor perdida. Recarregue a página.')
                    return
                }

                if (!sessionId.value) {
                    console.error('SessionId não definido! Não é possível iniciar')
                    return
                }

                // Auto-start da simulação para ator/avaliador
                socketRef.value.emit('CLIENT_START_SIMULATION', {
                    sessionId: sessionId.value,
                    durationMinutes: selectedDurationMinutes.value
                })
            }
        }
    })

    return {
        // Estado
        myReadyState,
        partnerReadyState,
        candidateReadyButtonEnabled,
        actorReadyButtonEnabled,
        simulationStarted,
        simulationEnded, // ✅ EXPOSTO: Gerenciado pelo composable
        simulationPaused, // ✅ EXPOSTO: Gerenciado pelo composable
        simulationWasManuallyEndedEarly,
        backendActivated,

        // Timer local (frontend-only)
        isLocallyPaused,

        // Computeds
        bothParticipantsReady,

        // Métodos
        sendReady,
        activateBackend,
        handleStartSimulationClick,
        manuallyEndSimulation,
        updateTimerDisplayFromSelection,
        resetWorkflowState,
        toggleLocalPause,
        clearLocalTimer,

        // Handlers de eventos (para uso nos listeners de socket)
        handlePartnerReady,
        handleSimulationStart,
        handleTimerUpdate,
        handleTimerEnd,
        handleTimerStopped,
        handleSimulationPaused,
        handleSimulationResumed,
        handlePartnerDisconnect,
        handleSocketConnect,
        handleSocketDisconnect
    }
}


