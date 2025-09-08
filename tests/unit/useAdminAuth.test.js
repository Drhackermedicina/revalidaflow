import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAdminAuth } from '../../src/composables/useAdminAuth'
import { ref } from 'vue'

// Mock simples do currentUser
let mockCurrentUser = ref(null)

vi.mock('../../src/plugins/auth', () => ({
  get currentUser() {
    return mockCurrentUser
  }
}))

describe('useAdminAuth', () => {
  beforeEach(() => {
    // Resetar o mock antes de cada teste
    mockCurrentUser.value = null
  })

  it('deve retornar false quando usuário não está logado', () => {
    mockCurrentUser.value = null
    const { isAdmin } = useAdminAuth()
    expect(isAdmin.value).toBe(false)
  })

  it('deve identificar usuários administradores', () => {
    mockCurrentUser.value = { uid: 'RtfNENOqMUdw7pvgeeaBVSuin662' } // UID de administrador
    const { isAdmin } = useAdminAuth()
    expect(isAdmin.value).toBe(true)
  })

  it('deve retornar false para usuários não administradores', () => {
    mockCurrentUser.value = { uid: 'non-admin-user-id' }
    const { isAdmin } = useAdminAuth()
    expect(isAdmin.value).toBe(false)
  })
})