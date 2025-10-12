<script setup>
/**
 * SpecialtySectionOptimized.vue
 * 
 * Optimized specialty section with lazy loading
 * Shows count initially, loads stations when expanded
 */

import { ref } from 'vue'
import StationListItemOptimized from '@/components/StationListItemOptimized.vue'

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  specialty: {
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
  icon: {
    type: String,
    default: 'ri-hospital-line'
  },
  color: {
    type: String,
    default: 'primary'
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
</script>

<template>
  <v-expansion-panel class="specialty-panel">
    <v-expansion-panel-title 
      class="specialty-title"
      @click="handleExpand"
      @after-enter="handleCollapse"
    >
      <template #default>
        <v-row no-gutters align="center" class="w-100">
          <v-col cols="auto">
            <v-icon :color="color" class="me-3">{{ icon }}</v-icon>
          </v-col>
          <v-col class="d-flex flex-column">
            <div class="text-subtitle-1 font-weight-medium">{{ title }}</div>
            <div class="text-caption text-medium-emphasis">
              {{ stationCount }} estação{{ stationCount !== 1 ? 'ões' : '' }}
            </div>
          </v-col>
          <v-col cols="auto">
            <v-badge 
              :content="stationCount" 
              :color="color" 
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
          :color="color" 
          size="32"
          class="mb-3"
        ></v-progress-circular>
        <div class="text-body-2 text-medium-emphasis">
          Carregando estações de {{ title }}...
        </div>
      </div>
      
      <!-- Stations List (when loaded) -->
      <div v-else-if="stations.length > 0" class="mt-4">
        <StationListItemOptimized
          v-for="station in stations"
          :key="station.id"
          :station="station"
          :is-admin="isAdmin"
          :get-user-station-score="getUserStationScore"
          :get-station-background-color="getStationBackgroundColor"
          :is-station-in-sequence="isStationInSequence"
          :show-sequential-config="showSequentialConfig"
          :creating-session-for-station-id="creatingSessionForStationId"
          @station-click="handleStationClick"
          @add-to-sequence="handleAddToSequence"
          @remove-from-sequence="handleRemoveFromSequence"
          @edit-station="handleEditStation"
          @start-ai-training="handleStartAITraining"
        />
      </div>
      
      <!-- Empty State -->
      <div v-else class="text-center py-8">
        <v-icon :color="color" size="48" class="mb-3">ri-inbox-line</v-icon>
        <div class="text-body-2 text-medium-emphasis">
          Nenhuma estação encontrada em {{ title }}
        </div>
      </div>
    </v-expansion-panel-text>
  </v-expansion-panel>
</template>

<style scoped>
.specialty-panel {
  margin-bottom: 0.5rem;
}

.specialty-title {
  border-radius: 8px;
  margin-bottom: 0.5rem;
}

.specialty-title:hover {
  background-color: rgba(var(--v-theme-on-surface), 0.04);
}
</style>
