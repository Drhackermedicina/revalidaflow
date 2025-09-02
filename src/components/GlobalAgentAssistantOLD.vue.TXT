<template>
  <div class="global-agent-wrapper">
    <!-- Botão flutuante sempre visível -->
    <VBtn
      v-if="!isOpen"
      color="primary"
      icon
      size="large"
      class="agent-floating-button"
      elevation="8"
      @click="toggleAgent"
    >
      <VIcon size="28">ri-robot-line</VIcon>
    </VBtn>

    <!-- Chat Interface -->
    <VCard
      v-if="isOpen"
      class="agent-chat-card"
      elevation="16"
    >
      <!-- Header do Chat -->
      <VCardTitle class="d-flex align-center justify-space-between pa-3">
        <div class="d-flex align-center">
          <VIcon color="primary" class="me-2">ri-robot-line</VIcon>
          <span class="text-h6">Revalida Assistant</span>
          <VChip 
            :color="isOnline ? 'success' : 'warning'" 
            size="small" 
            class="ms-2"
          >
            {{ isOnline ? 'Online' : 'Offline' }}
          </VChip>
        </div>
        <VBtn
          icon
          size="small"
          variant="text"
          @click="toggleAgent"
        >
          <VIcon>ri-close-line</VIcon>
        </VBtn>
      </VCardTitle>

      <VDivider />

      <!-- Área de Mensagens -->
      <VCardText class="chat-messages-area">
        <div
          ref="messagesContainer"
          class="messages-container"
        >
          <!-- Mensagem de boas-vindas personalizada por página -->
          <div class="message bot-message">
            <VAvatar color="primary" size="32" class="me-2">
              <VIcon color="white">ri-robot-line</VIcon>
            </VAvatar>
            <div class="message-content">
              <div class="message-text">
                {{ getWelcomeMessage() }}
              </div>
              <div class="message-time">{{ formatTime(new Date()) }}</div>
            </div>
          </div>

          <!-- Mensagens do chat -->
          <div
            v-for="(message, index) in messages"
            :key="index"
            :class="['message', message.type + '-message']"
          >
            <VAvatar
              v-if="message.type === 'bot'"
              color="primary"
              size="32"
              class="me-2"
            >
              <VIcon color="white">ri-robot-line</VIcon>
            </VAvatar>
            
            <div class="message-content">
              <div
                class="message-text"
                v-html="message.text"
              ></div>
              <div class="message-time">{{ formatTime(message.timestamp) }}</div>
            </div>

            <VAvatar
              v-if="message.type === 'user'"
              color="secondary"
              size="32"
              class="ms-2"
            >
              <VIcon color="white">ri-user-line</VIcon>
            </VAvatar>
          </div>

          <!-- Indicador de digitação -->
          <div
            v-if="isTyping"
            class="message bot-message typing-indicator"
          >
            <VAvatar color="primary" size="32" class="me-2">
              <VIcon color="white">ri-robot-line</VIcon>
            </VAvatar>
            <div class="message-content">
              <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        </div>
      </VCardText>

      <VDivider />

      <!-- Input de mensagem -->
      <VCardActions class="pa-3">
        <VTextField
          v-model="currentMessage"
          placeholder="Digite sua pergunta..."
          variant="outlined"
          density="compact"
          hide-details
          class="flex-grow-1 me-2"
          @keyup.enter="sendMessage"
          :disabled="isTyping"
        />
        <VBtn
          color="primary"
          icon
          @click="sendMessage"
          :loading="isTyping"
          :disabled="!currentMessage.trim()"
        >
          <VIcon>ri-send-plane-line</VIcon>
        </VBtn>
      </VCardActions>

      <!-- Sugestões rápidas baseadas na página -->
      <VCardText v-if="getQuickSuggestions().length > 0" class="pt-0">
        <div class="text-caption text-medium-emphasis mb-2">Sugestões rápidas:</div>
        <div class="d-flex flex-wrap gap-1">
          <VChip
            v-for="(suggestion, index) in getQuickSuggestions()"
            :key="index"
            size="small"
            variant="outlined"
            clickable
            @click="sendSuggestion(suggestion)"
          >
            {{ suggestion }}
          </VChip>
        </div>
      </VCardText>
    </VCard>
  </div>
</template>

