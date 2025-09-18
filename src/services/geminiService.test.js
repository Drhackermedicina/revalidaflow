import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import geminiService from './geminiService.js';

// Mock do fetch global
global.fetch = vi.fn();

describe('GeminiService', () => {
  let service;

  beforeEach(() => {
    vi.clearAllMocks();
    // Usar a instância singleton para testes
    service = geminiService;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('testKey', () => {
    it('deve retornar true para chave válida', async () => {
      // Mock da resposta de sucesso
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ candidates: [{ content: { parts: [{ text: 'OK' }] } }] })
      };
      global.fetch.mockResolvedValue(mockResponse);

      const result = await service.testKey('valid-api-key');

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=valid-api-key',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining('Teste de chave API')
        })
      );
    });

    it('deve retornar false para chave inválida', async () => {
      // Mock da resposta de erro
      const mockResponse = {
        ok: false,
        status: 400,
        statusText: 'Bad Request'
      };
      global.fetch.mockResolvedValue(mockResponse);

      const result = await service.testKey('invalid-api-key');

      expect(result).toBe(false);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('deve retornar false em caso de erro de rede', async () => {
      // Mock de erro de rede
      global.fetch.mockRejectedValue(new Error('Network error'));

      const result = await service.testKey('api-key');

      expect(result).toBe(false);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('deve fazer requisição para o endpoint correto', async () => {
      const mockResponse = { ok: true };
      global.fetch.mockResolvedValue(mockResponse);

      await service.testKey('test-key');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=test-key',
        expect.any(Object)
      );
    });
  });

  describe('testModel', () => {
    it('deve retornar true quando o modelo responde corretamente', async () => {
      // Mock do makeRequest para retornar resposta esperada
      const makeRequestSpy = vi.spyOn(service, 'makeRequest').mockResolvedValue('Modelo funcionando corretamente.');

      const result = await service.testModel();

      expect(result).toBe(true);
      expect(makeRequestSpy).toHaveBeenCalledWith('Responda apenas "Modelo funcionando".', '', 3, 'chat');
    });

    it('deve retornar false quando o modelo falha', async () => {
      // Mock do makeRequest para falhar
      const makeRequestSpy = vi.spyOn(service, 'makeRequest').mockRejectedValue(new Error('Model failed'));

      const result = await service.testModel();

      expect(result).toBe(false);
      expect(makeRequestSpy).toHaveBeenCalledWith('Responda apenas "Modelo funcionando".', '', 3, 'chat');
    });

    it('deve retornar false quando a resposta não contém o texto esperado', async () => {
      // Mock do makeRequest para retornar resposta incorreta
      const makeRequestSpy = vi.spyOn(service, 'makeRequest').mockResolvedValue('Resposta incorreta');

      const result = await service.testModel();

      expect(result).toBe(false);
      expect(makeRequestSpy).toHaveBeenCalledWith('Responda apenas "Modelo funcionando".', '', 3, 'chat');
    });

    it('deve usar o tipo "chat" e prompt correto', async () => {
      const makeRequestSpy = vi.spyOn(service, 'makeRequest').mockResolvedValue('Modelo funcionando.');

      await service.testModel();

      expect(makeRequestSpy).toHaveBeenCalledWith(
        'Responda apenas "Modelo funcionando".',
        '',
        3,
        'chat'
      );
    });
  });

  describe('getModelForType', () => {
    it('deve retornar "gemini-2.0-flash-lite" para tipo "chat"', () => {
      const result = service.getModelForType('chat');
      expect(result).toBe('gemini-2.0-flash-lite');
    });

    it('deve retornar "gemini-2.0-flash-lite" para tipo "edit"', () => {
      const result = service.getModelForType('edit');
      expect(result).toBe('gemini-2.0-flash-lite');
    });

    it('deve retornar "gemini-2.5-flash" para tipo "context"', () => {
      const result = service.getModelForType('context');
      expect(result).toBe('gemini-2.5-flash');
    });

    it('deve retornar modelo padrão "gemini-2.0-flash-lite" para tipo inválido', () => {
      const result = service.getModelForType('invalid-type');
      expect(result).toBe('gemini-2.0-flash-lite');
    });

    it('deve retornar modelo padrão "gemini-2.0-flash-lite" quando tipo não é fornecido', () => {
      const result = service.getModelForType();
      expect(result).toBe('gemini-2.0-flash-lite');
    });
  });
});