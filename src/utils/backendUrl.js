// Define aqui a URL base do seu backend
// Usa variável de ambiente se disponível, senão usa valor padrão

// Valor padrão para desenvolvimento
const defaultUrl = 'http://localhost:3000'

// URL de produção no Google Cloud Run (Brasil - São Paulo)
const productionUrl = 'https://revalida-backend-772316263153.southamerica-east1.run.app'

// Usa a variável de ambiente se estiver definida; em dev usa defaultUrl, senão produção
export const backendUrl = (
  typeof import.meta.env.VITE_BACKEND_URL === 'string' &&
  import.meta.env.VITE_BACKEND_URL.startsWith('http')
    ? import.meta.env.VITE_BACKEND_URL
    : (import.meta.env.DEV ? defaultUrl : productionUrl)
)

// Log para debug (será removido em produção)

export default backendUrl
