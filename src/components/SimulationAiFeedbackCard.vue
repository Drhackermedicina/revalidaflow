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
  }
})

const hasFeedback = computed(() => {
  if (!props.feedback) return false
  return Object.keys(props.feedback).some(key => {
    const value = props.feedback[key]
    if (Array.isArray(value)) {
      return value.length > 0
    }
    return Boolean(value)
  })
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

      <div v-else-if="hasFeedback" class="d-flex flex-column" style="gap: 24px;">
        <div class="d-flex flex-column" style="gap: 12px;">
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
        </div>

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
