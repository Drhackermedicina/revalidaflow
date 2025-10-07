import { ref, onMounted, onUnmounted } from 'vue'
import { db } from '@/plugins/firebase'
import { collection, onSnapshot, query, where, limit, Unsubscribe } from 'firebase/firestore'

export interface ChatUser {
    uid: string
    nome?: string
    sobrenome?: string
    displayName?: string
    photoURL?: string
    avatar?: string
    status?: string
}

export const useChatUsers = () => {
    const users = ref<ChatUser[]>([])
    const loading = ref(true)
    const error = ref('')
    let unsubscribe: Unsubscribe | null = null

    const loadUsers = () => {
        const usersCollectionRef = collection(db, 'usuarios')
        const q = query(
            usersCollectionRef,
            where('status', 'in', ['disponivel', 'treinando']),
            limit(100)
        )

        unsubscribe = onSnapshot(q, (snapshot) => {
            users.value = snapshot.docs.map(doc => ({
                uid: doc.id,
                ...doc.data()
            } as ChatUser))
            loading.value = false
        }, (err) => {
            error.value = 'Erro ao buscar usuários: ' + err.message
            loading.value = false
        })
    }

    const getUserAvatar = (user: ChatUser, currentUserPhotoURL?: string) => {
        // Prioriza photoURL do Firestore/Google para todos os usuários
        if (user.photoURL) {
            return user.photoURL
        }
        // Fallback para avatar customizado
        if (user.avatar) {
            return user.avatar
        }
        // Último recurso: gerar avatar com iniciais
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(user.nome || user.displayName || 'User')}`
    }    onMounted(() => {
        loadUsers()
    })

    onUnmounted(() => {
        if (unsubscribe) {
            unsubscribe()
        }
    })

    return {
        users,
        loading,
        error,
        getUserAvatar
    }
}
