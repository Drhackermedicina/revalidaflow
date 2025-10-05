import { ref, watch } from 'vue'
import { currentUser } from '@/plugins/auth'
import { db } from '@/plugins/firebase'
import { doc, getDoc } from 'firebase/firestore'

/**
 * Composable para operações comuns do Firebase
 * Centraliza lógica de busca de dados do usuário
 */
export function useFirebaseData() {
  const loading = ref(true)
  const error = ref(null)
  const userData = ref(null)

  // Buscar dados do usuário atual
  const fetchUserData = async () => {
    if (!currentUser.value?.uid) {
      loading.value = false
      return
    }

    try {
      const userDoc = await getDoc(doc(db, 'usuarios', currentUser.value.uid))
      if (userDoc.exists()) {
        userData.value = userDoc.data()
      } else {
        error.value = 'Dados do usuário não encontrados'
      }
    } catch (err) {
      error.value = 'Erro ao carregar dados do usuário'
      console.error('Erro no fetchUserData:', err)
    } finally {
      loading.value = false
    }
  }

  // Buscar dados específicos do usuário
  const fetchUserField = async (field) => {
    if (!userData.value) await fetchUserData()
    return userData.value?.[field]
  }

  // Buscar estatísticas do usuário
  const fetchUserStats = async () => {
    if (!userData.value) await fetchUserData()
    return userData.value?.statistics || {}
  }

  // Buscar estações concluídas
  const fetchCompletedStations = async () => {
    if (!userData.value) await fetchUserData()
    return userData.value?.estacoesConcluidas || []
  }

  // Watch para mudanças no usuário
  watch(currentUser, (newUser) => {
    if (newUser?.uid) {
      fetchUserData()
    } else {
      userData.value = null
      loading.value = false
    }
  }, { immediate: true })

  return {
    loading,
    error,
    userData,
    fetchUserData,
    fetchUserField,
    fetchUserStats,
    fetchCompletedStations
  }
}