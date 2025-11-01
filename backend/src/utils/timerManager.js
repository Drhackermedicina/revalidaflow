/**
 * timerManager.js
 * 
 * Utilitário para gerenciar timers de sessão de forma mais robusta
 * 
 * Funcionalidades:
 * - Previne travamentos de timer
 * - Sincronização automática de estado
 * - Recuperação de timers após desconexões
 * - Heartbeat para detectar timers zombies
 * 
 * @author REVALIDAFLOW Team
 */

const logger = require('./logger')

class TimerManager {
  constructor() {
    this.activeTimers = new Map() // sessionId -> timerData
    this.timerStats = {
      created: 0,
      completed: 0,
      stopped: 0,
      recovered: 0,
      errors: 0
    }
    this.heartbeatInterval = null
    
    this.startHeartbeat()
  }

  /**
   * Inicia heartbeat para detectar timers zombies
   */
  startHeartbeat() {
    if (this.heartbeatInterval) return
    
    this.heartbeatInterval = setInterval(() => {
      this.checkTimersHealth()
    }, 10000) // Verificar a cada 10 segundos
  }

  /**
   * Para heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  /**
   * Verifica saúde dos timers ativos
   */
  checkTimersHealth() {
    const now = Date.now()
    const staleTimers = []
    
    for (const [sessionId, timerData] of this.activeTimers.entries()) {
      // Se o timer não foi atualizado nos últimos 30 segundos, pode estar zombie
      if (now - timerData.lastUpdate > 30000) {
        logger.warn(`[TIMER] Timer potencialmente zombie detectado`, {
          sessionId,
          lastUpdate: new Date(timerData.lastUpdate),
          timeSinceUpdate: now - timerData.lastUpdate
        })
        staleTimers.push(sessionId)
      }
    }
    
    // Limpar timers zombies
    staleTimers.forEach(sessionId => {
      this.cleanupTimer(sessionId, 'zombie_cleanup')
    })
  }

  /**
   * Cria ou atualiza um timer para uma sessão
   * @param {string} sessionId - ID da sessão
   * @param {Object} options - Opções do timer
   * @returns {Object} Dados do timer
   */
  createOrUpdateTimer(sessionId, options = {}) {
    const {
      durationSeconds,
      onTick,
      onEnd,
      autoStart = true,
      persistent = true
    } = options

    // Se já existe um timer para esta sessão, limpar antes
    if (this.activeTimers.has(sessionId)) {
      this.stopTimer(sessionId, 'replacing')
    }

    const timerData = {
      sessionId,
      durationSeconds,
      remainingSeconds: durationSeconds,
      intervalId: null,
      onTick,
      onEnd,
      createdAt: Date.now(),
      lastUpdate: Date.now(),
      isPaused: !autoStart,
      persistent,
      status: 'created'
    }

    this.activeTimers.set(sessionId, timerData)
    this.timerStats.created++

    logger.info(`[TIMER] Timer criado`, {
      sessionId,
      durationSeconds,
      autoStart,
      persistent
    })

    if (autoStart) {
      this.startTimer(sessionId)
    }

    return timerData
  }

  /**
   * Inicia um timer existente
   * @param {string} sessionId - ID da sessão
   */
  startTimer(sessionId) {
    const timerData = this.activeTimers.get(sessionId)
    if (!timerData) {
      logger.error(`[TIMER] Tentativa de iniciar timer inexistente`, { sessionId })
      return false
    }

    if (timerData.intervalId) {
      // Timer já está rodando
      return true
    }

    timerData.isPaused = false
    timerData.status = 'running'
    timerData.lastUpdate = Date.now()

    timerData.intervalId = setInterval(() => {
      try {
        // Atualizar timestamp
        timerData.lastUpdate = Date.now()

        // Decrementar tempo restante
        timerData.remainingSeconds--

        // Disparar callback onTick
        if (typeof timerData.onTick === 'function') {
          timerData.onTick(timerData.remainingSeconds)
        }

        // Verificar se acabou
        if (timerData.remainingSeconds <= 0) {
          this.completeTimer(sessionId)
        }
      } catch (error) {
        logger.error(`[TIMER] Erro no loop do timer`, {
          sessionId,
          error: error.message
        })
        this.timerStats.errors++
        
        // Tentar recuperar
        this.recoverTimer(sessionId, 'tick_error')
      }
    }, 1000)

    logger.info(`[TIMER] Timer iniciado`, {
      sessionId,
      remainingSeconds: timerData.remainingSeconds
    })

    return true
  }

  /**
   * Pausa um timer
   * @param {string} sessionId - ID da sessão
   * @param {string} reason - Motivo da pausa (opcional)
   */
  pauseTimer(sessionId, reason = 'manual') {
    const timerData = this.activeTimers.get(sessionId)
    if (!timerData || !timerData.intervalId) {
      logger.warn(`[TIMER] Timer não encontrado ou já pausado`, {
        sessionId,
        hasTimer: !!timerData,
        hasInterval: !!timerData?.intervalId,
        reason
      })
      return false
    }

    clearInterval(timerData.intervalId)
    timerData.intervalId = null
    timerData.isPaused = true
    timerData.status = 'paused'
    timerData.lastUpdate = Date.now()

    logger.info(`[TIMER] Timer pausado com sucesso`, {
      sessionId,
      remainingSeconds: timerData.remainingSeconds,
      reason,
      status: timerData.status
    })

    return true
  }

