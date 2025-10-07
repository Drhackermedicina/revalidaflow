import { ref, nextTick, onMounted, onUnmounted, computed } from 'vue'
import { db } from '@/plugins/firebase'
import { collection, onSnapshot, query, orderBy, limit, addDoc, startAfter, Unsubscribe, QueryDocumentSnapshot, getDocs } from 'firebase/firestore'
import type { ChatUser } from './useChatUsers'

export interface ChatMessage {
    id: string
    senderId?: string
    senderName?: string
    senderPhotoURL?: string
    text?: string
    timestamp?: any
}

export const useChatMessages = (currentUser: any) => {
    const messages = ref<ChatMessage[]>([])
    const messagesEnd = ref<HTMLElement | null>(null)
    const isLoadingMore = ref(false)
    const hasMoreMessages = ref(true)
    const pageSize = 50 // Carregar 50 mensagens por vez
    let lastDoc: QueryDocumentSnapshot | null = null
    let unsubscribe: Unsubscribe | null = null

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

            // Para primeira carga, usar snapshot listener
            if (!loadMore) {
                unsubscribe = onSnapshot(q, (snapshot) => {
                    const newMessages = snapshot.docs
                        .map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage))
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
                        .map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage))
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
            console.error('Erro ao carregar mensagens:', error)
        } finally {
            isLoadingMore.value = false
        }
    }

    const loadMoreMessages = () => {
        if (hasMoreMessages.value && !isLoadingMore.value) {
            loadMessages(true)
        }
    }

    const sendMessage = async (text: string) => {
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
            console.error('Erro ao enviar mensagem:', error)
            return false
        }
    }

    const scrollToEnd = () => {
        if (messagesEnd.value?.scrollIntoView) {
            messagesEnd.value.scrollIntoView({ behavior: 'smooth' })
        }
    }

    const getMessageUserPhoto = (message: ChatMessage) => {
        // Prioriza a foto salva na mensagem
        if (message.senderPhotoURL) {
            return message.senderPhotoURL
        }
        // Fallback: gerar avatar com iniciais do nome
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(message.senderName || 'User')}`
    }

    const formatTime = (timestamp: any): string => {
        if (!timestamp) return ''
        try {
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
            return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        } catch {
            return ''
        }
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
