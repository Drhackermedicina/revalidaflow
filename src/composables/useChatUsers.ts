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
  const hasMoreUsers = ref(true)
  let unsubscribe: Unsubscribe | null = null
  const pageSize = 50

  const loadUsers = (loadMore = false) => {
    const usersCollectionRef = collection(db, 'usuarios')

    // Buscar usuários com qualquer status ativo
    const q = query(
      usersCollectionRef,
      where('status', 'in', ['disponivel', 'treinando', 'ausente']),
      limit(pageSize)
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
      console.error('Erro ao carregar usuários do chat:', err)
      error.value = 'Erro ao carregar usuários. Tente novamente mais tarde.'
      loading.value = false
    })
  }

  const getUserAvatar = (user: ChatUser) => {
    try {
      // Usar photoURL se disponível
      if (user.photoURL) {
        return user.photoURL
      }

      // Fallback para avatar customizado
      if (user.avatar) {
        return user.avatar
      }

      // Padronizar nome para avatar
      const displayName = user.nome && user.sobrenome 
        ? `${user.nome} ${user.sobrenome}`
        : user.displayName || 'User'

      // Último recurso: gerar avatar com iniciais
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}`
    } catch (error) {
      console.error('Erro ao gerar avatar:', error)
      // Avatar padrão em caso de erro
      return 'https://ui-avatars.com/api/?name=User&background=6c757d&color=fff'
    }
  }

  onMounted(() => {
    loadUsers()
  })

  onUnmounted(() => {
    if (unsubscribe) {
      unsubscribe()
    }
  })

  // Função de busca de usuários
  const searchUsers = (searchTerm: string) => {
    if (!searchTerm.trim()) return users.value
    
    const term = searchTerm.toLowerCase().trim()
    return users.value.filter(user => {
      const fullName = user.nome && user.sobrenome 
        ? `${user.nome} ${user.sobrenome}`.toLowerCase()
        : (user.displayName || '').toLowerCase()
      
      return fullName.includes(term)
    })
  }

  return {
    users,
    loading,
    error,
    hasMoreUsers,
    getUserAvatar,
    searchUsers
  }
}
