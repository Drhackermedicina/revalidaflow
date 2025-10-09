<template>
  <VCard
    :class="[
      'notifications-card',
      isDarkTheme ? 'notifications-card--dark' : 'notifications-card--light'
    ]"
    elevation="3"
  >
    <VCardTitle class="d-flex align-center pa-4">
      <VIcon icon="ri-notification-line" color="info" size="24" class="me-2" />
      <span class="text-h6 font-weight-bold">Novidades</span>
      <VSpacer />
      <VBadge
        v-if="unreadCount > 0"
        :content="unreadCount"
        color="error"
        class="unread-badge"
      >
        <VIcon icon="ri-inbox-line" size="20" />
      </VBadge>
    </VCardTitle>

    <VDivider />

    <VCardText class="pa-0">
      <!-- Empty State -->
      <div v-if="notifications.length === 0" class="d-flex flex-column justify-center align-center py-8">
        <VIcon icon="ri-notification-off-line" color="grey" size="48" class="mb-2" />
        <span class="text-medium-emphasis">Nenhuma novidade no momento</span>
        <span class="text-caption text-medium-emphasis mt-1">Fique atento às atualizações</span>
      </div>

      <!-- Notifications List -->
      <VList v-else class="notifications-list py-2">
        <VListItem
          v-for="notif in displayedNotifications"
          :key="notif.id"
          :class="[
            'notification-item',
            { 'notification-unread': !notif.lida }
          ]"
          @click="markAsRead(notif)"
        >
          <template #prepend>
            <VAvatar
              :color="getNotifColor(notif.tipo)"
              variant="tonal"
              size="40"
              class="notif-avatar"
            >
              <VIcon :icon="getNotifIcon(notif.tipo)" size="20" />
            </VAvatar>
          </template>

          <VListItemTitle class="font-weight-medium notif-title">
            {{ notif.mensagem }}
          </VListItemTitle>
          
          <VListItemSubtitle class="text-caption mt-1">
            <VIcon icon="ri-time-line" size="12" class="me-1" />
            {{ formatTime(notif.criadoEm) }}
          </VListItemSubtitle>

          <template #append>
            <VChip
              v-if="!notif.lida"
              color="error"
              variant="flat"
              size="x-small"
              class="new-badge"
            >
              NOVO
            </VChip>
          </template>
        </VListItem>
      </VList>
    </VCardText>

    <VDivider v-if="notifications.length > 0" />

    <!-- Footer Actions -->
    <VCardActions v-if="notifications.length > 0" class="pa-3 d-flex justify-space-between">
      <VBtn
        v-if="unreadCount > 0"
        variant="text"
        size="small"
        color="primary"
        @click="markAllAsRead"
      >
        <VIcon icon="ri-check-double-line" size="16" class="me-1" />
        Marcar todas como lidas
      </VBtn>
      <VSpacer />
      <VBtn
        variant="text"
        size="small"
        color="secondary"
        @click="viewAllNotifications"
      >
        Ver todas
        <VIcon icon="ri-arrow-right-line" size="16" class="ms-1" />
      </VBtn>
    </VCardActions>
  </VCard>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useTheme } from 'vuetify'
import { currentUser, waitForAuth } from '@/plugins/auth'
import { db } from '@/plugins/firebase'
import { collection, query, orderBy, limit, onSnapshot, doc, updateDoc, writeBatch, getDoc } from 'firebase/firestore'
import type { DashboardNotification } from '@/types/dashboard'

const theme = useTheme()

// Tema
const isDarkTheme = computed(() => theme.global.name.value === 'dark')

// Props
const maxDisplay = 3

// Estado
const notifications = ref<DashboardNotification[]>([])
const loading = ref(true)

/**
 * ESTRUTURA DO FIRESTORE PARA NOTIFICAÇÕES:
 * 
 * Opção 1 - Notificações por usuário:
 * notificacoes/{userId}/items/{notifId}
 * 
 * Opção 2 - Notificações globais (para todos):
 * notificacoes/{notifId}
 * └── targetUsers: [userId] ou null (para todos)
 * 
 * ATUALMENTE: Usando dados MOCK enquanto não há coleção no Firestore
 * Para implementar: Criar coleção 'notificacoes' e descomentar o código abaixo
 */

