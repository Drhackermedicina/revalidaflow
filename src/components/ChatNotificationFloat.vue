<template>
  <!-- Notificação Unificada para Chat Privado -->
  <VDialog
    v-model="showNotification"
    max-width="450"
    persistent
    :location="isInvite ? 'center' : 'top right'"
    :transition="isInvite ? 'scale-transition' : 'slide-x-reverse-transition'"
  >
    <VCard :class="isInvite ? 'simulation-invite-card' : 'chat-notification-card'">
      <!-- Header para Convites -->
      <VCardTitle v-if="isInvite" class="d-flex align-center pa-4 bg-primary">
        <VIcon color="white" class="me-2" size="32">ri-notification-badge-line</VIcon>
        <div class="flex-grow-1">
          <div class="text-white font-weight-bold">Convite para Simulação</div>
          <div class="text-white-50 text-caption">Você foi convidado para participar</div>
        </div>
        <VBtn
          icon
          size="small"
          variant="text"
          color="white"
          @click="closeNotification"
        >
          <VIcon icon="ri-close-line" />
        </VBtn>
      </VCardTitle>

      <!-- Header para Mensagens Normais -->
      <VCardTitle v-else class="d-flex align-center gap-2 pa-4">
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
      
      <!-- Conteúdo para Convites -->
      <VCardText v-if="isInvite" class="pa-4">
        <VAlert type="info" variant="tonal" class="mb-4">
          <VRow no-gutters align="center">
            <VCol cols="auto" class="me-3">
              <VAvatar size="40" color="primary">
                <VIcon color="white">ri-user-star-line</VIcon>
              </VAvatar>
            </VCol>
            <VCol>
              <div><strong>De:</strong> {{ notification.senderName }}</div>
              <div class="text-caption text-medium-emphasis">Convite para participar de uma simulação</div>
            </VCol>
          </VRow>
        </VAlert>
        
        <div v-if="notification.inviteData?.meetLink" class="mb-3">
          <VBtn
            variant="outlined"
            color="info"
            prepend-icon="ri-vidicon-line"
            @click="openMeetLink"
            block
          >
            Abrir Google Meet
          </VBtn>
        </div>

        <VAlert type="success" variant="tonal" class="mb-3">
          <VIcon icon="ri-information-line" class="me-2" />
          Clique em "Iniciar Simulação" para acessar automaticamente.
        </VAlert>
      </VCardText>

      <!-- Conteúdo para Mensagens Normais -->
      <VCardText v-else class="pa-4 pt-0">
        <div class="message-preview" v-html="formatNotificationText(notification.text)">
        </div>
        <div class="text-caption text-medium-emphasis mt-2">
          {{ formatTime(notification.timestamp) }}
        </div>
      </VCardText>
      
      <!-- Ações para Convites -->
      <VCardActions v-if="isInvite" class="pa-4">
        <VBtn variant="text" @click="closeNotification">
          <VIcon icon="ri-close-line" class="me-2" />
          Recusar
        </VBtn>
        <VSpacer />
        <VBtn 
          color="primary" 
          variant="flat"
          size="large"
          @click="acceptInvite"
          :loading="acceptingInvite"
        >
          <VIcon icon="ri-play-circle-line" class="me-2" />
          Iniciar Simulação
        </VBtn>
      </VCardActions>

      <!-- Ações para Mensagens Normais -->
      <VCardActions v-else class="pa-4 pt-0">
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
import { onMounted, onUnmounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useNotificationStore } from '@/stores/notificationStore'
import { currentUser } from '@/plugins/auth'
import { db } from '@/plugins/firebase'
import { collection, query, where, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore'

const router = useRouter()
const { notify } = useNotificationStore()

// Estado unificado da notificação
const showNotification = ref(false)
const copyingLink = ref(false)
const linkCopied = ref(false)
const acceptingInvite = ref(false)
const notification = ref({
  senderId: '',
  senderName: '',
  senderPhotoURL: '',
  text: '',
  timestamp: null,
  otherUserId: '',
  isInvite: false,
  inviteData: null
})

let notificationTimeout = null

// Computed para verificar se é convite
const isInvite = computed(() => notification.value.isInvite)

// 🗑️ Função para deletar convite do Firestore
const deleteInviteFromFirestore = async (candidateUid, senderUid, stationTitle) => {
  try {
    const invitesRef = collection(db, 'simulationInvites')
    const q = query(
      invitesRef,
      where('candidateUid', '==', candidateUid),
      where('senderUid', '==', senderUid),
      where('stationTitle', '==', stationTitle),
      where('status', '==', 'pending')
    )
    
    const querySnapshot = await getDocs(q)
    
    const deletePromises = querySnapshot.docs.map(docSnapshot => 
      deleteDoc(doc(db, 'simulationInvites', docSnapshot.id))
    )
    
    await Promise.all(deletePromises)
    
    // Log apenas em desenvolvimento
    if (querySnapshot.docs.length > 0 && process.env.NODE_ENV === 'development') {
      // console.log(`🗑️ ${querySnapshot.docs.length} convite(s) deletado(s) do Firestore`)
    }
  } catch (error) {
    console.error('Erro ao deletar convite do Firestore:', error)
  }
}

// Função unificada para tratar notificações de chat privado
const handlePrivateChatNotification = (event) => {
  try {
    const eventData = event.detail || {}

    // Segurança: se o evento inclui recipientUid, só processar se for para este usuário
    if (eventData.recipientUid && String(eventData.recipientUid) !== String(currentUser.value?.uid)) {
      return
    }

    // Verificar se é um convite e se é para o usuário correto (fallback caso recipientUid não exista)
    if (eventData.isInvite && eventData.inviteData?.candidateUid && String(eventData.inviteData.candidateUid) !== String(currentUser.value?.uid)) {
      return // Ignorar convites que não são para este usuário
    }

    // Ignorar se o usuário estiver na SimulationView
    const currentRouteName = router.currentRoute.value?.name
    if (currentRouteName === 'SimulationView') return

      notification.value = {
        senderId: eventData.senderId,
        senderName: eventData.senderName,
        senderPhotoURL: eventData.senderPhotoURL || '',
        text: eventData.text,
        timestamp: eventData.timestamp,
        otherUserId: eventData.otherUserId,
        isInvite: eventData.isInvite || false,
        inviteData: eventData.inviteData || null
      }

      showNotification.value = true

      // Auto-fechar após tempo variável (convites: 30s, mensagens: 10s)
      const timeout = isInvite.value ? 30000 : 10000

      if (notificationTimeout) {
        clearTimeout(notificationTimeout)
      }
      notificationTimeout = setTimeout(async () => {
        // 🗑️ Se for convite e expirar, deletar do Firestore
        if (isInvite.value && notification.value.inviteData) {
          await deleteInviteFromFirestore(
            notification.value.inviteData.candidateUid,
            notification.value.senderId,
            notification.value.inviteData.stationTitle
          )
        }

        showNotification.value = false
        if (isInvite.value) {
          notify({
            text: 'Convite de simulação expirou',
            color: 'warning'
          })
        }
        }, timeout)
        }
        catch (error) {
      if (import.meta.env.DEV) console.error('handlePrivateChatNotification error', error)
    }
  }

// Fechar notificação
const closeNotification = async () => {
  // 🗑️ Se for convite, deletar do Firestore quando recusado
  if (isInvite.value && notification.value.inviteData) {
    await deleteInviteFromFirestore(
      notification.value.inviteData.candidateUid,
      notification.value.senderId,
      notification.value.inviteData.stationTitle
    )
  }
  
  showNotification.value = false
  if (notificationTimeout) {
    clearTimeout(notificationTimeout)
    notificationTimeout = null
  }
  
  if (isInvite.value) {
    notify({
      text: 'Convite recusado',
      color: 'info'
    })
  }
}

// Aceitar convite de simulação
const acceptInvite = async () => {
  if (!notification.value.inviteData?.inviteLink) {
    notify({
      text: 'Link de convite inválido',
      color: 'error'
    })
    return
  }
  
  acceptingInvite.value = true
  
  try {
    // 🗑️ Deletar convite do Firestore quando aceito
    await deleteInviteFromFirestore(
      notification.value.inviteData.candidateUid,
      notification.value.senderId,
      notification.value.inviteData.stationTitle
    )
    
    // Redirecionar para o link da simulação
    window.location.href = notification.value.inviteData.inviteLink
  } catch (error) {
    console.error('Erro ao aceitar convite:', error)
    notify({
      text: 'Erro ao abrir simulação',
      color: 'error'
    })
    acceptingInvite.value = false
  }
  
  closeNotification()
}

// Abrir Google Meet
const openMeetLink = () => {
  if (notification.value.inviteData?.meetLink) {
    window.open(notification.value.inviteData.meetLink, '_blank')
    notify({
      text: 'Google Meet aberto em nova aba',
      color: 'success'
    })
  }
}

// Abrir chat privado
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
  // Apenas um evento unificado para todas as notificações
  window.addEventListener('privateChatNotification', handlePrivateChatNotification)
})

