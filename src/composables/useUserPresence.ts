import { ref, onMounted, onUnmounted } from 'vue'
import { db } from '@/plugins/firebase'
import { doc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore'

/**
 * Composable para gerenciar presença/status de usuário em tempo real
 * 
 * ✅ Atualiza status para 'disponivel' ao entrar
 * ✅ Marca como 'ausente' após 30 minutos de inatividade
 * ✅ Marca como 'ausente' ao sair/fechar navegador
 * ✅ Monitora atividade do usuário (mouse, teclado, touch)
 * ✅ Otimizado: apenas 2-3 writes por sessão
 */
export const useUserPresence = (currentUser: any) => {
  const lastActivityTime = ref(Date.now())
  const currentStatus = ref<'disponivel' | 'ausente' | 'treinando'>('disponivel')
  const isInitialized = ref(false)
  const lastUpdateTime = ref(Date.now()) // ✅ NOVO: Controla quando foi a última atualização do DB

  let activityCheckInterval: ReturnType<typeof setInterval> | null = null
  let activityTimeout: ReturnType<typeof setTimeout> | null = null

  const INACTIVITY_THRESHOLD = 15 * 60 * 1000 // 15 minutos
  const CHECK_INTERVAL = 5 * 60 * 1000 // Verificar a cada 5 minutos
  const UPDATE_INTERVAL = 5 * 60 * 1000 // ✅ NOVO: Atualizar lastActive a cada 5 minutos
  const ACTIVITY_DEBOUNCE = 5000 // 5 segundos

  /**
   * Atualiza status do usuário no Firestore
   */
  const updateUserStatus = async (status: 'disponivel' | 'ausente' | 'treinando', force = false) => {
    if (!currentUser?.value?.uid) return

    // Evita writes duplicados
    if (currentStatus.value === status && !force) {
      console.log(`⏭️ Status já é '${status}', pulando write`)
      return
    }

    try {
      const userRef = doc(db, 'usuarios', currentUser.value.uid)
      const updateData: any = {
        status,
        lastActive: serverTimestamp()
      }

      // Adiciona photoURL apenas na primeira vez
      if (!isInitialized.value && currentUser.value.photoURL) {
        updateData.photoURL = currentUser.value.photoURL
        updateData.displayName = currentUser.value.displayName || currentUser.value.email
        isInitialized.value = true
      }

      await updateDoc(userRef, updateData)
      currentStatus.value = status

      const writes = isInitialized.value ? '1 write' : '1 write (+ photoURL)'
      console.log(`✅ Status atualizado: ${status} | Custo: ${writes}`)
    } catch (error) {
      console.error('❌ Erro ao atualizar status:', error)
    }
  }

  /**
   * Registra atividade do usuário
   */
  const recordActivity = () => {
    const now = Date.now()
    lastActivityTime.value = now

    // Se estava ausente, volta para disponível (1 write)
    if (currentStatus.value === 'ausente') {
      console.log('🔄 Usuário voltou da ausência')
      updateUserStatus('disponivel')
      lastUpdateTime.value = now
      return
    }

    // ✅ NOVO: Atualiza lastActive no DB a cada 5 minutos (mas só se ativo)
    const timeSinceLastUpdate = now - lastUpdateTime.value
    if (timeSinceLastUpdate > UPDATE_INTERVAL) {
      console.log('⏱️ Atualizando lastActive (5 minutos desde última atualização)')
      updateUserStatus('disponivel', true) // Force update para atualizar lastActive
      lastUpdateTime.value = now
    }
  }

  /**
   * Verifica se usuário está inativo há mais de 30 minutos
   */
  const checkInactivity = () => {
    const now = Date.now()
    const timeSinceLastActivity = now - lastActivityTime.value

    if (timeSinceLastActivity >= INACTIVITY_THRESHOLD && currentStatus.value !== 'ausente') {
      console.log(`⏰ Usuário inativo por ${Math.floor(timeSinceLastActivity / 60000)} minutos → marcando como ausente`)
      updateUserStatus('ausente')
    }
  }

  /**
   * Configura listeners de atividade
   */
  const setupActivityListeners = () => {
    // Eventos que indicam atividade
    const events = ['mousedown', 'keydown', 'click', 'touchstart', 'scroll']

    events.forEach(event => {
      window.addEventListener(event, recordActivity, { passive: true })
    })

    // Verifica inatividade periodicamente
    activityCheckInterval = setInterval(checkInactivity, CHECK_INTERVAL)

    // Define status inicial como 'disponivel'
    updateUserStatus('disponivel', true)
  }

  /**
   * Remove listeners de atividade
   */
  const cleanupActivityListeners = async () => {
    const events = ['mousedown', 'keydown', 'click', 'touchstart', 'scroll']

    events.forEach(event => {
      window.removeEventListener(event, recordActivity)
    })

    if (activityCheckInterval) {
      clearInterval(activityCheckInterval)
      activityCheckInterval = null
    }

    if (activityTimeout) {
      clearTimeout(activityTimeout)
      activityTimeout = null
    }

    // Marca como ausente ao sair (1 write final)
    if (currentUser?.value?.uid && currentStatus.value !== 'ausente') {
      await updateUserStatus('ausente')
    }
  }

  onMounted(() => {
    if (currentUser?.value?.uid) {
      setupActivityListeners()
    }
  })

  onUnmounted(() => {
    cleanupActivityListeners()
  })

  return {
    currentStatus,
    updateUserStatus,
    recordActivity,
    lastActivityTime
  }
}
