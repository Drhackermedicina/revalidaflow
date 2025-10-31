<script setup>
import { computed } from 'vue'

const props = defineProps({
  feedback: {
    type: Object,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: ''
  },
  isDarkTheme: {
    type: Boolean,
    default: false
  },
  metadata: {
    type: Object,
    default: null
  },
  scores: {
    type: Object,
    default: () => ({})
  },
  totalScore: {
    type: Number,
    default: null
  },
  details: {
    type: Array,
    default: () => []
  }
})

const classification = computed(() => props.feedback?.classificacao || '')

const classificationColor = computed(() => {
  const value = classification.value.toLowerCase()
  if (!value) return 'primary'
  if (value.includes('emerg')) return 'error'
  if (value.includes('urg')) return 'warning'
  if (value.includes('estavel') || value.includes('estável')) return 'success'
  if (value.includes('ambulator')) return 'info'
  return 'primary'
})

const metadataInfo = computed(() => {
  if (!props.metadata) return null
  const generatedBy = props.metadata.generatedBy || {}
  let timestamp = props.metadata.timestamp || props.metadata.generatedAt || null

  if (timestamp) {
    const date = new Date(timestamp)
    if (!Number.isNaN(date.getTime())) {
      timestamp = date.toLocaleString('pt-BR', { hour12: false })
    } else {
      timestamp = null
    }
  }

  return {
    author: generatedBy.displayName || generatedBy.role || null,
    timestamp
  }
})

const hiddenPatterns = [/ausente/i, /segundo o roteiro/i]

function getArray(field) {
  if (!props.feedback) return []
  const value = props.feedback[field]
  if (Array.isArray(value)) {
    return value
      .map(item => (typeof item === 'string' ? item.trim() : ''))
      .filter(text => text && hiddenPatterns.every(pattern => !pattern.test(text)))
  }
  if (typeof value === 'string' && value.trim()) {
    const trimmed = value.trim()
    return hiddenPatterns.some(pattern => pattern.test(trimmed)) ? [] : [trimmed]
  }
  return []
}

const groupedSections = computed(() => {
  const groups = [
    {
      title: 'Investigação Clínica',
      sections: [
        { key: 'investigacaoAnamnese', label: 'Anamnese - tópicos essenciais' },
        { key: 'antecedentesRelevantes', label: 'Antecedentes relevantes' },
        { key: 'sinaisVitaisEssenciais', label: 'Sinais vitais prioritários' },
        { key: 'exameFisicoEssencial', label: 'Exame físico direcionado' }
      ]
    },
    {
      title: 'Propedêutica Complementar',
      sections: [
        { key: 'examesLaboratoriaisEssenciais', label: 'Exames laboratoriais' },
        { key: 'examesImagemEssenciais', label: 'Exames de imagem' },
        { key: 'examesComplementaresAdicionais', label: 'Outros exames complementares' }
      ]
    },
    {
      title: 'Conduta e Tratamento',
      sections: [
        { key: 'condutaGeral', label: 'Conduta geral' },
        { key: 'tratamentoConservador', label: 'Tratamento conservador' },
        { key: 'tratamentoNaoFarmacologico', label: 'Medidas não farmacológicas' },
        { key: 'tratamentoFarmacologico', label: 'Tratamento farmacológico' },
        { key: 'tratamentoCirurgico', label: 'Tratamento cirúrgico' }
      ]
    },
    {
      title: 'Acompanhamento e Educação',
      sections: [
        { key: 'orientacoesPaciente', label: 'Orientações ao paciente' },
        { key: 'sinaisAlerta', label: 'Sinais de alerta' },
        { key: 'fatoresRisco', label: 'Fatores de risco' },
        { key: 'complicacoesPotenciais', label: 'Complicações potenciais' },
        { key: 'planoSeguimento', label: 'Plano de seguimento' },
        { key: 'prioridadesEstudo', label: 'Prioridades de estudo' }
      ]
    },
    {
      title: 'Fluxo Assistencial',
      sections: [
        { key: 'criteriosEncaminhamento', label: 'Critérios de encaminhamento' },
        { key: 'criteriosInternacao', label: 'Critérios de internação' },
        { key: 'criteriosTratamentoAmbulatorial', label: 'Critérios para tratamento ambulatorial' }
      ]
    },
    {
      title: 'Avaliação da Performance por IA',
      sections: [
        { key: 'destaquesDesempenho', label: 'Pontos fortes observados' },
        { key: 'observacoesIA', label: 'Observações adicionais' }
      ]
    }
  ]

  return groups
    .map(group => {
      const sections = group.sections
        .map(section => ({
          ...section,
          values: getArray(section.key)
        }))
        .filter(section => section.values.length > 0)

      return {
        title: group.title,
        sections
      }
    })
    .filter(group => group.sections.length > 0)
})

