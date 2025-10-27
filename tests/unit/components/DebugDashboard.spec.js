
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import DebugDashboard from '@/components/DebugDashboard.vue';
import { ref } from 'vue';

// Mock a implementação completa do validationLogger
const mockValidationLogger = {
  getMetrics: vi.fn(() => ({
    raceConditions: { detected: 1, prevented: 9, total: 10 },
    firestoreErrors: { connectionErrors: 2, proxyErrors: 1, recovered: 5, total: 8 },
    googleAuthErrors: { popupBlocked: 3, crossOriginPolicy: 1, fallbackRedirect: 2, recovered: 4, total: 10 },
  })),
  getEvents: vi.fn(() => [
    { type: 'race_condition_detected', operation: 'test', timestamp: new Date().toISOString(), details: {} },
    { type: 'firestore_connection_error', operation: 'test', timestamp: new Date().toISOString(), details: {} },
  ]),
  calculateHealthStatus: vi.fn(() => ({
    overall: 'warning',
    raceConditions: { status: 'healthy' },
    firestore: { status: 'warning' },
    googleAuth: { status: 'critical' },
  })),
  resetMetrics: vi.fn(),
  generateStatusReport: vi.fn(() => ({ /* mock report */ })),
  // Simula o sistema de eventos global
  __listeners: new Map(),
  addEventListener(event, callback) {
    if (!this.__listeners.has(event)) {
      this.__listeners.set(event, []);
    }
    this.__listeners.get(event).push(callback);
  },
  removeEventListener(event, callback) {
    if (this.__listeners.has(event)) {
      const callbacks = this.__listeners.get(event).filter(cb => cb !== callback);
      this.__listeners.set(event, callbacks);
    }
  },
  _emit(event, data) {
    if (this.__listeners.has(event)) {
      this.__listeners.get(event).forEach(cb => cb({ detail: data }));
    }
  }
};

vi.mock('@/utils/validationLogger', () => ({
  default: mockValidationLogger,
}));

describe('DebugDashboard', () => {
  let wrapper;

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    
    // Mount o componente com mocks
    wrapper = mount(DebugDashboard, {
      global: {
        stubs: {
          VCard: { template: '<div><slot name="title"/><slot/></div>' },
          VCardTitle: { template: '<div><slot/></div>' },
          VCardText: { template: '<div><slot/></div>' },
          VRow: { template: '<div><slot/></div>' },
          VCol: { template: '<div><slot/></div>' },
          VAlert: { template: '<div><slot/></div>' },
          VChip: { template: '<div><slot/></div>' },
          VBtn: { template: '<button><slot/></button>' },
          VIcon: { template: '<i></i>' },
          VProgressLinear: { template: '<div class="v-progress-linear"></div>' },
          VDialog: { template: '<div><slot/></div>' },
          VTimeline: { template: '<div><slot/></div>' },
          VTimelineItem: { template: '<div><slot/></div>' },
        }
      }
    });
  });

  it('deve renderizar o componente corretamente', () => {
    expect(wrapper.exists()).toBe(true);
    expect(wrapper.html()).toContain('Dashboard de Validação');
  });

  it('deve exibir status geral de saúde', () => {
    mockValidationLogger.calculateHealthStatus.mockReturnValue({ overall: 'critical' });
    // Re-mount or trigger update if necessary
    wrapper = mount(DebugDashboard, { global: { stubs: { VAlert: true } } });
    expect(wrapper.html()).toContain('critical');
  });

  it('deve exibir métricas corretamente', () => {
    expect(mockValidationLogger.getMetrics).toHaveBeenCalled();
    expect(wrapper.html()).toContain('Race Conditions');
    expect(wrapper.html()).toContain('10'); // total
  });

  it('deve exibir eventos recentes', () => {
    expect(mockValidationLogger.getEvents).toHaveBeenCalled();
    expect(wrapper.findAll('.v-timeline-item').length).toBe(2);
  });

  it('deve chamar resetMetrics ao clicar no botão', async () => {
    await wrapper.find('button[title="Resetar Métricas"]').trigger('click');
    expect(mockValidationLogger.resetMetrics).toHaveBeenCalled();
  });

  it('deve chamar generateStatusReport ao clicar em exportar', async () => {
    await wrapper.find('button[title="Exportar Relatório"]').trigger('click');
    expect(mockValidationLogger.generateStatusReport).toHaveBeenCalled();
  });

  it('deve atualizar em tempo real ao receber um novo evento', async () => {
    const newEvent = { type: 'google_auth_recovered', operation: 'realtime', timestamp: new Date().toISOString(), details: {} };
    
    // Simula a emissão do evento global que o componente escuta
    const customEvent = new CustomEvent('validationLogger:event', { detail: newEvent });
    window.dispatchEvent(customEvent);

    await wrapper.vm.$nextTick();

    expect(wrapper.html()).toContain('google_auth_recovered');
  });
});
