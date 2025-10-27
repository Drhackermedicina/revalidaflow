/**
 * useTrainingInvites.js - VERSÃO CORRIGIDA
 *
 * Composable para gerenciar o sistema de convites automáticos para treino via chat
 *
 * CORREÇÕES IMPLEMENTADAS:
 * - Fallback para queries sem índice composto
 * - Cache local para performance
 * - Retry automático com backoff exponencial
 * - Tratamento robusto de erros Firestore
 * - Logging estruturado para debugging
 *
 * Funcionalidades:
 * - Enviar convites de treino
 * - Processar respostas (aceite/rejeite)
 * - Gerenciar estados de convites no Firebase
 * - Integrar com StationList para convites aceitos
 */

import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { collection, addDoc, doc, updateDoc, onSnapshot, query, orderBy, where, limit, serverTimestamp, deleteDoc, getDocs, getDoc } from 'firebase/firestore'
import { db } from '@/plugins/firebase.js'
import { currentUser } from '@/plugins/auth.js'

// Sistema de logging estruturado
const logger = {
  info: (message, data = {}) => {
    console.log(`[useTrainingInvites] ℹ️ ${message}`, data)
  },
  error: (message, error = {}) => {
    console.error(`[useTrainingInvites] ❌ ${message}`, error)
  },
  warn: (message, data = {}) => {
    console.warn(`[useTrainingInvites] ⚠️ ${message}`, data)
  },
  debug: (message, data = {}) => {
    console.log(`[useTrainingInvites] 🐛 ${message}`, data)
  }
}

