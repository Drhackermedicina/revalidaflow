// Proteções contra interferências DOM de extensões e scripts externos
import { authLogger } from './authLogger'

class DOMProtection {
  constructor() {
    this.isEnabled = true
    this.mutationObserverErrors = 0
    this.maxMutationErrors = 5
    this.protectedElements = new Set()
    this.init()
  }

  init() {
    if (typeof window === 'undefined') return

    this.detectBrowserExtensions()
    this.setupChunkInterception()  // Nova interceptação de chunks
    this.setupConsoleProtection()
    this.setupOperaTranslationProtection()
    // MutationObserver protection agora está em main.js

    authLogger.info('Proteções DOM inicializadas')
  }

  detectBrowserExtensions() {
    const extensions = []

    // Detectar extensões comuns
    if (window.chrome && window.chrome.runtime) {
      extensions.push('Chrome Extension API')
    }

    if (window.opr && window.opr.addons) {
      extensions.push('Opera Extensions')
    }

    // Detectar tradução automática do Opera
    if (navigator.userAgent.includes('OPR/') || window.opera) {
      extensions.push('Opera Browser')
      this.setupOperaSpecificProtections()
    }

    // Detectar extensões de tradução
    if (document.querySelector('[data-translate]') ||
        document.querySelector('.translate-this') ||
        window.google?.translate) {
      extensions.push('Translation Extension')
    }

    if (extensions.length > 0) {
      authLogger.warn('Extensões/funcionalidades detectadas', { extensions })
    }

    return extensions
  }

  setupChunkInterception() {
    // Interceptar carregamento de chunks problemáticos
    const originalCreateElement = document.createElement
    document.createElement = function(tagName) {
      const element = originalCreateElement.call(this, tagName)

      if (tagName.toLowerCase() === 'script') {
        // Interceptar scripts de chunks
        const originalSetAttribute = element.setAttribute
        element.setAttribute = function(name, value) {
          if (name === 'src' && typeof value === 'string') {
            // Detectar chunks problemáticos
            if (value.includes('VContainer') ||
                value.includes('filter_content') ||
                value.includes('chunk-KE5LXLFG')) {
              authLogger.debug('Chunk problemático detectado', { src: value })

              // Adicionar proteção específica para este chunk
              element.addEventListener('load', () => {
                authLogger.debug('Chunk carregado, aplicando proteções específicas')
              })

              element.addEventListener('error', (e) => {
                authLogger.warn('Erro no carregamento de chunk interceptado', {
                  src: value,
                  error: e.message
                })
                e.preventDefault()
              })
            }
          }
          return originalSetAttribute.call(this, name, value)
        }
      }

      return element
    }

    // Interceptar fetch de módulos
    const originalFetch = window.fetch
    window.fetch = async function(url, options) {
      if (typeof url === 'string') {
        // Detectar requisições de chunks problemáticos
        if (url.includes('VContainer.mjs') ||
            url.includes('filter_content.js') ||
            url.includes('chunk-KE5LXLFG')) {
          authLogger.debug('Fetch de chunk problemático interceptado', { url })
        }
      }
      return originalFetch.call(this, url, options)
    }

    authLogger.debug('Interceptação de chunks ativada')
  }

