<template>
  <VCard
    :class="[
      'chat-card',
      isDarkTheme ? 'chat-card--dark' : 'chat-card--light'
    ]"
    elevation="3"
  >
    <VCardTitle class="d-flex align-center pa-3">
      <VIcon icon="ri-chat-3-line" color="secondary" size="24" class="me-2" />
      <span class="text-subtitle-1 font-weight-bold">Chat Rápido</span>
      <VSpacer />
      <VBadge
        v-if="onlineCount > 0"
        :content="onlineCount"
        color="success"
        inline
      />
    </VCardTitle>

    <VDivider />

    <VCardText class="pa-4">
      <p class="text-body-2 text-medium-emphasis mb-4">
        {{ onlineCount }} {{ onlineCount === 1 ? 'pessoa online' : 'pessoas online' }}
      </p>

      <!-- Botão para abrir chat -->
      <VBtn
        color="secondary"
        variant="elevated"
        block
        size="default"
        @click="goToChat"
      >
        <VIcon icon="ri-message-2-line" class="me-2" size="18" />
        Abrir Chat em Grupo
      </VBtn>

      <!-- Espaçador flexível -->
      <div class="flex-grow-1"></div>

      <!-- Usuários online (preview) -->
      <div v-if="onlineUsers.length > 0" class="mt-4">
        <div class="text-caption text-medium-emphasis mb-3">Online agora:</div>
        <div class="d-flex align-center gap-2">
          <VAvatar
            v-for="(user, index) in onlineUsers.slice(0, 5)"
            :key="user.uid"
            :image="user.photoURL || undefined"
            :icon="!user.photoURL ? 'ri-user-line' : undefined"
            size="36"
            :color="!user.photoURL ? 'secondary' : undefined"
            :style="{ marginLeft: index > 0 ? '-8px' : '0' }"
            class="online-avatar elevation-2"
          />
          <span v-if="onlineUsers.length > 5" class="text-caption text-medium-emphasis ms-2">
            +{{ onlineUsers.length - 5 }}
          </span>
        </div>
      </div>
    </VCardText>
  </VCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useTheme } from 'vuetify'
import { useChatUsers } from '@/composables/useChatUsers'

const router = useRouter()
const theme = useTheme()

// Composable para usuários do chat
const { users: onlineUsers } = useChatUsers()

// Tema
const isDarkTheme = computed(() => theme.global.name.value === 'dark')

// Contador de usuários online
const onlineCount = computed(() => onlineUsers.value.length)

// Navegação
const goToChat = () => {
  router.push('/app/chat-group')
}
</script>

<style scoped>
/* ========== CARD BASE ========== */
.chat-card {
  border-radius: 18px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.chat-card .v-card-text {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.chat-card--light {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-outline), 0.12);
}

.chat-card--dark {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-outline), 0.24);
}

.chat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(var(--v-theme-secondary), 0.15) !important;
}

/* ========== AVATARES ONLINE ========== */
.online-avatar {
  border: 2px solid rgb(var(--v-theme-surface));
  transition: transform 0.2s ease;
}

.online-avatar:hover {
  transform: scale(1.1);
  z-index: 10;
}

/* ========== ANIMAÇÃO ========== */
.chat-card {
  animation: fadeSlideIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.1s backwards;
}

@keyframes fadeSlideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
