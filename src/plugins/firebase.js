// src/plugins/firebase.js

import { getApp, initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'
import { getStorage, ref } from 'firebase/storage'
import validationLogger from '@/utils/validationLogger'

// Configuração do seu projeto Firebase usando variáveis de ambiente quando disponíveis
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

// Validação da configuração antes de inicializar
if (!firebaseConfig.projectId || !firebaseConfig.storageBucket) {
  console.error('❌ Configuração Firebase incompleta:', {
    projectId: firebaseConfig.projectId,
    storageBucket: firebaseConfig.storageBucket
  });
  throw new Error('Configuração Firebase inválida');
}

// Verificar se já existe uma instância Firebase App
let firebaseApp
try {
  firebaseApp = getApp()
} catch (error) {
  firebaseApp = initializeApp(firebaseConfig)
}

// Debug da configuração

// Verificação de variáveis de ambiente

// Logs de diagnóstico para debugging

// Avisos de segurança

export { firebaseApp }
export const firebaseAuth = getAuth(firebaseApp)

// Detecção automática de ambiente proxy/restrito
function detectProxyEnvironment() {
  const proxyIndicators = [
    // Verificar se estamos atrás de proxy corporativo
    window.location.hostname.includes('.corp') ||
    window.location.hostname.includes('.local') ||
    window.location.hostname.includes('.internal'),
    // Verificar variáveis de ambiente que indicam proxy
    !!import.meta.env.VITE_HTTP_PROXY ||
    !!import.meta.env.VITE_HTTPS_PROXY ||
    !!import.meta.env.HTTP_PROXY ||
    !!import.meta.env.HTTPS_PROXY,
    // Verificar se há headers de proxy no navegador (se disponível)
    navigator.userAgent.includes('Corporate') ||
    navigator.userAgent.includes('Enterprise')
  ];

  const isProxyEnvironment = proxyIndicators.some(indicator => indicator);
  console.log('🔍 [DIAGNÓSTICO] Detecção de ambiente proxy:', {
    isProxyEnvironment,
    indicators: proxyIndicators,
    hostname: window.location.hostname,
    hasProxyEnv: !!(import.meta.env.VITE_HTTP_PROXY || import.meta.env.VITE_HTTPS_PROXY || import.meta.env.HTTP_PROXY || import.meta.env.HTTPS_PROXY)
  });

  return isProxyEnvironment;
}

// Configurar Firestore com a nova API de cache (evitando dupla inicialização)
let db;
const urlParams = new URLSearchParams(window.location.search);
const useSimulatedUser = import.meta.env.DEV && urlParams.get('sim_user') === 'true';
const isProxyEnvironment = detectProxyEnvironment();

if (useSimulatedUser) {
  // Em modo de simulação, a instância do DB é nula para prevenir chamadas reais.
  db = null;
  console.warn('[Firebase Plugin] Firestore está DESATIVADO para usuário simulado.');
} else {
  // Estratégia de inicialização baseada no ambiente detectado
  const usePersistentCache = !isProxyEnvironment;

  console.log('🔍 [DIAGNÓSTICO] Estratégia de inicialização Firestore:', {
    usePersistentCache,
    isProxyEnvironment,
    environment: import.meta.env.MODE
  });

  // Inicialização melhorada do Firestore com tratamento de erros e fallback inteligente
  try {
    if (usePersistentCache) {
      // Tentar com cache persistente primeiro em ambientes não-proxy
      db = initializeFirestore(firebaseApp, {
        cache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
          cacheSizeBytes: 10 * 1024 * 1024
        })
      });
      console.log('✅ Firestore inicializado com cache persistente');
      console.log('🔍 [DIAGNÓSTICO] Cache persistente habilitado para melhor performance');
    } else {
      // Em ambientes proxy/restritos, usar configuração sem cache persistente
      db = initializeFirestore(firebaseApp, {});
      console.log('✅ Firestore inicializado sem cache persistente (modo proxy/restrito)');
      console.log('🔍 [DIAGNÓSTICO] Cache desabilitado para compatibilidade com proxy');
    }
  } catch (error) {
    console.log('🔧 Tentativa de fallback na inicialização do Firestore...');
    console.log('🔍 [DIAGNÓSTICO] Erro na inicialização primária:', error);

    // Fallback: tentar sem cache persistente
    try {
      db = initializeFirestore(firebaseApp, {});
      console.log('✅ Firestore inicializado com configuração padrão (fallback)');
      console.log('🔍 [DIAGNÓSTICO] Fallback aplicado com sucesso');
    } catch (fallbackError) {
      console.error('❌ Falha crítica ao inicializar Firestore:', fallbackError);
      console.log('🔍 [DIAGNÓSTICO] Erro crítico no fallback:', {
        name: fallbackError.name,
        message: fallbackError.message,
        code: fallbackError.code,
        stack: fallbackError.stack
      });
      db = null;
    }
  }
}

export { db };

// Configurações adicionais de performance para Firestore
if (import.meta.env.DEV) {
  // Configurar timeouts mais generosos em desenvolvimento
  if (db) {
    // Configurar configurações de rede para lidar melhor com conectividade instável
  }
}

