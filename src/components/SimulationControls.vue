<script setup>
import { ref, watch } from 'vue'
// Props necessárias para o componente
const props = defineProps({
  // Estados da simulação
  simulationStarted: {
    type: Boolean,
    default: false
  },
  simulationEnded: {
    type: Boolean,
    default: false
  },
  // Estados de ready
  myReadyState: {
    type: Boolean,
    default: false
  },
  bothParticipantsReady: {
    type: Boolean,
    default: false
  },
  backendActivated: {
    type: Boolean,
    default: false
  },
  candidateReadyButtonEnabled: {
    type: Boolean,
    default: false
  },
  actorReadyButtonEnabled: {
    type: Boolean,
    default: true
  },
  // Método de comunicação
  communicationMethod: {
    type: String,
    default: 'none'
  },
  meetLink: {
    type: String,
    default: ''
  },
  // Link de convite
  inviteLinkToShow: {
    type: String,
    default: ''
  },
  copySuccess: {
    type: Boolean,
    default: false
  },
  chatSentSuccess: {
    type: Boolean,
    default: false
  },
  sendingChat: {
    type: Boolean,
    default: false
  },
  // Candidato selecionado
  selectedCandidateForSimulation: {
    type: Object,
    default: null
  },
  // Permissões
  isActorOrEvaluator: {
    type: Boolean,
    default: false
  },
  isCandidate: {
    type: Boolean,
    default: false
  }
})

// Emits para comunicação com o componente pai
const emit = defineEmits([
  'update:communicationMethod',
  'update:meetLink',
  'openGoogleMeet',
  'generateInviteLinkWithDuration',
  'copyInviteLink',
  'sendLinkViaPrivateChat',
  'sendReady',
  'handleStartSimulationClick'
])

// Valores locais para sincronização com props
const localCommunicationMethod = ref(props.communicationMethod)
const localMeetLink = ref(props.meetLink)

// Sincronizar valores locais quando props mudam
watch(() => props.communicationMethod, (newValue) => {
  localCommunicationMethod.value = newValue
})

watch(() => props.meetLink, (newValue) => {
  localMeetLink.value = newValue
})

// Sincronizar mudanças locais de volta para o pai
watch(localCommunicationMethod, (newValue) => {
  emit('update:communicationMethod', newValue)
})

watch(localMeetLink, (newValue) => {
  emit('update:meetLink', newValue)
})

// Funções para emitir eventos
function handleOpenGoogleMeet() {
  emit('openGoogleMeet')
}

function handleGenerateInviteLink() {
  emit('generateInviteLinkWithDuration')
}

function handleCopyInviteLink() {
  emit('copyInviteLink')
}

function handleSendLinkViaPrivateChat() {
  emit('sendLinkViaPrivateChat')
}

function handleSendReady() {
  emit('sendReady')
}

function handleStartSimulation() {
  emit('handleStartSimulationClick')
}
</script>

<template>
  <!-- SEÇÃO DE PREPARAÇÃO (ANTES DE INICIAR) -->
  <VCard
    v-if="isActorOrEvaluator && !simulationStarted && !simulationEnded"
    class="mb-6 preparation-card"
  >
    <VCardTitle>Preparação da Simulação</VCardTitle>
    <VCardText>
        <VRadioGroup
          v-model="localCommunicationMethod"
          inline
          label="Método de Comunicação:"
        >
          <VRadio label="Voz (Beta)" value="voice" />
          <VRadio label="Google Meet" value="meet" />
          <VRadio label="Nenhum" value="none" />
        </VRadioGroup>

        <div v-if="communicationMethod === 'meet'" class="d-flex flex-column gap-3 mb-4">
          <VBtn prepend-icon="ri-vidicon-line" @click="handleOpenGoogleMeet">
            Criar Sala no Google Meet
          </VBtn>
          <VTextField
            v-model="localMeetLink"
            label="Cole o link do Meet aqui"
            density="compact"
          />
        </div>

        <VBtn v-if="!inviteLinkToShow" block @click="handleGenerateInviteLink">
          Gerar Link de Convite
        </VBtn>

        <div v-if="inviteLinkToShow" class="mt-4 text-center">
            <p class="font-weight-bold text-body-2 mb-2">Link de Convite Gerado!</p>
            <div class="d-flex gap-2 justify-center">
              <VBtn
                  prepend-icon="ri-clipboard-line"
                  @click="handleCopyInviteLink"
                  :color="copySuccess ? 'success' : 'primary'"
              >
                  {{ copySuccess ? 'Copiado!' : 'Copiar Link' }}
              </VBtn>
              <VBtn
                  prepend-icon="ri-chat-3-line"
                  @click="handleSendLinkViaPrivateChat"
                  color="secondary"
                  :loading="sendingChat"
                  :disabled="!selectedCandidateForSimulation"
              >
                  {{ chatSentSuccess ? 'Enviado!' : 'Enviar via Chat' }}
              </VBtn>
            </div>
            <div v-if="!selectedCandidateForSimulation" class="mt-2">
              <VChip color="warning" size="small" variant="outlined">
                Selecione um candidato para enviar via chat
              </VChip>
            </div>
        </div>

      <div v-if="inviteLinkToShow || isCandidate || isActorOrEvaluator" class="text-center mt-4 pt-4 border-t">
        <VBtn
          v-if="!myReadyState"
          size="large"
          :color="myReadyState ? 'default' : 'success'"
          :disabled="
            (isCandidate && !candidateReadyButtonEnabled) ||
            (isActorOrEvaluator && !actorReadyButtonEnabled)
          "
          @click="handleSendReady"
        >
          <VIcon :icon="myReadyState ? 'ri-checkbox-circle-line' : 'ri-checkbox-blank-circle-line'" class="me-2"/>
          {{ myReadyState ? 'Pronto!' : 'Estou Pronto!' }}
        </VBtn>
        <VChip v-else color="success" size="large">
          <VIcon icon="ri-checkbox-circle-line" class="me-2"/>
          Pronto! Aguardando parceiro...
        </VChip>
        <p v-if="isActorOrEvaluator && !actorReadyButtonEnabled" class="text-caption text-warning mt-2">
          ⏳ Aguardando candidato ficar pronto primeiro...
        </p>
        <p v-if="bothParticipantsReady" class="text-success font-weight-bold mt-3">
          Ambos prontos! Você pode iniciar a simulação.
        </p>
      </div>

      <VBtn
        v-if="isActorOrEvaluator && bothParticipantsReady && backendActivated && !simulationStarted"
        block size="large" color="success" prepend-icon="ri-play-line" class="mt-4"
        @click="handleStartSimulation"
      >
        Iniciar Simulação
      </VBtn>
    </VCardText>
  </VCard>

  <!-- Banners de Status da Simulação -->
  <VAlert v-if="simulationStarted && !simulationEnded" type="success" variant="tonal" class="mb-6" prominent>
    <VIcon icon="ri-play-circle-line" class="me-2" /> Simulação em progresso!
  </VAlert>
  <VAlert v-if="simulationEnded" type="info" variant="tonal" class="mb-6" prominent>
    <VIcon icon="ri-stop-circle-line" class="me-2" /> Simulação encerrada.
  </VAlert>
</template>

<style scoped>
.preparation-card {
  border: 2px solid rgb(var(--v-theme-surface-variant));
}

.preparation-card--dark {
  background: linear-gradient(135deg, rgba(30, 30, 30, 0.9), rgba(20, 20, 20, 0.9));
}

.preparation-card--light {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(248, 248, 248, 0.9));
}
</style>
