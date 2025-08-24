// src/composables/useSimulationSocket.ts
import { io, Socket } from 'socket.io-client'
import { ref } from 'vue'

interface SimulationSocketOptions {
  backendUrl: string
  sessionId: string
  userId: string
  role: string
  stationId: string
  displayName?: string
}

export function useSimulationSocket(options: SimulationSocketOptions) {
  const socket = ref<Socket | null>(null)
  const connectionStatus = ref<'Desconectado' | 'Conectando' | 'Conectado' | 'Erro de Conexão'>('Desconectado')

  function connect() {
    if (socket.value && socket.value.connected) {
      socket.value.disconnect()
    }
    socket.value = io(options.backendUrl, {
      transports: ['websocket'],
      query: {
        sessionId: options.sessionId,
        userId: options.userId,
        role: options.role,
        stationId: options.stationId,
        displayName: options.displayName,
      },
    })
    connectionStatus.value = 'Conectando'

    socket.value.on('connect', () => {
      connectionStatus.value = 'Conectado'
    })
    socket.value.on('disconnect', () => {
      connectionStatus.value = 'Desconectado'
    })
    socket.value.on('connect_error', () => {
      connectionStatus.value = 'Erro de Conexão'
    })
  }

  function disconnect() {
    if (socket.value) {
      socket.value.disconnect()
      socket.value = null
      connectionStatus.value = 'Desconectado'
    }
  }

  return {
    socket,
    connectionStatus,
    connect,
    disconnect,
  }
}
