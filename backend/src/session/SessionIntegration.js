/**
 * SessionIntegration - Camada de integração para migrar de sessões em memória
 * para sessões distribuídas usando Firestore
 *
 * Este arquivo facilita a migração gradual do sistema de sessões atual
 * mantendo compatibilidade com o código existente enquanto adiciona
 * persistência e escalabilidade.
 *
 * @author REVALIDAFLOW Team
 * @version 1.0.0
 */

const DistributedSessionManager = require('./DistributedSessionManager');
const admin = require('firebase-admin');
const EventEmitter = require('events');

class SessionIntegration extends EventEmitter {
  constructor(firestore, options = {}) {
    super();

    this.firestore = firestore;
    this.options = options;

    // Flag para habilitar/desabilitar modo distribuído
    this.distributedMode = options.distributedMode !== false; // default: true

    // Sessões em memória para fallback
    this.memorySessions = new Map();

    // Mapeamento userId -> socketId (compatibilidade)
    this.userIdToSocketId = new Map();

    // DistributedSessionManager instance
    this.sessionManager = null;

    // Estatísticas
    this.stats = {
      sessionsCreated: 0,
      sessionsDestroyed: 0,
      participantsJoined: 0,
      participantsLeft: 0,
      timerEvents: 0,
      migrationsAttempted: 0,
      migrationsSuccessful: 0
    };

    // Inicializar session manager se Firebase estiver disponível
    this.initializeSessionManager();
  }

  /**
   * Inicializa o DistributedSessionManager se Firebase estiver disponível
   */
  async initializeSessionManager() {
    try {
      if (this.firestore && this.distributedMode) {
        this.sessionManager = new DistributedSessionManager(this.firestore, {
          instanceId: this.options.instanceId,
          cacheTimeout: this.options.cacheTimeout || 30000,
          sessionsCollection: this.options.sessionsCollection || 'sessions',
          participantsCollection: this.options.participantsCollection || 'session_participants',
          eventsCollection: this.options.eventsCollection || 'session_events'
        });

        await this.sessionManager.initialize();

        // Configurar listeners para eventos do session manager
        this.setupSessionManagerListeners();

        console.log('[SESSION INTEGRATION] DistributedSessionManager inicializado com sucesso');
        this.emit('sessionManagerReady');
      } else {
        console.warn('[SESSION INTEGRATION] Firebase não disponível, usando modo memória apenas');
        this.emit('fallbackToMemory');
      }
    } catch (error) {
      console.error('[SESSION INTEGRATION] Erro ao inicializar SessionManager:', error);
      this.emit('fallbackToMemory');
    }
  }

  /**
   * Configura listeners para eventos do DistributedSessionManager
   */
  setupSessionManagerListeners() {
    if (!this.sessionManager) return;

    this.sessionManager.on('sessionCreated', (session) => {
      this.stats.sessionsCreated++;
      this.emit('sessionCreated', session);
    });

    this.sessionManager.on('sessionUpdated', (session) => {
      this.emit('sessionUpdated', session);
    });

    this.sessionManager.on('participantJoined', (data) => {
      this.stats.participantsJoined++;
      this.emit('participantJoined', data);
    });

    this.sessionManager.on('participantLeft', (data) => {
      this.stats.participantsLeft++;
      this.emit('participantLeft', data);
    });

    this.sessionManager.on('timerUpdated', (data) => {
      this.stats.timerEvents++;
      this.emit('timerUpdated', data);
    });

    this.sessionManager.on('sessionEnded', (data) => {
      this.stats.sessionsDestroyed++;
      this.emit('sessionEnded', data);
    });

    this.sessionManager.on('sessionChanged', (session) => {
      this.emit('sessionChanged', session);
    });

    this.sessionManager.on('heartbeat', (data) => {
      this.emit('heartbeat', data);
    });
  }

  /**
   * Cria uma nova sessão (compatível com interface atual)
   * @param {string} sessionId - ID da sessão
   * @param {Object} sessionData - Dados da sessão
   * @returns {Promise<Object>} Sessão criada
   */
  async createSession(sessionId, sessionData) {
    if (this.sessionManager && this.distributedMode) {
      try {
        // Criar sessão distribuída
        const distributedSession = await this.sessionManager.createSession({
          sessionId,
          ...sessionData
        });

        // Manter cópia em memória para compatibilidade
        this.memorySessions.set(sessionId, {
          stationId: sessionData.stationId,
          participants: new Map(),
          createdAt: new Date(),
          timer: null,
          isDistributed: true,
          distributedData: distributedSession
        });

        this.stats.sessionsCreated++;
        return distributedSession;
      } catch (error) {
        console.error('[SESSION INTEGRATION] Erro ao criar sessão distribuída, fallback para memória:', error);
        return this.createMemorySession(sessionId, sessionData);
      }
    } else {
      return this.createMemorySession(sessionId, sessionData);
    }
  }

