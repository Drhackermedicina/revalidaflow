import { useUserStore } from '@/stores/userStore'
import { computed } from 'vue'

/**
 * Composable para verificação de permissões de admin
 * ATUALIZADO: Usa userStore role-based em vez de UIDs hardcoded
 * Migração P0-F03: Remoção de UIDs hardcoded
 */
export function useAdminAuth() {
  const {
    isAdmin,
    canAccessAdminPanel,
    roleLoading,
    roleError
  } = useUserStore()

  // isAuthorizedAdmin: combinação de role admin + permissão de acesso ao painel
  const isAuthorizedAdmin = computed(() => isAdmin.value && canAccessAdminPanel.value)
  const hasAdminRole = computed(() => isAdmin.value)

  return {
    isAdmin,
    hasAdminRole,
    isAuthorizedAdmin,
    isLoading: roleLoading,
    error: roleError
  }
}