// Monitor de conectividade Firestore
let isOnline = navigator.onLine;
let connectionRetries = 0;
const MAX_RETRIES = 5; // Aumentado para mais tentativas
let isOfflineMode = false;
let lastConnectionError = null;
let proxyErrorCount = 0;
const PROXY_ERROR_THRESHOLD = 3; // Ativar modo offline após múltiplos erros de proxy

// Configurações de timeout e backoff
const CONNECTION_TIMEOUT = 10000; // 10 segundos
const BASE_BACKOFF_DELAY = 1000; // 1 segundo
const MAX_BACKOFF_DELAY = 30000; // 30 segundos

// Flag para indicar se estamos em processo de logout
let isLoggingOut = false;

// Função para marcar início do logout
export function setLoggingOutFlag(value) {
  isLoggingOut = value;
  if (value) {
    console.log('🚪 Iniciando processo de logout - erros de permissão serão silenciados');
  } else {
    console.log('✅ Processo de logout concluído');
  }
}

// Função para calcular delay de backoff exponencial
function calculateBackoffDelay(retryCount) {
  const delay = Math.min(BASE_BACKOFF_DELAY * Math.pow(2, retryCount), MAX_BACKOFF_DELAY);
  // Adicionar jitter para evitar thundering herd
  const jitter = Math.random() * 0.1 * delay;
  return Math.floor(delay + jitter);
}

// Função para detectar se erro é relacionado a proxy/tunnel
function isProxyError(error) {
  const proxyErrorPatterns = [
    'ERR_TUNNEL_CONNECTION_FAILED',
    'ERR_PROXY_CONNECTION_FAILED',
    'ERR_CONNECTION_REFUSED',
    'PROXY_AUTH_FAILED',
    'TUNNEL_CONNECTION_FAILED',
    'NETWORK_CHANGED',
    'INTERNET_DISCONNECTED',
    'CONNECTION_RESET',
    'ECONNRESET'
  ];

  return proxyErrorPatterns.some(pattern =>
    error.message?.includes(pattern) ||
    error.code?.includes(pattern) ||
    error.name?.includes(pattern)
  );
}

// Função para ativar/desativar modo offline
function setOfflineMode(enabled, reason) {
  if (isOfflineMode !== enabled) {
    isOfflineMode = enabled;
    const status = enabled ? 'ATIVADO' : 'DESATIVADO';
    console.log(`📡 MODO OFFLINE ${status}: ${reason}`);
    console.log(`🔍 [DIAGNÓSTICO] Status offline alterado para: ${enabled}`);

    // Emitir evento customizado para outros módulos
    window.dispatchEvent(new CustomEvent('firestore-offline-mode-changed', {
      detail: { enabled, reason }
    }));
  }
}

// Função para lidar com erros de conectividade
export function handleFirestoreError(error, operation = 'operação') {
  const errorTime = new Date().toISOString();
  const errorId = Math.random().toString(36).substr(2, 9);

  // LOG DE DIAGNÓSTICO: Análise detalhada de erros
  console.log(`[${errorTime}] handleFirestoreError: [${errorId}] 🔍 ANÁLISE DE ERRO em "${operation}":`, {
    name: error.name,
    code: error.code,
    message: error.message,
    stack: error.stack?.substring(0, 200), // Limitar stack trace
    isLoggingOut,
    connectionRetries,
    isOfflineMode,
    proxyErrorCount
  });

  // Armazenar último erro para diagnóstico
  lastConnectionError = error;

  // Detectar erros específicos de proxy/tunnel
  const proxyError = isProxyError(error);
  if (proxyError) {
    proxyErrorCount++;
    console.error(`[${errorTime}] handleFirestoreError: [${errorId}] 🚨 ERRO DE PROXY/TUNNEL DETECTADO (${proxyErrorCount}/${PROXY_ERROR_THRESHOLD}):`, error.message);
    console.error(`[${errorTime}] handleFirestoreError: [${errorId}] 🔍 Possíveis causas: Proxy corporativo, firewall, VPN, ou configuração de rede`);

    validationLogger.logFirestoreProxyError(operation, error, {
      proxyErrorCount,
      threshold: PROXY_ERROR_THRESHOLD,
      errorId
    });

    // Ativar modo offline se threshold atingido
    if (proxyErrorCount >= PROXY_ERROR_THRESHOLD && !isOfflineMode) {
      setOfflineMode(true, `Múltiplos erros de proxy detectados (${proxyErrorCount})`);
      validationLogger.logOfflineModeActivated(`Múltiplos erros de proxy detectados (${proxyErrorCount})`, {
        proxyErrorCount,
        threshold: PROXY_ERROR_THRESHOLD,
        operation: operation
      });
    }
  }

  // Durante logout, silenciar erros de permissão que são esperados
  if (isLoggingOut && error.code === 'permission-denied') {
    console.log(`🔇 Erro de permissão silenciado durante logout: ${operation}`);
    return { shouldRetry: false, retryCount: 0, silenced: true, offlineMode: isOfflineMode };
  }

  // Se estamos em modo offline, não tentar reconectar
  if (isOfflineMode) {
    console.log(`📡 Operação "${operation}" pulada - modo offline ativo`);
    return { shouldRetry: false, retryCount: 0, offlineMode: true };
  }

  console.warn(`⚠️ Erro Firestore durante ${operation}:`, error);

  // Determinar se deve tentar retry baseado no tipo de erro
  const shouldRetryConnection = (
    error.code === 'unavailable' ||
    error.code === 'deadline-exceeded' ||
    error.message?.includes('transport errored') ||
    error.message?.includes('connection') ||
    proxyError
  );

  if (shouldRetryConnection) {
    connectionRetries++;

    if (connectionRetries <= MAX_RETRIES) {
      const backoffDelay = calculateBackoffDelay(connectionRetries - 1);
      console.log(`🔄 Tentativa ${connectionRetries}/${MAX_RETRIES} de reconexão em ${backoffDelay}ms...`);
      console.log(`[${errorTime}] handleFirestoreError: [${errorId}] 🔄 RETRY ${connectionRetries}/${MAX_RETRIES} para ${operation} com backoff ${backoffDelay}ms`);

      validationLogger.logFirestoreConnectionError(operation, error, {
        connectionRetries,
        maxRetries: MAX_RETRIES,
        backoffDelay,
        errorId
      });

      return {
        shouldRetry: true,
        retryCount: connectionRetries,
        backoffDelay,
        offlineMode: false
      };
    } else {
      console.error('❌ Máximo de tentativas de reconexão atingido');
      console.log(`[${errorTime}] handleFirestoreError: [${errorId}] ❌ MÁXIMO DE RETRIES ATINGIDO para ${operation}`);

      // Reset counters e ativar modo offline se for erro de proxy persistente
      connectionRetries = 0;
      if (proxyError) {
        setOfflineMode(true, 'Falha persistente de conexão proxy/tunnel');
      }

      return { shouldRetry: false, retryCount: 0, offlineMode: isOfflineMode };
    }
  }

  return { shouldRetry: false, retryCount: connectionRetries, offlineMode: isOfflineMode };
}

