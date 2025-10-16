import { useUserStore } from '@/stores/userStore'

/**
 * Composable para verificação de permissões de admin
 * ATUALIZADO: Usa userStore role-based em vez de UIDs hardcoded
 * Migração P0-F03: Remoção de UIDs hardcoded
 */
export function useAdminAuth() {
  const {
    isAdmin,
    hasAdminRole,
    isAuthorizedAdmin,
    roleLoading,
    roleError
  } = useUserStore()

  return {
    isAdmin,
    hasAdminRole,
    isAuthorizedAdmin,
    isLoading: roleLoading,
    error: roleError
  }
}
