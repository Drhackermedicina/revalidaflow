import { ref, nextTick, onMounted, onUnmounted, computed } from 'vue'
import { db } from '@/plugins/firebase'
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
  addDoc,
  startAfter,
  getDocs,
  serverTimestamp
} from 'firebase/firestore'
import Logger from '@/utils/logger'
const logger = new Logger('useChatMessages')


/**
 * @typedef {Object} ChatMessage
 * @property {string} id
 * @property {string} [senderId]
 * @property {string} [senderName]
 * @property {string} [senderPhotoURL]
 * @property {string} [text]
 * @property {any} [timestamp]
 */

// Função utilitária para formatar tempo
export const formatTime = (timestamp) => {
    if (!timestamp) return ''
    try {
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
        return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    } catch (error) {
        logger.error('Erro ao formatar timestamp:', error)
        return ''
    }
}

const getTimestampMs = (timestamp) => {
  if (!timestamp) return 0
  if (typeof timestamp.toDate === 'function') {
    return timestamp.toDate().getTime()
  }
  if (timestamp instanceof Date) {
    return timestamp.getTime()
  }
  return new Date(timestamp).getTime()
}

export const useChatMessages = (currentUser) => {
  const messages = ref([])
  const messagesEnd = ref(null)
  const isLoadingMore = ref(false)
  const hasMoreMessages = ref(true)
  const historyFullyLoaded = ref(false)
  const pageSize = 50 // Carregar 50 mensagens por vez

  let unsubscribe = null
  let paginationCursor = null
  let isInitialSnapshot = true

  const initializeRealtimeListener = () => {
    if (unsubscribe) return

    try {
      const messagesCollectionRef = collection(db, 'chatMessages')
      const realtimeQuery = query(
        messagesCollectionRef,
        orderBy('timestamp', 'desc'),
        limit(pageSize)
      )

      unsubscribe = onSnapshot(
        realtimeQuery,
        (snapshot) => {
          if (!historyFullyLoaded.value && snapshot.docs.length === pageSize) {
            hasMoreMessages.value = true
          } else if (!historyFullyLoaded.value) {
            hasMoreMessages.value = snapshot.docs.length === pageSize
          }

          if (!paginationCursor && snapshot.docs.length > 0) {
            paginationCursor = snapshot.docs[snapshot.docs.length - 1]
          }

          const previousLastMessageId = messages.value.length
            ? messages.value[messages.value.length - 1].id
            : null

          const mergedMessages = new Map(
            messages.value.map(message => [message.id, message])
          )

          snapshot.docs.forEach(doc => {
            mergedMessages.set(doc.id, { id: doc.id, ...doc.data() })
          })

          const sortedMessages = Array.from(mergedMessages.values()).sort(
            (a, b) => getTimestampMs(a.timestamp) - getTimestampMs(b.timestamp)
          )

          messages.value = sortedMessages

          const currentLastMessageId = sortedMessages.length
            ? sortedMessages[sortedMessages.length - 1].id
            : null

          const shouldAutoScroll =
            isInitialSnapshot || currentLastMessageId !== previousLastMessageId

          if (shouldAutoScroll) {
            nextTick(() => scrollToEnd())
          }

          isInitialSnapshot = false
        },
        (error) => {
          logger.error('Erro ao carregar mensagens em tempo real:', error)
        }
      )
    } catch (error) {
      logger.error('Erro ao inicializar listener de mensagens:', error)
    }
  }

  const fetchOlderMessages = async () => {
    if (isLoadingMore.value || !hasMoreMessages.value || historyFullyLoaded.value) return
    if (!paginationCursor) {
      historyFullyLoaded.value = true
      hasMoreMessages.value = false
      return
    }

    try {
      isLoadingMore.value = true

      const messagesCollectionRef = collection(db, 'chatMessages')
      const olderQuery = query(
        messagesCollectionRef,
        orderBy('timestamp', 'desc'),
        startAfter(paginationCursor),
        limit(pageSize)
      )

      const snapshot = await getDocs(olderQuery)

      if (snapshot.empty) {
        historyFullyLoaded.value = true
        hasMoreMessages.value = false
        return
      }

      const olderMessages = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .reverse()

      const existingIds = new Set(messages.value.map(message => message.id))
      const dedupedOlderMessages = olderMessages.filter(
        message => !existingIds.has(message.id)
      )

      if (dedupedOlderMessages.length) {
        messages.value = [...dedupedOlderMessages, ...messages.value]
      }

      paginationCursor = snapshot.docs[snapshot.docs.length - 1] || paginationCursor
      hasMoreMessages.value = snapshot.docs.length === pageSize

      if (snapshot.docs.length < pageSize) {
        historyFullyLoaded.value = true
      }
    } catch (error) {
      logger.error('Erro ao carregar mensagens antigas:', error)
    } finally {
      isLoadingMore.value = false
    }
  }

  const loadMoreMessages = () => {
    if (hasMoreMessages.value && !isLoadingMore.value) {
      return fetchOlderMessages()
    }
    return Promise.resolve()
  }

  const sendMessage = async (text) => {
    if (!text.trim() || !currentUser?.value) return false

    try {
      const user = currentUser.value
      const senderPhotoURL = user.photoURL || user.photoUrl || ''
      const senderName =
        user.displayName ||
        [user.nome, user.sobrenome].filter(Boolean).join(' ') ||
        user.email ||
        'Anonimo'

      await addDoc(collection(db, 'chatMessages'), {
        senderId: user.uid,
        senderName,
        senderPhotoURL,
        text: text.trim(),
        timestamp: serverTimestamp()
      })

      nextTick(() => scrollToEnd())
      return true
    } catch (error) {
      logger.error('Erro ao enviar mensagem:', error)
      return false
    }
  }

  const scrollToEnd = () => {
    try {
      if (messagesEnd.value?.scrollIntoView) {
        messagesEnd.value.scrollIntoView({ behavior: 'smooth' })
      }
    } catch (error) {
      logger.error('Erro ao fazer scroll para final:', error)
      const container = messagesEnd.value?.parentElement
      if (container) {
        container.scrollTop = container.scrollHeight
      }
    }
  }

  const getMessageUserPhoto = (message) => {
    if (message.senderPhotoURL) {
      return message.senderPhotoURL
    }
    if (message.senderPhotoUrl) {
      return message.senderPhotoUrl
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(message.senderName || 'User')}`
  }

  const shouldShowLoadMore = computed(() => {
    return hasMoreMessages.value && !isLoadingMore.value && messages.value.length >= pageSize
  })

  onMounted(() => {
    initializeRealtimeListener()
  })

  onUnmounted(() => {
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
  })

  return {
    messages,
    messagesEnd,
    isLoadingMore,
    hasMoreMessages,
    shouldShowLoadMore,
    sendMessage,
    loadMoreMessages,
    scrollToEnd,
    formatTime,
    getMessageUserPhoto
  }
}



