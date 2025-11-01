/**
 * Configuração de Rate Limiting para proteção contra abuso
 * 
 * Implementa diferentes limites por tipo de rota
 */

const rateLimit = require('express-rate-limit');

// Configuração base para rate limiting
const createRateLimiter = (options = {}) => {
  const defaults = {
    standardHeaders: true, // Retorna rate limit info nos headers `RateLimit-*`
    legacyHeaders: false, // Desabilita headers `X-RateLimit-*`
    handler: (req, res) => {
      res.status(429).json({
        error: 'Muitas requisições. Por favor, tente novamente mais tarde.',
        retryAfter: req.rateLimit.resetTime
      });
    }
  };

  return rateLimit({ ...defaults, ...options });
};

// Rate limiter para rotas gerais
const generalLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Limite de 100 requisições por janela
  message: 'Muitas requisições deste IP'
});

// Rate limiter para autenticação (mais restritivo)
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Apenas 5 tentativas de login
  skipSuccessfulRequests: true, // Não conta requisições bem-sucedidas
  message: 'Muitas tentativas de login. Tente novamente em 15 minutos.'
});

// Rate limiter para rotas de AI/Chat (custosas)
const aiLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 10, // 10 requisições por minuto
  message: 'Limite de requisições AI excedido. Aguarde um momento.'
});

// Rate limiter para upload de arquivos
const uploadLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 20, // 20 uploads por hora
  message: 'Limite de uploads excedido. Tente novamente mais tarde.'
});

// Rate limiter para health checks (mais permissivo)
const healthCheckLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 60, // 60 requisições por minuto
  message: 'Health check rate limit excedido'
});

// Rate limiter para Socket.IO handshake
const socketLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 10, // 10 conexões por IP
  message: 'Muitas tentativas de conexão Socket.IO'
});

// Rate limiter baseado em API key (para clientes especiais)
const createApiKeyLimiter = (apiKey) => {
  return createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 1000, // 1000 requisições por hora para API key válida
    keyGenerator: (req) => {
      return req.headers['x-api-key'] || req.ip;
    },
    skip: (req) => {
      // Skip rate limiting se a API key for válida
      return req.headers['x-api-key'] === apiKey;
    }
  });
};

module.exports = {
  generalLimiter,
  authLimiter,
  aiLimiter,
  uploadLimiter,
  healthCheckLimiter,
  socketLimiter,
  createApiKeyLimiter,
  createRateLimiter
};
