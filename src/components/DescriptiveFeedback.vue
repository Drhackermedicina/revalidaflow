<template>
  <div class="descriptive-feedback">
    <!-- Score Geral -->
    <VCard class="mb-4" elevation="2">
      <VCardTitle class="bg-primary text-white d-flex align-center">
        <VIcon icon="ri-star-line" class="me-2" />
        Score Geral
      </VCardTitle>
      <VCardText class="pa-6 text-center">
        <div class="score-display">
          <div class="score-number text-h2 font-weight-bold text-primary">
            {{ parsedFeedback.scoreGeral || 0 }}/10
          </div>
          <div class="score-label text-body-1 text-medium-emphasis mt-2">
            Pontuação de Coerência e Estrutura
          </div>
        </div>
      </VCardText>
    </VCard>

    <!-- Transcrição -->
    <VCard class="mb-4" elevation="2">
      <VCardTitle class="bg-secondary text-white">
        <VIcon icon="ri-mic-line" class="me-2" />
        Sua Resposta Transcrita
      </VCardTitle>
      <VCardText class="pa-6">
        <div class="transcription-text text-body-1" v-html="formatText(parsedFeedback.transcricao)"></div>
      </VCardText>
    </VCard>

    <!-- Análise por Critérios -->
    <VCard class="mb-4" elevation="2">
      <VCardTitle class="bg-info text-white">
        <VIcon icon="ri-list-check-2" class="me-2" />
        Análise por Critérios
      </VCardTitle>
      <VCardText class="pa-6">
        <div v-if="parsedFeedback.analiseCriterios && parsedFeedback.analiseCriterios.length > 0">
          <VRow>
            <VCol
              v-for="(criterio, index) in parsedFeedback.analiseCriterios"
              :key="index"
              cols="12"
              class="mb-4"
            >
              <VCard variant="outlined" class="criterio-card">
                <VCardText class="pa-4">
                  <div class="d-flex align-center justify-space-between mb-3">
                    <h4 class="criterio-title text-h6 mb-0">
                      {{ criterio.titulo || `Critério ${index + 1}` }}
                    </h4>
                    <VChip
                      :color="getScoreColor(criterio.pontuacao)"
                      variant="tonal"
                      size="small"
                    >
                      {{ criterio.pontuacao || 0 }}/10
                    </VChip>
                  </div>
                  <div class="criterio-comentario text-body-2" v-html="formatText(criterio.comentario)"></div>
                </VCardText>
              </VCard>
            </VCol>
          </VRow>
        </div>
        <div v-else class="text-center text-medium-emphasis">
          <VIcon icon="ri-information-line" size="48" class="mb-2 opacity-50" />
          <p>Análise detalhada não disponível</p>
        </div>
      </VCardText>
    </VCard>

    <!-- Resumo Geral -->
    <VCard class="mb-4" elevation="2">
      <VCardTitle class="bg-success text-white">
        <VIcon icon="ri-file-text-line" class="me-2" />
        Resumo Geral do Feedback
      </VCardTitle>
      <VCardText class="pa-6">
        <div class="resumo-text text-body-1" v-html="formatText(parsedFeedback.resumoGeral)"></div>
      </VCardText>
    </VCard>
  </div>
</template>

<script setup>
import { computed } from 'vue'

// Props
const props = defineProps({
  feedback: {
    type: [String, Object],
    required: true
  }
})

// Computed para parsear o feedback
const parsedFeedback = computed(() => {
  if (typeof props.feedback === 'object') {
    return props.feedback
  }

  // Se for string, tentar parsear como JSON ou usar parser customizado
  if (typeof props.feedback === 'string') {
    try {
      return JSON.parse(props.feedback)
    } catch {
      // Se não for JSON válido, usar parser customizado
      return parseFeedbackString(props.feedback)
    }
  }

  return {}
})

// Função para parsear string de feedback estruturada
function parseFeedbackString(feedbackText) {
  const result = {
    scoreGeral: null,
    transcricao: '',
    analiseCriterios: [],
    resumoGeral: ''
  }

  if (!feedbackText) return result

  // Extrair score geral
  const scoreMatch = feedbackText.match(/Score[^:]*:\s*(\d+)/i)
  if (scoreMatch) {
    result.scoreGeral = parseInt(scoreMatch[1], 10)
  }

  // Tentar identificar seções estruturadas
  const sections = feedbackText.split(/\n\s*\n/).filter(section => section.trim())

  sections.forEach(section => {
    const lowerSection = section.toLowerCase()

    if (lowerSection.includes('pontos fortes') || lowerSection.includes('precisão')) {
      // Esta seção pode ser usada no resumo
      result.resumoGeral += section + '\n\n'
    } else if (lowerSection.includes('pontos a melhorar') || lowerSection.includes('gaps')) {
      result.resumoGeral += section + '\n\n'
    } else if (lowerSection.includes('desafio feynman') || lowerSection.includes('clareza')) {
      result.resumoGeral += section + '\n\n'
    } else if (lowerSection.includes('score') && lowerSection.includes('estrutura')) {
      // Já extraído acima
    } else {
      // Conteúdo geral vai para resumo
      result.resumoGeral += section + '\n\n'
    }
  })

  return result
}

// Função para formatar texto (converter quebras de linha em parágrafos)
const formatText = (text) => {
  if (!text) return ''
  return text.replace(/\n/g, '<br>')
}

// Função para determinar cor baseada na pontuação
const getScoreColor = (score) => {
  if (score >= 8) return 'success'
  if (score >= 6) return 'warning'
  return 'error'
}
</script>

<style scoped>
.descriptive-feedback {
  max-width: 100%;
}

.score-display {
  padding: 2rem 0;
}

.score-number {
  font-size: 4rem !important;
  line-height: 1;
}

.score-label {
  font-weight: 500;
}

.transcription-text {
  line-height: 1.6;
  background: rgba(var(--v-theme-surface-variant), 0.3);
  padding: 1rem;
  border-radius: 8px;
  border-left: 4px solid rgba(var(--v-theme-secondary), 0.5);
}

.criterio-card {
  border-left: 4px solid rgba(var(--v-theme-info), 0.5);
  transition: all 0.3s ease;
}

.criterio-card:hover {
  border-left-color: rgba(var(--v-theme-info), 1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.criterio-title {
  color: rgba(var(--v-theme-info), 1);
  font-weight: 600;
}

.criterio-comentario {
  line-height: 1.5;
  color: rgba(var(--v-theme-on-surface), 0.8);
}

.resumo-text {
  line-height: 1.6;
  background: rgba(var(--v-theme-success), 0.05);
  padding: 1rem;
  border-radius: 8px;
  border-left: 4px solid rgba(var(--v-theme-success), 0.5);
}

/* Responsividade */
@media (max-width: 768px) {
  .score-number {
    font-size: 3rem !important;
  }

  .transcription-text,
  .resumo-text {
    padding: 0.75rem;
    font-size: 0.9rem;
  }

  .criterio-comentario {
    font-size: 0.85rem;
  }
}
</style>