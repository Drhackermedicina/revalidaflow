import { computed } from 'vue'
import { useUserStore } from '@/stores/userStore'

/**
 * @typedef {Object} UserRole
 * @property {boolean} isAdmin
 * @property {boolean} isModerator
 * @property {boolean} canDeleteMessages
 * @property {boolean} canManageUsers
 */

/**
 * Composable para verificação de permissões de usuário
 * ATUALIZADO: Usa userStore role-based em vez de UIDs hardcoded
 * Migração P0-F03: Remoção de UIDs hardcoded
 */
export const useAuthPermissions = () => {
  const {
    role,
    permissions,
    roleLoading: loading,
    roleError: error,
    isAdmin,
    isModerator,
    canDeleteMessages,
    canManageUsers,
    canEditStations,
    canViewAnalytics,
    canManageRoles,
    canAccessAdminPanel
  } = useUserStore()

  // Computed properties para manter compatibilidade com código existente
  const userRole = computed(() => ({
    isAdmin: isAdmin.value,
    isModerator: isModerator.value,
    canDeleteMessages: canDeleteMessages.value,
    canManageUsers: canManageUsers.value,
    canEditStations: canEditStations.value,
    canViewAnalytics: canViewAnalytics.value,
    canManageRoles: canManageRoles.value,
    canAccessAdminPanel: canAccessAdminPanel.value
  }))

  return {
    userRole,
    loading,
    error,
    isAdmin,
    isModerator,
    canDeleteMessages,
    canManageUsers,
    canEditStations,
    canViewAnalytics,
    canManageRoles,
    canAccessAdminPanel,
    role,
    permissions
  }
}
