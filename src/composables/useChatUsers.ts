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
  status?: 'disponivel' | 'treinando' | 'ausente'
  lastActive?: any
}

export const useChatUsers = () => {
  const users = ref<ChatUser[]>([])
  const loading = ref(true)
  const error = ref('')
  let unsubscribe: Unsubscribe | null = null

  const loadUsers = () => {
    const usersCollectionRef = collection(db, 'usuarios')

    // Buscar usuários com qualquer status ativo
    const q = query(
      usersCollectionRef,
      where('status', 'in', ['disponivel', 'treinando', 'ausente']),
      limit(100)
    )

    unsubscribe = onSnapshot(q, (snapshot) => {
      const allUsers = snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      } as ChatUser))

      // Filtra por status e atualiza status baseado no tempo de inatividade
      const now = Date.now()
      const twoMinutesAgo = now - 2 * 60 * 1000

      users.value = allUsers
        .filter(user => user.status !== 'offline') // Remove usuários offline
        .map(user => {
          const lastActive = user.lastActive ? new Date(user.lastActive).getTime() : 0
          let updatedStatus = user.status

          if (lastActive < twoMinutesAgo && user.status !== 'offline') {
            updatedStatus = 'ausente'
          }

          return {
            ...user,
            status: updatedStatus,
            displayName: user.displayName || 'Usuário sem nome'
          }
        })

      loading.value = false
    }, (err) => {
      error.value = 'Erro ao buscar usuários: ' + err.message
      loading.value = false
    })
  }

  const getUserAvatar = (user: ChatUser) => {
    // Usar photoURL se disponível
    if (user.photoURL) {
      return user.photoURL
    }

    // Fallback para avatar customizado
    if (user.avatar) {
      return user.avatar
    }

    // Último recurso: gerar avatar com iniciais
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(user.nome || user.displayName || 'User')}`
  }

  onMounted(() => {
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
