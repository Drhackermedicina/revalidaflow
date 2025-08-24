// src/composables/useUserStatus.js
import { currentUser } from '@/plugins/auth'
import { db } from '@/plugins/firebase'
import { doc, updateDoc } from 'firebase/firestore'
import { onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'

export function useUserStatus() {
  const route = useRoute()
  let statusInterval = null

  const STATUS = {
    DISPONIVEL: 'disponivel',
    TREINANDO: 'treinando',
    OFFLINE: 'offline'
  }

  const getStatus = () => {
    if (route.path.startsWith('/app/simulation') || route.path.includes('/simulate')) {
      return STATUS.TREINANDO
    }
    return STATUS.DISPONIVEL
  }

  const updateUserStatus = async () => {
    const uid = currentUser.value?.uid
    if (!uid) return
    try {
      const userRef = doc(db, 'usuarios', uid)
      await updateDoc(userRef, { status: getStatus() })
    } catch (err) {
      console.error('Erro ao atualizar status:', err)
    }
  }

  const setStatusOffline = async () => {
    const uid = currentUser.value?.uid
    if (!uid) return
    try {
      const userRef = doc(db, 'usuarios', uid)
      await updateDoc(userRef, { status: STATUS.OFFLINE })
    } catch (err) {
      console.error('Erro ao enviar status OFFLINE:', err)
    }
  }

  onMounted(() => {
    updateUserStatus()
    statusInterval = setInterval(updateUserStatus, 30000)
    window.addEventListener('beforeunload', setStatusOffline)
  })

  onUnmounted(() => {
    if (statusInterval) clearInterval(statusInterval)
    window.removeEventListener('beforeunload', setStatusOffline)
  })

  watch(currentUser, updateUserStatus)
  watch(() => route.fullPath, updateUserStatus)

  return { updateUserStatus, setStatusOffline }
}
