<template>
  <VDialog
    v-model="showNotification"
    max-width="400"
    persistent
    location="top right"
    transition="slide-x-reverse-transition"
  >
    <VCard class="chat-notification-card">
      <VCardTitle class="d-flex align-center gap-2 pa-4">
        <VAvatar size="32">
          <VImg v-if="notification.senderPhotoURL" :src="notification.senderPhotoURL" />
          <VIcon v-else icon="ri-user-line" />
        </VAvatar>
        <div class="flex-grow-1">
          <div class="font-weight-bold">{{ notification.senderName }}</div>
          <div class="text-caption text-medium-emphasis">Nova mensagem privada</div>
        </div>
        <VBtn
          icon
          size="small"
          variant="text"
          @click="closeNotification"
        >
          <VIcon icon="ri-close-line" />
        </VBtn>
      </VCardTitle>
      
      <VCardText class="pa-4 pt-0">
        <div class="message-preview" v-html="formatNotificationText(notification.text)">
        </div>
        <div class="text-caption text-medium-emphasis mt-2">
          {{ formatTime(notification.timestamp) }}
        </div>
      </VCardText>
      
      <VCardActions class="pa-4 pt-0">
        <VBtn
          v-if="hasLinksInNotification(notification.text)"
          variant="flat"
          color="success"
          @click="copyNotificationLinks"
          :loading="copyingLink"
        >
          <VIcon icon="ri-clipboard-line" class="me-2" />
          {{ linkCopied ? 'Copiado!' : 'Copiar Link' }}
        </VBtn>
        <VBtn
          variant="text"
          color="primary"
          @click="openChat"
          :class="hasLinksInNotification(notification.text) ? '' : 'flex-grow-1'"
        >
          <VIcon icon="ri-message-line" class="me-2" />
          Abrir Chat
        </VBtn>
        <VBtn
          variant="outlined"
          @click="closeNotification"
        >
          Fechar
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const showNotification = ref(false)
const copyingLink = ref(false)
const linkCopied = ref(false)
const notification = ref({
  senderId: '',
  senderName: '',
  senderPhotoURL: '',
  text: '',
  timestamp: null,
  otherUserId: ''
})

let notificationTimeout = null

const handlePrivateChatNotification = (event) => {
  notification.value = { ...event.detail }
  showNotification.value = true
  
  // Auto-fechar após 10 segundos se não interagir
  if (notificationTimeout) {
    clearTimeout(notificationTimeout)
  }
  notificationTimeout = setTimeout(() => {
    showNotification.value = false
  }, 10000)
}

const closeNotification = () => {
  showNotification.value = false
  if (notificationTimeout) {
    clearTimeout(notificationTimeout)
    notificationTimeout = null
  }
}

const openChat = () => {
  closeNotification()
  router.push({ 
    name: 'ChatPrivateView', 
    params: { uid: notification.value.otherUserId }
  })
}

const formatTime = (timestamp) => {
  if (!timestamp) return ''
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  } catch {
    return ''
  }
}

// Função para formatar texto de notificação com links
const formatNotificationText = (text) => {
  if (!text) return ''
  
  // Regex para detectar URLs (http/https)
  const urlRegex = /(https?:\/\/[^\s]+)/g
  
  // Substitui URLs por versões encurtadas mais amigáveis
  return text.replace(urlRegex, (url) => {
    const shortUrl = url.length > 50 ? url.substring(0, 47) + '...' : url
    return `<span class="notification-link">${shortUrl}</span>`
  }).replace(/\n/g, '<br>')
}

// Função para verificar se a notificação contém links
const hasLinksInNotification = (text) => {
  if (!text) return false
  const urlRegex = /(https?:\/\/[^\s]+)/g
  return urlRegex.test(text)
}

// Função para copiar links da notificação
const copyNotificationLinks = async () => {
  const text = notification.value.text
  if (!text) return
  
  copyingLink.value = true
  
  try {
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const links = text.match(urlRegex)
    
    if (links && links.length > 0) {
      // Se houver apenas um link, copia diretamente
      if (links.length === 1) {
        await navigator.clipboard.writeText(links[0])
      } else {
        // Se houver múltiplos links, copia todos separados por quebra de linha
        await navigator.clipboard.writeText(links.join('\n'))
      }
      
      linkCopied.value = true
      
      // Reset do estado após 2 segundos
      setTimeout(() => {
        linkCopied.value = false
      }, 2000)
    }
  } catch (error) {
    console.error('Erro ao copiar link:', error)
    // Fallback para navegadores mais antigos
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const links = text.match(urlRegex)
    
    if (links && links.length > 0) {
      const textArea = document.createElement('textarea')
      textArea.value = links.length === 1 ? links[0] : links.join('\n')
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      
      linkCopied.value = true
      setTimeout(() => {
        linkCopied.value = false
      }, 2000)
    }
  } finally {
    copyingLink.value = false
  }
}

onMounted(() => {
  window.addEventListener('privateChatNotification', handlePrivateChatNotification)
})

onUnmounted(() => {
  window.removeEventListener('privateChatNotification', handlePrivateChatNotification)
  if (notificationTimeout) {
    clearTimeout(notificationTimeout)
  }
})
</script>

<style scoped>
.chat-notification-card {
  border-left: 4px solid rgb(var(--v-theme-primary));
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
}

.message-preview {
  background-color: rgb(var(--v-theme-surface));
  padding: 12px;
  border-radius: 8px;
  font-size: 0.875rem;
  line-height: 1.4;
  max-height: 80px;
  overflow-y: auto;
  word-break: break-word;
}

.notification-link {
  color: rgb(var(--v-theme-primary));
  font-weight: 500;
  background-color: rgba(var(--v-theme-primary), 0.1);
  padding: 2px 4px;
  border-radius: 4px;
}

/* Animação personalizada para notificação */
.slide-x-reverse-transition-enter-active,
.slide-x-reverse-transition-leave-active {
  transition: all 0.3s ease;
}

.slide-x-reverse-transition-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.slide-x-reverse-transition-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>
