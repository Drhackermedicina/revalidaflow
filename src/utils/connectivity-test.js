// Script para testar conectividade do backend a partir de diferentes domínios
// Execute este arquivo no console do navegador em cada domínio

import { backendUrl } from '@/utils/backendUrl.js'
import { DOMAINS, getCurrentDomain } from '@/utils/domains.js'

export async function testBackendConnectivity() {
  const currentDomain = getCurrentDomain()
  console.log('🧪 TESTE DE CONECTIVIDADE')
  console.log('📍 Domínio atual:', currentDomain)
  console.log('🎯 Backend testado:', backendUrl)
  console.log('⏱️  Iniciando testes...\n')

  const results = {
    domain: currentDomain,
    backend: backendUrl,
    tests: {}
  }

  // Teste 1: Health Check HTTP
  try {
    console.log('1️⃣ Testando Health Check HTTP...')
    const response = await fetch(`${backendUrl}/health`)
    const data = await response.json()
    results.tests.healthCheck = {
      status: 'success',
      responseTime: Date.now(),
      data
    }
    console.log('✅ Health Check: OK', data)
  } catch (error) {
    results.tests.healthCheck = {
      status: 'error',
      error: error.message
    }
    console.log('❌ Health Check: FALHOU', error.message)
  }

  // Teste 2: CORS Preflight
  try {
    console.log('2️⃣ Testando CORS Preflight...')
    const response = await fetch(`${backendUrl}/api/agent/health`, {
      method: 'OPTIONS'
    })
    results.tests.corsPreflight = {
      status: 'success',
      headers: Object.fromEntries(response.headers.entries())
    }
    console.log('✅ CORS Preflight: OK')
  } catch (error) {
    results.tests.corsPreflight = {
      status: 'error', 
      error: error.message
    }
    console.log('❌ CORS Preflight: FALHOU', error.message)
  }

  // Teste 3: Socket.IO Connection
  try {
    console.log('3️⃣ Testando Socket.IO...')
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
        console.log('✅ Socket.IO: Conectado', socket.id)
        socket.disconnect()
        resolve()
      })

      socket.on('connect_error', (error) => {
        results.tests.socketIO = {
          status: 'error',
          error: error.message
        }
        console.log('❌ Socket.IO: FALHOU', error.message)
        reject(error)
      })

      setTimeout(() => {
        results.tests.socketIO = {
          status: 'timeout',
          error: 'Timeout de 5 segundos'
        }
        console.log('❌ Socket.IO: TIMEOUT')
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
  console.log('\n📊 RESUMO DOS TESTES:')
  console.log('Domain:', results.domain)
  console.log('Backend:', results.backend)
  
  Object.entries(results.tests).forEach(([test, result]) => {
    const icon = result.status === 'success' ? '✅' : '❌'
    console.log(`${icon} ${test}: ${result.status.toUpperCase()}`)
  })

  return results
}

// Função para testar todos os domínios (usar no desenvolvimento)
export function getTestInstructions() {
  console.log('🧪 INSTRUÇÕES PARA TESTE COMPLETO:')
  console.log('1. Abra cada domínio em uma aba separada:')
  Object.entries(DOMAINS.PRODUCTION).forEach(([name, url]) => {
    console.log(`   - ${name}: ${url}`)
  })
  console.log('2. Em cada aba, execute no console:')
  console.log('   import("./utils/connectivity-test.js").then(m => m.testBackendConnectivity())')
  console.log('3. Compare os resultados entre os domínios')
}

export default testBackendConnectivity
