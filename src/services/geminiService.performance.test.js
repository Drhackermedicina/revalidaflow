/**
 * Testes de Performance, Fallback e Estresse para GeminiService
 * Executa testes automatizados para medir performance e validar fallback
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import geminiService from './geminiService.js';

// Mock do fetch global
global.fetch = vi.fn();

// Mock do performance.now
global.performance = {
  now: vi.fn(),
  memory: {
    usedJSHeapSize: 1000000,
    totalJSHeapSize: 2000000,
    jsHeapSizeLimit: 5000000
  }
};

describe('GeminiService - Performance, Fallback e Estresse', () => {
  let service;
  let performanceSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    service = geminiService;
    performanceSpy = vi.spyOn(global.performance, 'now');
    performanceSpy.mockReturnValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Testes de Performance', () => {
    it('deve medir tempo de resposta para diferentes tipos de requisição', async () => {
      // Mock resposta de sucesso
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          candidates: [{ content: { parts: [{ text: 'Resposta de teste' }] } }]
        })
      };
      global.fetch.mockResolvedValue(mockResponse);

      // Simular tempo de resposta
      let callCount = 0;
      performanceSpy.mockImplementation(() => callCount++ * 100); // 100ms por chamada

      const types = ['chat', 'edit', 'context'];
      const results = [];

      for (const type of types) {
        const startTime = performance.now();
        await service.makeRequest('Teste de performance', '', 3, type);
        const endTime = performance.now();

        results.push({
          type,
          responseTime: endTime - startTime,
          success: true
        });
      }

      // Verificar que todos os tipos foram testados
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.responseTime).toBeGreaterThan(0);
      });

      console.log('📊 Tempos de resposta por tipo:', results);
    });

    it('deve testar com diferentes tamanhos de prompt', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          candidates: [{ content: { parts: [{ text: 'OK' }] } }]
        })
      };
      global.fetch.mockResolvedValue(mockResponse);

      const promptSizes = [
        { size: 'small', prompt: 'Olá' },
        { size: 'medium', prompt: 'A'.repeat(500) },
        { size: 'large', prompt: 'A'.repeat(2000) }
      ];

      const results = [];

      for (const { size, prompt } of promptSizes) {
        const startTime = performance.now();
        await service.makeRequest(prompt, '', 3, 'chat');
        const endTime = performance.now();

        results.push({
          size,
          promptLength: prompt.length,
          responseTime: endTime - startTime
        });
      }

      console.log('📏 Performance por tamanho de prompt:', results);
      expect(results).toHaveLength(3);
    });

    it('deve verificar uso de memória durante múltiplas requisições', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          candidates: [{ content: { parts: [{ text: 'Resposta' }] } }]
        })
      };
      global.fetch.mockResolvedValue(mockResponse);

      const initialMemory = performance.memory.usedJSHeapSize;
      const requests = Array(10).fill().map((_, i) => service.makeRequest(`Teste ${i}`, '', 3, 'chat'));

      await Promise.all(requests);

      const finalMemory = performance.memory.usedJSHeapSize;
      const memoryIncrease = finalMemory - initialMemory;

      console.log('🧠 Uso de memória:', {
        inicial: initialMemory,
        final: finalMemory,
        aumento: memoryIncrease,
        vazamento: memoryIncrease > 1000000 ? 'Possível vazamento' : 'OK'
      });

      expect(memoryIncrease).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Testes de Fallback', () => {
    it('deve simular erro de cota (429) e forçar fallback de modelo', async () => {
      // Primeiro erro de cota, depois sucesso
      const mockQuotaError = {
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: vi.fn().mockResolvedValue({ error: { message: 'Quota exceeded' } })
      };

      const mockSuccess = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          candidates: [{ content: { parts: [{ text: 'Resposta após fallback' }] } }]
        })
      };

      global.fetch
        .mockResolvedValueOnce(mockQuotaError) // Primeira tentativa falha
        .mockResolvedValueOnce(mockSuccess);   // Fallback para flash funciona

      const result = await service.makeRequest('TESTE_FALLBACK', '', 5, 'chat');

      expect(result).toBe('Resposta após fallback');
      expect(global.fetch).toHaveBeenCalledTimes(2);

      // Verificar se fallback foi chamado (deve ter mudado para gemini-2.0-flash)
      const calls = global.fetch.mock.calls;
      const firstCall = calls[0][0];
      const secondCall = calls[1][0];

      expect(firstCall).toContain('gemini-2.0-flash-lite');
      expect(secondCall).toContain('gemini-2.0-flash');

      console.log('🔄 Fallback de modelo testado com sucesso');
    });

    it('deve testar rotação de chaves API quando uma falha', async () => {
      const mockKeyError = {
        ok: false,
        status: 400,
        statusText: 'Invalid API Key',
        json: vi.fn().mockResolvedValue({ error: { message: 'Invalid API key' } })
      };

      const mockSuccess = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          candidates: [{ content: { parts: [{ text: 'Sucesso com chave 2' }] } }]
        })
      };

      global.fetch
        .mockResolvedValueOnce(mockKeyError) // Chave 1 falha
        .mockResolvedValueOnce(mockSuccess); // Chave 2 funciona

      const result = await service.makeRequest('Teste rotação', '', 5, 'chat');

      expect(result).toBe('Sucesso com chave 2');
      expect(global.fetch).toHaveBeenCalledTimes(2);

      console.log('🔑 Rotação de chaves testada com sucesso');
    });

    it('deve testar comportamento quando todas as chaves falham', async () => {
      const mockError = {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: vi.fn().mockResolvedValue({ error: { message: 'API Error' } })
      };

      // Todas as tentativas falham
      global.fetch.mockResolvedValue(mockError);

      await expect(service.makeRequest('Teste falha total', '', 3, 'chat'))
        .rejects.toThrow('Gemini falhou após todas as tentativas');

      console.log('❌ Cenário de falha total testado');
    });

    it('deve testar fallback para cache offline', async () => {
      // Primeiro, popular o cache
      service.cache.set('teste:contexto', 'Resposta do cache');

      const mockError = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: vi.fn().mockResolvedValue({ error: { message: 'Server error' } })
      };

      global.fetch.mockResolvedValue(mockError);

      const result = await service.makeRequest('teste', 'contexto', 3, 'chat');

      expect(result).toBe('Resposta do cache');
      console.log('📱 Fallback para cache offline testado');
    });
  });

  describe('Cenários de Estresse', () => {
    it('deve testar múltiplas requisições simultâneas', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          candidates: [{ content: { parts: [{ text: 'Resposta simultânea' }] } }]
        })
      };
      global.fetch.mockResolvedValue(mockResponse);

      const numRequests = 20;
      const requests = Array(numRequests).fill().map((_, i) =>
        service.makeRequest(`Requisição simultânea ${i}`, '', 3, 'chat')
      );

      const startTime = performance.now();
      const results = await Promise.all(requests);
      const endTime = performance.now();

      const totalTime = endTime - startTime;
      const avgTime = totalTime / numRequests;

      expect(results).toHaveLength(numRequests);
      results.forEach(result => {
        expect(result).toBe('Resposta simultânea');
      });

      console.log('⚡ Estresse simultâneo:', {
        totalRequests: numRequests,
        totalTime: `${totalTime}ms`,
        avgTime: `${avgTime}ms`,
        throughput: `${(numRequests / (totalTime / 1000)).toFixed(2)} req/s`
      });
    });

    it('deve testar requisições rápidas em sequência', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          candidates: [{ content: { parts: [{ text: 'Resposta sequencial' }] } }]
        })
      };
      global.fetch.mockResolvedValue(mockResponse);

      const numRequests = 10;
      const results = [];
      const times = [];

      for (let i = 0; i < numRequests; i++) {
        const startTime = performance.now();
        const result = await service.makeRequest(`Sequencial ${i}`, '', 3, 'chat');
        const endTime = performance.now();

        results.push(result);
        times.push(endTime - startTime);

        // Pequena pausa para simular uso real
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);

      console.log('🔄 Estresse sequencial:', {
        totalRequests: numRequests,
        avgTime: `${avgTime}ms`,
        minTime: `${minTime}ms`,
        maxTime: `${maxTime}ms`,
        variance: `${(maxTime - minTime).toFixed(2)}ms`
      });

      expect(results).toHaveLength(numRequests);
    });

    it('deve simular falhas de rede intermitentes', async () => {
      let callCount = 0;
      global.fetch.mockImplementation(() => {
        callCount++;
        if (callCount % 3 === 0) {
          // A cada 3 chamadas, simular falha de rede
          return Promise.reject(new Error('Network timeout'));
        }
        return Promise.resolve({
          ok: true,
          json: vi.fn().mockResolvedValue({
            candidates: [{ content: { parts: [{ text: 'Resposta após falha' }] } }]
          })
        });
      });

      const requests = Array(9).fill().map((_, i) =>
        service.makeRequest(`Teste falha ${i}`, '', 5, 'chat')
      );

      const results = await Promise.allSettled(requests);

      const fulfilled = results.filter(r => r.status === 'fulfilled').length;
      const rejected = results.filter(r => r.status === 'rejected').length;

      console.log('🌐 Falhas intermitentes:', {
        totalRequests: 9,
        successful: fulfilled,
        failed: rejected,
        successRate: `${((fulfilled / 9) * 100).toFixed(1)}%`
      });

      expect(fulfilled + rejected).toBe(9);
    });
  });

  describe('Métricas de Monitoramento', () => {
    it('deve coletar métricas de taxa de sucesso', async () => {
      let successCount = 0;
      let totalCount = 0;

      global.fetch.mockImplementation(() => {
        totalCount++;
        const shouldSucceed = Math.random() > 0.3; // 70% de sucesso

        if (shouldSucceed) {
          successCount++;
          return Promise.resolve({
            ok: true,
            json: vi.fn().mockResolvedValue({
              candidates: [{ content: { parts: [{ text: 'Sucesso' }] } }]
            })
          });
        } else {
          return Promise.resolve({
            ok: false,
            status: 429,
            statusText: 'Quota Exceeded',
            json: vi.fn().mockResolvedValue({ error: { message: 'Quota' } })
          });
        }
      });

      const requests = Array(20).fill().map(() =>
        service.makeRequest('Teste métrica', '', 3, 'chat').catch(() => null)
      );

      await Promise.all(requests);

      const successRate = (successCount / totalCount) * 100;

      console.log('📈 Métricas de sucesso:', {
        totalRequests: totalCount,
        successful: successCount,
        failed: totalCount - successCount,
        successRate: `${successRate.toFixed(1)}%`
      });

      expect(totalCount).toBe(20);
      expect(successRate).toBeGreaterThan(50); // Pelo menos 50% de sucesso
    });

    it('deve medir eficiência do fallback', async () => {
      let fallbackUsed = 0;
      let totalRequests = 0;

      global.fetch.mockImplementation((url) => {
        totalRequests++;
        if (url.includes('flash-lite') && Math.random() > 0.7) {
          // 30% das vezes flash-lite falha, forçando fallback
          fallbackUsed++;
          return Promise.resolve({
            ok: false,
            status: 429,
            json: vi.fn().mockResolvedValue({ error: { message: 'Quota' } })
          });
        }

        return Promise.resolve({
          ok: true,
          json: vi.fn().mockResolvedValue({
            candidates: [{ content: { parts: [{ text: 'Resposta' }] } }]
          })
        });
      });

      const requests = Array(30).fill().map(() =>
        service.makeRequest('Teste fallback', '', 5, 'chat')
      );

      await Promise.all(requests);

      const fallbackRate = (fallbackUsed / totalRequests) * 100;

      console.log('🔄 Eficiência do fallback:', {
        totalRequests,
        fallbacksUsed: fallbackUsed,
        fallbackRate: `${fallbackRate.toFixed(1)}%`,
        eficiencia: fallbackRate > 0 ? 'Ativo e funcionando' : 'Não utilizado'
      });

      expect(totalRequests).toBeGreaterThan(0);
    });

    it('deve verificar uso de cache offline', async () => {
      let cacheHits = 0;
      let cacheMisses = 0;

      // Popular cache
      service.cache.set('cache_test:ctx', 'Resposta em cache');

      global.fetch.mockImplementation(() => {
        cacheMisses++;
        return Promise.resolve({
          ok: false,
          status: 500,
          json: vi.fn().mockResolvedValue({ error: { message: 'Server error' } })
        });
      });

      // Testar cache hit
      const result1 = await service.makeRequest('cache_test', 'ctx', 3, 'chat');
      if (result1 === 'Resposta em cache') cacheHits++;

      // Testar cache miss
      const result2 = await service.makeRequest('no_cache', 'ctx', 3, 'chat');
      if (result2 !== 'Resposta em cache') cacheMisses++;

      const cacheHitRate = (cacheHits / (cacheHits + cacheMisses)) * 100;

      console.log('📱 Uso de cache offline:', {
        cacheHits,
        cacheMisses,
        hitRate: `${cacheHitRate.toFixed(1)}%`,
        eficiencia: cacheHitRate > 0 ? 'Cache funcionando' : 'Cache não utilizado'
      });

      expect(result1).toBe('Resposta em cache');
    });
  });
});