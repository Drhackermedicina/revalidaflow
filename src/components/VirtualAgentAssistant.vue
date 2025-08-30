<template>
  <v-card class="virtual-agent-panel" elevation="3">
    <!-- Header -->
    <v-card-title class="d-flex align-center">
      <v-avatar color="primary" class="mr-3">
        <v-icon color="white">{{ agentIcon }}</v-icon>
      </v-avatar>
      <div>
        <div class="text-h6">{{ agentName }}</div>
        <div class="text-caption">{{ agentRole === 'actor' ? 'Paciente Virtual' : 'Avaliador Virtual' }}</div>
      </div>
      <v-spacer></v-spacer>
      <v-chip 
        :color="isActive ? 'success' : 'grey'"
        size="small"
      >
        {{ isActive ? 'Ativo' : 'Inativo' }}
      </v-chip>
    </v-card-title>

    <!-- Controles do Agente -->
    <v-card-text>
      <div v-if="!isActive" class="text-center mb-4">
        <v-btn
          @click="startVirtualAgent"
          color="primary"
          size="large"
          prepend-icon="mdi-play"
          :loading="starting"
        >
          Iniciar {{ agentRole === 'actor' ? 'Paciente' : 'Avaliador' }} Virtual
        </v-btn>
        
        <div class="mt-2">
          <v-btn-toggle v-model="selectedRole" mandatory color="primary">
            <v-btn value="actor">
              <v-icon>mdi-account</v-icon>
              Paciente
            </v-btn>
            <v-btn value="evaluator">
              <v-icon>mdi-clipboard-check</v-icon>
              Avaliador
            </v-btn>
          </v-btn-toggle>
        </div>
      </div>

      <!-- Chat Interface -->
      <div v-if="isActive" class="chat-interface">
        <!-- Área de Mensagens -->
        <v-card 
          ref="chatContainer"
          height="300"
          class="chat-messages mb-3"
          variant="outlined"
          style="overflow-y: auto;"
        >
          <v-card-text>
            <div v-if="messages.length === 0" class="text-center text-grey">
              <v-icon size="48" color="grey">mdi-chat-outline</v-icon>
              <p>Inicie a conversa com seu {{ agentRole === 'actor' ? 'paciente' : 'avaliador' }} virtual</p>
            </div>
            
            <div 
              v-for="message in messages" 
              :key="message.id"
              class="message-item mb-3"
            >
              <v-card 
                :color="message.sender === 'user' ? 'primary' : agentRole === 'actor' ? 'info' : 'success'"
                :class="message.sender === 'user' ? 'ml-8' : 'mr-8'"
                variant="flat"
              >
                <v-card-text>
                  <div class="d-flex align-center mb-2">
                    <v-avatar size="24" class="mr-2">
                      <v-icon 
                        :color="message.sender === 'user' ? 'white' : 'white'"
                        size="small"
                      >
                        {{ message.sender === 'user' ? 'mdi-account' : 
                           agentRole === 'actor' ? 'mdi-account-heart' : 'mdi-clipboard-account' }}
                      </v-icon>
                    </v-avatar>
                    <span class="text-caption text-white font-weight-medium">
                      {{ message.sender === 'user' ? 'Você' : 
                         agentRole === 'actor' ? agentName : 'Avaliador Virtual' }}
                    </span>
                    <v-spacer></v-spacer>
                    <span class="text-caption text-white opacity-75">
                      {{ formatTime(message.timestamp) }}
                    </span>
                  </div>
                  <div class="text-white">
                    {{ message.text }}
                  </div>
                  
                  <!-- Controles de Áudio -->
                  <div v-if="message.sender === 'agent' && voiceEnabled" class="mt-2">
                    <v-btn
                      @click="playMessage(message)"
                      size="small"
                      variant="outlined"
                      color="white"
                      :loading="playingAudio === message.id"
                    >
                      <v-icon>mdi-volume-high</v-icon>
                    </v-btn>
                  </div>
                </v-card-text>
              </v-card>
            </div>
          </v-card-text>
        </v-card>

        <!-- Input de Mensagem -->
        <div class="message-input">
          <v-text-field
            v-model="currentMessage"
            @keyup.enter="sendMessage"
            placeholder="Digite sua mensagem..."
            variant="outlined"
            density="compact"
            hide-details
            append-inner-icon="mdi-send"
            @click:append-inner="sendMessage"
            :loading="sendingMessage"
          >
            <template #prepend-inner>
              <v-btn
                @click="toggleVoiceInput"
                :color="voiceInputActive ? 'error' : 'primary'"
                size="small"
                variant="text"
                icon
              >
                <v-icon>{{ voiceInputActive ? 'mdi-microphone-off' : 'mdi-microphone' }}</v-icon>
              </v-btn>
            </template>
          </v-text-field>
        </div>

        <!-- Controles de Voz -->
        <div class="voice-controls mt-2">
          <v-switch
            v-model="voiceEnabled"
            label="Resposta por voz"
            color="primary"
            hide-details
            density="compact"
          ></v-switch>
          
          <v-btn
            v-if="agentRole === 'evaluator'"
            @click="requestFeedback"
            color="success"
            size="small"
            class="ml-2"
            :loading="requestingFeedback"
          >
            <v-icon>mdi-comment-text</v-icon>
            Solicitar Feedback
          </v-btn>
        </div>

        <!-- Sugestões Rápidas -->
        <v-expansion-panels class="mt-3">
          <v-expansion-panel>
            <v-expansion-panel-title>
              <v-icon class="mr-2">mdi-lightbulb</v-icon>
              Sugestões Rápidas
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <v-chip-group>
                <v-chip 
                  v-for="suggestion in quickSuggestions"
                  :key="suggestion"
                  @click="sendQuickMessage(suggestion)"
                  size="small"
                  variant="outlined"
                  color="primary"
                >
                  {{ suggestion }}
                </v-chip>
              </v-chip-group>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>

        <!-- Botão para Finalizar -->
        <div class="text-center mt-3">
          <v-btn
            @click="stopVirtualAgent"
            color="error"
            variant="outlined"
            prepend-icon="mdi-stop"
          >
            Finalizar Agente Virtual
          </v-btn>
        </div>
      </div>
    </v-card-text>

    <!-- Snackbar para Notificações -->
    <v-snackbar
      v-model="showSnackbar"
      :color="snackbarColor"
      timeout="3000"
      location="top"
    >
      {{ snackbarMessage }}
      <template #actions>
        <v-btn variant="text" @click="showSnackbar = false">
          Fechar
        </v-btn>
      </template>
    </v-snackbar>
  </v-card>
