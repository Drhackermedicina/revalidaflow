/**
 * useStationCache.js
 *
 * Composable para gerenciar cache de operações custosas em estações
 * Cache inteligente com TTL e LRU para melhor performance
 */

import { shallowRef } from 'vue'

const CACHE_SIZE_LIMIT = 500 // Reduzido para melhor performance
const CACHE_TTL = 10 * 60 * 1000 // 10 minutos TTL

/**
 * Classe de cache inteligente com TTL e LRU
 */
class SmartCache {
  constructor(maxSize = CACHE_SIZE_LIMIT, ttl = CACHE_TTL) {
    this.cache = new Map()
    this.maxSize = maxSize
    this.ttl = ttl
    this.accessOrder = new Map() // Para LRU
  }

  set(key, value) {
    const now = Date.now()

    // Remover entrada antiga se existir
    if (this.cache.has(key)) {
      this.accessOrder.delete(key)
    }

    // Implementar LRU: se atingir limite, remove a menos recentemente usada
    if (this.cache.size >= this.maxSize) {
      this.evictLRU()
    }

    // Adicionar nova entrada
    this.cache.set(key, { value, timestamp: now })
    this.accessOrder.set(key, now)
  }

  get(key) {
    const item = this.cache.get(key)
    if (!item) return null

    const now = Date.now()

    // Verificar TTL
    if (now - item.timestamp > this.ttl) {
      this.cache.delete(key)
      this.accessOrder.delete(key)
      return null
    }

    // Atualizar ordem de acesso para LRU
    this.accessOrder.set(key, now)

    return item.value
  }

  evictLRU() {
    if (this.accessOrder.size === 0) return

    // Encontrar entrada menos recentemente usada
    let oldestKey = null
    let oldestTime = Date.now()

    for (const [key, time] of this.accessOrder) {
      if (time < oldestTime) {
        oldestTime = time
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
      this.accessOrder.delete(oldestKey)
    }
  }

  clear() {
    this.cache.clear()
    this.accessOrder.clear()
  }

  size() {
    return this.cache.size
  }
}

/**
 * Cria um sistema de cache com memoização e limite de tamanho
 */
export function useStationCache() {
  const cache = shallowRef(new SmartCache())

  /**
   * Memoiza uma função com base em uma chave
   * @param {Function} fn - Função a ser memoizada
   * @param {Function} keyFn - Função que gera a chave de cache a partir dos argumentos
   * @returns {Function} Versão memoizada da função
   */
  const memoize = (fn, keyFn) => {
    return (...args) => {
      const key = keyFn(...args)

      // Tentar obter do cache
      const cached = cache.value.get(key)
      if (cached !== null) {
        return cached
      }

      // Calcular e armazenar no cache
      const result = fn(...args)
      cache.value.set(key, result)
      return result
    }
  }

  /**
   * Limpa todo o cache
   */
  const clearCache = () => {
    cache.value.clear()
  }

  /**
   * Obtém estatísticas do cache
   */
  const getCacheStats = () => {
    return {
      size: cache.value.size(),
      maxSize: cache.value.maxSize,
      ttl: cache.value.ttl
    }
  }

  return {
    memoize,
    clearCache,
    getCacheStats
  }
}
