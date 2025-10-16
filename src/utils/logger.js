/**
 * Sistema de Logging Unificado
 * 
 * Fornece logging consistente com níveis de log configuráveis
 * Em produção, apenas erros são registrados para reduzir custos
 */

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
}

// Configurar nível de log baseado no ambiente
const getCurrentLogLevel = () => {
  // Em produção, apenas erros
  if (import.meta.env?.MODE === 'production') {
    return LOG_LEVELS.ERROR
  }
  
  // Debug habilitado via localStorage ou env
  if (typeof window !== 'undefined') {
    if (localStorage.getItem('DEBUG_MODE') === 'true') {
      return LOG_LEVELS.DEBUG
    }
  }
  
  if (import.meta.env?.VITE_DEBUG === 'true') {
    return LOG_LEVELS.DEBUG
  }
  
  // Desenvolvimento padrão: INFO
  return LOG_LEVELS.INFO
}

class Logger {
  constructor(namespace = 'App') {
    this.namespace = namespace
    this.logLevel = getCurrentLogLevel()
  }
  
  _formatMessage(level, ...args) {
    const timestamp = new Date().toISOString()
    const levelStr = Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === level)
    return [`[${timestamp}] [${levelStr}] [${this.namespace}]`, ...args]
  }
  
  error(...args) {
    if (this.logLevel >= LOG_LEVELS.ERROR) {
      console.error(...this._formatMessage(LOG_LEVELS.ERROR, ...args))
    }
  }
  
  warn(...args) {
    if (this.logLevel >= LOG_LEVELS.WARN) {
      console.warn(...this._formatMessage(LOG_LEVELS.WARN, ...args))
    }
  }
  
  info(...args) {
    if (this.logLevel >= LOG_LEVELS.INFO) {
      console.info(...this._formatMessage(LOG_LEVELS.INFO, ...args))
    }
  }
  
  debug(...args) {
    if (this.logLevel >= LOG_LEVELS.DEBUG) {
      console.log(...this._formatMessage(LOG_LEVELS.DEBUG, ...args))
    }
  }

  // Alias para console.log (compatibilidade)
  log(...args) {
    this.info(...args)
  }

  // Método para tabelas (apenas em desenvolvimento)
  table(data) {
    if (this.logLevel >= LOG_LEVELS.DEBUG) {
      console.table(data)
    }
  }

  // Método para grupos (apenas em desenvolvimento)
  group(label) {
    if (this.logLevel >= LOG_LEVELS.DEBUG) {
      console.group(label)
    }
  }

  groupEnd() {
    if (this.logLevel >= LOG_LEVELS.DEBUG) {
      console.groupEnd()
    }
  }

  // Método para criar um logger com namespace específico
  createChild(childNamespace) {
    return new Logger(`${this.namespace}:${childNamespace}`)
  }
  
  // Atualiza o nível de log dinamicamente
  setLogLevel(level) {
    if (typeof level === 'string') {
      this.logLevel = LOG_LEVELS[level.toUpperCase()] ?? LOG_LEVELS.INFO
    } else {
      this.logLevel = level
    }
  }
}

// Exportar instância padrão e classe
export const logger = new Logger()
export default Logger
