// Configuração centralizada dos domínios do sistema
// Este arquivo facilita o gerenciamento dos diferentes ambientes e domínios

export const DOMAINS = {
  // Domínios de produção
  PRODUCTION: {
    PRIMARY: 'https://revalidafacilapp.com.br',
    FIREBASE_WEB: 'https://revalida-companion.web.app', 
    FIREBASE_APP: 'https://revalida-companion.firebaseapp.com'
  },
  
  // Domínios de desenvolvimento
  DEVELOPMENT: {
    LOCAL: 'http://localhost:5173',
    LOCAL_ALT: 'http://localhost:3000'
  },
  
  // Backend
  BACKEND: {
    PRODUCTION: '',
    DEVELOPMENT: 'http://localhost:3000'
  }
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
