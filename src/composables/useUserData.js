import { currentUser } from '@/plugins/auth'
import { db } from '@/plugins/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { computed, ref, watch } from 'vue'
import Logger from '@/utils/logger';
const logger = new Logger('useUserData');


export function useUserData() {
  const loading = ref(true)
  const error = ref(null)
  const userData = ref(null)

  // Computed para obter o UID do usuário atual
  const currentUserUid = computed(() => currentUser.value?.uid)

  // Função para carregar dados do usuário
  const loadUserData = async () => {
    if (!currentUserUid.value) {
      loading.value = false
      error.value = 'Usuário não autenticado'
      return
    }

    try {
      loading.value = true
      error.value = null

      const userDoc = await getDoc(doc(db, 'usuarios', currentUserUid.value))

      if (!userDoc.exists()) {
        error.value = 'Dados do usuário não encontrados'
        userData.value = null
      } else {
        userData.value = {
          uid: userDoc.id,
          ...userDoc.data()
        }
      }
    } catch (err) {
      logger.error('Erro ao carregar dados do usuário:', err)
      error.value = 'Erro ao carregar dados do usuário'
      userData.value = null
    } finally {
      loading.value = false
    }
  }

  // Watch para recarregar dados quando o usuário mudar
  watch(currentUser, (newUser) => {
    if (newUser?.uid) {
      loadUserData()
    } else {
      userData.value = null
      loading.value = false
      error.value = 'Usuário não autenticado'
    }
  }, { immediate: true })

  return {
    loading,
    error,
    userData,
    currentUserUid,
    loadUserData
  }
}