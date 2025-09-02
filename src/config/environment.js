// src/config/environment.js
// Configuração centralizada do ambiente

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
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDuakOooHv9a5slO0I3o3gttSBlSXD0aWw",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "revalida-companion.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "revalida-companion",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "revalida-companion.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "772316263153",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:772316263153:web:d0af4ecc404b6ca16a2f50"
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
