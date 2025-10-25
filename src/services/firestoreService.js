// src/services/firestoreService.js

import { updateDoc, getDoc, setDoc } from 'firebase/firestore'
import { db, handleFirestoreError, isOnline, isOfflineMode } from '@/plugins/firebase'
import validationLogger from '@/utils/validationLogger'

// Wrapper para operações de update com retry automático
export async function updateDocumentWithRetry(docRef, data, operationName = 'update') {
  if (!db) {
    console.warn('⚠️ Firestore não disponível (modo simulado ou não inicializado)');
    return false;
  }

  if (isOfflineMode) {
    console.warn(`📡 ${operationName} pulada - modo offline ativo`);
    return false;
  }

  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      await updateDoc(docRef, data);
      validationLogger.logFirestoreRecovered(operationName, {
        operationType: 'update',
        attempts: 1,
        success: true
      });
      return true;
    } catch (error) {
      attempts++;
      const errorInfo = handleFirestoreError(error, operationName);

      // Verificar se estamos em modo offline após o erro
      if (errorInfo.offlineMode) {
        console.warn(`📡 ${operationName} abortada - modo offline ativado devido a erros persistentes`);
        return false;
      }

      if (errorInfo.shouldRetry && attempts < maxAttempts) {
        // Usar o backoff delay calculado pela handleFirestoreError
        const delay = errorInfo.backoffDelay || Math.pow(2, attempts) * 1000;
        console.log(`⏳ Aguardando ${delay}ms antes da próxima tentativa (${attempts}/${maxAttempts})...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      } else {
        console.error(`❌ Falha em ${operationName} após ${attempts} tentativas:`, error);

        // Se estivermos offline, notificar o usuário
        if (!isOnline || errorInfo.offlineMode) {
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

  if (isOfflineMode) {
    console.warn(`📡 ${operationName} pulada - modo offline ativo`);
    return null;
  }

  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      const docSnap = await getDoc(docRef);
      validationLogger.logFirestoreRecovered(operationName, {
        operationType: 'read',
        attempts: 1,
        success: true
      });
      return docSnap;
    } catch (error) {
      attempts++;
      const errorInfo = handleFirestoreError(error, operationName);

      // Verificar se estamos em modo offline após o erro
      if (errorInfo.offlineMode) {
        console.warn(`📡 ${operationName} abortada - modo offline ativado devido a erros persistentes`);
        return null;
      }

      if (errorInfo.shouldRetry && attempts < maxAttempts) {
        const delay = errorInfo.backoffDelay || Math.pow(2, attempts) * 1000;
        console.log(`⏳ Aguardando ${delay}ms antes da próxima tentativa (${attempts}/${maxAttempts})...`);
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

  if (isOfflineMode) {
    console.warn(`📡 ${operationName} pulada - modo offline ativo`);
    return false;
  }

  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      await setDoc(docRef, data);
      console.log(`✅ ${operationName} realizada com sucesso`);
      validationLogger.logFirestoreRecovered(operationName, {
        operationType: 'write',
        attempts: 1,
        success: true
      });
      return true;
    } catch (error) {
      attempts++;
      const errorInfo = handleFirestoreError(error, operationName);

      // Verificar se estamos em modo offline após o erro
      if (errorInfo.offlineMode) {
        console.warn(`📡 ${operationName} abortada - modo offline ativado devido a erros persistentes`);
        return false;
      }

      if (errorInfo.shouldRetry && attempts < maxAttempts) {
        const delay = errorInfo.backoffDelay || Math.pow(2, attempts) * 1000;
        console.log(`⏳ Aguardando ${delay}ms antes da próxima tentativa (${attempts}/${maxAttempts})...`);
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

  if (isOfflineMode) {
    return {
      available: false,
      reason: 'Modo offline ativo devido a erros de conectividade persistentes'
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
    offlineMode: isOfflineMode,
    timestamp: new Date().toISOString()
  });
}
