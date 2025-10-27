<template>
  <v-container
    fluid
    :class="[
      'px-0 py-6 chat-group-container',
      isDarkTheme ? 'chat-group-container--dark' : 'chat-group-container--light'
    ]"
  >
    <!-- Alerta informativo sobre sistema de convites com indicadores de performance -->
    <v-row v-if="isUsingFallback || inviteError" class="mb-4">
      <v-col cols="12">
        <v-alert
          :type="systemStatus.type"
          variant="tonal"
          prominent
          closable
          @click:close="() => {}"
        >
          <v-alert-title class="d-flex align-center">
            <v-icon :icon="inviteError ? 'ri-error-warning-line' : 'ri-information-line'" class="me-2" />
            <div class="d-flex align-center justify-space-between w-100">
              <span>{{ inviteError ? 'Erro no Sistema de Convites' : 'Sistema de Convites em Modo Limitado' }}</span>

              <!-- Indicador de performance -->
              <v-chip
                :color="systemStatus.color"
                size="x-small"
                variant="elevated"
                class="text-caption"
              >
                <v-icon size="12" class="me-1">ri-speed-line</v-icon>
                {{ systemPerformance.queryTime }}
              </v-chip>
            </div>
          </v-alert-title>

          <div v-if="inviteError">
            <p class="mb-2">Ocorreu um erro ao conectar com o sistema de convites:</p>
            <p class="text-caption font-weight-bold mb-2">{{ inviteError }}</p>
            <p class="text-body-2 mb-0">
              Tente novamente em alguns instantes. Se o problema persistir, recarregue a página.
            </p>
          </div>

          <div v-else>
            <p class="mb-2">
              <strong>🚀 Sistema de convites funcionando normalmente!</strong>
            </p>
            <p class="text-body-2 mb-2">
              Sistema operacional com configuração otimizada para garantir máxima performance.
              Os convites estão 100% funcionais - pode usar normalmente!
            </p>

            <!-- Indicadores de performance -->
            <div class="d-flex flex-wrap gap-2 mb-2">
              <v-chip size="x-small" variant="tonal" color="blue-grey">
                <v-icon size="12" class="me-1">ri-time-line</v-icon>
                Updates: {{ systemPerformance.updateFreq }}
              </v-chip>
              <v-chip size="x-small" variant="tonal" color="blue-grey">
                <v-icon size="12" class="me-1">ri-database-2-line</v-icon>
                Cache: {{ systemPerformance.cacheStatus }}
              </v-chip>
              <v-chip
                size="x-small"
                :color="systemStatus.color"
                variant="tonal"
              >
                <v-icon size="12" class="me-1">ri-shield-check-line</v-icon>
                Status: {{ systemPerformance.status }}
              </v-chip>
            </div>

            <p class="text-caption text-medium-emphasis mb-0">
              <v-icon size="14" class="me-1">ri-refresh-line</v-icon>
              Verificando automaticamente por otimizações disponíveis...
            </p>
          </div>
        </v-alert>
      </v-col>
    </v-row>

    <v-row>
      <!-- Usuários Online -->
      <v-col cols="12" md="4">
        <v-card 
          elevation="3" 
          :class="[
            'users-card animate-fade-in',
            isDarkTheme ? 'users-card--dark' : 'users-card--light'
          ]"
        >
          <v-card-title class="d-flex align-center gap-2">
            <v-icon icon="ri-group-line" color="primary" size="24" />
            <span class="text-h6 font-weight-bold">Usuários Online</span>
            <!-- Indicador de status do sistema de convites -->
            <v-chip
              v-if="isUsingFallback"
              color="success"
              variant="tonal"
              size="x-small"
              prepend-icon="ri-check-line"
            >
              Convites Ativos
            </v-chip>
          </v-card-title>
          <v-divider />
          <v-card-text class="pa-0">
            <template v-if="loadingUsers">
              <div class="d-flex justify-center align-center py-6">
                <v-progress-circular indeterminate color="primary" size="32" />
                <span class="ms-3">Carregando...</span>
              </div>
            </template>
            <template v-else-if="errorUsers">
              <div class="d-flex justify-center align-center py-6">
                <v-icon icon="ri-error-warning-line" color="error" size="28" class="me-2" />
                <span class="text-error">{{ errorUsers }}</span>
              </div>
            </template>
            <template v-else-if="users.length === 0">
              <div class="d-flex justify-center align-center py-6">
                <v-icon icon="ri-user-off-line" color="grey" size="28" class="me-2" />
                <span class="text-medium-emphasis">Nenhum usuário online.</span>
              </div>
            </template>
            <v-list class="py-0" v-else>
              <v-list-item v-for="user in users" :key="user.uid" class="py-2 user-list-item">
                <template #prepend>
                  <v-badge
                    :color="user.status === 'disponivel' ? 'success' : user.status === 'ausente' ? 'warning' : 'info'"
                    dot
                    location="bottom right"
                    offset-x="4"
                    offset-y="4"
                  >
                    <v-avatar :image="getUserAvatar(user)" size="40" class="user-avatar elevation-2" />
                  </v-badge>
                </template>
                <v-list-item-title class="font-weight-medium d-flex align-center">
                  <span
                    class="user-name-link"
                    @click="openPrivateChat(user)"
                    style="cursor:pointer; color:#7b1fa2; text-decoration:underline;"
                  >
                    {{ (user.nome && user.sobrenome) ? user.nome + ' ' + user.sobrenome : user.displayName || 'Usuário sem nome' }}
                  </span>
                  <!-- Botão de convite para treino -->
                  <v-btn
                    v-if="user.uid !== currentUser?.uid"
                    icon="ri-add-line"
                    size="x-small"
                    variant="text"
                    color="success"
                    class="ms-2 invite-btn"
                    :loading="isInviteLoading"
                    :disabled="isInviteLoading || user.status !== 'disponivel'"
                    @click.stop="inviteToTraining(user)"
                    title="Convidar para treino"
                  >
                    <v-icon size="16">ri-add-line</v-icon>
                  </v-btn>
                </v-list-item-title>
                <v-list-item-subtitle class="text-caption text-medium-emphasis">
                  {{ user.status === 'disponivel' ? 'Disponível' : user.status === 'ausente' ? 'Ausente' : 'Treinando' }}
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>
      <!-- Chat em Grupo -->
      <v-col cols="12" md="8">
        <v-card 
          elevation="3" 
          :class="[
            'chat-card d-flex flex-column animate-fade-in',
            isDarkTheme ? 'chat-card--dark' : 'chat-card--light'
          ]"
        >
          <v-card-title class="d-flex align-center gap-2">
            <v-icon icon="ri-wechat-line" color="primary" size="28" />
            <span class="text-h5 font-weight-bold">Chat em Grupo</span>
            <!-- Botão de teste para limpeza (apenas para admins) -->
            <v-spacer />
            <v-btn 
              v-if="canCleanMessages"
              icon
              variant="text"
              color="warning"
              size="small"
              @click="cleanOldMessages"
              title="Testar limpeza de mensagens antigas"
            >
              <v-icon icon="ri-delete-bin-line" />
            </v-btn>
          </v-card-title>
          <v-divider />
          <v-card-text class="chat-messages flex-grow-1 pa-4">
            <div v-for="message in messages" :key="message.id" class="message-bubble d-flex mb-4" :class="{ 'justify-end': (message.senderId || '') === (currentUser?.uid || '') }">
              <v-avatar v-if="getMessageUserPhoto(message)" :image="getMessageUserPhoto(message)" size="32" class="me-2" />
              <div 
                :class="[
                  'message-content pa-3 rounded-lg',
                  message.senderId === currentUser?.uid 
                    ? 'bg-primary text-white my-message' 
                    : isDarkTheme 
                      ? 'other-message--dark' 
                      : 'other-message--light'
                ]"
              >
                <div class="font-weight-medium text-body-2 mb-1" :class="{ 'text-right': message.senderId === currentUser?.uid }">
                  {{ message.senderName }}
                </div>
                <div class="text-body-1 mb-1" v-html="formatMessageText(message.text)"></div>
                <div v-if="hasLinks(message.text)" class="d-flex justify-end mt-2">
                  <v-btn
                    size="x-small"
                    variant="text"
                    @click="copyMessageLinks(message.text)"
                    :color="message.senderId === currentUser?.uid ? 'white' : 'primary'"
                  >
                    <v-icon size="14" class="me-1">ri-clipboard-line</v-icon>
                    Copiar Link
                  </v-btn>
                </div>
                <div class="text-caption text-right" :class="message.senderId === currentUser?.uid ? 'text-white-50' : 'text-medium-emphasis'">
                  {{ formatTime(message.timestamp) }}
                </div>
              </div>
            </div>
            <!-- Botão para carregar mais mensagens -->
            <div v-if="shouldShowLoadMore" class="d-flex justify-center py-2">
              <v-btn
                variant="outlined"
                size="small"
                :loading="isLoadingMore"
                @click="loadMoreMessages"
              >
                Carregar mensagens antigas
              </v-btn>
            </div>
            <div ref="messagesEnd"></div>
          </v-card-text>
          <v-divider />
          <v-card-actions 
            :class="[
              'pa-4 chat-input-bar',
              isDarkTheme ? 'chat-input-bar--dark' : 'chat-input-bar--light'
            ]"
          >
            <v-text-field
              v-model="newMessage"
              label="Digite sua mensagem..."
              variant="outlined"
              density="compact"
              hide-details
              clearable
              class="chat-input"
              @keydown.enter="sendMessage"
            >
              <template #append-inner>
                <v-btn
                  icon
                  variant="text"
                  color="primary"
                  :disabled="!newMessage.trim()"
                  @click="sendMessage"
                >
                  <v-icon icon="ri-send-plane-line" />
                </v-btn>
              </template>
            </v-text-field>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
    <!-- Snackbar para nova mensagem -->
    <v-snackbar v-if="snackbar" v-model="snackbar.show" :color="snackbar.color" timeout="4000">{{ snackbar.text }}</v-snackbar>
  </v-container>
