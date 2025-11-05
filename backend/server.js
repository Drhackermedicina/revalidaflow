// ARQUIVO: backend/server.js (VERSÃO OTIMIZADA COM CACHE E MONITORAMENTO)

/*
🚨 DIRETRIZES CRÍTICAS PARA DESENVOLVIMENTO DO BACKEND:

1. 💰 OTIMIZAÇÃO DE CUSTOS EM PRODUÇÃO:
   - NUNCA adicione console.log() em produção - cada log gera custos no Cloud Logging
   - Use logs apenas para erros críticos ou informações essenciais
   - Health checks automáticos geram ~1440 logs/dia - evite logs desnecessários

2. 🐛 LOGS DE DEBUG:
   - Use apenas em desenvolvimento local (NODE_ENV !== 'production')
   - Remova todos os console.log de debug antes do deploy
   - Para debug em produção, use ferramentas específicas, não console.log

3. 🎯 REGRA DE OURO:
   - Se não é essencial para o funcionamento, não deve gerar log em produção
   - Priorize performance e custos baixos sobre conveniência de debug

4. 🔍 EXEMPLOS DO QUE EVITAR EM PRODUÇÃO:
   - [CORS DEBUG] logs (REMOVIDO)
   - Logs de cada requisição HTTP
   - Debug de variáveis de ambiente (REMOVIDO)
   - Logs de conexões Socket.IO desnecessários

⚠️  QUALQUER IA OU DESENVOLVEDOR: SIGA ESTAS DIRETRIZES RIGOROSAMENTE
*/

// Carrega configurações de ambiente
const envConfig = require('./config/env');
const dotenvResult = require('dotenv').config({ path: envConfig.envPath });

// Inicializa logger primeiro para poder usar em logs
const logger = require('./services/logger').child('server');

// Log para debug do dotenv (após logger estar definido)
if (process.env.NODE_ENV !== 'production') {
  logger.debug('Carregando .env', {
    envPath: envConfig.envPath,
    loaded: !dotenvResult.error,
    error: dotenvResult.error?.message,
    mercadopagoToken: process.env.MERCADOPAGO_ACCESS_TOKEN ? `${process.env.MERCADOPAGO_ACCESS_TOKEN.substring(0, 20)}...` : 'undefined'
  });
}

// Inicializa Sentry PRIMEIRO, antes de qualquer outra coisa
const { initSentry, Sentry, captureWebSocketError, captureSimulationError } = require('./config/sentry');
initSentry();
// Se for fornecido o secret JSON via env var (FIREBASE_SA_JSON), parseie-o aqui.
let FIREBASE_SA = null;
if (process.env.FIREBASE_SA_JSON) {
  try {
    FIREBASE_SA = JSON.parse(process.env.FIREBASE_SA_JSON);
    logger.info('FIREBASE_SA_JSON lido a partir do env');
  } catch (e) {
    logger.warn('FIREBASE_SA_JSON presente mas inválido', e && e.message);
    FIREBASE_SA = null;
  }
}
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const admin = require('firebase-admin');

const aiChatRouter = require('./routes/aiChat');
const aiSimulationRouter = require('./routes/aiSimulation');
const descriptiveQuestionsRouter = require('./routes/descriptiveQuestions');
const accessControlRouter = require('./routes/accessControl');
const paymentRouter = require('./routes/payment');

// Importar sistema de cache otimizado
const {
  getCachedUser,
  getCachedStation,
  checkStationEditStatus,
  checkMultipleStationsEditStatus,
  invalidateUserCache,
  invalidateStationCache,
  invalidateEditStatusCache,
  getCacheStats,
  cleanupExpiredCache
} = require('./cache');

// Importar fix de CORS para Cloud Run
const { applyCorsHeaders, debugCors } = require('./utils/fix-cors-cloud-run');

// Importar rate limiters para proteção anti-abuso
const {
  generalLimiter,
  aiLimiter,
  uploadLimiter,
  healthCheckLimiter
} = require('./config/rateLimiter');

// Importar middlewares de autenticação e autorização (P0-B01 Security Implementation)
const { verifyAuth, optionalAuth } = require('./middleware/auth');
const { requireAdmin, requirePermission } = require('./middleware/adminAuth');

// Importar sistema de sessões distribuídas (P0-B09: Firestore session storage)
const SessionIntegration = require('./src/session/SessionIntegration');

// Importar TimerManager para controle de sessões
const { getTimerManager } = require('./src/utils/timerManager');

const sessionLogger = logger.child('session');
const downloadLogger = logger.child('download');
const apiLogger = logger.child('api');
const adminLogger = logger.child('admin');
const socketLogger = logger.child('socket');
const inviteLogger = socketLogger.child('invite');
const sequentialLogger = socketLogger.child('sequential');
const pepLogger = socketLogger.child('pep');

// --- INICIALIZAÇÃO CONDICIONAL DO FIREBASE ---
// Apenas inicializa o Firebase Admin SDK em ambiente de produção.
// Para desenvolvimento local, o backend rodará em 'mock mode'.
if (process.env.NODE_ENV === 'production') {
  // Inicialização do Firebase Admin SDK usando env vars (.env), secrets ou arquivo local
  try {
    // Verificar se todas as credenciais necessárias estão disponíveis
    const requiredCredentials = {
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      storage_bucket: process.env.FIREBASE_STORAGE_BUCKET
    };

    // DEBUG REMOVIDO: Logs de variáveis de ambiente geram custos desnecessários em produção

    // Limpar qualquer caractere de quebra de linha ou espaços extras
    function stripSurroundingQuotes(s) {
      if (!s || typeof s !== 'string') return s;
      s = s.trim();
      if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
        s = s.slice(1, -1);
      }
      return s;
    }

    if (requiredCredentials.project_id) {
      requiredCredentials.project_id = stripSurroundingQuotes(requiredCredentials.project_id).replace(/\r?\n/g, '');
    }
    if (requiredCredentials.private_key) {
      // Remova aspas externas e mantenha quebras de linha reais.
      requiredCredentials.private_key = stripSurroundingQuotes(requiredCredentials.private_key);
    }
    if (requiredCredentials.client_email) {
      requiredCredentials.client_email = stripSurroundingQuotes(requiredCredentials.client_email).replace(/\r?\n/g, '');
    }
    if (requiredCredentials.storage_bucket) {
      requiredCredentials.storage_bucket = stripSurroundingQuotes(requiredCredentials.storage_bucket).replace(/\r?\n/g, '');
    }

    // Verificar se todas as credenciais estão presentes
    const missingCredentials = Object.entries(requiredCredentials)
      .filter(([key, value]) => !value)
      .map(([key]) => key);

    if (missingCredentials.length === 0) {
      // Usar credenciais via variáveis de ambiente ou secrets
      // Converter sequências literais "\\n" em quebras de linha reais
      const normalizedPrivateKey = requiredCredentials.private_key.replace(/\\n/g, '\n');

      const serviceAccount = {
        type: 'service_account',
        project_id: requiredCredentials.project_id,
        private_key: normalizedPrivateKey,
        client_email: requiredCredentials.client_email
      };

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: requiredCredentials.storage_bucket,
        projectId: requiredCredentials.project_id
      });

      logger.info('Firebase Admin SDK inicializado com credenciais seguras', {
        projectId: requiredCredentials.project_id,
        clientEmail: requiredCredentials.client_email,
        storageBucket: requiredCredentials.storage_bucket,
        hasPrivateKey: Boolean(requiredCredentials.private_key)
      });
    } else {
      throw new Error(`Credenciais do Firebase ausentes: ${missingCredentials.join(', ')}. Configure via Secret Manager ou variáveis de ambiente.`);
    }
  } catch (error) {
    logger.error('Erro crítico ao inicializar Firebase Admin SDK', error.message);
    logger.error('O backend não pode operar em produção sem o Firebase. Encerrando.');
    process.exit(1); // Em produção, falhar é mais seguro do que rodar sem DB
  }
} else {
  // --- MODO DE DESENVOLVIMENTO LOCAL (MOCK) ---
  logger.warn('🚀 Backend em MODO DE DESENVOLVIMENTO (sem conexão com Firebase)');
  logger.warn('O backend funcionará com funcionalidade limitada em modo mock.');
  logger.warn('Para conectar ao Firebase, rode com NODE_ENV=production.');
  global.firebaseMockMode = true;
}


const app = express();
const server = http.createServer(app);

// Sentry configurado - captura básica de erros ativa

// Middleware de debug para logar headers de requisições OPTIONS (apenas em desenvolvimento)
app.use((req, res, next) => {
  if (req.method === 'OPTIONS' && process.env.NODE_ENV !== 'production') {
    logger.debug('OPTIONS Request Headers', req.headers);
  }
  next();
});

// URLs permitidas para CORS (inclui todos os seus domínios).
// Permite configurar o frontend em tempo de deploy via FRONTEND_URL env var.
const DEFAULT_FRONTEND = 'https://www.revalidaflow.com.br';
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5174", // Adicionando porta 5174
  DEFAULT_FRONTEND,
  "https://revalida-companion.web.app",
  "https://revalida-companion.firebaseapp.com"
];

if (process.env.FRONTEND_URL) {
  // adicionar sem duplicar
  const url = process.env.FRONTEND_URL.trim();
  if (url && !allowedOrigins.includes(url)) allowedOrigins.push(url);
}

logger.info('CORS configurado', { allowedOrigins });