<script setup>
import { currentUser } from '@/plugins/auth.js'
import { agentAssistantService } from '@/services/agentAssistantService.js'
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

// Estados do componente
const isOpen = ref(false)
const isTyping = ref(false)
const isOnline = ref(true)
const currentMessage = ref('')
const messages = ref([])
const messagesContainer = ref(null)

// Context da página atual
const pageContext = computed(() => {
  const path = route.path
  const name = route.name
  
  return {
    path,
    name,
    isStationList: path.includes('/station') || name === 'StationList',
    isEditStation: path.includes('/edit-station') || name === 'EditStation',
    isDashboard: path.includes('/dashboard') || name === 'Dashboard',
    isSimulation: path.includes('/simulation') || name === 'Simulation',
    isProfile: path.includes('/profile') || name === 'Profile',
    isAdmin: path.includes('/admin') || name === 'Admin'
  }
})

// Toggle do agente
const toggleAgent = () => {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    nextTick(() => {
      scrollToBottom()
    })
  }
}

// Mensagens de boas-vindas personalizadas por página
const getWelcomeMessage = () => {
  const context = pageContext.value
  
  if (context.isStationList) {
    return `🏥 Olá! Estou aqui para ajudar com as estações do Revalida. Posso explicar sobre estações específicas, critérios de avaliação, ou ajudar você a encontrar a estação ideal para treinar!`
  } else if (context.isEditStation) {
    return `✏️ Vou te ajudar a editar esta estação! Posso explicar sobre os campos, dar sugestões de conteúdo, ou ajudar com a configuração da avaliação.`
  } else if (context.isDashboard) {
    return `📊 Bem-vindo ao Dashboard! Posso te ajudar a interpretar suas estatísticas, sugerir estações para melhorar seu desempenho, ou explicar os gráficos de progresso.`
  } else if (context.isSimulation) {
    return `🎭 Estou aqui para te apoiar durante a simulação! Posso esclarecer dúvidas sobre o processo, dar dicas de avaliação, ou ajudar com questões técnicas.`
  } else if (context.isProfile) {
    return `👤 Vou te ajudar com seu perfil! Posso explicar as configurações, ajudar com a personalização, ou esclarecer sobre o sistema de pontuação.`
  } else if (context.isAdmin) {
    return `🔧 Modo Administrador ativo! Posso ajudar com o gerenciamento de usuários, análise de dados, configurações do sistema, ou relatórios detalhados.`
  } else {
    return `🤖 Olá! Sou o Revalida Assistant, seu companheiro de estudos para o Revalida. Como posso ajudar você hoje?`
  }
}

// Sugestões rápidas baseadas na página
const getQuickSuggestions = () => {
  const context = pageContext.value
  
  if (context.isStationList) {
    return [
      'Quais estações de Clínica Médica estão disponíveis?',
      'Como funciona a avaliação nas estações?',
      'Qual estação é mais difícil?',
      'Mostrar estatísticas das estações'
    ]
  } else if (context.isEditStation) {
    return [
      'Como configurar os critérios de avaliação?',
      'Quais campos são obrigatórios?',
      'Dicas para criar uma boa estação',
      'Como adicionar materiais de apoio?'
    ]
  } else if (context.isDashboard) {
    return [
      'Analisar meu desempenho geral',
      'Sugerir estações para melhorar',
      'Explicar minhas estatísticas',
      'Mostrar ranking atual'
    ]
  } else if (context.isSimulation) {
    return [
      'Como funciona a comunicação?',
      'Dicas para o candidato',
      'Critérios de avaliação',
      'Problemas técnicos'
    ]
  } else {
    return [
      'Como funciona o Revalida?',
      'Dicas de estudo',
      'Estatísticas gerais',
      'Configurações do sistema'
    ]
  }
}

// Enviar sugestão
const sendSuggestion = (suggestion) => {
  currentMessage.value = suggestion
  sendMessage()
}