</template>

<script setup>
import { currentUser } from '@/plugins/auth'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useTheme } from 'vuetify'

// Importar composables criados
import { useChatUsers } from '@/composables/useChatUsers.js'
import { useChatMessages, formatTime } from '@/composables/useChatMessages.js'
import { useChatInput } from '@/composables/useChatInput.js'
import { useMessageCleanup } from '@/composables/useMessageCleanup.js'
import { useTrainingInvites } from '@/composables/useTrainingInvites.js'

const router = useRouter()
const theme = useTheme()

// Computed para detectar tema escuro
const isDarkTheme = computed(() => theme.global.name.value === 'dark')

// Snackbar deve ser definido antes dos composables
const snackbar = ref({
  show: false,
  text: '',
  color: 'primary'
})

// Usar composables
const { users, loading: loadingUsers, error: errorUsers, getUserAvatar } = useChatUsers()
const {
  messages,
  messagesEnd,
  isLoadingMore,
  shouldShowLoadMore,
  sendMessage: sendMessageToDB,
  loadMoreMessages,
  getMessageUserPhoto
} = useChatMessages(currentUser)

const {
  newMessage,
  formatMessageText,
  hasLinks,
  copyMessageLinks,
  clearMessage,
  validateMessage,
  sanitizeInput
} = useChatInput()