// Computed
const displayedNotifications = computed(() => 
  notifications.value.slice(0, maxDisplay)
)

const unreadCount = computed(() => 
  notifications.value.filter(n => !n.lida).length
)

// Carregar notificações do Firestore
onMounted(async () => {
  // ✅ AGUARDAR AUTENTICAÇÃO COMPLETA
  await waitForAuth()
  
  const userId = currentUser.value?.uid
  
  if (!userId) {
    useMockData()
    loading.value = false
    return
  }

  // ✅ USUÁRIO AUTENTICADO - tentar carregar do Firestore
  try {
    // Primeiro, testar se conseguimos acessar a coleção do usuário
    const userNotifRef = doc(db, 'notificacoes', userId)
    
    // Tentar ler o documento do usuário (pode não existir ainda)
    const userDoc = await getDoc(userNotifRef)
    
    // Tentar buscar notificações reais do Firestore
    // Usar estrutura com subcoleções: notificacoes/{userId}/items/{notifId}
    const notifRef = collection(db, 'notificacoes', userId, 'items')
    const q = query(notifRef, orderBy('criadoEm', 'desc'), limit(10))
    
    // Listener em tempo real
    onSnapshot(q, 
      (snapshot) => {
        if (snapshot.empty) {
          // Se não houver notificações no Firestore, usar dados mock
          useMockData()
        } else {
          notifications.value = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as DashboardNotification))
        }
        loading.value = false
      },
      (error) => {
        useMockData()
        loading.value = false
      }
    )
  } catch (error) {
    console.warn('Erro ao carregar notificações, usando dados mock:', error)
    useMockData()
    loading.value = false
  }
})

// Função para usar dados mock quando Firestore não está disponível
const useMockData = () => {
  notifications.value = [
    {
      id: '1',
      mensagem: 'Nova estação disponível: Cardiologia Avançada 🫀',
      tipo: 'novidade',
      lida: false,
      criadoEm: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 horas atrás
      link: '/app/station-list'
    },
    {
      id: '2',
      mensagem: 'Parabéns! Você alcançou 10 simulações completadas 🎉',
      tipo: 'sucesso',
      lida: false,
      criadoEm: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 dia atrás
    },
    {
      id: '3',
      mensagem: 'Atualizações no sistema de ranking implementadas',
      tipo: 'info',
      lida: true,
      criadoEm: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 dias atrás
    }
  ]
}

// Helpers
const getNotifIcon = (tipo: string): string => {
  switch (tipo) {
    case 'info':
      return 'ri-information-line'
    case 'novidade':
      return 'ri-lightbulb-line'
    case 'aviso':
      return 'ri-error-warning-line'
    case 'sucesso':
      return 'ri-checkbox-circle-line'
    default:
      return 'ri-notification-line'
  }
}

const getNotifColor = (tipo: string): string => {
  switch (tipo) {
    case 'info':
      return 'info'
    case 'novidade':
      return 'secondary'
    case 'aviso':
      return 'warning'
    case 'sucesso':
      return 'success'
    default:
      return 'primary'
  }
}

const formatTime = (timestamp: any): string => {
  const date = timestamp?.toDate ? timestamp.toDate() : (timestamp instanceof Date ? timestamp : new Date(timestamp))
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 60) {
    return `há ${diffMins} ${diffMins === 1 ? 'minuto' : 'minutos'}`
  } else if (diffHours < 24) {
    return `há ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`
  } else if (diffDays < 7) {
    return `há ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`
  } else {
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  }
}

// Actions
const markAsRead = async (notif: DashboardNotification) => {
  notif.lida = true
  
  // Atualizar no Firestore se não for mock
  const userId = currentUser.value?.uid
  if (userId && !notif.id.startsWith('mock')) {
    try {
      const notifDoc = doc(db, 'notificacoes', userId, 'items', notif.id)
      await updateDoc(notifDoc, { lida: true })
    } catch (error) {
      console.warn('Erro ao marcar notificação como lida:', error)
    }
  }
  
  if (notif.link) {
    // Navegar para o link se existir
    // router.push(notif.link)
  }
}

