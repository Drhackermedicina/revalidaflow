/**
 * Testes específicos para endpoints de administração
 * P0-T03: Escrever testes críticos de endpoints (4h task)
 *
 * Testa em detalhe os endpoints implementados em P0-F05
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import { app } from '../../backend/server.js'

// Mock do Firebase Admin SDK
const mockAuth = {
  verifyIdToken: vi.fn(),
  getUser: vi.fn()
}

const mockFirestore = {
  collection: vi.fn(),
  doc: vi.fn(),
  batch: vi.fn()
}

vi.mock('firebase-admin', () => ({
  auth: () => mockAuth,
  firestore: () => mockFirestore
}))

describe('👑 Endpoints de Administração', () => {
  beforeEach(async () => {
    // Configurar ambiente de teste
    process.env.NODE_ENV = 'test'

    // Mock de usuários
    const mockUsers = {
      admin: {
        uid: 'admin-test-123',
        email: 'admin@test.com',
        role: 'admin',
        permissions: {
          canManageRoles: true,
          canDeleteMessages: true,
          canEditStations: true,
          canManageUsers: true,
          canViewAnalytics: true,
          canManageSystem: true
        }
      },
      moderator: {
        uid: 'moderator-test-123',
        email: 'moderator@test.com',
        role: 'moderator',
        permissions: {
          canManageRoles: false,
          canDeleteMessages: true,
          canEditStations: true,
          canManageUsers: false,
          canViewAnalytics: true,
          canManageSystem: false
        }
      },
      user: {
        uid: 'user-test-123',
        email: 'user@test.com',
        role: 'user',
        permissions: {
          canManageRoles: false,
          canDeleteMessages: false,
          canEditStations: false,
          canManageUsers: false,
          canViewAnalytics: false,
          canManageSystem: false
        }
      }
    }

    // Mock do Firebase Auth
    mockAuth.verifyIdToken.mockImplementation((token) => {
      if (token === 'admin-token') return Promise.resolve(mockUsers.admin)
      if (token === 'moderator-token') return Promise.resolve(mockUsers.moderator)
      if (token === 'user-token') return Promise.resolve(mockUsers.user)
      return Promise.reject(new Error('Token inválido'))
    })

    // Mock do Firestore
    const mockDoc = (userId) => ({
      get: vi.fn().mockResolvedValue({
        exists: true,
        data: () => mockUsers[userId] || mockUsers.user
      }),
      update: vi.fn().mockResolvedValue(true),
      set: vi.fn().mockResolvedValue(true)
    })

    const mockCollection = {
      doc: vi.fn((userId) => mockDoc(userId)),
      where: vi.fn(() => ({
        get: vi.fn().mockResolvedValue({
          docs: Object.values(mockUsers).map(user => ({
            id: user.uid,
            data: () => user
          }))
        })
      }))
    }

    mockFirestore.collection.mockReturnValue(mockCollection)
    mockFirestore.doc.mockReturnValue(mockDoc('admin'))
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/admin/dashboard', () => {
    it('admin deve acessar dashboard com estatísticas completas', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', 'Bearer admin-token')
        .expect(200)

      expect(response.body).toHaveProperty('statistics')
      expect(response.body.statistics).toHaveProperty('users')
      expect(response.body.statistics).toHaveProperty('stations')
      expect(response.body.statistics).toHaveProperty('sessions')
      expect(response.body.statistics).toHaveProperty('cache')
      expect(response.body).toHaveProperty('system')

      // Verificar estrutura das estatísticas de usuários
      expect(response.body.statistics.users).toHaveProperty('total')
      expect(response.body.statistics.users).toHaveProperty('byRole')
      expect(response.body.statistics.users.byRole).toHaveProperty('admin')
      expect(response.body.statistics.users.byRole).toHaveProperty('moderator')
      expect(response.body.statistics.users.byRole).toHaveProperty('user')
      expect(response.body.statistics.users).toHaveProperty('recent')

      // Verificar estrutura do sistema
      expect(response.body.system).toHaveProperty('uptime')
      expect(response.body.system).toHaveProperty('memory')
      expect(response.body.system).toHaveProperty('nodeVersion')
      expect(response.body.system).toHaveProperty('environment')
    })

    it('moderator não deve acessar dashboard', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', 'Bearer moderator-token')
        .expect(403)

      expect(response.body).toHaveProperty('error', 'Admin access required')
      expect(response.body).toHaveProperty('code', 'ADMIN_FORBIDDEN')
      expect(response.body).toHaveProperty('currentRole', 'moderator')
    })

    it('usuário comum não deve acessar dashboard', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', 'Bearer user-token')
        .expect(403)

      expect(response.body).toHaveProperty('error', 'Admin access required')
      expect(response.body).toHaveProperty('currentRole', 'user')
    })

    it('deve calcular estatísticas corretamente', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', 'Bearer admin-token')
        .expect(200)

      const stats = response.body.statistics

      // Verificar se os totais são consistentes
      const totalByRoles = Object.values(stats.users.byRole).reduce((a, b) => a + b, 0)
      expect(totalByRoles).toBe(stats.users.total)

      // Verificar eficiência do cache
      expect(stats.cache).toHaveProperty('efficiency')
      const efficiency = parseFloat(stats.cache.efficiency)
      expect(efficiency).toBeGreaterThanOrEqual(0)
      expect(efficiency).toBeLessThanOrEqual(100)

      // Verificar se timestamp está presente
      expect(response.body).toHaveProperty('timestamp')
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date)
    })
  })

  describe('GET /api/admin/users', () => {
    it('admin deve listar usuários com paginação', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', 'Bearer admin-token')
        .expect(200)

      expect(response.body).toHaveProperty('users')
      expect(response.body).toHaveProperty('pagination')
      expect(Array.isArray(response.body.users)).toBe(true)

      // Verificar estrutura da paginação
      const pagination = response.body.pagination
      expect(pagination).toHaveProperty('page')
      expect(pagination).toHaveProperty('limit')
      expect(pagination).toHaveProperty('total')
      expect(pagination).toHaveProperty('pages')

      // Valores padrão
      expect(pagination.page).toBe(1)
      expect(pagination.limit).toBe(20)
    })

    it('deve aplicar filtros corretamente', async () => {
      // Testar filtro por role
      const response = await request(app)
        .get('/api/admin/users?role=admin')
        .set('Authorization', 'Bearer admin-token')
        .expect(200)

      expect(response.body.users.every(user => user.role === 'admin')).toBe(true)

      // Testar filtro por busca
      const searchResponse = await request(app)
        .get('/api/admin/users?search=admin')
        .set('Authorization', 'Bearer admin-token')
        .expect(200)

      expect(searchResponse.body.users.length).toBeGreaterThanOrEqual(0)
    })

    it('deve paginar resultados corretamente', async () => {
      // Primeira página
      const page1 = await request(app)
        .get('/api/admin/users?page=1&limit=5')
        .set('Authorization', 'Bearer admin-token')
        .expect(200)

      // Segunda página
      const page2 = await request(app)
        .get('/api/admin/users?page=2&limit=5')
        .set('Authorization', 'Bearer admin-token')
        .expect(200)

      // Verificar se a paginação está funcionando
      expect(page1.body.pagination.page).toBe(1)
      expect(page2.body.pagination.page).toBe(2)
      expect(page1.body.pagination.limit).toBe(5)
      expect(page2.body.pagination.limit).toBe(5)

      // Não deve haver usuários duplicados entre páginas
      const userIds1 = page1.body.users.map(u => u.uid)
      const userIds2 = page2.body.users.map(u => u.uid)
      const intersection = userIds1.filter(id => userIds2.includes(id))
      expect(intersection.length).toBe(0)
    })

    it('deve validar parâmetros de paginação', async () => {
      // Limite inválido
      await request(app)
        .get('/api/admin/users?limit=1000')
        .set('Authorization', 'Bearer admin-token')
        .expect(400)

      // Página inválida
      await request(app)
        .get('/api/admin/users?page=0')
        .set('Authorization', 'Bearer admin-token')
        .expect(400)

      // Parâmetro de role inválido
      await request(app)
        .get('/api/admin/users?role=invalid')
        .set('Authorization', 'Bearer admin-token')
        .expect(400)
    })

    it('moderator não deve acessar lista de usuários', async () => {
      await request(app)
        .get('/api/admin/users')
        .set('Authorization', 'Bearer moderator-token')
        .expect(403)
    })
  })

  describe('PUT /api/admin/users/:userId/role', () => {
    const targetUserId = 'user-test-123'

    it('admin pode alterar role de usuário', async () => {
      const response = await request(app)
        .put(`/api/admin/users/${targetUserId}/role`)
        .set('Authorization', 'Bearer admin-token')
        .send({ newRole: 'moderator' })
        .expect(200)

      expect(response.body).toHaveProperty('success', true)
      expect(response.body).toHaveProperty('message')
      expect(response.body).toHaveProperty('userId', targetUserId)
      expect(response.body).toHaveProperty('newRole', 'moderator')
      expect(response.body).toHaveProperty('updatedBy', 'admin@test.com')
      expect(response.body).toHaveProperty('timestamp')

      // Verificar se o Firestore foi chamado
      expect(mockFirestore.collection).toHaveBeenCalledWith('usuarios')
      expect(mockFirestore.doc).toHaveBeenCalledWith(targetUserId)
    })

    it('deve validar roles permitidas', async () => {
      const validRoles = ['admin', 'moderator', 'user']

      for (const role of validRoles) {
        const response = await request(app)
          .put(`/api/admin/users/${targetUserId}/role`)
          .set('Authorization', 'Bearer admin-token')
          .send({ newRole: role })
          .expect(200)

        expect(response.body.newRole).toBe(role)
      }
    })

    it('deve rejeitar roles inválidas', async () => {
      const invalidRoles = ['superadmin', 'guest', '', null, undefined, 123]

      for (const role of invalidRoles) {
        await request(app)
          .put(`/api/admin/users/${targetUserId}/role`)
          .set('Authorization', 'Bearer admin-token')
          .send({ newRole: role })
          .expect(400)
      }
    })

    it('deve atualizar permissões automaticamente', async () => {
      const response = await request(app)
        .put(`/api/admin/users/${targetUserId}/role`)
        .set('Authorization', 'Bearer admin-token')
        .send({ newRole: 'admin' })
        .expect(200)

      expect(response.body).toHaveProperty('permissions')
      expect(response.body.permissions.canManageRoles).toBe(true)
      expect(response.body.permissions.canManageSystem).toBe(true)
    })

    it('deve invalidar cache quando role muda', async () => {
      // Spy no console para verificar log de cache invalidation
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      await request(app)
        .put(`/api/admin/users/${targetUserId}/role`)
        .set('Authorization', 'Bearer admin-token')
        .send({ newRole: 'moderator' })
        .expect(200)

      // Verificar se log de cache invalidation foi chamado
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cache invalidado para usuário')
      )

      consoleSpy.mockRestore()
    })

    it('deve logar ações de admin', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      await request(app)
        .put(`/api/admin/users/${targetUserId}/role`)
        .set('Authorization', 'Bearer admin-token')
        .send({ newRole: 'user' })
        .expect(200)

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ADMIN ACTION]')
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('admin@test.com')
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(targetUserId)
      )

      consoleSpy.mockRestore()
    })

    it('moderator não pode alterar roles', async () => {
      await request(app)
        .put(`/api/admin/users/${targetUserId}/role`)
        .set('Authorization', 'Bearer moderator-token')
        .send({ newRole: 'user' })
        .expect(403)
    })

    it('não deve permitir auto-alteração de role', async () => {
      // Tentar alterar próprio role
      await request(app)
        .put('/api/admin/users/admin-test-123/role')
        .set('Authorization', 'Bearer admin-token')
        .send({ newRole: 'user' })
        .expect(400)
    })

    it('deve validar userId', async () => {
      // UserId inválido
      await request(app)
        .put('/api/admin/users//role')
        .set('Authorization', 'Bearer admin-token')
        .send({ newRole: 'user' })
        .expect(400)

      // UserId não existe
      await request(app)
        .put('/api/admin/users/nonexistent-user/role')
        .set('Authorization', 'Bearer admin-token')
        .send({ newRole: 'user' })
        .expect(404)
    })
  })

  describe('GET /debug/metrics', () => {
    it('deve retornar métricas em desenvolvimento', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      try {
        const response = await request(app)
          .get('/debug/metrics')
          .expect(200)

        expect(response.body).toHaveProperty('metrics')
        expect(response.body).toHaveProperty('system')
        expect(response.body.metrics).toHaveProperty('uptime')
        expect(response.body.metrics).toHaveProperty('memory')
      } finally {
        process.env.NODE_ENV = originalEnv
      }
    })

    it('deve exigir admin em produção', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      try {
        // Usuário comum não deve acessar
        await request(app)
          .get('/debug/metrics')
          .set('Authorization', 'Bearer user-token')
          .expect(403)

        // Admin deve acessar
        const response = await request(app)
          .get('/debug/metrics')
          .set('Authorization', 'Bearer admin-token')
          .expect(200)

        expect(response.body).toHaveProperty('metrics')
      } finally {
        process.env.NODE_ENV = originalEnv
      }
    })
  })

  describe('Tratamento de Erros', () => {
    it('deve lidar com falha no Firebase Auth', async () => {
      mockAuth.verifyIdToken.mockRejectedValue(new Error('Firebase unavailable'))

      const response = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', 'Bearer admin-token')
        .expect(401)

      expect(response.body).toHaveProperty('error', 'Token inválido')
    })

    it('deve lidar com falha no Firestore', async () => {
      mockFirestore.collection.mockImplementation(() => {
        throw new Error('Firestore unavailable')
      })

      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', 'Bearer admin-token')
        .expect(500)

      expect(response.body).toHaveProperty('error')
    })

    it('deve validar corpo da requisição', async () => {
      // Requisição sem corpo
      await request(app)
        .put('/api/admin/users/user-test-123/role')
        .set('Authorization', 'Bearer admin-token')
        .expect(400)

      // Corpo inválido
      await request(app)
        .put('/api/admin/users/user-test-123/role')
        .set('Authorization', 'Bearer admin-token')
        .send({ invalidField: 'value' })
        .expect(400)
    })
  })

  describe('Performance', () => {
    it('dashboard deve responder rapidamente', async () => {
      const startTime = Date.now()

      await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', 'Bearer admin-token')
        .expect(200)

      const responseTime = Date.now() - startTime
      expect(responseTime).toBeLessThan(2000) // Menos de 2 segundos
    })

    it('listagem de usuários deve suportar paginação eficiente', async () => {
      const startTime = Date.now()

      const response = await request(app)
        .get('/api/admin/users?page=1&limit=50')
        .set('Authorization', 'Bearer admin-token')
        .expect(200)

      const responseTime = Date.now() - startTime
      expect(responseTime).toBeLessThan(1500)

      // Verificar se não está carregando todos os usuários
      expect(response.body.users.length).toBeLessThanOrEqual(50)
    })

    it('alteração de role deve ser rápida', async () => {
      const startTime = Date.now()

      await request(app)
        .put('/api/admin/users/user-test-123/role')
        .set('Authorization', 'Bearer admin-token')
        .send({ newRole: 'moderator' })
        .expect(200)

      const responseTime = Date.now() - startTime
      expect(responseTime).toBeLessThan(1000) // Menos de 1 segundo
    })
  })
})
