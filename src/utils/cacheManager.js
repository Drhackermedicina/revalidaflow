// Cache Manager para otimizar leituras do Firestore
import { doc, getDoc } from 'firebase/firestore';

class CacheManager {
  constructor() {
    this.cache = new Map();
    this.expirationTime = 5 * 60 * 1000; // 5 minutos em ms
    this.maxCacheSize = 100; // Máximo de itens no cache
  }

  // Gera chave única para o cache
  generateKey(collection, docId, field) {
    return `${collection}_${docId}_${field}`;
  }

  // Verifica se o item está no cache e não expirou
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    // Verifica se expirou
    if (Date.now() - item.timestamp > this.expirationTime) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  // Adiciona item ao cache
  set(key, value) {
    // Remove itens antigos se o cache estiver cheio
    if (this.cache.size >= this.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      value: value,
      timestamp: Date.now()
    });
  }

  // Remove item específico do cache
  delete(key) {
    this.cache.delete(key);
  }

  // Limpa todo o cache
  clear() {
    this.cache.clear();
  }

  // Obtém tamanho atual do cache
  size() {
    return this.cache.size;
  }
}

// Instância global do cache
const cacheManager = new CacheManager();

// --- Funções de Cache para localStorage ---

const LOCAL_STORAGE_ACTIVE_USERS_KEY = 'activeUsersCache';
const LOCAL_STORAGE_ACTIVE_USERS_EXPIRATION_TIME = 60 * 60 * 1000; // 1 hora em ms

export function getActiveUsersCache() {
  try {
    const cachedData = localStorage.getItem(LOCAL_STORAGE_ACTIVE_USERS_KEY);
    if (cachedData) {
      const { data, timestamp } = JSON.parse(cachedData);
      if (Date.now() - timestamp < LOCAL_STORAGE_ACTIVE_USERS_EXPIRATION_TIME) {
        return data;
      } else {
        // Cache expirado
        localStorage.removeItem(LOCAL_STORAGE_ACTIVE_USERS_KEY);
      }
    }
  } catch (error) {
    console.error('Erro ao ler cache de usuários ativos do localStorage:', error);
    localStorage.removeItem(LOCAL_STORAGE_ACTIVE_USERS_KEY); // Limpa cache corrompido
  }
  return null;
}

export function setActiveUsersCache(users) {
  try {
    const dataToStore = {
      data: users,
      timestamp: Date.now()
    };
    localStorage.setItem(LOCAL_STORAGE_ACTIVE_USERS_KEY, JSON.stringify(dataToStore));
  } catch (error) {
    console.error('Erro ao salvar cache de usuários ativos no localStorage:', error);
  }
}

export function clearActiveUsersCache() {
  try {
    localStorage.removeItem(LOCAL_STORAGE_ACTIVE_USERS_KEY);
  } catch (error) {
    console.error('Erro ao limpar cache de usuários ativos do localStorage:', error);
  }
}

const LOCAL_STORAGE_RECENT_CHATS_KEY = 'recentPrivateChats';
const MAX_RECENT_CHATS = 50; // Limite de chats recentes a serem armazenados

export function getRecentPrivateChats() {
  try {
    const cachedData = localStorage.getItem(LOCAL_STORAGE_RECENT_CHATS_KEY);
    return cachedData ? JSON.parse(cachedData) : [];
  } catch (error) {
    console.error('Erro ao ler chats recentes do localStorage:', error);
    return [];
  }
}

export function addRecentPrivateChat(otherUid) {
  try {
    let chats = getRecentPrivateChats();
    // Remove se já existir para mover para o início (mais recente)
    chats = chats.filter(uid => uid !== otherUid);
    // Adiciona no início
    chats.unshift(otherUid);
    // Limita o tamanho
    if (chats.length > MAX_RECENT_CHATS) {
      chats = chats.slice(0, MAX_RECENT_CHATS);
    }
    localStorage.setItem(LOCAL_STORAGE_RECENT_CHATS_KEY, JSON.stringify(chats));
  } catch (error) {
    console.error('Erro ao adicionar chat recente ao localStorage:', error);
  }
}

