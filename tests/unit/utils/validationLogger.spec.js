import { describe, it, expect, beforeEach, vi } from 'vitest'
import validationLogger from '@/utils/validationLogger'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

describe('ValidationLogger', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset singleton instance
    validationLogger.reset()
  })

  describe('Race Condition Logging', () => {
    it('deve logar race condition detectada', () => {
      const mockEvent = vi.fn()
      validationLogger.addEventListener('raceConditionDetected', mockEvent)

      validationLogger.logRaceConditionDetected('fetchUserRole', {
        operationId: 'test-op-123',
        concurrentCalls: 3
      })

      expect(mockEvent).toHaveBeenCalledWith({
        type: 'raceConditionDetected',
        source: 'fetchUserRole',
        data: {
          operationId: 'test-op-123',
          concurrentCalls: 3
        },
        timestamp: expect.any(String)
      })
    })

    it('deve logar race condition prevenida', () => {
      const mockEvent = vi.fn()
      validationLogger.addEventListener('raceConditionPrevented', mockEvent)

      validationLogger.logRaceConditionPrevented('fetchUserRole', {
        operationId: 'test-op-456',
        mutexAcquired: true
      })

      expect(mockEvent).toHaveBeenCalledWith({
        type: 'raceConditionPrevented',
        source: 'fetchUserRole',
        data: {
          operationId: 'test-op-456',
          mutexAcquired: true
        },
        timestamp: expect.any(String)
      })
    })
  })

  describe('Firestore Error Logging', () => {
    it('deve logar erro de conexão Firestore', () => {
      const mockEvent = vi.fn()
      validationLogger.addEventListener('firestoreError', mockEvent)

      validationLogger.logFirestoreError('getDocumentWithRetry', {
        operationId: 'firestore-op-123',
        errorCode: 'unavailable',
        errorMessage: 'Service unavailable'
      })

      expect(mockEvent).toHaveBeenCalledWith({
        type: 'firestoreError',
        source: 'getDocumentWithRetry',
        data: {
          operationId: 'firestore-op-123',
          errorCode: 'unavailable',
          errorMessage: 'Service unavailable'
        },
        timestamp: expect.any(String)
      })
    })

    it('deve logar recuperação de operação Firestore', () => {
      const mockEvent = vi.fn()
      validationLogger.addEventListener('firestoreRecovered', mockEvent)

      validationLogger.logFirestoreRecovered('updateDocumentWithRetry', {
        operationId: 'firestore-op-456',
        retryCount: 2,
        totalTime: 1500
      })

      expect(mockEvent).toHaveBeenCalledWith({
        type: 'firestoreRecovered',
        source: 'updateDocumentWithRetry',
        data: {
          operationId: 'firestore-op-456',
          retryCount: 2,
          totalTime: 1500
        },
        timestamp: expect.any(String)
      })
    })
  })

  describe('Google Auth Logging', () => {
    it('deve logar erro de autenticação Google', () => {
      const mockEvent = vi.fn()
      validationLogger.addEventListener('googleAuthError', mockEvent)

      validationLogger.logGoogleAuthError('loginComGoogle', {
        loginId: 'auth-123',
        errorCode: 'auth/popup-blocked',
        errorMessage: 'Popup blocked'
      })

      expect(mockEvent).toHaveBeenCalledWith({
        type: 'googleAuthError',
        source: 'loginComGoogle',
        data: {
          loginId: 'auth-123',
          errorCode: 'auth/popup-blocked',
          errorMessage: 'Popup blocked'
        },
        timestamp: expect.any(String)
      })
    })

    it('deve logar recuperação de autenticação Google', () => {
      const mockEvent = vi.fn()
      validationLogger.addEventListener('googleAuthRecovered', mockEvent)

      validationLogger.logGoogleAuthRecovered('processarRedirectResult', {
        redirectId: 'redirect-456',
        method: 'redirect',
        uid: 'user-123'
      })

      expect(mockEvent).toHaveBeenCalledWith({
        type: 'googleAuthRecovered',
        source: 'processarRedirectResult',
        data: {
          redirectId: 'redirect-456',
          method: 'redirect',
          uid: 'user-123'
        },
        timestamp: expect.any(String)
      })
    })

    it('deve logar fallback de autenticação Google', () => {
      const mockEvent = vi.fn()
      validationLogger.addEventListener('googleAuthFallback', mockEvent)

      validationLogger.logGoogleAuthFallback('loginComGoogle', {
        loginId: 'auth-789',
        fromMethod: 'popup',
        toMethod: 'redirect'
      })

      expect(mockEvent).toHaveBeenCalledWith({
        type: 'googleAuthFallback',
        source: 'loginComGoogle',
        data: {
          loginId: 'auth-789',
          fromMethod: 'popup',
          toMethod: 'redirect'
        },
        timestamp: expect.any(String)
      })
    })
  })

  describe('Metrics Calculation', () => {
    it('deve calcular métricas de race conditions', () => {
      // Simular alguns eventos
      validationLogger.logRaceConditionDetected('fetchUserRole', { operationId: 'op1' })
      validationLogger.logRaceConditionPrevented('fetchUserRole', { operationId: 'op2' })
      validationLogger.logRaceConditionDetected('fetchUserRole', { operationId: 'op3' })

      const metrics = validationLogger.getMetrics()

      expect(metrics.raceConditions.detected).toBe(2)
      expect(metrics.raceConditions.prevented).toBe(1)
      expect(metrics.raceConditions.successRate).toBe(33.33) // 1/3 * 100
    })

    it('deve calcular métricas de Firestore', () => {
      // Simular alguns eventos
      validationLogger.logFirestoreError('getDocumentWithRetry', { operationId: 'fs1' })
      validationLogger.logFirestoreRecovered('getDocumentWithRetry', { operationId: 'fs2' })
      validationLogger.logFirestoreRecovered('getDocumentWithRetry', { operationId: 'fs3' })

      const metrics = validationLogger.getMetrics()

      expect(metrics.firestore.errors).toBe(1)
      expect(metrics.firestore.recovered).toBe(2)
      expect(metrics.firestore.successRate).toBe(66.67) // 2/3 * 100
    })

    it('deve calcular métricas de Google Auth', () => {
      // Simular alguns eventos
      validationLogger.logGoogleAuthError('loginComGoogle', { loginId: 'g1' })
      validationLogger.logGoogleAuthRecovered('loginComGoogle', { loginId: 'g2' })
      validationLogger.logGoogleAuthFallback('loginComGoogle', { loginId: 'g3' })

      const metrics = validationLogger.getMetrics()

      expect(metrics.googleAuth.errors).toBe(1)
      expect(metrics.googleAuth.recovered).toBe(1)
      expect(metrics.googleAuth.fallbacks).toBe(1)
      expect(metrics.googleAuth.successRate).toBe(50) // 1/2 * 100
    })
  })

  describe('Health Status', () => {
    it('deve retornar status saudável quando métricas estão boas', () => {
      // Simular operações bem-sucedidas
      validationLogger.logRaceConditionPrevented('fetchUserRole', {})
      validationLogger.logFirestoreRecovered('getDocumentWithRetry', {})
      validationLogger.logGoogleAuthRecovered('loginComGoogle', {})

      const health = validationLogger.getHealthStatus()

      expect(health.overall).toBe('healthy')
      expect(health.raceConditions).toBe('healthy')
      expect(health.firestore).toBe('healthy')
      expect(health.googleAuth).toBe('healthy')
    })

    it('deve retornar status de alerta quando há muitos erros', () => {
      // Simular muitos erros
      for (let i = 0; i < 10; i++) {
        validationLogger.logRaceConditionDetected('fetchUserRole', {})
        validationLogger.logFirestoreError('getDocumentWithRetry', {})
        validationLogger.logGoogleAuthError('loginComGoogle', {})
      }

      const health = validationLogger.getHealthStatus()

      expect(health.overall).toBe('critical')
      expect(health.raceConditions).toBe('critical')
      expect(health.firestore).toBe('critical')
      expect(health.googleAuth).toBe('critical')
    })
  })

  describe('Persistence', () => {
    it('deve salvar métricas no localStorage', () => {
      validationLogger.logRaceConditionPrevented('fetchUserRole', {})

      // Simular chamada de save
      validationLogger.saveToStorage()

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'validationLogger_metrics',
        expect.any(String)
      )
    })

    it('deve carregar métricas do localStorage', () => {
      const mockData = {
        raceConditions: { detected: 1, prevented: 2 },
        firestore: { errors: 0, recovered: 3 },
        googleAuth: { errors: 1, recovered: 1, fallbacks: 0 }
      }

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockData))

      validationLogger.loadFromStorage()

      const metrics = validationLogger.getMetrics()
      expect(metrics.raceConditions.detected).toBe(1)
      expect(metrics.raceConditions.prevented).toBe(2)
      expect(metrics.firestore.recovered).toBe(3)
    })
  })

  describe('Event System', () => {
    it('deve permitir adicionar e remover event listeners', () => {
      const mockEvent = vi.fn()
      const listener = validationLogger.addEventListener('raceConditionDetected', mockEvent)

      validationLogger.logRaceConditionDetected('test', {})

      expect(mockEvent).toHaveBeenCalledTimes(1)

      // Remover listener
      validationLogger.removeEventListener('raceConditionDetected', listener)

      validationLogger.logRaceConditionDetected('test', {})

      expect(mockEvent).toHaveBeenCalledTimes(1) // Não deve ser chamado novamente
    })
  })
})