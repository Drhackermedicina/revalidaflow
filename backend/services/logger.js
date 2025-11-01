const util = require('util')

const LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
}

const isProduction = process.env.NODE_ENV === 'production'
const defaultLevel = isProduction ? 'info' : 'debug'

function resolveLevel(level) {
  const normalized = String(level || '').toLowerCase()
  return LEVELS.hasOwnProperty(normalized) ? normalized : defaultLevel
}

const configuredLevel = resolveLevel(process.env.LOG_LEVEL)
const threshold = LEVELS[configuredLevel]
const timestampsEnabled = process.env.LOG_TIMESTAMPS !== 'false'

function shouldLog(level) {
  return LEVELS[level] <= threshold
}

function formatArg(arg) {
  if (arg instanceof Error) {
    return arg.stack || arg.message
  }

  if (typeof arg === 'object') {
    return util.inspect(arg, { depth: 4, colors: false, compact: true })
  }

  return String(arg)
}

function emit(level, prefix, args) {
  if (!shouldLog(level)) {
    return
  }

  const message = args.map(formatArg).join(' ')
  const timestamp = timestampsEnabled ? `${new Date().toISOString()} ` : ''
  const line = `${timestamp}${prefix}${message}`.trim()

  switch (level) {
    case 'error':
      console.error(line)
      break
    case 'warn':
      console.warn(line)
      break
    case 'debug':
      if (typeof console.debug === 'function') {
        console.debug(line)
      } else {
        console.log(line)
      }
      break
    default:
      console.log(line)
  }
}

function buildLogger(namespaceParts = [], baseParts) {
  const base = Array.isArray(baseParts)
    ? baseParts
    : [process.env.LOG_NAMESPACE || 'backend']

  const prefixParts = [...base, ...namespaceParts.filter(Boolean)]
  const prefixString = prefixParts.length ? `[${prefixParts.join(':')}] ` : ''

  const logger = {
    debug: (...args) => emit('debug', prefixString, args),
    info: (...args) => emit('info', prefixString, args),
    warn: (...args) => emit('warn', prefixString, args),
    error: (...args) => emit('error', prefixString, args),
    child: (segment) => buildLogger([...namespaceParts, segment], base),
  }

  return logger
}

module.exports = buildLogger([])
