import { ref, onMounted, onUnmounted, computed, shallowRef } from 'vue'
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
  const users = shallowRef<ChatUser[]>([])
  const loading = ref(true)
  const error = ref('')
  let unsubscribe: Unsubscribe | null = null

  // Cache para avatares carregados (economiza requisições repetidas)
  const avatarCache = new Map<string, string>()
  const failedImages = new Set<string>() // Cache de imagens que falharam

  const loadUsers = () => {
    const usersCollectionRef = collection(db, 'usuarios')
    const q = query(
      usersCollectionRef,
      where('status', 'in', ['disponivel', 'treinando']),
      limit(100)
    )

    unsubscribe = onSnapshot(q, (snapshot) => {
      const newUsers = snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      } as ChatUser))
      
      // Apenas atualiza se houver mudanças reais (economiza renders)
      if (JSON.stringify(users.value) !== JSON.stringify(newUsers)) {
        users.value = newUsers
      }
      loading.value = false
    }, (err) => {
      error.value = 'Erro ao buscar usuários: ' + err.message
      loading.value = false
    })
  }

  const getUserAvatar = (user: ChatUser, currentUserPhotoURL?: string) => {
    // Chave única para cache baseada no usuário
    const cacheKey = user.uid
    
    // Verificar cache primeiro (economiza requisições)
    if (avatarCache.has(cacheKey)) {
      return avatarCache.get(cacheKey)
    }
    
    // Se imagem já falhou antes, usar fallback imediatamente
    if (failedImages.has(cacheKey)) {
      const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.nome || user.displayName || 'User')}&background=7b1fa2&color=fff`
      avatarCache.set(cacheKey, fallbackUrl)
      return fallbackUrl
    }
    
    let avatarUrl: string
    
    // Prioriza photoURL do Firestore/Google para todos os usuários
    if (user.photoURL) {
      avatarUrl = user.photoURL
    }
    // Fallback para avatar customizado
    else if (user.avatar) {
      avatarUrl = user.avatar
    }
    // Último recurso: gerar avatar com iniciais
    else {
      avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.nome || user.displayName || 'User')}&background=7b1fa2&color=fff`
    }
    
    // Pré-carregar imagem para detectar falhas
    const img = new Image()
    img.onload = () => {
      avatarCache.set(cacheKey, avatarUrl)
    }
    img.onerror = () => {
      failedImages.add(cacheKey)
      const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.nome || user.displayName || 'User')}&background=7b1fa2&color=fff`
      avatarCache.set(cacheKey, fallbackUrl)
    }
    img.src = avatarUrl
    
    return avatarUrl
  }

  // Computed memoizado para otimizar renders
const usersCount = computed(() => users.value.length)
const availableUsers = computed(() => 
  users.value.filter(user => user.status === 'disponivel')
)
const trainingUsers = computed(() => 
  users.value.filter(user => user.status === 'treinando')
)

  onMounted(() => {
    loadUsers()
  })

  onUnmounted(() => {
    if (unsubscribe) {
      unsubscribe()
    }
    // Limpar caches para liberar memória
    avatarCache.clear()
    failedImages.clear()
  })

  return {
    users,
    loading,
    error,
    getUserAvatar,
    usersCount,
    availableUsers,
    trainingUsers
  }
}
