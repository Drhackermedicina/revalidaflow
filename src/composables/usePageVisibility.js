/**
 * usePageVisibility.js
 * 
 * Composable para detectar visibilidade da página
 * Usado para pausar automaticamente o status quando usuário minimiza ou muda de aba
 * 
 * @author REVALIDAFLOW Team
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'

export function usePageVisibility() {
  const isVisible = ref(true)

  // Mantemos a função nomeada para compatibilidade com referências legadas
  const onVisibilityChange = () => {
    isVisible.value = document.visibilityState === 'visible'
  }

  // Event listeners
  onMounted(() => {
    document.addEventListener('visibilitychange', onVisibilityChange)
  })

  onUnmounted(() => {
    document.removeEventListener('visibilitychange', onVisibilityChange)
  })

  return {
    isVisible: computed(() => isVisible.value),
    isHidden: computed(() => !isVisible.value),
    onVisibilityChange
  }
}
