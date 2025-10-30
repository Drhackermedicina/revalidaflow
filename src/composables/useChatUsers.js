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
 * @property {'disponivel'|'ausente'|'treinando'|'treinando_com_ia'} [status]
 * @property {any} [lastActive]
 */

const AUSENTE_THRESHOLD_MS = 10 * 60 * 1000
const OFFLINE_FALLBACK_THRESHOLD_MS = 20 * 60 * 1000

const getLastActiveMs = (value) => {
  if (!value) return 0
  if (typeof value.toDate === 'function') {
    return value.toDate().getTime()
  }
  if (value instanceof Date) {
    return value.getTime()
  }
  return new Date(value).getTime()
}

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
      where('status', 'in', ['disponivel', 'treinando', 'treinando_com_ia', 'ausente']),
      limit(pageSize)
    )

    unsubscribe = onSnapshot(q, (snapshot) => {
      const allUsers = snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      }))

      // Filtra por status e atualiza status baseado no tempo de inatividade
      const now = Date.now()
      const awayThreshold = now - AUSENTE_THRESHOLD_MS
      const offlineFallbackThreshold = now - OFFLINE_FALLBACK_THRESHOLD_MS

      const enrichedUsers = allUsers.map(user => {
        const lastActiveMs = getLastActiveMs(user.lastActive)
        return {
          raw: user,
          lastActiveMs
        }
      })

      users.value = enrichedUsers
        .filter(({ raw, lastActiveMs }) => {
          if (raw.status === 'offline' || raw.isOnline === false) return false
          if (!lastActiveMs) return false
          if (lastActiveMs < offlineFallbackThreshold) return false
          return true
        })
        .map(({ raw, lastActiveMs }) => {
          let updatedStatus = raw.status

          // Mantém status "treinando" e "treinando_com_ia" se já estiver definido
          if (raw.status !== 'treinando' && raw.status !== 'treinando_com_ia') {
            if (lastActiveMs < awayThreshold) {
              updatedStatus = 'ausente'
            } else if (raw.status !== 'disponivel') {
              updatedStatus = 'disponivel'
            }
          }

          return {
            ...raw,
            status: updatedStatus,
            displayName: raw.displayName || [raw.nome, raw.sobrenome].filter(Boolean).join(' ') || 'Usuário sem nome',
            lastActive: raw.lastActive,
            lastActiveMs
          }
        })
        .sort((a, b) => b.lastActiveMs - a.lastActiveMs)
        .map(({ lastActiveMs: _lastActiveMs, ...rest }) => rest)

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
      if (user.photoUrl) {
        return user.photoUrl
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