// Enviar mensagem
const sendMessage = async () => {
  if (!currentMessage.value.trim() || isTyping.value) return;

  const userMessage = {
    type: 'user',
    text: currentMessage.value,
    timestamp: new Date(),
  };

  messages.value.push(userMessage);
  currentMessage.value = '';
  isTyping.value = true;

  await nextTick();
  scrollToBottom();

  try {
    const context = {
      page: pageContext.value,
      user: currentUser.value
        ? {
            uid: currentUser.value.uid,
            email: currentUser.value.email,
          }
        : null,
      timestamp: new Date().toISOString(),
    };

    const data = await agentAssistantService.query(userMessage.text, context);

    const botMessage = {
      type: 'bot',
      text: data.answer || 'Desculpe, não consegui processar sua pergunta no momento.',
      timestamp: new Date(),
    };

    messages.value.push(botMessage);
  } catch (error) {
    console.error('Erro ao enviar mensagem para o agente:', error);

    const errorMessage = {
      type: 'bot',
      text: `
        <div class="alert alert-error">
          <strong>❌ Erro de Conexão</strong><br>
          Não foi possível conectar com o assistente. Verifique sua conexão com a internet.
        </div>
      `,
      timestamp: new Date(),
    };

    messages.value.push(errorMessage);
  } finally {
    isTyping.value = false;
    await nextTick();
    scrollToBottom();
  }
};

// Scroll para o final
const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

// Formatação de tempo
const formatTime = (date) => {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

// Verificação de conectividade
const checkOnlineStatus = () => {
  isOnline.value = navigator.onLine
}

onMounted(() => {
  window.addEventListener('online', checkOnlineStatus)
  window.addEventListener('offline', checkOnlineStatus)
  checkOnlineStatus()
})

onUnmounted(() => {
  window.removeEventListener('online', checkOnlineStatus)
  window.removeEventListener('offline', checkOnlineStatus)
})
</script>

<style scoped>
.global-agent-wrapper {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 9999;
}

.agent-floating-button {
  position: fixed !important;
  bottom: 20px !important;
  right: 20px !important;
  z-index: 9999 !important;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15) !important;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) !important;
}

.agent-floating-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 35px rgba(0, 0, 0, 0.2) !important;
}

.agent-chat-card {
  position: fixed !important;
  bottom: 20px !important;
  right: 20px !important;
  width: 380px !important;
  max-height: 600px !important;
  z-index: 9999 !important;
  border-radius: 16px !important;
  overflow: hidden;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.15) !important;
}

.chat-messages-area {
  height: 350px;
  overflow: hidden;
  padding: 0 !important;
}

.messages-container {
  height: 100%;
  overflow-y: auto;
  padding: 16px;
  scroll-behavior: smooth;
}

.message {
  display: flex;
  margin-bottom: 16px;
  max-width: 100%;
}

.user-message {
  justify-content: flex-end;
}

.bot-message {
  justify-content: flex-start;
}

.message-content {
  max-width: 85%;
}

.user-message .message-content {
  text-align: right;
}

.message-text {
  background: rgb(var(--v-theme-surface-variant));
  padding: 12px 16px;
  border-radius: 18px;
  word-wrap: break-word;
  line-height: 1.4;
}

.user-message .message-text {
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
  border-bottom-right-radius: 6px;
}

.bot-message .message-text {
  border-bottom-left-radius: 6px;
}

.message-time {
  font-size: 0.75rem;
  color: rgb(var(--v-theme-on-surface-variant));
  margin-top: 4px;
  opacity: 0.7;
}

.typing-indicator .message-text {
  background: rgb(var(--v-theme-surface-variant));
  padding: 16px 20px;
}

.typing-dots {
  display: flex;
  gap: 4px;
}

.typing-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgb(var(--v-theme-primary));
  animation: typing 1.4s infinite ease-in-out;
}

.typing-dots span:nth-child(1) { animation-delay: -0.32s; }
.typing-dots span:nth-child(2) { animation-delay: -0.16s; }
.typing-dots span:nth-child(3) { animation-delay: 0s; }

@keyframes typing {
  0%, 80%, 100% {
    transform: scale(0);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.alert {
  padding: 12px;
  border-radius: 8px;
  margin: 8px 0;
}

.alert-warning {
  background: rgb(var(--v-theme-warning-container));
  color: rgb(var(--v-theme-on-warning-container));
  border: 1px solid rgb(var(--v-theme-warning));
}

.alert-error {
  background: rgb(var(--v-theme-error-container));
  color: rgb(var(--v-theme-on-error-container));
  border: 1px solid rgb(var(--v-theme-error));
}

/* Responsividade */
@media (max-width: 480px) {
  .agent-chat-card {
    width: calc(100vw - 40px) !important;
    max-width: 380px !important;
  }
}
</style>
