// Define aqui a URL base do seu backend
// Usa variável de ambiente se disponível, senão usa valor padrão

// Valor padrão para desenvolvimento
const defaultUrl = 'http://localhost:3000'

// URL de produção no Google Cloud Run (Brasil - São Paulo)
const productionUrl = 'http://localhost:3000'

// Usa a variável de ambiente se estiver definida; em dev usa defaultUrl, senão produção
export const backendUrl = (
  typeof import.meta.env.VITE_BACKEND_URL === 'string' &&
  import.meta.env.VITE_BACKEND_URL.startsWith('http')
    ? import.meta.env.VITE_BACKEND_URL
    : (import.meta.env.DEV ? defaultUrl : productionUrl)
)

// Log para debug (será removido em produção)
console.log('🔧 Backend URL configurada:', backendUrl)
console.log('🌍 Ambiente:', import.meta.env.MODE)

export default backendUrl
