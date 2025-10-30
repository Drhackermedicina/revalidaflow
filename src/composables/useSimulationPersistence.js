/**
 * useSimulationPersistence.js
 * 
 * Composable para gerenciar a persistência da simulação e evitar
 * finalização prematura quando usuários saem da página acidentalmente.
 * 
 * Funcionalidades:
 * - Salvar estado da simulação em sessionStorage/localStorage
 * - Detectar quando usuário tenta sair da página
 * - Manter timer ativo mesmo com desconexões temporárias
 * - Recuperar simulação ao retornar à página
 * 
 * @author REVALIDAFLOW Team
 */

import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { logger } from '@/utils/logger.js'

export function useSimulationPersistence({
  sessionId,
  stationId,
  userRole,
  simulationStarted,
  simulationEnded,
  simulationTimeSeconds,
  timerDisplay,
  socketRef
}) {
  const router = useRouter()

  // Estado para controlar persistência
  const isSimulationPersisted = ref(false)
  const hasLeftPage = ref(false)
  const returnAttempt = ref(false)
  const lastTimerUpdate = ref(null)
  const persistedTime = ref(null)

  // Chaves para storage
  const STORAGE_KEYS = {
    SIMULATION_STATE: `simulation_${sessionId}`,
    TIMER_STATE: `timer_${sessionId}`,
    USER_ROLE: `role_${sessionId}`,
    LAST_ACTIVITY: `activity_${sessionId}`
  }

  // Verificar se há estado salvo da simulação
  const checkPersistedSimulation = () => {
    try {
      const storedState = sessionStorage.getItem(STORAGE_KEYS.SIMULATION_STATE)
      const storedTimer = sessionStorage.getItem(STORAGE_KEYS.TIMER_STATE)
      const lastActivity = sessionStorage.getItem(STORAGE_KEYS.LAST_ACTIVITY)

      if (storedState && storedTimer) {
        const state = JSON.parse(storedState)
        const timer = JSON.parse(storedTimer)
        const lastActivityTime = new Date(lastActivity)
        
        // Se a última atividade foi há menos de 5 minutos, consideramos válida
        const now = new Date()
        const timeDiff = (now - lastActivityTime) / 1000 // diferença em segundos
        const isValidState = timeDiff < 300 // 5 minutos

        logger.debug('[PERSISTENCE] Estado salvo encontrado', {
          sessionId: sessionId.value,
          isValid: isValidState,
          timeDiff
        })

        if (isValidState && state.sessionId === sessionId.value) {
          isSimulationPersisted.value = true
          persistedTime.value = timer
          lastTimerUpdate.value = lastActivityTime
          
          // Notificar sobre recuperação
          if (state.simulationStarted && !state.simulationEnded) {
            hasLeftPage.value = true
            
            // Mostrar notificação se não for tentativa de retorno manual
            if (!returnAttempt.value) {
              showRecoveryNotification()
            }
          }
          
          return state
        }
      }
      
      // Limpar estados expirados
      clearPersistedState()
      return null
    } catch (error) {
      logger.error('[PERSISTENCE] Erro ao verificar estado salvo:', error)
      clearPersistedState()
      return null
    }
  }

  // Salvar estado da simulação
  const persistSimulationState = () => {
    if (!sessionId.value) return

    try {
      const now = new Date().toISOString()
      const state = {
        sessionId: sessionId.value,
        stationId: stationId.value,
        userRole: userRole.value,
        simulationStarted: simulationStarted.value,
        simulationEnded: simulationEnded.value,
        simulationTimeSeconds: simulationTimeSeconds.value,
        timestamp: now
      }

      const timer = {
        remainingSeconds: simulationTimeSeconds.value,
        display: timerDisplay.value,
        timestamp: now
      }

      sessionStorage.setItem(STORAGE_KEYS.SIMULATION_STATE, JSON.stringify(state))
      sessionStorage.setItem(STORAGE_KEYS.TIMER_STATE, JSON.stringify(timer))
      sessionStorage.setItem(STORAGE_KEYS.USER_ROLE, userRole.value)
      sessionStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, now)

      logger.debug('[PERSISTENCE] Estado salvo', { 
        sessionId: sessionId.value,
        simulationStarted: simulationStarted.value,
        simulationEnded: simulationEnded.value
      })
    } catch (error) {
      logger.error('[PERSISTENCE] Erro ao salvar estado:', error)
    }
  }

  // Limpar estado persistido
  const clearPersistedState = () => {
    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        sessionStorage.removeItem(key)
      })
      isSimulationPersisted.value = false
      hasLeftPage.value = false
      persistedTime.value = null
      lastTimerUpdate.value = null
      
      logger.debug('[PERSISTENCE] Estado limpo', { sessionId: sessionId.value })
    } catch (error) {
      logger.error('[PERSISTENCE] Erro ao limpar estado:', error)
    }
  }

  // Mostrar notificação de recuperação
  const showRecoveryNotification = () => {
    // Criar notificação customizada
    const notification = document.createElement('div')
    notification.className = 'simulation-recovery-notification'
    notification.innerHTML = `
      <div class="notification-content">
        <h4>⚠️ Simulação em andamento detectada</h4>
        <p>Você saiu da página durante uma simulação ativa.</p>
        <p>Deseja continuar de onde parou?</p>
        <div class="notification-actions">
          <button id="continue-simulation" class="v-btn v-btn--elevated v-btn--variant-elevated v-theme--light bg-primary v-btn--density-default v-btn--size-default">
            Continuar Simulação
          </button>
          <button id="abort-simulation" class="v-btn v-btn--text v-btn--variant-text v-theme--light v-btn--density-default v-btn--size-default">
            Encerrar Simulação
          </button>
        </div>
      </div>
    `
    
    // Estilização da notificação
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 400px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 9999;
      padding: 16px;
    `
    
    document.body.appendChild(notification)
    
    // Adicionar listeners aos botões
    document.getElementById('continue-simulation')?.addEventListener('click', () => {
      document.body.removeChild(notification)
      continuePersistedSimulation()
    })
    
    document.getElementById('abort-simulation')?.addEventListener('click', () => {
      document.body.removeChild(notification)
      clearPersistedState()
      window.location.reload()
    })
    
    // Auto-remover após 15 segundos
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification)
      }
    }, 15000)
  }

  // Continuar simulação persistida
  const continuePersistedSimulation = () => {
    returnAttempt.value = true
    
    // Reconectar WebSocket se necessário
    if (!socketRef.value?.connected) {
      logger.info('[PERSISTENCE] Reconectando WebSocket para continuar simulação')
      // Emitir evento para reconectar
      window.dispatchEvent(new CustomEvent('reconnect-simulation', {
        detail: { sessionId: sessionId.value }
      }))
    }
    
    // Sincronizar timer se tiver dados salvos
    if (persistedTime.value && socketRef.value?.connected) {
      const timeDiff = (new Date() - new Date(lastTimerUpdate.value)) / 1000
      const adjustedTime = Math.max(0, persistedTime.value.remainingSeconds - timeDiff)
      
      logger.debug('[PERSISTENCE] Ajustando timer', {
        original: persistedTime.value.remainingSeconds,
        adjusted: adjustedTime,
        timeDiff
      })
      
      // Solicitar sincronização do timer
      socketRef.value.emit('CLIENT_TIMER_SYNC_REQUEST', {
        sessionId: sessionId.value,
        estimatedRemaining: adjustedTime
      })
    }
    
    hasLeftPage.value = false
  }

  // Detectar quando usuário está tentando sair
  const handleBeforeUnload = (event) => {
    if (simulationStarted.value && !simulationEnded.value) {
      // Salvar estado antes de sair
      persistSimulationState()
      
      // Mostrar aviso padrão do navegador
      event.preventDefault()
      event.returnValue = 'Uma simulação está em andamento. Tem certeza que deseja sair?'
      return event.returnValue
    }
  }

  // Watchers para salvar estado automaticamente
  watch([simulationStarted, simulationEnded, simulationTimeSeconds], () => {
    if (simulationStarted.value) {
      persistSimulationState()
    }
    
    // Limpar estado quando simulação termina
    if (simulationEnded.value) {
      setTimeout(() => {
        clearPersistedState()
      }, 5000) // Manter por 5 segundos para casos de reload acidental
    }
  }, { deep: true })

  // Configurar event listeners
  onMounted(() => {
    // Verificar se há estado salvo ao montar
    const savedState = checkPersistedSimulation()
    
    // Adicionar listeners de eventos
    window.addEventListener('beforeunload', handleBeforeUnload)
    
    // Listener para reconexão
    window.addEventListener('reconnect-simulation', (event) => {
      logger.debug('[PERSISTENCE] Evento de reconexão recebido', event.detail)
    })
  })

  onUnmounted(() => {
    // Remover listeners
    window.removeEventListener('beforeunload', handleBeforeUnload)
    
    // Salvar estado final se simulação estiver ativa
    if (simulationStarted.value && !simulationEnded.value) {
      persistSimulationState()
    }
  })

  // Computeds
  const canRecoverSimulation = computed(() => {
    return isSimulationPersisted.value && hasLeftPage.value
  })

  const timeSinceLastActivity = computed(() => {
    if (!lastTimerUpdate.value) return null
    
    const now = new Date()
    const diff = (now - lastTimerUpdate.value) / 1000
    return Math.floor(diff)
  })

  return {
    // Estado
    isSimulationPersisted,
    hasLeftPage,
    returnAttempt,
    lastTimerUpdate,
    persistedTime,
    
    // Computeds
    canRecoverSimulation,
    timeSinceLastActivity,
    
    // Métodos
    checkPersistedSimulation,
    persistSimulationState,
    clearPersistedState,
    continuePersistedSimulation,
    showRecoveryNotification
  }
}
