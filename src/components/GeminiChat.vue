<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { geminiService } from '@/services/geminiService.js'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])

const messages = ref([])
const userInput = ref('')
const isLoading = ref(false)
const chatContainer = ref(null)

// Mensagem inicial do Gemini
const initialMessage = {
  id: Date.now(),
  text: 'Olá! Sou o Gemini, seu assistente de IA. Como posso ajudá-lo hoje com suas dúvidas sobre medicina ou o Revalida?',
  sender: 'gemini',
  timestamp: new Date()
}

messages.value.push(initialMessage)

const sendMessage = async () => {
  if (!userInput.value.trim() || isLoading.value) return

  const userMessage = {
    id: Date.now(),
    text: userInput.value.trim(),
    sender: 'user',
    timestamp: new Date()
  }

  messages.value.push(userMessage)
  userInput.value = ''
  isLoading.value = true

  try {
    const response = await geminiService.makeRequest(userMessage.text)
    
    const geminiMessage = {
      id: Date.now() + 1,
      text: response,
      sender: 'gemini',
      timestamp: new Date()
    }

    messages.value.push(geminiMessage)
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error)
    
    const errorMessage = {
      id: Date.now() + 1,
      text: 'Desculpe, estou enfrentando problemas técnicos no momento. Por favor, tente novamente mais tarde.',
      sender: 'gemini',
      timestamp: new Date(),
      isError: true
    }

    messages.value.push(errorMessage)
  } finally {
    isLoading.value = false
    scrollToBottom()
  }
}

const scrollToBottom = () => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
}

const handleKeyPress = (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    sendMessage()
  }
}

onMounted(() => {
  scrollToBottom()
})
</script>

<template>
  <div class="gemini-chat">
    <div class="chat-header">
      <div class="header-content">
        <img 
          src="/src/assets/images/svg/google-gemini-icon.webp" 
          alt="Gemini" 
          class="gemini-icon"
        />
        <div class="header-text">
          <h3>Gemini IA</h3>
          <span class="status">Conectado</span>
        </div>
      </div>
      <VBtn
        icon
        size="small"
        variant="text"
        @click="emit('close')"
        class="close-btn"
      >
        <VIcon icon="ri-close-line" />
      </VBtn>
    </div>

    <div ref="chatContainer" class="chat-messages">
      <div
        v-for="message in messages"
        :key="message.id"
        :class="['message', message.sender, { error: message.isError }]"
      >
        <div class="message-content">
          <div class="message-text">{{ message.text }}</div>
          <div class="message-time">
            {{ message.timestamp.toLocaleTimeString('pt-BR', { 
              hour: '2-digit', 
              minute: '2-digit' 
            }) }}
          </div>
        </div>
      </div>
      
      <div v-if="isLoading" class="message gemini loading">
        <div class="message-content">
          <div class="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    </div>

    <div class="chat-input">
      <VTextarea
        v-model="userInput"
        placeholder="Digite sua mensagem..."
        variant="outlined"
        rows="1"
        auto-grow
        hide-details
        @keydown="handleKeyPress"
        class="input-field"
        :disabled="isLoading"
      />
      <VBtn
        :disabled="!userInput.trim() || isLoading"
        @click="sendMessage"
        class="send-btn"
        color="primary"
      >
        <VIcon icon="ri-send-plane-fill" />
      </VBtn>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.gemini-chat {
  display: flex;
  flex-direction: column;
  height: 600px;
  max-height: 80vh;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: linear-gradient(90deg, #7b1fa2 0%, #00bcd4 100%);
  color: white;
  
  .header-content {
    display: flex;
    align-items: center;
    gap: 12px;
    
    .gemini-icon {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #fff;
      padding: 4px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }
    
    .header-text {
      h3 {
        margin: 0;
        font-size: 1.1rem;
        font-weight: 600;
      }
      
      .status {
        font-size: 0.75rem;
        opacity: 0.9;
      }
    }
  }
  
  .close-btn {
    color: white !important;
    
    &:hover {
      background: rgba(255, 255, 255, 0.1) !important;
    }
  }
}

.chat-messages {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  background: #f8f9fa;
  
  .message {
    margin-bottom: 16px;
    display: flex;
    
    &.user {
      justify-content: flex-end;
      
      .message-content {
        background: linear-gradient(135deg, #7b1fa2 0%, #00bcd4 100%);
        color: white;
        border-radius: 18px 18px 4px 18px;
      }
    }
    
    &.gemini {
      justify-content: flex-start;
      
      .message-content {
        background: white;
        color: #333;
        border: 1px solid #e0e0e0;
        border-radius: 18px 18px 18px 4px;
      }
      
      &.loading .message-content {
        background: transparent;
        border: none;
      }
    }
    
    &.error .message-content {
      background: #ffebee;
      color: #c62828;
      border: 1px solid #ffcdd2;
    }
    
    .message-content {
      max-width: 80%;
      padding: 12px 16px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      
      .message-text {
        margin-bottom: 4px;
        line-height: 1.4;
        white-space: pre-wrap;
      }
      
      .message-time {
        font-size: 0.75rem;
        opacity: 0.7;
        text-align: right;
      }
    }
  }
  
  .typing-indicator {
    display: flex;
    gap: 4px;
    
    span {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #7b1fa2;
      animation: typing 1.4s infinite ease-in-out;
      
      &:nth-child(2) { animation-delay: 0.2s; }
      &:nth-child(3) { animation-delay: 0.4s; }
    }
  }
  
  @keyframes typing {
    0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
    30% { transform: translateY(-4px); opacity: 1; }
  }
}

.chat-input {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  padding: 16px 20px;
  background: white;
  border-top: 1px solid #e0e0e0;
  
  .input-field {
    flex: 1;
    
    :deep(.v-field) {
      background: #f8f9fa;
      
      &:focus-within {
        background: white;
      }
    }
  }
  
  .send-btn {
    height: 48px;
    min-width: 48px;
    
    &:disabled {
      opacity: 0.5;
    }
  }
}
</style>
