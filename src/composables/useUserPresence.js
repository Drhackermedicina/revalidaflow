import { currentUser } from '@/plugins/auth'
import { db } from '@/plugins/firebase'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { updateDocumentWithRetry, checkFirestoreConnectivity } from '@/services/firestoreService'
import Logger from '@/utils/logger';
const logger = new Logger('useUserPresence');


class UserPresenceManager {
    constructor() {
        this.isIdle = false
        this.idleTime = 0
        this.lastActivityTime = Date.now()
        this.idleTimer = null
        this.heartbeatTimer = null
        this.visibilityTimeout = null
        this.isInitialized = false
        this.lastPresenceUpdate = 0

        this.activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
        this.activityListenerOptions = { passive: true }

        this.handleActivity = this.handleActivity.bind(this)
        this.handleVisibilityChange = this.handleVisibilityChange.bind(this)
        this.handleBeforeUnload = this.handleBeforeUnload.bind(this)
        this.handlePageHide = this.handlePageHide.bind(this)
        this.handleOfflineEvent = this.handleOfflineEvent.bind(this)

        // Configurações
        this.IDLE_TIMEOUT = 10 * 60 * 1000 // 10 minutos para ficar ausente
        this.HEARTBEAT_INTERVAL = 30 * 1000 // 30 segundos para verificar conectividade
        this.VISIBILITY_GRACE_PERIOD = 10 * 1000 // 10 segundos de tolerância ao ocultar aba
        this.ACTIVE_UPDATE_INTERVAL = 60 * 1000 // Atualiza presença a cada 60 segundos enquanto ativo
    }

    get win() {
        return typeof window !== 'undefined' ? window : null
    }

    get doc() {
        return typeof document !== 'undefined' ? document : null
    }

    getPresencePayload(status) {
        const authUser = currentUser.value || {}
        const photoURL = authUser.photoURL || authUser.photoUrl || ''
        const displayName = authUser.displayName || [authUser.nome, authUser.sobrenome].filter(Boolean).join(' ') || authUser.email || ''

        const payload = {
            status,
            lastActive: serverTimestamp(),
            isOnline: status !== 'offline'
        }

        if (photoURL) {
            payload.photoURL = photoURL
        }

        if (displayName) {
            payload.displayName = displayName
        }

        return payload
    }

    maybePingPresence(force = false) {
        const now = Date.now()
        if (force || (now - this.lastPresenceUpdate) >= this.ACTIVE_UPDATE_INTERVAL) {
            this.lastPresenceUpdate = now
            this.updateStatus('disponivel')
        }
    }

    handleActivity() {
        this.resetIdleTimer()
        this.maybePingPresence()
    }

    handleVisibilityChange() {
        const doc = this.doc
        if (!doc) {
            return
        }

        if (doc.hidden) {
            this.visibilityTimeout = setTimeout(() => {
                const currentDoc = this.doc
                if (currentDoc?.hidden && !this.isIdle) {
                    this.isIdle = true
                    this.updateStatus('ausente')
                }
            }, this.VISIBILITY_GRACE_PERIOD)
        } else {
            if (this.visibilityTimeout) {
                clearTimeout(this.visibilityTimeout)
                this.visibilityTimeout = null
            }
            this.resetIdleTimer()
        }
    }

    handleBeforeUnload() {
        if (currentUser.value?.uid && db) {
            const connectivity = checkFirestoreConnectivity()
            if (connectivity.available) {
                const ref = doc(db, 'usuarios', currentUser.value.uid)
                updateDoc(ref, this.getPresencePayload('offline')).catch(error => {
                    logger.warn('[Presence] Erro ao definir offline:', error)
                })
            }
        }
    }
    handlePageHide() {
        this.updateStatus('offline')
    }

    handleOfflineEvent() {
        this.updateStatus('offline')
    }

    stopIdleTimer() {
        if (this.idleTimer) {
            clearTimeout(this.idleTimer)
            this.idleTimer = null
        }
    }

    stopHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer)
            this.heartbeatTimer = null
        }
    }

    clearVisibilityTimeout() {
        if (this.visibilityTimeout) {
            clearTimeout(this.visibilityTimeout)
            this.visibilityTimeout = null
        }
    }

    // Atualizar status no Firestore
    async updateStatus(status) {
        if (!currentUser.value?.uid || !db) return

        try {
            const connectivity = checkFirestoreConnectivity()
            if (!connectivity.available) return

            const ref = doc(db, 'usuarios', currentUser.value.uid)
            await updateDocumentWithRetry(
                ref,
                this.getPresencePayload(status),
                'atualização de presença do usuário'
            )
            this.lastPresenceUpdate = Date.now()
            logger.debug(`[Presence] Status: ${status}`)
        } catch (error) {
            logger.warn('[Presence] Erro ao atualizar status:', error)
        }
    }

    // Resetar timer de inatividade
    resetIdleTimer() {
        this.lastActivityTime = Date.now()
        this.idleTime = 0

        if (this.isIdle) {
            this.isIdle = false
            this.updateStatus('disponivel')
        } else {
            this.maybePingPresence()
        }

        this.stopIdleTimer()
        this.idleTimer = setTimeout(() => {
            const doc = this.doc
            if (doc && !doc.hidden) { // Só marcar como ausente se aba estiver visível
                this.isIdle = true
                this.updateStatus('ausente')
            }
        }, this.IDLE_TIMEOUT)
    }

    // Heartbeat para manter conexão ativa (menos frequente)
    startHeartbeat() {
        this.stopHeartbeat()
        this.heartbeatTimer = setInterval(() => {
            const timeSinceActivity = Date.now() - this.lastActivityTime
            const doc = this.doc

            if (timeSinceActivity > this.IDLE_TIMEOUT && doc && !doc.hidden && !this.isIdle) {
                this.isIdle = true
                this.updateStatus('ausente')
            } else if (doc && !doc.hidden && !this.isIdle) {
                this.maybePingPresence()
            }
        }, this.HEARTBEAT_INTERVAL)
    }

    // Eventos de atividade do usuário
    setupActivityListeners() {
        const doc = this.doc
        if (!doc) return

        this.activityEvents.forEach(event => {
            doc.addEventListener(event, this.handleActivity, this.activityListenerOptions)
        })
    }

    removeActivityListeners() {
        const doc = this.doc
        if (!doc) return

        this.activityEvents.forEach(event => {
            doc.removeEventListener(event, this.handleActivity, this.activityListenerOptions)
        })
    }

    // Visibility API - detectar quando aba ganha/perde foco
    setupVisibilityListener() {
        const doc = this.doc
        if (!doc) return

        doc.addEventListener('visibilitychange', this.handleVisibilityChange)
    }

    // Page unload - marcar como offline
    setupUnloadListener() {
        const win = this.win
        if (!win) return

        win.addEventListener('beforeunload', this.handleBeforeUnload)
        win.addEventListener('pagehide', this.handlePageHide, { capture: true })
        win.addEventListener('offline', this.handleOfflineEvent)
    }

    // Inicializar
    init() {
        if (this.isInitialized) return

        if (!this.doc || !this.win) {
            logger.warn('[Presence] Ambiente sem window/document. Inicialização ignorada.')
            return
        }

        this.isInitialized = true

        logger.debug('[Presence] Sistema de presença inicializado')

        // Adicionar listeners
        this.setupActivityListeners()
        this.setupVisibilityListener()
        this.setupUnloadListener()

        // Iniciar timers
        this.resetIdleTimer()
        this.startHeartbeat()
    }

    // Cleanup
    cleanup() {
        if (!this.isInitialized) return

        this.removeActivityListeners()
        const doc = this.doc
        if (doc) {
            doc.removeEventListener('visibilitychange', this.handleVisibilityChange)
        }
        const win = this.win
        if (win) {
            win.removeEventListener('beforeunload', this.handleBeforeUnload)
            win.removeEventListener('pagehide', this.handlePageHide, { capture: true })
            win.removeEventListener('offline', this.handleOfflineEvent)
        }

        this.clearVisibilityTimeout()
        this.stopIdleTimer()
        this.stopHeartbeat()

        this.isInitialized = false
        logger.debug('[Presence] Sistema de presença finalizado')
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
