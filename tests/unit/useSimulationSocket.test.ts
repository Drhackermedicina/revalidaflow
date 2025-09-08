import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useSimulationSocket } from '../../src/composables/useSimulationSocket'

// Mock do socket.io-client
const mockSocket = {
  on: vi.fn(),
  disconnect: vi.fn(),
  connected: false
}

vi.mock('socket.io-client', () => ({
  io: () => mockSocket
}))

describe('useSimulationSocket', () => {
  const mockOptions = {
    backendUrl: 'http://localhost:3000',
    sessionId: 'test-session',
    userId: 'test-user',
    role: 'candidate',
    stationId: 'test-station',
    displayName: 'Test User'
  }

  beforeEach(() => {
    // Resetar mocks antes de cada teste
    vi.clearAllMocks()
  })

  it('deve inicializar com status de conexão "Desconectado"', () => {
    const { connectionStatus } = useSimulationSocket(mockOptions)
    
    expect(connectionStatus.value).toBe('Desconectado')
  })

  it('deve definir o status como "Conectando" ao chamar connect', () => {
    const { connectionStatus, connect } = useSimulationSocket(mockOptions)
    
    connect()
    
    expect(connectionStatus.value).toBe('Conectando')
  })

  it('deve desconectar o socket ao chamar disconnect', () => {
    const { socket, connectionStatus, connect, disconnect } = useSimulationSocket(mockOptions)
    
    connect()
    disconnect()
    
    expect(mockSocket.disconnect).toHaveBeenCalled()
    expect(connectionStatus.value).toBe('Desconectado')
    expect(socket.value).toBeNull()
  })
})