// Configuração do CORS para o Socket.IO
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware agressivo para garantir CORS em todas as requisições, especialmente OPTIONS
app.use((req, res, next) => {
  const tunnelOrigin = "";
  const requestOrigin = req.headers.origin;

  if (requestOrigin === tunnelOrigin || allowedOrigins.includes(requestOrigin)) {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Mock-Role, X-Mock-Email, x-mock-role, x-mock-email, user-id');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    // Se a origem não está na lista, mas é o domínio padrão do frontend, permita também
    if (requestOrigin && requestOrigin === DEFAULT_FRONTEND) {
      res.setHeader('Access-Control-Allow-Origin', requestOrigin);
      res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Mock-Role, X-Mock-Email, x-mock-role, x-mock-email, user-id');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    // Caso contrário, não setamos CORS e o navegador bloqueará a requisição.
  }

  if (req.method === 'OPTIONS') {
    // Envia 200 OK para requisições OPTIONS (preflight)
    return res.sendStatus(200);
  }
  next();
});

// O middleware 'cors' padrão e 'app.options' foram removidos para evitar conflitos
// e confiar apenas no middleware 'app.all' para o controle de CORS.
app.use(express.json());

// --- RATE LIMITING (Proteção Anti-Abuso) ---
// Em produção aplicamos rate limit para todas as rotas /api/*
// Em desenvolvimento local mantemos sem limite para facilitar testes manuais
if (process.env.NODE_ENV === 'production') {
  app.use('/api/', generalLimiter);
}

// Rate limiter específico para endpoints de health check
app.use('/health', healthCheckLimiter);

// --- AUTHENTICATION (P0-B01 Security Implementation) ---
// Aplicar autenticação Firebase para todas as rotas /api/*
// NOTA: Health checks (/health, /ready) e debug endpoints ficam sem auth para monitoramento
// NOTA: /api/payment/webhook deve ser público (sem auth) para receber notificações do Mercado Pago
app.use('/api/', (req, res, next) => {
  // Excluir webhook do Mercado Pago da autenticação
  if (
    req.path === '/payment/webhook' ||
    req.path === '/payment/webhook/' ||
    req.path.startsWith('/payment/details') ||
    req.path.startsWith('/payment/reference') ||
    req.path.startsWith('/payment/status') ||
    req.path.startsWith('/audio-transcription')
  ) {
    return next();
  }
  return verifyAuth(req, res, next);
});
app.use('/ai-chat', optionalAuth);
app.use('/ai-simulation', optionalAuth);

// --- DEBUG INSTRUMENTATION (temporário) ---
const debugStats = {
  http: [],            // { ts, ip, method, path, ua }
  firestoreReads: [],  // { ts, path, ip, ua, docsRead }
  socketConnections: []// { ts, socketId, userId, query, address }
};
function addHttpLog(entry) {
  debugStats.http.push(entry);
  if (debugStats.http.length > 500) debugStats.http.shift();
}
// --- fim debug ---

// --- Agente removido ---
// Rotas do agente legacy removidas. Se precisar restaurar, recupere de um commit anterior.

// --- Gerenciamento de Sessões Distribuídas (P0-B09) ---
// Sistema migrado para Firestore com fallback para memória
// Mantém compatibilidade com código existente enquanto adiciona persistência
const firestoreInstance = admin.apps.length ? admin.firestore() : null;
const sessionIntegration = new SessionIntegration(firestoreInstance, {
  distributedMode: process.env.NODE_ENV === 'production' && Boolean(firestoreInstance), // Ativar apenas se Firebase disponível
  instanceId: `server_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
  cacheTimeout: 30000 // 30 segundos
});

// Manter referência para compatibilidade com código existente
const sessions = sessionIntegration.memorySessions;
const userIdToSocketId = sessionIntegration.userIdToSocketId;

// Inicializar sistema de sessões
sessionIntegration.initializeSessionManager().then(() => {
  sessionLogger.info('Sistema de sessões distribuídas inicializado');
}).catch(error => {
  sessionLogger.warn('Erro ao inicializar sessões distribuídas, usando fallback', error.message);
});

// --- Endpoints HTTP ---

// NOTA: Endpoints de admin/upload futuros devem usar uploadLimiter
// Exemplo: app.post('/api/admin/upload', verifyAuth, requireAdmin, uploadLimiter, handler);
// NOTA: Endpoints de IA/chat futuros devem usar aiLimiter
// Exemplo: app.post('/api/ai-chat', verifyAuth, aiLimiter, handler);
app.use('/ai-chat', aiLimiter, aiChatRouter);
app.use('/ai-simulation', aiLimiter, aiSimulationRouter);
app.use('/api/descriptive-questions', descriptiveQuestionsRouter);
app.use('/api/access', accessControlRouter);
app.use('/api/payment', paymentRouter);

// ✅ NOVO: Rota de transcrição de áudio com Gemini 2.0 Flash
const audioTranscriptionRouter = require('./routes/audioTranscription');
app.use('/api/audio-transcription', audioTranscriptionRouter);

// Endpoint de verificação de saúde otimizado
// Em produção retornamos 204 No Content (muito leve) para reduzir custo de requisições e logs.
app.get('/health', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    // Resposta mínima e sem logs para não gerar custo desnecessário
    return res.sendStatus(204);
  }

  // Em desenvolvimento retornamos informações úteis para debug
  const healthData = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cache: getCacheStats(),
    version: process.env.npm_package_version || '1.0.0'
  };
  res.status(200).json(healthData);
});

// Endpoint de prontidão para Cloud Run
app.get('/ready', (req, res) => {
  // Verifica se Firebase está conectado e cache está funcionando
  const isReady = admin.apps.length > 0;
  if (isReady) {
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      services: {
        firebase: 'connected',
        cache: 'operational'
      }
    });
  } else {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      services: {
        firebase: 'disconnected',
        cache: 'unknown'
      }
    });
  }
});

// Endpoint para listar usuários do Firestore (com cache)
app.get('/api/users', async (req, res) => {
  try {
    const usersSnapshot = await admin.firestore().collection('users').get();
    const users = usersSnapshot.docs.map(doc => doc.data());

    // Instrumentação: conta documentos lidos e registra no debugStats
    try {
      const readEntry = {
        ts: new Date().toISOString(),
        path: req.path,
        ip: req.ip,
        ua: req.get('user-agent'),
        docsRead: usersSnapshot.size
      };
      debugStats.firestoreReads.push(readEntry);
      if (debugStats.firestoreReads.length > 500) debugStats.firestoreReads.shift();
      logger.debug('[FIRESTORE READ]', {
        timestamp: readEntry.ts,
        path: readEntry.path,
        ip: readEntry.ip,
        userAgent: readEntry.ua,
        docs: readEntry.docsRead
      });
    } catch (e) {
      logger.warn('Falha ao registrar firestoreReads', e && e.message);
    }

    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// NOVOS ENDPOINTS COM CACHE PARA OTIMIZAÇÃO DE CUSTOS

// Endpoint para obter usuário específico com cache
app.get('/api/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const userData = await getCachedUser(userId, admin.firestore());

    if (!userData) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json(userData);
  } catch (err) {
    apiLogger.error('Erro ao buscar usuário', err);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint para verificar status de edição de uma estação (otimizado com cache)
app.get('/api/stations/:stationId/edit-status', async (req, res) => {
  try {
    const { stationId } = req.params;
    const editStatus = await checkStationEditStatus(stationId, admin.firestore());

    res.json(editStatus);
  } catch (err) {
    apiLogger.error('Erro ao verificar status de edição', err);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint para verificar múltiplas estações (otimizado com cache em lote)
app.post('/api/stations/batch-edit-status', async (req, res) => {
  try {
    const { stationIds } = req.body;

    if (!Array.isArray(stationIds) || stationIds.length === 0) {
      return res.status(400).json({ error: 'Lista de IDs de estações é obrigatória' });
    }

    if (stationIds.length > 50) {
      return res.status(400).json({ error: 'Máximo de 50 estações por requisição' });
    }

    const results = await checkMultipleStationsEditStatus(stationIds, admin.firestore());
    res.json(results);
  } catch (err) {
    apiLogger.error('Erro ao verificar status de edição em lote', err);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint para invalidar cache (para administração)
// Protegido: Requer role admin (P0-B02)
// Nota: verifyAuth é aplicado globalmente para /api/* na linha 257
app.post('/api/cache/invalidate', requireAdmin, async (req, res) => {
  try {
    const { type, key } = req.body;

    if (!type || !key) {
      return res.status(400).json({ error: 'Tipo e chave são obrigatórios' });
    }

    let result = false;

    switch (type) {
      case 'user':
        result = invalidateUserCache(key);
        break;
      case 'station':
        result = invalidateStationCache(key);
        break;
      case 'editStatus':
        result = invalidateEditStatusCache(key);
        break;
      default:
        return res.status(400).json({ error: 'Tipo de cache inválido' });
    }

    res.json({
      success: result,
      message: result ? 'Cache invalidado com sucesso' : 'Chave não encontrada no cache'
    });
  } catch (err) {
    apiLogger.error('Erro ao invalidar cache', err);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint para criar uma nova sessão de simulação (P0-B09: Integração com Firestore)
app.post('/api/create-session', async (req, res) => {
  try {
    const { stationId } = req.body;
    if (!stationId) {
      return res.status(400).json({ error: 'ID da estação é obrigatório' });
    }

    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    // Usar SessionIntegration para criação distribuída
    await sessionIntegration.createSession(sessionId, {
      stationId,
      creatorId: req.user?.uid || 'anonymous',
      mode: 'sequential',
      duration: 600
    });

    const mode = sessionIntegration.distributedMode ? 'distribuída' : 'memória';
    apiLogger.info('Sessão criada via API', { sessionId, mode, stationId });
    res.status(201).json({ sessionId, mode });

  } catch (error) {
    apiLogger.error('Erro ao criar sessão', error);
    res.status(500).json({ error: 'Erro ao criar sessão', details: error.message });
  }
});

// --- ENDPOINT DE DEBUG E MONITORAMENTO (otimizado) ---
// Protegido: Requer role admin em produção (P0-B02)
// Em desenvolvimento, permite acesso sem autenticação para debug
app.get('/debug/metrics', (req, res) => {
  // Em desenvolvimento, permitir acesso sem autenticação
  if (process.env.NODE_ENV !== 'production') {
    return getDebugMetrics(req, res);
  }

  // Em produção, requer autenticação e role admin
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Admin access required in production',
      code: 'DEBUG_FORBIDDEN'
    });
  }

  getDebugMetrics(req, res);
});

// Função auxiliar para retornar métricas de debug
function getDebugMetrics(req, res) {
  const lastHttp = debugStats.http.slice(-100);
  const lastReads = debugStats.firestoreReads.slice(-100);
  const lastSockets = debugStats.socketConnections.slice(-100);

  // Obter estatísticas do cache
  const cacheStatsData = getCacheStats();

  res.json({
    now: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cache: cacheStatsData,
    http: lastHttp,
    firestoreReads: lastReads,
    socketConnections: lastSockets,
    activeSessions: sessions.size,
    activeUsers: userIdToSocketId.size
  });
}

// Endpoint para limpeza manual do cache
// Protegido: Requer autenticação + role admin (P0-B02)
app.post('/debug/cache/cleanup', verifyAuth, requireAdmin, (req, res) => {
  try {
    const deleted = cleanupExpiredCache();
    res.json({
      success: true,
      message: `${deleted} chaves expiradas removidas do cache`,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// --- ENDPOINTS DE ADMINISTRAÇÃO (P0-F05: Backend Admin Role Verification) ---

// Endpoint para obter informações administrativas do sistema
// Protegido: Requer role admin
app.get('/api/admin/dashboard', requireAdmin, async (req, res) => {
  try {
    // Coletar estatísticas do sistema
    const firestore = admin.firestore();

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
    const cacheStats = getCacheStats();

    // Estatísticas de sessões ativas
    const activeSessions = sessions.size;

    const dashboardData = {
      timestamp: new Date().toISOString(),
      statistics: {
        users: {
          total: usuarios.length,
          byRole: roleStats,
          recent: usuarios.filter(u => {
            const lastActive = u.lastActive ? new Date(u.lastActive) : new Date(0);
            return lastActive > new Date(Date.now() - 24 * 60 * 60 * 1000); // Últimas 24h
          }).length
        },
        stations: {
          total: estacoesCount,
          recent: estacoesSnapshot.docs.filter(doc => {
            const data = doc.data();
            const updatedAt = data.atualizadoEm ? new Date(data.atualizadoEm) : new Date(0);
            return updatedAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Última semana
          }).length
        },
        sessions: {
          active: activeSessions,
          totalToday: activeSessions // Simplificado para P0-F05
        },
        cache: {
          ...cacheStats,
          efficiency: cacheStats.entries > 0 ? ((cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100).toFixed(2) : 0
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
    adminLogger.error('Erro ao obter dados do dashboard', error);
    res.status(500).json({
      error: 'Erro ao obter dados administrativos',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint para listar usuários com informações detalhadas
// Protegido: Requer role admin
app.get('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    const { limit = 50, offset = 0, search = '', role = '' } = req.query;

    const firestore = admin.firestore();
    let query = firestore.collection('usuarios');

    // Aplicar filtro de role se especificado
    if (role) {
      query = query.where('role', '==', role);
    }

    // Aplicar busca se especificado
    if (search) {
      query = query.where('nome', '>=', search)
        .where('nome', '<=', search + '\uf8ff')
        .limit(limit);
    } else {
      query = query.limit(parseInt(limit)).offset(parseInt(offset));
    }

    const snapshot = await query.get();
    const users = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      lastLogin: doc.data().lastLogin ? doc.data().lastLogin.toDate() : null,
      createdAt: doc.data().createdAt ? doc.data().createdAt.toDate() : null
    }));

    res.json({
      users,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: users.length,
        hasMore: users.length === parseInt(limit)
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    adminLogger.error('Erro ao listar usuários', error);
    res.status(500).json({
      error: 'Erro ao listar usuários',
      message: error.message
    });
  }
});

// Endpoint para atualizar role de usuário
// Protegido: Requer permissão canManageRoles
app.put('/api/admin/users/:userId/role', requirePermission('canManageRoles'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { newRole } = req.body;

    if (!newRole || !['admin', 'moderator', 'user'].includes(newRole)) {
      return res.status(400).json({
        error: 'Role inválido',
        message: 'Role deve ser um de: admin, moderator, user',
        received: newRole
      });
    }

    const firestore = admin.firestore();
    const userRef = firestore.collection('usuarios').doc(userId);

    // Obter permissões padrão para o novo role
    const getDefaultPermissions = (role) => {
      const defaults = {
        admin: {
          canDeleteMessages: true,
          canManageUsers: true,
          canEditStations: true,
          canViewAnalytics: true,
          canManageRoles: true,
          canAccessAdminPanel: true
        },
        moderator: {
          canDeleteMessages: true,
          canManageUsers: false,
          canEditStations: true,
          canViewAnalytics: true,
          canManageRoles: false,
          canAccessAdminPanel: false
        },
        user: {
          canDeleteMessages: false,
          canManageUsers: false,
          canEditStations: false,
          canViewAnalytics: false,
          canManageRoles: false,
          canAccessAdminPanel: false
        }
      };
      return defaults[role] || defaults.user;
    };

    // Atualizar role e permissões
    await userRef.update({
      role: newRole,
      permissions: getDefaultPermissions(newRole),
      roleUpdatedBy: req.user.uid,
      roleUpdatedAt: new Date()
    });

    // Invalidar cache do usuário
    invalidateUserCache(userId);

    res.json({
      success: true,
      message: `Role do usuário atualizado para ${newRole}`,
      userId,
      newRole,
      updatedBy: req.user.email,
      timestamp: new Date().toISOString()
    });

    // Log da ação de admin
    adminLogger.info('Role atualizado', {
      updatedBy: req.user.email,
      userId,
      newRole
    });

  } catch (error) {
    adminLogger.error('Erro ao atualizar role', error);
    res.status(500).json({
      error: 'Erro ao atualizar role do usuário',
      message: error.message
    });
  }
});

// Endpoint para download de dados da coleção estacoes_clinicas
app.get('/api/stations/download-json', async (req, res) => {
  try {
    // Verificar se Firebase está disponível
    if (global.firebaseMockMode) {
      downloadLogger.info('Firebase em modo mock - retornando dados de exemplo');

      // Dados de exemplo para demonstração
      const estacoesMock = [
        {
          id: "estacao_exemplo_1",
          idEstacao: "EST001",
          tituloEstacao: "Consulta de Hipertensão Arterial",
          numeroDaEstacao: 1,
          especialidade: "Clínica Médica",
          tempoDuracaoMinutos: 10,
          nivelDificuldade: "Médio",
          palavrasChave: ["hipertensão", "pressão arterial", "consulta"],
          instrucoesParticipante: {
            descricaoCasoCompleta: "Paciente de 55 anos com queixa de cefaleia matinal...",
            tarefasPrincipais: ["Realizar anamnese", "Verificar pressão arterial", "Prescrever medicação"],
            avisosImportantes: ["Paciente com histórico de diabetes"]
          },
          criadoEm: new Date().toISOString(),
          atualizadoEm: new Date().toISOString()
        },
        {
          id: "estacao_exemplo_2",
          idEstacao: "EST002",
          tituloEstacao: "Atendimento de Emergência - IAM",
          numeroDaEstacao: 2,
          especialidade: "Cardiologia",
          tempoDuracaoMinutos: 15,
          nivelDificuldade: "Alto",
          palavrasChave: ["infarto", "emergência", "cardiologia"],
          instrucoesParticipante: {
            descricaoCasoCompleta: "Paciente de 60 anos com dor precordial há 2 horas...",
            tarefasPrincipais: ["Avaliar dor torácica", "Solicitar ECG", "Administrar medicação"],
            avisosImportantes: ["Situação de emergência", "Tempo é crucial"]
          },
          criadoEm: new Date().toISOString(),
          atualizadoEm: new Date().toISOString()
        }
      ];

      // Metadados do download
      const downloadMetadata = {
        timestamp: new Date().toISOString(),
        totalEstacoes: estacoesMock.length,
        versao: '1.0.0',
        fonte: 'Mock Data - Dados de exemplo para demonstração',
        aviso: 'Este é um ambiente de demonstração. Configure o Firebase para dados reais.'
      };

      // Objeto final para download
      const downloadData = {
        metadata: downloadMetadata,
        estacoes: estacoesMock
      };

      // Configurar headers para download
      const fileName = `estacoes_clinicas_mock_${new Date().toISOString().split('T')[0]}.json`;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('X-Total-Stations', estacoesMock.length);
      res.setHeader('X-Download-Timestamp', downloadMetadata.timestamp);
      res.setHeader('X-Mock-Mode', 'true');

      downloadLogger.debug('Estações mock preparadas', { total: estacoesMock.length });
      return res.json(downloadData);
    }

    downloadLogger.info('Iniciando download da coleção estacoes_clinicas');

    const estacoesColeção = admin.firestore().collection('estacoes_clinicas');
    const snapshot = await estacoesColeção.get();

    if (snapshot.empty) {
      return res.status(404).json({
        error: 'Nenhuma estação encontrada',
        message: 'A coleção estacoes_clinicas está vazia'
      });
    }

    // Construir array com todos os dados das estações
    const estacoes = [];
    snapshot.forEach(doc => {
      estacoes.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Metadados do download
    const downloadMetadata = {
      timestamp: new Date().toISOString(),
      totalEstacoes: estacoes.length,
      versao: '1.0.0',
      fonte: 'Firestore Collection: estacoes_clinicas'
    };

    // Objeto final para download
    const downloadData = {
      metadata: downloadMetadata,
      estacoes: estacoes
    };

    // Log da operação
    downloadLogger.info('Estações preparadas para download', { total: estacoes.length });

    // Instrumentação: registrar no debugStats
    try {
      const readEntry = {
        ts: new Date().toISOString(),
        path: req.path,
        ip: req.ip,
        ua: req.get('user-agent'),
        docsRead: snapshot.size
      };
      debugStats.firestoreReads.push(readEntry);
      if (debugStats.firestoreReads.length > 500) debugStats.firestoreReads.shift();
      logger.debug('[FIRESTORE READ]', {
        timestamp: readEntry.ts,
        path: readEntry.path,
        ip: readEntry.ip,
        docs: readEntry.docsRead
      });
    } catch (e) {
      logger.warn('Falha ao registrar firestoreReads', e && e.message);
    }

    // Configurar headers para download
    const fileName = `estacoes_clinicas_${new Date().toISOString().split('T')[0]}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('X-Total-Stations', estacoes.length);
    res.setHeader('X-Download-Timestamp', downloadMetadata.timestamp);

    // Retornar dados em formato JSON
    res.json(downloadData);

  } catch (error) {
    downloadLogger.error('Erro ao baixar dados', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao acessar dados da coleção estacoes_clinicas',
      details: error.message
    });
  }
});

