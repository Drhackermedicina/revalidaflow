<template>
  <VContainer fluid class="descriptive-question-container pa-4">
    <!-- Loading State -->
    <div v-if="loading" class="loading-overlay d-flex justify-center align-center">
      <div class="text-center">
        <VProgressCircular indeterminate color="primary" size="64" class="mb-4" />
        <p class="text-h6 text-medium-emphasis">Carregando questão...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state text-center pa-8">
      <VIcon icon="ri-error-warning-line" size="64" color="error" class="mb-4" />
      <h2 class="text-h4 mb-4">{{ error }}</h2>
      <VBtn color="primary" @click="goBack">
        <VIcon icon="ri-arrow-left-line" class="me-2" />
        Voltar
      </VBtn>
    </div>

    <!-- Question Content -->
    <div v-else-if="question" class="question-content">
      <!-- Header -->
      <div class="question-header mb-6">
        <div class="d-flex align-center justify-space-between flex-wrap mb-4">
          <h1 class="question-title text-h4 mb-2">{{ question.titulo }}</h1>
          <VBtn variant="outlined" @click="goBack">
            <VIcon icon="ri-arrow-left-line" class="me-2" />
            Voltar
          </VBtn>
        </div>

        <div class="question-meta d-flex gap-4 flex-wrap">
          <VChip color="primary" variant="tonal">
            <VIcon icon="ri-stethoscope-line" class="me-1" />
            {{ question.especialidade }}
          </VChip>
          <VChip color="secondary" variant="tonal">
            <VIcon icon="ri-calendar-line" class="me-1" />
            {{ question.ano }}
          </VChip>
          <VChip color="info" variant="tonal">
            {{ question.tipo }}
          </VChip>
        </div>
      </div>

      <!-- Enunciado -->
      <VCard class="mb-6" elevation="2">
        <VCardTitle class="bg-primary text-white">
          <VIcon icon="ri-file-text-line" class="me-2" />
          Enunciado da Questão
        </VCardTitle>
        <VCardText class="pa-6">
          <div class="question-statement" v-html="formatText(question.enunciado)"></div>
        </VCardText>
      </VCard>

      <!-- Itens/Critérios -->
      <VCard class="mb-6" elevation="2">
        <VCardTitle class="bg-secondary text-white">
          <VIcon icon="ri-list-check-2" class="me-2" />
          Itens de Avaliação
        </VCardTitle>
        <VCardText class="pa-6">
          <VRow>
            <VCol
              v-for="item in question.itens"
              :key="item.id"
              cols="12"
              class="mb-4"
            >
              <VCard variant="outlined" class="item-card">
                <VCardText class="pa-4">
                  <div class="d-flex align-center justify-space-between mb-2">
                    <h3 class="item-title text-h6 mb-0">
                      Item {{ item.id.split('-')[1] }}
                    </h3>
                    <VChip
                      color="success"
                      variant="tonal"
                      size="small"
                    >
                      {{ item.peso }} pontos
                    </VChip>
                  </div>
                  <div class="item-description" v-html="formatText(item.descricao)"></div>
                </VCardText>
              </VCard>
            </VCol>
          </VRow>
        </VCardText>
      </VCard>

      <!-- Audio Recording Section -->
      <VCard class="mb-6" elevation="2">
        <VCardTitle class="bg-primary text-white">
          <VIcon icon="ri-mic-line" class="me-2" />
          Gravação de Resposta
        </VCardTitle>
        <VCardText class="pa-6">
          <AudioRecorder :on-submit="handleAudioSubmit" />
        </VCardText>
      </VCard>

      <!-- Evaluation Feedback -->
      <div v-if="feedback" class="mb-6">
        <DescriptiveFeedback :feedback="feedback" />
      </div>

      <!-- Evaluation Error -->
      <VAlert
        v-if="evaluationError"
        type="error"
        variant="tonal"
        class="mb-6"
        closable
        @click:close="evaluationError = ''"
      >
        {{ evaluationError }}
      </VAlert>
    </div>
  </VContainer>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDescriptiveQuestion } from '@/composables/useDescriptiveQuestion'
import { useDescriptiveEvaluation } from '@/composables/useDescriptiveEvaluation'
import AudioRecorder from '@/components/AudioRecorder.vue'
import DescriptiveFeedback from '@/components/DescriptiveFeedback.vue'

const route = useRoute()
const router = useRouter()

const { loading, error, question, fetchQuestion } = useDescriptiveQuestion()
const { loading: evaluationLoading, error: evaluationError, feedback, evaluateAnswer } = useDescriptiveEvaluation()

// Lifecycle
onMounted(async () => {
  const questionId = route.params.id
  if (questionId) {
    await fetchQuestion(questionId)
  } else {
    error.value = 'ID da questão não fornecido'
  }
})

// Navigation
const goBack = () => {
  router.go(-1)
}

// Audio submission handler
const handleAudioSubmit = async (audioBlob) => {
  const questionId = route.params.id
  await evaluateAnswer(questionId, audioBlob)
}

// Utility function to format text (convert line breaks to paragraphs)
const formatText = (text) => {
  if (!text) return ''
  return text.replace(/\n/g, '<br>')
}
</script>

<style scoped>
.descriptive-question-container {
  max-width: 1200px;
  margin: 0 auto;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(var(--v-theme-surface), 0.95);
  z-index: 10;
  backdrop-filter: blur(8px);
}

.error-state {
  min-height: 400px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.question-header {
  border-bottom: 2px solid rgba(var(--v-theme-outline), 0.2);
  padding-bottom: 1rem;
}

.question-title {
  color: rgba(var(--v-theme-on-surface), 0.9);
  font-weight: 600;
}

.question-meta {
  opacity: 0.9;
}

.question-statement {
  line-height: 1.6;
  font-size: 1.1rem;
  color: rgba(var(--v-theme-on-surface), 0.87);
}

.item-card {
  border-left: 4px solid rgba(var(--v-theme-primary), 0.5);
  transition: all 0.3s ease;
}

.item-card:hover {
  border-left-color: rgba(var(--v-theme-primary), 1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.item-title {
  color: rgba(var(--v-theme-primary), 1);
  font-weight: 600;
}

.item-description {
  line-height: 1.5;
  color: rgba(var(--v-theme-on-surface), 0.8);
}


/* Responsive adjustments */
@media (max-width: 768px) {
  .descriptive-question-container {
    padding: 16px;
  }

  .question-title {
    font-size: 1.5rem !important;
  }

  .question-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

}
</style>