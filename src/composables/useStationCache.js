/**
 * useStationCache.js
 *
 * Composable para gerenciar cache de operações custosas em estações
 * Substitui os caches manuais (titleCache, areaCache, colorCache) por um sistema unificado
 */

import { shallowRef } from 'vue'

const CACHE_SIZE_LIMIT = 1000

/**
 * Cria um sistema de cache com memoização e limite de tamanho
 */
export function useStationCache() {
  const cache = shallowRef(new Map())

  /**
   * Memoiza uma função com base em uma chave
   * @param {Function} fn - Função a ser memoizada
   * @param {Function} keyFn - Função que gera a chave de cache a partir dos argumentos
   * @returns {Function} Versão memoizada da função
   */
  const memoize = (fn, keyFn) => {
    return (...args) => {
      const key = keyFn(...args)

      if (cache.value.has(key)) {
        return cache.value.get(key)
      }

      const result = fn(...args)

      // Implementar LRU simples: se atingir limite, remove a primeira entrada
      if (cache.value.size >= CACHE_SIZE_LIMIT) {
        const firstKey = cache.value.keys().next().value
        cache.value.delete(firstKey)
      }

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
   * Retorna o tamanho atual do cache
   */
  const getCacheSize = () => {
    return cache.value.size
  }

  /**
   * Remove uma entrada específica do cache
   */
  const removeFromCache = (key) => {
    cache.value.delete(key)
  }

  /**
   * Verifica se uma chave existe no cache
   */
  const hasInCache = (key) => {
    return cache.value.has(key)
  }

  return {
    memoize,
    clearCache,
    getCacheSize,
    removeFromCache,
    hasInCache
  }
}
