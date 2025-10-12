/**
 * LRUCache.js
 * 
 * Implementação de Least Recently Used Cache com TTL (Time To Live)
 * Otimizado para performance e gerenciamento de memória
 */

export class LRUCache {
  constructor(maxSize = 100, ttl = 5 * 60 * 1000) { // 5 minutos padrão
    this.maxSize = maxSize
    this.ttl = ttl
    this.cache = new Map()
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0
    }
  }

  /**
   * Obtém valor do cache
   * @param {string} key - Chave do cache
   * @returns {*} Valor ou null se não encontrado/expirado
   */
  get(key) {
    const item = this.cache.get(key)
    
    if (!item) {
      this.stats.misses++
      return null
    }

    // Verificar TTL
    if (this.ttl > 0 && Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key)
      this.stats.misses++
      this.stats.evictions++
      return null
    }

    // Move para o final (mais recentemente usado)
    this.cache.delete(key)
    this.cache.set(key, item)
    
    this.stats.hits++
    return item.value
  }

  /**
   * Adiciona ou atualiza valor no cache
   * @param {string} key - Chave do cache
   * @param {*} value - Valor a ser armazenado
   */
  set(key, value) {
    // Se já existe, remover para reordenar
    if (this.cache.has(key)) {
      this.cache.delete(key)
    } 
    // Se atingiu tamanho máximo, remover o mais antigo (primeiro)
    else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
      this.stats.evictions++
    }

    // Adicionar no final (mais recente)
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    })
  }

  /**
   * Remove item do cache
   * @param {string} key - Chave do cache
   * @returns {boolean} True se removido, false se não existia
   */
  delete(key) {
    return this.cache.delete(key)
  }

  /**
   * Limpa todo o cache
   */
  clear() {
    const size = this.cache.size
    this.cache.clear()
    this.stats.evictions += size
  }

  /**
   * Verifica se chave existe no cache (sem considerar TTL)
   * @param {string} key - Chave do cache
   * @returns {boolean}
   */
  has(key) {
    return this.cache.has(key)
  }

  /**
   * Retorna tamanho atual do cache
   * @returns {number}
   */
  get size() {
    return this.cache.size
  }

  /**
   * Retorna estatísticas do cache
   * @returns {Object}
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses
    return {
      ...this.stats,
      size: this.cache.size,
      maxSize: this.maxSize,
      ttl: this.ttl,
      hitRate: total > 0 ? (this.stats.hits / total) * 100 : 0
    }
  }

  /**
   * Limpa itens expirados
   * @returns {number} Quantidade de itens removidos
   */
  cleanupExpired() {
    if (this.ttl <= 0) return 0

    const now = Date.now()
    let removed = 0

    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > this.ttl) {
        this.cache.delete(key)
        removed++
        this.stats.evictions++
      }
    }

    return removed
  }

  /**
   * Cria uma função memoizada usando este cache
   * @param {Function} fn - Função a ser memoizada
   * @param {Function} keyGenerator - Função que gera a chave do cache baseado nos argumentos
   * @returns {Function} Função memoizada
   */
  memoize(fn, keyGenerator = (...args) => JSON.stringify(args)) {
    const cache = this

    return function memoized(...args) {
      const key = keyGenerator(...args)
      
      // Tentar obter do cache
      const cached = cache.get(key)
      if (cached !== null) {
        return cached
      }

      // Executar função e cachear resultado
      const result = fn.apply(this, args)
      cache.set(key, result)
      return result
    }
  }
}

/**
 * Factory function para criar cache com configurações específicas
 */
export function createCache(options = {}) {
  const {
    maxSize = 100,
    ttl = 5 * 60 * 1000,
    cleanupInterval = 60 * 1000 // Limpar expirados a cada minuto
  } = options

  const cache = new LRUCache(maxSize, ttl)

  // Configurar limpeza automática se especificado
  if (cleanupInterval > 0) {
    setInterval(() => {
      cache.cleanupExpired()
    }, cleanupInterval)
  }

  return cache
}

// Cache compartilhado para títulos de estações
export const stationTitleCache = createCache({
  maxSize: 500,
  ttl: 30 * 60 * 1000, // 30 minutos
  cleanupInterval: 5 * 60 * 1000 // Limpar a cada 5 minutos
})

// Cache compartilhado para dados de estações
export const stationDataCache = createCache({
  maxSize: 200,
  ttl: 10 * 60 * 1000, // 10 minutos
  cleanupInterval: 60 * 1000 // Limpar a cada minuto
})