  /**
   * Para um timer
   * @param {string} sessionId - ID da sessão
   * @param {string} reason - Motivo da parada
   */
  stopTimer(sessionId, reason = 'manual') {
    const timerData = this.activeTimers.get(sessionId)
    if (!timerData) {
      return false
    }

    if (timerData.intervalId) {
      clearInterval(timerData.intervalId)
      timerData.intervalId = null
    }

    timerData.status = 'stopped'
    timerData.lastUpdate = Date.now()
    this.timerStats.stopped++

    logger.info(`[TIMER] Timer parado`, {
      sessionId,
      reason,
      remainingSeconds: timerData.remainingSeconds
    })

    return true
  }

  /**
   * Completa um timer (tempo esgotado)
   * @param {string} sessionId - ID da sessão
   */
  completeTimer(sessionId) {
    const timerData = this.activeTimers.get(sessionId)
    if (!timerData) {
      return false
    }

    if (timerData.intervalId) {
      clearInterval(timerData.intervalId)
      timerData.intervalId = null
    }

    timerData.remainingSeconds = 0
    timerData.status = 'completed'
    timerData.lastUpdate = Date.now()
    this.timerStats.completed++

    logger.info(`[TIMER] Timer completado`, { sessionId })

    // Disparar callback onEnd
    if (typeof timerData.onEnd === 'function') {
      try {
        timerData.onEnd()
      } catch (error) {
        logger.error(`[TIMER] Erro no callback onEnd`, {
          sessionId,
          error: error.message
        })
      }
    }

    // Remover timer após um tempo se não for persistente
    if (!timerData.persistent) {
      setTimeout(() => {
        this.cleanupTimer(sessionId, 'auto_cleanup')
      }, 5000)
    }

    return true
  }

  /**
   * Recupera um timer após erro
   * @param {string} sessionId - ID da sessão
   * @param {string} reason - Motivo da recuperação
   */
  recoverTimer(sessionId, reason) {
    const timerData = this.activeTimers.get(sessionId)
    if (!timerData) {
      return false
    }

    logger.info(`[TIMER] Tentando recuperar timer`, {
      sessionId,
      reason,
      remainingSeconds: timerData.remainingSeconds
    })

    try {
      // Limpar intervalo atual se existir
      if (timerData.intervalId) {
        clearInterval(timerData.intervalId)
        timerData.intervalId = null
      }

      // Reiniciar timer se ainda tiver tempo
      if (timerData.remainingSeconds > 0 && !timerData.isPaused) {
        this.startTimer(sessionId)
        this.timerStats.recovered++
        return true
      }
    } catch (error) {
      logger.error(`[TIMER] Falha ao recuperar timer`, {
        sessionId,
        error: error.message
      })
    }

    return false
  }

  /**
   * Sincroniza timer com estado externo
   * @param {string} sessionId - ID da sessão
   * @param {Object} state - Estado externo
   */
  syncTimer(sessionId, state) {
    const timerData = this.activeTimers.get(sessionId)
    if (!timerData) {
      return false
    }

    const { remainingSeconds, isPaused } = state

    // Atualizar tempo restante
    if (typeof remainingSeconds === 'number') {
      timerData.remainingSeconds = Math.max(0, remainingSeconds)
    }

    // Controlar pausa/início
    if (isPaused && timerData.intervalId) {
      this.pauseTimer(sessionId)
    } else if (!isPaused && !timerData.intervalId && timerData.remainingSeconds > 0) {
      this.startTimer(sessionId)
    }

    timerData.lastUpdate = Date.now()

    logger.debug(`[TIMER] Timer sincronizado`, {
      sessionId,
      remainingSeconds: timerData.remainingSeconds,
      isPaused
    })

    return true
  }

  /**
   * Limpa um timer
   * @param {string} sessionId - ID da sessão
   * @param {string} reason - Motivo da limpeza
   */
  cleanupTimer(sessionId, reason = 'cleanup') {
    const timerData = this.activeTimers.get(sessionId)
    if (!timerData) {
      return false
    }

    if (timerData.intervalId) {
      clearInterval(timerData.intervalId)
    }

    this.activeTimers.delete(sessionId)

    logger.debug(`[TIMER] Timer limpo`, {
      sessionId,
      reason
    })

    return true
  }

  /**
   * Obtém dados de um timer
   * @param {string} sessionId - ID da sessão
   * @returns {Object|null} Dados do timer
   */
  getTimer(sessionId) {
    const timerData = this.activeTimers.get(sessionId)
    if (!timerData) {
      return null
    }

    return {
      sessionId: timerData.sessionId,
      remainingSeconds: timerData.remainingSeconds,
      durationSeconds: timerData.durationSeconds,
      isPaused: timerData.isPaused,
      status: timerData.status,
      createdAt: timerData.createdAt,
      lastUpdate: timerData.lastUpdate
    }
  }

  /**
   * Lista todos os timers ativos
   * @returns {Array} Lista de timers
   */
  listTimers() {
    const timers = []
    
    for (const [sessionId, timerData] of this.activeTimers.entries()) {
      timers.push(this.getTimer(sessionId))
    }

    return timers
  }

  /**
   * Obtém estatísticas do TimerManager
   * @returns {Object} Estatísticas
   */
  getStats() {
    return {
      ...this.timerStats,
      activeTimers: this.activeTimers.size
    }
  }

  /**
   * Limpa todos os timers
   */
  cleanup() {
    this.stopHeartbeat()
    
    for (const sessionId of this.activeTimers.keys()) {
      this.cleanupTimer(sessionId, 'shutdown')
    }

    logger.info(`[TIMER] Todos os timers limpos`)
  }
}

// Singleton
let timerManagerInstance = null

function getTimerManager() {
  if (!timerManagerInstance) {
    timerManagerInstance = new TimerManager()
  }
  return timerManagerInstance
}

module.exports = {
  TimerManager,
  getTimerManager
}
