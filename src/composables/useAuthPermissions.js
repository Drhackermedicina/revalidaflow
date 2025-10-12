import { ref, computed } from 'vue'
import { currentUser } from '@/plugins/auth'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/plugins/firebase'
import Logger from '@/utils/logger';
const logger = new Logger('useAuthPermissions');


/**
 * @typedef {Object} UserRole
 * @property {boolean} isAdmin
 * @property {boolean} isModerator
 * @property {boolean} canDeleteMessages
 * @property {boolean} canManageUsers
 */

export const useAuthPermissions = () => {
  const userRole = ref({
    isAdmin: false,
    isModerator: false,
    canDeleteMessages: false,
    canManageUsers: false
  })
  const loading = ref(false)
  const error = ref('')

  // Lista de administradores (em produção, viria do Firestore)
  const ADMIN_UIDS = [
    'KiSITAxXMAY5uU3bOPW5JMQPent2' // Admin atual
    // Adicionar outros UIDs de admin conforme necessário
  ]

  const checkUserPermissions = async () => {
    if (!currentUser.value?.uid) {
      userRole.value = {
        isAdmin: false,
        isModerator: false,
        canDeleteMessages: false,
        canManageUsers: false
      }
      return
    }

    loading.value = true
    error.value = ''

    try {
      // Verificar se é admin via lista hardcoded (transição)
      const isAdminByList = ADMIN_UIDS.includes(currentUser.value.uid)

      // Buscar permissões do Firestore (futuro)
      const userDocRef = doc(db, 'usuarios', currentUser.value.uid)
      const userDoc = await getDoc(userDocRef)
      
      const userData = userDoc.data()
      const isAdminByRole = userData?.role === 'admin'
      const isModerator = userData?.role === 'moderator'

      // Combinar todas as verificações
      userRole.value = {
        isAdmin: isAdminByList || isAdminByRole,
        isModerator: isModerator || isAdminByList || isAdminByRole,
        canDeleteMessages: isAdminByList || isAdminByRole || isModerator,
        canManageUsers: isAdminByList || isAdminByRole
      }

    } catch (err) {
      error.value = 'Erro ao verificar permissões do usuário'
      logger.error('Erro ao verificar permissões:', err)
      
      // Em caso de erro, apenas verifica via lista hardcoded
      const isAdminByList = ADMIN_UIDS.includes(currentUser.value.uid || '')
      userRole.value = {
        isAdmin: isAdminByList,
        isModerator: isAdminByList,
        canDeleteMessages: isAdminByList,
        canManageUsers: isAdminByList
      }
    } finally {
      loading.value = false
    }
  }

  // Computed properties para fácil uso
  const isAdmin = computed(() => userRole.value.isAdmin)
  const isModerator = computed(() => userRole.value.isModerator)
  const canDeleteMessages = computed(() => userRole.value.canDeleteMessages)
  const canManageUsers = computed(() => userRole.value.canManageUsers)

  return {
    userRole,
    loading,
    error,
    isAdmin,
    isModerator,
    canDeleteMessages,
    canManageUsers,
    checkUserPermissions
  }
}
