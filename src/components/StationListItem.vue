<script setup>
import { computed } from 'vue'

const props = defineProps({
  station: {
    type: Object,
    required: true
  },
  userScore: {
    type: Object,
    default: null
  },
  specialty: {
    type: String,
    default: null
  },
  showSequentialConfig: {
    type: Boolean,
    default: false
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  isInSequence: {
    type: Boolean,
    default: false
  },
  isCreatingSession: {
    type: Boolean,
    default: false
  },
  backgroundColor: {
    type: String,
    default: ''
  },
  showDetailedDates: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'click',
  'add-to-sequence',
  'remove-from-sequence',
  'edit-station'
])

// Detectar tema atual
const scoreColor = computed(() => {
  if (!props.userScore) return 'default'
  if (props.userScore.percentage >= 70) return 'success'
  if (props.userScore.percentage >= 50) return 'warning'
  return 'error'
})

const cardClasses = computed(() => {
  return [
    'mb-2',
    'rounded-lg',
    'elevation-1',
    'station-list-item',
    'clickable-card',
    props.showSequentialConfig ? 'sequential-mode-card' : '',
    props.showSequentialConfig && props.isInSequence ? 'sequential-selected-card' : ''
  ]
})

const handleCardClick = () => {
  if (props.showSequentialConfig) {
    if (props.isInSequence) {
      emit('remove-from-sequence', props.station.id)
    } else {
      emit('add-to-sequence', props.station)
    }
  } else {
    emit('click', props.station.id)
  }
}
</script>

<template>
  <v-list-item
    :key="station.id"
    :class="cardClasses"
    :style="{ backgroundColor: backgroundColor }"
    @click="handleCardClick"
  >
    <template #prepend>
      <v-icon color="info">ri-file-list-3-line</v-icon>
    </template>

    <v-list-item-title class="font-weight-bold text-body-1 text-on-surface">
      {{ station.cleanTitle || station.tituloEstacao }}
    </v-list-item-title>

    <v-list-item-subtitle v-if="station.especialidade && !showDetailedDates" class="text-caption">
      {{ station.especialidade }}
    </v-list-item-subtitle>

    <!-- Pontuação do Usuário -->
    <div v-if="userScore" class="mt-2">
      <v-chip
        :color="scoreColor"
        variant="flat"
        size="small"
        class="user-score-chip"
      >
        <v-icon start size="16">ri-star-fill</v-icon>
        {{ userScore.score }}/{{ userScore.maxScore }}
      </v-chip>
    </div>

    <template #append>
      <div class="d-flex align-center">
        <!-- Loading Spinner -->
        <v-progress-circular
          v-if="isCreatingSession"
          indeterminate
          size="24"
          color="primary"
          class="me-2 sequential-selection-btn"
        />

        <!-- Indicador de seleção sequencial -->
        <v-chip
          v-if="showSequentialConfig"
          :color="isInSequence ? 'success' : 'grey'"
          size="small"
          variant="tonal"
          class="me-2 sequential-indicator"
          :prepend-icon="isInSequence ? 'ri-check-line' : 'ri-checkbox-blank-line'"
        >
          {{ isInSequence ? 'Selecionada' : 'Adicionar' }}
        </v-chip>

        <!-- Botão Editar (Admin) -->
        <v-btn
          v-if="isAdmin"
          color="secondary"
          variant="text"
          size="small"
          icon="ri-pencil-line"
          @click.stop="emit('edit-station', station.id)"
          class="me-2 sequential-selection-btn"
          aria-label="Editar Estação"
        />
      </div>
    </template>
  </v-list-item>
</template>

<style scoped>
.clickable-card {
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.clickable-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15) !important;
}

.edit-status-chip {
  font-size: 0.7rem;
  height: 20px;
}

.user-score-chip {
  font-weight: 600;
}

.sequential-selection-btn {
  flex-shrink: 0;
}

.sequential-mode-card {
  border: 2px dashed rgba(33, 150, 243, 0.35);
}

.sequential-selected-card {
  border: 2px solid rgba(76, 175, 80, 0.8);
  box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.18) !important;
  background-color: rgba(76, 175, 80, 0.08) !important;
}

.sequential-indicator {
  font-weight: 600;
  pointer-events: none;
}
</style>
