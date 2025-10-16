/**
 * Testes de integração para middlewares de autenticação
 * P0-T03: Escrever testes críticos de endpoints (4h task)
 *
 * Testa especificamente os middlewares de autenticação e autorização
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { app } from '../../backend/server.js'

// Mock do Firebase Admin SDK
const mockAuth = {
  verifyIdToken: vi.fn(),
  getUser: vi.fn()
}

const mockFirestore = {
  collection: vi.fn(),
  doc: vi.fn()
}

vi.mock('firebase-admin', () => ({
  auth: () => mockAuth,
  firestore: () => mockFirestore
}))

describe('🔐 Middlewares de Autenticação', () => {
  let request, response, next

  beforeEach(() => {
    request = {
      headers: {},
      user: null
    }
    response = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
      send: vi.fn()
    }
    next = vi.fn()

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('requireAuth Middleware', () => {
    it('deve rejeitar requisição sem Authorization header', async () => {
      const requireAuth = (await import('../../backend/middleware/auth.js')).default

      await requireAuth(request, response, next)

      expect(response.status).toHaveBeenCalledWith(401)
      expect(response.json).toHaveBeenCalledWith({
        error: 'Token de autenticação não fornecido',
        code: 'AUTH_REQUIRED'
      })
      expect(next).not.toHaveBeenCalled()
    })

    it('deve rejeitar token mal formatado', async () => {
      const requireAuth = (await import('../../backend/middleware/auth.js')).default

      request.headers.authorization = 'InvalidToken'

      await requireAuth(request, response, next)

      expect(response.status).toHaveBeenCalledWith(401)
      expect(response.json).toHaveBeenCalledWith({
        error: 'Formato do token inválido',
        code: 'TOKEN_FORMAT_INVALID'
      })
    })

    it('deve rejeitar token inválido do Firebase', async () => {
      const requireAuth = (await import('../../backend/middleware/auth.js')).default

      request.headers.authorization = 'Bearer invalid-token'
      mockAuth.verifyIdToken.mockRejectedValue(new Error('Token inválido'))

      await requireAuth(request, response, next)

      expect(response.status).toHaveBeenCalledWith(401)
      expect(response.json).toHaveBeenCalledWith({
        error: 'Token inválido',
        code: 'TOKEN_INVALID'
      })
    })

    it('deve aceitar token válido e definir req.user', async () => {
      const requireAuth = (await import('../../backend/middleware/auth.js')).default

      const mockUser = {
        uid: 'user-123',
        email: 'user@test.com',
        email_verified: true
      }

      request.headers.authorization = 'Bearer valid-token'
      mockAuth.verifyIdToken.mockResolvedValue(mockUser)

      await requireAuth(request, response, next)

      expect(request.user).toBe(mockUser)
      expect(next).toHaveBeenCalledWith()
      expect(response.status).not.toHaveBeenCalled()
    })

    it('deve adicionar informações de role ao usuário', async () => {
      const requireAuth = (await import('../../backend/middleware/auth.js')).default

      const mockUser = {
        uid: 'user-123',
        email: 'user@test.com'
      }

      const mockDocSnapshot = {
        exists: true,
        data: () => ({
          role: 'admin',
          permissions: {
            canManageRoles: true,
            canDeleteMessages: true
          }
        })
      }

      request.headers.authorization = 'Bearer valid-token'
      mockAuth.verifyIdToken.mockResolvedValue(mockUser)

      const mockDoc = {
        get: vi.fn().mockResolvedValue(mockDocSnapshot)
      }

      mockFirestore.collection.mockReturnValue({
        doc: vi.fn().mockReturnValue(mockDoc)
      })

      await requireAuth(request, response, next)

      expect(request.user.role).toBe('admin')
      expect(request.user.permissions).toBeDefined()
      expect(next).toHaveBeenCalledWith()
    })
  })

  describe('requireAdmin Middleware', () => {
    it('deve permitir acesso a usuários admin', async () => {
      const requireAdmin = (await import('../../backend/middleware/adminAuth.js')).requireAdmin

      request.user = {
        uid: 'admin-123',
        email: 'admin@test.com',
        role: 'admin'
      }

      await requireAdmin(request, response, next)

      expect(next).toHaveBeenCalledWith()
      expect(response.status).not.toHaveBeenCalled()
    })

    it('deve rejeitar usuários sem role admin', async () => {
      const requireAdmin = (await import('../../backend/middleware/adminAuth.js')).requireAdmin

      request.user = {
        uid: 'user-123',
        email: 'user@test.com',
        role: 'user'
      }

      await requireAdmin(request, response, next)

      expect(response.status).toHaveBeenCalledWith(403)
      expect(response.json).toHaveBeenCalledWith({
        error: 'Admin access required',
        code: 'ADMIN_FORBIDDEN',
        currentRole: 'user'
      })
      expect(next).not.toHaveBeenCalled()
    })

    it('deve rejeitar usuários sem role definida', async () => {
      const requireAdmin = (await import('../../backend/middleware/adminAuth.js')).requireAdmin

      request.user = {
        uid: 'user-123',
        email: 'user@test.com'
        // sem role
      }

      await requireAdmin(request, response, next)

      expect(response.status).toHaveBeenCalledWith(403)
      expect(response.json).toHaveBeenCalledWith({
        error: 'Admin access required',
        code: 'ADMIN_FORBIDDEN',
        currentRole: undefined
      })
    })

    it('deve rejeitar requisições sem usuário', async () => {
      const requireAdmin = (await import('../../backend/middleware/adminAuth.js')).requireAdmin

      // request.user não está definido

      await requireAdmin(request, response, next)

      expect(response.status).toHaveBeenCalledWith(403)
      expect(response.json).toHaveBeenCalledWith({
        error: 'Admin access required',
        code: 'ADMIN_FORBIDDEN',
        currentRole: undefined
      })
    })
  })

  describe('requirePermission Middleware', () => {
    it('deve permitir acesso com permissão correta', async () => {
      const requirePermission = (await import('../../backend/middleware/adminAuth.js')).requirePermission

      request.user = {
        uid: 'user-123',
        email: 'user@test.com',
        role: 'moderator',
        permissions: {
          canDeleteMessages: true,
          canEditStations: true
        }
      }

      const middleware = requirePermission('canDeleteMessages')
      await middleware(request, response, next)

      expect(next).toHaveBeenCalledWith()
      expect(response.status).not.toHaveBeenCalled()
    })

    it('deve rejeitar acesso sem permissão', async () => {
      const requirePermission = (await import('../../backend/middleware/adminAuth.js')).requirePermission

      request.user = {
        uid: 'user-123',
        email: 'user@test.com',
        role: 'user',
        permissions: {
          canDeleteMessages: false
        }
      }

      const middleware = requirePermission('canManageRoles')
      await middleware(request, response, next)

      expect(response.status).toHaveBeenCalledWith(403)
      expect(response.json).toHaveBeenCalledWith({
        error: 'Permissão necessária: canManageRoles',
        code: 'PERMISSION_DENIED',
        requiredPermission: 'canManageRoles',
        userRole: 'user'
      })
      expect(next).not.toHaveBeenCalled()
    })

    it('deve rejeitar acesso sem objeto de permissões', async () => {
      const requirePermission = (await import('../../backend/middleware/adminAuth.js')).requirePermission

      request.user = {
        uid: 'user-123',
        email: 'user@test.com',
        role: 'user'
        // sem permissions
      }

      const middleware = requirePermission('canEditStations')
      await middleware(request, response, next)

      expect(response.status).toHaveBeenCalledWith(403)
      expect(response.json).toHaveBeenCalledWith({
        error: 'Permissão necessária: canEditStations',
        code: 'PERMISSION_DENIED',
        requiredPermission: 'canEditStations',
        userRole: 'user'
      })
    })

    it('admin deve ter acesso a todas as permissões', async () => {
      const requirePermission = (await import('../../backend/middleware/adminAuth.js')).requirePermission

      request.user = {
        uid: 'admin-123',
        email: 'admin@test.com',
        role: 'admin',
        permissions: {
          // Admin tem todas as permissões
          canManageRoles: true,
          canDeleteMessages: true,
          canEditStations: true,
          canManageUsers: true,
          canViewAnalytics: true,
          canManageSystem: true
        }
      }

      // Testar várias permissões
      const permissions = ['canManageRoles', 'canDeleteMessages', 'canEditStations']

      for (const permission of permissions) {
        vi.clearAllMocks()
        const middleware = requirePermission(permission)
        await middleware(request, response, next)

        expect(next).toHaveBeenCalledWith()
        expect(response.status).not.toHaveBeenCalled()
      }
    })
  })

  describe('Integração de Middlewares', () => {
    it('deve funcionar em cadeia: auth -> admin -> endpoint', async () => {
      // Simular middleware chain
      const requireAuth = (await import('../../backend/middleware/auth.js')).default
      const requireAdmin = (await import('../../backend/middleware/adminAuth.js')).requireAdmin

      const mockUser = {
        uid: 'admin-123',
        email: 'admin@test.com',
        role: 'admin'
      }

      request.headers.authorization = 'Bearer admin-token'
      mockAuth.verifyIdToken.mockResolvedValue(mockUser)

      const mockDocSnapshot = {
        exists: true,
        data: () => ({
          role: 'admin',
          permissions: { canManageSystem: true }
        })
      }

      const mockDoc = {
        get: vi.fn().mockResolvedValue(mockDocSnapshot)
      }

      mockFirestore.collection.mockReturnValue({
        doc: vi.fn().mockReturnValue(mockDoc)
      })

      // Executar middlewares em sequência
      await requireAuth(request, response, next)
      expect(next).toHaveBeenCalledTimes(1)

      vi.clearAllMocks()
      await requireAdmin(request, response, next)
      expect(next).toHaveBeenCalledTimes(1)

      expect(request.user.role).toBe('admin')
    })

    it('deve parpar cadeia no primeiro middleware que falhar', async () => {
      const requireAuth = (await import('../../backend/middleware/auth.js')).default

      request.headers.authorization = 'Bearer invalid-token'
      mockAuth.verifyIdToken.mockRejectedValue(new Error('Token inválido'))

      await requireAuth(request, response, next)

      expect(response.status).toHaveBeenCalledWith(401)
      expect(next).not.toHaveBeenCalled()
    })

    it('deve lidar com múltiplas permissões', async () => {
      const requirePermission = (await import('../../backend/middleware/adminAuth.js')).requirePermission

      request.user = {
        uid: 'moderator-123',
        email: 'moderator@test.com',
        role: 'moderator',
        permissions: {
          canDeleteMessages: true,
          canEditStations: true,
          canViewAnalytics: true
        }
      }

      // Criar middleware com múltiplas permissões
      const middleware = requirePermission(['canDeleteMessages', 'canEditStations'])
      await middleware(request, response, next)

      expect(next).toHaveBeenCalledWith()

      // Testar permissão que não tem
      vi.clearAllMocks()
      const middleware2 = requirePermission(['canManageRoles'])
      await middleware2(request, response, next)

      expect(response.status).toHaveBeenCalledWith(403)
    })
  })

  describe('Tratamento de Erros', () => {
    it('deve logar erros de autenticação', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const requireAuth = (await import('../../backend/middleware/auth.js')).default

      request.headers.authorization = 'Bearer invalid-token'
      mockAuth.verifyIdToken.mockRejectedValue(new Error('Erro no Firebase'))

      await requireAuth(request, response, next)

      expect(consoleSpy).toHaveBeenCalledWith(
        'Erro na verificação do token:',
        expect.any(Error)
      )

      consoleSpy.mockRestore()
    })

    it('deve lidar com Firestore unavailable', async () => {
      const requireAuth = (await import('../../backend/middleware/auth.js')).default

      const mockUser = {
        uid: 'user-123',
        email: 'user@test.com'
      }

      request.headers.authorization = 'Bearer valid-token'
      mockAuth.verifyIdToken.mockResolvedValue(mockUser)

      // Mock Firestore error
      mockFirestore.collection.mockImplementation(() => {
        throw new Error('Firestore unavailable')
      })

      await requireAuth(request, response, next)

      // Deve continuar sem informações de role
      expect(request.user).toBe(mockUser)
      expect(next).toHaveBeenCalledWith()
    })

    it('deve tratar dados corrompidos no Firestore', async () => {
      const requireAuth = (await import('../../backend/middleware/auth.js')).default

      const mockUser = {
        uid: 'user-123',
        email: 'user@test.com'
      }

      request.headers.authorization = 'Bearer valid-token'
      mockAuth.verifyIdToken.mockResolvedValue(mockUser)

      const mockDocSnapshot = {
        exists: true,
        data: () => ({
          // Dados corrompidos - role inválida
          role: null,
          permissions: 'not-an-object'
        })
      }

      const mockDoc = {
        get: vi.fn().mockResolvedValue(mockDocSnapshot)
      }

      mockFirestore.collection.mockReturnValue({
        doc: vi.fn().mockReturnValue(mockDoc)
      })

      await requireAuth(request, response, next)

      // Deve continuar com valores padrão
      expect(request.user.role).toBe('user')
      expect(typeof request.user.permissions).toBe('object')
      expect(next).toHaveBeenCalledWith()
    })
  })
})

describe('🔍 Testes de Performance dos Middlewares', () => {
  it('requireAuth deve ser rápido', async () => {
    const requireAuth = (await import('../../backend/middleware/auth.js')).default

    const mockUser = {
      uid: 'user-123',
      email: 'user@test.com'
    }

    request.headers.authorization = 'Bearer valid-token'
    mockAuth.verifyIdToken.mockResolvedValue(mockUser)

    const startTime = Date.now()
    await requireAuth(request, response, next)
    const endTime = Date.now()

    expect(endTime - startTime).toBeLessThan(100) // Menos de 100ms
    expect(next).toHaveBeenCalled()
  })

  it('deve lidar bem com concorrência', async () => {
    const requireAuth = (await import('../../backend/middleware/auth.js')).default

    const mockUser = {
      uid: 'user-123',
      email: 'user@test.com'
    }

    mockAuth.verifyIdToken.mockResolvedValue(mockUser)

    // Criar múltiplas requisições simultâneas
    const requests = Array(10).fill().map(() => ({
      headers: { authorization: 'Bearer valid-token' },
      user: null
    }))

    const promises = requests.map(async (req) => {
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      }
      const next = vi.fn()

      await requireAuth(req, res, next)
      return { req, res, next }
    })

    const results = await Promise.all(promises)

    // Todas devem ser bem sucedidas
    results.forEach(({ req, next }) => {
      expect(req.user).toBeDefined()
      expect(next).toHaveBeenCalled()
    })
  })
})