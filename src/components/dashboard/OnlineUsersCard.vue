<template>
  <VCard
    :class="[
      'online-users-card',
      isDarkTheme ? 'online-users-card--dark' : 'online-users-card--light'
    ]"
    elevation="3"
  >
    <VCardTitle class="d-flex align-center pa-4">
      <VIcon icon="ri-group-line" color="primary" size="24" class="me-2" />
      <span class="text-h6 font-weight-bold">Usuários Online</span>
      <VSpacer />
      <VChip
        v-if="users.length > 0"
        color="success"
        variant="elevated"
        size="small"
        class="online-count-badge"
      >
        <VIcon icon="ri-checkbox-blank-circle-fill" size="10" class="me-1 pulse-dot" />
        {{ users.length }}
      </VChip>
    </VCardTitle>

    <VDivider />

    <VCardText class="pa-0">
      <!-- Loading State -->
      <div v-if="loading" class="d-flex justify-center align-center py-6">
        <VProgressCircular indeterminate color="primary" size="32" />
        <span class="ms-3 text-medium-emphasis">Carregando...</span>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="d-flex justify-center align-center py-6">
        <VIcon icon="ri-error-warning-line" color="error" size="28" class="me-2" />
        <span class="text-error">{{ error }}</span>
      </div>

      <!-- Empty State -->
      <div v-else-if="users.length === 0" class="d-flex flex-column justify-center align-center py-6">
        <VIcon icon="ri-user-unfollow-line" color="grey" size="48" class="mb-2" />
        <span class="text-medium-emphasis">Nenhum usuário online no momento</span>
      </div>

      <!-- Users List -->
      <VList v-else class="online-users-list py-2">
        <VListItem
          v-for="user in displayedUsers"
          :key="user.uid"
          :class="[
            'online-user-item',
            { 'current-user': user.uid === currentUserId }
          ]"
          @click="openChat(user)"
        >
          <template #prepend>
            <VBadge
              :color="getStatusColor(user.status)"
              dot
              location="bottom right"
              offset-x="3"
              offset-y="3"
              :class="user.status === 'disponivel' ? 'pulse-badge' : ''"
            >
              <VAvatar
                :image="getUserAvatar(user) || undefined"
                :icon="!getUserAvatar(user) ? 'ri-user-line' : undefined"
                :color="!getUserAvatar(user) ? 'primary' : undefined"
                size="40"
                class="user-avatar elevation-2"
              />
            </VBadge>
          </template>

          <VListItemTitle class="font-weight-medium user-name">
            {{ getUserName(user) }}
          </VListItemTitle>
          
          <VListItemSubtitle class="text-caption">
            <VChip
              :color="getStatusColor(user.status)"
              variant="flat"
              size="x-small"
              class="status-chip"
            >
              {{ getStatusText(user.status) }}
            </VChip>
          </VListItemSubtitle>

          <template #append>
            <VBtn
              icon
              variant="text"
              size="x-small"
              color="primary"
              @click.stop="openChat(user)"
            >
              <VIcon icon="ri-message-3-line" size="18" />
            </VBtn>
          </template>
        </VListItem>
      </VList>
    </VCardText>

    <VDivider v-if="users.length > 0" />

    <!-- Footer Button -->
    <VCardActions v-if="users.length > 0" class="pa-4">
      <VBtn
        color="primary"
        variant="outlined"
        block
        size="default"
        @click="goToChat"
        class="chat-btn"
      >
        <VIcon icon="ri-wechat-line" class="me-2" size="18" />
        {{ users.length > maxDisplay ? `Ver Todos (${users.length})` : 'Abrir Chat em Grupo' }}
      </VBtn>
    </VCardActions>
  </VCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useTheme } from 'vuetify'
import { currentUser } from '@/plugins/auth'
import { useChatUsers, type ChatUser } from '@/composables/useChatUsers'

const router = useRouter()
const theme = useTheme()

// Reutilizando composable existente
const { users, loading, error, getUserAvatar } = useChatUsers()

// Props
const maxDisplay = 5

// Tema
const isDarkTheme = computed(() => theme.global.name.value === 'dark')

// ID do usuário atual
const currentUserId = computed(() => currentUser.value?.uid || '')

