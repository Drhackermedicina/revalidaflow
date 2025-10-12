import { ref, onMounted, onUnmounted } from 'vue'
import { db } from '@/plugins/firebase'
import { collection, onSnapshot, query, where, limit } from 'firebase/firestore'
import Logger from '@/utils/logger';
const logger = new Logger('useChatUsers');


/**
 * @typedef {Object} ChatUser
 * @property {string} uid
 * @property {string} [nome]
 * @property {string} [sobrenome]
 * @property {string} [displayName]
 * @property {string} [photoURL]
 * @property {string} [avatar]
 * @property {'disponivel'|'treinando'|'ausente'} [status]
 * @property {any} [lastActive]
 */

export const useChatUsers = () => {
  const users = ref([])
  const loading = ref(true)
  const error = ref('')
  const hasMoreUsers = ref(true)
  let unsubscribe = null
  const pageSize = 50

  const loadUsers = (_loadMore = false) => {
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
      }))

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
      logger.error('Erro ao carregar usuários do chat:', err)
      error.value = 'Erro ao carregar usuários. Tente novamente mais tarde.'
      loading.value = false
    })
  }

  const getUserAvatar = (user) => {
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
      logger.error('Erro ao gerar avatar:', error)
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
  const searchUsers = (searchTerm) => {
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
