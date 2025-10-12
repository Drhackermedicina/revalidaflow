<script setup>
/**
 * INEPPeriodSectionOptimized.vue
 * 
 * Optimized INEP period section with lazy loading
 * Shows count initially, loads stations when expanded
 */

import { ref, computed } from 'vue'
import StationListItemOptimized from '@/components/StationListItemOptimized.vue'

const props = defineProps({
  period: {
    type: String,
    required: true
  },
  stations: {
    type: Array,
    default: () => []
  },
  stationCount: {
    type: Number,
    required: true
  },
  isLoading: {
    type: Boolean,
    default: false
  },
  showSequentialConfig: {
    type: Boolean,
    default: false
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
  getSpecialty: {
    type: Function,
    required: true
  },
  isStationInSequence: {
    type: Function,
    default: () => false
  },
  creatingSessionForStationId: {
    type: String,
    default: null
  }
})

const emit = defineEmits([
  'expand',
  'collapse',
  'station-click',
  'add-to-sequence',
  'remove-from-sequence',
  'edit-station',
  'start-ai-training'
])

const isExpanded = ref(false)

function handleExpand() {
  if (!isExpanded.value) {
    isExpanded.value = true
    emit('expand')
  }
}

function handleCollapse() {
  isExpanded.value = false
  emit('collapse')
}

function handleStationClick(stationId) {
  emit('station-click', stationId)
}

function handleAddToSequence(stationId) {
  emit('add-to-sequence', stationId)
}

function handleRemoveFromSequence(stationId) {
  emit('remove-from-sequence', stationId)
}

function handleEditStation(stationId) {
  emit('edit-station', stationId)
}

function handleStartAITraining(stationId) {
  emit('start-ai-training', stationId)
}

// Computed properties
const periodLabel = computed(() => {
  if (props.period.includes('.')) {
    return props.period.replace('.', '.') // Keep format like "2024.1"
  }
  return props.period
})

const groupedStations = computed(() => {
  const groups = {}
  
  props.stations.forEach(station => {
    const specialty = props.getSpecialty(station)
    if (!groups[specialty]) {
      groups[specialty] = []
    }
    groups[specialty].push(station)
  })
  
  return groups
})

function getSpecialtyColor(specialty) {
  const colors = {
    'clinica-medica': 'info',
    'cirurgia': 'primary',
    'pediatria': 'success',
    'ginecologia': 'error',
    'preventiva': 'warning',
    'procedimentos': 'secondary'
  }
  return colors[specialty] || 'grey'
}

function getSpecialtyLabel(specialty) {
  const labels = {
    'clinica-medica': 'Clínica Médica',
    'cirurgia': 'Cirurgia',
    'pediatria': 'Pediatria',
    'ginecologia': 'Ginecologia e Obstetrícia',
    'preventiva': 'Medicina Preventiva',
    'procedimentos': 'Procedimentos'
  }
  return labels[specialty] || specialty
}
</script>

<template>
  <v-expansion-panel class="inep-period-panel">
    <v-expansion-panel-title 
      class="inep-period-title"
      @click="handleExpand"
      @after-enter="handleCollapse"
    >
      <template #default>
        <v-row no-gutters align="center" class="w-100">
          <v-col cols="auto">
            <v-chip color="primary" variant="tonal" class="me-3">
              <v-icon start>ri-calendar-line</v-icon>
              {{ periodLabel }}
            </v-chip>
          </v-col>
          <v-col class="d-flex flex-column">
            <div class="text-subtitle-1 font-weight-medium">
              Prova {{ periodLabel }}
            </div>
            <div class="text-caption text-medium-emphasis">
              {{ stationCount }} estação{{ stationCount !== 1 ? 'ões' : '' }}
            </div>
          </v-col>
          <v-col cols="auto">
            <v-badge 
              :content="stationCount" 
              color="primary" 
              inline 
            />
          </v-col>
        </v-row>
      </template>
    </v-expansion-panel-title>
    
    <v-expansion-panel-text>
      <!-- Loading State -->
      <div v-if="isLoading" class="text-center py-8">
        <v-progress-circular 
          indeterminate 
          color="primary" 
          size="32"
          class="mb-3"
        ></v-progress-circular>
        <div class="text-body-2 text-medium-emphasis">
          Carregando estações da prova {{ periodLabel }}...
        </div>
      </div>
      
      <!-- Stations List (when loaded) -->
      <div v-else-if="stations.length > 0" class="mt-4">
        <!-- Group by specialty for better organization -->
        <template v-for="(specialtyStations, specialty) in groupedStations" :key="specialty">
          <v-chip 
            v-if="specialtyStations.length > 0"
            :color="getSpecialtyColor(specialty)"
            variant="tonal"
            size="small"
            class="mb-3"
          >
            <v-icon start>ri-stethoscope-line</v-icon>
            {{ getSpecialtyLabel(specialty) }} ({{ specialtyStations.length }})
          </v-chip>
          
          <StationListItemOptimized
            v-for="station in specialtyStations"
            :key="station.id"
            :station="station"
            :is-admin="isAdmin"
            :get-user-station-score="getUserStationScore"
            :get-station-background-color="getStationBackgroundColor"
            :is-station-in-sequence="isStationInSequence"
            :show-sequential-config="showSequentialConfig"
            :creating-session-for-station-id="creatingSessionForStationId"
            class="ml-4"
            @station-click="handleStationClick"
            @add-to-sequence="handleAddToSequence"
            @remove-from-sequence="handleRemoveFromSequence"
            @edit-station="handleEditStation"
            @start-ai-training="handleStartAITraining"
          />
        </template>
      </div>
      
      <!-- Empty State -->
      <div v-else class="text-center py-8">
        <v-icon color="primary" size="48" class="mb-3">ri-inbox-line</v-icon>
        <div class="text-body-2 text-medium-emphasis">
          Nenhuma estação encontrada para a prova {{ periodLabel }}
        </div>
      </div>
    </v-expansion-panel-text>
  </v-expansion-panel>
</template>

<style scoped>
.inep-period-panel {
  margin-bottom: 0.5rem;
}

.inep-period-title {
  border-radius: 8px;
  margin-bottom: 0.5rem;
}

.inep-period-title:hover {
  background-color: rgba(var(--v-theme-primary), 0.04);
}
</style>
