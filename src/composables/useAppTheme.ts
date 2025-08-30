import { computed } from 'vue'
import { useTheme } from 'vuetify'

export function useAppTheme() {
  const theme = useTheme()
  const isDarkTheme = computed(() => theme.global.name.value === 'dark')
  return { theme, isDarkTheme }
}