onUnmounted(() => {
  window.removeEventListener('privateChatNotification', handlePrivateChatNotification)
  
  // Limpar timeout
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

.simulation-invite-card {
  border: 2px solid rgb(var(--v-theme-primary));
  box-shadow: 0 12px 48px rgba(var(--v-theme-primary), 0.2);
  overflow: hidden;
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

/* Animação personalizada para notificação de chat */
.slide-x-reverse-transition-enter-active,
.slide-x-reverse-transition-leave-active {
  transition: all 0.3s ease-in-out;
}

.slide-x-reverse-transition-enter-from {
  opacity: 0;
  transform: translateX(100px);
}

.slide-x-reverse-transition-leave-to {
  opacity: 0;
  transform: translateX(100px);
}

/* Animação personalizada para notificação de chat */
.slide-x-reverse-transition-enter-active,
.slide-x-reverse-transition-leave-active {
  transition: all 0.3s ease-in-out;
}

.slide-x-reverse-transition-enter-from {
  opacity: 0;
  transform: translateX(100px);
}

.slide-x-reverse-transition-leave-to {
  opacity: 0;
  transform: translateX(100px);
}

/* Animação personalizada para convite de simulação */
.scale-transition-enter-active,
.scale-transition-leave-active {
  transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.scale-transition-enter-from {
  opacity: 0;
  transform: scale(0.8);
}

.scale-transition-leave-to {
  opacity: 0;
  transform: scale(0.8);
}
</style>
