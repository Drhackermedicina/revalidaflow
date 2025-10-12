<script setup>
/**
 * StationListItemOptimized.vue
 * 
 * Optimized station list item that loads full data only when needed
 * Shows minimal info with user status initially
 */

import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps({
  station: {
    type: Object,
    required: true
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  getUserStationScore: {
    type: Function,
    required: true
  },
  getStationBackgroundColor: {
    type: Function,
    required: true
  },
  isStationInSequence: {
    type: Function,
    default: () => false
  },
  showSequentialConfig: {
    type: Boolean,
    default: false
  },
  creatingSessionForStationId: {
    type: String,
    default: null
  }
})

const emit = defineEmits([
  'station-click',
  'add-to-sequence', 
  'remove-from-sequence',
  'edit-station',
  'start-ai-training'
])

const router = useRouter()
const isLoadingFullStation = ref(false)

// Computed properties
const userScore = computed(() => {
  return props.getUserStationScore(props.station.id) || { completed: false, score: 0 }
})

const stationTitle = computed(() => {
  if (props.station.cleanTitle) return props.station.cleanTitle
  if (props.station.tituloEstacao) return props.station.tituloEstacao
  return `Estação ${props.station.numeroDaEstacao || props.station.id}`
})

const stationNumber = computed(() => {
  return props.station.numeroDaEstacao || props.station.id
})

const backgroundColor = computed(() => {
  return props.getStationBackgroundColor(props.station)
})

const isInSequence = computed(() => {
  return props.isStationInSequence(props.station.id)
})

const isCreatingSession = computed(() => {
  return props.creatingSessionForStationId === props.station.id
})

// Methods
function handleStationClick() {
  emit('station-click', props.station.id)
}

function handleAddToSequence() {
  emit('add-to-sequence', props.station.id)
}

function handleRemoveFromSequence() {
  emit('remove-from-sequence', props.station.id)
}

function handleEditStation() {
  emit('edit-station', props.station.id)
}

function handleStartAITraining() {
  emit('start-ai-training', props.station.id)
}

function goToStation(stationId) {
  router.push(`/station/${stationId}`)
}
</script>

<template>
  <v-card 
    class="station-card mb-3 transition-all duration-300"
    :class="{
      'elevation-4': isInSequence,
      'elevation-2': !isInSequence,
      'border-success': isInSequence,
      'opacity-75': isCreatingSession
    }"
    :style="{
      backgroundColor: backgroundColor,
      borderLeft: isInSequence ? '4px solid #4caf50' : '4px solid transparent'
    }"
  >
    <v-card-text class="pa-4">
      <!-- Station Header -->
      <div class="d-flex align-center justify-space-between mb-2">
        <div class="d-flex align-center">
          <v-chip 
            :color="backgroundColor === '#ffffff' ? 'primary' : 'white'"
            :variant="backgroundColor === '#ffffff' ? 'tonal' : 'flat'"
            size="small"
            class="mr-3"
          >
            {{ stationNumber }}
          </v-chip>
          <h3 class="text-h6 font-weight-medium mb-0">
            {{ stationTitle }}
          </h3>
        </div>
        
        <!-- User Status Badge -->
        <div class="d-flex align-center gap-2">
          <v-chip
            v-if="userScore.completed"
            color="success"
            variant="tonal"
            size="small"
          >
            <v-icon start size="small">ri-check-line</v-icon>
            Completa
          </v-chip>
          
          <v-chip
            v-if="userScore.score > 0"
            color="info"
            variant="tonal"
            size="small"
          >
            Nota: {{ userScore.score }}
          </v-chip>
        </div>
      </div>

      <!-- Station Info -->
      <div class="d-flex align-center mb-3">
        <span class="text-body-2 text-medium-emphasis">
          {{ station.especialidade }}
        </span>
      </div>

      <!-- Action Buttons -->
      <div class="d-flex gap-2">
        <!-- Main Action -->
        <v-btn
          :loading="isCreatingSession"
          :disabled="isCreatingSession"
          color="primary"
          variant="elevated"
          size="small"
          @click="handleStationClick"
        >
          <v-icon start>ri-play-circle-line</v-icon>
          {{ userScore.completed ? 'Praticar Novamente' : 'Iniciar Simulação' }}
        </v-btn>

        <!-- Sequential Mode Actions -->
        <template v-if="showSequentialConfig">
          <v-btn
            v-if="isInSequence"
            color="error"
            variant="outlined"
            size="small"
            @click="handleRemoveFromSequence"
          >
            <v-icon>ri-subtract-line</v-icon>
            Remover
          </v-btn>
          <v-btn
            v-else
            color="success"
            variant="outlined"
            size="small"
            @click="handleAddToSequence"
          >
            <v-icon>ri-add-line</v-icon>
            Adicionar
          </v-btn>
        </template>

        <!-- Admin Actions -->
        <template v-if="isAdmin">
          <v-btn
            color="warning"
            variant="outlined"
            size="small"
            @click="handleEditStation"
          >
            <v-icon>ri-edit-line</v-icon>
            Editar
          </v-btn>
          
          <v-btn
            color="info"
            variant="outlined"
            size="small"
            @click="handleStartAITraining"
          >
            <v-icon>ri-robot-line</v-icon>
            IA
          </v-btn>
        </template>
      </div>

      <!-- Sequential Mode Indicator -->
      <v-alert
        v-if="isInSequence"
        type="success"
        variant="tonal"
        density="compact"
        class="mt-3"
      >
        <v-icon start>ri-list-check</v-icon>
        Estação adicionada à sequência
      </v-alert>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.station-card {
  transition: all 0.3s ease;
  cursor: pointer;
}

.station-card:hover {
  transform: translateY(-2px);
}

.border-success {
  border-color: #4caf50 !important;
}

.opacity-75 {
  opacity: 0.75;
}
</style>
