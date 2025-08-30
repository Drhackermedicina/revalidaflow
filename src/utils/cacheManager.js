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
