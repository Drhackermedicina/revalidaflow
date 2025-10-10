<template>
  <v-app>
    <GlobalLoader />
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
import { computed, onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { currentUser, waitForAuth } from '@/plugins/auth'
import { usePrivateChatNotification } from '@/plugins/privateChatListener'
import { useNotificationStore } from '@/stores/notificationStore'
import { useUserStore } from '@/stores/userStore'
import ChatNotificationFloat from './components/ChatNotificationFloat.vue'
import GlobalLoader from './components/GlobalLoader.vue'

// Stores
const userStore = useUserStore()
const notificationStore = useNotificationStore()

// Computed
const snackbar = computed(() => notificationStore.snackbar)

// Inicializar notificações de chat
usePrivateChatNotification()

// Auth setup
onMounted(async () => {
  await waitForAuth()
  if (currentUser.value) {
    userStore.setUser(currentUser.value)
  }
})
</script>
