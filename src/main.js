import App from './App.vue'
import { registerPlugins } from '@core/utils/plugins'
import { createApp } from 'vue'
import { initSentry } from './plugins/sentry.js'
import { envValidator } from './utils/envValidator.js'

// O plugin de autenticação não precisa mais ser importado aqui

// Monitor de CSP para resolver problemas após inatividade
import './utils/csp-monitor.js'

// Interceptor de fetch para problemas de CSP
import './utils/fetch-interceptor.js'

// Vigia de deploy para lidar com erros de carregamento de chunk
import './utils/deployment-watcher.js'

// Styles
import '@core/scss/template/index.scss'
import '@layouts/styles/index.scss'
import '@styles/styles.scss'

// Performance optimizations
import './assets/performance-optimizations.css'

// Expor adminAgentService globalmente no modo de desenvolvimento
import { adminAgentService } from './services/adminAgentService'
import { preloadIcons } from './utils/iconCache'

if (import.meta.env.DEV) {
  window.adminAgentService = adminAgentService
}

// Preload frequently used icons to reduce API calls
preloadIcons().catch(console.warn)

// Validar ambiente antes de iniciar o aplicativo
const envValidation = envValidator.validateEnvironment()

if (!envValidation.isValid) {
  console.error('❌ Erros críticos de configuração:')
  envValidation.errors.forEach(error => console.error('  ', error))

  if (import.meta.env.DEV) {
    console.warn('⚠️ Avisos de configuração:')
    envValidation.warnings.forEach(warning => console.warn('  ', warning))
  }
}

const app = createApp(App)


// ===== CONFIGURAÇÕES DE PERFORMANCE =====
// Habilitar métricas de performance em desenvolvimento
if (import.meta.env.DEV) {
  app.config.performance = true
}

// Configurações de produção
app.config.errorHandler = (error, instance, info) => {
  console.error('Vue error:', error, info)
}

// Registra os plugins
registerPlugins(app)

// Inicializa Sentry - precisa ser feito antes de montar o app
import { router } from './plugins/router/index.js'
initSentry(app, router)

app.mount('#app')
