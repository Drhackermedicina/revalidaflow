<template>
  <!-- O v-app é o container raiz de toda a aplicação Vuetify -->
  <v-app>
    <GlobalLoader />
    <!-- RouterView é onde os componentes das suas rotas (páginas) serão renderizados -->
    <RouterView />

    <!-- Aqui incluímos o componente personalizador. -->
    <!-- Ele será exibido em todas as páginas da sua aplicação. -->
    <ThemeCustomizer />
    
    <!-- Componente de notificação flutuante de chat privado -->
    <ChatNotificationFloat />
    
    <!-- Snackbar global -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="snackbar.timeout || 4000">
      {{ snackbar.text }}
    </v-snackbar>
  </v-app>
</template>

<script setup>
// ----------------------
// Imports de bibliotecas
// ----------------------
import { computed, onMounted } from 'vue'
import { RouterView } from 'vue-router'

// ----------------------
// Imports de plugins
// ----------------------
import { useUserStatus } from '@/composables/useUserStatus'
import { currentUser, waitForAuth } from '@/plugins/auth'
import { usePrivateChatNotification } from '@/plugins/privateChatListener'

// ----------------------
// Imports de stores
// ----------------------
import { useNotificationStore } from '@/stores/notificationStore'
import { useUserStore } from '@/stores/userStore'

// ----------------------
// Imports de componentes
// ----------------------
import ChatNotificationFloat from './components/ChatNotificationFloat.vue'
import GlobalLoader from './components/GlobalLoader.vue'
import ThemeCustomizer from './components/ThemeCustomizer.vue'

// ----------------------
// Instâncias de stores
// ----------------------
const userStore = useUserStore()
const notificationStore = useNotificationStore()

// ----------------------
// Computed properties
// ----------------------
const snackbar = computed(() => notificationStore.snackbar)

// ----------------------
// Instâncias de composables
// ----------------------
const { updateUserStatus, setStatusOffline } = useUserStatus()
const { startListener } = usePrivateChatNotification()

// ----------------------
// Lifecycle hooks
// ----------------------
onMounted(async () => {
  await waitForAuth()
  if (currentUser.value) {
    userStore.setUser(currentUser.value)
    startListener()
  }
})

// ----------------------
// Comentários explicativos
// ----------------------
// - Separação dos imports por tipo facilita manutenção.
// - Instâncias e computeds organizados por função.
// - Lógica de autenticação e listeners mantida simples.
// - Para maior segurança, considere migrar para TypeScript futuramente.
// - Para acessibilidade, revise componentes Vuetify quanto a ARIA e roles.
// - Para performance, avalie lazy-loading de componentes globais se necessário.
</script>

<style>
/* Estilos globais podem ser adicionados aqui */
/* Recomenda-se centralizar estilos globais em um arquivo dedicado, ex: src/styles/global.css */
</style>