// Endpoint para download de uma estação específica
app.get('/api/stations/:stationId/download-json', async (req, res) => {
  try {
    const { stationId } = req.params;

    // Log da requisição para debug
    downloadLogger.debug('Download por estação solicitado', {
      stationId,
      origin: req.headers.origin
    });

    // Aplicar headers CORS explicitamente
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Mock-Role, X-Mock-Email, x-mock-role, x-mock-email, user-id');
    res.header('Access-Control-Allow-Credentials', 'true');

    // Verificar se Firebase está disponível
    if (global.firebaseMockMode) {
      downloadLogger.info('Firebase em modo mock - retornando estação mock', { stationId });

      // Dados de exemplo baseados no stationId
      const estacaoMock = {
        id: stationId,
        idEstacao: stationId.toUpperCase(),
        tituloEstacao: `Estação Exemplo - ${stationId}`,
        numeroDaEstacao: 1,
        especialidade: "Clínica Médica",
        tempoDuracaoMinutos: 10,
        nivelDificuldade: "Médio",
        palavrasChave: ["exemplo", "demonstração", "mock"],
        instrucoesParticipante: {
          descricaoCasoCompleta: `Esta é uma estação de exemplo para demonstração da funcionalidade de download. ID: ${stationId}`,
          tarefasPrincipais: ["Tarefa 1 de exemplo", "Tarefa 2 de exemplo", "Tarefa 3 de exemplo"],
          avisosImportantes: ["Este é um dado de demonstração", "Configure o Firebase para dados reais"]
        },
        materiaisDisponiveis: {
          impressos: [
            {
              titulo: "Impresso de Exemplo",
              tipoConteudo: "texto_simples",
              conteudo: { texto: "Conteúdo de exemplo para demonstração" }
            }
          ],
          informacoesVerbaisSimulado: [
            {
              informacao: "Informação verbal de exemplo"
            }
          ]
        },
        padraoEsperadoProcedimento: {
          idChecklistAssociado: "checklist_exemplo",
          sinteseEstacao: {
            resumoCasoPEP: "Resumo de caso de exemplo",
            focoPrincipalDetalhado: ["Foco 1 de exemplo", "Foco 2 de exemplo"]
          },
          itensAvaliacao: [
            {
              idItem: "item_1",
              numeroOficial: 1,
              descricaoItemPEP: "Item de avaliação de exemplo",
              pontosAdequado: 5,
              pontosInadequado: 0,
              pontosParcial: 2.5
            }
          ],
          pontuacaoTotalEstacao: 5
        },
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString(),
        criadoPor: "sistema_mock",
        atualizadoPor: "sistema_mock"
      };

      const downloadMetadata = {
        timestamp: new Date().toISOString(),
        stationId: stationId,
        versao: '1.0.0',
        fonte: 'Mock Data - Dados de exemplo para demonstração',
        aviso: 'Este é um ambiente de demonstração. Configure o Firebase para dados reais.'
      };

      const downloadData = {
        metadata: downloadMetadata,
        estacao: estacaoMock
      };

      // Configurar headers para download
      const fileName = `estacao_${stationId}_mock_${new Date().toISOString().split('T')[0]}.json`;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('X-Station-Id', stationId);
      res.setHeader('X-Mock-Mode', 'true');

      downloadLogger.debug('Estação mock preparada para download', { stationId });
      return res.status(200).json(downloadData);
    }

    downloadLogger.info('Baixando estação específica', { stationId });

    // Verificar se admin firebase está disponível
    if (!admin.apps.length) {
      downloadLogger.error('Firebase Admin não inicializado para download');
      return res.status(503).json({
        error: 'Serviço temporariamente indisponível',
        message: 'Firebase não está configurado corretamente',
        stationId: stationId,
        timestamp: new Date().toISOString()
      });
    }

    const docRef = admin.firestore().collection('estacoes_clinicas').doc(stationId);
    const doc = await docRef.get();

    if (!doc.exists) {
      downloadLogger.warn('Estação não encontrada', { stationId });
      return res.status(404).json({
        error: 'Estação não encontrada',
        stationId: stationId,
        timestamp: new Date().toISOString()
      });
    }

    const stationData = {
      id: doc.id,
      ...doc.data()
    };

    const downloadMetadata = {
      timestamp: new Date().toISOString(),
      stationId: stationId,
      versao: '1.0.0',
      fonte: 'Firestore Document: estacoes_clinicas'
    };

    const downloadData = {
      metadata: downloadMetadata,
      estacao: stationData
    };

    // Configurar headers para download
    const fileName = `estacao_${stationId}_${new Date().toISOString().split('T')[0]}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('X-Station-Id', stationId);

    downloadLogger.info('Estação enviada com sucesso', { stationId });
    res.status(200).json(downloadData);

  } catch (error) {
    downloadLogger.error('Erro ao baixar estação', error);

    // Aplicar headers CORS mesmo em caso de erro
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Mock-Role, X-Mock-Email, x-mock-role, x-mock-email, user-id');

    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message,
      stationId: req.params.stationId,
      timestamp: new Date().toISOString()
    });
  }
});


// --- Funções utilitárias para timer por sessão (P0-B09: Integrado com SessionIntegration) ---
function startSessionTimer(sessionId, durationSeconds, onTick, onEnd) {
  // Usar SessionIntegration para timer distribuído
  sessionIntegration.updateTimer(sessionId, {
    startTime: new Date(),
    remainingTime: durationSeconds,
    isPaused: false
  }).then(() => {
    // Manter timer local para callbacks (compatibilidade)
    let remainingSeconds = durationSeconds;
    const intervalId = setInterval(() => {
      remainingSeconds--;
      if (typeof onTick === 'function') onTick(remainingSeconds);

      // Atualizar timer distribuído a cada 5 segundos
      if (remainingSeconds % 5 === 0) {
        sessionIntegration.updateTimer(sessionId, {
          remainingTime: remainingSeconds,
          isPaused: false
        }).catch(error => {
          sessionLogger.warn('Erro ao atualizar timer distribuído', error.message);
        });
      }

      if (remainingSeconds <= 0) {
        clearInterval(intervalId);
        sessionIntegration.updateTimer(sessionId, {
          remainingTime: 0,
          isPaused: true,
          endTime: new Date()
        }).catch(error => {
          sessionLogger.warn('Erro ao finalizar timer distribuído', error.message);
        });
        if (typeof onEnd === 'function') onEnd();
      }
    }, 1000);

    // Armazenar intervalId para cleanup
    const session = sessions.get(sessionId);
    if (session) {
      if (!session.timer) session.timer = {};
      session.timer.intervalId = intervalId;
      session.timer.remainingSeconds = durationSeconds;
    }
  }).catch(error => {
    sessionLogger.error('Erro ao iniciar timer distribuído, usando fallback local', error);
    // Fallback para timer local
    startLocalTimer(sessionId, durationSeconds, onTick, onEnd);
  });
}

function stopSessionTimer(sessionId, reason) {
  const timerManager = getTimerManager();
  
  // Parar timer no TimerManager
  timerManager.stopTimer(sessionId, reason);
  
  sessionIntegration.updateTimer(sessionId, {
    isPaused: true,
    endTime: new Date()
  }).then(() => {
    // Limpar timer local para compatibilidade
    const session = sessions.get(sessionId);
    if (session && session.timer && session.timer.intervalId) {
      clearInterval(session.timer.intervalId);
      session.timer = null;
    }
  }).catch(error => {
    sessionLogger.error('Erro ao parar timer distribuído', error);
  });
}

// Funções de fallback para timer local
function startLocalTimer(sessionId, durationSeconds, onTick, onEnd) {
  const session = sessions.get(sessionId);
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
  const session = sessions.get(sessionId);
  if (session && session.timer && session.timer.intervalId) {
    clearInterval(session.timer.intervalId);
    session.timer = null;
  }
}

// --- Lógica do Socket.IO ---

io.on('connection', (socket) => {
  // --- Mapeamento global de userId <-> socketId ---
  const handshakeUserId = socket.handshake.query.userId;
  if (handshakeUserId) {
    userIdToSocketId.set(handshakeUserId, socket.id);
  }

  // Registra conexão no debugStats
  try {
    const connTs = new Date().toISOString();
    const connEntry = {
      ts: connTs,
      socketId: socket.id,
      userId: handshakeUserId || null,
      query: socket.handshake.query || {},
      address: socket.handshake.address || (socket.request && socket.request.connection && socket.request.connection.remoteAddress) || null
    };
    debugStats.socketConnections.push(connEntry);
    if (debugStats.socketConnections.length > 1000) debugStats.socketConnections.shift();
    socketLogger.info('Novo cliente conectado', {
      socketId: socket.id,
      userId: handshakeUserId,
      remote: connEntry.address
    });
  } catch (e) {
    socketLogger.debug('Novo cliente conectado (erro ao registrar debug)', {
      socketId: socket.id,
      error: e.message
    });
  }

  // --- Eventos globais de convite/chat (NÃO dependem de sessão) ---
  socket.on('INTERNAL_INVITE', (data) => {
    const { toUserId, toName, fromUserId, fromName, timestamp } = data;
    const toSocketId = userIdToSocketId.get(toUserId);
    if (toSocketId) {
      io.to(toSocketId).emit('INTERNAL_INVITE_RECEIVED', {
        fromUserId,
        fromName,
        timestamp,
      });
      inviteLogger.info('Convite enviado', { fromUserId, toUserId });
    } else {
      inviteLogger.warn('Usuário alvo não conectado', { toUserId });
    }
  });

  // --- Aceite/Recusa de convite (mantém como está) ---
  socket.on('INTERNAL_INVITE_ACCEPTED', (data) => {
    const { fromUserId, toUserId } = data;
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const payload = {
      sessionId,
      users: [fromUserId, toUserId],
      startedAt: Date.now(),
    };
    const fromSocketId = userIdToSocketId.get(fromUserId);
    if (fromSocketId) io.to(fromSocketId).emit('SESSION_START', payload);
    const toSocketId = userIdToSocketId.get(toUserId);
    if (toSocketId) io.to(toSocketId).emit('SESSION_START', payload);
    inviteLogger.info('Convite aceito', { fromUserId, toUserId, sessionId });
  });

  socket.on('INTERNAL_INVITE_DECLINED', (data) => {
    const { fromUserId, toUserId } = data;
    const fromSocketId = userIdToSocketId.get(fromUserId);
    if (fromSocketId) io.to(fromSocketId).emit('INVITE_DECLINED', { fromUserId, toUserId });
    inviteLogger.info('Convite recusado', { fromUserId, toUserId });
  });

  // --- Handler para convite de simulação (SERVER_SEND_INTERNAL_INVITE) ---
  socket.on('SERVER_SEND_INTERNAL_INVITE', (data) => {
    const { toUserId, sessionId, stationId, meetLink, duration } = data;
    const toSocketId = userIdToSocketId.get(toUserId);

    if (toSocketId) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const simulationLink = `${frontendUrl}/simulation/${sessionId}?role=candidate&duration=${duration}`;

      io.to(toSocketId).emit('INTERNAL_INVITE_RECEIVED', {
        from: socket.handshake.query.userName || 'Avaliador',
        link: simulationLink,
        stationTitle: 'Simulação Clínica',
        sessionId,
        role: 'candidate',
        meet: meetLink || ''
      });
    }
  });

  // --- Lógica de Entrada na Sessão ---
  // Só executa se TODOS os parâmetros de sessão estiverem presentes
  const { sessionId, userId, role, stationId, displayName, isSequential, sequenceId, sequenceIndex, totalStations } = socket.handshake.query;
  if (sessionId && userId && role && stationId && displayName) {

    // Cria a sessão se for o primeiro a entrar
    if (!sessions.has(sessionId)) {
      // ✅ FIX: Armazenar informações de modo sequencial na sessão
      const sessionData = {
        stationId,
        participants: new Map(),
        createdAt: new Date(),
        timer: null,
        conversationHistory: [],
        aiOptions: {
          feedbackEnabled: false,
          pepAutoEvalEnabled: false
        },
        aiFeedback: null,
        aiFeedbackGeneratedAt: null,
        lastAiFeedbackOwner: null,
        aiPepEvaluation: null
      };

      // Se está em modo sequencial, armazena os parâmetros
      if (isSequential === 'true') {
        sessionData.isSequential = true;
        sessionData.sequenceId = sequenceId;
        sessionData.sequenceIndex = parseInt(sequenceIndex) || 0;
        sessionData.totalStations = parseInt(totalStations) || 0;
        sequentialLogger.info('Sessão sequencial criada', { sequenceId, sequenceIndex });
      }

      sessions.set(sessionId, sessionData);
      sessionLogger.info('Sessão criada', { sessionId, stationId });

      // ✅ FIX: Informar o CRIADOR da sessão sobre modo sequencial
      if (sessionData.isSequential) {
        socket.emit('SERVER_SEQUENTIAL_MODE_INFO', {
          isSequential: true,
          sequenceId: sessionData.sequenceId,
          sequenceIndex: sessionData.sequenceIndex,
          totalStations: sessionData.totalStations
        });
        sequentialLogger.debug('Informado criador sobre modo sequencial', {
          displayName,
          sequenceIndex: sessionData.sequenceIndex
        });
      }
    }

    const session = sessions.get(sessionId);
    if (!Array.isArray(session.conversationHistory)) {
      session.conversationHistory = [];
    }
    if (!session.aiOptions) {
      session.aiOptions = {
        feedbackEnabled: false,
        pepAutoEvalEnabled: false
      };
    }
    if (typeof session.aiFeedback === 'undefined') {
      session.aiFeedback = null;
    }
    if (typeof session.aiFeedbackGeneratedAt === 'undefined') {
      session.aiFeedbackGeneratedAt = null;
    }
    if (typeof session.lastAiFeedbackOwner === 'undefined') {
      session.lastAiFeedbackOwner = null;
    }
    if (typeof session.aiPepEvaluation === 'undefined') {
      session.aiPepEvaluation = null;
    }

    // Validação para garantir que a sessão não exceda 2 participantes
    if (session.participants.size >= 2 && !session.participants.has(userId)) {
      socketLogger.warn('Sessão cheia', { socketId: socket.id, userId, sessionId });
      socket.emit('SERVER_ERROR', { message: 'Esta sessão de simulação já está cheia.' });
      socket.disconnect();
      return;
    }

    // Verificar se é uma reconexão de um usuário que foi desconectado temporariamente
    let isReconnection = false;
    if (session.participants.has(userId)) {
      const existingParticipant = session.participants.get(userId);
      if (existingParticipant.disconnectedAt) {
        // Usuário está se reconectando
        isReconnection = true;
        existingParticipant.socketId = socket.id;
        existingParticipant.disconnectedAt = null; // Limpar flag de desconexão
        
        socketLogger.info('Usuário reconectado à sessão', {
          sessionId,
          userId,
          role,
          displayName,
          timeSinceDisconnect: (new Date() - new Date(existingParticipant.disconnectedAt)) / 1000
        });
        
        // Se for ator/avaliador se reconectando e a simulação estava pausada
        if ((role === 'actor' || role === 'evaluator')) {
          const timerManager = getTimerManager();
          const timerData = timerManager.getTimer(sessionId);
          
          if (timerData && timerData.isPaused && timerData.pauseReason === 'actor_disconnected') {
            // Não continuar automaticamente, apenas notificar que pode ser continuado
            socketLogger.info('Ator/avaliador reconectado, simulação continua pausada', {
              sessionId,
              reconnectedUser: displayName
            });
          }
        }
        
        // Notificar outros participantes sobre a reconexão
        socket.to(sessionId).emit('SERVER_PARTNER_RECONNECTED', {
          message: 'Seu parceiro de simulação se reconectou.',
          userId: userId,
          role: role,
          displayName: displayName
        });
      }
    }
    
    // Se não for reconexão, adicionar novo participante
    if (!isReconnection) {
      session.participants.set(userId, {
        socketId: socket.id,
        role,
        displayName,
        isReady: false,
        disconnectedAt: null
      });
    }
    socket.join(sessionId);
    socketLogger.info('Usuário entrou na sessão', { sessionId, userId, role, displayName });

    // ✅ FIX: Se a sessão está em modo sequencial, informa o novo participante
    if (session.isSequential) {
      socket.emit('SERVER_SEQUENTIAL_MODE_INFO', {
        isSequential: true,
        sequenceId: session.sequenceId,
        sequenceIndex: session.sequenceIndex,
        totalStations: session.totalStations
      });
      sequentialLogger.debug('Informado participante sobre modo sequencial', {
        displayName,
        sequenceIndex: session.sequenceIndex
      });
    }

    // Envia a lista atualizada de participantes para todos na sala
    // CRÍTICO: Incluir userId como propriedade do objeto (não apenas como chave do Map)
    const participantsList = Array.from(session.participants.entries()).map(([userId, data]) => ({
      userId,  // ✅ INCLUIR userId como propriedade
      ...data
    }));
    io.to(sessionId).emit('SERVER_PARTNER_UPDATE', { participants: participantsList });

    // Compartilha estado inicial de opções de IA e histórico de transcrições
    socket.emit('SERVER_AI_OPTIONS_UPDATE', {
      aiOptions: session.aiOptions || {
        feedbackEnabled: false,
        pepAutoEvalEnabled: false
      }
    });
    if (session.conversationHistory && session.conversationHistory.length > 0) {
      socket.emit('SERVER_AI_TRANSCRIPT_SYNC', {
        conversationHistory: session.conversationHistory
      });
    }
    if (session.aiPepEvaluation) {
      socket.emit('CANDIDATE_RECEIVE_UPDATED_SCORES', {
        scores: session.aiPepEvaluation.scores || {},
        totalScore: session.aiPepEvaluation.totalScore || 0,
        details: session.aiPepEvaluation.details || null,
        synced: true
      });
    }
    if (session.aiFeedback) {
      socket.emit('SERVER_AI_FEEDBACK_UPDATE', {
        feedback: session.aiFeedback,
        metadata: {
          generatedBy: session.lastAiFeedbackOwner || null,
          timestamp: session.aiFeedbackGeneratedAt || null
        },
        synced: true
      });
    }

    // Informa o status da sala ao novo participante
    if (session.participants.size === 1) {
      socket.emit('SERVER_WAITING_FOR_PARTNER');
    } else if (session.participants.size === 2) {
      io.to(sessionId).emit('SERVER_PARTNER_FOUND');
    }


    // --- Eventos da Simulação ---

    // Gestão de transcrições assistidas por IA (fala do candidato)
    socket.on('CLIENT_AI_TRANSCRIPT_ENTRY', (payload = {}) => {
      if (!session) return;

      const text = typeof payload.text === 'string' ? payload.text.trim() : '';
      if (!text) {
        return;
      }

      const entry = {
        role: payload.role || role,
        text,
        timestamp: payload.timestamp || new Date().toISOString(),
        speakerId: payload.speakerId || userId,
        speakerName: payload.speakerName || displayName
      };

      if (!Array.isArray(session.conversationHistory)) {
        session.conversationHistory = [];
      }
      session.conversationHistory.push(entry);

      // Limite de segurança para evitar crescimento infinito
      if (session.conversationHistory.length > 500) {
        session.conversationHistory.shift();
      }

      io.to(sessionId).emit('SERVER_AI_TRANSCRIPT_UPDATE', entry);
    });

    socket.on('CLIENT_REQUEST_AI_TRANSCRIPT_SYNC', () => {
      if (!session) return;
      socket.emit('SERVER_AI_TRANSCRIPT_SYNC', {
        conversationHistory: session.conversationHistory || []
      });
    });

    // Atualização das opções de IA (permitido apenas para ator/avaliador)
    socket.on('CLIENT_AI_OPTIONS_UPDATE', (payload = {}) => {
      if (!session) return;
      const participant = session.participants.get(userId);
      if (!participant || (participant.role !== 'actor' && participant.role !== 'evaluator')) {
        return;
      }

      if (!session.aiOptions) {
        session.aiOptions = {
          feedbackEnabled: false,
          pepAutoEvalEnabled: false
        };
      }

      const nextOptions = {
        feedbackEnabled: typeof payload.feedbackEnabled === 'boolean'
          ? payload.feedbackEnabled
          : session.aiOptions.feedbackEnabled,
        pepAutoEvalEnabled: typeof payload.pepAutoEvalEnabled === 'boolean'
          ? payload.pepAutoEvalEnabled
          : session.aiOptions.pepAutoEvalEnabled
      };

      session.aiOptions = { ...session.aiOptions, ...nextOptions };

      io.to(sessionId).emit('SERVER_AI_OPTIONS_UPDATE', {
        aiOptions: session.aiOptions,
        updatedBy: {
          userId,
          role: participant.role,
          displayName: participant.displayName
        },
        timestamp: new Date().toISOString()
      });
    });

    socket.on('CLIENT_AI_FEEDBACK_READY', (payload = {}) => {
      if (!session) return;
      const participant = session.participants.get(userId);
      if (!participant || (participant.role !== 'actor' && participant.role !== 'evaluator')) {
        return;
      }

      if (!payload || typeof payload.feedback === 'undefined') {
        return;
      }

      session.aiFeedback = payload.feedback;
      session.aiFeedbackGeneratedAt = new Date().toISOString();
      session.lastAiFeedbackOwner = {
        userId,
        role: participant.role,
        displayName: participant.displayName
      };

      io.to(sessionId).emit('SERVER_AI_FEEDBACK_UPDATE', {
        feedback: session.aiFeedback,
        metadata: {
          generatedBy: session.lastAiFeedbackOwner,
          timestamp: session.aiFeedbackGeneratedAt
        }
      });
    });

    socket.on('CLIENT_REQUEST_AI_FEEDBACK_SYNC', () => {
      if (!session || !session.aiFeedback) {
        return;
      }

      socket.emit('SERVER_AI_FEEDBACK_UPDATE', {
        feedback: session.aiFeedback,
        metadata: {
          generatedBy: session.lastAiFeedbackOwner || null,
          timestamp: session.aiFeedbackGeneratedAt || null
        },
        synced: true
      });
    });

    // Evento para sincronizar timer quando usuário retorna à página
    socket.on('CLIENT_TIMER_SYNC_REQUEST', (data) => {
      const { sessionId: targetSessionId, estimatedRemaining } = data;
      const session = sessions.get(targetSessionId);
      
      if (!session || !session.timer) {
        socketLogger.warn('Sessão ou timer não encontrado para sincronização', { 
          sessionId: targetSessionId 
        });
        return;
      }
      
      const timerManager = getTimerManager();
      const timerData = timerManager.getTimer(targetSessionId);
      
      if (timerData) {
        // Ajustar timer com base no tempo estimado do cliente
        const adjustedRemaining = Math.min(
          timerData.remainingSeconds, 
          Math.max(0, estimatedRemaining || timerData.remainingSeconds)
        );
        
        timerManager.syncTimer(targetSessionId, {
          remainingSeconds: adjustedRemaining,
          isPaused: timerData.isPaused // Manter estado de pausa
        });
        
        socketLogger.info('Timer sincronizado para cliente reconectado', {
          sessionId: targetSessionId,
          originalTime: timerData.remainingSeconds,
          adjustedTime: adjustedRemaining,
          isPaused: timerData.isPaused,
          estimatedByClient: estimatedRemaining
        });
        
        // Enviar estado atualizado para o cliente
        socket.emit('TIMER_SYNC_RESPONSE', {
          sessionId: targetSessionId,
          remainingSeconds: adjustedRemaining,
          isPaused: timerData.isPaused,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Eventos de pausa/continuar simulação (apenas ator/avaliador)
    socket.on('CLIENT_PAUSE_SIMULATION', (data) => {
      const { sessionId: targetSessionId } = data;
      const session = sessions.get(targetSessionId);
      
      if (!session) {
        socketLogger.warn('Sessão não encontrada para pausa', { sessionId: targetSessionId });
        return;
      }
      
      const participant = session.participants.get(userId);
      if (!participant || (participant.role !== 'actor' && participant.role !== 'evaluator')) {
        socketLogger.warn('Usuário não autorizado para pausar simulação', { 
          sessionId: targetSessionId, 
          userId,
          role: participant?.role 
        });
        return;
      }
      
      const timerManager = getTimerManager();
      const timerData = timerManager.getTimer(targetSessionId);
      
      if (timerData && !timerData.isPaused) {
        timerManager.pauseTimer(targetSessionId, 'manual_pause');
        
        sessionIntegration.updateTimer(targetSessionId, {
          isPaused: true,
          pausedAt: new Date()
        }).catch(error => {
          sessionLogger.warn('Erro ao atualizar estado de pausa no SessionIntegration', error.message);
        });
        
        // Notificar todos na sessão sobre a pausa
        io.to(targetSessionId).emit('SIMULATION_PAUSED', {
          pausedBy: {
            userId: userId,
            role: participant.role,
            displayName: participant.displayName
          },
          pausedAt: new Date().toISOString()
        });
        
        socketLogger.info('Simulação pausada', {
          sessionId: targetSessionId,
          pausedBy: participant.displayName
        });
      }
    });

    socket.on('CLIENT_RESUME_SIMULATION', (data) => {
      const { sessionId: targetSessionId } = data;
      const session = sessions.get(targetSessionId);
      
      if (!session) {
        socketLogger.warn('Sessão não encontrada para continuar', { sessionId: targetSessionId });
        return;
      }
      
      const participant = session.participants.get(userId);
      if (!participant || (participant.role !== 'actor' && participant.role !== 'evaluator')) {
        socketLogger.warn('Usuário não autorizado para continuar simulação', { 
          sessionId: targetSessionId, 
          userId,
          role: participant?.role 
        });
        return;
      }
      
      const timerManager = getTimerManager();
      const timerData = timerManager.getTimer(targetSessionId);
      
      if (timerData && timerData.isPaused) {
        timerManager.startTimer(targetSessionId);
        
        sessionIntegration.updateTimer(targetSessionId, {
          isPaused: false,
          resumedAt: new Date()
        }).catch(error => {
          sessionLogger.warn('Erro ao atualizar estado de continuação no SessionIntegration', error.message);
        });
        
        // Notificar todos na sessão sobre a continuação
        io.to(targetSessionId).emit('SIMULATION_RESUMED', {
          resumedBy: {
            userId: userId,
            role: participant.role,
            displayName: participant.displayName
          },
          resumedAt: new Date().toISOString()
        });
        
        socketLogger.info('Simulação continuada', {
          sessionId: targetSessionId,
          resumedBy: participant.displayName
        });
      }
    });

    // Cliente se marca como pronto
    socket.on('CLIENT_IM_READY', () => {
      if (session && session.participants.has(userId)) {
        session.participants.get(userId).isReady = true;
        socketLogger.info('Usuário marcou pronto', { sessionId, userId, role, displayName });

        // CRÍTICO: Incluir userId como propriedade do objeto (não apenas como chave do Map)
        const updatedParticipantsList = Array.from(session.participants.entries()).map(([userId, data]) => ({
          userId,  // ✅ INCLUIR userId como propriedade
          ...data
        }));
        io.to(sessionId).emit('SERVER_PARTNER_UPDATE', { participants: updatedParticipantsList });

        // ✅ NOVO: Emitir SERVER_PARTNER_READY para informar os outros participantes
        // Isso permite que o frontend atualize o estado de prontidão do parceiro
        socket.to(sessionId).emit('SERVER_PARTNER_READY', {
          userId: userId,
          isReady: true
        });
        socketLogger.debug('Evento SERVER_PARTNER_READY emitido', { sessionId, userId });

        // Verifica se todos estão prontos para habilitar o botão de início
        const allReady = updatedParticipantsList.every(p => p.isReady);
        if (session.participants.size === 2 && allReady) {
          socketLogger.info('Ambos participantes prontos', { sessionId });
          io.to(sessionId).emit('SERVER_BOTH_PARTICIPANTS_READY');
        }
      }
    });

    // Ator/Avaliador inicia a simulação
    socket.on('CLIENT_START_SIMULATION', (data) => {
      const { durationMinutes } = data;
      const durationSeconds = (durationMinutes || 10) * 60;

      socketLogger.info('Simulação iniciada', { sessionId, durationSeconds });

      if (session) {
        session.conversationHistory = [];
        session.aiPepEvaluation = null;
        session.aiFeedback = null;
        session.aiFeedbackGeneratedAt = null;
        session.lastAiFeedbackOwner = null;

        io.to(sessionId).emit('SERVER_AI_TRANSCRIPT_SYNC', { conversationHistory: [] });
        io.to(sessionId).emit('SERVER_AI_FEEDBACK_UPDATE', { feedback: null, reset: true });
        io.to(sessionId).emit('CANDIDATE_RECEIVE_UPDATED_SCORES', {
          scores: {},
          totalScore: 0,
          details: null,
          reset: true
        });
      }

      io.to(sessionId).emit('SERVER_START_SIMULATION', { durationSeconds });

      // **SINAL PARA INICIAR A CHAMADA DE VOZ**
      // O frontend deve ouvir este evento para iniciar a conexão de voz (seja WebRTC ou abrindo um link do Meet)
      io.to(sessionId).emit('SERVER_INITIATE_VOICE_CALL', {
        message: 'Por favor, inicie a comunicação por voz.',
        // meetLink: 'https://meet.google.com/new' // Exemplo se você gerar um link dinâmico
      });

      // Inicia o timer da sessão
      startSessionTimer(sessionId, durationSeconds,
        (remainingSeconds) => {
          io.to(sessionId).emit('TIMER_UPDATE', { remainingSeconds });
        },
        () => {
          io.to(sessionId).emit('TIMER_END');
          // Timer acabou, pode encerrar a sessão ou liberar recursos se necessário
        }
      );
    });

    // Encerramento manual da estação
    socket.on('CLIENT_MANUAL_END_SIMULATION', (data) => {
      if (!session) return;
      stopSessionTimer(sessionId, 'manual_end');
      io.to(sessionId).emit('TIMER_STOPPED', { reason: 'manual_end' });
    });

    // Liberação de impressos pelo ator
    socket.on('ACTOR_RELEASE_DATA', (data) => {
      if (!session) return;
      // Apenas ator pode liberar
      const participant = session.participants.get(userId);
      if (participant && participant.role === 'actor') {
        const { dataItemId } = data;
        io.to(sessionId).emit('CANDIDATE_RECEIVE_DATA', { dataItemId });
      }
    });

    // Liberação de PEP pelo ator/avaliador
    socket.on('ACTOR_RELEASE_PEP', (data) => {
      // VALIDAÇÃO: Garantir que o sessionId do payload corresponde à sessão do socket
      const targetSessionId = data?.sessionId || sessionId;
      const targetSession = sessions.get(targetSessionId);

      if (!targetSession) {
        pepLogger.warn('Sessão não encontrada para liberação de PEP', { targetSessionId });
        return;
      }

      const participant = targetSession.participants.get(userId);
      if (participant && (participant.role === 'actor' || participant.role === 'evaluator')) {
        pepLogger.info('Liberando PEP', {
          targetSessionId,
          actor: participant.displayName,
          userId,
          participants: targetSession.participants.size
        });

        // Emitir para TODOS na sessão (incluindo o candidato)
        io.to(targetSessionId).emit('CANDIDATE_RECEIVE_PEP_VISIBILITY', {
          shouldBeVisible: true,
          sessionId: targetSessionId  // Incluir sessionId no payload para validação no frontend
        });

    // Liberação de PEP pelo ator/avaliador
    socket.on('ACTOR_RELEASE_PEP', (data) => {
      console.log('[PEP_DEBUG_BACKEND] 📥 Recebido ACTOR_RELEASE_PEP');
      console.log('[PEP_DEBUG_BACKEND]   - data:', data);
      
      // VALIDAÇÃO: Garantir que o sessionId do payload corresponde à sessão do socket
      const targetSessionId = data?.sessionId || sessionId;
      const targetSession = sessions.get(targetSessionId);

      if (!targetSession) {
        console.log('[PEP_DEBUG_BACKEND] ❌ Sessão não encontrada para liberação de PEP', { targetSessionId });
        pepLogger.warn('Sessão não encontrada para liberação de PEP', { targetSessionId });
        return;
      }

      const participant = targetSession.participants.get(userId);
      if (participant && (participant.role === 'actor' || participant.role === 'evaluator')) {
        console.log('[PEP_DEBUG_BACKEND] ✅ Liberando PEP', {
          targetSessionId,
          actor: participant.displayName,
          userId,
          participants: targetSession.participants.size
        });

        // Emitir para TODOS na sessão (incluindo o candidato)
        const payload = {
          shouldBeVisible: true,
          sessionId: targetSessionId  // Incluir sessionId no payload para validação no frontend
        };
        
        console.log('[PEP_DEBUG_BACKEND] 📤 Emitindo CANDIDATE_RECEIVE_PEP_VISIBILITY');
        console.log('[PEP_DEBUG_BACKEND]   - payload:', payload);
        
        io.to(targetSessionId).emit('CANDIDATE_RECEIVE_PEP_VISIBILITY', payload);

        console.log('[PEP_DEBUG_BACKEND] ✅ Evento CANDIDATE_RECEIVE_PEP_VISIBILITY emitido', { targetSessionId });
        pepLogger.debug('Evento CANDIDATE_RECEIVE_PEP_VISIBILITY emitido', { targetSessionId });
      } else {
        console.log('[PEP_DEBUG_BACKEND] ❌ Usuário não autorizado para liberar PEP', { userId, targetSessionId });
        pepLogger.warn('Usuário não autorizado para liberar PEP', { userId, targetSessionId });
      }
    });
        pepLogger.debug('Evento CANDIDATE_RECEIVE_PEP_VISIBILITY emitido', { targetSessionId });
      } else {
        pepLogger.warn('Usuário não autorizado para liberar PEP', { userId, targetSessionId });
      }
    });

    // Ator/Avaliador envia atualizações de pontuação em tempo real
    
    socket.on('EVALUATOR_SCORES_UPDATED_FOR_CANDIDATE', (data) => {
    // Ator/Avaliador envia atualizações de pontuação em tempo real
    
    socket.on('EVALUATOR_SCORES_UPDATED_FOR_CANDIDATE', (data) => {
      console.log('[PEP_DEBUG_BACKEND] 📥 Recebido EVALUATOR_SCORES_UPDATED_FOR_CANDIDATE');
      console.log('[PEP_DEBUG_BACKEND]   - data:', data);
      console.log('[PEP_DEBUG_BACKEND]   - sessionId:', sessionId);
      
      if (!session) return;
      const participant = session.participants.get(userId);
      // Apenas ator ou avaliador pode enviar estas atualizações
      if (participant && (participant.role === 'actor' || participant.role === 'evaluator')) {
        const { scores = {}, totalScore = 0, details = null, performance = null, markedPepItems = {} } = data;
        const payload = {
          scores,
          totalScore
        
        };

        if (details) {
          payload.details = details;
        }
        if (performance) {
          payload.performance = performance;
        }
        if (markedPepItems) {
          payload.markedPepItems = markedPepItems;
        }

        console.log('[PEP_DEBUG_BACKEND] 📤 Enviando CANDIDATE_RECEIVE_UPDATED_SCORES para todos na sessão');
        console.log('[PEP_DEBUG_BACKEND]   - payload:', payload);
        
        // Envia as notas atualizadas para todos na sessão (incluindo o candidato)
        io.to(sessionId).emit('CANDIDATE_RECEIVE_UPDATED_SCORES', payload);
        session.aiPepEvaluation = {
          scores,
          totalScore,
          details: details || null,
          performance: performance || null,
          markedPepItems: markedPepItems || {},
          updatedAt: new Date().toISOString()
        };
        pepLogger.debug('Pontuações atualizadas enviadas', { sessionId, totalScore });
      }
    });
      if (!session) return;
      const participant = session.participants.get(userId);
      // Apenas ator ou avaliador pode enviar estas atualizações
      if (participant && (participant.role === 'actor' || participant.role === 'evaluator')) {
        const { scores = {}, totalScore = 0, details = null, performance = null, markedPepItems = {} } = data;
        const payload = {
          scores,
          totalScore
        
        };

        if (details) {
          payload.details = details;
        }
        if (performance) {
          payload.performance = performance;
        }
        if (markedPepItems) {
          payload.markedPepItems = markedPepItems;
        }

        // Envia as notas atualizadas para todos na sessão (incluindo o candidato)
        io.to(sessionId).emit('CANDIDATE_RECEIVE_UPDATED_SCORES', payload);
        session.aiPepEvaluation = {
          scores,
          totalScore,
          details: details || null,
          performance: performance || null,
          markedPepItems: markedPepItems || {},
          updatedAt: new Date().toISOString()
        };
        pepLogger.debug('Pontuações atualizadas enviadas', { sessionId, totalScore });
      }
    });

    // --- MODO SEQUENCIAL: Sincronização de Navegação ---
    // Quando o ator/avaliador avança para próxima estação, notifica todos os participantes
    socket.on('ACTOR_ADVANCE_SEQUENTIAL', (data) => {
      if (!session) return;

      const participant = session.participants.get(userId);

      // Apenas ator ou avaliador pode iniciar o avanço
      if (participant && (participant.role === 'actor' || participant.role === 'evaluator')) {
        const { nextStationId, sequenceIndex, sequenceId: seqId, sessionId: sharedSessionId } = data;

        sequentialLogger.info('Avanço de estação iniciado pelo ator/avaliador', {
          userId,
          nextStationId,
          sequenceIndex,
          sharedSessionId: sharedSessionId || sessionId,
          participants: session.participants.size
        });

        // Atualiza metadados da sessão sequencial para o backend acompanhar o progresso
        session.stationId = nextStationId;
        session.sequenceIndex = sequenceIndex;
        if (seqId) session.sequenceId = seqId;

        // ✅ FIX: Emitir para CADA participante individualmente via userId
        // Isso garante que o evento chegue mesmo se mudarem de sessão
        session.participants.forEach((partData, partUserId) => {
          const partSocketId = userIdToSocketId.get(partUserId);

          if (partSocketId) {
            sequentialLogger.debug('Emitindo avanço sequencial', {
              targetRole: partData.role,
              userId: partUserId,
              socketId: partSocketId
            });

            io.to(partSocketId).emit('SERVER_SEQUENTIAL_ADVANCE', {
              nextStationId,
              sequenceIndex,
              sequenceId: seqId,
              sessionId: sharedSessionId || sessionId,
              message: 'Avançando para próxima estação...'
            });
          } else {
            sequentialLogger.warn('Socket não encontrado para usuário ao avançar sequência', { partUserId });
          }
        });

        sequentialLogger.info('Evento SERVER_SEQUENTIAL_ADVANCE emitido', { sessionId });
      } else {
        sequentialLogger.warn('Usuário não autorizado para avançar sequência', { userId });
      }
    });
  }

  // --- Limpeza do mapeamento ao desconectar ---
  socket.on('disconnect', (reason) => {
    socketLogger.info('Cliente desconectado', { socketId: socket.id, reason });

    // Captura desconexões problemáticas no Sentry
    if (reason !== 'client namespace disconnect' && reason !== 'transport close') {
      captureWebSocketError(new Error(`WebSocket disconnect: ${reason}`), {
        socketId: socket.id,
        sessionId,
        userId: handshakeUserId,
        participants: session ? session.participants.size : 0
      });
    }

    // Limpa o mapeamento global
    if (handshakeUserId) {
      userIdToSocketId.delete(handshakeUserId);
    }

    // Lógica para remover o participante de qualquer sessão ativa
    if (sessionId && userId) {
      const session = sessions.get(sessionId);
      if (session && session.participants.has(userId)) {
        // Marcar participante como desconectado mas manter na sessão por 2 minutos
        // para permitir reconexão sem perder o timer
        const participant = session.participants.get(userId);
        participant.disconnectedAt = new Date();
        participant.socketId = null; // Limpar referência do socket
        
        socketLogger.info('Usuário marcado como desconectado (mantido para reconexão)', {
          sessionId,
          userId,
          role,
          displayName,
          reason
        });

        // Verificar se quem se desconectou é o ator/avaliador para pausar automaticamente
        let shouldPauseSimulation = false;
        if (participant.role === 'actor' || participant.role === 'evaluator') {
          shouldPauseSimulation = true;
          
          // Pausar timer automaticamente
          const timerManager = getTimerManager();
          const timerData = timerManager.getTimer(sessionId);
          
          if (timerData && !timerData.isPaused) {
            timerManager.pauseTimer(sessionId, 'actor_disconnected');
            
            sessionIntegration.updateTimer(sessionId, {
              isPaused: true,
              pausedAt: new Date(),
              pauseReason: 'actor_disconnected'
            }).catch(error => {
              sessionLogger.warn('Erro ao atualizar estado de pausa automática', error.message);
            });
            
            socketLogger.info('Simulação pausada automaticamente (ator/avaliador desconectado)', {
              sessionId,
              disconnectedUser: participant.displayName
            });
          }
        }

        // Notificar o outro participante que o parceiro se desconectou
        const remainingParticipants = Array.from(session.participants.entries()).map(([userId, data]) => ({
          userId,
          ...data
        }));

        io.to(sessionId).emit('SERVER_PARTNER_LEFT', {
          message: shouldPauseSimulation 
            ? `Seu parceiro (${participant.role === 'actor' ? 'Ator' : 'Avaliador'}) se desconectou. A simulação foi pausada automaticamente e aguardará a reconexão por 2 minutos.`
            : 'Seu parceiro de simulação se desconectou. A simulação continuará aguardando a reconexão.',
          participants: remainingParticipants,
          userId: userId,
          temporary: true, // Indica que é uma desconexão temporária
          simulationPaused: shouldPauseSimulation
        });

        // Configurar timeout para remover participante permanentemente se não reconectar
        setTimeout(() => {
          const currentSession = sessions.get(sessionId);
          if (currentSession && currentSession.participants.has(userId)) {
            const participantData = currentSession.participants.get(userId);
            
            // Se ainda está desconectado após 2 minutos, remover permanentemente
            if (participantData.disconnectedAt) {
              const now = new Date();
              const timeSinceDisconnect = (now - participantData.disconnectedAt) / 1000;
              
              if (timeSinceDisconnect > 120) { // 2 minutos
                currentSession.participants.delete(userId);
                socketLogger.info('Usuário removido permanentemente (tempo de reconexão expirado)', {
                  sessionId,
                  userId,
                  timeSinceDisconnect
                });

                // Parar timer apenas se a sessão ficar realmente vazia
                if (currentSession.participants.size === 0) {
                  stopSessionTimer(sessionId, 'session_empty');
                  sessions.delete(sessionId);
                  sessionLogger.info('Sessão removida por estar vazia', { sessionId });
                }
              }
            }
          }
        }, 120000); // 2 minutos
      }
    }
  });
});


// --- Configurações de Otimização e Limpeza Automática ---

// Limpeza automática de cache a cada 5 minutos
setInterval(() => {
  try {
    const deleted = cleanupExpiredCache();
    if (deleted > 0) {
      sessionLogger.debug('Cache cleanup executado', { deleted });
    }
  } catch (error) {
    sessionLogger.warn('Erro na limpeza automática de cache', error.message);
  }
}, 300000); // 5 minutos

// Limpeza automática de sessões antigas (para liberar memória)
setInterval(() => {
  try {
    const now = Date.now();
    let cleanedSessions = 0;

    for (const [sessionId, session] of sessions.entries()) {
      // Remove sessões inativas há mais de 2 horas
      if (now - session.createdAt.getTime() > 7200000) { // 2 horas
        stopSessionTimer(sessionId, 'auto_cleanup');
        sessions.delete(sessionId);
        cleanedSessions++;
      }
    }

    if (cleanedSessions > 0) {
      sessionLogger.debug('Sessões antigas removidas automaticamente', { cleanedSessions });
    }
  } catch (error) {
    sessionLogger.warn('Erro na limpeza automática de sessões', error.message);
  }
}, 1800000); // 30 minutos

// Configuração de graceful shutdown (P0-B09: SessionIntegration incluída)
process.on('SIGTERM', async () => {
  logger.warn('Recebido SIGTERM, iniciando shutdown graceful...');

  try {
    // Limpar timers ativos
    for (const [sessionId, session] of sessions.entries()) {
      stopSessionTimer(sessionId, 'shutdown');
    }

    // Encerrar SessionIntegration
    await sessionIntegration.shutdown();
    sessionLogger.info('SessionIntegration encerrado');

    // Fechar conexões Socket.IO
    io.close(() => {
      socketLogger.info('Socket.IO fechado');
    });

    // Fechar servidor HTTP
    server.close(() => {
      logger.info('Servidor HTTP fechado');
      process.exit(0);
    });
  } catch (error) {
    logger.error('Erro durante shutdown graceful', error);
    process.exit(1);
  }
});

process.on('SIGINT', () => {
  logger.warn('Recebido SIGINT, iniciando shutdown graceful...');
  process.emit('SIGTERM');
});

// Sentry ativo - erros capturados automaticamente

// --- Iniciar o Servidor ---

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0'; // Escuta em todas as interfaces
server.listen(PORT, HOST, () => {
  logger.info('Servidor backend otimizado iniciado', { host: HOST, port: PORT });
  logger.debug('Cache habilitado com monitoramento automático');
  logger.debug('Otimizações ativas: minScale=0, cache inteligente, health checks');
  logger.debug('Estimativa de redução de custos: ~80%');
  // console.log(`[REMOVIDO] Cloudflare Tunnel compatível: servidor escutando em todas as interfaces`);
});