const hasStructuredGroups = computed(() => groupedSections.value.length > 0)

const cleanText = value => {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  return hiddenPatterns.some(pattern => pattern.test(trimmed)) ? '' : trimmed
}

const cleanList = list => {
  if (!Array.isArray(list)) return []
  return list
    .map(item => cleanText(typeof item === 'string' ? item : ''))
    .filter(Boolean)
}

const fallbackSummary = computed(() => {
  if (!props.feedback) return null
  const summary = {
    visaoGeral: cleanText(props.feedback.visaoGeral),
    pontosFortes: cleanList(props.feedback.pontosFortes),
    pontosDeMelhoria: cleanList(props.feedback.pontosDeMelhoria),
    recomendacoesOSCE: cleanList(props.feedback.recomendacoesOSCE),
    indicadoresCriticos: cleanList(props.feedback.indicadoresCriticos)
  }

  const hasContent =
    summary.visaoGeral ||
    summary.pontosFortes.length ||
    summary.pontosDeMelhoria.length ||
    summary.recomendacoesOSCE.length ||
    summary.indicadoresCriticos.length

  return hasContent ? summary : null
})

const hasFallbackSummary = computed(() => Boolean(fallbackSummary.value))

const hasScoreSummary = computed(() => {
  if (props.totalScore !== null && props.totalScore !== undefined) return true
  return props.scores && Object.keys(props.scores).length > 0
})

const totalScoreDisplay = computed(() => {
  if (props.totalScore === null || props.totalScore === undefined) return null
  const value = Number(props.totalScore)
  if (Number.isNaN(value)) return null
  return Number.isInteger(value) ? value : value.toFixed(1)
})

const scoreEntries = computed(() => {
  if (!props.scores || typeof props.scores !== 'object') return []
  return Object.entries(props.scores)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => {
      const numericValue = Number(value)
      if (Number.isNaN(numericValue)) return null
      return {
        key,
        value: numericValue
      }
    })
    .filter(Boolean)
})

const hasScoreEntries = computed(() => scoreEntries.value.length > 0)

const normalizedDetails = computed(() => {
  if (!Array.isArray(props.details)) return []
  return props.details
    .filter(detail => detail && (detail.observacao || typeof detail.pontuacao === 'number'))
    .map(detail => ({
      ...detail,
      pontuacao: typeof detail.pontuacao === 'number' ? detail.pontuacao : null,
      observacao: cleanText(detail.observacao || '')
    }))
    .filter(detail => detail.pontuacao !== null || detail.observacao)
})

const hasDetails = computed(() => normalizedDetails.value.length > 0)

const hasFeedback = computed(() => {
  return hasStructuredGroups.value || hasFallbackSummary.value || hasScoreSummary.value || hasDetails.value
})
</script>