// Importar userStore para verificação de permissões
import { useUserStore } from '@/stores/userStore'

const { canDeleteMessages } = useUserStore()

// Inicializar limpeza automática e acesso manual controlado
const { cleanOldMessages: runMessageCleanup } = useMessageCleanup()

// Inicializar sistema de convites para treino
const {
  sendTrainingInvite,
  formatInviteMessage,
  navigateToStationList,
  isLoading: isInviteLoading,
  hasPendingInvites,
  isUsingFallback,
  error: inviteError,
  systemStatus,
  systemPerformance
} = useTrainingInvites()

const canCleanMessages = computed(() => {
  return canDeleteMessages.value
})

// Funções do componente
async function inviteToTraining(user) {
  if (!user.uid || user.uid === currentUser.value?.uid) {
    snackbar.value = {
      show: true,
      text: 'Não pode convidar a si mesmo!',
      color: 'error'
    }
    return
  }

  if (isInviteLoading.value) {
    snackbar.value = {
      show: true,
      text: 'Processando convite, aguarde...',
      color: 'info'
    }
    return
  }

  try {
    // Enviar convite
    const result = await sendTrainingInvite(user)

    if (result.success) {
      // Abrir chat privado automaticamente
      openPrivateChat(user)

      snackbar.value = {
        show: true,
        text: result.message || 'Convite enviado com sucesso!',
        color: 'success'
      }
    } else {
      snackbar.value = {
        show: true,
        text: result.error || 'Erro ao enviar convite',
        color: 'error'
      }
    }
  } catch (error) {
      // Melhorar mensagem de erro específica
      let errorMessage = 'Erro ao enviar convite. Tente novamente.'
      let errorColor = 'error'

      if (error.message.includes('Já existe um convite pendente')) {
        errorMessage = 'Você já enviou um convite para este usuário. Aguarde a resposta ou aguarde 5 minutos para enviar um novo.'
        errorColor = 'warning'
      } else if (error.message.includes('Não pode convidar a si mesmo')) {
        errorMessage = 'Você não pode convidar a si mesmo.'
        errorColor = 'info'
      }

      snackbar.value = {
        show: true,
        text: errorMessage,
        color: errorColor
      }
    }
}

