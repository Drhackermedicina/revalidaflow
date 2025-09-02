// Utilitários para otimização de cache e redução de leituras desnecessárias
class ChatCacheManager {
  constructor() {
    this.messageCache = new Map();
    this.userCache = new Map();
    this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
    this.MAX_CACHE_SIZE = 50; // Máximo de conversas em cache
  }

  // Cache de mensagens
  getMessages(chatId) {
    const cached = this.messageCache.get(chatId);
    if (cached && (Date.now() - cached.ts) < this.CACHE_DURATION) {
      return cached.messages;
    }
    return null;
  }

  setMessages(chatId, messages) {
    // Limpar cache antigo se estiver muito grande
    if (this.messageCache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.messageCache.keys().next().value;
      this.messageCache.delete(oldestKey);
    }

    this.messageCache.set(chatId, {
      ts: Date.now(),
      messages: [...messages]
    });
  }

  invalidateMessages(chatId) {
    this.messageCache.delete(chatId);
  }

  // Cache de usuários
  getUser(userId) {
    const cached = this.userCache.get(userId);
    if (cached && (Date.now() - cached.ts) < this.CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }

  setUser(userId, userData) {
    this.userCache.set(userId, {
      ts: Date.now(),
      data: { ...userData }
    });
  }

  // Limpar todo o cache
  clearAll() {
    this.messageCache.clear();
    this.userCache.clear();
  }

  // Limpar cache expirado
  cleanup() {
    const now = Date.now();
    for (const [key, value] of this.messageCache.entries()) {
      if (now - value.ts > this.CACHE_DURATION) {
        this.messageCache.delete(key);
      }
    }
    for (const [key, value] of this.userCache.entries()) {
      if (now - value.ts > this.CACHE_DURATION) {
        this.userCache.delete(key);
      }
    }
  }
}

// Instância global do gerenciador de cache
export const chatCache = new ChatCacheManager();

// Limpeza automática a cada 10 minutos
setInterval(() => {
  chatCache.cleanup();
}, 10 * 60 * 1000);
