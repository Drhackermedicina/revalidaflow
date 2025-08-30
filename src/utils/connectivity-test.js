// Script para testar conectividade do backend a partir de diferentes domínios
// Execute este arquivo no console do navegador em cada domínio

import { backendUrl } from '@/utils/backendUrl.js'
import { DOMAINS, getCurrentDomain } from '@/utils/domains.js'

export async function testBackendConnectivity() {
  const currentDomain = getCurrentDomain()

  const results = {
    domain: currentDomain,
    backend: backendUrl,
    tests: {}
  }

  // Teste 1: Health Check HTTP
  try {
    const response = await fetch(`${backendUrl}/health`)
    const data = await response.json()
    results.tests.healthCheck = {
      status: 'success',
      responseTime: Date.now(),
      data
    }
  } catch (error) {
    results.tests.healthCheck = {
      status: 'error',
      error: error.message
    }
  }

  // Teste 2: CORS Preflight
  try {
    const response = await fetch(`${backendUrl}/api/agent/health`, {
      method: 'OPTIONS'
    })
    results.tests.corsPreflight = {
      status: 'success',
      headers: Object.fromEntries(response.headers.entries())
    }
  } catch (error) {
    results.tests.corsPreflight = {
      status: 'error', 
      error: error.message
    }
  }

  // Teste 3: Socket.IO Connection
  try {
    const { io } = await import('socket.io-client')
    
    const socket = io(backendUrl, {
      timeout: 5000,
      transports: ['websocket', 'polling']
    })

    const socketTest = new Promise((resolve, reject) => {
      socket.on('connect', () => {
        results.tests.socketIO = {
          status: 'success',
          socketId: socket.id,
          transport: socket.io.engine.transport.name
        }
        socket.disconnect()
        resolve()
      })

      socket.on('connect_error', (error) => {
        results.tests.socketIO = {
          status: 'error',
          error: error.message
        }
        reject(error)
      })

      setTimeout(() => {
        results.tests.socketIO = {
          status: 'timeout',
          error: 'Timeout de 5 segundos'
        }
        socket.disconnect()
        reject(new Error('Timeout'))
      }, 5000)
    })

    await socketTest
  } catch (error) {
    if (!results.tests.socketIO) {
      results.tests.socketIO = {
        status: 'error',
        error: error.message
      }
    }
  }

  // Resumo final
  
  Object.entries(results.tests).forEach(([test, result]) => {
    const icon = result.status === 'success' ? '✅' : '❌'
  })

  return results
}

// Função para testar todos os domínios (usar no desenvolvimento)
export function getTestInstructions() {
  Object.entries(DOMAINS.PRODUCTION).forEach(([name, url]) => {
  })
}

export default testBackendConnectivity