export function useTrainingInvites() {
  const router = useRouter()

  // Estados reativos
  const invites = ref([])
  const currentInvite = ref(null)
  const isLoading = ref(false)
  const error = ref(null)
  const isUsingFallback = ref(false)

  // Cache local para performance
  const localCache = ref(new Map())
  const cacheExpiry = ref(new Map())
  const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

  // Sistema de retry
  const retryAttempts = ref(new Map())
  const MAX_RETRY_ATTEMPTS = 3

  // Estado para controle automático de verificação de índice
  const indexVerificationInterval = ref(null)
  const lastIndexCheck = ref(null)
  const INDEX_CHECK_INTERVAL = 60000 // Verificar a cada 1 minuto

  // Listener para snapshots
  let invitesUnsubscribe = null
  let fallbackInterval = null

  logger.info('Sistema de convites inicializado')

  /**
   * Sistema de verificação automática de índice
   * Verifica periodicamente se o índice Firebase está disponível
   */
  const verifyIndexAvailability = async (userId) => {
    if (!userId || !currentUser.value) return false

    // Evitar verificações muito frequentes
    const now = Date.now()
    if (lastIndexCheck.value && (now - lastIndexCheck.value) < INDEX_CHECK_INTERVAL) {
      return !isUsingFallback.value
    }

    lastIndexCheck.value = now

    try {
      logger.debug('Verificando disponibilidade do índice Firebase...')

      // Tentar query com ordenação (requer índice)
      const testQuery = query(
        collection(db, 'trainingInvites'),
        where('fromUserId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(1)
      )

      await getDocs(testQuery)

      // Se chegou aqui, o índice está disponível
      if (isUsingFallback.value) {
        logger.info('🎉 Índice Firebase disponível! Transicionando do modo fallback para otimizado.')

        // Limpar recursos do modo fallback
        if (fallbackInterval) {
          clearInterval(fallbackInterval)
          fallbackInterval = null
        }

        // Iniciar modo otimizado
        isUsingFallback.value = false

        // Reinicializar listeners em modo otimizado
        await initializeInviteListeners(userId)

        return true
      }

      return !isUsingFallback.value

    } catch (error) {
      if (error.code === 'failed-precondition' || error.message.includes('requires an index')) {
        logger.debug('Índice ainda não disponível, mantendo modo fallback')
        return false
      } else {
        logger.warn('Erro inesperado ao verificar índice:', error)
        return false
      }
    }
  }

  /**
   * Inicia verificação periódica automática do índice
   */
  const startIndexVerification = (userId) => {
    if (indexVerificationInterval.value) {
      clearInterval(indexVerificationInterval.value)
    }

    indexVerificationInterval.value = setInterval(async () => {
      await verifyIndexAvailability(userId)
    }, INDEX_CHECK_INTERVAL)

    logger.info('Verificação automática de índice iniciada', {
      interval: `${INDEX_CHECK_INTERVAL/1000}s`
    })
  }

  /**
   * Para verificação automática do índice
   */
  const stopIndexVerification = () => {
    if (indexVerificationInterval.value) {
      clearInterval(indexVerificationInterval.value)
      indexVerificationInterval.value = null
      logger.debug('Verificação automática de índice parada')
    }
  }

  /**
   * Sistema de cache para performance
   */
  const getFromCache = (key) => {
    const cached = localCache.value.get(key)
    const expiry = cacheExpiry.value.get(key)

    if (cached && expiry && Date.now() < expiry) {
      logger.debug(`Cache hit para: ${key}`)
      return cached
    }

    // Remover cache expirado
    if (cached) {
      localCache.value.delete(key)
      cacheExpiry.value.delete(key)
    }

    return null
  }

  const setCache = (key, data) => {
    localCache.value.set(key, data)
    cacheExpiry.value.set(key, Date.now() + CACHE_DURATION)
    logger.debug(`Cache set para: ${key}`)
  }

  /**
   * Sistema de retry com backoff exponencial
   */
  const executeWithRetry = async (operation, operationName, key) => {
    const attempts = retryAttempts.value.get(key) || 0

    if (attempts >= MAX_RETRY_ATTEMPTS) {
      logger.error(`Máximo de tentativas excedido para: ${operationName}`)
      throw new Error(`Falha após ${MAX_RETRY_ATTEMPTS} tentativas: ${operationName}`)
    }

    try {
      logger.debug(`Executando ${operationName} (tentativa ${attempts + 1})`)
      const result = await operation()

      // Sucesso - limpar tentativas
      retryAttempts.value.delete(key)
      return result

    } catch (err) {
      logger.warn(`Falha em ${operationName} (tentativa ${attempts + 1}):`, err)

      // Incrementar tentativas
      retryAttempts.value.set(key, attempts + 1)

      // Se for erro de índice Firestore, tentar fallback
      if (err.code === 'failed-precondition' || err.message.includes('requires an index')) {
        logger.warn('Erro de índice Firestore, ativando fallback')
        isUsingFallback.value = true
        throw err // Propagar para tratamento específico
      }

      // Backoff exponencial
      const delay = Math.pow(2, attempts) * 1000
      await new Promise(resolve => setTimeout(resolve, delay))

      // Tentar novamente
      return executeWithRetry(operation, operationName, key)
    }
  }

  /**
   * Query com fallback para quando índice não está disponível
   */
  const createInviteQuery = (userId, useFallback = false) => {
    try {
      if (useFallback) {
        // Fallback: query mais simples que não requer índice composto
        logger.debug('Usando query fallback (sem ordenação)')
        return query(
          collection(db, 'trainingInvites'),
          where('fromUserId', '==', userId),
          limit(20)
        )
      } else {
        // Query ideal com índice composto
        logger.debug('Usando query otimizada com índice')
        return query(
          collection(db, 'trainingInvites'),
          where('fromUserId', '==', userId),
          orderBy('createdAt', 'desc'),
          limit(20)
        )
      }
    } catch (err) {
      logger.error('Erro ao criar query:', err)
      // Retornar query mais simples como fallback
      return query(
        collection(db, 'trainingInvites'),
        where('fromUserId', '==', userId),
        limit(10)
      )
    }
  }

  /**
   * Envia um convite de treino para um usuário (VERSÃO CORRIGIDA)
   */
  const sendTrainingInvite = async (toUser) => {
    if (!currentUser.value?.uid || !toUser?.uid) {
      const errorMsg = 'Usuários não identificados'
      logger.error('Validação falhou: Usuários não identificados')
      throw new Error(errorMsg)
    }

    if (currentUser.value.uid === toUser.uid) {
      const errorMsg = 'Não pode enviar convite para si mesmo'
      logger.warn('Tentativa de autoconvite bloqueada')
      throw new Error(errorMsg)
    }

    isLoading.value = true
    error.value = null

    const operationKey = `send_${currentUser.value.uid}_${toUser.uid}`

    try {
      logger.info('Iniciando envio de convite', {
        from: currentUser.value.displayName,
        to: toUser.displayName || toUser.nome
      })

      // Verificar cache primeiro
      const cacheKey = `invites_${currentUser.value.uid}`
      let cachedInvites = getFromCache(cacheKey)

      if (!cachedInvites) {
        // Buscar convites do Firestore com retry
        cachedInvites = await executeWithRetry(
          async () => {
            const q = createInviteQuery(currentUser.value.uid, isUsingFallback.value)
            const snapshot = await getDocs(q)
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
          },
          'buscar_convites',
          cacheKey
        )
        setCache(cacheKey, cachedInvites)
      }

      // Verificar se já existe um convite pendente
      const existingInvite = cachedInvites.find(invite =>
        invite.fromUserId === currentUser.value.uid &&
        invite.toUserId === toUser.uid &&
        invite.status === 'pending'
      )

      if (existingInvite) {
        // Verificar se convite expirou
        const now = Date.now()
        const expiresAt = existingInvite.expiresAt?.toMillis ?
          existingInvite.expiresAt.toMillis() :
          new Date(existingInvite.expiresAt).getTime()

        if (now < expiresAt) {
          const errorMsg = 'Já existe um convite pendente para este usuário'
          logger.warn('Convite pendente encontrado', { inviteId: existingInvite.id })
          throw new Error(errorMsg)
        } else {
          // Convite expirou - marcar como expirado
          try {
            await updateDoc(doc(db, 'trainingInvites', existingInvite.id), {
              status: 'expired',
              expiredAt: serverTimestamp()
            })
            logger.info('Convite expirado marcado automaticamente', { inviteId: existingInvite.id })
          } catch (err) {
            logger.warn('Falha ao marcar convite como expirado:', err)
          }
        }
      }

      // Criar novo convite
      const inviteData = {
        fromUserId: currentUser.value.uid,
        toUserId: toUser.uid,
        fromUserName: currentUser.value.displayName || 'Usuário',
        toUserName: toUser.displayName || toUser.nome || 'Usuário',
        status: 'pending',
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutos
        type: 'training_invite'
      }

      logger.debug('Enviando convite para Firestore', inviteData)

      const docRef = await addDoc(collection(db, 'trainingInvites'), inviteData)

      const newInvite = {
        id: docRef.id,
        ...inviteData,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
      }

      // Limpar cache para forçar atualização
      localCache.value.delete(cacheKey)

      logger.info('Convite enviado com sucesso', {
        inviteId: docRef.id,
        to: toUser.displayName || toUser.nome
      })

      return {
        success: true,
        invite: newInvite,
        message: 'Convite enviado com sucesso!'
      }

    } catch (err) {
      error.value = err.message
      logger.error('Falha ao enviar convite:', err)

      return {
        success: false,
        error: err.message
      }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Processa a resposta a um convite (aceitar ou rejeitar)
   */
  const respondToInvite = async (inviteId, accepted) => {
    if (!currentUser.value?.uid) {
      const errorMsg = 'Usuário não autenticado'
      logger.error(errorMsg)
      throw new Error(errorMsg)
    }

    isLoading.value = true
    error.value = null

    const operationKey = `respond_${inviteId}`

    try {
      logger.info('Processando resposta do convite', {
        inviteId,
        accepted,
        userId: currentUser.value.uid
      })

      await executeWithRetry(
        async () => {
          const inviteRef = doc(db, 'trainingInvites', inviteId)

          const updateData = {
            status: accepted ? 'accepted' : 'rejected',
            respondedAt: serverTimestamp(),
            respondedBy: currentUser.value.uid
          }

          await updateDoc(inviteRef, updateData)
          return updateData
        },
        'responder_convite',
        operationKey
      )

      // Se aceitou, gerar dados para redirecionamento
      let redirectData = null
      if (accepted) {
        const invite = invites.value.find(inv => inv.id === inviteId)
        if (invite) {
          redirectData = {
            fromUserId: invite.fromUserId,
            fromUserName: invite.fromUserName,
            toUserId: invite.toUserId,
            toUserName: invite.toUserName
          }
        }
      }

      // Limpar cache
      localCache.value.clear()

      logger.info('Resposta processada com sucesso', {
        inviteId,
        accepted,
        hasRedirectData: !!redirectData
      })

      return {
        success: true,
        accepted,
        redirectData,
        message: accepted ? 'Convite aceito!' : 'Convite rejeitado'
      }

    } catch (err) {
      error.value = err.message
      logger.error('Falha ao processar resposta:', err)

      return {
        success: false,
        error: err.message
      }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Formata a mensagem de convite para o chat
   */
  const formatInviteMessage = (invite) => {
    const isFromMe = invite.fromUserId === currentUser.value?.uid

    if (isFromMe) {
      return {
        id: `invite_${invite.id}`,
        type: 'training_invite_sent',
        text: `Oi ${invite.toUserName}! Quer treinar comigo?`,
        senderId: invite.fromUserId,
        senderName: invite.fromUserName,
        timestamp: invite.createdAt,
        inviteData: invite,
        isInvite: true,
        inviteStatus: invite.status
      }
    } else {
      return {
        id: `invite_${invite.id}`,
        type: 'training_invite_received',
        text: `Oi ${invite.toUserName}! Quer treinar comigo?`,
        senderId: invite.fromUserId,
        senderName: invite.fromUserName,
        timestamp: invite.createdAt,
        inviteData: invite,
        isInvite: true,
        inviteStatus: invite.status,
        showButtons: invite.status === 'pending'
      }
    }
  }

  /**
   * Formata a mensagem de resposta para o chat
   */
  const formatResponseMessage = (invite, accepted) => {
    const isFromMe = invite.toUserId === currentUser.value?.uid
    const senderId = isFromMe ? invite.toUserId : invite.fromUserId
    const senderName = isFromMe ? invite.toUserName : invite.fromUserName

    return {
      id: `response_${invite.id}`,
      type: 'training_response',
      text: accepted
        ? `✅ ${senderName} aceitou o convite! [Selecionar Estação para Treinar]`
        : `❌ ${senderName} rejeitou o convite.`,
      senderId: senderId,
      senderName: senderName,
      timestamp: invite.respondedAt || new Date(),
      inviteData: invite,
      isResponse: true,
      accepted: accepted,
      linkToStationList: accepted
    }
  }

  /**
   * Gera URL para StationList com dados do convite aceito
   */
  const generateStationListUrl = (inviteData) => {
    const baseUrl = '/app/station-list'
    const params = new URLSearchParams()

    params.append('inviteAccepted', 'true')
    params.append('invitedBy', inviteData.fromUserId)
    params.append('invitedByName', inviteData.fromUserName)
    params.append('inviteId', inviteData.id || '')

    return `${baseUrl}?${params.toString()}`
  }

  /**
   * Inicializa listeners de convites em tempo real (VERSÃO OTIMIZADA)
   */
  const initializeInviteListeners = (userId) => {
    if (!userId) {
      logger.warn('initializeInviteListeners chamado sem userId')
      return
    }

    logger.info('Inicializando listeners de convites', { userId })

    // Limpar listener anterior
    if (invitesUnsubscribe) {
      invitesUnsubscribe()
      invitesUnsubscribe = null
    }

    if (fallbackInterval) {
      clearInterval(fallbackInterval)
      fallbackInterval = null
    }

    // Verificar cache primeiro antes de configurar listener
    const cacheKey = `invites_${userId}`
    const cachedInvites = getFromCache(cacheKey)

    if (cachedInvites) {
      invites.value = cachedInvites
      logger.debug('Usando cache inicial', { count: cachedInvites.length })
    }

    // Tentar usar listener em tempo real primeiro
    try {
      const setupRealtimeListener = (useFallback = false) => {
        const q = createInviteQuery(userId, useFallback)

        invitesUnsubscribe = onSnapshot(q,
          (snapshot) => {
            try {
              const fetchedInvites = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              }))

              // Ordenar por data (se não vier ordenado do Firestore)
              if (useFallback) {
                fetchedInvites.sort((a, b) => {
                  const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime()
                  const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime()
                  return dateB - dateA
                })
              }

              // Atualizar cache
              setCache(cacheKey, fetchedInvites)

              // Atualizar estado reativo
              invites.value = fetchedInvites

              logger.debug('Convites atualizados via listener', {
                count: fetchedInvites.length,
                usingFallback: useFallback,
                cacheUpdated: true
              })

            } catch (err) {
              logger.error('Erro ao processar snapshot:', err)
            }
          },
          (err) => {
            logger.error('Erro no listener de convites:', err)

            // Se for erro de índice, tentar fallback
            if (err.code === 'failed-precondition' || err.message.includes('requires an index')) {
              logger.warn('Erro de índice no listener, tentando fallback')
              isUsingFallback.value = true

              // Tentar novamente com fallback após delay
              setTimeout(() => {
                setupRealtimeListener(true)
              }, 2000)
            } else {
              // Para outros erros, tentar polling fallback
              startPollingFallback(userId)
            }
          }
        )
      }

      setupRealtimeListener(isUsingFallback.value)

    } catch (err) {
      logger.error('Erro ao configurar listener:', err)
      // Fallback para polling
      startPollingFallback(userId)
    }
  }

  /**
   * Fallback com polling quando listener em tempo real falha
   */
  const startPollingFallback = (userId) => {
    logger.warn('Iniciando polling fallback para convites')
    isUsingFallback.value = true

    if (fallbackInterval) {
      clearInterval(fallbackInterval)
    }

    fallbackInterval = setInterval(async () => {
      try {
        const cacheKey = `invites_${userId}`
        const cachedInvites = getFromCache(cacheKey)

        if (!cachedInvites) {
          const q = createInviteQuery(userId, true)
          const snapshot = await getDocs(q)
          const fetchedInvites = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }))

          // Ordenar por data
          fetchedInvites.sort((a, b) => {
            const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime()
            const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime()
            return dateB - dateA
          })

          invites.value = fetchedInvites
          setCache(cacheKey, fetchedInvites)
          logger.debug('Convites atualizados via polling', { count: fetchedInvites.length })
        }
      } catch (err) {
        logger.error('Erro no polling fallback:', err)
      }
    }, 15000) // Polling a cada 15 segundos (otimizado para reduzir carga)

    // Iniciar verificação automática do índice para transição suave
    startIndexVerification(userId)
  }

  /**
   * Limpa convites expirados
   */
  const cleanupExpiredInvites = async () => {
    try {
      const now = new Date()
      const expiredInvites = invites.value.filter(invite =>
        invite.status === 'pending' &&
        invite.expiresAt &&
        (invite.expiresAt.toMillis ?
          invite.expiresAt.toMillis() < now.getTime() :
          new Date(invite.expiresAt) < now)
      )

      if (expiredInvites.length > 0) {
        logger.info('Limpando convites expirados', { count: expiredInvites.length })

        for (const invite of expiredInvites) {
          try {
            await updateDoc(doc(db, 'trainingInvites', invite.id), {
              status: 'expired',
              expiredAt: serverTimestamp()
            })
          } catch (err) {
            logger.warn('Falha ao marcar convite como expirado:', { inviteId: invite.id, error: err })
          }
        }
      }
    } catch (err) {
      logger.error('Erro ao limpar convites expirados:', err)
    }
  }

  /**
   * Navega para StationList com dados do convite aceito
   */
  const navigateToStationList = (inviteData) => {
    const url = generateStationListUrl(inviteData)
    logger.info('Navegando para StationList', { url })
    router.push(url)
  }

  /**
   * Computed values
   */
  const pendingInvites = computed(() => {
    return invites.value.filter(invite =>
      invite.status === 'pending' &&
      invite.toUserId === currentUser.value?.uid
    )
  })

  const sentInvites = computed(() => {
    return invites.value.filter(invite =>
      invite.fromUserId === currentUser.value?.uid
    )
  })

  const hasPendingInvites = computed(() => {
    return pendingInvites.value.length > 0
  })

  // Indicadores de performance e status do sistema
  const systemStatus = computed(() => {
    if (error.value) return { type: 'error', color: 'red', text: 'Erro no Sistema' }
    if (isUsingFallback.value) return { type: 'warning', color: 'orange', text: 'Modo Limitado' }
    return { type: 'success', color: 'green', text: 'Otimizado' }
  })

  const systemPerformance = computed(() => {
    if (isUsingFallback.value) {
      return {
        queryTime: '1-3s',
        updateFreq: '15s',
        cacheStatus: 'Local 5min',
        status: 'limitado'
      }
    } else {
      return {
        queryTime: '<100ms',
        updateFreq: 'Tempo real',
        cacheStatus: 'Local 5min',
        status: 'otimizado'
      }
    }
  })

  /**
   * Cleanup quando o composable for desmontado
   */
  const cleanup = () => {
    logger.info('Limpando recursos do useTrainingInvites')

    if (invitesUnsubscribe) {
      invitesUnsubscribe()
      invitesUnsubscribe = null
    }

    if (fallbackInterval) {
      clearInterval(fallbackInterval)
      fallbackInterval = null
    }

    // Parar verificação automática de índice
    stopIndexVerification()

    localCache.value.clear()
    cacheExpiry.value.clear()
    retryAttempts.value.clear()
  }

  // Auto-limpeza de convites expirados a cada minuto
  const cleanupInterval = setInterval(cleanupExpiredInvites, 60000)

  // Watch para limpar quando usuário mudar
  watch(currentUser, (newUser) => {
    if (newUser) {
      initializeInviteListeners(newUser.uid)
    } else {
      cleanup()
    }
  }, { immediate: true })

  return {
    // Estados
    invites,
    currentInvite,
    isLoading,
    error,
    isUsingFallback,
    pendingInvites,
    sentInvites,
    hasPendingInvites,

    // Indicadores de performance e status
    systemStatus,
    systemPerformance,

    // Métodos
    sendTrainingInvite,
    respondToInvite,
    formatInviteMessage,
    formatResponseMessage,
    generateStationListUrl,
    initializeInviteListeners,
    navigateToStationList,
    cleanupExpiredInvites,
    cleanup,
    verifyIndexAvailability,
    startIndexVerification,
    stopIndexVerification
  }
}