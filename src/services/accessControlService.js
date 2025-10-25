import { backendUrl } from '@/utils/backendUrl.js'
import { getAuthHeadersAsync } from '@/utils/authHeaders.js'

async function authFetch(path, options = {}) {
  const timestamp = new Date().toISOString()
  const fetchId = Math.random().toString(36).substr(2, 9)
  
  console.log(`[${timestamp}] authFetch: [${fetchId}] 🚀 INICIANDO requisição para ${path}`)
  console.log(`[${timestamp}] authFetch: [${fetchId}] 🔍 Ambiente: ${import.meta.env.MODE}`)
  console.log(`[${timestamp}] authFetch: [${fetchId}] 🔍 Backend URL: ${backendUrl}`)
  
  const headers = await getAuthHeadersAsync()

  console.log(`[${timestamp}] authFetch: [${fetchId}] Headers iniciais:`, Object.keys(headers))
  console.log(`[${timestamp}] authFetch: [${fetchId}] Tem Authorization?`, !!headers.Authorization)
  console.log(`[${timestamp}] authFetch: [${fetchId}] Estado do token Firebase:`, headers.Authorization ? 'presente' : 'ausente')

  if (import.meta.env.DEV) {
    console.log(`[${timestamp}] authFetch: Modo desenvolvimento detectado`)
    headers['X-Mock-Role'] = headers['X-Mock-Role'] || headers['x-mock-role'] || 'admin'
    headers['X-Mock-Email'] = headers['X-Mock-Email'] || headers['x-mock-email'] || 'mock-admin@local.dev'
    headers['x-mock-role'] = headers['X-Mock-Role']
    headers['x-mock-email'] = headers['X-Mock-Email']
    if (!headers.Authorization) {
      console.log(`[${timestamp}] authFetch: Adicionando token mock de desenvolvimento`)
      headers.Authorization = 'Bearer mock-admin-token'
    }
  } else if (!headers.Authorization) {
    console.log(`[${timestamp}] authFetch: ERRO - Sem Authorization em produção`)
    throw new Error('Sessão expirada. Faça login novamente.')
  }

  const method = options.method || 'POST'
  const query = options.query
    ? `?${new URLSearchParams(options.query).toString()}`
    : ''

  console.log(`[${timestamp}] authFetch: Método: ${method}, Query: ${query}`)
  console.log(`[${timestamp}] authFetch: URL completa: ${backendUrl}${path}${query}`)
  console.log(`[${timestamp}] authFetch: Headers finais:`, headers)

  const fetchOptions = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
      ...(options.headers || {})
    }
  }

  if (method !== 'GET' && options.body !== undefined) {
    console.log(`[${timestamp}] authFetch: Body:`, options.body)
    fetchOptions.body = JSON.stringify(options.body)
  }

  if (method === 'GET') {
    delete fetchOptions.headers['Content-Type']
  }

  try {
    console.log(`[${timestamp}] authFetch: [${fetchId}] 📡 Enviando requisição...`)
    console.log(`[${timestamp}] authFetch: [${fetchId}] URL completa: ${backendUrl}${path}${query}`)
    console.log(`[${timestamp}] authFetch: [${fetchId}] Método: ${method}`)
    console.log(`[${timestamp}] authFetch: [${fetchId}] Headers finais:`, headers)
    
    const startTime = Date.now()
    const response = await fetch(`${backendUrl}${path}${query}`, fetchOptions)
    const endTime = Date.now()
    
    console.log(`[${timestamp}] authFetch: [${fetchId}] 📥 Response recebida em ${endTime - startTime}ms`)
    console.log(`[${timestamp}] authFetch: [${fetchId}] Status: ${response.status}`)
    console.log(`[${timestamp}] authFetch: [${fetchId}] Headers:`, [...response.headers.entries()])
    
    const data = await response.json().catch((jsonError) => {
      console.log(`[${timestamp}] authFetch: [${fetchId}] ❌ Erro ao fazer parse do JSON:`, jsonError)
      console.log(`[${timestamp}] authFetch: [${fetchId}] Response text:`, await response.text())
      return {}
    })
    
    console.log(`[${timestamp}] authFetch: [${fetchId}] 📄 Response data:`, data)

    if (!response.ok) {
      const error = new Error(data.message || 'Falha ao comunicar com o servidor.')
      error.code = data.error
      error.status = response.status
      error.details = data.details
      console.log(`[${timestamp}] authFetch: [${fetchId}] ❌ Erro na requisição:`, error)
      
      // Detectar erros específicos de conexão
      if (data.message?.includes('ERR_CONNECTION_REFUSED') ||
          data.message?.includes('ECONNREFUSED')) {
        console.error(`[${timestamp}] authFetch: [${fetchId}] 🚨 ERRO DE CONEXÃO COM BACKEND!`);
        console.error(`[${timestamp}] authFetch: [${fetchId}] 🔍 Backend está rodando? Verifique: npm run backend:local`);
      }
      
      throw error
    }

    console.log(`[${timestamp}] authFetch: [${fetchId}] ✅ Requisição bem-sucedida`)
    return data
  } catch (fetchError) {
    console.log(`[${timestamp}] authFetch: [${fetchId}] 🔥 ERRO DE REDE/FETCH:`, fetchError)
    console.log(`[${timestamp}] authFetch: [${fetchId}] Detalhes do erro:`, {
      name: fetchError.name,
      message: fetchError.message,
      stack: fetchError.stack
    })
    
    // Detectar erros de proxy/tunnel
    if (fetchError.message?.includes('ERR_TUNNEL_CONNECTION_FAILED') ||
        fetchError.message?.includes('ERR_PROXY_CONNECTION_FAILED')) {
      console.error(`[${timestamp}] authFetch: [${fetchId}] 🚨 ERRO DE PROXY/TUNNEL DETECTADO!`);
      console.error(`[${timestamp}] authFetch: [${fetchId}] 🔍 Possíveis causas: Proxy corporativo, firewall, VPN`);
    }
    
    throw fetchError
  }
}

