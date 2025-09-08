// Configuração centralizada dos domínios do sistema
// Este arquivo facilita o gerenciamento dos diferentes ambientes e domínios

export const DOMAINS = {
  // Domínios de produção
  PRODUCTION: {
    PRIMARY: '',
    FIREBASE_WEB: '',
    FIREBASE_APP: ''
  },

  // Domínios de desenvolvimento
  DEVELOPMENT: {
    LOCAL: 'http://localhost:5173',
    LOCAL_ALT: 'http://localhost:3000'
  },

  // Backend Principal (Node.js)
  BACKEND: {
    PRODUCTION: 'https://revalida-backend-772316263153.southamerica-east1.run.app',
    DEVELOPMENT: 'https://revalida-backend-772316263153.southamerica-east1.run.app'
  },

}

// Função para detectar o domínio atual
export function getCurrentDomain() {
  if (typeof window === 'undefined') return null
  return window.location.origin
}

// Função para verificar se estamos em produção
export function isProduction() {
  const currentDomain = getCurrentDomain()
  return currentDomain && Object.values(DOMAINS.PRODUCTION).includes(currentDomain)
}

// Função para verificar se estamos em desenvolvimento
export function isDevelopment() {
  const currentDomain = getCurrentDomain()
  return currentDomain && Object.values(DOMAINS.DEVELOPMENT).includes(currentDomain)
}

// Lista de todos os domínios válidos
export const ALL_DOMAINS = [
  ...Object.values(DOMAINS.PRODUCTION),
  ...Object.values(DOMAINS.DEVELOPMENT)
]

// Log de informações sobre o domínio atual
if (typeof window !== 'undefined') {
}

export default DOMAINS