export function removeRecentPrivateChat(otherUid) {
  try {
    let chats = getRecentPrivateChats();
    chats = chats.filter(uid => uid !== otherUid);
    localStorage.setItem(LOCAL_STORAGE_RECENT_CHATS_KEY, JSON.stringify(chats));
  } catch (error) {
    console.error('Erro ao remover chat recente do localStorage:', error);
  }
}

// --- Funções existentes (mantidas) ---

// Função otimizada para verificar hasBeenEdited com cache
export async function checkStationEditStatus(db, stationId) {
  const cacheKey = cacheManager.generateKey('estacoes_clinicas', stationId, 'hasBeenEdited');

  // Verifica no cache primeiro
  const cachedValue = cacheManager.get(cacheKey);
  if (cachedValue !== null) {
    // Remove log - funcionamento normal do cache
    return cachedValue;
  }

  try {
    // Só faz a query se não estiver no cache
    const stationRef = doc(db, 'estacoes_clinicas', stationId);
    const stationSnap = await getDoc(stationRef);

    if (!stationSnap.exists()) {
      // Remove log - estação não encontrada é comportamento normal
      return false;
    }

    const hasBeenEdited = stationSnap.data().hasBeenEdited || false;

    // Salva no cache
    cacheManager.set(cacheKey, hasBeenEdited);

    // Remove log desnecessário
    return hasBeenEdited;

  } catch (error) {
    console.error(`[CACHE] ❌ Erro ao verificar status de edição para ${stationId}:`, error);
    return false;
  }
}

// Função para limpar cache quando necessário
export function clearStationCache() {
  cacheManager.clear();
  // Remove log desnecessário
}

// Função para obter estatísticas do cache
export function getCacheStats() {
  return {
    size: cacheManager.size(),
    maxSize: cacheManager.maxCacheSize,
    expirationTime: cacheManager.expirationTime
  };
}

// Função para verificar múltiplas estações com cache inteligente
export async function checkMultipleStationsEditStatus(db, stationIds) {
  const results = {};
  const uncachedIds = [];
  let errorCount = 0;

  // Primeiro, verifica quais estão no cache
  stationIds.forEach(stationId => {
    const cacheKey = cacheManager.generateKey('estacoes_clinicas', stationId, 'hasBeenEdited');
    const cachedValue = cacheManager.get(cacheKey);

    if (cachedValue !== null) {
      results[stationId] = cachedValue;
      // Remove log - cache funcionando normalmente
    } else {
      uncachedIds.push(stationId);
    }
  });

  // Só faz queries para os que não estão no cache
  if (uncachedIds.length > 0) {
    // Remove log desnecessário - funcionamento normal do cache

    // Para otimizar ainda mais, podemos fazer uma query em lote
    const batchPromises = uncachedIds.map(async (stationId) => {
      try {
        const stationRef = doc(db, 'estacoes_clinicas', stationId);
        const stationSnap = await getDoc(stationRef);

        if (!stationSnap.exists()) {
          // Remove log desnecessário - estação não encontrada é normal
          return { stationId, hasBeenEdited: false };
        }

        const hasBeenEdited = stationSnap.data().hasBeenEdited || false;
        return { stationId, hasBeenEdited };

      } catch (error) {
        errorCount++;
        // Só loga erro a cada 10 erros para reduzir verbosidade
        if (errorCount % 10 === 0) {
          console.error(`[CACHE] ❌ ${errorCount} erros acumulados ao verificar estações`);
        }
        return { stationId, hasBeenEdited: false };
      }
    });

    const batchResults = await Promise.all(batchPromises);

    // Salva no cache e nos resultados
    batchResults.forEach(({ stationId, hasBeenEdited }) => {
      const cacheKey = cacheManager.generateKey('estacoes_clinicas', stationId, 'hasBeenEdited');
      cacheManager.set(cacheKey, hasBeenEdited);
      results[stationId] = hasBeenEdited;

      // Remove logs de cache MISS - desnecessários em produção
    });
  }

  return results;
}

export { cacheManager };