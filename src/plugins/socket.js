// src/plugins/socket.js
import { backendUrl } from '@/utils/backendUrl.js'
import { io } from 'socket.io-client'

let socket

function connectSocket(params = {}) {
  if (socket) return socket
  
  console.log('🔌 Conectando Socket.IO ao backend:', backendUrl)
  
  socket = io(backendUrl, {
    autoConnect: true,
    transports: ['websocket', 'polling'], // Adiciona polling como fallback
    auth: params, // Envia os parâmetros corretamente
    timeout: 20000, // Timeout de 20 segundos
    forceNew: true // Força nova conexão
  })
  
  // Event listeners para debug
  socket.on('connect', () => {
    console.log('✅ Socket conectado ao backend!')
  })
  
  socket.on('disconnect', () => {
    console.log('❌ Socket desconectado do backend')
  })
  
  socket.on('connect_error', (error) => {
    console.error('🚫 Erro de conexão Socket:', error)
  })
  
  return socket
}

export { connectSocket }