  setupMutationObserverProtection() {
    // Interceptar erros de MutationObserver
    const originalMutationObserver = window.MutationObserver

    if (!originalMutationObserver) return

    // Capturar a instância para contadores
    const protectionInstance = this

    window.MutationObserver = class SafeMutationObserver extends originalMutationObserver {
      constructor(callback) {
        const safeCallback = (mutations, observer) => {
          try {
            callback(mutations, observer)
          } catch (error) {
            authLogger.warn('MutationObserver callback error interceptado', {
              error: error.message,
              stack: error.stack?.substring(0, 200)
            })
          }
        }

        super(safeCallback)
      }

      observe(target, options) {
        try {
          // Verificar se o target é válido PRIMEIRO
          if (!target) {
            authLogger.warn('MutationObserver: target é null/undefined', {
              target: String(target),
              options
            })
            return
          }

          if (typeof target !== 'object') {
            authLogger.warn('MutationObserver: target não é objeto', {
              target: typeof target,
              targetValue: String(target),
              options
            })
            return
          }

          if (!(target instanceof Node)) {
            authLogger.warn('MutationObserver: target não é Node', {
              target: target.constructor?.name || typeof target,
              isElement: target instanceof Element,
              isDocument: target instanceof Document,
              options
            })
            return
          }

          // Verificar se o target está no DOM (apenas para elementos)
          if (target instanceof Element && !document.contains(target)) {
            authLogger.warn('MutationObserver: target fora do DOM interceptado')
            return
          }

          super.observe(target, options)
        } catch (error) {
          protectionInstance.mutationObserverErrors++
          authLogger.error('MutationObserver.observe error interceptado', {
            error: error.message,
            errorCount: protectionInstance.mutationObserverErrors,
            target: target?.tagName || target?.constructor?.name || typeof target,
            targetNodeType: target?.nodeType,
            options,
            stack: error.stack?.substring(0, 300)
          })

          if (protectionInstance.mutationObserverErrors > protectionInstance.maxMutationErrors) {
            authLogger.error('Muitos erros de MutationObserver, desabilitando proteções')
            protectionInstance.isEnabled = false
          }
        }
      }
    }

    authLogger.debug('Proteção MutationObserver ativada')
  }

