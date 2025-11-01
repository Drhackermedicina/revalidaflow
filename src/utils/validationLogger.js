import Logger from '@/utils/logger'

const METRICS_STORAGE_KEY = 'validationLogger_metrics'

function createInitialMetrics() {
  return {
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
}

function formatPercentage(value) {
  return Number.isFinite(value) ? Number(value.toFixed(2)) : 0
}

function calculateRate(success, total) {
  if (!total || total <= 0) {
    return 100
  }

  return (success / total) * 100
}

class ValidationLogger {
  constructor() {
    this.logger = new Logger('validation')
    this.metrics = createInitialMetrics()
    this.sessionId = this.generateSessionId()
    this.events = []
    this.maxEvents = 1000
    this.listenerMap = new Map()

    this.loadPersistedMetrics()
  }

  generateSessionId() {
    return `validation_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
  }

  addEventListener(eventName, callback) {
    if (typeof callback !== 'function') {
      return () => {}
    }

    if (!this.listenerMap.has(eventName)) {
      this.listenerMap.set(eventName, new Set())
    }

    this.listenerMap.get(eventName).add(callback)
    return callback
  }

  removeEventListener(eventName, callback) {
    const listeners = this.listenerMap.get(eventName)
    if (!listeners) {
      return
    }

    listeners.delete(callback)
    if (listeners.size === 0) {
      this.listenerMap.delete(eventName)
    }
  }

  notifyListeners(eventName, payload) {
    const listeners = this.listenerMap.get(eventName)
    if (!listeners) {
      return
    }

    listeners.forEach(listener => {
      try {
        listener(payload)
      } catch (error) {
        this.logger.warn('[ValidationLogger] Listener error capturado', {
          eventName,
          error
        })
      }
    })
  }

  createListenerPayload(type, source, data, timestamp) {
    return {
      type,
      source,
      data: data || {},
      timestamp: timestamp || new Date().toISOString()
    }
  }

  recordEvent(internalEvent, listenerType, listenerSource, listenerData = {}) {
    this.events.push(internalEvent)
    this.trimEvents()
    this.emitEvent(internalEvent)

    if (listenerType) {
      const payload = this.createListenerPayload(
        listenerType,
        listenerSource,
        listenerData,
        internalEvent.timestamp
      )
      this.notifyListeners(listenerType, payload)
    }
  }

  logRaceConditionDetected(operation, details = {}) {
    const timestamp = new Date().toISOString()
    const internalEvent = {
      type: 'race_condition_detected',
      operation,
      timestamp,
      sessionId: this.sessionId,
      details
    }

    this.metrics.raceConditions.detected += 1
    this.metrics.raceConditions.total += 1

    this.recordEvent(internalEvent, 'raceConditionDetected', operation, details)

    this.logger.warn(`[RACE_CONDITION] ${operation}: Condicao de corrida detectada`, {
      ...details,
      sessionId: this.sessionId,
      totalDetected: this.metrics.raceConditions.detected
    })

    this.persistMetrics()
  }

  logRaceConditionPrevented(operation, details = {}) {
    const timestamp = new Date().toISOString()
    const internalEvent = {
      type: 'race_condition_prevented',
      operation,
      timestamp,
      sessionId: this.sessionId,
      details
    }

    this.metrics.raceConditions.prevented += 1
    this.metrics.raceConditions.total += 1

    this.recordEvent(internalEvent, 'raceConditionPrevented', operation, details)

    this.logger.info(`[RACE_CONDITION] ${operation}: Condicao de corrida prevenida`, {
      ...details,
      sessionId: this.sessionId,
      totalPrevented: this.metrics.raceConditions.prevented
    })

    this.persistMetrics()
  }

  logFirestoreConnectionError(operation, error = {}, details = {}) {
    const timestamp = new Date().toISOString()
    const errorInfo = {
      code: error?.code || details.errorCode || 'unknown',
      message: error?.message || details.errorMessage || 'Erro Firestore',
      name: error?.name || 'FirestoreError'
    }

    const internalEvent = {
      type: 'firestore_connection_error',
      operation,
      error: errorInfo,
      timestamp,
      sessionId: this.sessionId,
      details
    }

    this.metrics.firestoreErrors.connectionErrors += 1
    this.metrics.firestoreErrors.total += 1

    this.recordEvent(
      internalEvent,
      'firestoreError',
      operation,
      {
        ...details,
        errorCode: errorInfo.code,
        errorMessage: errorInfo.message
      }
    )

    this.logger.error(`[FIRESTORE_ERROR] ${operation}: Erro de conexao`, {
      error: errorInfo,
      ...details,
      sessionId: this.sessionId,
      totalErrors: this.metrics.firestoreErrors.connectionErrors
    })

    this.persistMetrics()
  }

  logFirestoreProxyError(operation, error = {}, details = {}) {
    const timestamp = new Date().toISOString()
    const errorInfo = {
      code: error?.code || details.errorCode || 'unknown',
      message: error?.message || details.errorMessage || 'Erro Proxy Firestore',
      name: error?.name || 'FirestoreProxyError'
    }

    const internalEvent = {
      type: 'firestore_proxy_error',
      operation,
      error: errorInfo,
      timestamp,
      sessionId: this.sessionId,
      details
    }

    this.metrics.firestoreErrors.proxyErrors += 1
    this.metrics.firestoreErrors.total += 1

    this.recordEvent(
      internalEvent,
      'firestoreError',
      operation,
      {
        ...details,
        errorCode: errorInfo.code,
        errorMessage: errorInfo.message
      }
    )

    this.logger.warn(`[FIRESTORE_PROXY] ${operation}: Erro de proxy detectado`, {
      error: errorInfo,
      ...details,
      sessionId: this.sessionId,
      totalProxyErrors: this.metrics.firestoreErrors.proxyErrors
    })

    this.persistMetrics()
  }

  logFirestoreRecovered(operation, details = {}) {
    const timestamp = new Date().toISOString()
    const internalEvent = {
      type: 'firestore_recovered',
      operation,
      timestamp,
      sessionId: this.sessionId,
      details
    }

    this.metrics.firestoreErrors.recovered += 1

    this.recordEvent(internalEvent, 'firestoreRecovered', operation, details)

    this.logger.info(`[FIRESTORE_RECOVERY] ${operation}: Conexao recuperada`, {
      ...details,
      sessionId: this.sessionId,
      totalRecovered: this.metrics.firestoreErrors.recovered
    })

    this.persistMetrics()
  }

  logOfflineModeActivated(reason, details = {}) {
    const timestamp = new Date().toISOString()
    const internalEvent = {
      type: 'offline_mode_activated',
      reason,
      timestamp,
      sessionId: this.sessionId,
      details
    }

    this.metrics.firestoreErrors.offlineModeActivated += 1

    this.recordEvent(internalEvent, 'firestoreOfflineMode', reason, details)

    this.logger.warn(`[OFFLINE_MODE] Modo offline ativado: ${reason}`, {
      ...details,
      sessionId: this.sessionId,
      totalOfflineActivations: this.metrics.firestoreErrors.offlineModeActivated
    })

    this.persistMetrics()
  }

  logGoogleAuthPopupBlocked(operation, details = {}) {
    const timestamp = new Date().toISOString()
    const internalEvent = {
      type: 'google_auth_popup_blocked',
      operation,
      timestamp,
      sessionId: this.sessionId,
      details
    }

    this.metrics.googleAuthErrors.popupBlocked += 1
    this.metrics.googleAuthErrors.total += 1

    this.recordEvent(internalEvent, 'googleAuthError', operation, details)

    this.logger.warn(`[GOOGLE_AUTH] ${operation}: Popup bloqueado`, {
      ...details,
      sessionId: this.sessionId,
      totalPopupBlocked: this.metrics.googleAuthErrors.popupBlocked
    })

    this.persistMetrics()
  }

  logGoogleAuthCrossOriginError(operation, details = {}) {
    const timestamp = new Date().toISOString()
    const internalEvent = {
      type: 'google_auth_cross_origin',
      operation,
      timestamp,
      sessionId: this.sessionId,
      details
    }

    this.metrics.googleAuthErrors.crossOriginPolicy += 1
    this.metrics.googleAuthErrors.total += 1

    this.recordEvent(internalEvent, 'googleAuthError', operation, details)

    this.logger.warn(`[GOOGLE_AUTH] ${operation}: Erro Cross-Origin-Opener-Policy`, {
      ...details,
      sessionId: this.sessionId,
      totalCrossOriginErrors: this.metrics.googleAuthErrors.crossOriginPolicy
    })

    this.persistMetrics()
  }

  logGoogleAuthFallbackRedirect(operation, details = {}) {
    const timestamp = new Date().toISOString()
    const internalEvent = {
      type: 'google_auth_fallback_redirect',
      operation,
      timestamp,
      sessionId: this.sessionId,
      details
    }

    this.metrics.googleAuthErrors.fallbackRedirect += 1

    this.recordEvent(internalEvent, 'googleAuthFallback', operation, details)

    this.logger.info(`[GOOGLE_AUTH] ${operation}: Fallback para redirect aplicado`, {
      ...details,
      sessionId: this.sessionId,
      totalFallbackRedirects: this.metrics.googleAuthErrors.fallbackRedirect
    })

    this.persistMetrics()
  }

  logGoogleAuthRecovered(operation, details = {}) {
    const timestamp = new Date().toISOString()
    const internalEvent = {
      type: 'google_auth_recovered',
      operation,
      timestamp,
      sessionId: this.sessionId,
      details
    }

    this.metrics.googleAuthErrors.recovered += 1

    this.recordEvent(internalEvent, 'googleAuthRecovered', operation, details)

    this.logger.info(`[GOOGLE_AUTH] ${operation}: Autenticacao recuperada`, {
      ...details,
      sessionId: this.sessionId,
      totalRecovered: this.metrics.googleAuthErrors.recovered
    })

    this.persistMetrics()
  }

  logFirestoreError(operation, details = {}) {
    const errorInfo = {
      code: details.errorCode,
      message: details.errorMessage,
      name: details.errorName || 'FirestoreError'
    }

    this.logFirestoreConnectionError(operation, errorInfo, details)
  }

  logGoogleAuthError(operation, details = {}) {
    this.logGoogleAuthPopupBlocked(operation, details)
  }

  logGoogleAuthFallback(operation, details = {}) {
    this.logGoogleAuthFallbackRedirect(operation, details)
  }

  trimEvents() {
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents)
    }
  }

  persistMetrics() {
    if (typeof localStorage === 'undefined') {
      return
    }

    try {
      const data = {
        metrics: this.metrics,
        sessionId: this.sessionId,
        lastUpdated: new Date().toISOString()
      }

      localStorage.setItem(METRICS_STORAGE_KEY, JSON.stringify(data))
    } catch (error) {
      this.logger.warn('Erro ao persistir metricas:', error)
    }
  }

  applyMetrics(source, { merge = true } = {}) {
    if (!source || typeof source !== 'object') {
      return
    }

    if (!merge) {
      this.metrics = createInitialMetrics()
    }

    Object.keys(source).forEach(category => {
      const sourceCategory = source[category]
      if (typeof sourceCategory !== 'object' || sourceCategory === null) {
        return
      }

      if (!this.metrics[category]) {
        this.metrics[category] = merge ? JSON.parse(JSON.stringify(sourceCategory)) : { ...sourceCategory }
        return
      }

      Object.keys(sourceCategory).forEach(metricKey => {
        const value = sourceCategory[metricKey]
        if (typeof value === 'number') {
          this.metrics[category][metricKey] = merge
            ? (this.metrics[category][metricKey] || 0) + value
            : value
        } else if (value && typeof value === 'object') {
          this.metrics[category][metricKey] = merge
            ? { ...(this.metrics[category][metricKey] || {}), ...value }
            : { ...value }
        } else {
          this.metrics[category][metricKey] = value
        }
      })
    })
  }

  loadPersistedMetrics(options = {}) {
    if (typeof localStorage === 'undefined') {
      return
    }

    const { merge = true } = options

    try {
      const rawData = localStorage.getItem(METRICS_STORAGE_KEY)
      if (!rawData) {
        return
      }

      const parsed = JSON.parse(rawData)
      if (parsed?.metrics) {
        this.applyMetrics(parsed.metrics, { merge })
      }
    } catch (error) {
      this.logger.warn('Erro ao carregar metricas persistidas:', error)
    }
  }

  emitEvent(event) {
    if (typeof window === 'undefined') {
      return
    }

    try {
      window.dispatchEvent(new CustomEvent('validationLogger:event', {
        detail: event
      }))
    } catch (error) {
      this.logger.warn('Erro ao emitir evento de validacao:', error)
    }
  }

  getMetrics() {
    const race = this.metrics.raceConditions
    const firestore = this.metrics.firestoreErrors
    const google = this.metrics.googleAuthErrors

    const raceTotal = race.detected + race.prevented
    const firestoreBase = firestore.connectionErrors + firestore.proxyErrors + firestore.recovered
    const googleErrorCount = google.popupBlocked + google.crossOriginPolicy
    const googleBase = googleErrorCount + google.recovered

    const raceSuccessRate = formatPercentage(calculateRate(race.prevented, raceTotal))
    const firestoreSuccessRate = formatPercentage(calculateRate(firestore.recovered, firestoreBase))
    const googleSuccessRate = formatPercentage(calculateRate(google.recovered, googleBase))

    return {
      raceConditions: {
        detected: race.detected,
        prevented: race.prevented,
        total: raceTotal,
        successRate: raceSuccessRate
      },
      firestoreErrors: { ...firestore },
      firestore: {
        errors: firestore.connectionErrors + firestore.proxyErrors,
        recovered: firestore.recovered,
        successRate: firestoreSuccessRate
      },
      googleAuthErrors: { ...google },
      googleAuth: {
        errors: googleErrorCount,
        recovered: google.recovered,
        fallbacks: google.fallbackRedirect,
        successRate: googleSuccessRate
      }
    }
  }

  getEvents(limit = 100) {
    return this.events.slice(-limit)
  }

  getRecentEvents(minutes = 5) {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000)
    return this.events.filter(event => new Date(event.timestamp) > cutoff)
  }

  resetMetrics() {
    this.metrics = createInitialMetrics()
    this.persistMetrics()
    this.logger.info('Metricas resetadas')
  }

  reset() {
    this.metrics = createInitialMetrics()
    this.events = []
    this.listenerMap.clear()
    this.sessionId = this.generateSessionId()

    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(METRICS_STORAGE_KEY)
      } catch (error) {
        this.logger.warn('Erro ao limpar metricas persistidas:', error)
      }
    }
  }

  saveToStorage() {
    this.persistMetrics()
  }

  loadFromStorage() {
    this.loadPersistedMetrics({ merge: false })
  }

  calculateCategoryStatus(rate) {
    if (rate >= 80) {
      return 'healthy'
    }

    if (rate >= 50) {
      return 'warning'
    }

    return 'critical'
  }

  combineOverallStatus(statuses) {
    if (statuses.includes('critical')) {
      return 'critical'
    }

    if (statuses.includes('warning')) {
      return 'warning'
    }

    return 'healthy'
  }

  calculateHealthStatus() {
    const metrics = this.getMetrics()

    const raceStatus = this.calculateCategoryStatus(metrics.raceConditions.successRate)
    const firestoreStatus = this.calculateCategoryStatus(metrics.firestore.successRate)
    const googleStatus = this.calculateCategoryStatus(metrics.googleAuth.successRate)

    const overall = this.combineOverallStatus([raceStatus, firestoreStatus, googleStatus])

    return {
      overall,
      raceConditions: {
        successRate: metrics.raceConditions.successRate,
        status: raceStatus
      },
      firestore: {
        successRate: metrics.firestore.successRate,
        status: firestoreStatus
      },
      googleAuth: {
        successRate: metrics.googleAuth.successRate,
        status: googleStatus
      }
    }
  }

  getHealthStatus() {
    const health = this.calculateHealthStatus()

    return {
      overall: health.overall,
      raceConditions: health.raceConditions.status,
      firestore: health.firestore.status,
      googleAuth: health.googleAuth.status
    }
  }

  generateStatusReport() {
    const report = {
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      metrics: this.getMetrics(),
      recentEvents: this.getRecentEvents(10),
      healthStatus: this.calculateHealthStatus()
    }

    this.logger.info('Relatorio de status de validacao gerado:', report)
    return report
  }
}

const validationLogger = new ValidationLogger()

if (import.meta.env.DEV && typeof window !== 'undefined') {
  window.validationLogger = validationLogger
}

export default validationLogger
