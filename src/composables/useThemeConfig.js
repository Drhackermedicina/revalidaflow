import { computed } from 'vue'
import { useTheme } from 'vuetify'

/**
 * Composable para configuração centralizada de tema
 * Reduz duplicação de código entre páginas do candidato
 */
export function useThemeConfig() {
  const theme = useTheme()

  // Computed para detectar tema escuro
  const isDarkTheme = computed(() => theme.global.name.value === 'dark')

  // Classes CSS dinâmicas para tema
  const themeClasses = computed(() => ({
    container: isDarkTheme.value ? 'container--dark' : 'container--light',
    card: isDarkTheme.value ? 'card--dark' : 'card--light',
    loading: isDarkTheme.value ? 'loading--dark' : 'loading--light',
    table: isDarkTheme.value ? 'table--dark' : 'table--light'
  }))

  // Cores dinâmicas baseadas no tema
  const themeColors = computed(() => ({
    primary: `rgb(var(--v-theme-primary))`,
    surface: `rgb(var(--v-theme-surface))`,
    'on-surface': `rgb(var(--v-theme-on-surface))`,
    'surface-variant': `rgb(var(--v-theme-surface-variant))`,
    outline: `rgb(var(--v-theme-outline))`
  }))

  return {
    isDarkTheme,
    themeClasses,
    themeColors,
    theme
  }
}