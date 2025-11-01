/**
 * SessionIntegration Tests
 * Testes básicos para validação da integração de sessões distribuídas
 */

const SessionIntegration = require('./SessionIntegration');
const admin = require('firebase-admin');

// Mock do Firebase Admin para testes
jest.mock('firebase-admin', () => ({
  firestore: () => ({
    collection: () => ({
      doc: () => ({
        set: jest.fn().mockResolvedValue(),
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({ sessionId: 'test', status: 'active' })
        }),
        update: jest.fn().mockResolvedValue()
      }),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({
        docs: []
      })
    })
  })
}));

describe('SessionIntegration', () => {
  let sessionIntegration;
  let mockFirestore;

  beforeEach(() => {
    mockFirestore = admin.firestore();
    sessionIntegration = new SessionIntegration(mockFirestore, {
      distributedMode: false // Usar modo memória para testes
    });
  });

  afterEach(async () => {
    if (sessionIntegration) {
      await sessionIntegration.shutdown();
    }
  });

  describe('Inicialização', () => {
    test('deve inicializar com configurações padrão', () => {
      expect(sessionIntegration).toBeDefined();
      expect(sessionIntegration.distributedMode).toBe(false);
      expect(sessionIntegration.memorySessions).toBeDefined();
      expect(sessionIntegration.userIdToSocketId).toBeDefined();
    });

    test('deve configurar modo distribuído quando especificado', () => {
      const distributedIntegration = new SessionIntegration(mockFirestore, {
        distributedMode: true
      });
      expect(distributedIntegration.distributedMode).toBe(true);
    });
  });

  describe('Gerenciamento de Sessões', () => {
    test('deve criar sessão em memória', async () => {
      const sessionId = 'test-session-1';
      const sessionData = {
        stationId: 'station-123',
        creatorId: 'user-456'
      };

      const session = await sessionIntegration.createSession(sessionId, sessionData);

      expect(session).toBeDefined();
      expect(sessionIntegration.memorySessions.has(sessionId)).toBe(true);

      const storedSession = sessionIntegration.memorySessions.get(sessionId);
      expect(storedSession.stationId).toBe(sessionData.stationId);
      expect(storedSession.isDistributed).toBe(false);
    });

    test('deve buscar sessão existente', async () => {
      const sessionId = 'test-session-2';
      const sessionData = { stationId: 'station-456' };

      await sessionIntegration.createSession(sessionId, sessionData);
      const retrievedSession = await sessionIntegration.getSession(sessionId);

      expect(retrievedSession).toBeDefined();
      expect(retrievedSession.stationId).toBe(sessionData.stationId);
    });

    test('deve retornar null para sessão inexistente', async () => {
      const session = await sessionIntegration.getSession('non-existent');
      expect(session).toBeNull();
    });

    test('deve verificar se sessão existe', async () => {
      const sessionId = 'test-session-3';

      // Antes de criar
      expect(await sessionIntegration.hasSession(sessionId)).toBe(false);

      // Criar sessão
      await sessionIntegration.createSession(sessionId, { stationId: 'station-789' });

      // Depois de criar
      expect(await sessionIntegration.hasSession(sessionId)).toBe(true);
    });
  });

  describe('Gerenciamento de Participantes', () => {
    test('deve adicionar participante à sessão', async () => {
      const sessionId = 'test-session-4';
      const userId = 'user-123';
      const participantData = {
        socketId: 'socket-456',
        role: 'actor',
        displayName: 'Test User'
      };

      await sessionIntegration.createSession(sessionId, { stationId: 'station-111' });
      const result = await sessionIntegration.addParticipant(sessionId, userId, participantData);

      expect(result).toBe(true);

      const session = sessionIntegration.memorySessions.get(sessionId);
      expect(session.participants.has(userId)).toBe(true);

      const participant = session.participants.get(userId);
      expect(participant.socketId).toBe(participantData.socketId);
      expect(participant.role).toBe(participantData.role);
      expect(participant.displayName).toBe(participantData.displayName);
    });

    test('deve remover participante da sessão', async () => {
      const sessionId = 'test-session-5';
      const userId = 'user-789';
      const participantData = {
        socketId: 'socket-999',
        role: 'candidate',
        displayName: 'Candidate User'
      };

      await sessionIntegration.createSession(sessionId, { stationId: 'station-222' });
      await sessionIntegration.addParticipant(sessionId, userId, participantData);

      const removeResult = await sessionIntegration.removeParticipant(sessionId, userId);
      expect(removeResult).toBe(true);

      const session = sessionIntegration.memorySessions.get(sessionId);
      expect(session.participants.has(userId)).toBe(false);
    });

    test('deve falhar ao adicionar participante em sessão inexistente', async () => {
      const result = await sessionIntegration.addParticipant(
        'non-existent-session',
        'user-123',
        { socketId: 'socket-456', role: 'actor' }
      );
      expect(result).toBe(false);
    });
  });

  describe('Gerenciamento de Timer', () => {
    test('deve atualizar timer da sessão', async () => {
      const sessionId = 'test-session-6';
      const timerData = {
        remainingTime: 300,
        isPaused: false
      };

      await sessionIntegration.createSession(sessionId, { stationId: 'station-333' });
      const result = await sessionIntegration.updateTimer(sessionId, timerData);

      expect(result).toBe(true);

      const session = sessionIntegration.memorySessions.get(sessionId);
      expect(session.timer).toBeDefined();
      expect(session.timer.remainingTime).toBe(timerData.remainingTime);
      expect(session.timer.isPaused).toBe(timerData.isPaused);
    });

    test('deve falhar ao atualizar timer de sessão inexistente', async () => {
      const result = await sessionIntegration.updateTimer('non-existent', {
        remainingTime: 300,
        isPaused: false
      });
      expect(result).toBe(false);
    });
  });

  describe('Mapeamento userId -> socketId', () => {
    test('deve mapear userId para socketId', () => {
      const userId = 'user-456';
      const socketId = 'socket-789';

      sessionIntegration.setUserSocketId(userId, socketId);
      expect(sessionIntegration.getSocketIdByUserId(userId)).toBe(socketId);
    });

    test('deve remover mapeamento userId -> socketId', () => {
      const userId = 'user-111';
      const socketId = 'socket-222';

      sessionIntegration.setUserSocketId(userId, socketId);
      expect(sessionIntegration.getSocketIdByUserId(userId)).toBe(socketId);

      sessionIntegration.removeUserSocketId(userId);
      expect(sessionIntegration.getSocketIdByUserId(userId)).toBeNull();
    });

    test('deve retornar null para userId não mapeado', () => {
      const result = sessionIntegration.getSocketIdByUserId('non-existent-user');
      expect(result).toBeNull();
    });
  });

  describe('Estatísticas', () => {
    test('deve retornar estatísticas básicas', () => {
      const stats = sessionIntegration.getStats();

      expect(stats).toBeDefined();
      expect(stats.distributedMode).toBe(false);
      expect(stats.sessionsCreated).toBe(0);
      expect(stats.participantsJoined).toBe(0);
      expect(stats.memory).toBeDefined();
      expect(stats.memory.memorySessionCount).toBe(0);
      expect(stats.memory.userIdToSocketIdCount).toBe(0);
    });

    test('deve atualizar estatísticas após operações', async () => {
      const sessionId = 'test-session-7';
      const userId = 'user-555';

      await sessionIntegration.createSession(sessionId, { stationId: 'station-444' });
      await sessionIntegration.addParticipant(sessionId, userId, {
        socketId: 'socket-666',
        role: 'actor',
        displayName: 'Stats User'
      });

      const stats = sessionIntegration.getStats();
      expect(stats.sessionsCreated).toBe(1);
      expect(stats.participantsJoined).toBe(1);
      expect(stats.memory.memorySessionCount).toBe(1);
    });
  });

  describe('Listagem de Sessões', () => {
    test('deve listar sessões ativas', async () => {
      await sessionIntegration.createSession('session-1', { stationId: 'station-1' });
      await sessionIntegration.createSession('session-2', { stationId: 'station-2' });

      const activeSessions = await sessionIntegration.listActiveSessions();
      expect(activeSessions).toHaveLength(2);
      expect(activeSessions[0].sessionId).toBe('session-1');
      expect(activeSessions[1].sessionId).toBe('session-2');
    });

    test('deve retornar array vazio quando não há sessões', async () => {
      const activeSessions = await sessionIntegration.listActiveSessions();
      expect(activeSessions).toHaveLength(0);
    });
  });

  describe('Encerramento de Sessão', () => {
    test('deve encerrar sessão existente', async () => {
      const sessionId = 'test-session-8';
      await sessionIntegration.createSession(sessionId, { stationId: 'station-555' });

      const result = await sessionIntegration.endSession(sessionId, 'test_end');
      expect(result).toBe(true);
      expect(sessionIntegration.memorySessions.has(sessionId)).toBe(false);
    });

    test('deve falhar ao encerrar sessão inexistente', async () => {
      const result = await sessionIntegration.endSession('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('Shutdown', () => {
    test('deve encerrar sistema corretamente', async () => {
      // Criar algumas sessões e mapeamentos
      await sessionIntegration.createSession('shutdown-test-1', { stationId: 'station-999' });
      sessionIntegration.setUserSocketId('user-shutdown', 'socket-shutdown');

      // Verificar que recursos existem
      expect(sessionIntegration.memorySessions.size).toBe(1);
      expect(sessionIntegration.userIdToSocketId.size).toBe(1);

      // Fazer shutdown
      await sessionIntegration.shutdown();

      // Verificar que recursos foram limpos
      expect(sessionIntegration.memorySessions.size).toBe(0);
      expect(sessionIntegration.userIdToSocketId.size).toBe(0);
    });
  });
});

module.exports = {};