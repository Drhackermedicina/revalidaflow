// src/services/firestoreService.js

import { doc, updateDoc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { db, handleFirestoreError, isOnline } from '@/plugins/firebase'

// Wrapper para operações de update com retry automático
export async function updateDocumentWithRetry(docRef, data, operationName = 'update') {
  if (!db) {
    console.warn('⚠️ Firestore não disponível (modo simulado ou não inicializado)');
    return false;
  }

  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      await updateDoc(docRef, data);
      console.log(`✅ ${operationName} realizado com sucesso`);
      return true;
    } catch (error) {
      attempts++;
      const errorInfo = handleFirestoreError(error, operationName);

      if (errorInfo.shouldRetry && attempts < maxAttempts) {
        // Aguardar um tempo exponencial antes de tentar novamente
        const delay = Math.pow(2, attempts) * 1000; // 2s, 4s, 8s
        console.log(`⏳ Aguardando ${delay}ms antes da próxima tentativa...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      } else {
        console.error(`❌ Falha em ${operationName} após ${attempts} tentativas:`, error);

        // Se estivermos offline, notificar o usuário
        if (!isOnline) {
          console.warn('📡 Operação falhará quando a conectividade for restaurada');
        }

        throw error;
      }
    }
  }

  return false;
}

// Wrapper para operações de leitura com retry automático
export async function getDocumentWithRetry(docRef, operationName = 'leitura') {
  if (!db) {
    console.warn('⚠️ Firestore não disponível (modo simulado ou não inicializado)');
    return null;
  }

  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      const docSnap = await getDoc(docRef);
      console.log(`✅ ${operationName} realizada com sucesso`);
      return docSnap;
    } catch (error) {
      attempts++;
      const errorInfo = handleFirestoreError(error, operationName);

      if (errorInfo.shouldRetry && attempts < maxAttempts) {
        const delay = Math.pow(2, attempts) * 1000;
        console.log(`⏳ Aguardando ${delay}ms antes da próxima tentativa...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      } else {
        console.error(`❌ Falha em ${operationName} após ${attempts} tentativas:`, error);
        throw error;
      }
    }
  }

  return null;
}

// Wrapper para operações de escrita com retry automático
export async function setDocumentWithRetry(docRef, data, operationName = 'escrita') {
  if (!db) {
    console.warn('⚠️ Firestore não disponível (modo simulado ou não inicializado)');
    return false;
  }

  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      await setDoc(docRef, data);
      console.log(`✅ ${operationName} realizada com sucesso`);
      return true;
    } catch (error) {
      attempts++;
      const errorInfo = handleFirestoreError(error, operationName);

      if (errorInfo.shouldRetry && attempts < maxAttempts) {
        const delay = Math.pow(2, attempts) * 1000;
        console.log(`⏳ Aguardando ${delay}ms antes da próxima tentativa...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      } else {
        console.error(`❌ Falha em ${operationName} após ${attempts} tentativas:`, error);
        throw error;
      }
    }
  }

  return false;
}

// Função utilitária para verificar conectividade antes de operações críticas
export function checkFirestoreConnectivity() {
  if (!db) {
    return {
      available: false,
      reason: 'Firestore não inicializado ou em modo simulado'
    };
  }

  if (!isOnline) {
    return {
      available: false,
      reason: 'Sem conectividade de rede'
    };
  }

  return { available: true };
}

// Log de status da conectividade para debugging
export function logFirestoreStatus() {
  const status = checkFirestoreConnectivity();
  console.log('🔍 Status Firestore:', {
    available: status.available,
    reason: status.reason || 'Conectado',
    online: isOnline,
    timestamp: new Date().toISOString()
  });
}