/**
 * Admin Authorization Middleware
 *
 * Middleware para verificação de roles de admin e permissões granulares
 * Deve ser usado APÓS o middleware verifyAuth
 *
 * Segurança P0 - Task: P0-F05
 * Created: 2025-10-14
 */

/**
 * Middleware que requer role de admin
 * Bloqueia acesso se usuário não for admin
 *
 * @param {Request} req - Express request object (deve ter req.user do verifyAuth)
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 */
function requireAdmin(req, res, next) {
  // Verifica se usuário está autenticado
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'You must be authenticated to access this endpoint',
      code: 'ADMIN_AUTH_REQUIRED'
    });
  }

  // Verifica se usuário tem role admin
  if (req.user.role !== 'admin') {
    // Log de tentativa de acesso não autorizado (sempre log, mesmo em produção)
    console.warn(`[ADMIN AUTH] ⚠️ Unauthorized access attempt: ${req.user.email} (${req.user.role}) tried to access admin endpoint: ${req.method} ${req.path}`);

    return res.status(403).json({
      error: 'Admin access required',
      message: 'You do not have sufficient permissions to access this resource',
      code: 'ADMIN_FORBIDDEN',
      currentRole: req.user.role
    });
  }

  // Log de acesso admin bem-sucedido apenas em desenvolvimento
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[ADMIN AUTH] ✅ Admin access granted: ${req.user.email} → ${req.method} ${req.path}`);
  }

  next();
}

/**
 * Middleware que requer permissão específica
 * Bloqueia acesso se usuário não tiver a permissão necessária
 *
 * @param {string} permission - Nome da permissão necessária (ex: 'canDeleteMessages')
 * @returns {Function} Middleware function
 *
 * @example
 * // Requer permissão para deletar mensagens
 * app.delete('/api/messages/:id', verifyAuth, requirePermission('canDeleteMessages'), deleteHandler);
 *
 * // Requer permissão para gerenciar usuários
 * app.put('/api/users/:id/role', verifyAuth, requirePermission('canManageRoles'), updateRoleHandler);
 */
function requirePermission(permission) {
  return (req, res, next) => {
    // Verifica se usuário está autenticado
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'You must be authenticated to access this endpoint',
        code: 'PERMISSION_AUTH_REQUIRED'
      });
    }

    // Verifica se permissões existem
    if (!req.user.permissions) {
      return res.status(403).json({
        error: 'Permission denied',
        message: 'No permissions found for your account',
        code: 'PERMISSION_NONE',
        requiredPermission: permission
      });
    }

    // Verifica se usuário tem a permissão específica
    if (!req.user.permissions[permission]) {
      // Log de tentativa de acesso não autorizado
      console.warn(`[PERMISSION] ⚠️ Permission denied: ${req.user.email} (${req.user.role}) lacks '${permission}' for ${req.method} ${req.path}`);

      return res.status(403).json({
        error: 'Permission denied',
        message: `You do not have the required permission: ${permission}`,
        code: 'PERMISSION_FORBIDDEN',
        requiredPermission: permission,
        currentRole: req.user.role
      });
    }

    // Log de permissão concedida apenas em desenvolvimento
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[PERMISSION] ✅ Permission granted: ${req.user.email} has '${permission}' → ${req.method} ${req.path}`);
    }

    next();
  };
}

/**
 * Middleware que requer pelo menos uma das permissões listadas
 * Útil para endpoints que podem ser acessados por diferentes tipos de admin
 *
 * @param {string[]} permissions - Array de permissões (usuário precisa de pelo menos uma)
 * @returns {Function} Middleware function
 *
 * @example
 * // Requer canEditStations OU canManageUsers
 * app.put('/api/stations/:id', verifyAuth, requireAnyPermission(['canEditStations', 'canManageUsers']), updateHandler);
 */
function requireAnyPermission(permissions) {
  return (req, res, next) => {
    // Verifica se usuário está autenticado
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'You must be authenticated to access this endpoint',
        code: 'PERMISSION_AUTH_REQUIRED'
      });
    }

    // Verifica se permissões existem
    if (!req.user.permissions) {
      return res.status(403).json({
        error: 'Permission denied',
        message: 'No permissions found for your account',
        code: 'PERMISSION_NONE',
        requiredPermissions: permissions
      });
    }

    // Verifica se usuário tem pelo menos uma das permissões
    const hasAnyPermission = permissions.some(perm => req.user.permissions[perm] === true);

    if (!hasAnyPermission) {
      console.warn(`[PERMISSION] ⚠️ Insufficient permissions: ${req.user.email} (${req.user.role}) needs one of [${permissions.join(', ')}] for ${req.method} ${req.path}`);

      return res.status(403).json({
        error: 'Permission denied',
        message: `You need at least one of these permissions: ${permissions.join(', ')}`,
        code: 'PERMISSION_INSUFFICIENT',
        requiredPermissions: permissions,
        currentRole: req.user.role
      });
    }

    if (process.env.NODE_ENV !== 'production') {
      const grantedPerms = permissions.filter(perm => req.user.permissions[perm]);
      console.log(`[PERMISSION] ✅ Permission granted: ${req.user.email} has [${grantedPerms.join(', ')}] → ${req.method} ${req.path}`);
    }

    next();
  };
}

