/**
 * useSafeNavigation.js
 *
 * Composable para navegação segura com tratamento de erros
 * e fallbacks para o botão voltar
 */

import { ref } from 'vue'
import { useRouter } from 'vue-router'

export function useSafeNavigation() {
  const router = useRouter()
  const isNavigating = ref(false)
  const lastError = ref(null)

  /**
   * Navegação segura com tratamento de erros
   * @param {Function} navigationFunction - Função de navegação a ser executada
   * @param {Object} options - Opções de navegação
   */
  async function safeNavigate(navigationFunction, options = {}) {
    const {
      fallback = '/app/dashboard',
      errorMessage = 'Erro na navegação',
      showFallbackAlert = false
    } = options

    if (isNavigating.value) {
      console.warn('[useSafeNavigation] Navegação já em andamento, ignorando')
      return false
    }

    try {
      isNavigating.value = true
      lastError.value = null

      await navigationFunction()
      return true

    } catch (error) {
      console.error(`[useSafeNavigation] ${errorMessage}:`, error)
      lastError.value = error

      // Tentar fallback se disponível
      if (fallback && router.currentRoute.value.path !== fallback) {
        console.log(`[useSafeNavigation] Usando fallback: ${fallback}`)
        await router.push(fallback)
      }

      if (showFallbackAlert) {
        alert(`Não foi possível completar a navegação. Redirecionando para página segura.`)
      }

      return false

    } finally {
      isNavigating.value = false
    }
  }

  /**
   * Função de voltar segura com fallbacks
   * @param {Object} options - Opções de navegação
   */
  async function safeBack(options = {}) {
    const {
      fallback = '/app/dashboard',
      steps = -1
    } = options

    return safeNavigate(
      () => router.go(steps),
      {
        fallback,
        errorMessage: 'Erro ao voltar',
        showFallbackAlert: true,
        ...options
      }
    )
  }

  /**
   * Verifica se existe histórico de navegação
   */
  function hasHistory() {
    // Verifica se existe histórico suficiente para voltar
    return window.history.length > 1
  }

  /**
   * Navegação programática segura
   * @param {string|object} to - Destino da navegação
   * @param {Object} options - Opções adicionais
   */
  async function safePush(to, options = {}) {
    return safeNavigate(
      () => router.push(to),
      {
        fallback: '/app/dashboard',
        errorMessage: 'Erro ao navegar para página',
        ...options
      }
    )
  }

  return {
    // Estado
    isNavigating,
    lastError,

    // Métodos
    safeNavigate,
    safeBack,
    safePush,
    hasHistory
  }
}