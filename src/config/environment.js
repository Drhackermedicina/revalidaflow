// src/config/environment.js
// Configuração centralizada do ambiente
// ATENÇÃO: Defina todas as chaves no arquivo .env e nunca exponha chaves sensíveis aqui!

export const config = {
  // Backend Configuration
  backend: {
    url: import.meta.env.VITE_BACKEND_URL || (import.meta.env.DEV ? 'http://localhost:3000' : ''),
    simulationBackendUrl: import.meta.env.VITE_SIMULATION_BACKEND_URL || (import.meta.env.DEV ? 'http://localhost:3001' : ''), // Adicionado
    timeout: 30000,
    retries: 3
  },

  // Firebase Configuration
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
  },

  // Environment Info
  environment: {
    mode: import.meta.env.MODE,
    isDevelopment: import.meta.env.DEV,
    isProduction: import.meta.env.PROD
  }
}

// Debug info (removido em produção)
if (config.environment.isDevelopment) {
  console.group('🔧 Configuração do Ambiente')
  console.groupEnd()
}

export default config