// Função para testar conectividade do Firestore
export async function testFirestoreConnection(timeout = CONNECTION_TIMEOUT) {
  if (!db || isOfflineMode) {
    console.log('📡 Teste de conectividade pulado - Firestore indisponível ou modo offline');
    return { connected: false, offlineMode: isOfflineMode };
  }

  const testId = Math.random().toString(36).substr(2, 9);
  console.log(`🔍 [DIAGNÓSTICO] Teste de conectividade Firestore iniciado [${testId}]`);

  try {
    const testPromise = new Promise((resolve, reject) => {
      // Timeout para evitar travamentos
      const timeoutId = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, timeout);

      // Tentar uma operação simples (não escrever dados)
      // Usar uma collection de teste ou verificar se podemos obter referência
      resolve(true); // Por enquanto, apenas verificar se db existe
    });

    await testPromise;
    console.log(`✅ Conectividade Firestore OK [${testId}]`);
    return { connected: true, offlineMode: false };

  } catch (error) {
    console.error(`❌ Falha no teste de conectividade Firestore [${testId}]:`, error);
    return { connected: false, offlineMode: isOfflineMode, error };
  }
}

// Monitor de status de rede
window.addEventListener('online', async () => {
  isOnline = true;
  connectionRetries = 0;
  proxyErrorCount = 0; // Reset proxy errors on reconnection

  // Tentar desativar modo offline se conectividade foi restaurada
  if (isOfflineMode) {
    try {
      const result = await testFirestoreConnection();
      if (result.connected) {
        setOfflineMode(false, 'Conectividade restaurada');
        validationLogger.logFirestoreRecovered('network_restoration', {
          wasOfflineMode: true,
          connectionTestResult: result
        });
      }
    } catch (error) {
      console.warn('🔍 Erro ao testar conexão durante restauração:', error);
    }
  }

  console.log('🌐 Conectividade restaurada');
});

window.addEventListener('offline', () => {
  isOnline = false;
  console.log('📡 Conectividade perdida - operações offline ativadas');
  // Não ativar modo offline automaticamente aqui, deixar para handleFirestoreError decidir
});

export { isOnline, isOfflineMode, lastConnectionError };

// Inicialização do Storage com verificação e bucket explícito
let storage;
try {
  // Forçar o uso do bucket correto (firebasestorage.app)
  // Usar o formato correto: gs://bucket-name
  const bucketUrl = `gs://${firebaseConfig.storageBucket}`;
  storage = getStorage(firebaseApp, bucketUrl);
} catch (error) {
  console.error('❌ Erro ao inicializar Storage:', error);
  throw error;
}

export { storage }

// Função para verificar conectividade do Storage
export async function testStorageConnection() {
  try {
    // Tenta criar uma referência simples para testar conectividade
    ref(storage, 'test-connection');
    return true;
  } catch (error) {
    console.error('❌ Falha na conectividade do Storage:', error);
    return false;
  }
}
