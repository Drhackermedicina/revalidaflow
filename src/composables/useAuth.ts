import { currentUser } from '@/plugins/auth'
import { computed } from 'vue'

export function useAuth() {
  const user = computed(() => currentUser.value)
  const userName = computed(() => user.value?.displayName || 'Candidato')
  return { user, userName }
}
