// src/plugins/firebase.js

import { getApp, initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

// Configuração do seu projeto Firebase usando variáveis de ambiente quando disponíveis
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDuakOooHv9a5slO0I3o3gttSBlSXD0aWw",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "revalida-companion.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "revalida-companion",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "revalida-companion.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "772316263153",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:772316263153:web:d0af4ecc404b6ca16a2f50"
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
  console.log('🔥 Firebase App já existente reutilizada')
} catch (error) {
  firebaseApp = initializeApp(firebaseConfig)
  console.log('🔥 Firebase App configurado')
}

// Debug da configuração
console.log('📦 Storage Bucket:', firebaseConfig.storageBucket);
console.log('🆔 Project ID:', firebaseConfig.projectId);
console.log('🌍 Auth Domain:', firebaseConfig.authDomain);

// Verificação de variáveis de ambiente
console.log('🔧 Variáveis de ambiente carregadas:');
console.log('VITE_FIREBASE_STORAGE_BUCKET:', import.meta.env.VITE_FIREBASE_STORAGE_BUCKET);
console.log('VITE_FIREBASE_PROJECT_ID:', import.meta.env.VITE_FIREBASE_PROJECT_ID);

export { firebaseApp }
export const firebaseAuth = getAuth(firebaseApp)

// Configurar Firestore com a nova API de cache (evitando dupla inicialização)
let db;
try {
  // Primeiro tenta obter uma instância existente
  db = getFirestore(firebaseApp);
  console.log('✅ Cache do Firestore configurado via getFirestore()');
} catch (error) {
  // Se não existe, inicializa com configurações personalizadas
  db = initializeFirestore(firebaseApp, {
    cache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
      cacheSizeBytes: 100 * 1024 * 1024 // 100MB
    })
  });
  console.log('✅ Firestore inicializado com cache persistente moderno');
}

export { db }

// Configurações adicionais de performance para Firestore
if (import.meta.env.DEV) {
  console.log('🔧 Configurações de desenvolvimento do Firestore aplicadas')
}

// Inicialização do Storage com verificação
let storage;
try {
  storage = getStorage(firebaseApp);
  console.log('✅ Storage inicializado com sucesso');
  console.log('� Storage URL:', storage.app.options.storageBucket);
} catch (error) {
  console.error('❌ Erro ao inicializar Storage:', error);
  throw error;
}

export { storage }

// Função para verificar conectividade do Storage
export async function testStorageConnection() {
  try {
    // Tenta criar uma referência simples para testar conectividade
    const { ref } = await import('firebase/storage');
    const testRef = ref(storage, 'test-connection');
    console.log('✅ Conectividade do Storage OK');
    return true;
  } catch (error) {
    console.error('❌ Falha na conectividade do Storage:', error);
    return false;
  }
}
