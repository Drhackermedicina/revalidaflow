import * as Sentry from '@sentry/vue'

export function initSentry(app, router) {
  // Só inicializa em produção ou se a variável de ambiente estiver definida
  if (import.meta.env.MODE === 'production' || import.meta.env.VITE_SENTRY_DSN) {
    Sentry.init({
      app,
      dsn: import.meta.env.VITE_SENTRY_DSN || 'YOUR_SENTRY_DSN_HERE',
      integrations: [
        Sentry.browserTracingIntegration({
          router,
        }),
        Sentry.replayIntegration()
      ],

      // Performance Monitoring - Reduced for better performance
      tracesSampleRate: import.meta.env.DEV ? 0.01 : 0.05, // Lower sampling in dev

      // Session Replay - Reduced to minimize performance impact
      replaysSessionSampleRate: 0.05, // 5% das sessões
      replaysOnErrorSampleRate: 0.5, // 50% das sessões com erro

      // Reduce performance overhead
      enableTracing: !import.meta.env.DEV, // Disable tracing in development
      debug: false, // Disable debug mode

      // Environment
      environment: import.meta.env.MODE,

      // Release tracking
      release: import.meta.env.VITE_APP_VERSION || '1.0.0',

      // Filtros para reduzir ruído
      beforeSend(event) {
        // Filtra erros de extensões de navegador
        if (event.exception) {
          const error = event.exception.values?.[0]
          if (error?.stacktrace?.frames) {
            const lastFrame = error.stacktrace.frames[error.stacktrace.frames.length - 1]
            if (lastFrame?.filename?.includes('extension://')) {
              return null
            }
          }
        }
        return event
      },

      // Tags personalizadas para o projeto
      initialScope: {
        tags: {
          project: 'revalidaflow',
          component: 'frontend'
        }
      }
    })
  }
}

// Função para capturar erros customizados do REVALIDAFLOW
export function captureSimulationError(error, context = {}) {
  Sentry.withScope((scope) => {
    scope.setTag('error_type', 'simulation')
    scope.setLevel('error')

    // Context específico para simulações
    scope.setContext('simulation', {
      sessionId: context.sessionId,
      userRole: context.userRole,
      stationId: context.stationId,
      simulationState: context.simulationState
    })

    Sentry.captureException(error)
  })
}

// Função para capturar erros de WebSocket
export function captureWebSocketError(error, context = {}) {
  Sentry.withScope((scope) => {
    scope.setTag('error_type', 'websocket')
    scope.setLevel('error')

    scope.setContext('websocket', {
      socketId: context.socketId,
      sessionId: context.sessionId,
      connectionState: context.connectionState,
      lastEvent: context.lastEvent
    })

    Sentry.captureException(error)
  })
}

// Função para capturar erros de Firebase
export function captureFirebaseError(error, context = {}) {
  Sentry.withScope((scope) => {
    scope.setTag('error_type', 'firebase')
    scope.setLevel('error')

    scope.setContext('firebase', {
      operation: context.operation,
      collection: context.collection,
      userId: context.userId,
      errorCode: error.code
    })

    Sentry.captureException(error)
  })
}