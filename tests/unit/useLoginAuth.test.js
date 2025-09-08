import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useLoginAuth } from '../../src/composables/useLoginAuth'
import { ref } from 'vue'

// Mocks
const mockRouter = {
  push: vi.fn()
}

const mockUser = {
  uid: 'test-user-id',
  displayName: 'Test User'
}

const mockSignInWithPopup = vi.fn()

// Mock do vue-router
vi.mock('vue-router', () => ({
  useRouter: () => mockRouter
}))

// Mock do firebase/auth
vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: vi.fn().mockImplementation(() => ({})),
  signInWithPopup: () => mockSignInWithPopup()
}))

// Mock do @/plugins/firebase
vi.mock('../../src/plugins/firebase', () => ({
  firebaseAuth: {}
}))

describe('useLoginAuth', () => {
  beforeEach(() => {
    // Resetar mocks antes de cada teste
    vi.clearAllMocks()
  })

  it('deve inicializar com loading falso e erro vazio', () => {
    const { loading, error } = useLoginAuth()
    
    expect(loading.value).toBe(false)
    expect(error.value).toBe('')
  })

  it('deve definir loading como true e erro como vazio ao iniciar login', async () => {
    mockSignInWithPopup.mockResolvedValue({ user: mockUser })
    
    const { loading, error, loginComGoogle } = useLoginAuth()
    
    const loginPromise = loginComGoogle()
    
    // Verificar se loading foi definido como true imediatamente
    expect(loading.value).toBe(true)
    expect(error.value).toBe('')
    
    await loginPromise
  })

  it('deve redirecionar para o dashboard após login bem-sucedido', async () => {
    mockSignInWithPopup.mockResolvedValue({ user: mockUser })
    
    const { loginComGoogle } = useLoginAuth()
    
    await loginComGoogle()
    
    expect(mockRouter.push).toHaveBeenCalledWith('/app/dashboard')
  })

  it('deve definir mensagem de erro quando o login falha', async () => {
    mockSignInWithPopup.mockRejectedValue(new Error('Erro de autenticação'))
    
    const { error, loginComGoogle } = useLoginAuth()
    
    await loginComGoogle()
    
    expect(error.value).toBe('Ocorreu um erro ao tentar fazer o login. Tente novamente.')
  })

  it('deve definir loading como false após o login, independentemente do resultado', async () => {
    mockSignInWithPopup.mockResolvedValue({ user: mockUser })
    
    const { loading, loginComGoogle } = useLoginAuth()
    
    await loginComGoogle()
    
    expect(loading.value).toBe(false)
  })

  it('deve definir loading como false mesmo quando o login falha', async () => {
    mockSignInWithPopup.mockRejectedValue(new Error('Erro de autenticação'))
    
    const { loading, loginComGoogle } = useLoginAuth()
    
    await loginComGoogle()
    
    expect(loading.value).toBe(false)
  })
})