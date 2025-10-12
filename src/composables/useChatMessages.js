import { ref, nextTick, onMounted, onUnmounted, computed } from 'vue'
import { db } from '@/plugins/firebase'
import { collection, onSnapshot, query, orderBy, limit, addDoc, startAfter, getDocs } from 'firebase/firestore'
import Logger from '@/utils/logger';
const logger = new Logger('useChatMessages');


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

export const useChatMessages = (currentUser) => {
    const messages = ref([])
    const messagesEnd = ref(null)
    const isLoadingMore = ref(false)
    const hasMoreMessages = ref(true)
    const pageSize = 50 // Carregar 50 mensagens por vez
    let lastDoc = null
    let unsubscribe = null

    const loadMessages = async (loadMore = false) => {
        if (isLoadingMore.value) return

        try {
            isLoadingMore.value = loadMore

            const messagesCollectionRef = collection(db, 'chatMessages')
            let q = query(
                messagesCollectionRef,
                orderBy('timestamp', 'desc'),
                limit(pageSize)
            )

            // Se estiver carregando mais, começar após o último documento
            if (loadMore && lastDoc) {
                q = query(q, startAfter(lastDoc))
            }

            // Limpar listener anterior se existir
            if (unsubscribe) {
                unsubscribe()
                unsubscribe = null
            }

            // Para primeira carga, usar snapshot listener
            if (!loadMore) {
                unsubscribe = onSnapshot(q, (snapshot) => {
                    const newMessages = snapshot.docs
                        .map(doc => ({ id: doc.id, ...doc.data() }))
                        .reverse()

                    messages.value = newMessages
                    lastDoc = snapshot.docs[snapshot.docs.length - 1] || null
                    hasMoreMessages.value = snapshot.docs.length === pageSize

                    nextTick(() => {
                        if (!loadMore) scrollToEnd()
                    })
                })
            } else {
                // Para carregamento adicional, buscar uma vez
                const snapshot = await getDocs(q)
                if (!snapshot.empty) {
                    const newMessages = snapshot.docs
                        .map(doc => ({ id: doc.id, ...doc.data() }))
                        .reverse()

                    // Adicionar no início (mensagens mais antigas)
                    messages.value = [...newMessages, ...messages.value]
                    lastDoc = snapshot.docs[snapshot.docs.length - 1]
                    hasMoreMessages.value = snapshot.docs.length === pageSize
                } else {
                    hasMoreMessages.value = false
                }
            }
        } catch (error) {
            logger.error('Erro ao carregar mensagens:', error)
            // Implementar fallback ou notificação de erro
        } finally {
            isLoadingMore.value = false
        }
    }

    const loadMoreMessages = () => {
        if (hasMoreMessages.value && !isLoadingMore.value) {
            loadMessages(true)
        }
    }

    const sendMessage = async (text) => {
        if (!text.trim() || !currentUser?.value) return false

        try {
            await addDoc(collection(db, 'chatMessages'), {
                senderId: currentUser.value.uid,
                senderName: currentUser.value.displayName || 'Anônimo',
                senderPhotoURL: currentUser.value.photoURL || '',
                text: text.trim(),
                timestamp: new Date(),
            })

            // Scroll para o final após enviar
            nextTick(() => scrollToEnd())
            return true
        } catch (error) {
            logger.error('Erro ao enviar mensagem:', error)
            // Aqui poderia implementar retry ou notificação
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
            // Fallback: scroll manual
            const container = messagesEnd.value?.parentElement
            if (container) {
                container.scrollTop = container.scrollHeight
            }
        }
    }

    const getMessageUserPhoto = (message) => {
        // Prioriza a foto salva na mensagem
        if (message.senderPhotoURL) {
            return message.senderPhotoURL
        }
        // Fallback: gerar avatar com iniciais do nome
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(message.senderName || 'User')}`
    }

    // Computed para verificar se deve mostrar botão de carregar mais
    const shouldShowLoadMore = computed(() => {
        return hasMoreMessages.value && !isLoadingMore.value && messages.value.length >= pageSize
    })

    onMounted(() => {
        loadMessages()
    })

    onUnmounted(() => {
        if (unsubscribe) {
            unsubscribe()
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