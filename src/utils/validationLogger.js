// src/utils/validationLogger.js
import Logger from '@/utils/logger'

class ValidationLogger {
  constructor() {
    this.logger = new Logger('validation')
    this.metrics = {
      raceConditions: {
        detected: 0,
        prevented: 0,
        total: 0
      },
      firestoreErrors: {
        connectionErrors: 0,
        proxyErrors: 0,
        recovered: 0,
        offlineModeActivated: 0,
        total: 0
      },
      googleAuthErrors: {
        popupBlocked: 0,
        crossOriginPolicy: 0,
        fallbackRedirect: 0,
        recovered: 0,
        total: 0
      }
    }

    this.sessionId = this.generateSessionId()
    this.events = []
    this.maxEvents = 1000 // Limite para não sobrecarregar memória

    // Carregar métricas do localStorage se existirem
    this.loadPersistedMetrics()
  }

  generateSessionId() {
    return `validation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Logs para race conditions
  logRaceConditionDetected(operation, details = {}) {
    const event = {
      type: 'race_condition_detected',
      operation,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      details
    }

    this.metrics.raceConditions.detected++
    this.metrics.raceConditions.total++
    this.events.push(event)
    this.trimEvents()

    this.logger.warn(`[RACE_CONDITION] ${operation}: Condição de corrida detectada`, {
      ...details,
      sessionId: this.sessionId,
      totalDetected: this.metrics.raceConditions.detected
    })

    this.persistMetrics()
    this.emitEvent(event)
  }

  logRaceConditionPrevented(operation, details = {}) {
    const event = {
      type: 'race_condition_prevented',
      operation,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      details
    }

    this.metrics.raceConditions.prevented++
    this.metrics.raceConditions.total++
    this.events.push(event)
    this.trimEvents()

    this.logger.info(`[RACE_CONDITION] ${operation}: Condição de corrida prevenida`, {
      ...details,
      sessionId: this.sessionId,
      totalPrevented: this.metrics.raceConditions.prevented
    })

    this.persistMetrics()
    this.emitEvent(event)
  }

  // Logs para erros de Firestore
  logFirestoreConnectionError(operation, error, details = {}) {
    const event = {
      type: 'firestore_connection_error',
      operation,
      error: {
        code: error.code,
        message: error.message,
        name: error.name
      },
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      details
    }

    this.metrics.firestoreErrors.connectionErrors++
    this.metrics.firestoreErrors.total++
    this.events.push(event)
    this.trimEvents()

    this.logger.error(`[FIRESTORE_ERROR] ${operation}: Erro de conexão`, {
      error: event.error,
      ...details,
      sessionId: this.sessionId,
      totalErrors: this.metrics.firestoreErrors.connectionErrors
    })

    this.persistMetrics()
    this.emitEvent(event)
  }

  logFirestoreProxyError(operation, error, details = {}) {
    const event = {
      type: 'firestore_proxy_error',
      operation,
      error: {
        code: error.code,
        message: error.message,
        name: error.name
      },
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      details
    }

    this.metrics.firestoreErrors.proxyErrors++
    this.metrics.firestoreErrors.total++
    this.events.push(event)
    this.trimEvents()

    this.logger.warn(`[FIRESTORE_PROXY] ${operation}: Erro de proxy detectado`, {
      error: event.error,
      ...details,
      sessionId: this.sessionId,
      totalProxyErrors: this.metrics.firestoreErrors.proxyErrors
    })

    this.persistMetrics()
    this.emitEvent(event)
  }

  logFirestoreRecovered(operation, details = {}) {
    const event = {
      type: 'firestore_recovered',
      operation,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      details
    }

    this.metrics.firestoreErrors.recovered++
    this.events.push(event)
    this.trimEvents()

    this.logger.info(`[FIRESTORE_RECOVERY] ${operation}: Conexão recuperada`, {
      ...details,
      sessionId: this.sessionId,
      totalRecovered: this.metrics.firestoreErrors.recovered
    })

    this.persistMetrics()
    this.emitEvent(event)
  }

  logOfflineModeActivated(reason, details = {}) {
    const event = {
      type: 'offline_mode_activated',
      reason,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      details
    }

    this.metrics.firestoreErrors.offlineModeActivated++
    this.events.push(event)
    this.trimEvents()

    this.logger.warn(`[OFFLINE_MODE] Modo offline ativado: ${reason}`, {
      ...details,
      sessionId: this.sessionId,
      totalOfflineActivations: this.metrics.firestoreErrors.offlineModeActivated
    })

    this.persistMetrics()
    this.emitEvent(event)
  }

  // Logs para erros de autenticação Google
  logGoogleAuthPopupBlocked(operation, details = {}) {
    const event = {
      type: 'google_auth_popup_blocked',
      operation,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      details
    }

    this.metrics.googleAuthErrors.popupBlocked++
    this.metrics.googleAuthErrors.total++
    this.events.push(event)
    this.trimEvents()

    this.logger.warn(`[GOOGLE_AUTH] ${operation}: Popup bloqueado`, {
      ...details,
      sessionId: this.sessionId,
      totalPopupBlocked: this.metrics.googleAuthErrors.popupBlocked
    })

    this.persistMetrics()
    this.emitEvent(event)
  }

  logGoogleAuthCrossOriginError(operation, details = {}) {
    const event = {
      type: 'google_auth_cross_origin',
      operation,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      details
    }

    this.metrics.googleAuthErrors.crossOriginPolicy++
    this.metrics.googleAuthErrors.total++
    this.events.push(event)
    this.trimEvents()

    this.logger.warn(`[GOOGLE_AUTH] ${operation}: Erro Cross-Origin-Opener-Policy`, {
      ...details,
      sessionId: this.sessionId,
      totalCrossOriginErrors: this.metrics.googleAuthErrors.crossOriginPolicy
    })

    this.persistMetrics()
    this.emitEvent(event)
  }

  logGoogleAuthFallbackRedirect(operation, details = {}) {
    const event = {
      type: 'google_auth_fallback_redirect',
      operation,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      details
    }

    this.metrics.googleAuthErrors.fallbackRedirect++
    this.events.push(event)
    this.trimEvents()

    this.logger.info(`[GOOGLE_AUTH] ${operation}: Fallback para redirect aplicado`, {
      ...details,
      sessionId: this.sessionId,
      totalFallbackRedirects: this.metrics.googleAuthErrors.fallbackRedirect
    })

    this.persistMetrics()
    this.emitEvent(event)
  }

  logGoogleAuthRecovered(operation, details = {}) {
    const event = {
      type: 'google_auth_recovered',
      operation,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      details
    }

    this.metrics.googleAuthErrors.recovered++
    this.events.push(event)
    this.trimEvents()

    this.logger.info(`[GOOGLE_AUTH] ${operation}: Autenticação recuperada`, {
      ...details,
      sessionId: this.sessionId,
      totalRecovered: this.metrics.googleAuthErrors.recovered
    })

    this.persistMetrics()
    this.emitEvent(event)
  }

  // Utilitários
  trimEvents() {
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents)
    }
  }

  persistMetrics() {
    try {
      const data = {
        metrics: this.metrics,
        sessionId: this.sessionId,
        lastUpdated: new Date().toISOString()
      }
      localStorage.setItem('validationLogger_metrics', JSON.stringify(data))
    } catch (error) {
      this.logger.warn('Erro ao persistir métricas:', error)
    }
  }

  loadPersistedMetrics() {
    try {
      const data = localStorage.getItem('validationLogger_metrics')
      if (data) {
        const parsed = JSON.parse(data)
        // Mesclar métricas persistidas com as atuais
        Object.keys(parsed.metrics).forEach(category => {
          if (this.metrics[category]) {
            Object.keys(parsed.metrics[category]).forEach(metric => {
              if (typeof this.metrics[category][metric] === 'number') {
                this.metrics[category][metric] += parsed.metrics[category][metric]
              }
            })
          }
        })
        this.logger.info('Métricas persistidas carregadas:', parsed.metrics)
      }
    } catch (error) {
      this.logger.warn('Erro ao carregar métricas persistidas:', error)
    }
  }

  emitEvent(event) {
    // Emitir evento customizado para componentes que queiram ouvir
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('validationLogger:event', {
        detail: event
      }))
    }
  }

  // Métodos de consulta
  getMetrics() {
    return { ...this.metrics }
  }

  getEvents(limit = 100) {
    return this.events.slice(-limit)
  }

  getRecentEvents(minutes = 5) {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000)
    return this.events.filter(event =>
      new Date(event.timestamp) > cutoff
    )
  }

  // Reset de métricas (para testes ou debug)
  resetMetrics() {
    this.metrics = {
      raceConditions: { detected: 0, prevented: 0, total: 0 },
      firestoreErrors: { connectionErrors: 0, proxyErrors: 0, recovered: 0, offlineModeActivated: 0, total: 0 },
      googleAuthErrors: { popupBlocked: 0, crossOriginPolicy: 0, fallbackRedirect: 0, recovered: 0, total: 0 }
    }
    this.persistMetrics()
    this.logger.info('Métricas resetadas')
  }

  // Relatório de status
  generateStatusReport() {
    const report = {
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      metrics: this.getMetrics(),
      recentEvents: this.getRecentEvents(10),
      healthStatus: this.calculateHealthStatus()
    }

    this.logger.info('Relatório de status de validação gerado:', report)
    return report
  }

  calculateHealthStatus() {
    const { raceConditions, firestoreErrors, googleAuthErrors } = this.metrics

    // Calcular taxa de sucesso para cada categoria
    const raceSuccessRate = raceConditions.total > 0 ?
      (raceConditions.prevented / raceConditions.total) * 100 : 100

    const firestoreSuccessRate = firestoreErrors.total > 0 ?
      (firestoreErrors.recovered / firestoreErrors.total) * 100 : 100

    const googleSuccessRate = googleAuthErrors.total > 0 ?
      (googleAuthErrors.recovered / googleAuthErrors.total) * 100 : 100

    // Status geral baseado nas taxas
    let overallStatus = 'healthy'
    if (raceSuccessRate < 80 || firestoreSuccessRate < 80 || googleSuccessRate < 80) {
      overallStatus = 'warning'
    }
    if (raceSuccessRate < 50 || firestoreSuccessRate < 50 || googleSuccessRate < 50) {
      overallStatus = 'critical'
    }

    return {
      overall: overallStatus,
      raceConditions: {
        successRate: raceSuccessRate,
        status: raceSuccessRate >= 80 ? 'healthy' : raceSuccessRate >= 50 ? 'warning' : 'critical'
      },
      firestore: {
        successRate: firestoreSuccessRate,
        status: firestoreSuccessRate >= 80 ? 'healthy' : firestoreSuccessRate >= 50 ? 'warning' : 'critical'
      },
      googleAuth: {
        successRate: googleSuccessRate,
        status: googleSuccessRate >= 80 ? 'healthy' : googleSuccessRate >= 50 ? 'warning' : 'critical'
      }
    }
  }
}

// Instância singleton
const validationLogger = new ValidationLogger()

// Expor para debug global em desenvolvimento
if (import.meta.env.DEV && typeof window !== 'undefined') {
  window.validationLogger = validationLogger
}

export default validationLogger