export async function createInvite({ durationDays, note, code } = {}) {
  return authFetch('/api/access/invites', {
    body: {
      durationDays,
      note,
      code
    }
  })
}

export async function listInvites({ status = 'all', limit = 50 } = {}) {
  return authFetch('/api/access/invites', {
    method: 'GET',
    query: {
      status,
      limit
    }
  })
}

export async function redeemInvite(code) {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] redeemInvite: Iniciando resgate de convite com código: ${code}`)

  try {
    // Verificar se temos autenticação válida antes de tentar
    const headers = await getAuthHeadersAsync()
    const hasAuth = !!headers.Authorization

    console.log(`[${timestamp}] redeemInvite: Estado da autenticação - Tem Authorization: ${hasAuth}`)

    if (!hasAuth && !import.meta.env.DEV) {
      console.warn(`[${timestamp}] redeemInvite: Sem token de autenticação válido, pulando resgate de convite`)
      // Fallback: retornar sucesso falso para não impedir cadastro
      return {
        success: false,
        message: 'Convite será resgatado após autenticação completa',
        fallback: true
      }
    }

    const result = await authFetch('/api/access/invites/redeem', {
      body: { code }
    })
    console.log(`[${timestamp}] redeemInvite: Sucesso no resgate do convite`, result)
    return result
  } catch (error) {
    console.log(`[${timestamp}] redeemInvite: Erro ao resgatar convite ${code}:`, error)

    // Diferenciar tipos de erro
    if (error.message?.includes('ERR_CONNECTION_REFUSED') || error.message?.includes('Failed to fetch')) {
      console.warn(`[${timestamp}] redeemInvite: Erro de conexão com backend - backend pode não estar rodando`)
      console.warn(`[${timestamp}] redeemInvite: Implementando fallback para convite ${code}`)

      // Fallback: retornar sucesso falso para não impedir cadastro
      return {
        success: false,
        message: 'Backend indisponível, convite será resgatado posteriormente',
        fallback: true,
        error: 'connection_refused'
      }
    } else if (error.status === 401 || error.message?.includes('Sessão expirada')) {
      console.warn(`[${timestamp}] redeemInvite: Erro de autenticação - token inválido`)
      console.warn(`[${timestamp}] redeemInvite: Implementando fallback para convite ${code}`)

      // Fallback: retornar sucesso falso para não impedir cadastro
      return {
        success: false,
        message: 'Autenticação pendente, convite será resgatado após login',
        fallback: true,
        error: 'auth_pending'
      }
    } else {
      console.log(`[${timestamp}] redeemInvite: Detalhes do erro:`, {
        message: error.message,
        code: error.code,
        status: error.status,
        details: error.details
      })
      throw error
    }
  }
}

export async function startSubscription(plan) {
  return authFetch('/api/access/payments/checkout', {
    body: { plan }
  })
}

export async function activateSubscription({ subscriptionId, userUid }) {
  return authFetch('/api/access/payments/activate', {
    body: { subscriptionId, userUid }
  })
}

export async function backfillTrials() {
  return authFetch('/api/access/trials/backfill')
}
