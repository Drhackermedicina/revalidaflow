/**
 * DistributedSessionManager - Gerenciador de sessões distribuídas
 *
 * Responsável por gerenciar sessões através de múltiplas instâncias do backend,
 * utilizando Firestore como armazenamento persistente e sincronização.
 *
 * @author REVALIDAFLOW Team
 * @version 1.0.0
 */

const admin = require('firebase-admin');
const logger = require('../utils/logger');
const EventEmitter = require('events');

class DistributedSessionManager extends EventEmitter {
  constructor(firestore, options = {}) {
    super();

    this.firestore = firestore;
    this.instanceId = options.instanceId || `instance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.cache = new Map(); // Cache local para performance
    this.cacheTimeout = options.cacheTimeout || 30000; // 30 segundos

    // Configurações das coleções
    this.collections = {
      sessions: options.sessionsCollection || 'sessions',
      participants: options.participantsCollection || 'session_participants',
      events: options.eventsCollection || 'session_events'
    };

    // Listeners para atualizações em tempo real
    this.listeners = new Map();
    this.isInitialized = false;

    logger.info(`DistributedSessionManager initialized with instanceId: ${this.instanceId}`);
  }

  /**
   * Inicializa o gerenciador de sessões
   */
  async initialize() {
    try {
      // Configurar listeners para atualizações em tempo real
      await this.setupRealtimeListeners();

      // Iniciar cleanup de cache expirado
      this.startCacheCleanup();

      // Iniciar heartbeat da instância
      this.startInstanceHeartbeat();

      this.isInitialized = true;
      logger.info('DistributedSessionManager initialized successfully');

      this.emit('initialized');
    } catch (error) {
      logger.error('Failed to initialize DistributedSessionManager:', error);
      throw error;
    }
  }

  /**
   * Cria uma nova sessão distribuída
   * @param {Object} sessionData - Dados da sessão
   * @returns {Promise<Object>} Sessão criada
   */
  async createSession(sessionData) {
    try {
      const sessionId = this.generateSessionId();
      const now = admin.firestore.Timestamp.now();

      const session = {
        sessionId,
        ...sessionData,
        status: 'waiting',
        metadata: {
          createdAt: now,
          updatedAt: now,
          lastActivity: now,
          currentStep: 1,
          totalSteps: sessionData.steps?.length || 1,
          createdBy: sessionData.creatorId
        },
        participants: [],
        timers: {
          startTime: null,
          endTime: null,
          remainingTime: sessionData.duration || 600,
          isPaused: true
        }
      };

      // Salvar no Firestore
      const sessionRef = this.firestore.collection(this.collections.sessions).doc(sessionId);
      await sessionRef.set(session);

      // Atualizar cache local
      this.updateCache(sessionId, session);

      // Registrar evento
      await this.logEvent(sessionId, 'session_created', {
        creatorId: sessionData.creatorId,
        stationId: sessionData.stationId,
        instanceId: this.instanceId
      });

      logger.info(`Session created: ${sessionId} by instance ${this.instanceId}`);
      this.emit('sessionCreated', session);

      return session;
    } catch (error) {
      logger.error('Error creating session:', error);
      throw error;
    }
  }

  /**
   * Busca uma sessão pelo ID
   * @param {string} sessionId - ID da sessão
   * @returns {Promise<Object|null>} Dados da sessão
   */
  async getSession(sessionId) {
    try {
      // Verificar cache primeiro
      const cached = this.getFromCache(sessionId);
      if (cached) {
        return cached;
      }

      // Buscar do Firestore
      const sessionDoc = await this.firestore
        .collection(this.collections.sessions)
        .doc(sessionId)
        .get();

      if (!sessionDoc.exists) {
        return null;
      }

      const session = { id: sessionDoc.id, ...sessionDoc.data() };

      // Atualizar cache
      this.updateCache(sessionId, session);

      return session;
    } catch (error) {
      logger.error(`Error getting session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Atualiza uma sessão existente
   * @param {string} sessionId - ID da sessão
   * @param {Object} updateData - Dados para atualizar
   * @returns {Promise<Object>} Sessão atualizada
   */
  async updateSession(sessionId, updateData) {
    try {
      const now = admin.firestore.Timestamp.now();

      const updatePayload = {
        ...updateData,
        'metadata.updatedAt': now,
        'metadata.lastActivity': now
      };

      const sessionRef = this.firestore
        .collection(this.collections.sessions)
        .doc(sessionId);

      await sessionRef.update(updatePayload);

      // Buscar sessão atualizada
      const updatedSession = await this.getSession(sessionId);

      // Registrar evento
      await this.logEvent(sessionId, 'session_updated', {
        updatedFields: Object.keys(updateData),
        instanceId: this.instanceId
      });

      logger.info(`Session updated: ${sessionId} by instance ${this.instanceId}`);
      this.emit('sessionUpdated', updatedSession);

      return updatedSession;
    } catch (error) {
      logger.error(`Error updating session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Adiciona um participante à sessão
   * @param {string} sessionId - ID da sessão
   * @param {Object} participantData - Dados do participante
   * @returns {Promise<Object>} Participante adicionado
   */
  async addParticipant(sessionId, participantData) {
    try {
      const now = admin.firestore.Timestamp.now();
      const participantId = this.generateParticipantId();

      const participant = {
        participantId,
        sessionId,
        ...participantData,
        status: 'connected',
        joinedAt: now,
        lastSeen: now,
        instanceId: this.instanceId,
        metadata: {
          ipAddress: participantData.ipAddress || 'unknown',
          userAgent: participantData.userAgent || 'unknown',
          location: participantData.location || 'unknown'
        }
      };

      // Salvar participante
      await this.firestore
        .collection(this.collections.participants)
        .doc(participantId)
        .set(participant);

      // Adicionar ID à sessão
      const sessionRef = this.firestore
        .collection(this.collections.sessions)
        .doc(sessionId);

      await sessionRef.update({
        participants: admin.firestore.FieldValue.arrayUnion(participantId)
      });

      // Atualizar cache da sessão
      this.invalidateCache(sessionId);

      // Registrar evento
      await this.logEvent(sessionId, 'participant_joined', {
        participantId,
        userId: participantData.userId,
        role: participantData.role,
        instanceId: this.instanceId
      });

      logger.info(`Participant added to session ${sessionId}: ${participantId}`);
      this.emit('participantJoined', { sessionId, participant });

      return participant;
    } catch (error) {
      logger.error(`Error adding participant to session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Remove um participante da sessão
   * @param {string} sessionId - ID da sessão
   * @param {string} participantId - ID do participante
   * @returns {Promise<boolean>} Sucesso da operação
   */
  async removeParticipant(sessionId, participantId) {
    try {
      // Atualizar status do participante
      await this.firestore
        .collection(this.collections.participants)
        .doc(participantId)
        .update({
          status: 'disconnected',
          leftAt: admin.firestore.Timestamp.now()
        });

      // Remover ID da sessão
      const sessionRef = this.firestore
        .collection(this.collections.sessions)
        .doc(sessionId);

      await sessionRef.update({
        participants: admin.firestore.FieldValue.arrayRemove(participantId)
      });

      // Atualizar cache da sessão
      this.invalidateCache(sessionId);

      // Registrar evento
      await this.logEvent(sessionId, 'participant_left', {
        participantId,
        instanceId: this.instanceId
      });

      logger.info(`Participant removed from session ${sessionId}: ${participantId}`);
      this.emit('participantLeft', { sessionId, participantId });

      return true;
    } catch (error) {
      logger.error(`Error removing participant from session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Atualiza o timer da sessão
   * @param {string} sessionId - ID da sessão
   * @param {Object} timerData - Dados do timer
   * @returns {Promise<Object>} Timer atualizado
   */
  async updateTimer(sessionId, timerData) {
    try {
      const updatePayload = {};

      if (timerData.remainingTime !== undefined) {
        updatePayload['timers.remainingTime'] = timerData.remainingTime;
      }

      if (timerData.isPaused !== undefined) {
        updatePayload['timers.isPaused'] = timerData.isPaused;
      }

      if (timerData.startTime !== undefined) {
        updatePayload['timers.startTime'] = timerData.startTime instanceof Date
          ? admin.firestore.Timestamp.fromDate(timerData.startTime)
          : timerData.startTime;
      }

      if (timerData.endTime !== undefined) {
        updatePayload['timers.endTime'] = timerData.endTime instanceof Date
          ? admin.firestore.Timestamp.fromDate(timerData.endTime)
          : timerData.endTime;
      }

      updatePayload['metadata.lastActivity'] = admin.firestore.Timestamp.now();

      await this.firestore
        .collection(this.collections.sessions)
        .doc(sessionId)
        .update(updatePayload);

      // Invalidar cache para forçar atualização
      this.invalidateCache(sessionId);

      // Registrar evento
      await this.logEvent(sessionId, 'timer_updated', {
        timerData,
        instanceId: this.instanceId
      });

      logger.info(`Timer updated for session ${sessionId}`);
      this.emit('timerUpdated', { sessionId, timerData });

      return timerData;
    } catch (error) {
      logger.error(`Error updating timer for session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Lista sessões ativas
   * @param {Object} filters - Filtros de busca
   * @returns {Promise<Array>} Lista de sessões
   */
  async listActiveSessions(filters = {}) {
    try {
      let query = this.firestore
        .collection(this.collections.sessions)
        .where('status', 'in', ['waiting', 'active', 'paused']);

      if (filters.stationId) {
        query = query.where('stationId', '==', filters.stationId);
      }

      if (filters.creatorId) {
        query = query.where('creatorId', '==', filters.creatorId);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const snapshot = await query.get();
      const sessions = [];

      snapshot.forEach(doc => {
        const session = { id: doc.id, ...doc.data() };
        sessions.push(session);

        // Atualizar cache
        this.updateCache(session.id, session);
      });

      return sessions;
    } catch (error) {
      logger.error('Error listing active sessions:', error);
      throw error;
    }
  }

  /**
   * Encerra uma sessão
   * @param {string} sessionId - ID da sessão
   * @param {string} reason - Motivo do encerramento
   * @returns {Promise<boolean>} Sucesso da operação
   */
  async endSession(sessionId, reason = 'user_action') {
    try {
      const now = admin.firestore.Timestamp.now();

      // Atualizar status da sessão
      await this.firestore
        .collection(this.collections.sessions)
        .doc(sessionId)
        .update({
          status: 'completed',
          'metadata.updatedAt': now,
          'timers.endTime': now
        });

      // Desconectar todos os participantes
      const participantsSnapshot = await this.firestore
        .collection(this.collections.participants)
        .where('sessionId', '==', sessionId)
        .where('status', '==', 'connected')
        .get();

      const batch = this.firestore.batch();
      participantsSnapshot.forEach(doc => {
        batch.update(doc.ref, {
          status: 'disconnected',
          leftAt: now
        });
      });

      await batch.commit();

      // Invalidar cache
      this.invalidateCache(sessionId);

      // Registrar evento
      await this.logEvent(sessionId, 'session_ended', {
        reason,
        instanceId: this.instanceId
      });

      logger.info(`Session ended: ${sessionId}, reason: ${reason}`);
      this.emit('sessionEnded', { sessionId, reason });

      return true;
    } catch (error) {
      logger.error(`Error ending session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Configura listeners para atualizações em tempo real
   * @private
   */
  async setupRealtimeListeners() {
    // Listener para sessões
    const sessionsListener = this.firestore
      .collection(this.collections.sessions)
      .onSnapshot((snapshot) => {
        snapshot.docChanges().forEach((change) => {
          const session = { id: change.doc.id, ...change.doc.data() };

          if (change.type === 'modified') {
            this.updateCache(session.id, session);
            this.emit('sessionChanged', session);
          } else if (change.type === 'removed') {
            this.invalidateCache(session.id);
            this.emit('sessionRemoved', session.id);
          }
        });
      });

    this.listeners.set('sessions', sessionsListener);

    logger.info('Realtime listeners configured');
  }

  /**
   * Registra um evento na sessão
   * @param {string} sessionId - ID da sessão
   * @param {string} eventType - Tipo do evento
   * @param {Object} eventData - Dados do evento
   * @private
   */
  async logEvent(sessionId, eventType, eventData) {
    try {
      const event = {
        eventId: this.generateEventId(),
        sessionId,
        type: eventType,
        data: eventData,
        timestamp: admin.firestore.Timestamp.now(),
        instanceId: this.instanceId
      };

      await this.firestore
        .collection(this.collections.events)
        .add(event);

    } catch (error) {
      logger.error(`Error logging event for session ${sessionId}:`, error);
      // Não lançar erro para não interromper operações principais
    }
  }

  /**
   * Atualiza cache local
   * @param {string} key - Chave do cache
   * @param {Object} data - Dados para cache
   * @private
   */
  updateCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Busca do cache local
   * @param {string} key - Chave do cache
   * @returns {Object|null} Dados em cache
   * @private
   */
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (!cached) {
      return null;
    }

    // Verificar se cache expirou
    if (Date.now() - cached.timestamp > this.cacheTimeout) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Invalida entrada do cache
   * @param {string} key - Chave do cache
   * @private
   */
  invalidateCache(key) {
    this.cache.delete(key);
  }

  /**
   * Inicia cleanup de cache expirado
   * @private
   */
  startCacheCleanup() {
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.cache.entries()) {
        if (now - value.timestamp > this.cacheTimeout) {
          this.cache.delete(key);
        }
      }
    }, this.cacheTimeout / 2); // Rodar a cada metade do timeout
  }

  /**
   * Inicia heartbeat da instância
   * @private
   */
  startInstanceHeartbeat() {
    setInterval(() => {
      this.emit('heartbeat', {
        instanceId: this.instanceId,
        timestamp: new Date(),
        cacheSize: this.cache.size,
        activeListeners: this.listeners.size
      });
    }, 30000); // A cada 30 segundos
  }

  /**
   * Gera ID único para sessão
   * @returns {string} ID da sessão
   * @private
   */
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Gera ID único para participante
   * @returns {string} ID do participante
   * @private
   */
  generateParticipantId() {
    return `participant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Gera ID único para evento
   * @returns {string} ID do evento
   * @private
   */
  generateEventId() {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Obtém estatísticas do gerenciador
   * @returns {Object} Estatísticas
   */
  getStats() {
    return {
      instanceId: this.instanceId,
      isInitialized: this.isInitialized,
      cacheSize: this.cache.size,
      activeListeners: this.listeners.size,
      uptime: process.uptime()
    };
  }

  /**
   * Limpa recursos e encerra o gerenciador
   */
  async shutdown() {
    try {
      // Remover listeners
      for (const [name, listener] of this.listeners) {
        listener();
        logger.info(`Listener ${name} removed`);
      }
      this.listeners.clear();

      // Limpar cache
      this.cache.clear();

      this.isInitialized = false;

      logger.info(`DistributedSessionManager ${this.instanceId} shutdown successfully`);
      this.emit('shutdown');

    } catch (error) {
      logger.error('Error during shutdown:', error);
      throw error;
    }
  }
}

module.exports = DistributedSessionManager;