  setupOperaSpecificProtections() {
    // Proteger contra interferências da tradução automática do Opera
    if (window.opera || navigator.userAgent.includes('OPR/')) {
      // Interceptar requests de tradução
      const originalFetch = window.fetch
      window.fetch = async function(url, options) {
        if (typeof url === 'string' && url.includes('translation.opera-api.com')) {
          authLogger.debug('Request de tradução Opera interceptado', { url })
        }
        return originalFetch.call(this, url, options)
      }

      // Detectar elementos de tradução sendo inseridos
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node
                if (element.classList?.contains('translate-') ||
                    element.getAttribute?.('data-translate')) {
                  authLogger.debug('Elemento de tradução detectado', {
                    className: element.className,
                    tagName: element.tagName
                  })
                }
              }
            })
          }
        })
      })

      observer.observe(document.body, {
        childList: true,
        subtree: true
      })

      authLogger.info('Proteções específicas do Opera ativadas')
    }
  }

  setupOperaTranslationProtection() {
    // Interceptar e logar tentativas de tradução que podem interferir no DOM
    const translationPatterns = [
      /translation\.opera-api\.com/,
      /translate\.googleapis\.com/,
      /api\.translate\./
    ]

    // Monitor de network requests
    if (window.PerformanceObserver) {
      try {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.name && translationPatterns.some(pattern => pattern.test(entry.name))) {
              authLogger.debug('Request de tradução detectado', {
                url: entry.name,
                duration: entry.duration,
                responseEnd: entry.responseEnd
              })
            }
          })
        })

        observer.observe({ entryTypes: ['resource'] })
      } catch (error) {
        authLogger.warn('Não foi possível configurar PerformanceObserver', { error: error.message })
      }
    }
  }

  setupConsoleProtection() {
    // Interceptar erros específicos que podem afetar o login
    const originalError = console.error
    console.error = (...args) => {
      const errorMessage = args.join(' ')

      // Detectar erros relacionados a MutationObserver
      if (errorMessage.includes('MutationObserver') ||
          errorMessage.includes('observe') ||
          errorMessage.includes('parameter 1 is not of type')) {
        authLogger.warn('Erro DOM interceptado no console', {
          message: errorMessage,
          source: 'console.error'
        })
      }

      // Detectar erros de palette/theme do Opera
      if (errorMessage.includes('staticLoadtimePalette') ||
          errorMessage.includes('gx_no_')) {
        authLogger.debug('Erro de tema/palette detectado', { message: errorMessage })
      }

      // Detectar erros de FilterContent (específico do Opera)
      if (errorMessage.includes('FilterContent') ||
          errorMessage.includes('filter_content.js')) {
        authLogger.warn('Erro de FilterContent (Opera) interceptado', {
          message: errorMessage,
          source: 'console.error'
        })
      }

      originalError.apply(console, args)
    }

    // Interceptar erros globais não capturados
    const originalGlobalErrorHandler = window.onerror
    window.onerror = (message, source, lineno, colno, error) => {
      const errorInfo = {
        message: String(message),
        source: String(source),
        line: lineno,
        column: colno,
        error: error?.message || 'undefined'
      }

      // Verificar se é um erro relacionado ao Opera/extensões
      if (message.includes('MutationObserver') ||
          message.includes('FilterContent') ||
          message.includes('staticLoadtimePalette') ||
          source.includes('filter_content.js') ||
          source.includes('chunk-KE5LXLFG.js')) {
        authLogger.warn('Erro global interceptado (relacionado ao Opera)', errorInfo)
        return true  // Prevenir que o erro apareça no console
      }

      if (originalGlobalErrorHandler) {
        return originalGlobalErrorHandler(message, source, lineno, colno, error)
      }
    }

    // Interceptar Promise rejections não tratadas
    const originalUnhandledRejection = window.onunhandledrejection
    window.onunhandledrejection = (event) => {
      const error = event.reason
      const errorMessage = error?.message || String(error)

      if (errorMessage.includes('MutationObserver') ||
          errorMessage.includes('FilterContent') ||
          errorMessage.includes('parameter 1 is not of type')) {
        authLogger.warn('Promise rejection interceptada (Opera)', {
          message: errorMessage,
          stack: error?.stack?.substring(0, 300)
        })
        event.preventDefault()  // Prevenir que apareça no console
        return
      }

      if (originalUnhandledRejection) {
        return originalUnhandledRejection(event)
      }
    }

    authLogger.debug('Proteção de console ativada com interceptação global')
  }

  // Proteger elementos específicos da aplicação
  protectElement(element, description = '') {
    if (!element || !this.isEnabled) return

    this.protectedElements.add(element)
    authLogger.debug('Elemento protegido', {
      tagName: element.tagName,
      id: element.id,
      className: element.className,
      description
    })

    // Adicionar atributo para identificação
    element.setAttribute('data-dom-protected', 'true')

    return () => {
      this.protectedElements.delete(element)
      element.removeAttribute('data-dom-protected')
    }
  }

  // Verificar se há interferências ativas
  checkInterferences() {
    const interferenceChecks = {
      mutationObserverErrors: this.mutationObserverErrors,
      hasTranslationExtension: !!document.querySelector('[data-translate]'),
      hasOperaTranslation: navigator.userAgent.includes('OPR/'),
      protectedElementsCount: this.protectedElements.size,
      isEnabled: this.isEnabled
    }

    authLogger.debug('Status das proteções DOM', interferenceChecks)
    return interferenceChecks
  }

  // Relatório de debug
  getDebugReport() {
    const extensions = this.detectBrowserExtensions()
    const interferences = this.checkInterferences()
    const translationElements = document.querySelectorAll('[data-translate], .translate-this')

    return {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      extensions,
      interferences,
      translationElementsFound: translationElements.length,
      protectedElements: Array.from(this.protectedElements).map(el => ({
        tagName: el.tagName,
        id: el.id,
        className: el.className
      }))
    }
  }

  // Limpar proteções
  cleanup() {
    this.protectedElements.clear()
    this.isEnabled = false
    authLogger.info('Proteções DOM limpas')
  }
}

// Instância singleton
export const domProtection = new DOMProtection()

// Expor globalmente em desenvolvimento
if (import.meta.env.DEV) {
  window.domProtection = domProtection
}

export default domProtection