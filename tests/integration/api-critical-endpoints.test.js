/**
 * Testes críticos para endpoints de API
 * P0-T03: Escrever testes críticos de endpoints (4h task)
 *
 * Este arquivo testa os endpoints mais críticos da aplicação:
 * - Autenticação e autorização
 * - Endpoints de admin
 * - APIs públicas importantes
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import axios from 'axios'

// Mock do firebase admin para testes
vi.mock('firebase-admin', () => ({
  auth: {
    verifyIdToken: vi.fn(),
    getUser: vi.fn()
  },
  firestore: {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        get: vi.fn(),
        set: vi.fn(),
        update: vi.fn()
      })),
      where: vi.fn(() => ({
        get: vi.fn()
      }))
    }))
  }
}))

// Mock do express app
const mockApp = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  use: vi.fn()
}

// Mock do server.js
vi.mock('../../backend/server.js', () => mockApp)

describe('Testes Críticos de Endpoints da API', () => {
  let baseURL

  beforeEach(async () => {
    // Configuração do servidor de teste
    process.env.NODE_ENV = 'test'
    baseURL = 'http://localhost:3000'

    // Mock de usuários para testes
    const mockUsers = {
      admin: {
        uid: 'admin-123',
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
        uid: 'moderator-123',
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
        uid: 'user-123',
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
    const { auth } = await import('firebase-admin')
    auth.verifyIdToken.mockImplementation((token) => {
      if (token === 'admin-token') return Promise.resolve(mockUsers.admin)
      if (token === 'moderator-token') return Promise.resolve(mockUsers.moderator)
      if (token === 'user-token') return Promise.resolve(mockUsers.user)
      return Promise.reject(new Error('Token inválido'))
    })

    // Mock do Firestore
    const { firestore } = await import('firebase-admin')
    const mockDoc = {
      get: vi.fn().mockResolvedValue({
        exists: true,
        data: () => mockUsers.admin
      }),
      set: vi.fn().mockResolvedValue(true),
      update: vi.fn().mockResolvedValue(true)
    }

    const mockCollection = {
      doc: vi.fn().mockReturnValue(mockDoc),
      where: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({
          docs: Object.values(mockUsers).map(user => ({
            id: user.uid,
            data: () => user
          }))
        })
      })
    }

    firestore.collection.mockReturnValue(mockCollection)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('🔐 Autenticação e Autorização', () => {
    it('deve rejeitar requisições sem token', async () => {
      try {
        await axios.get(`${baseURL}/api/admin/dashboard`)
        expect.fail('Deveria ter lançado erro 401')
      } catch (error) {
        expect(error.response.status).toBe(401)
        expect(error.response.data.error).toContain('não autorizado')
      }
    })

    it('deve rejeitar tokens inválidos', async () => {
      try {
        await axios.get(`${baseURL}/api/admin/dashboard`, {
          headers: { Authorization: 'Bearer invalid-token' }
        })
        expect.fail('Deveria ter lançado erro 401')
      } catch (error) {
        expect(error.response.status).toBe(401)
        expect(error.response.data.error).toContain('Token inválido')
      }
    })

    it('deve aceitar tokens válidos e retornar dados do usuário', async () => {
      const response = await axios.get(`${baseURL}/api/validate-token`, {
        headers: { Authorization: 'Bearer admin-token' }
      })

      expect(response.status).toBe(200)
      expect(response.data.user.email).toBe('admin@test.com')
      expect(response.data.user.role).toBe('admin')
    })
  })

  describe('👑 Endpoints de Admin', () => {
    describe('GET /api/admin/dashboard', () => {
      it('admin deve acessar dashboard', async () => {
        const response = await axios.get(`${baseURL}/api/admin/dashboard`, {
          headers: { Authorization: 'Bearer admin-token' }
        })

        expect(response.status).toBe(200)
        expect(response.data.statistics).toBeDefined()
        expect(response.data.statistics.users).toBeDefined()
        expect(response.data.statistics.stations).toBeDefined()
        expect(response.data.system).toBeDefined()
      })

      it('moderator não deve acessar dashboard de admin', async () => {
        try {
          await axios.get(`${baseURL}/api/admin/dashboard`, {
            headers: { Authorization: 'Bearer moderator-token' }
          })
          expect.fail('Deveria ter lançado erro 403')
        } catch (error) {
          expect(error.response.status).toBe(403)
          expect(error.response.data.error).toContain('Admin access required')
        }
      })

      it('usuário comum não deve acessar dashboard', async () => {
        try {
          await axios.get(`${baseURL}/api/admin/dashboard`, {
            headers: { Authorization: 'Bearer user-token' }
          })
          expect.fail('Deveria ter lançado erro 403')
        } catch (error) {
          expect(error.response.status).toBe(403)
          expect(error.response.data.error).toContain('Admin access required')
        }
      })
    })

    describe('GET /api/admin/users', () => {
      it('admin deve listar usuários', async () => {
        const response = await axios.get(`${baseURL}/api/admin/users`, {
          headers: { Authorization: 'Bearer admin-token' }
        })

        expect(response.status).toBe(200)
        expect(Array.isArray(response.data.users)).toBe(true)
        expect(response.data.users.length).toBeGreaterThan(0)
        expect(response.data.pagination).toBeDefined()
      })

      it('deve filtrar usuários por role', async () => {
        const response = await axios.get(`${baseURL}/api/admin/users?role=admin`, {
          headers: { Authorization: 'Bearer admin-token' }
        })

        expect(response.status).toBe(200)
        expect(response.data.users.every(user => user.role === 'admin')).toBe(true)
      })

      it('deve paginar resultados', async () => {
        const response = await axios.get(`${baseURL}/api/admin/users?page=1&limit=5`, {
          headers: { Authorization: 'Bearer admin-token' }
        })

        expect(response.status).toBe(200)
        expect(response.data.users.length).toBeLessThanOrEqual(5)
        expect(response.data.pagination.page).toBe(1)
        expect(response.data.pagination.limit).toBe(5)
      })

      it('moderator não deve listar usuários', async () => {
        try {
          await axios.get(`${baseURL}/api/admin/users`, {
            headers: { Authorization: 'Bearer moderator-token' }
          })
          expect.fail('Deveria ter lançado erro 403')
        } catch (error) {
          expect(error.response.status).toBe(403)
          expect(error.response.data.error).toContain('Admin access required')
        }
      })
    })

    describe('PUT /api/admin/users/:userId/role', () => {
      it('admin pode alterar roles de usuários', async () => {
        const response = await axios.put(
          `${baseURL}/api/admin/users/user-123/role`,
          { newRole: 'moderator' },
          { headers: { Authorization: 'Bearer admin-token' } }
        )

        expect(response.status).toBe(200)
        expect(response.data.success).toBe(true)
        expect(response.data.newRole).toBe('moderator')
        expect(response.data.updatedBy).toBe('admin@test.com')
      })

      it('deve validar valores de role', async () => {
        try {
          await axios.put(
            `${baseURL}/api/admin/users/user-123/role`,
            { newRole: 'invalid-role' },
            { headers: { Authorization: 'Bearer admin-token' } }
          )
          expect.fail('Deveria ter lançado erro 400')
        } catch (error) {
          expect(error.response.status).toBe(400)
          expect(error.response.data.error).toContain('Role inválido')
        }
      })

      it('moderator não pode alterar roles (permissão canManageRoles)', async () => {
        try {
          await axios.put(
            `${baseURL}/api/admin/users/user-123/role`,
            { newRole: 'user' },
            { headers: { Authorization: 'Bearer moderator-token' } }
          )
          expect.fail('Deveria ter lançado erro 403')
        } catch (error) {
          expect(error.response.status).toBe(403)
          expect(error.response.data.error).toContain('permissão necessária')
        }
      })

      it('usuário comum não pode alterar roles', async () => {
        try {
          await axios.put(
            `${baseURL}/api/admin/users/user-123/role`,
            { newRole: 'user' },
            { headers: { Authorization: 'Bearer user-token' } }
          )
          expect.fail('Deveria ter lançado erro 403')
        } catch (error) {
          expect(error.response.status).toBe(403)
          expect(error.response.data.error).toContain('permissão necessária')
        }
      })
    })
  })

  describe('🌐 APIs Públicas', () => {
    describe('GET /api/estacoes', () => {
      it('deve listar estações públicas', async () => {
        const response = await axios.get(`${baseURL}/api/estacoes`)

        expect(response.status).toBe(200)
        expect(Array.isArray(response.data.estacoes)).toBe(true)
      })
    })

    describe('POST /api/estacoes', () => {
      it('usuário não autenticado não pode criar estações', async () => {
        try {
          await axios.post(`${baseURL}/api/estacoes`, {
            titulo: 'Estação Teste',
            especialidade: 'Clínica Médica'
          })
          expect.fail('Deveria ter lançado erro 401')
        } catch (error) {
          expect(error.response.status).toBe(401)
        }
      })

      it('moderator pode criar estações (permissão canEditStations)', async () => {
        const response = await axios.post(
          `${baseURL}/api/estacoes`,
          {
            titulo: 'Estação Teste',
            especialidade: 'Clínica Médica',
            enunciado: 'Enunciado da estação'
          },
          { headers: { Authorization: 'Bearer moderator-token' } }
        )

        expect(response.status).toBe(201)
        expect(response.data.success).toBe(true)
        expect(response.data.estacao.titulo).toBe('Estação Teste')
      })

      it('usuário comum não pode criar estações', async () => {
        try {
          await axios.post(
            `${baseURL}/api/estacoes`,
            {
              titulo: 'Estação Teste',
              especialidade: 'Clínica Médica'
            },
            { headers: { Authorization: 'Bearer user-token' } }
          )
          expect.fail('Deveria ter lançado erro 403')
        } catch (error) {
          expect(error.response.status).toBe(403)
          expect(error.response.data.error).toContain('permissão necessária')
        }
      })
    })
  })

  describe('🔍 Debug e Monitoramento', () => {
    describe('GET /debug/metrics', () => {
      it('admin pode acessar métricas em produção', async () => {
        const originalEnv = process.env.NODE_ENV
        process.env.NODE_ENV = 'production'

        try {
          const response = await axios.get(`${baseURL}/debug/metrics`, {
            headers: { Authorization: 'Bearer admin-token' }
          })

          expect(response.status).toBe(200)
          expect(response.data.metrics).toBeDefined()
          expect(response.data.system).toBeDefined()
        } finally {
          process.env.NODE_ENV = originalEnv
        }
      })

      it('acesso aberto em desenvolvimento', async () => {
        const originalEnv = process.env.NODE_ENV
        process.env.NODE_ENV = 'development'

        try {
          const response = await axios.get(`${baseURL}/debug/metrics`)
          expect(response.status).toBe(200)
          expect(response.data.metrics).toBeDefined()
        } finally {
          process.env.NODE_ENV = originalEnv
        }
      })

      it('usuário comum não pode acessar métricas em produção', async () => {
        const originalEnv = process.env.NODE_ENV
        process.env.NODE_ENV = 'production'

        try {
          await axios.get(`${baseURL}/debug/metrics`, {
            headers: { Authorization: 'Bearer user-token' }
          })
          expect.fail('Deveria ter lançado erro 403')
        } catch (error) {
          expect(error.response.status).toBe(403)
        } finally {
          process.env.NODE_ENV = originalEnv
        }
      })
    })
  })

  describe('🛡️ Segurança e Validação', () => {
    it('deve validar entrada de dados', async () => {
      try {
        await axios.post(
          `${baseURL}/api/estacoes`,
          { titulo: '', especialidade: '' }, // Dados inválidos
          { headers: { Authorization: 'Bearer admin-token' } }
        )
        expect.fail('Deveria ter lançado erro 400')
      } catch (error) {
        expect(error.response.status).toBe(400)
        expect(error.response.data.error).toContain('validação')
      }
    })

    it('deve sanitizar contra XSS', async () => {
      const xssPayload = '<script>alert("xss")</script>'

      try {
        await axios.post(
          `${baseURL}/api/estacoes`,
          {
            titulo: xssPayload,
            especialidade: 'Clínica Médica'
          },
          { headers: { Authorization: 'Bearer admin-token' } }
        )

        // Se criar, o título deve estar sanitizado
        expect.fail('Deveria ter sanitizado ou rejeitado o payload XSS')
      } catch (error) {
        // Preferível que rejeite
        expect([400, 422]).toContain(error.response.status)
      }
    })

    it('deve limitar tamanho de requisições', async () => {
      const largePayload = {
        titulo: 'Título',
        especialidade: 'A'.repeat(10000) // Payload muito grande
      }

      try {
        await axios.post(
          `${baseURL}/api/estacoes`,
          largePayload,
          { headers: { Authorization: 'Bearer admin-token' } }
        )
        expect.fail('Deveria ter lançado erro de tamanho')
      } catch (error) {
        expect([413, 400]).toContain(error.response.status)
      }
    })

    it('deve prevenir rate limit em endpoints críticos', async () => {
      const promises = Array(20).fill().map(() =>
        axios.post(`${baseURL}/api/login`, {
          email: 'test@example.com',
          password: 'password'
        })
      )

      const results = await Promise.allSettled(promises)
      const rejectedCount = results.filter(r => r.status === 'rejected').length

      // Algumas requisições devem ser rejeitadas por rate limit
      expect(rejectedCount).toBeGreaterThan(0)
    })
  })

  describe('📊 Performance e Confiabilidade', () => {
    it('deve responder endpoints críticos em tempo hábil', async () => {
      const startTime = Date.now()

      await axios.get(`${baseURL}/api/estacoes`)

      const responseTime = Date.now() - startTime
      expect(responseTime).toBeLessThan(1000) // Menos de 1 segundo
    })

    it('deve handle concorrência em endpoints de admin', async () => {
      const promises = Array(5).fill().map(() =>
        axios.get(`${baseURL}/api/admin/users`, {
          headers: { Authorization: 'Bearer admin-token' }
        })
      )

      const results = await Promise.allSettled(promises)
      const successCount = results.filter(r => r.status === 'fulfilled').length

      // Todas as requisições devem ser bem sucedidas
      expect(successCount).toBe(5)
    })

    it('deve manter consistência de dados', async () => {
      // Criar usuário
      const createResponse = await axios.put(
        `${baseURL}/api/admin/users/test-user-123/role`,
        { newRole: 'moderator' },
        { headers: { Authorization: 'Bearer admin-token' } }
      )

      expect(createResponse.data.newRole).toBe('moderator')

      // Verificar se role foi atualizado
      const userResponse = await axios.get(`${baseURL}/api/admin/users/test-user-123`, {
        headers: { Authorization: 'Bearer admin-token' }
      })

      expect(userResponse.data.role).toBe('moderator')
    })
  })

  describe('🔄 Integração com Firestore', () => {
    it('deve atualizar cache quando roles mudam', async () => {
      // Alterar role
      await axios.put(
        `${baseURL}/api/admin/users/user-123/role`,
        { newRole: 'admin' },
        { headers: { Authorization: 'Bearer admin-token' } }
      )

      // Verificar se cache foi invalidado
      const cacheResponse = await axios.get(`${baseURL}/debug/cache`, {
        headers: { Authorization: 'Bearer admin-token' }
      })

      expect(cacheResponse.data.cacheInvalidated).toBe(true)
    })

    it('deve logar ações de admin', async () => {
      const spy = vi.spyOn(console, 'log')

      await axios.put(
        `${baseURL}/api/admin/users/user-123/role`,
        { newRole: 'moderator' },
        { headers: { Authorization: 'Bearer admin-token' } }
      )

      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('[ADMIN ACTION]')
      )

      spy.mockRestore()
    })
  })
})

describe('Testes de Integração de Sistema', () => {
  it('deve manter consistência frontend-backend', async () => {
    // Testar se permissões do frontend correspondem às do backend
    const frontendPermissions = {
      admin: ['canManageRoles', 'canDeleteMessages', 'canEditStations', 'canManageUsers', 'canViewAnalytics', 'canManageSystem'],
      moderator: ['canDeleteMessages', 'canEditStations', 'canViewAnalytics'],
      user: []
    }

    // Verificar endpoints com cada tipo de usuário
    for (const [role, permissions] of Object.entries(frontendPermissions)) {
      const token = `${role}-token`

      // Testar acesso a endpoints baseado em permissões
      const endpoints = [
        { path: '/api/admin/dashboard', required: ['canManageSystem'] },
        { path: '/api/admin/users', required: ['canManageUsers'] },
        { path: '/api/admin/users/user-123/role', required: ['canManageRoles'] },
        { path: '/api/estacoes', method: 'POST', required: ['canEditStations'] }
      ]

      for (const endpoint of endpoints) {
        const hasPermission = endpoint.required.every(perm => permissions.includes(perm))

        try {
          const method = endpoint.method || 'GET'
          const config = { headers: { Authorization: `Bearer ${token}` } }

          if (method === 'POST') {
            await axios.post(`${baseURL}${endpoint.path}`, {}, config)
          } else {
            await axios.get(`${baseURL}${endpoint.path}`, config)
          }

          if (!hasPermission) {
            expect.fail(`${role} não deveria acessar ${endpoint.path}`)
          }
        } catch (error) {
          if (hasPermission) {
            expect.fail(`${role} deveria acessar ${endpoint.path}: ${error.message}`)
          }
        }
      }
    }
  })
})