</template>

<script setup>
import { virtualActorService } from '@/services/virtualActorService.js';
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';

// Props
const props = defineProps({
  stationId: {
    type: String,
    required: true
  },
  initialRole: {
    type: String,
    default: 'actor',
    validator: value => ['actor', 'evaluator'].includes(value)
  }
});

// Estado do agente
const isActive = ref(false);
const selectedRole = ref(props.initialRole);
const agentRole = ref(props.initialRole);
const starting = ref(false);

// Chat
const messages = ref([]);
const currentMessage = ref('');
const sendingMessage = ref(false);
const chatContainer = ref(null);

// Voz
const voiceEnabled = ref(false);
const voiceInputActive = ref(false);
const playingAudio = ref(null);
const requestingFeedback = ref(false);

// Notificações
const showSnackbar = ref(false);
const snackbarMessage = ref('');
const snackbarColor = ref('info');

// Dados computados
const agentName = computed(() => {
  if (agentRole.value === 'actor') {
    return 'Dr. Virtual';
  } else {
    return 'Prof. Avaliador';
  }
});

const agentIcon = computed(() => {
  return agentRole.value === 'actor' ? 'mdi-account-heart' : 'mdi-clipboard-account';
});

const quickSuggestions = computed(() => {
  if (agentRole.value === 'actor') {
    return [
      'Olá, como está se sentindo?',
      'Pode me contar seus sintomas?',
      'Há quanto tempo isso começou?',
      'Tem alguma alergia?',
      'Toma algum medicamento?'
    ];
  } else {
    return [
      'Como você avalia minha performance?',
      'O que posso melhorar?',
      'Estou no caminho certo?',
      'Pode dar feedback sobre a anamnese?',
      'Qual minha pontuação até agora?'
    ];
  }
});

