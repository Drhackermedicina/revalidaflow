/**
 * Logger utilitário simples para o backend.
 * Usa console.* em desenvolvimento e silencia logs informativos em produção.
 */

const ENV = process.env.NODE_ENV || 'development';
const isProduction = ENV === 'production';

function formatArgs(level, args) {
  const timestamp = new Date().toISOString();
  return [`[${timestamp}] [${level}]`, ...args];
}

module.exports = {
  info: (...args) => {
    if (!isProduction) {
      console.log(...formatArgs('INFO', args));
    }
  },
  warn: (...args) => {
    console.warn(...formatArgs('WARN', args));
  },
  error: (...args) => {
    console.error(...formatArgs('ERROR', args));
  }
};
