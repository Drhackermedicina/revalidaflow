import { currentUser } from '@/plugins/auth'
import { db } from '@/plugins/firebase'
import { doc, updateDoc } from 'firebase/firestore'
import { updateDocumentWithRetry, checkFirestoreConnectivity } from '@/services/firestoreService'

class UserPresenceManager {
    constructor() {
        this.isIdle = false
        this.idleTime = 0
        this.lastActivityTime = Date.now()
        this.idleTimer = null
        this.heartbeatTimer = null
        this.isInitialized = false

        // Configurações
        this.IDLE_TIMEOUT = 5 * 60 * 1000 // 5 minutos para ficar ausente
        this.HEARTBEAT_INTERVAL = 30 * 1000 // 30 segundos para verificar conectividade
    }

    // Atualizar status no Firestore
    async updateStatus(status) {
        if (!currentUser.value?.uid || !db) return

        try {
            const connectivity = checkFirestoreConnectivity()
            if (!connectivity.available) return

            const ref = doc(db, 'usuarios', currentUser.value.uid)
            await updateDocumentWithRetry(ref, { status }, 'atualização de presença do usuário')
            console.log(`[Presence] Status: ${status}`)
        } catch (error) {
            console.warn('[Presence] Erro ao atualizar status:', error)
        }
    }

    // Resetar timer de inatividade
    resetIdleTimer() {
        this.lastActivityTime = Date.now()
        this.idleTime = 0

        if (this.isIdle) {
            this.isIdle = false
            this.updateStatus('disponivel')
        }

        // Reiniciar timer
        clearTimeout(this.idleTimer)
        this.idleTimer = setTimeout(() => {
            if (!document.hidden) { // Só marcar como ausente se aba estiver visível
                this.isIdle = true
                this.updateStatus('ausente')
            }
        }, this.IDLE_TIMEOUT)
    }

    // Heartbeat para manter conexão ativa (menos frequente)
    startHeartbeat() {
        this.heartbeatTimer = setInterval(() => {
            // Verificar se ainda está "conectado" (opcional - pode ser removido se não precisar)
            const timeSinceActivity = Date.now() - this.lastActivityTime

            // Se passou muito tempo sem atividade E aba está visível, marcar como ausente
            if (timeSinceActivity > this.IDLE_TIMEOUT && !document.hidden && !this.isIdle) {
                this.isIdle = true
                this.updateStatus('ausente')
            }
        }, this.HEARTBEAT_INTERVAL)
    }

    // Eventos de atividade do usuário
    setupActivityListeners() {
        const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']

        activityEvents.forEach(event => {
            document.addEventListener(event, () => this.resetIdleTimer(), { passive: true })
        })
    }

    // Visibility API - detectar quando aba ganha/perde foco
    setupVisibilityListener() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Aba perdeu foco - marcar como ausente após curto período
                setTimeout(() => {
                    if (document.hidden && !this.isIdle) {
                        this.isIdle = true
                        this.updateStatus('ausente')
                    }
                }, 10000) // 10 segundos de tolerância
            } else {
                // Aba voltou ao foco - marcar como disponível
                this.resetIdleTimer()
            }
        })
    }

    // Page unload - marcar como offline
    setupUnloadListener() {
        window.addEventListener('beforeunload', () => {
            if (currentUser.value?.uid && db) {
                const connectivity = checkFirestoreConnectivity()
                if (connectivity.available) {
                    const ref = doc(db, 'usuarios', currentUser.value.uid)
                    updateDoc(ref, { status: 'offline' }).catch(error => {
                        console.warn('[Presence] Erro ao definir offline:', error)
                    })
                }
            }
        })
    }

    // Inicializar
    init() {
        if (this.isInitialized) return
        this.isInitialized = true

        console.log('[Presence] Sistema de presença inicializado')

        // Adicionar listeners
        this.setupActivityListeners()
        this.setupVisibilityListener()
        this.setupUnloadListener()

        // Iniciar timers
        this.resetIdleTimer()
        this.startHeartbeat()

        // ✅ DEFINIR STATUS INICIAL IMEDIATAMENTE
        this.updateStatus('disponivel')
    }    // Cleanup
    cleanup() {
        // Remover listeners
        document.removeEventListener('visibilitychange', this.setupVisibilityListener)
        window.removeEventListener('beforeunload', this.setupUnloadListener)

        // Limpar timers
        clearTimeout(this.idleTimer)
        clearInterval(this.heartbeatTimer)

        this.isInitialized = false
        console.log('[Presence] Sistema de presença finalizado')
    }
}

// Instância singleton
const presenceManager = new UserPresenceManager()

export function initUserPresence() {
    presenceManager.init()
}

export function cleanupUserPresence() {
    presenceManager.cleanup()
}
