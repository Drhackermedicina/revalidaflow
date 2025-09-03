// Define aqui a URL base do seu backend PRINCIPAL (Node.js)
// Usa variável de ambiente se disponível, senão usa valor padrão

// Valor padrão para desenvolvimento (Backend Node.js na porta 3000)
const defaultUrl = 'http://localhost:3000'

// URL de produção no Google Cloud Run (Brasil - São Paulo)
const productionUrl = 'https://revalida-backend-772316263153.southamerica-east1.run.app'

// Usa a variável de ambiente se estiver definida; em dev usa defaultUrl, senão produção
export const backendUrl = (
  typeof import.meta.env.VITE_BACKEND_URL === 'string' &&
  import.meta.env.VITE_BACKEND_URL.startsWith('http')
    ? import.meta.env.VITE_BACKEND_URL // Prioriza VITE_BACKEND_URL se definida
    : defaultUrl // Caso contrário, usa a URL padrão de desenvolvimento
)

// Log para debug removido para produção

export default backendUrl
