import App from './App.vue'
import { registerPlugins } from '@core/utils/plugins'
import { createApp } from 'vue'

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

if (import.meta.env.DEV) {
  window.adminAgentService = adminAgentService
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

// Registra os plugins e monta o app imediatamente, de forma padrão.
registerPlugins(app)
app.mount('#app')
