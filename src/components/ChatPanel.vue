<script setup>
import { computed } from 'vue'

const props = defineProps({
  isDarkTheme: Boolean,
  timerDisplay: { type: String, required: true },
  conversationHistory: { type: Array, required: true },
  currentMessage: { type: String, required: true },
  isProcessingMessage: { type: Boolean, required: true },
  isListening: { type: Boolean, required: true },
  autoRecordMode: { type: Boolean, required: true },
  formatTimestamp: { type: Function, required: true },
  formatMessageText: { type: Function, required: true },
})

const emits = defineEmits(['sendMessage', 'handleKeyPress', 'toggleAutoRecordMode', 'startListening', 'stopListening', 'update:currentMessage'])
</script>

<template>
  <v-card class="chat-card" flat>
    <v-card-title class="chat-card-header d-flex align-center py-3" style="flex:0 0 auto;">
      <v-icon class="me-2 chat-title-icon" size="26">ri-message-3-line</v-icon>
      <span class="chat-title">Chat</span>
      <v-spacer />
      <div class="chat-timer">
        <v-icon size="20">ri-timer-line</v-icon>
        <span>{{ timerDisplay }}</span>
      </div>
    </v-card-title>
    <v-divider />

    <div class="chat-history pa-4" :class="{ 'dark-theme': isDarkTheme }">
      <div v-if="conversationHistory.length === 0" class="text-center mt-2">
        <v-icon size="64" color="grey-lighten-1" class="mb-4">ri-robot-line</v-icon>
        <h3 class="mb-2">Bem-vindo à Simulação com IA!</h3>
        <p class="text-medium-emphasis mb-4">
          Você pode interagir com o paciente virtual usando sua voz ou digitando no campo abaixo.
          O microfone será ativado automaticamente ao iniciar a simulação.
        </p>
        <p class="text-medium-emphasis">
          Para finalizar a simulação a qualquer momento, utilize o botão "Finalizar" no painel de controles.
        </p>
      </div>

      <div v-for="(message, index) in conversationHistory" :key="index" class="message-item mb-4">
        <div class="message-header d-flex align-center mb-1">
          <v-avatar size="24" :color="message.role === 'candidate' ? 'blue' : message.role === 'ai_actor' ? 'green' : 'orange'" class="me-2">
            <v-icon size="12" color="white">{{ message.role === 'candidate' ? 'ri-user-line' : message.role === 'ai_actor' ? 'ri-robot-line' : 'ri-information-line' }}</v-icon>
          </v-avatar>
          <div class="text-body-2 font-weight-medium">{{ message.role === 'candidate' ? 'Você' : message.role === 'ai_actor' ? 'Paciente Virtual' : 'Sistema' }}</div>
          <v-spacer />
          <div class="text-caption text-medium-emphasis">{{ formatTimestamp(message.timestamp) }}</div>
        </div>
        <div class="message-content pa-3 rounded" v-html="formatMessageText(message.content || message.message)" />
      </div>
    </div>

    <v-card-actions class="pa-4 chat-input-actions">
      <v-text-field
        id="chat-message-input"
        :model-value="currentMessage"
        @update:model-value="$emit('update:currentMessage', $event)"
        label="Digite ou fale sua pergunta..."
        variant="outlined"
        density="comfortable"
        :disabled="isProcessingMessage"
        @keydown="$emit('handleKeyPress', $event)"
        hide-details
        class="flex-1-1"
        append-inner-icon="ri-send-plane-line"
        @click:append-inner="$emit('sendMessage')"
      />
      <v-btn :color="autoRecordMode ? 'success' : 'grey'" variant="tonal" size="large" class="ml-2" @click="$emit('toggleAutoRecordMode')">
        <v-icon>{{ autoRecordMode ? 'ri-robot-2-line' : 'ri-user-voice-line' }}</v-icon>
        <v-tooltip activator="parent" location="top">{{ autoRecordMode ? 'Modo Automático' : 'Modo Manual' }}</v-tooltip>
      </v-btn>
      <v-btn color="primary" variant="tonal" size="large" class="ml-2" :disabled="isProcessingMessage" @click="() => isListening ? $emit('stopListening') : $emit('startListening')">
        <v-icon>{{ isListening ? 'ri-mic-fill' : 'ri-mic-line' }}</v-icon>
        <v-tooltip activator="parent" location="top">{{ isListening ? 'Parar' : 'Gravar' }}</v-tooltip>
      </v-btn>
    </v-card-actions>
  </v-card>
</template>
