// Interceptor para fetch que detecta e resolve problemas de CSP automaticamente
// Útil para situações onde o usuário fica inativo e há problemas de cache de CSP


// Store original fetch
const originalFetch = window.fetch

// Flag para evitar loops infinitos
let isRetrying = false

/**
 * Interceptor personalizado para fetch que detecta problemas de CSP
 */
function interceptedFetch(url, options = {}) {
  return originalFetch(url, options)
    .catch(async (error) => {
      // Detecta erros relacionados a CSP
      if (error.message && 
          (error.message.includes('Content Security Policy') || 
           error.message.includes('Refused to connect') ||
           error.message.includes('violates the document\'s Content Security Policy'))) {
        
        
        // Se for uma chamada para nosso backend e não estamos já tentando novamente
        if (url.includes('revalida-backend') && !isRetrying) {
          
          isRetrying = true
          
          // Espera um pouco antes de tentar novamente
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          try {
            // Tenta novamente com configurações diferentes
            const retryOptions = {
              ...options,
              mode: 'cors',
              credentials: 'omit',
              cache: 'no-cache',
              headers: {
                ...options.headers,
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
              }
            }
            
            const retryResult = await originalFetch(url, retryOptions)
            isRetrying = false
            
            if (retryResult.ok) {
              return retryResult
            }
          } catch (retryError) {
            console.error('❌ Retry também falhou:', retryError.message)
          }
          
          isRetrying = false
          
          // Se ainda falhar, sugere refresh da página
          console.error('💡 Sugestão: Atualize a página para resolver problemas de CSP')
          
          // Mostra notificação discreta ao usuário
          showRefreshSuggestion()
        }
      }
      
      // Re-lança o erro original
      throw error
    })
}

/**
 * Mostra sugestão discreta para refresh da página
 */
function showRefreshSuggestion() {
  // Evita múltiplas notificações
  if (document.querySelector('#csp-refresh-notification')) {
    return
  }
  
  const notification = document.createElement('div')
  notification.id = 'csp-refresh-notification'
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 16px 20px;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    z-index: 10000;
    max-width: 320px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    cursor: pointer;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255,255,255,0.2);
    animation: slideIn 0.3s ease-out;
  `
  
  // Adiciona animação CSS
  const style = document.createElement('style')
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `
  document.head.appendChild(style)
  
  notification.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px;">
      <div style="font-size: 24px;">🔄</div>
      <div>
        <div style="font-weight: 600; margin-bottom: 4px;">Problema de Conexão</div>
        <div style="font-size: 12px; opacity: 0.9;">Clique para atualizar a página</div>
      </div>
    </div>
  `
  
  notification.addEventListener('click', () => {
    window.location.reload()
  })
  
  document.body.appendChild(notification)
  
  // Remove automaticamente após 15 segundos
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = 'slideOut 0.3s ease-out'
      setTimeout(() => {
        notification.parentNode.removeChild(notification)
      }, 300)
    }
  }, 15000)
  
  // Adiciona animação de saída
  style.textContent += `
    @keyframes slideOut {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100%); opacity: 0; }
    }
  `
}

/**
 * Instala o interceptor de fetch
 */
export function installFetchInterceptor() {
  if (typeof window !== 'undefined' && window.fetch === originalFetch) {
    window.fetch = interceptedFetch
  }
}

/**
 * Remove o interceptor de fetch
 */
export function uninstallFetchInterceptor() {
  if (typeof window !== 'undefined') {
    window.fetch = originalFetch
  }
}

// Auto-instala o interceptor
if (typeof window !== 'undefined' && !import.meta.env.DEV) {
  installFetchInterceptor()
}

export default {
  installFetchInterceptor,
  uninstallFetchInterceptor
}