function openPrivateChat(user) {
  if (!user.uid || user.uid === currentUser.value?.uid) return
  router.push({ name: 'ChatPrivateView', params: { uid: user.uid } })
}

const sendMessage = async () => {
  // Sanitizar e validar entrada
  const sanitizedText = sanitizeInput(newMessage.value)
  const validation = validateMessage(sanitizedText)

  if (!validation.valid) {
    snackbar.value = {
      show: true,
      text: validation.error || 'Erro na validação',
      color: 'error'
    }
    return
  }

  const success = await sendMessageToDB(sanitizedText)
  if (success) {
    clearMessage()
  } else {
    snackbar.value = {
      show: true,
      text: 'Erro ao enviar mensagem',
      color: 'error'
    }
  }
}

// Botão de limpeza apenas para perfis autorizados
const cleanOldMessages = async () => {
  if (!canCleanMessages.value) {
    snackbar.value = {
      show: true,
      text: 'Você não possui permissão para executar esta operação.',
      color: 'error'
    }
    return
  }

  snackbar.value = {
    show: true,
    text: 'Iniciando limpeza de mensagens antigas...',
    color: 'info'
  }

  try {
    await runMessageCleanup()
    snackbar.value = {
      show: true,
      text: 'Limpeza concluída com sucesso.',
      color: 'success'
    }
  } catch (error) {
    snackbar.value = {
      show: true,
      text: 'Falha ao executar a limpeza. Tente novamente mais tarde.',
      color: 'error'
    }
  }
}
</script>

<style scoped>
/* ========== VARIÁVEIS CSS ========== */
:root {
  --card-radius: 18px;
  --card-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  --card-border: 1px solid rgba(var(--v-theme-outline), 0.12);
  --message-radius: 12px;
  --transition-fast: 0.15s;
  --transition-normal: 0.18s;
}

/* ========== CONTAINER ========== */
.chat-group-container--light,
.chat-group-container--dark {
  background: rgb(var(--v-theme-background));
  color: rgb(var(--v-theme-on-background));
}

/* ========== CARDS BASE ========== */
.users-card--light,
.users-card--dark,
.chat-card--light,
.chat-card--dark {
  border-radius: var(--card-radius);
  box-shadow: var(--card-shadow) !important;
  background: rgb(var(--v-theme-surface)) !important;
  color: rgb(var(--v-theme-on-surface)) !important;
  border: var(--card-border) !important;
}

.chat-card--light,
.chat-card--dark {
  min-height: 480px;
  display: flex;
  flex-direction: column;
}

/* ========== LISTA DE USUÁRIOS ========== */
.user-list-item {
  border-radius: 8px;
  margin-bottom: 2px;
  transition: background var(--transition-normal);
}

.user-list-item:hover {
  background: rgba(var(--v-theme-primary), 0.08);
}

.user-avatar {
  border: 2px solid rgb(var(--v-theme-primary));
  box-shadow: 0 2px 8px rgba(var(--v-theme-primary), 0.20);
}

