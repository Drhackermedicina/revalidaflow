import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import DebugDashboard from '@/components/DebugDashboard.vue'
import validationLogger from '@/utils/validationLogger'

// Mock validationLogger
vi.mock('@/utils/validationLogger', () => ({
  default: {
    getMetrics: vi.fn(),
    getHealthStatus: vi.fn(),
    getRecentEvents: vi.fn(),
    reset: vi.fn(),
    exportData: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  }
}))

describe('DebugDashboard', () => {
  let wrapper
  let mockMetrics
  let mockHealthStatus
  let mockRecentEvents

  beforeEach(() => {
    // Setup mock data
    mockMetrics = {
      raceConditions: {
        detected: 5,
        prevented: 15,
        successRate: 75.0
      },
      firestore: {
        errors: 2,
        recovered: 18,
        successRate: 90.0
      },
      googleAuth: {
        errors: 1,
        recovered: 9,
        fallbacks: 3,
        successRate: 90.0
      }
    }

    mockHealthStatus = {
      overall: 'healthy',
      raceConditions: 'healthy',
      firestore: 'healthy',
      googleAuth: 'healthy'
    }

    mockRecentEvents = [
      {
        type: 'raceConditionPrevented',
        source: 'fetchUserRole',
        timestamp: '2025-01-01T10:00:00.000Z',
        data: { operationId: 'op-123' }
      },
      {
        type: 'firestoreRecovered',
        source: 'getDocumentWithRetry',
        timestamp: '2025-01-01T10:01:00.000Z',
        data: { operationId: 'fs-456' }
      }
    ]

    // Setup mocks
    validationLogger.getMetrics.mockReturnValue(mockMetrics)
    validationLogger.getHealthStatus.mockReturnValue(mockHealthStatus)
    validationLogger.getRecentEvents.mockReturnValue(mockRecentEvents)

    wrapper = mount(DebugDashboard)
  })

  describe('Rendering', () => {
    it('deve renderizar o componente corretamente', () => {
      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('.debug-dashboard').exists()).toBe(true)
    })

    it('deve exibir o título do dashboard', () => {
      expect(wrapper.text()).toContain('Dashboard de Validação')
    })

    it('deve exibir status geral de saúde', () => {
      expect(wrapper.text()).toContain('Status Geral: healthy')
    })
  })

  describe('Metrics Display', () => {
    it('deve exibir métricas de race conditions', () => {
      const raceSection = wrapper.findAll('.metric-section')[0]
      expect(raceSection.text()).toContain('Race Conditions')
      expect(raceSection.text()).toContain('Detectadas: 5')
      expect(raceSection.text()).toContain('Prevenidas: 15')
      expect(raceSection.text()).toContain('Taxa de Sucesso: 75.0%')
    })

    it('deve exibir métricas de Firestore', () => {
      const firestoreSection = wrapper.findAll('.metric-section')[1]
      expect(firestoreSection.text()).toContain('Firestore')
      expect(firestoreSection.text()).toContain('Erros: 2')
      expect(firestoreSection.text()).toContain('Recuperadas: 18')
      expect(firestoreSection.text()).toContain('Taxa de Sucesso: 90.0%')
    })

    it('deve exibir métricas de Google Auth', () => {
      const authSection = wrapper.findAll('.metric-section')[2]
      expect(authSection.text()).toContain('Google Auth')
      expect(authSection.text()).toContain('Erros: 1')
      expect(authSection.text()).toContain('Recuperadas: 9')
      expect(authSection.text()).toContain('Fallbacks: 3')
      expect(authSection.text()).toContain('Taxa de Sucesso: 90.0%')
    })
  })

  describe('Health Status Indicators', () => {
    it('deve exibir indicadores de saúde corretos', () => {
      const healthIndicators = wrapper.findAll('.health-indicator')

      expect(healthIndicators).toHaveLength(4) // overall + 3 sections

      // Overall health
      expect(healthIndicators[0].classes()).toContain('healthy')
      expect(healthIndicators[0].text()).toContain('healthy')
    })

    it('deve atualizar indicadores quando saúde muda', async () => {
      // Change health status
      mockHealthStatus.overall = 'warning'
      mockHealthStatus.raceConditions = 'critical'

      validationLogger.getHealthStatus.mockReturnValue(mockHealthStatus)

      // Trigger reactivity (in real component this would be automatic)
      await wrapper.vm.$forceUpdate()

      const healthIndicators = wrapper.findAll('.health-indicator')
      expect(healthIndicators[0].classes()).toContain('warning')
      expect(healthIndicators[1].classes()).toContain('critical')
    })
  })

  describe('Recent Events', () => {
    it('deve exibir lista de eventos recentes', () => {
      const eventsList = wrapper.find('.recent-events')
      expect(eventsList.exists()).toBe(true)

      const eventItems = wrapper.findAll('.event-item')
      expect(eventItems).toHaveLength(2)
    })

    it('deve formatar eventos corretamente', () => {
      const firstEvent = wrapper.findAll('.event-item')[0]
      expect(firstEvent.text()).toContain('raceConditionPrevented')
      expect(firstEvent.text()).toContain('fetchUserRole')
      expect(firstEvent.text()).toContain('op-123')
    })

    it('deve limitar número de eventos exibidos', () => {
      // Add more events to mock
      const manyEvents = Array.from({ length: 50 }, (_, i) => ({
        type: 'testEvent',
        source: 'testSource',
        timestamp: `2025-01-01T10:${i.toString().padStart(2, '0')}:00.000Z`,
        data: { id: `event-${i}` }
      }))

      validationLogger.getRecentEvents.mockReturnValue(manyEvents)

      wrapper = mount(DebugDashboard)
      const eventItems = wrapper.findAll('.event-item')

      // Should limit to reasonable number (e.g., 20)
      expect(eventItems.length).toBeLessThanOrEqual(20)
    })
  })

  describe('Controls', () => {
    it('deve ter botão de reset', () => {
      const resetButton = wrapper.find('.reset-button')
      expect(resetButton.exists()).toBe(true)
      expect(resetButton.text()).toContain('Reset')
    })

    it('deve chamar reset quando botão é clicado', async () => {
      const resetButton = wrapper.find('.reset-button')
      await resetButton.trigger('click')

      expect(validationLogger.reset).toHaveBeenCalled()
    })

    it('deve ter botão de export', () => {
      const exportButton = wrapper.find('.export-button')
      expect(exportButton.exists()).toBe(true)
      expect(exportButton.text()).toContain('Export')
    })

    it('deve chamar export quando botão é clicado', async () => {
      const exportButton = wrapper.find('.export-button')
      await exportButton.trigger('click')

      expect(validationLogger.exportData).toHaveBeenCalled()
    })

    it('deve ter toggle para auto-refresh', () => {
      const autoRefreshToggle = wrapper.find('.auto-refresh-toggle')
      expect(autoRefreshToggle.exists()).toBe(true)
    })
  })

  describe('Real-time Updates', () => {
    it('deve se inscrever em eventos do logger na montagem', () => {
      expect(validationLogger.addEventListener).toHaveBeenCalledWith(
        'validationUpdate',
        expect.any(Function)
      )
    })

    it('deve se desinscrever de eventos na desmontagem', () => {
      const mockListener = vi.fn()
      validationLogger.addEventListener.mockReturnValue(mockListener)

      wrapper = mount(DebugDashboard)
      wrapper.unmount()

      expect(validationLogger.removeEventListener).toHaveBeenCalledWith(
        'validationUpdate',
        mockListener
      )
    })

    it('deve atualizar dados quando evento é recebido', () => {
      const updateHandler = validationLogger.addEventListener.mock.calls[0][1]

      // Simulate event
      updateHandler()

      // Should refresh data
      expect(validationLogger.getMetrics).toHaveBeenCalledTimes(2) // once on mount, once on update
      expect(validationLogger.getHealthStatus).toHaveBeenCalledTimes(2)
      expect(validationLogger.getRecentEvents).toHaveBeenCalledTimes(2)
    })
  })

  describe('Auto-refresh', () => {
    it('deve iniciar auto-refresh quando toggle está ativo', async () => {
      vi.useFakeTimers()

      const toggle = wrapper.find('.auto-refresh-toggle input')
      await toggle.setValue(true)

      // Fast-forward time
      vi.advanceTimersByTime(5000) // 5 seconds

      expect(validationLogger.getMetrics).toHaveBeenCalledTimes(2) // initial + refresh

      vi.useRealTimers()
    })

    it('deve parar auto-refresh quando toggle está desativo', async () => {
      vi.useFakeTimers()

      const toggle = wrapper.find('.auto-refresh-toggle input')
      await toggle.setValue(false)

      // Fast-forward time
      vi.advanceTimersByTime(10000) // 10 seconds

      expect(validationLogger.getMetrics).toHaveBeenCalledTimes(1) // only initial

      vi.useRealTimers()
    })
  })

  describe('Error Handling', () => {
    it('deve lidar com erro ao obter métricas', () => {
      validationLogger.getMetrics.mockImplementation(() => {
        throw new Error('Failed to get metrics')
      })

      // Should not crash the component
      expect(() => mount(DebugDashboard)).not.toThrow()
    })

    it('deve mostrar mensagem de erro quando falha ao carregar dados', () => {
      validationLogger.getMetrics.mockImplementation(() => {
        throw new Error('Network error')
      })

      wrapper = mount(DebugDashboard)

      expect(wrapper.text()).toContain('Erro ao carregar dados')
    })
  })
})