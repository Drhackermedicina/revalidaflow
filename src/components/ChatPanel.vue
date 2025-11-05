<script setup>
defineProps({
  isDarkTheme: Boolean,
  timerDisplay: { type: String, required: true },
  conversationHistory: { type: Array, required: true },
  currentMessage: { type: String, required: true },
  isProcessingMessage: { type: Boolean, required: true },
  isListening: { type: Boolean, required: true },
  autoRecordMode: { type: Boolean, required: true },
  formatTimestamp: { type: Function, required: true },
  formatMessageText: { type: Function, required: true },
  showMicHint: { type: Boolean, default: false },
})

defineEmits([
  'sendMessage',
  'handleKeyPress',
  'toggleAutoRecordMode',
  'startListening',
  'stopListening',
  'update:currentMessage'
])
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
      <div v-if="conversationHistory.length === 0" class="text-center mt-2 chat-empty-state">
        <v-avatar size="72" class="mb-4" color="primary" variant="tonal">
          <v-icon size="48" color="primary-darken-2">ri-robot-2-fill</v-icon>
        </v-avatar>
        <h3 class="mb-2">Bem-vindo à Simulação com IA!</h3>
        <p class="text-medium-emphasis mb-4">
          Você pode interagir digitando no campo abaixo ou utilizando o microfone.
          Para gravar, clique no botão <strong>microfone</strong>; se preferir, ative o modo automático quando quiser.
        </p>
        <p class="text-medium-emphasis mb-4">
          Para liberar impressos pela IA, comece seus pedidos com a palavra <strong>"Solicito"</strong>, por exemplo: <strong>"Solicito exame físico"</strong>. Se quiser visualizar todos os materiais de uma vez, clique em <strong>"Liberar Impressos"</strong>.
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
      <div class="chat-input-row d-flex align-center w-100">
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
        />
        <v-tooltip location="top">
          <template #activator="{ props: tooltipProps }">
            <v-btn
              icon
              color="primary"
              class="ml-2"
              :disabled="isProcessingMessage || !currentMessage.trim() || isListening"
              v-bind="tooltipProps"
              @click="$emit('sendMessage')"
            >
              <v-icon>ri-send-plane-line</v-icon>
            </v-btn>
          </template>
          Clique para enviar a mensagem
        </v-tooltip>
        <v-tooltip
          :model-value="showMicHint"
          location="top"
          transition="scale-transition"
          open-on-focus
          open-on-hover
      >
        <template #activator="{ props: tooltipProps }">
          <v-btn
            id="chat-mic-button"
            color="primary"
            variant="tonal"
            size="large"
            class="ml-2"
            :disabled="isProcessingMessage"
            v-bind="tooltipProps"
            @click="() => isListening ? $emit('stopListening') : $emit('startListening')"
          >
            <v-icon>{{ isListening ? 'ri-stop-circle-line' : 'ri-mic-line' }}</v-icon>
          </v-btn>
        </template>
        {{ isListening ? 'Parar gravação' : 'Clique aqui para iniciar a gravação' }}
        </v-tooltip>
        <v-btn :color="autoRecordMode ? 'success' : 'grey'" variant="tonal" size="large" class="ml-2" @click="$emit('toggleAutoRecordMode')">
          <v-icon>{{ autoRecordMode ? 'ri-robot-2-line' : 'ri-user-voice-line' }}</v-icon>
          <v-tooltip activator="parent" location="top">{{ autoRecordMode ? 'Modo Automático' : 'Modo Manual' }}</v-tooltip>
        </v-btn>
      </div>
    </v-card-actions>
  </v-card>
</template>

<style scoped>
.chat-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden; /* Evita scroll duplo */
}

.chat-card-header {
  flex: 0 0 auto; /* Header fixo */
}

.chat-history {
  flex: 1 1 0; /* Ocupa espaço disponível */
  overflow-y: auto; /* Scroll apenas vertical */
  overflow-x: hidden;
  min-height: 0; /* Permite encolher */
  padding-bottom: 8px; /* Espaço no final */
}

.chat-input-actions {
  flex: 0 0 auto; /* Input fixo no bottom */
  margin-top: auto; /* Empurra para o bottom */
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
}

.chat-input-row {
  width: 100%;
}

/* Melhorar aparência das mensagens */
.message-item {
  margin-bottom: 16px;
}

.message-item:last-child {
  margin-bottom: 8px; /* Menos espaço na última mensagem */
}

/* Otimizar input field */
.chat-input-actions :deep(.v-text-field) {
  margin-bottom: 0;
}

.chat-input-actions :deep(.v-text-field .v-field) {
  min-height: 48px;
}

/* Estado vazio - centralizar conteúdo */
.chat-history:has(.text-center) {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
