import { describe, it, expect } from 'vitest'
import { useAdminAuth } from '../../src/composables/useAdminAuth'

// Mock simples do currentUser
let mockCurrentUser = null

vi.mock('../../src/plugins/auth', () => ({
  get currentUser() {
    return {
      value: mockCurrentUser
    }
  }
}))

describe('useAdminAuth', () => {
  beforeEach(() => {
    // Resetar o mock antes de cada teste
    mockCurrentUser = null
  })

  it('deve retornar false quando usuário não está logado', () => {
    mockCurrentUser = null
    const { isAdmin } = useAdminAuth()
    expect(isAdmin.value).toBe(false)
  })

  it('deve identificar usuários administradores', () => {
    mockCurrentUser = { uid: 'RtfNENOqMUdw7pvgeeaBVSuin662' } // UID de administrador
    const { isAdmin } = useAdminAuth()
    expect(isAdmin.value).toBe(true)
  })

  it('deve retornar false para usuários não administradores', () => {
    mockCurrentUser = { uid: 'non-admin-user-id' }
    const { isAdmin } = useAdminAuth()
    expect(isAdmin.value).toBe(false)
  })
})