<template>
  <VCard
    class="ai-feedback-card"
    :class="isDarkTheme ? 'ai-feedback-card--dark' : 'ai-feedback-card--light'"
  >
    <VCardTitle class="d-flex align-center justify-space-between flex-wrap gap-2">
      <div class="d-flex align-center">
        <VIcon icon="ri-lightbulb-flash-line" class="me-2" />
        Feedback Inteligente da Estação
      </div>
      <VChip
        v-if="classification"
        :color="classificationColor"
        variant="flat"
        size="small"
      >
        {{ classification }}
      </VChip>
    </VCardTitle>
    <VCardText>
      <div v-if="loading" class="d-flex justify-center py-6">
        <VProgressCircular indeterminate size="40" />
      </div>

      <VAlert
        v-else-if="error"
        type="error"
        variant="tonal"
        border="start"
        class="mb-0"
      >
        {{ error }}
      </VAlert>

      <div v-else-if="hasFeedback" class="d-flex flex-column ai-feedback-content" style="gap: 24px;">
        <div
          v-if="feedback || hasScoreSummary || metadataInfo || hasFallbackSummary"
          class="d-flex flex-column"
          style="gap: 12px;"
        >
          <div class="text-subtitle-1 font-weight-medium" v-if="feedback?.temaEstacao">
            Tema da estação: {{ feedback.temaEstacao }}
          </div>
          <div class="text-body-1" v-if="feedback?.resumoEstacao">
            <strong>Resumo da estação:</strong> {{ feedback.resumoEstacao }}
          </div>
          <div class="text-body-2 text-medium-emphasis" v-if="feedback?.contextoClinico">
            <strong>Contexto clínico:</strong> {{ feedback.contextoClinico }}
          </div>
          <div class="text-caption text-medium-emphasis" v-if="metadataInfo">
            Gerado
            <span v-if="metadataInfo.author">por {{ metadataInfo.author }}</span>
            <span v-if="metadataInfo.timestamp">
              em {{ metadataInfo.timestamp }}
            </span>
          </div>
          <div v-if="hasScoreSummary" class="ai-feedback-score">
            <div class="d-flex align-center">
              <VIcon icon="ri-award-line" class="me-2" />
              <div>
                <div class="text-subtitle-1 font-weight-medium">
                  Pontuação total:
                  <span class="text-primary">
                    {{ totalScoreDisplay ?? 'Indisponível' }}
                  </span>
                </div>
                <div
                  class="text-caption text-medium-emphasis"
                  v-if="hasScoreEntries"
                >
                  Pontuação individual disponível para análise detalhada.
                </div>
              </div>
            </div>
            <ul v-if="hasScoreEntries" class="ai-feedback-score-list ps-4 mb-0 mt-3">
              <li
                v-for="entry in scoreEntries"
                :key="entry.key"
                class="text-body-2"
              >
                <span class="font-weight-medium">{{ entry.key }}</span>: {{ entry.value }}
              </li>
            </ul>
          </div>
        </div>

        <template v-if="hasStructuredGroups">
          <VExpansionPanels
            class="ai-feedback-panels"
            multiple
            variant="accordion"
          >
            <VExpansionPanel
              v-for="group in groupedSections"
              :key="group.title"
              class="ai-feedback-panel"
            >
              <VExpansionPanelTitle class="ai-feedback-panel-title">
                {{ group.title }}
              </VExpansionPanelTitle>
              <VExpansionPanelText>
                <div
                  v-for="section in group.sections"
                  :key="section.key"
                  class="ai-feedback-section"
                >
                  <div class="text-body-2 font-weight-medium mb-1">
                    {{ section.label }}
                  </div>
                  <ul class="ps-4 mb-0">
                    <li
                      v-for="(item, index) in section.values"
                      :key="`${section.key}-${index}`"
                      class="text-body-2"
                    >
                      {{ item }}
                    </li>
                  </ul>
                </div>
              </VExpansionPanelText>
            </VExpansionPanel>
          </VExpansionPanels>
        </template>

        <div v-else-if="fallbackSummary" class="ai-feedback-fallback d-flex flex-column" style="gap: 16px;">
          <div v-if="fallbackSummary.visaoGeral">
            <div class="text-subtitle-1 font-weight-medium mb-1">Visão geral</div>
            <p class="text-body-2 mb-0">
              {{ fallbackSummary.visaoGeral }}
            </p>
          </div>
          <div v-if="fallbackSummary.pontosFortes.length">
            <div class="text-subtitle-2 font-weight-medium mb-1">Pontos fortes</div>
            <ul class="ps-4 mb-0">
              <li
                v-for="(item, index) in fallbackSummary.pontosFortes"
                :key="`strength-${index}`"
                class="text-body-2"
              >
                {{ item }}
              </li>
            </ul>
          </div>
          <div v-if="fallbackSummary.pontosDeMelhoria.length">
            <div class="text-subtitle-2 font-weight-medium mb-1">Pontos de melhoria</div>
            <ul class="ps-4 mb-0">
              <li
                v-for="(item, index) in fallbackSummary.pontosDeMelhoria"
                :key="`improvement-${index}`"
                class="text-body-2"
              >
                {{ item }}
              </li>
            </ul>
          </div>
          <div v-if="fallbackSummary.recomendacoesOSCE.length">
            <div class="text-subtitle-2 font-weight-medium mb-1">Recomendações OSCE</div>
            <ul class="ps-4 mb-0">
              <li
                v-for="(item, index) in fallbackSummary.recomendacoesOSCE"
                :key="`osce-${index}`"
                class="text-body-2"
              >
                {{ item }}
              </li>
            </ul>
          </div>
          <div v-if="fallbackSummary.indicadoresCriticos.length">
            <div class="text-subtitle-2 font-weight-medium mb-1">Indicadores críticos</div>
            <ul class="ps-4 mb-0">
              <li
                v-for="(item, index) in fallbackSummary.indicadoresCriticos"
                :key="`critical-${index}`"
                class="text-body-2"
              >
                {{ item }}
              </li>
            </ul>
          </div>
        </div>

        <div v-if="hasDetails || hasScoreEntries" class="ai-feedback-details">
          <div class="text-subtitle-2 font-weight-medium mb-1">
            Observações por item
          </div>
          <ul class="ps-4 mb-0">
            <template v-if="hasDetails">
              <li
                v-for="(detail, index) in normalizedDetails"
                :key="`detail-${detail.itemId || index}`"
                class="text-body-2 mb-1"
              >
                <span v-if="detail.itemId" class="font-weight-medium">
                  Item {{ detail.itemId }}:
                </span>
                <span v-if="detail.pontuacao !== null" class="ms-1">
                  Pontuação {{ detail.pontuacao }}.
                </span>
                <span v-if="detail.observacao" class="ms-1">
                  {{ detail.observacao }}
                </span>
              </li>
            </template>
            <template v-else-if="hasScoreEntries">
              <li
                v-for="entry in scoreEntries"
                :key="`score-only-${entry.key}`"
                class="text-body-2 mb-1"
              >
                <span class="font-weight-medium">Item {{ entry.key }}:</span>
                <span class="ms-1">Pontuação {{ entry.value }}</span>
              </li>
            </template>
          </ul>
        </div>
      </div>

      <VAlert
        v-else
        type="info"
        variant="tonal"
        class="mb-0"
      >
        O feedback da IA será exibido aqui assim que a estação for finalizada e a avaliação for concluída.
      </VAlert>
    </VCardText>
  </VCard>
</template>

<style scoped>
.ai-feedback-card {
  transition: border 0.2s ease;
}

.ai-feedback-card--dark {
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.ai-feedback-card--light {
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.ai-feedback-score {
  border-radius: 12px;
  background: rgba(79, 70, 229, 0.08);
  padding: 12px 16px;
}

.ai-feedback-card--dark .ai-feedback-score {
  background: rgba(129, 140, 248, 0.12);
}

.ai-feedback-score-list {
  list-style: disc;
}

.ai-feedback-fallback ul {
  list-style: disc;
}

.ai-feedback-details {
  border-top: 1px solid rgba(125, 125, 125, 0.2);
  padding-top: 12px;
}

.ai-feedback-panels {
  border-radius: 8px;
  overflow: hidden;
  background-color: transparent;
}

.ai-feedback-panel {
  border: 1px solid rgba(125, 125, 125, 0.15);
  border-radius: 8px;
  margin-bottom: 12px;
}

.ai-feedback-panel:last-of-type {
  margin-bottom: 0;
}

.ai-feedback-panel-title {
  font-weight: 600;
}

.ai-feedback-section:not(:last-of-type) {
  margin-bottom: 16px;
}

.ai-feedback-section ul {
  list-style: disc;
}
</style>
