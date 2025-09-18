// Sistema de logging estruturado para debug de autenticação
class AuthLogger {
  constructor() {
    this.logs = []
    this.maxLogs = 100
    this.sessionId = this.generateSessionId()
  }

  generateSessionId() {
    return `auth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  log(level, message, data = {}) {
    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      level,
      message,
      data,
      sessionId: this.sessionId,
      url: window.location.href,
      userAgent: navigator.userAgent.substring(0, 100)
    }

    this.logs.push(logEntry)

    // Manter apenas os últimos logs
    if (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }

    // Log no console com formatação
    const prefix = `[AUTH-${level.toUpperCase()}]`
    const logMessage = `${prefix} ${message}`

    switch (level) {
      case 'error':
        console.error(logMessage, data)
        break
      case 'warn':
        console.warn(logMessage, data)
        break
      case 'info':
        console.info(logMessage, data)
        break
      case 'debug':
        if (import.meta.env.DEV) {
          console.log(logMessage, data)
        }
        break
      default:
        console.log(logMessage, data)
    }

    // Persistir logs críticos no localStorage
    if (level === 'error' || level === 'warn') {
      this.persistLog(logEntry)
    }
  }

  persistLog(logEntry) {
    try {
      const persistedLogs = JSON.parse(localStorage.getItem('auth_debug_logs') || '[]')
      persistedLogs.push(logEntry)

      // Manter apenas os últimos 50 logs persistidos
      if (persistedLogs.length > 50) {
        persistedLogs.splice(0, persistedLogs.length - 50)
      }

      localStorage.setItem('auth_debug_logs', JSON.stringify(persistedLogs))
    } catch (error) {
      console.warn('Falha ao persistir log:', error)
    }
  }

  error(message, data) {
    this.log('error', message, data)
  }

  warn(message, data) {
    this.log('warn', message, data)
  }

  info(message, data) {
    this.log('info', message, data)
  }

  debug(message, data) {
    this.log('debug', message, data)
  }

  // Logs específicos para fluxo de autenticação
  loginStart(method) {
    this.info('Login iniciado', { method, timestamp: Date.now() })
  }

  loginSuccess(user) {
    this.info('Login bem-sucedido', {
      uid: user?.uid,
      email: user?.email,
      displayName: user?.displayName,
      timestamp: Date.now()
    })
  }

  loginError(error, context) {
    this.error('Erro no login', {
      error: error.message,
      code: error.code,
      context,
      timestamp: Date.now()
    })
  }

  redirectStart(provider) {
    this.info('Redirecionamento iniciado', { provider, timestamp: Date.now() })
  }

  redirectResult(result) {
    this.info('Resultado do redirecionamento', {
      hasResult: !!result,
      hasUser: !!result?.user,
      userUid: result?.user?.uid,
      timestamp: Date.now()
    })
  }

  authStateChange(user, previousState) {
    this.info('Mudança de estado de autenticação', {
      hasUser: !!user,
      uid: user?.uid,
      email: user?.email,
      previousState,
      timestamp: Date.now()
    })
  }

  routeGuard(to, from, decision) {
    this.debug('Router guard executado', {
      to: to.path,
      from: from.path,
      decision,
      requiresAuth: to.meta?.requiresAuth,
      timestamp: Date.now()
    })
  }

  // Obter relatório de debug
  getDebugReport() {
    const persistedLogs = JSON.parse(localStorage.getItem('auth_debug_logs') || '[]')

    return {
      sessionId: this.sessionId,
      currentUrl: window.location.href,
      sessionLogs: this.logs,
      persistedLogs,
      summary: this.generateSummary()
    }
  }

  generateSummary() {
    const errorCount = this.logs.filter(log => log.level === 'error').length
    const warnCount = this.logs.filter(log => log.level === 'warn').length
    const loginAttempts = this.logs.filter(log => log.message.includes('Login iniciado')).length
    const redirects = this.logs.filter(log => log.message.includes('Redirecionamento')).length

    return {
      totalLogs: this.logs.length,
      errors: errorCount,
      warnings: warnCount,
      loginAttempts,
      redirects,
      hasErrors: errorCount > 0,
      hasWarnings: warnCount > 0
    }
  }

  // Limpar logs
  clearLogs() {
    this.logs = []
    localStorage.removeItem('auth_debug_logs')
    this.info('Logs de debug limpos')
  }

  // Exportar logs para download
  exportLogs() {
    const report = this.getDebugReport()
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = `auth-debug-${this.sessionId}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    this.info('Logs exportados para download')
  }
}

// Instância singleton
export const authLogger = new AuthLogger()

// Expor globalmente em desenvolvimento
if (import.meta.env.DEV) {
  window.authLogger = authLogger
}

export default authLogger