  /**
   * Cria sessão em memória (fallback)
   * @param {string} sessionId - ID da sessão
   * @param {Object} sessionData - Dados da sessão
   * @returns {Object} Sessão criada
   */
  createMemorySession(sessionId, sessionData) {
    const session = {
      stationId: sessionData.stationId,
      participants: new Map(),
      createdAt: new Date(),
      timer: null,
      isDistributed: false
    };

    this.memorySessions.set(sessionId, session);
    this.stats.sessionsCreated++;

    console.log(`[SESSION MEMORY] Sessão criada em memória: ${sessionId}`);
    this.emit('memorySessionCreated', { sessionId, session });

    return session;
  }

  /**
   * Busca uma sessão pelo ID
   * @param {string} sessionId - ID da sessão
   * @returns {Promise<Object|null>} Sessão encontrada
   */
  async getSession(sessionId) {
    if (this.sessionManager && this.distributedMode) {
      try {
        // Tentar buscar do Firestore primeiro
        const distributedSession = await this.sessionManager.getSession(sessionId);
        if (distributedSession) {
          return distributedSession;
        }
      } catch (error) {
        console.error('[SESSION INTEGRATION] Erro ao buscar sessão distribuída:', error);
      }
    }

    // Fallback para memória
    return this.memorySessions.get(sessionId) || null;
  }

  /**
   * Verifica se uma sessão existe
   * @param {string} sessionId - ID da sessão
   * @returns {Promise<boolean>} true se existe
   */
  async hasSession(sessionId) {
    const session = await this.getSession(sessionId);
    return session !== null;
  }

  /**
   * Adiciona um participante à sessão
   * @param {string} sessionId - ID da sessão
   * @param {string} userId - ID do usuário
   * @param {Object} participantData - Dados do participante
   * @returns {Promise<boolean>} Sucesso da operação
   */
  async addParticipant(sessionId, userId, participantData) {
    if (this.sessionManager && this.distributedMode) {
      try {
        // Adicionar participante no Firestore
        await this.sessionManager.addParticipant(sessionId, {
          userId,
          ...participantData
        });

        // Atualizar sessão em memória se existir
        const memorySession = this.memorySessions.get(sessionId);
        if (memorySession) {
          memorySession.participants.set(userId, {
            socketId: participantData.socketId,
            role: participantData.role,
            displayName: participantData.displayName,
            isReady: false
          });
        }

        this.stats.participantsJoined++;
        return true;
      } catch (error) {
        console.error('[SESSION INTEGRATION] Erro ao adicionar participante distribuído:', error);
        return this.addMemoryParticipant(sessionId, userId, participantData);
      }
    } else {
      return this.addMemoryParticipant(sessionId, userId, participantData);
    }
  }

  /**
   * Adiciona participante em memória (fallback)
   * @param {string} sessionId - ID da sessão
   * @param {string} userId - ID do usuário
   * @param {Object} participantData - Dados do participante
   * @returns {boolean} Sucesso da operação
   */
  addMemoryParticipant(sessionId, userId, participantData) {
    const session = this.memorySessions.get(sessionId);
    if (!session) {
      console.warn(`[SESSION MEMORY] Sessão não encontrada: ${sessionId}`);
      return false;
    }

    session.participants.set(userId, {
      socketId: participantData.socketId,
      role: participantData.role,
      displayName: participantData.displayName,
      isReady: false
    });

    this.stats.participantsJoined++;
    console.log(`[SESSION MEMORY] Participante ${userId} adicionado à sessão ${sessionId}`);

    return true;
  }

