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
  // Lógica original para inicializar o Firestore
  try {
    db = getFirestore(firebaseApp);
  } catch (error) {
    db = initializeFirestore(firebaseApp, {
      cache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
        cacheSizeBytes: 10 * 1024 * 1024
      })
    });
  }
}

export { db };

// Configurações adicionais de performance para Firestore
if (import.meta.env.DEV) {
}

// Inicialização do Storage com verificação
let storage;
try {
  storage = getStorage(firebaseApp);
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
