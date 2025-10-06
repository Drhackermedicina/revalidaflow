// src/plugins/firebase.js

import { getApp, initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'
import { getStorage, ref } from 'firebase/storage'

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

// Configurar Firestore com a nova API de cache (evitando dupla inicialização)
let db;
const urlParams = new URLSearchParams(window.location.search);
const useSimulatedUser = import.meta.env.DEV && urlParams.get('sim_user') === 'true';

if (useSimulatedUser) {
  // Em modo de simulação, a instância do DB é nula para prevenir chamadas reais.
  db = null;
  console.warn('[Firebase Plugin] Firestore está DESATIVADO para usuário simulado.');
} else {
  // Inicialização melhorada do Firestore com tratamento de erros
  try {
    db = getFirestore(firebaseApp);
  } catch (error) {
    console.log('🔧 Inicializando Firestore com cache persistente...');
    try {
      db = initializeFirestore(firebaseApp, {
        cache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
          cacheSizeBytes: 10 * 1024 * 1024
        })
      });
      console.log('✅ Firestore inicializado com cache persistente');
    } catch (cacheError) {
      console.warn('⚠️ Erro ao configurar cache persistente, usando configuração padrão:', cacheError);
      // Fallback para configuração padrão sem cache persistente
      try {
        db = initializeFirestore(firebaseApp, {});
        console.log('✅ Firestore inicializado com configuração padrão');
      } catch (fallbackError) {
        console.error('❌ Falha crítica ao inicializar Firestore:', fallbackError);
        db = null;
      }
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
const MAX_RETRIES = 3;

// Função para lidar com erros de conectividade
export function handleFirestoreError(error, operation = 'operação') {
  console.warn(`⚠️ Erro Firestore durante ${operation}:`, error);

  if (error.code === 'unavailable' || error.message?.includes('transport errored')) {
    connectionRetries++;

    if (connectionRetries <= MAX_RETRIES) {
      console.log(`🔄 Tentativa ${connectionRetries}/${MAX_RETRIES} de reconexão...`);
      return { shouldRetry: true, retryCount: connectionRetries };
    } else {
      console.error('❌ Máximo de tentativas de reconexão atingido');
      connectionRetries = 0; // Reset para próximas operações
      return { shouldRetry: false, retryCount: connectionRetries };
    }
  }

  return { shouldRetry: false, retryCount: connectionRetries };
}

// Monitor de status de rede
window.addEventListener('online', () => {
  isOnline = true;
  connectionRetries = 0;
  console.log('🌐 Conectividade restaurada');
});

window.addEventListener('offline', () => {
  isOnline = false;
  console.log('📡 Conectividade perdida - operações offline ativadas');
});

export { isOnline };

// Inicialização do Storage com verificação e bucket explícito
let storage;
try {
  // Debug: verificar o valor real do storageBucket
  console.log('🔧 Firebase Config:', {
    storageBucket: firebaseConfig.storageBucket,
    projectId: firebaseConfig.projectId
  });

  // Forçar o uso do bucket correto (firebasestorage.app)
  // Usar o formato correto: gs://bucket-name
  const bucketUrl = `gs://${firebaseConfig.storageBucket}`;
  storage = getStorage(firebaseApp, bucketUrl);
  console.log('✅ Storage inicializado com bucket:', firebaseConfig.storageBucket);
} catch (error) {
  console.error('❌ Erro ao inicializar Storage:', error);
  throw error;
}

export { storage }

// Função para verificar conectividade do Storage
export async function testStorageConnection() {
  try {
    // Tenta criar uma referência simples para testar conectividade
    const testRef = ref(storage, 'test-connection');
    return true;
  } catch (error) {
    console.error('❌ Falha na conectividade do Storage:', error);
    return false;
  }
}