  /**
   * Remove um participante da sessão
   * @param {string} sessionId - ID da sessão
   * @param {string} userId - ID do usuário
   * @returns {Promise<boolean>} Sucesso da operação
   */
  async removeParticipant(sessionId, userId) {
    if (this.sessionManager && this.distributedMode) {
      try {
        // Buscar participante para obter participantId
        const session = await this.sessionManager.getSession(sessionId);
        if (session && session.participants) {
          const participant = session.participants.find(p => p.userId === userId);
          if (participant) {
            await this.sessionManager.removeParticipant(sessionId, participant.participantId);
          }
        }

        // Remover da memória também
        const memorySession = this.memorySessions.get(sessionId);
        if (memorySession) {
          memorySession.participants.delete(userId);
        }

        this.stats.participantsLeft++;
        return true;
      } catch (error) {
        console.error('[SESSION INTEGRATION] Erro ao remover participante distribuído:', error);
        return this.removeMemoryParticipant(sessionId, userId);
      }
    } else {
      return this.removeMemoryParticipant(sessionId, userId);
    }
  }

  /**
   * Remove participante em memória (fallback)
   * @param {string} sessionId - ID da sessão
   * @param {string} userId - ID do usuário
   * @returns {boolean} Sucesso da operação
   */
  removeMemoryParticipant(sessionId, userId) {
    const session = this.memorySessions.get(sessionId);
    if (!session) {
      return false;
    }

    session.participants.delete(userId);
    this.stats.participantsLeft++;
    console.log(`[SESSION MEMORY] Participante ${userId} removido da sessão ${sessionId}`);

    return true;
  }

  /**
   * Atualiza o timer da sessão
   * @param {string} sessionId - ID da sessão
   * @param {Object} timerData - Dados do timer
   * @returns {Promise<boolean>} Sucesso da operação
   */
  async updateTimer(sessionId, timerData) {
    if (this.sessionManager && this.distributedMode) {
      try {
        await this.sessionManager.updateTimer(sessionId, timerData);
        this.stats.timerEvents++;
        return true;
      } catch (error) {
        console.error('[SESSION INTEGRATION] Erro ao atualizar timer distribuído:', error);
        return this.updateMemoryTimer(sessionId, timerData);
      }
    } else {
      return this.updateMemoryTimer(sessionId, timerData);
    }
  }

  /**
   * Atualiza timer em memória (fallback)
   * @param {string} sessionId - ID da sessão
   * @param {Object} timerData - Dados do timer
   * @returns {boolean} Sucesso da operação
   */
  updateMemoryTimer(sessionId, timerData) {
    const session = this.memorySessions.get(sessionId);
    if (!session) {
      return false;
    }

    // Atualizar timer em memória
    if (!session.timer) {
      session.timer = {};
    }

    Object.assign(session.timer, timerData);
    this.stats.timerEvents++;

    return true;
  }

  /**
   * Encerra uma sessão
   * @param {string} sessionId - ID da sessão
   * @param {string} reason - Motivo do encerramento
   * @returns {Promise<boolean>} Sucesso da operação
   */
  async endSession(sessionId, reason = 'manual_end') {
    if (this.sessionManager && this.distributedMode) {
      try {
        await this.sessionManager.endSession(sessionId, reason);

        // Remover da memória também
        this.memorySessions.delete(sessionId);

        this.stats.sessionsDestroyed++;
        return true;
      } catch (error) {
        console.error('[SESSION INTEGRATION] Erro ao encerrar sessão distribuída:', error);
        return this.endMemorySession(sessionId);
      }
    } else {
      return this.endMemorySession(sessionId);
    }
  }

  /**
   * Encerra sessão em memória (fallback)
   * @param {string} sessionId - ID da sessão
   * @returns {boolean} Sucesso da operação
   */
  endMemorySession(sessionId) {
    const session = this.memorySessions.get(sessionId);
    if (!session) {
      return false;
    }

    // Limpar timer
    if (session.timer && session.timer.intervalId) {
      clearInterval(session.timer.intervalId);
    }

    // Remover sessão
    this.memorySessions.delete(sessionId);
    this.stats.sessionsDestroyed++;

    console.log(`[SESSION MEMORY] Sessão ${sessionId} encerrada`);
    this.emit('memorySessionEnded', { sessionId });

    return true;
  }

  /**
   * Lista sessões ativas
   * @param {Object} filters - Filtros de busca
   * @returns {Promise<Array>} Lista de sessões
   */
  async listActiveSessions(filters = {}) {
    if (this.sessionManager && this.distributedMode) {
      try {
        return await this.sessionManager.listActiveSessions(filters);
      } catch (error) {
        console.error('[SESSION INTEGRATION] Erro ao listar sessões distribuídas:', error);
        return this.listMemorySessions();
      }
    } else {
      return this.listMemorySessions();
    }
  }