// Usuários a exibir (primeiros 5)
const displayedUsers = computed(() => users.value.slice(0, maxDisplay))

// Helpers
const getUserName = (user: ChatUser): string => {
  if (user.nome && user.sobrenome) {
    return `${user.nome} ${user.sobrenome}`
  }
  if (user.nome) return user.nome
  return user.displayName || 'Usuário'
}

const getStatusColor = (status?: string): string => {
  switch (status) {
    case 'disponivel':
      return 'success'
    case 'treinando':
      return 'info'
    case 'ausente':
      return 'warning'
    default:
      return 'grey'
  }
}

const getStatusText = (status?: string): string => {
  switch (status) {
    case 'disponivel':
      return 'Disponível'
    case 'treinando':
      return 'Treinando'
    case 'ausente':
      return 'Ausente'
    default:
      return 'Offline'
  }
}

// Navegação
const goToChat = () => {
  router.push('/app/chat-group')
}

const openChat = (user: ChatUser) => {
  if (user.uid === currentUserId.value) return
  router.push({ name: 'ChatPrivateView', params: { uid: user.uid } })
}
</script>

<style scoped>
/* ========== CARD BASE ========== */
.online-users-card {
  border-radius: 18px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  height: 100%;
}

.online-users-card--light {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-outline), 0.12);
}

.online-users-card--dark {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-outline), 0.24);
}

.online-users-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(var(--v-theme-primary), 0.15) !important;
}

/* ========== BADGE ========== */
.online-count-badge {
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(var(--v-theme-success), 0.25);
}

.pulse-dot {
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.pulse-badge :deep(.v-badge__badge) {
  animation: pulse-badge 2s ease-in-out infinite;
}

@keyframes pulse-badge {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.8;
  }
}

/* ========== USERS LIST ========== */
.online-users-list {
  max-height: 320px;
  overflow-y: auto;
  background: transparent;
}

.online-user-item {
  border-radius: 12px;
  margin: 4px 8px;
  padding: 8px 12px;
  transition: all 0.2s ease;
  cursor: pointer;
}

.online-user-item:hover {
  background: rgba(var(--v-theme-primary), 0.08);
  transform: translateX(4px);
}

.current-user {
  background: linear-gradient(90deg, rgba(var(--v-theme-primary), 0.1) 0%, rgba(var(--v-theme-secondary), 0.1) 100%);
  border: 1px solid rgba(var(--v-theme-primary), 0.3);
  pointer-events: none;
  opacity: 0.8;
}

/* ========== AVATAR ========== */
.user-avatar {
  border: 2px solid rgba(var(--v-theme-primary), 0.3);
  transition: all 0.2s ease;
}

.online-user-item:hover .user-avatar {
  border-color: rgb(var(--v-theme-primary));
  transform: scale(1.05);
}

/* ========== USER INFO ========== */
.user-name {
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.9rem;
}

.status-chip {
  font-size: 0.7rem;
  font-weight: 600;
  height: 18px;
  padding: 0 6px;
}

/* ========== FOOTER BUTTON ========== */
.chat-btn {
  font-weight: 600;
  text-transform: none;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.chat-btn:hover {
  background: rgba(var(--v-theme-primary), 0.08);
  transform: scale(1.02);
}

/* ========== SCROLLBAR ========== */
.online-users-list::-webkit-scrollbar {
  width: 6px;
}

.online-users-list::-webkit-scrollbar-track {
  background: transparent;
}

.online-users-list::-webkit-scrollbar-thumb {
  background: rgba(var(--v-theme-primary), 0.3);
  border-radius: 3px;
}

.online-users-list::-webkit-scrollbar-thumb:hover {
  background: rgba(var(--v-theme-primary), 0.5);
}

/* ========== ANIMAÇÃO ========== */
.online-users-card {
  animation: fadeSlideIn 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.3s backwards;
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

/* ========== RESPONSIVIDADE ========== */
@media (max-width: 600px) {
  .online-users-card {
    border-radius: 12px;
  }

  .online-users-list {
    max-height: 240px;
  }

  .online-user-item {
    padding: 6px 8px;
    margin: 3px 6px;
  }

  .user-avatar {
    width: 36px !important;
    height: 36px !important;
  }

  .user-name {
    font-size: 0.85rem;
  }
}
</style>
