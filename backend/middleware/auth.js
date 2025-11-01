/**
 * Firebase Authentication Middleware
 *
 * Verifica tokens Firebase ID e autentica usuários para todas as requisições /api/*
 * Busca roles e permissões do Firestore para controle de acesso
 *
 * Segurança P0 - Task: P0-B01
 * Created: 2025-10-14
 */

const admin = require('firebase-admin');

/**
 * Permissões padrão por tipo de role
 */
const DEFAULT_PERMISSIONS = {
  admin: {
    canDeleteMessages: true,
    canManageUsers: true,
    canEditStations: true,
    canViewAnalytics: true,
    canManageRoles: true,
    canAccessAdminPanel: true
  },
  moderator: {
    canDeleteMessages: true,
    canManageUsers: false,
    canEditStations: true,
    canViewAnalytics: true,
    canManageRoles: false,
    canAccessAdminPanel: false
  },
  user: {
    canDeleteMessages: false,
    canManageUsers: false,
    canEditStations: false,
    canViewAnalytics: false,
    canManageRoles: false,
    canAccessAdminPanel: false
  }
};

/**
 * Retorna permissões padrão baseado no role
 * @param {string} role - admin, moderator ou user
 * @returns {Object} Objeto de permissões
 */
function getDefaultPermissions(role) {
  return DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS.user;
}

/**
 * Decodifica payload de um token Firebase em modo mock.
 * @param {string} token
 * @returns {Record<string, any> | null}
 */
function decodeTokenPayload(token) {
  try {
    const segments = token.split('.');
    if (segments.length < 2) {
      return null;
    }

    const payloadSegment = segments[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const padding = payloadSegment.length % 4;
    const payloadBase64 = padding
      ? payloadSegment.padEnd(payloadSegment.length + (4 - padding), '=')
      : payloadSegment;

    const decoded = Buffer.from(payloadBase64, 'base64').toString('utf8');
    return JSON.parse(decoded);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[AUTH MOCK] Failed to decode token payload:', error.message);
    }
    return null;
  }
}

/**
 * Cria objeto de usuario mockado quando Firebase Admin nao esta inicializado.
 * @param {string} token
 * @param {Request} req
 * @returns {Object}
 */
function buildMockUserFromToken(token, req) {
  const payload = token ? decodeTokenPayload(token) : null;
  const headerRole = req.headers['x-mock-role'];
  const headerEmail = req.headers['x-mock-email'];
  const fallbackRole = headerRole || process.env.MOCK_DEFAULT_ROLE || 'user';

  const roleClaim =
    (payload && (
      payload.role ||
      payload.customClaims?.role ||
      payload.claims?.role ||
      payload.firebase?.claims?.role
    )) || fallbackRole;

  const role = String(roleClaim || 'user');
  const email = headerEmail || payload?.email || `mock-${role}@dev.local`;
  const uid = payload?.user_id || payload?.uid || payload?.sub || `mock-${role}`;

  return {
    uid,
    email,
    name: payload?.name || 'Mock User',
    surname: payload?.family_name || null,
    role,
    permissions: getDefaultPermissions(role),
    emailVerified: payload?.email_verified ?? true,
    authTime: payload?.auth_time || Math.floor(Date.now() / 1000),
    iat: payload?.iat || Math.floor(Date.now() / 1000),
    exp: payload?.exp || Math.floor(Date.now() / 1000) + 3600,
    mock: true
  };
}