/**
 * Middleware que requer todas as permissões listadas
 * Útil para endpoints que necessitam de múltiplas permissões
 *
 * @param {string[]} permissions - Array de permissões (usuário precisa de todas)
 * @returns {Function} Middleware function
 *
 * @example
 * // Requer canManageRoles E canManageUsers
 * app.delete('/api/users/:id', verifyAuth, requireAllPermissions(['canManageUsers', 'canManageRoles']), deleteUserHandler);
 */
function requireAllPermissions(permissions) {
  return (req, res, next) => {
    // Verifica se usuário está autenticado
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'You must be authenticated to access this endpoint',
        code: 'PERMISSION_AUTH_REQUIRED'
      });
    }

    // Verifica se permissões existem
    if (!req.user.permissions) {
      return res.status(403).json({
        error: 'Permission denied',
        message: 'No permissions found for your account',
        code: 'PERMISSION_NONE',
        requiredPermissions: permissions
      });
    }

    // Verifica quais permissões estão faltando
    const missingPermissions = permissions.filter(perm => !req.user.permissions[perm]);

    if (missingPermissions.length > 0) {
      console.warn(`[PERMISSION] ⚠️ Missing permissions: ${req.user.email} (${req.user.role}) lacks [${missingPermissions.join(', ')}] for ${req.method} ${req.path}`);

      return res.status(403).json({
        error: 'Permission denied',
        message: `You are missing required permissions: ${missingPermissions.join(', ')}`,
        code: 'PERMISSION_MISSING',
        requiredPermissions: permissions,
        missingPermissions: missingPermissions,
        currentRole: req.user.role
      });
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[PERMISSION] ✅ All permissions granted: ${req.user.email} has [${permissions.join(', ')}] → ${req.method} ${req.path}`);
    }

    next();
  };
}

/**
 * Middleware que requer moderador OU admin
 * Útil para endpoints de moderação de conteúdo
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 */
function requireModerator(req, res, next) {
  // Verifica se usuário está autenticado
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'You must be authenticated to access this endpoint',
      code: 'MODERATOR_AUTH_REQUIRED'
    });
  }

  // Verifica se usuário é admin ou moderador
  if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
    console.warn(`[MODERATOR AUTH] ⚠️ Unauthorized access: ${req.user.email} (${req.user.role}) tried to access moderator endpoint: ${req.method} ${req.path}`);

    return res.status(403).json({
      error: 'Moderator access required',
      message: 'You need moderator or admin privileges to access this resource',
      code: 'MODERATOR_FORBIDDEN',
      currentRole: req.user.role
    });
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log(`[MODERATOR AUTH] ✅ Moderator access granted: ${req.user.email} (${req.user.role}) → ${req.method} ${req.path}`);
  }

  next();
}

/**
 * Middleware para verificar se usuário pode modificar um recurso específico
 * Bloqueia se não for admin nem o dono do recurso
 *
 * @param {Function} getResourceOwnerId - Função que retorna o UID do dono do recurso
 * @returns {Function} Middleware function
 *
 * @example
 * // Permite admin ou o próprio usuário atualizar perfil
 * app.put('/api/users/:userId/profile',
 *   verifyAuth,
 *   requireOwnershipOrAdmin((req) => req.params.userId),
 *   updateProfileHandler
 * );
 */
function requireOwnershipOrAdmin(getResourceOwnerId) {
  return async (req, res, next) => {
    // Verifica se usuário está autenticado
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'You must be authenticated to access this endpoint',
        code: 'OWNERSHIP_AUTH_REQUIRED'
      });
    }

    // Admin tem acesso total
    if (req.user.role === 'admin') {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[OWNERSHIP] ✅ Admin bypass: ${req.user.email} → ${req.method} ${req.path}`);
      }
      return next();
    }

    // Obter UID do dono do recurso
    let resourceOwnerId;
    try {
      resourceOwnerId = await getResourceOwnerId(req);
    } catch (error) {
      console.error('[OWNERSHIP] Error getting resource owner:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to verify resource ownership',
        code: 'OWNERSHIP_CHECK_ERROR'
      });
    }

    // Verifica se usuário é o dono do recurso
    if (req.user.uid !== resourceOwnerId) {
      console.warn(`[OWNERSHIP] ⚠️ Access denied: ${req.user.email} tried to access resource owned by ${resourceOwnerId} → ${req.method} ${req.path}`);

      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only modify your own resources',
        code: 'OWNERSHIP_FORBIDDEN'
      });
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[OWNERSHIP] ✅ Owner access granted: ${req.user.email} → ${req.method} ${req.path}`);
    }

    next();
  };
}

module.exports = {
  requireAdmin,
  requireModerator,
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  requireOwnershipOrAdmin
};
