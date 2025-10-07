import { ref } from 'vue'

export function useSimulationHelpers() {
  const copySuccess = ref(false)

  /**
   * Copia texto para a área de transferência
   */
  async function copyToClipboard(text: string): Promise<boolean> {
    if (!text) return false

    try {
      await navigator.clipboard.writeText(text)
      copySuccess.value = true
      setTimeout(() => copySuccess.value = false, 2000)
      return true
    } catch (error) {
      console.error('Erro ao copiar para área de transferência:', error)
      alert('Falha ao copiar.')
      return false
    }
  }

  /**
   * Busca rota aninhada por nome
   */
  function findRouteByName(routes: any[], name: string): any {
    for (const route of routes) {
      if (route.name === name) return route
      if (route.children) {
        const found = findRouteByName(route.children, name)
        if (found) return found
      }
    }
    return null
  }

  /**
   * Valida se uma URL é válida
   */
  function isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  /**
   * Formata tempo em minutos para string MM:SS
   */
  function formatTime(minutes: number): string {
    const mins = Math.floor(minutes)
    const secs = Math.round((minutes - mins) * 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  /**
   * Gera ID único para sessão
   */
  function generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Converte scores para números
   */
  function normalizeScores(scores: Record<string, any>): Record<string, number> {
    const numericScores: Record<string, number> = {}

    Object.keys(scores).forEach(key => {
      numericScores[key] = typeof scores[key] === 'string'
        ? parseFloat(scores[key])
        : scores[key]
    })

    return numericScores
  }

  /**
   * Calcula soma total dos scores
   */
  function calculateTotalScore(scores: Record<string, number>): number {
    return Object.values(scores).reduce((sum, value) => sum + (isNaN(value) ? 0 : value), 0)
  }

  /**
   * Formata nome para exibição
   */
  function formatDisplayName(name?: string): string {
    if (!name) return 'Usuário'
    return name.trim().split(' ')[0]
  }

  /**
   * Verifica se um objeto está vazio
   */
  function isEmpty(obj: any): boolean {
    return !obj || Object.keys(obj).length === 0
  }

  /**
   * Debounce function para limitar execuções
   */
  function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout

    return function executedFunction(...args: Parameters<T>) {
      const later = () => {
        clearTimeout(timeout)
        func(...args)
      }

      clearTimeout(timeout)
      timeout = setTimeout(later, wait)
    }
  }

  /**
   * Throttle function para limitar frequência
   */
  function throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean

    return function executedFunction(...args: Parameters<T>) {
      if (!inThrottle) {
        func.apply(this, args)
        inThrottle = true
        setTimeout(() => inThrottle = false, limit)
      }
    }
  }

  /**
   * Gera cor baseada em string
   */
  function generateColorFromString(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash)
    }

    const hue = hash % 360
    return `hsl(${hue}, 70%, 50%)`
  }

  /**
   * Valida email
   */
  function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * Formata data para exibição
   */
  function formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return {
    copySuccess,
    copyToClipboard,
    findRouteByName,
    isValidUrl,
    formatTime,
    generateSessionId,
    normalizeScores,
    calculateTotalScore,
    formatDisplayName,
    isEmpty,
    debounce,
    throttle,
    generateColorFromString,
    isValidEmail,
    formatDate
  }
}