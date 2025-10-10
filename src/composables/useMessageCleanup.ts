import { onMounted, onUnmounted } from 'vue'
import { db } from '@/plugins/firebase'
import { collection, deleteDoc, getDocs, query, where } from 'firebase/firestore'

export const useMessageCleanup = () => {
    let cleanupInterval: ReturnType<typeof setInterval> | null = null

    // Função para limpar mensagens antigas (mais de 24 horas)
    const cleanOldMessages = async () => {
        try {
            // Calcular 24 horas atrás
            const now = new Date()
            const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000))

            // Buscar mensagens antigas
            const messagesRef = collection(db, 'chatMessages')
            const oldMessagesQuery = query(
                messagesRef,
                where('timestamp', '<', twentyFourHoursAgo)
            )

            const querySnapshot = await getDocs(oldMessagesQuery)

            if (querySnapshot.empty) {
                return
            }

            // Remover mensagens em lote
            const deletePromises: Promise<void>[] = []
            querySnapshot.forEach((doc) => {
                deletePromises.push(deleteDoc(doc.ref))
            })

            await Promise.all(deletePromises)
            console.log(`Limpeza automática: ${deletePromises.length} mensagens antigas removidas`)

        } catch (error) {
            console.error('Erro na limpeza automática de mensagens:', error)
            // Não lança erro para não interromper a aplicação
            // Em produção, poderia enviar para serviço de monitoring
        }
    }

    // Configurar limpeza automática a cada 24 horas
    const startAutoCleanup = () => {
        // Limpar interval anterior se existir
        if (cleanupInterval) {
            clearInterval(cleanupInterval)
        }

        // Executar limpeza imediatamente
        cleanOldMessages()

        // Configurar para executar a cada 24 horas (86400000 ms)
        cleanupInterval = setInterval(() => {
            cleanOldMessages()
        }, 24 * 60 * 60 * 1000)
    }

    const stopAutoCleanup = () => {
        if (cleanupInterval) {
            clearInterval(cleanupInterval)
            cleanupInterval = null
        }
    }

    onMounted(() => {
        startAutoCleanup()
    })

    onUnmounted(() => {
        stopAutoCleanup()
    })

    return {
        cleanOldMessages,
        startAutoCleanup,
        stopAutoCleanup
    }
}
