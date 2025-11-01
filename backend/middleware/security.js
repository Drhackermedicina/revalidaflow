/**
 * Middleware de segurança para endpoints sensíveis
 * Adiciona rate limiting, validação de autenticação e proteções
 */

const rateLimit = require('express-rate-limit');
const { logger } = require('../services/logger');

// Rate limiting específico para endpoints de IA
const aiRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 20, // máximo 20 requisições por minuto
  message: {
    error: 'Too many requests',
    message: 'Muitas requisições. Por favor, aguarde um momento.',
    retryAfter: '60s'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit excedido para AI endpoint', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path
    });

    res.status(429).json({
      error: 'Too many requests',
      message: 'Muitas requisições. Por favor, aguarde um momento.',
      retryAfter: '60s'
    });
  }
});

// Rate limiting geral mais restritivo
const strictRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requisições por 15 minutos
  message: {
    error: 'Rate limit exceeded',
    message: 'Muitas requisições. Tente novamente mais tarde.'
  },
  handler: (req, res) => {
    logger.warn('Rate limit geral excedido', {
      ip: req.ip,
      path: req.path
    });

    res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Muitas requisições. Tente novamente mais tarde.'
    });
  }
});

// Middleware para validar autenticação em endpoints sensíveis
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    logger.warn('Tentativa de acesso sem token', {
      ip: req.ip,
      path: req.path,
      userAgent: req.get('User-Agent')
    });

    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Autenticação necessária'
    });
  }

  // Aqui você deve validar o token com sua lógica de autenticação
  // Por exemplo, verificar com Firebase Admin
  try {
    // Lógica de validação do token aqui
    // Por enquanto, vamos apenas verificar se o token parece válido
    if (token.length < 10) {
      throw new Error('Token inválido');
    }

    // Adicionar informações do usuário ao request
    req.user = { uid: 'temp_uid' }; // Substituir com validação real

    next();
  } catch (error) {
    logger.warn('Token inválido', {
      ip: req.ip,
      path: req.path,
      error: error.message
    });

    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Token inválido'
    });
  }
}

// Middleware para logs de segurança
function securityLogger(req, res, next) {
  const startTime = Date.now();

  // Log de requisição para endpoints sensíveis
  if (req.path.includes('/ai') || req.path.includes('/admin')) {
    logger.info('Acesso a endpoint sensível', {
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
  }

  // Intercepta o response para logar o status
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - startTime;

    if (req.path.includes('/ai') || req.path.includes('/admin')) {
      logger.info('Response endpoint sensível', {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip
      });
    }

    originalSend.call(this, data);
  };

  next();
}

// Middleware para remover headers sensíveis
function sanitizeHeaders(req, res, next) {
  // Remover headers sensíveis dos logs
  const originalHeaders = { ...req.headers };

  // Mascara headers sensíveis
  if (originalHeaders.authorization) {
    originalHeaders.authorization = originalHeaders.authorization.substring(0, 20) + '...';
  }

  req.sanitizedHeaders = originalHeaders;
  next();
}

// Middleware para validar origem da requisição
function validateOrigin(req, res, next) {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'https://www.revalidaflow.com.br',
    'https://revalidaflow.com.br',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175'
  ];

  // Em produção, exigir origem permitida
  if (process.env.NODE_ENV === 'production' && !allowedOrigins.includes(origin)) {
    logger.warn('Origem não permitida', {
      origin,
      ip: req.ip,
      path: req.path
    });

    return res.status(403).json({
      error: 'Forbidden',
      message: 'Origem não permitida'
    });
  }

  next();
}

module.exports = {
  aiRateLimit,
  strictRateLimit,
  requireAuth,
  securityLogger,
  sanitizeHeaders,
  validateOrigin
};