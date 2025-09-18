// Utilitário para prevenir erros de MutationObserver
// Resolve problemas com extensões do browser e elementos DOM inexistentes

export function safeMutationObserver(callback, options = {}) {
  if (typeof MutationObserver === 'undefined') {
    console.warn('[DOM Observer] MutationObserver não disponível neste ambiente')
    return null
  }

  try {
    return new MutationObserver((mutations, observer) => {
      try {
        callback(mutations, observer)
      } catch (error) {
        console.warn('[DOM Observer] Erro no callback do MutationObserver:', error)
      }
    })
  } catch (error) {
    console.warn('[DOM Observer] Erro ao criar MutationObserver:', error)
    return null
  }
}

export function safeObserve(observer, target, options = {}) {
  if (!observer || !target) {
    console.warn('[DOM Observer] Observer ou target inválido')
    return false
  }

  // Verificar se o target é um Node válido
  if (!(target instanceof Node)) {
    console.warn('[DOM Observer] Target não é um Node válido:', target)
    return false
  }

  // Verificar se o target está no DOM
  if (!document.contains(target)) {
    console.warn('[DOM Observer] Target não está no DOM:', target)
    return false
  }

  try {
    observer.observe(target, {
      childList: true,
      attributes: true,
      attributeOldValue: true,
      characterData: true,
      subtree: true,
      ...options
    })
    return true
  } catch (error) {
    console.warn('[DOM Observer] Erro ao iniciar observação:', error)
    return false
  }
}

export function safeDisconnect(observer) {
  if (!observer) return

  try {
    observer.disconnect()
  } catch (error) {
    console.warn('[DOM Observer] Erro ao desconectar observer:', error)
  }
}

// Hook para uso em componentes Vue
export function useSafeMutationObserver(callback, options = {}) {
  let observer = null

  const startObserving = (target) => {
    if (observer) {
      safeDisconnect(observer)
    }

    observer = safeMutationObserver(callback, options)
    if (observer) {
      return safeObserve(observer, target, options)
    }
    return false
  }

  const stopObserving = () => {
    if (observer) {
      safeDisconnect(observer)
      observer = null
    }
  }

  return {
    startObserving,
    stopObserving,
    observer: () => observer
  }
}