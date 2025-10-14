<script setup>
import { onMounted } from 'vue'
import { useMedicalChat } from '@/composables/useMedicalChat.js'

defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])

// Usar composable médico otimizado
const {
  messages,
  userInput,
  isLoading,
  chatContainer,
  isDark,
  initializeChat,
  sendMessage,
  clearChat,
  handleKeyPress,
  scrollToBottom
} = useMedicalChat()

// Referência para o textarea customizado
const inputTextarea = ref(null)

onMounted(() => {
  initializeChat()
  scrollToBottom()

  // Inicializar auto-resize do textarea
  nextTick(() => {
    if (inputTextarea.value) {
      autoResizeTextarea({ target: inputTextarea.value })
    }
  })
})

// Métodos auxiliares otimizados
const formatTime = (timestamp) => {
  return timestamp.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatMessage = (text) => {
  // Formatação básica para melhor legibilidade médica
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Negrito
    .replace(/\*(.*?)\*/g, '<em>$1</em>') // Itálico
    .replace(/\n/g, '<br>') // Quebras de linha
}

// Auto-resize para textarea customizado
const autoResizeTextarea = (event) => {
  const textarea = event.target
  textarea.style.height = 'auto'
  textarea.style.height = textarea.scrollHeight + 'px'
}
</script>

<template>
  <div class="medical-chat" :class="{ 'theme-dark': isDark }">
    <!-- Header médico otimizado -->
    <div class="chat-header">
      <div class="header-content">
        <div class="medical-icon">
          <VIcon icon="mdi-robot" size="24" />
        </div>
        <div class="header-text">
          <h3>Assistente Médico IA</h3>
          <span class="status">🤖 Especialista em Medicina</span>
        </div>
      </div>
      <div class="header-actions">
        <VBtn
          icon="mdi-refresh"
          size="small"
          variant="text"
          @click="clearChat"
          title="Limpar conversa"
        />
        <VBtn
          icon="ri-close-line"
          size="small"
          variant="text"
          @click="emit('close')"
        />
      </div>
    </div>

    <!-- Área de mensagens otimizada -->
    <div ref="chatContainer" class="chat-messages">
      <div
        v-for="message in messages"
        :key="message.id"
        :class="['message', message.sender, message.type, { error: message.isError }]"
      >
        <div class="message-content">
          <div class="message-text" v-html="formatMessage(message.text)" />
          <div class="message-time">
            {{ formatTime(message.timestamp) }}
          </div>
        </div>
      </div>

      <div v-if="isLoading" class="message gemini loading">
        <div class="message-content">
          <div class="typing-indicator">
            <span></span><span></span><span></span>
          </div>
        </div>
      </div>
    </div>

    <!-- Input médico otimizado -->
    <div class="chat-input">
      <textarea
        ref="inputTextarea"
        v-model="userInput"
        placeholder="Digite sua dúvida médica..."
        @keydown="handleKeyPress"
        @input="autoResizeTextarea"
        class="custom-textarea"
        :disabled="isLoading"
        :style="{
          backgroundColor: isDark ? '#312d4b' : '#ffffff',
          color: isDark ? '#E7E3FC' : '#2E263D',
          borderColor: isDark ? '#5E6692' : '#E0E0E0'
        }"
      />
      <VBtn
        :disabled="!userInput.trim() || isLoading"
        @click="sendMessage"
        class="send-btn"
        color="primary"
        :loading="isLoading"
      >
        <VIcon icon="ri-send-plane-fill" />
      </VBtn>
    </div>
  </div>
</template>

<style lang="scss" scoped>
// Tema base otimizado
.medical-chat {
  display: flex;
  flex-direction: column;
  height: 600px;
  max-height: 80vh;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  background: rgb(var(--v-theme-surface));
  transition: all 0.2s ease;

  &.theme-dark {
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }
}

// Header médico moderno
.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: linear-gradient(135deg, rgb(var(--v-theme-primary)) 0%, rgb(var(--v-theme-info)) 100%);
  color: rgb(var(--v-theme-on-primary));

  .header-content {
    display: flex;
    align-items: center;
    gap: 12px;

    .medical-icon {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(8px);
    }

    .header-text {
      h3 {
        margin: 0;
        font-size: 1.1rem;
        font-weight: 600;
        line-height: 1.2;
      }

      .status {
        font-size: 0.75rem;
        opacity: 0.9;
        display: flex;
        align-items: center;
        gap: 4px;
      }
    }
  }

  .header-actions {
    display: flex;
    gap: 4px;
  }
}