const markAllAsRead = async () => {
  const userId = currentUser.value?.uid
  
  if (userId) {
    try {
      const batch = writeBatch(db)
      notifications.value.forEach(notif => {
        if (!notif.lida && !notif.id.startsWith('mock')) {
          const notifDoc = doc(db, 'notificacoes', userId, 'items', notif.id)
          batch.update(notifDoc, { lida: true })
        }
        notif.lida = true
      })
      await batch.commit()
    } catch (error) {
      console.warn('Erro ao marcar todas como lidas:', error)
      // Atualizar localmente mesmo se falhar
      notifications.value.forEach(n => n.lida = true)
    }
  } else {
    // Se for mock, apenas atualizar localmente
    notifications.value.forEach(n => n.lida = true)
  }
}

const viewAllNotifications = () => {
  // Em produção: navegar para página de notificações completa
  // router.push('/app/notifications')
}
</script>

<style scoped>
/* ========== CARD BASE ========== */
.notifications-card {
  border-radius: 18px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  height: 100%;
}

.notifications-card--light {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-outline), 0.12);
}

.notifications-card--dark {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-outline), 0.24);
}

.notifications-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(var(--v-theme-info), 0.15) !important;
}

/* ========== BADGE ========== */
.unread-badge :deep(.v-badge__badge) {
  font-weight: 700;
  animation: pulse-badge 2s ease-in-out infinite;
}

@keyframes pulse-badge {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

/* ========== NOTIFICATIONS LIST ========== */
.notifications-list {
  max-height: 320px;
  overflow-y: auto;
  background: transparent;
}

.notification-item {
  border-radius: 12px;
  margin: 4px 8px;
  padding: 12px;
  transition: all 0.2s ease;
  cursor: pointer;
  position: relative;
}

.notification-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 0;
  height: 80%;
  background: rgb(var(--v-theme-primary));
  border-radius: 0 4px 4px 0;
  transition: width 0.2s ease;
}

.notification-item:hover::before {
  width: 4px;
}

.notification-item:hover {
  background: rgba(var(--v-theme-info), 0.08);
  transform: translateX(6px);
}

.notification-unread {
  background: linear-gradient(90deg, rgba(var(--v-theme-info), 0.05) 0%, rgba(var(--v-theme-secondary), 0.05) 100%);
  border: 1px solid rgba(var(--v-theme-info), 0.2);
}

.notification-unread::before {
  background: rgb(var(--v-theme-info));
  width: 4px;
}

/* ========== AVATAR ========== */
.notif-avatar {
  border: 2px solid rgba(var(--v-theme-info), 0.2);
  transition: all 0.2s ease;
}

.notification-item:hover .notif-avatar {
  transform: scale(1.05);
  border-color: rgb(var(--v-theme-info));
}

/* ========== TEXT ========== */
.notif-title {
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.9rem;
  line-height: 1.4;
}

/* ========== BADGE NEW ========== */
.new-badge {
  font-size: 0.65rem;
  font-weight: 700;
  height: 20px;
  padding: 0 6px;
  animation: bounce-subtle 2s ease-in-out infinite;
}

@keyframes bounce-subtle {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-2px);
  }
}

/* ========== SCROLLBAR ========== */
.notifications-list::-webkit-scrollbar {
  width: 6px;
}

.notifications-list::-webkit-scrollbar-track {
  background: transparent;
}

.notifications-list::-webkit-scrollbar-thumb {
  background: rgba(var(--v-theme-info), 0.3);
  border-radius: 3px;
}

.notifications-list::-webkit-scrollbar-thumb:hover {
  background: rgba(var(--v-theme-info), 0.5);
}

/* ========== ANIMAÇÃO ========== */
.notifications-card {
  animation: fadeSlideIn 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.4s backwards;
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
  .notifications-card {
    border-radius: 12px;
  }

  .notifications-list {
    max-height: 240px;
  }

  .notification-item {
    padding: 10px;
    margin: 3px 6px;
  }

  .notif-avatar {
    width: 36px !important;
    height: 36px !important;
  }

  .notif-title {
    font-size: 0.85rem;
  }
}
</style>