// Métodos principais
const startVirtualAgent = async () => {
  starting.value = true;
  agentRole.value = selectedRole.value;
  
  try {
    const welcomeResponse = await virtualActorService.startVirtualSimulation(
      props.stationId, 
      agentRole.value
    );
    
    isActive.value = true;
    addMessage('agent', welcomeResponse.text);
    showNotification(`${agentRole.value === 'actor' ? 'Paciente' : 'Avaliador'} virtual iniciado!`, 'success');
  } catch (error) {
    showNotification(`Erro ao iniciar agente: ${error.message}`, 'error');
  } finally {
    starting.value = false;
  }
};

const stopVirtualAgent = async () => {
  try {
    const farewellResponse = await virtualActorService.endVirtualSimulation(
      props.stationId, 
      agentRole.value
    );
    
    addMessage('agent', farewellResponse.text);
    
    setTimeout(() => {
      isActive.value = false;
      messages.value = [];
      showNotification('Agente virtual finalizado', 'info');
    }, 2000);
  } catch (error) {
    showNotification(`Erro ao finalizar agente: ${error.message}`, 'error');
  }
};

const sendMessage = async () => {
  if (!currentMessage.value.trim() || sendingMessage.value) return;
  
  const userMessage = currentMessage.value.trim();
  currentMessage.value = '';
  
  addMessage('user', userMessage);
  
  sendingMessage.value = true;
  try {
    const response = await virtualActorService.sendMessage(
      props.stationId,
      userMessage,
      { type: 'conversation', role: agentRole.value },
      { role: agentRole.value, voiceEnabled: voiceEnabled.value }
    );
    
    addMessage('agent', response.text);
    
    // Se áudio estiver habilitado e disponível
    if (voiceEnabled.value && response.audioUrl) {
      // TODO: Reproduzir áudio automaticamente
    }
  } catch (error) {
    addMessage('agent', 'Desculpe, tive um problema técnico. Pode repetir?');
    showNotification(`Erro: ${error.message}`, 'error');
  } finally {
    sendingMessage.value = false;
  }
};

const sendQuickMessage = (message) => {
  currentMessage.value = message;
  sendMessage();
};

const requestFeedback = async () => {
  if (agentRole.value !== 'evaluator') return;
  
  requestingFeedback.value = true;
  try {
    const feedbackResponse = await virtualActorService.requestFeedback(
      props.stationId,
      { type: 'general_feedback' }
    );
    
    addMessage('agent', feedbackResponse.text);
  } catch (error) {
    showNotification(`Erro ao solicitar feedback: ${error.message}`, 'error');
  } finally {
    requestingFeedback.value = false;
  }
};

// Métodos de voz
const toggleVoiceInput = async () => {
  if (!voiceInputActive.value) {
    try {
      const result = await virtualActorService.speechToText();
      if (result.text) {
        currentMessage.value = result.text;
      }
    } catch (error) {
      showNotification('Erro no reconhecimento de voz', 'error');
    }
  }
  voiceInputActive.value = !voiceInputActive.value;
};

const playMessage = async (message) => {
  if (playingAudio.value === message.id) return;
  
  playingAudio.value = message.id;
  try {
    await virtualActorService.textToSpeech(message.text);
  } catch (error) {
    showNotification('Erro na síntese de voz', 'error');
  } finally {
    playingAudio.value = null;
  }
};

// Métodos utilitários
const addMessage = (sender, text) => {
  const message = {
    id: Date.now(),
    sender,
    text,
    timestamp: new Date()
  };
  
  messages.value.push(message);
  
  nextTick(() => {
    if (chatContainer.value) {
      const element = chatContainer.value.$el.querySelector('.v-card-text');
      element.scrollTop = element.scrollHeight;
    }
  });
};

const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

const showNotification = (message, color = 'info') => {
  snackbarMessage.value = message;
  snackbarColor.value = color;
  showSnackbar.value = true;
};

// Lifecycle
onMounted(() => {
  // Pode iniciar automaticamente se necessário
});

onUnmounted(() => {
  if (isActive.value) {
    stopVirtualAgent();
  }
});
</script>

<style scoped>
.virtual-agent-panel {
  max-width: 100%;
  height: fit-content;
}

.chat-messages {
  border: 1px solid rgba(0, 0, 0, 0.12);
  background-color: #fafafa;
}

.message-item {
  animation: fadeInUp 0.3s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.voice-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.message-input {
  position: relative;
}

.v-btn-toggle {
  border-radius: 8px;
}

.chat-interface {
  max-width: 100%;
}

.v-expansion-panels {
  background-color: transparent;
}

.v-chip-group {
  gap: 8px;
}
</style>