/**
 * Middleware de autenticação Firebase
 * Verifica token ID e anexa informações do usuário à requisição
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 */
async function verifyAuth(req, res, next) {
  try {
    // Permitir requisições OPTIONS (CORS preflight) sem autenticação
    if (req.method === 'OPTIONS') {
      next();
      return;
    }

    // Extrair token do header Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'No Authorization header provided',
        code: 'AUTH_NO_TOKEN'
      });
    }

    // Verificar formato "Bearer <token>"
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Invalid authorization format',
        message: 'Authorization header must use Bearer scheme',
        code: 'AUTH_INVALID_FORMAT'
      });
    }

    const token = authHeader.replace('Bearer ', '').trim();
    const isMockMode = Boolean(global && global.firebaseMockMode);

    if (!token) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Token is empty',
        code: 'AUTH_EMPTY_TOKEN'
      });
    }

    // Verificar se Firebase está inicializado
    if (!admin.apps.length) {
      if (isMockMode) {
        const mockUser = buildMockUserFromToken(token, req);

        if (process.env.NODE_ENV !== 'production') {
          console.warn(`[AUTH MOCK] Firebase Admin nao inicializado - usando modo mock para ${mockUser.email} (${mockUser.role})`);
        }

        req.user = mockUser;
        return next();
      }

      console.error('[AUTH MIDDLEWARE] Firebase Admin SDK not initialized');
      return res.status(503).json({
        error: 'Service temporarily unavailable',
        message: 'Authentication service is not available',
        code: 'AUTH_SERVICE_UNAVAILABLE'
      });
    }

    // Verificar token com Firebase Admin SDK
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
    } catch (tokenError) {
      // Log apenas em desenvolvimento (evitar custos em produção)
      if (process.env.NODE_ENV !== 'production') {
        console.error('[AUTH] Token verification failed:', tokenError.message);
      }

      // Erros específicos de token
      if (tokenError.code === 'auth/id-token-expired') {
        return res.status(401).json({
          error: 'Token expired',
          message: 'Your session has expired. Please sign in again',
          code: 'AUTH_TOKEN_EXPIRED'
        });
      }

      if (tokenError.code === 'auth/id-token-revoked') {
        return res.status(401).json({
          error: 'Token revoked',
          message: 'Your session has been revoked. Please sign in again',
          code: 'AUTH_TOKEN_REVOKED'
        });
      }

      if (tokenError.code === 'auth/argument-error') {
        return res.status(401).json({
          error: 'Invalid token',
          message: 'The provided token is malformed',
          code: 'AUTH_TOKEN_MALFORMED'
        });
      }

      // Erro genérico de token inválido
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Token verification failed',
        code: 'AUTH_TOKEN_INVALID'
      });
    }

    // Buscar documento do usuário no Firestore para obter role e permissões
    let userDoc;
    let userData = null;

    try {
      userDoc = await admin.firestore()
        .collection('usuarios')
        .doc(decodedToken.uid)
        .get();

      if (userDoc.exists) {
        userData = userDoc.data();
      }
    } catch (firestoreError) {
      // Log apenas em desenvolvimento
      if (process.env.NODE_ENV !== 'production') {
        console.error('[AUTH] Firestore fetch error:', firestoreError.message);
      }

      // Se Firestore falhar, continua com role 'user' padrão
      // Melhor do que bloquear completamente o acesso
      console.warn(`[AUTH] Could not fetch user data for ${decodedToken.uid}, using default permissions`);
    }

    // Extrair role e permissões do documento do usuário
    const role = userData?.role || 'user';
    const permissions = userData?.permissions || getDefaultPermissions(role);

    // Anexar informações do usuário autenticado ao objeto request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || userData?.email || null,
      name: userData?.nome || null,
      surname: userData?.sobrenome || null,
      role: role,
      permissions: permissions,
      emailVerified: decodedToken.email_verified || false,
      authTime: decodedToken.auth_time,
      iat: decodedToken.iat,
      exp: decodedToken.exp
    };

    // Log de autenticação bem-sucedida apenas em desenvolvimento
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[AUTH] ✅ User authenticated: ${req.user.email} (${req.user.role})`);
    }

    next();

  } catch (error) {
    // Erro inesperado - log sempre (mesmo em produção, pois é crítico)
    console.error('[AUTH MIDDLEWARE] Unexpected error:', error);

    return res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred during authentication',
      code: 'AUTH_INTERNAL_ERROR'
    });
  }
}

/**
 * Middleware opcional de autenticação
 * Tenta autenticar, mas não bloqueia se falhar
 * Útil para endpoints públicos que têm comportamento diferente para usuários autenticados
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    // Se não há token, continua sem autenticação
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.replace('Bearer ', '').trim();

    if (!token) {
      req.user = null;
      return next();
    }

    // Tenta verificar token
    if (!admin.apps.length) {
      req.user = null;
      return next();
    }

    try {
      const decodedToken = await admin.auth().verifyIdToken(token);

      // Buscar dados do usuário
      const userDoc = await admin.firestore()
        .collection('usuarios')
        .doc(decodedToken.uid)
        .get();

      const userData = userDoc.exists ? userDoc.data() : null;
      const role = userData?.role || 'user';
      const permissions = userData?.permissions || getDefaultPermissions(role);

      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email || userData?.email || null,
        name: userData?.nome || null,
        surname: userData?.sobrenome || null,
        role: role,
        permissions: permissions,
        emailVerified: decodedToken.email_verified || false
      };

    } catch (tokenError) {
      // Token inválido, mas não bloqueia a requisição
      req.user = null;
    }

    next();

  } catch (error) {
    // Em caso de erro, continua sem autenticação
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[OPTIONAL AUTH] Error:', error.message);
    }
    req.user = null;
    next();
  }
}

/**
 * Middleware para verificar se usuário está autenticado
 * Uso: app.use(requireAuth) após verifyAuth
 */
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'You must be logged in to access this endpoint',
      code: 'AUTH_REQUIRED'
    });
  }
  next();
}

module.exports = {
  verifyAuth,
  optionalAuth,
  requireAuth,
  getDefaultPermissions
};
