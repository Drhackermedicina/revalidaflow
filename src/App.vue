<template>
  <v-app>
    <GlobalLoader ref="globalLoaderRef" />
    <RouterView />
    <ChatNotificationFloat />

    <!-- Snackbar global -->
    <v-snackbar 
      v-model="snackbar.show" 
      :color="snackbar.color" 
      :timeout="snackbar.timeout || 4000"
    >
      {{ snackbar.text }}
    </v-snackbar>
  </v-app>
</template>

<script setup>
import { computed, onMounted, ref, getCurrentInstance } from 'vue'
import { RouterView } from 'vue-router'
import { currentUser, waitForAuth } from '@/plugins/auth'
import { usePrivateChatNotification } from '@/plugins/privateChatListener'
import { useNotificationStore } from '@/stores/notificationStore'
import { useUserStore } from '@/stores/userStore'
import ChatNotificationFloat from './components/ChatNotificationFloat.vue'
import GlobalLoader from './components/GlobalLoader.vue'
import { router } from '@/plugins/router'

// Stores
const userStore = useUserStore()
const notificationStore = useNotificationStore()

// Composable de gerenciamento de status
import { useUserStatusManager } from '@/composables/useUserStatusManager.js'

const {
  updateUserStatus,
  getDisplayStatus
} = useUserStatusManager()

// Computed
const snackbar = computed(() => notificationStore.snackbar)

// Inicializar notificações de chat
usePrivateChatNotification()

// Ref para o GlobalLoader
const globalLoaderRef = ref(null)

// Auth setup
onMounted(async () => {
  await waitForAuth()
  if (currentUser.value) {
    userStore.setUser(currentUser.value)
  }

  // Configurar referência do GlobalLoader em propriedades globais com fallback seguro
  if (globalLoaderRef.value) {
    try {
      const instance = getCurrentInstance()
      const app = instance?.appContext?.app
      if (app?.config?.globalProperties) {
        app.config.globalProperties.$globalLoader = globalLoaderRef.value
      }
    } catch {}

    // Sempre manter um fallback global
    window.globalLoaderRef = globalLoaderRef.value
  }
})
</script>
