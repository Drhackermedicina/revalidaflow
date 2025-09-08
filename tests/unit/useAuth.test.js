import { describe, it, expect } from 'vitest'
import { useAuth } from '../../src/composables/useAuth'

// Mock simples do currentUser
let mockCurrentUser = null

vi.mock('../../src/plugins/auth', () => ({
  get currentUser() {
    return {
      value: mockCurrentUser
    }
  }
}))

describe('useAuth', () => {
  beforeEach(() => {
    // Resetar o mock antes de cada teste
    mockCurrentUser = null
  })

  it('deve retornar informações do usuário logado', () => {
    mockCurrentUser = {
      uid: 'test-user-id',
      displayName: 'Test User',
      email: 'test@example.com'
    }
    
    const { user, userName } = useAuth()
    
    expect(user.value).toBeDefined()
    expect(user.value.uid).toBe('test-user-id')
    expect(user.value.displayName).toBe('Test User')
    expect(userName.value).toBe('Test User')
  })

  it('deve retornar "Candidato" quando usuário não está logado', () => {
    mockCurrentUser = null
    
    const { user, userName } = useAuth()
    expect(user.value).toBeNull()
    expect(userName.value).toBe('Candidato')
  })
})