.user-name-link {
  cursor: pointer;
  color: rgb(var(--v-theme-primary));
  text-decoration: underline;
  transition: color var(--transition-fast);
}

.user-name-link:hover {
  color: rgb(var(--v-theme-secondary));
}

/* ========== ÁREA DE MENSAGENS ========== */
.chat-messages {
  min-height: 320px;
  max-height: 420px;
  overflow-y: auto;
  background: rgba(var(--v-theme-primary), 0.02);
  border-radius: var(--message-radius);
}

.message-bubble {
  transition: transform var(--transition-fast);
}

.message-bubble:hover .message-content {
  transform: scale(1.03);
  box-shadow: 0 2px 12px rgba(var(--v-theme-primary), 0.10);
}

.message-content {
  min-width: 120px;
  max-width: 80vw;
  word-break: break-word;
  box-shadow: 0 2px 8px rgba(var(--v-theme-primary), 0.06);
  transition: box-shadow var(--transition-normal), transform var(--transition-normal);
  border-radius: var(--message-radius);
}

/* Estilos de mensagens por tipo */
.my-message {
  background: linear-gradient(90deg, rgb(var(--v-theme-primary)) 0%, rgb(var(--v-theme-secondary)) 100%) !important;
  color: rgb(var(--v-theme-on-primary)) !important;
}

.other-message--light {
  background: rgb(var(--v-theme-surface)) !important;
  color: rgb(var(--v-theme-on-surface)) !important;
  border: var(--card-border) !important;
}

.other-message--dark {
  background: rgba(var(--v-theme-surface-bright), 0.15) !important;
  color: rgb(var(--v-theme-on-surface)) !important;
  border: 1px solid rgba(var(--v-theme-outline), 0.24) !important;
}

/* ========== LINKS NAS MENSAGENS ========== */
.message-content :deep(.message-link) {
  color: rgb(var(--v-theme-primary)) !important;
  text-decoration: underline;
  word-break: break-all;
  transition: color 0.2s ease;
}

.my-message :deep(.message-link) {
  color: rgba(var(--v-theme-on-primary), 0.8) !important;
}

.my-message :deep(.message-link):hover {
  color: rgb(var(--v-theme-on-primary)) !important;
}

.other-message--light :deep(.message-link),
.other-message--dark :deep(.message-link) {
  color: rgb(var(--v-theme-primary)) !important;
}

.other-message--light :deep(.message-link):hover,
.other-message--dark :deep(.message-link):hover {
  color: rgba(var(--v-theme-primary), 0.8) !important;
}

/* ========== BARRA DE INPUT ========== */
.chat-input-bar--light {
  background: rgba(var(--v-theme-surface-bright), 0.5);
  border-radius: 0 0 var(--message-radius) var(--message-radius);
}

.chat-input-bar--dark {
  background: rgba(var(--v-theme-surface-dim), 0.8);
  border-radius: 0 0 var(--message-radius) var(--message-radius);
}

.chat-input {
  border-radius: 8px;
}

/* ========== ANIMAÇÕES ========== */
.animate-fade-in {
  animation: fadeInUp 0.7s cubic-bezier(.55,0,.1,1);
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ========== BOTÃO DE CONVITE ========== */
.invite-btn {
  opacity: 0;
  transition: opacity var(--transition-normal), transform var(--transition-normal);
}

.invite-btn:hover {
  transform: scale(1.1);
}

.user-list-item:hover .invite-btn {
  opacity: 1;
}

.invite-btn.v-btn--disabled {
  opacity: 0.5 !important;
}

/* ========== RESPONSIVIDADE ========== */
@media (max-width: 900px) {
  :root {
    --card-radius: 8px;
  }

  .invite-btn {
    opacity: 1; /* Sempre visível em telas menores */
  }
}

@media (max-width: 600px) {
  .chat-group-container--light,
  .chat-group-container--dark {
    padding: 0 2px;
  }

  :root {
    --card-radius: 4px;
  }

  .chat-messages {
    min-height: 180px;
    max-height: 220px;
  }

  .invite-btn {
    opacity: 1; /* Sempre visível em mobile */
  }
}
</style>
