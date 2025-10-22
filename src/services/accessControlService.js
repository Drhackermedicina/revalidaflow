import { backendUrl } from '@/utils/backendUrl.js'
import { getAuthHeadersAsync } from '@/utils/authHeaders.js'

async function authFetch(path, options = {}) {
  const headers = await getAuthHeadersAsync()

  if (import.meta.env.DEV) {
    headers['X-Mock-Role'] = headers['X-Mock-Role'] || headers['x-mock-role'] || 'admin'
    headers['X-Mock-Email'] = headers['X-Mock-Email'] || headers['x-mock-email'] || 'mock-admin@local.dev'
    headers['x-mock-role'] = headers['X-Mock-Role']
    headers['x-mock-email'] = headers['X-Mock-Email']
    if (!headers.Authorization) {
      headers.Authorization = 'Bearer mock-admin-token'
    }
  } else if (!headers.Authorization) {
    throw new Error('Sessão expirada. Faça login novamente.')
  }

  const method = options.method || 'POST'
  const query = options.query
    ? `?${new URLSearchParams(options.query).toString()}`
    : ''

  const fetchOptions = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
      ...(options.headers || {})
    }
  }

  if (method !== 'GET' && options.body !== undefined) {
    fetchOptions.body = JSON.stringify(options.body)
  }

  if (method === 'GET') {
    delete fetchOptions.headers['Content-Type']
  }

  const response = await fetch(`${backendUrl}${path}${query}`, fetchOptions)
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const error = new Error(data.message || 'Falha ao comunicar com o servidor.')
    error.code = data.error
    error.status = response.status
    error.details = data.details
    throw error
  }

  return data
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
  return authFetch('/api/access/invites/redeem', {
    body: { code }
  })
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
