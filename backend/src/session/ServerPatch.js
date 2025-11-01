/**
 * ServerPatch - Patch para integrar SessionIntegration no server.js existente
 *
 * Este arquivo contém as modificações necessárias para substituir o sistema
 * de sessões em memória pelo novo sistema distribuído, mantendo compatibilidade
 * com o código existente.
 *
 * @author REVALIDAFLOW Team
 * @version 1.0.0
 */

const SessionIntegration = require('./SessionIntegration');

/**
 * Aplica o patch no server.js para usar SessionIntegration
 * @param {Object} serverContext - Contexto do servidor (app, io, etc.)
 * @param {Object} options - Opções de configuração
 * @returns {SessionIntegration} Instância do SessionIntegration
 */
function applySessionIntegrationPatch(serverContext, options = {}) {
  const { app, io, admin: firebaseAdmin } = serverContext;

  // Inicializar SessionIntegration
  const sessionIntegration = new SessionIntegration(
    firebaseAdmin.firestore(),
    {
      distributedMode: options.distributedMode !== false,
      instanceId: options.instanceId || `server_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      cacheTimeout: options.cacheTimeout || 30000,
      ...options.firestore
    }
  );

  // Substituir variáveis globais
  global.sessions = sessionIntegration.memorySessions; // Para compatibilidade
  global.sessionIntegration = sessionIntegration;
  global.userIdToSocketId = sessionIntegration.userIdToSocketId; // Substituir global

  // Patch para funções de timer
  global.startSessionTimer = async (sessionId, durationSeconds, onTick, onEnd) => {
    try {
      // Usar SessionIntegration para timer distribuído
      await sessionIntegration.updateTimer(sessionId, {
        startTime: new Date(),
        remainingTime: durationSeconds,
        isPaused: false
      });

      // Manter timer local para callbacks
      let remainingSeconds = durationSeconds;
      const intervalId = setInterval(() => {
        remainingSeconds--;
        if (typeof onTick === 'function') onTick(remainingSeconds);

        // Atualizar timer distribuído a cada 5 segundos (não precisa await aqui para não bloquear)
        if (remainingSeconds % 5 === 0) {
          sessionIntegration.updateTimer(sessionId, {
            remainingTime: remainingSeconds,
            isPaused: false
          }).catch(error => {
            console.warn('[TIMER PATCH] Erro ao atualizar timer distribuído:', error);
          });
        }

        if (remainingSeconds <= 0) {
          clearInterval(intervalId);
          sessionIntegration.updateTimer(sessionId, {
            remainingTime: 0,
            isPaused: true,
            endTime: new Date()
          }).catch(error => {
            console.warn('[TIMER PATCH] Erro ao finalizar timer distribuído:', error);
          });
          if (typeof onEnd === 'function') onEnd();
        }
      }, 1000);

      // Armazenar intervalId para cleanup
      const session = sessionIntegration.memorySessions.get(sessionId);
      if (session) {
        if (!session.timer) session.timer = {};
        session.timer.intervalId = intervalId;
        session.timer.remainingSeconds = durationSeconds;
      }
    } catch (error) {
      console.error('[TIMER PATCH] Erro ao iniciar timer distribuído:', error);
      // Fallback para timer local
      startLocalTimer(sessionId, durationSeconds, onTick, onEnd);
    }
  };

  global.stopSessionTimer = async (sessionId, reason) => {
    try {
      await sessionIntegration.updateTimer(sessionId, {
        isPaused: true,
        endTime: new Date()
      });

      // Limpar timer local
      const session = sessionIntegration.memorySessions.get(sessionId);
      if (session && session.timer && session.timer.intervalId) {
        clearInterval(session.timer.intervalId);
        session.timer = null;
      }
    } catch (error) {
      console.error('[TIMER PATCH] Erro ao parar timer distribuído:', error);
      // Fallback para timer local
      stopLocalTimer(sessionId);
    }
  };

  // Função local de fallback para timer
  function startLocalTimer(sessionId, durationSeconds, onTick, onEnd) {
    const session = sessionIntegration.memorySessions.get(sessionId);
    if (!session) return;

    if (session.timer) clearInterval(session.timer.intervalId);

    session.timer = {
      remainingSeconds: durationSeconds,
      intervalId: setInterval(() => {
        session.timer.remainingSeconds--;
        if (typeof onTick === 'function') onTick(session.timer.remainingSeconds);
        if (session.timer.remainingSeconds <= 0) {
          clearInterval(session.timer.intervalId);
          if (typeof onEnd === 'function') onEnd();
        }
      }, 1000)
    };
  }

  function stopLocalTimer(sessionId) {
    const session = sessionIntegration.memorySessions.get(sessionId);
    if (session && session.timer && session.timer.intervalId) {
      clearInterval(session.timer.intervalId);
      session.timer = null;
    }
  }

  // Patch para endpoint /api/create-session
  app.post('/api/create-session', async (req, res) => {
    try {
      const { stationId } = req.body;
      if (!stationId) {
        return res.status(400).json({ error: 'ID da estação é obrigatório' });
      }

      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

      // Usar SessionIntegration
      await sessionIntegration.createSession(sessionId, {
        stationId,
        creatorId: req.user?.uid || 'anonymous',
        mode: 'sequential',
        duration: 600
      });

      console.log(`[HTTP] Nova sessão criada via API: ${sessionId} (${sessionIntegration.distributedMode ? 'distribuída' : 'memória'})`);
      res.status(201).json({ sessionId });

    } catch (error) {
      console.error('[HTTP] Erro ao criar sessão:', error);
      res.status(500).json({ error: 'Erro ao criar sessão', details: error.message });
    }
  });

  // Patch para endpoint de debug/metrics
  const originalDebugMetrics = app._router.stack.find(layer =>
    layer.route?.path === '/debug/metrics' &&
    layer.route?.methods?.get
  );

  if (originalDebugMetrics) {
    // Substituir o handler original
    originalDebugMetrics.handle = async (req, res) => {
      try {
        const lastHttp = global.debugStats?.http?.slice(-100) || [];
        const lastReads = global.debugStats?.firestoreReads?.slice(-100) || [];
        const lastSockets = global.debugStats?.socketConnections?.slice(-100) || [];

        // Obter estatísticas do cache
        const cacheStatsData = global.getCacheStats ? global.getCacheStats() : {};

        // Obter estatísticas da SessionIntegration
        const sessionStats = sessionIntegration.getStats();

        res.json({
          now: new Date().toISOString(),
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          cache: cacheStatsData,
          http: lastHttp,
          firestoreReads: lastReads,
          socketConnections: lastSockets,
          sessions: sessionStats,
          distributedMode: sessionIntegration.distributedMode,
          sessionManagerReady: sessionIntegration.sessionManager?.isInitialized || false
        });
      } catch (error) {
        console.error('[DEBUG METRICS] Erro:', error);
        res.status(500).json({ error: 'Erro ao obter métricas' });
      }
    };
  }

  // Patch para endpoint /api/admin/dashboard
  const originalAdminDashboard = app._router.stack.find(layer =>
    layer.route?.path === '/api/admin/dashboard' &&
    layer.route?.methods?.get
  );

  if (originalAdminDashboard) {
    originalAdminDashboard.handle = async (req, res) => {
      try {
        const firestore = firebaseAdmin.firestore();

        // Estatísticas de usuários
        const usuariosSnapshot = await firestore.collection('usuarios').get();
        const usuarios = usuariosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Estatísticas de roles
        const roleStats = usuarios.reduce((acc, user) => {
          acc[user.role || 'user'] = (acc[user.role || 'user'] || 0) + 1;
          return acc;
        }, {});

        // Estatísticas de estações
        const estacoesSnapshot = await firestore.collection('estacoes_clinicas').get();
        const estacoesCount = estacoesSnapshot.size;

        // Estatísticas de cache
        const cacheStats = global.getCacheStats ? global.getCacheStats() : {};

        // Estatísticas de sessões usando SessionIntegration
        const sessionStats = sessionIntegration.getStats();
        const activeSessions = sessionStats.memory?.memorySessionCount || 0;

        const dashboardData = {
          timestamp: new Date().toISOString(),
          statistics: {
            users: {
              total: usuarios.length,
              byRole: roleStats,
              recent: usuarios.filter(u => {
                const lastActive = u.lastActive ? new Date(u.lastActive) : new Date(0);
                return lastActive > new Date(Date.now() - 24 * 60 * 60 * 1000);
              }).length
            },
            stations: {
              total: estacoesCount,
              recent: estacoesSnapshot.docs.filter(doc => {
                const data = doc.data();
                const updatedAt = data.atualizadoEm ? new Date(data.atualizadoEm) : new Date(0);
                return updatedAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
              }).length
            },
            sessions: {
              active: activeSessions,
              totalToday: activeSessions,
              distributed: sessionStats.distributedMode,
              sessionManagerReady: sessionStats.sessionManagerReady,
              ...sessionStats
            },
            cache: {
              ...cacheStats,
              efficiency: cacheStats.entries > 0 ?
                ((cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100).toFixed(2) : 0
            }
          },
          system: {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            nodeVersion: process.version,
            environment: process.env.NODE_ENV || 'development'
          }
        };

        res.json(dashboardData);
      } catch (error) {
        console.error('[ADMIN DASHBOARD] Erro ao obter dados:', error);
        res.status(500).json({
          error: 'Erro ao obter dados administrativos',
          message: error.message,
          timestamp: new Date().toISOString()
        });
      }
    };
  }

  // Configurar listeners para eventos do Socket.IO
  io.on('connection', (socket) => {
    const handshakeUserId = socket.handshake.query.userId;

    // Usar SessionIntegration para mapeamento
    if (handshakeUserId) {
      sessionIntegration.setUserSocketId(handshakeUserId, socket.id);
    }

    // Patch para eventos de sessão
    const originalSessionJoin = socket.listeners('join').pop();
    if (originalSessionJoin) {
      socket.removeListener('join', originalSessionJoin);

      socket.on('join', async (data) => {
        const { sessionId, userId, role, stationId, displayName } = data;

        try {
          // Verificar/criar sessão
          const sessionExists = await sessionIntegration.hasSession(sessionId);
          if (!sessionExists) {
            await sessionIntegration.createSession(sessionId, {
              stationId,
              creatorId: userId,
              mode: 'sequential',
              duration: 600
            });
          }

          // Adicionar participante
          await sessionIntegration.addParticipant(sessionId, userId, {
            socketId: socket.id,
            role,
            displayName,
            ipAddress: socket.handshake.address,
            userAgent: socket.handshake.headers['user-agent']
          });

          // Chamar handler original se existir
          if (typeof originalSessionJoin === 'function') {
            originalSessionJoin.call(socket, data);
          }

        } catch (error) {
          console.error('[SESSION JOIN] Erro:', error);
          socket.emit('SERVER_ERROR', { message: 'Erro ao entrar na sessão' });
        }
      });
    }

    // Patch para disconnect
    socket.on('disconnect', (reason) => {
      const { sessionId, userId } = socket.handshake.query;

      // Remover mapeamento
      if (handshakeUserId) {
        sessionIntegration.removeUserSocketId(handshakeUserId);
      }

      // Remover participante da sessão
      if (sessionId && userId) {
        sessionIntegration.removeParticipant(sessionId, userId).catch(error => {
          console.error('[SESSION LEAVE] Erro ao remover participante:', error);
        });
      }
    });
  });

  // Configurar graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('🛑 Recebido SIGTERM, encerrando SessionIntegration...');
    await sessionIntegration.shutdown();
  });

  process.on('SIGINT', async () => {
    console.log('🛑 Recebido SIGINT, encerrando SessionIntegration...');
    await sessionIntegration.shutdown();
  });

  console.log('[SESSION INTEGRATION] Patch aplicado com sucesso');
  console.log(`[SESSION INTEGRATION] Modo: ${sessionIntegration.distributedMode ? 'distribuído' : 'memória'}`);
  console.log(`[SESSION INTEGRATION] Instance ID: ${sessionIntegration.options.instanceId}`);

  return sessionIntegration;
}

module.exports = applySessionIntegrationPatch;