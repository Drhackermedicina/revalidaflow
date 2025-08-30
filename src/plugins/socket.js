// src/plugins/socket.js
import { backendUrl } from '@/utils/backendUrl.js'
import { io } from 'socket.io-client'

let socket

function connectSocket(params = {}) {
  if (socket) return socket
  
  
  socket = io(backendUrl, {
    autoConnect: false, // Conectar manualmente para melhor controle
    transports: ['websocket', 'polling'], // Adiciona polling como fallback
    auth: params, // Envia os parâmetros corretamente
    timeout: 10000, // Timeout reduzido para 10 segundos
    reconnection: true, // Habilita reconexão automática
    reconnectionAttempts: 3, // Máximo 3 tentativas
    reconnectionDelay: 1000, // Delay inicial de 1 segundo
    maxReconnectionAttempts: 3 // Limite máximo de tentativas
  })
  
  // Event listeners para debug
  socket.on('connect', () => {
  })
  
  socket.on('disconnect', () => {
  })
  
  socket.on('connect_error', (error) => {
    console.error('🚫 Erro de conexão Socket:', error)
  })
  
  return socket
}

export { connectSocket }