  /**
   * Lista sessões em memória (fallback)
   * @returns {Array} Lista de sessões
   */
  listMemorySessions() {
    const sessions = [];

    for (const [sessionId, session] of this.memorySessions.entries()) {
      sessions.push({
        sessionId,
        stationId: session.stationId,
        participantCount: session.participants.size,
        createdAt: session.createdAt,
        isDistributed: false
      });
    }

    return sessions;
  }

  /**
   * Mapeamento userId -> socketId (compatibilidade)
   * @param {string} userId - ID do usuário
   * @param {string} socketId - ID do socket
   */
  setUserSocketId(userId, socketId) {
    this.userIdToSocketId.set(userId, socketId);
  }

  /**
   * Remove mapeamento userId -> socketId
   * @param {string} userId - ID do usuário
   */
  removeUserSocketId(userId) {
    this.userIdToSocketId.delete(userId);
  }

  /**
   * Busca socketId pelo userId
   * @param {string} userId - ID do usuário
   * @returns {string|null} socketId
   */
  getSocketIdByUserId(userId) {
    return this.userIdToSocketId.get(userId) || null;
  }

  /**
   * Obtém estatísticas da integração
   * @returns {Object} Estatísticas
   */
  getStats() {
    const memoryStats = {
      memorySessionCount: this.memorySessions.size,
      userIdToSocketIdCount: this.userIdToSocketId.size
    };

    const distributedStats = this.sessionManager ?
      this.sessionManager.getStats() : { isInitialized: false };

    return {
      ...this.stats,
      distributedMode: this.distributedMode,
      sessionManagerReady: this.sessionManager && this.sessionManager.isInitialized,
      memory: memoryStats,
      distributed: distributedStats
    };
  }

  /**
   * Limpa recursos e encerra a integração
   */
  async shutdown() {
    try {
      // Limpar todas as sessões em memória
      for (const [sessionId, session] of this.memorySessions.entries()) {
        if (session.timer && session.timer.intervalId) {
          clearInterval(session.timer.intervalId);
        }
      }
      this.memorySessions.clear();

      // Limpar mapeamentos
      this.userIdToSocketId.clear();

      // Encerrar session manager
      if (this.sessionManager) {
        await this.sessionManager.shutdown();
      }

      console.log('[SESSION INTEGRATION] Sistema encerrado com sucesso');
      this.emit('shutdown');

    } catch (error) {
      console.error('[SESSION INTEGRATION] Erro durante shutdown:', error);
      throw error;
    }
  }

  /**
   * Migra sessões em memória para modo distribuído
   * @param {Array<string>} sessionIds - IDs das sessões para migrar (opcional)
   * @returns {Promise<Object>} Resultado da migração
   */
  async migrateMemorySessions(sessionIds = null) {
    if (!this.sessionManager || !this.distributedMode) {
      return { success: false, reason: 'Session manager not available' };
    }

    const sessionsToMigrate = sessionIds || Array.from(this.memorySessions.keys());
    const results = {
      attempted: sessionsToMigrate.length,
      successful: 0,
      failed: 0,
      errors: []
    };

    for (const sessionId of sessionsToMigrate) {
      try {
        this.stats.migrationsAttempted++;

        const memorySession = this.memorySessions.get(sessionId);
        if (!memorySession) {
          results.failed++;
          results.errors.push({ sessionId, error: 'Session not found in memory' });
          continue;
        }

        // Criar sessão distribuída
        await this.sessionManager.createSession({
          sessionId,
          stationId: memorySession.stationId,
          creatorId: 'migration',
          mode: 'sequential',
          duration: 600
        });

        // Migrar participantes
        for (const [userId, participantData] of memorySession.participants.entries()) {
          await this.sessionManager.addParticipant(sessionId, {
            userId,
            socketId: participantData.socketId,
            role: participantData.role,
            displayName: participantData.displayName
          });
        }

        // Marcar como distribuída
        memorySession.isDistributed = true;

        this.stats.migrationsSuccessful++;
        results.successful++;

      } catch (error) {
        results.failed++;
        results.errors.push({ sessionId, error: error.message });
        console.error(`[MIGRATION] Erro ao migrar sessão ${sessionId}:`, error);
      }
    }

    console.log(`[MIGRATION] Concluída: ${results.successful}/${results.attempted} sessões migradas`);
    this.emit('migrationCompleted', results);

    return results;
  }
}

module.exports = SessionIntegration;