import { describe, it, expect, beforeEach, vi } from 'vitest'
import validationLogger from '@/utils/validationLogger'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('ValidationLogger', () => {
  let dispatchEventSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    validationLogger.resetMetrics();
    // Spy on window.dispatchEvent to check for events
    dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');
  });

  describe('Race Condition Logging', () => {
    it('deve disparar evento para race condition detectada', () => {
      const details = { operationId: 'test-op-123', concurrentCalls: 3 };
      validationLogger.logRaceConditionDetected('fetchUserRole', details);

      expect(dispatchEventSpy).toHaveBeenCalledOnce();
      const event = dispatchEventSpy.mock.calls[0][0];
      expect(event.type).toBe('validationLogger:event');
      expect(event.detail.type).toBe('race_condition_detected');
      expect(event.detail.operation).toBe('fetchUserRole');
      expect(event.detail.details).toEqual(details);
    });

    it('deve disparar evento para race condition prevenida', () => {
      const details = { operationId: 'test-op-456', mutexAcquired: true };
      validationLogger.logRaceConditionPrevented('fetchUserRole', details);

      expect(dispatchEventSpy).toHaveBeenCalledOnce();
      const event = dispatchEventSpy.mock.calls[0][0];
      expect(event.detail.type).toBe('race_condition_prevented');
      expect(event.detail.operation).toBe('fetchUserRole');
      expect(event.detail.details).toEqual(details);
    });
  });

  describe('Firestore Error Logging', () => {
    it('deve disparar evento para erro de conexão Firestore', () => {
      const error = { code: 'unavailable', message: 'Service unavailable', name: 'FirestoreError' };
      validationLogger.logFirestoreConnectionError('getDocument', error, { retry: 1 });

      expect(dispatchEventSpy).toHaveBeenCalledOnce();
      const event = dispatchEventSpy.mock.calls[0][0];
      expect(event.detail.type).toBe('firestore_connection_error');
      expect(event.detail.error).toEqual(error);
    });

    it('deve disparar evento para recuperação de operação Firestore', () => {
      validationLogger.logFirestoreRecovered('getDocument', { retries: 2 });

      expect(dispatchEventSpy).toHaveBeenCalledOnce();
      const event = dispatchEventSpy.mock.calls[0][0];
      expect(event.detail.type).toBe('firestore_recovered');
      expect(event.detail.details).toEqual({ retries: 2 });
    });
  });

  describe('Google Auth Logging', () => {
    it('deve disparar evento para erro de autenticação Google', () => {
      validationLogger.logGoogleAuthPopupBlocked('login', { userAgent: 'test' });

      expect(dispatchEventSpy).toHaveBeenCalledOnce();
      const event = dispatchEventSpy.mock.calls[0][0];
      expect(event.detail.type).toBe('google_auth_popup_blocked');
    });

    it('deve disparar evento para recuperação de autenticação Google', () => {
      validationLogger.logGoogleAuthRecovered('login', { method: 'redirect' });

      expect(dispatchEventSpy).toHaveBeenCalledOnce();
      const event = dispatchEventSpy.mock.calls[0][0];
      expect(event.detail.type).toBe('google_auth_recovered');
    });

    it('deve disparar evento para fallback de autenticação Google', () => {
      validationLogger.logGoogleAuthFallbackRedirect('login');

      expect(dispatchEventSpy).toHaveBeenCalledOnce();
      const event = dispatchEventSpy.mock.calls[0][0];
      expect(event.detail.type).toBe('google_auth_fallback_redirect');
    });
  });

  describe('Metrics Calculation', () => {
    it('deve calcular métricas corretamente', () => {
      validationLogger.logRaceConditionDetected('op1');
      validationLogger.logRaceConditionPrevented('op2');
      validationLogger.logRaceConditionDetected('op3');

      const metrics = validationLogger.getMetrics();
      expect(metrics.raceConditions.detected).toBe(2);
      expect(metrics.raceConditions.prevented).toBe(1);
      expect(metrics.raceConditions.total).toBe(3);
    });
  });

  describe('Health Status', () => {
    it('deve retornar status saudável quando métricas estão boas', () => {
      validationLogger.logRaceConditionPrevented('op');
      const health = validationLogger.calculateHealthStatus();
      expect(health.overall).toBe('healthy');
    });

    it('deve retornar status crítico quando há muitos erros', () => {
      for (let i = 0; i < 10; i++) {
        validationLogger.logRaceConditionDetected('op');
      }
      const health = validationLogger.calculateHealthStatus();
      expect(health.overall).toBe('critical');
    });
  });

  describe('Persistence', () => {
    it('deve salvar métricas no localStorage', () => {
      validationLogger.logRaceConditionPrevented('op');
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'validationLogger_metrics',
        expect.stringContaining('"prevented":1')
      );
    });

    it('deve carregar métricas do localStorage', () => {
      const mockData = {
        metrics: {
          raceConditions: { detected: 10, prevented: 5, total: 15 }
        },
        sessionId: 'test',
        lastUpdated: new Date().toISOString()
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockData));
      
      // Reset and load
      validationLogger.resetMetrics();
      validationLogger.loadPersistedMetrics();

      const metrics = validationLogger.getMetrics();
      expect(metrics.raceConditions.detected).toBe(10);
      expect(metrics.raceConditions.prevented).toBe(5);
    });
  });
});