// Área de mensagens otimizada
.chat-messages {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  background: rgb(var(--v-theme-background));
  scroll-behavior: smooth;

  // Scrollbar customizado
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgb(var(--v-theme-outline));
    border-radius: 3px;

    &:hover {
      background: rgb(var(--v-theme-outline-variant));
    }
  }

  .message {
    margin-bottom: 16px;
    display: flex;
    animation: fadeIn 0.3s ease-out;

    &.user {
      justify-content: flex-end;

      .message-content {
        background: linear-gradient(135deg, rgb(var(--v-theme-primary)) 0%, rgb(var(--v-theme-info)) 100%);
        color: rgb(var(--v-theme-on-primary));
        border-radius: 20px 20px 6px 20px;
        margin-left: 20%;
      }
    }

    &.gemini {
      justify-content: flex-start;

      .message-content {
        background: rgb(var(--v-theme-surface));
        color: rgb(var(--v-theme-on-surface));
        border: 1px solid rgb(var(--v-theme-outline-variant));
        border-radius: 20px 20px 20px 6px;
        margin-right: 20%;

        // Garantir contraste adequado em ambos os temas
        .message-text {
          color: rgb(var(--v-theme-on-surface)) !important;
          font-weight: 400;
          line-height: 1.5;
        }

        .message-time {
          color: rgb(var(--v-theme-on-surface-variant)) !important;
          font-weight: 500;
        }
      }

      &.loading .message-content {
        background: transparent;
        border: none;
        padding: 16px;
      }

      &.medical .message-content {
        border-left: 4px solid rgb(var(--v-theme-success));
        background: rgb(var(--v-theme-surface));
        position: relative;

        &::before {
          content: '🤖';
          position: absolute;
          top: -8px;
          left: -8px;
          background: rgb(var(--v-theme-success));
          color: rgb(var(--v-theme-on-success));
          border-radius: 50%;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
      }
    }

    &.error .message-content {
      background: rgb(var(--v-theme-error-container));
      color: rgb(var(--v-theme-on-error-container));
      border: 1px solid rgb(var(--v-theme-error));
    }

    .message-content {
      max-width: 80%;
      padding: 14px 18px;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
      word-wrap: break-word;

      .message-text {
        margin-bottom: 6px;
        line-height: 1.5;

        :deep(strong) {
          color: rgb(var(--v-theme-primary));
          font-weight: 600;
        }

        :deep(em) {
          font-style: italic;
          opacity: 0.9;
        }
      }

      .message-time {
        font-size: 0.7rem;
        opacity: 0.6;
        text-align: right;
        font-weight: 500;
      }
    }
  }

  .typing-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 16px 18px;
    color: rgb(var(--v-theme-on-surface-variant));
    font-size: 0.875rem;
    font-style: italic;

    &::before {
      content: '🤖';
      font-size: 1rem;
    }

    span {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: rgb(var(--v-theme-primary));
      animation: typing 1.4s infinite ease-in-out;
      box-shadow: 0 0 6px rgba(var(--v-theme-primary), 0.5);

      &:nth-child(2) { animation-delay: 0.2s; }
      &:nth-child(3) { animation-delay: 0.4s; }
    }
  }
}

// Input médico otimizado
.chat-input {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  padding: 16px 20px;
  background: rgb(var(--v-theme-surface));
  border-top: 1px solid rgb(var(--v-theme-outline-variant));

  .custom-textarea {
    flex: 1;
    min-height: 48px;
    max-height: 120px;
    padding: 12px 16px;
    border: 1px solid;
    border-radius: 12px;
    font-family: inherit;
    font-size: 14px;
    line-height: 1.5;
    resize: none;
    outline: none;
    transition: all 0.2s ease;
    overflow-y: auto;

    &::placeholder {
      color: inherit;
      opacity: 0.6;
    }

    &:focus {
      border-color: rgb(var(--v-theme-primary));
      box-shadow: 0 0 0 2px rgba(var(--v-theme-primary), 0.2);
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    // Auto-resize functionality
    &[data-replicated-value] {
      height: auto;
      overflow: hidden;
    }
  }

  .send-btn {
    height: 48px;
    min-width: 48px;
    border-radius: 12px;
  }
}

// Animações otimizadas
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  30% {
    transform: translateY(-6px);
    opacity: 1;
  }
}

// Responsividade
@media (max-width: 768px) {
  .medical-chat {
    height: 100vh;
    max-height: 100vh;
    border-radius: 0;
  }

  .chat-messages {
    padding: 16px;

    .message .message-content {
      max-width: 90%;
      margin-left: 5% !important;
      margin-right: 5% !important;
    }
  }

  .chat-header {
    padding: 12px 16px;

    .header-text h3 {
      font-size: 1rem;
    }
  }
}
</style>
