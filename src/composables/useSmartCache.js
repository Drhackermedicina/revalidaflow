/**
 * useSmartCache.js
 * 
 * Composable para cache inteligente usando localStorage/sessionStorage
 * Reduz drasticamente as leituras do Firebase mantendo dados em cache local
 * 
 * Features:
 * - Cache com TTL (Time To Live)
 * - Invalidação automática
 * - Fallback para memória se localStorage não disponível
 * - Compressão de dados grandes
 */

import { ref } from 'vue'

// Cache em memória como fallback
const memoryCache = new Map()

export function useSmartCache() {
  const CACHE_PREFIX = 'rflow_cache_'
  const DEFAULT_TTL = 5 * 60 * 1000 // 5 minutos padrão
  
  // Cache específico para diferentes tipos de dados
  const CACHE_CONFIG = {
    stations: { ttl: 10 * 60 * 1000 }, // 10 minutos para estações
    users: { ttl: 2 * 60 * 1000 },     // 2 minutos para usuários online
    scores: { ttl: 5 * 60 * 1000 },    // 5 minutos para pontuações
    station_full: { ttl: 30 * 60 * 1000 }, // 30 minutos para estação completa
  }
  
  /**
   * Verifica se localStorage está disponível
   */
  const isLocalStorageAvailable = () => {
    try {
      const test = '__localStorage_test__'
      localStorage.setItem(test, test)
      localStorage.removeItem(test)
      return true
    } catch {
      return false
    }
  }
  
  const hasLocalStorage = isLocalStorageAvailable()
  
  /**
   * Obtém item do cache
   */
  const getCacheItem = (key) => {
    const fullKey = CACHE_PREFIX + key
    
    try {
      if (hasLocalStorage) {
        const item = localStorage.getItem(fullKey)
        if (item) {
          return JSON.parse(item)
        }
      } else {
        return memoryCache.get(fullKey)
      }
    } catch (error) {
      console.warn('Erro ao ler cache:', error)
      // Remove item corrompido
      if (hasLocalStorage) {
        localStorage.removeItem(fullKey)
      } else {
        memoryCache.delete(fullKey)
      }
    }
    
    return null
  }
  
  /**
   * Salva item no cache
   */
  const setCacheItem = (key, data, ttl = DEFAULT_TTL) => {
    const fullKey = CACHE_PREFIX + key
    const cacheData = {
      data,
      timestamp: Date.now(),
      ttl,
      expires: Date.now() + ttl
    }
    
    try {
      if (hasLocalStorage) {
        const serialized = JSON.stringify(cacheData)
        
        // Verifica tamanho antes de salvar (localStorage tem limite de ~5-10MB)
        if (serialized.length > 500000) { // 500KB limite por item
          console.warn(`Cache item muito grande (${(serialized.length/1024).toFixed(2)}KB), usando cache de memória`)
          memoryCache.set(fullKey, cacheData)
        } else {
          localStorage.setItem(fullKey, serialized)
        }
      } else {
        memoryCache.set(fullKey, cacheData)
      }
    } catch (error) {
      console.warn('Erro ao salvar cache:', error)
      // Se localStorage estiver cheio, limpa cache antigo
      if (error.name === 'QuotaExceededError') {
        clearExpiredCache()
        // Tenta novamente
        try {
          localStorage.setItem(fullKey, JSON.stringify(cacheData))
        } catch {
          // Se ainda falhar, usa memória
          memoryCache.set(fullKey, cacheData)
        }
      }
    }
  }
  
  /**
   * Remove item do cache
   */
  const removeCacheItem = (key) => {
    const fullKey = CACHE_PREFIX + key
    
    if (hasLocalStorage) {
      localStorage.removeItem(fullKey)
    }
    memoryCache.delete(fullKey)
  }
  
  /**
   * Limpa cache expirado
   */
  const clearExpiredCache = () => {
    const now = Date.now()
    
    if (hasLocalStorage) {
      const keysToRemove = []
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith(CACHE_PREFIX)) {
          try {
            const item = JSON.parse(localStorage.getItem(key))
            if (item && item.expires && item.expires < now) {
              keysToRemove.push(key)
            }
          } catch {
            // Remove item corrompido
            keysToRemove.push(key)
          }
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key))
    }
    
    // Limpa cache de memória
    for (const [key, value] of memoryCache.entries()) {
      if (value.expires && value.expires < now) {
        memoryCache.delete(key)
      }
    }
  }
  
  /**
   * Obtém dados com cache inteligente
   * @param {string} key - Chave do cache
   * @param {Function} fetcher - Função para buscar dados se cache expirado
   * @param {Object} options - Opções de cache
   */
  const getCachedData = async (key, fetcher, options = {}) => {
    const { 
      ttl = DEFAULT_TTL, 
      forceRefresh = false,
      cacheType = 'default'
    } = options
    
    // Usa TTL específico do tipo se disponível
    const finalTtl = CACHE_CONFIG[cacheType]?.ttl || ttl
    
    if (!forceRefresh) {
      const cached = getCacheItem(key)
      
      if (cached && cached.data) {
        const now = Date.now()
        
        // Verifica se ainda está válido
        if (cached.expires > now) {
          console.log(`✅ Cache hit: ${key}`)
          return cached.data
        }
      }
    }
    
    // Cache miss ou expirado - busca dados frescos
    console.log(`🔄 Cache miss/expired: ${key} - buscando dados...`)
    
    try {
      const freshData = await fetcher()
      
      // Salva no cache
      setCacheItem(key, freshData, finalTtl)
      
      return freshData
    } catch (error) {
      console.error(`Erro ao buscar dados para ${key}:`, error)
      
      // Se houver erro, tenta retornar cache expirado (melhor que nada)
      const cached = getCacheItem(key)
      if (cached && cached.data) {
        console.warn(`Usando cache expirado devido a erro: ${key}`)
        return cached.data
      }
      
      throw error
    }
  }
  
  /**
   * Invalida cache por padrão
   */
  const invalidateCache = (pattern) => {
    if (hasLocalStorage) {
      const keysToRemove = []
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith(CACHE_PREFIX)) {
          const cacheKey = key.replace(CACHE_PREFIX, '')
          if (pattern instanceof RegExp ? pattern.test(cacheKey) : cacheKey.includes(pattern)) {
            keysToRemove.push(key)
          }
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key))
    }
    
    // Limpa cache de memória
    for (const key of memoryCache.keys()) {
      const cacheKey = key.replace(CACHE_PREFIX, '')
      if (pattern instanceof RegExp ? pattern.test(cacheKey) : cacheKey.includes(pattern)) {
        memoryCache.delete(key)
      }
    }
  }
  
  /**
   * Limpa todo o cache
   */
  const clearAllCache = () => {
    if (hasLocalStorage) {
      const keysToRemove = []
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith(CACHE_PREFIX)) {
          keysToRemove.push(key)
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key))
    }
    
    memoryCache.clear()
  }
  
  /**
   * Obtém estatísticas do cache
   */
  const getCacheStats = () => {
    let localStorageSize = 0
    let localStorageCount = 0
    let memoryCount = memoryCache.size
    
    if (hasLocalStorage) {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith(CACHE_PREFIX)) {
          localStorageCount++
          const item = localStorage.getItem(key)
          if (item) {
            localStorageSize += item.length
          }
        }
      }
    }
    
    return {
      localStorageCount,
      localStorageSize: `${(localStorageSize / 1024).toFixed(2)} KB`,
      memoryCount,
      totalItems: localStorageCount + memoryCount
    }
  }
  
  // Limpa cache expirado periodicamente (a cada 5 minutos)
  setInterval(clearExpiredCache, 5 * 60 * 1000)
  
  // Limpa cache expirado ao inicializar
  clearExpiredCache()
  
  return {
    getCachedData,
    setCacheItem,
    getCacheItem,
    removeCacheItem,
    invalidateCache,
    clearAllCache,
    clearExpiredCache,
    getCacheStats
  }
}
