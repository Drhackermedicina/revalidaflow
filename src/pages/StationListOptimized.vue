<script setup>
/**
 * StationListOptimized.vue
 * 
 * Progressive loading version of StationList
 * Loads metadata first, then sections on demand, then individual stations
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { watchDebounced } from '@vueuse/core'

// Componentes
import inepIcon from '@/assets/images/inep.png'
import SearchBar from '@/components/search/SearchBar.vue'
import CandidateSearchBar from '@/components/search/CandidateSearchBar.vue'
import SequentialConfigPanel from '@/components/sequential/SequentialConfigPanel.vue'
import AdminUploadCard from '@/components/admin/AdminUploadCard.vue'
import StationListItemOptimized from '@/components/StationListItemOptimized.vue'
import SpecialtySectionOptimized from '@/components/specialty/SpecialtySectionOptimized.vue'
import INEPPeriodSectionOptimized from '@/components/specialty/INEPPeriodSectionOptimized.vue'

// Composables
import { useStationMetadata } from '@/composables/useStationMetadata'
import { useStationCategorization } from '@/composables/useStationCategorization'
import { useSequentialMode } from '@/composables/useSequentialMode'
import { useCandidateSearch } from '@/composables/useCandidateSearch'
import { useUserManagement } from '@/composables/useUserManagement'
import { useStationNavigation } from '@/composables/useStationNavigation'
import { currentUser } from '@/plugins/auth.js'
import Logger from '@/utils/logger'

const logger = new Logger('StationListOptimized')

const router = useRouter()

// 🔹 Metadata Management (NEW PROGRESSIVE APPROACH)
const {
  fetchStationMetadata,
  loadSectionStations,
  loadUserScores,
  isLoadingMetadata,
  isLoadingSections,
  metadata,
  metadataError
} = useStationMetadata()

// 🔹 Loaded Sections State
const loadedSections = ref(new Map())
const expandedSections = ref(new Set())
const userScores = ref({})

// 🔹 Other composables
const {
  getStationBackgroundColor
} = useStationCategorization()

const {
  showSequentialConfig,
  selectedStationsSequence,
  isStationInSequence,
  toggleSequentialConfig,
  resetSequentialConfig,
  addToSequence,
  removeFromSequence,
  moveStationInSequence,
  startSequentialSimulation
} = useSequentialMode()

const {
  selectedCandidate,
  candidateSearchQuery,
  candidateSearchSuggestions,
  showCandidateSuggestions,
  isLoadingCandidateSearch,
  searchCandidates,
  selectCandidate,
  clearCandidateSelection
} = useCandidateSearch()

const {
  currentUserData,
  isAdmin,
  isCandidate,
  isEvaluator
} = useUserManagement()

const {
  creatingSessionForStationId,
  startSimulationAsActor,
  startAITraining,
  goToEditStation,
  goToAdminUpload
} = useStationNavigation()

// 🔹 Search
const globalSearchQuery = ref('')
const selectedStation = ref(null)

// 🔹 UI State
const activeAccordion = ref(null)

// 🔹 Environment
const isDevelopment = computed(() => import.meta.env.DEV)

// 🔹 Methods

/**
 * Load section data when user expands an accordion
 */
async function handleSectionExpand(sectionType, sectionKey) {
  const cacheKey = `${sectionType}:${sectionKey}`
  
  if (!loadedSections.value.has(cacheKey)) {
    try {
      isLoadingSections.value = true
      logger.info(`Loading section: ${cacheKey}`)
      
      // Load stations for this section
      const stations = await loadSectionStations(sectionType, sectionKey)
      
      // Load user scores for these stations
      const stationIds = stations.map(s => s.id)
      const scores = await loadUserScores(stationIds)
      
      // Merge data
      const stationsWithScores = stations.map(station => ({
        ...station,
        userScore: scores[station.id] || { completed: false, score: 0 }
      }))
      
      loadedSections.value.set(cacheKey, stationsWithScores)
      expandedSections.value.add(cacheKey)
      
    } catch (error) {
      logger.error(`Failed to load section ${cacheKey}:`, error)
    } finally {
      isLoadingSections.value = false
    }
  } else {
    expandedSections.value.add(cacheKey)
  }
}

/**
 * Handle section collapse
 */
function handleSectionCollapse(sectionType, sectionKey) {
  const cacheKey = `${sectionType}:${sectionKey}`
  expandedSections.value.delete(cacheKey)
}

/**
 * Load full station data when user interacts
 */
async function loadFullStation(stationId) {
  logger.info(`Loading full station data for ${stationId}`)
  
  // Import here to avoid loading heavy dependencies initially
  const { loadFullStation: loadStation } = await import('@/composables/useStationData.js')
  
  try {
    return await loadStation(stationId)
  } catch (error) {
    logger.error(`Failed to load full station ${stationId}:`, error)
    throw error
  }
}

/**
 * Station interaction handlers
 */
function handleStartSimulation(stationId) {
  startSimulationAsActor(stationId, {
    loadFullStation,
    findStation,
    selectedCandidate,
    clearSearchFields
  })
}

function handleStartAITraining(stationId) {
  startAITraining(stationId, {
    loadFullStation,
    findStation,
    clearSearchFields
  })
}

function handleAddToSequence(stationId) {
  const station = findStation(stationId)
  if (station) {
    addToSequence(station)
  }
}

function handleRemoveFromSequence(stationId) {
  removeFromSequence(stationId)
}

function handleNavigateToUpload() {
  router.push('/admin-upload')
}

function toggleCollapse() {
  const wrapper = document.querySelector('.layout-wrapper')
  wrapper?.classList.toggle('layout-vertical-nav-collapsed')
}

// Helper functions
function findStation(stationId) {
  // Search through all loaded sections
  for (const stations of loadedSections.value.values()) {
    const station = stations.find(s => s.id === stationId)
    if (station) return station
  }
  return null
}

function clearSearchFields() {
  selectedStation.value = null
  globalSearchQuery.value = ''
}

// 🔹 Computed Properties

const globalAutocompleteItems = computed(() => {
  if (!metadata.value) return []
  
  const items = []
  
  // Add INEP stations
  Object.entries(metadata.value.inep.byPeriod).forEach(([period, stations]) => {
    stations.forEach(station => {
      items.push({
        title: station.tituloEstacao || `Estação ${station.numeroDaEstacao}`,
        value: station.id,
        subtitle: `INEP ${period} - ${station.especialidade}`,
        type: 'inep',
        period
      })
    })
  })
  
  // Add Revalida Fácil stations
  Object.entries(metadata.value.revalidaFacil.bySpecialty).forEach(([specialty, stations]) => {
    stations.forEach(station => {
      items.push({
        title: station.tituloEstacao || `Estação ${station.numeroDaEstacao}`,
        value: station.id,
        subtitle: `Revalida Fácil - ${specialty}`,
        type: 'revalida-facil',
        specialty
      })
    })
  })
  
  return items
})

// 🔹 Lifecycle

onMounted(async () => {
  document.documentElement.classList.add('station-list-page-active')
  
  try {
    // Load only metadata initially - much faster!
    await fetchStationMetadata()
    logger.info('Station metadata loaded successfully')
  } catch (error) {
    logger.error('Failed to load station metadata:', error)
  }
  
  clearSearchFields()
})

onUnmounted(() => {
  document.documentElement.classList.remove('station-list-page-active')
  const wrapper = document.querySelector('.layout-wrapper')
  wrapper?.classList.remove('layout-vertical-nav-collapsed')
})

// 🔹 Watchers

watchDebounced(
  globalSearchQuery,
  () => {
    // Search handled by SearchBar component
  },
  { debounce: 300 }
)

watch(currentUser, (newUser) => {
  if (newUser) {
    // Clear user scores cache when user changes
    userScores.value = {}
  }
}, { immediate: true })
</script>

<template>
  <v-container fluid class="pa-0 main-content-container">
    <!-- Botão de toggle do menu lateral -->
    <v-tooltip location="right">
      <template #activator="{ props }">
        <v-btn
          icon
          fixed
          top
          left
          @click="toggleCollapse"
          class="ma-3 z-index-5"
          v-bind="props"
          aria-label="Abrir/Fechar menu lateral"
        >
          <v-icon aria-hidden="false" role="img" aria-label="Menu de navegação">ri-menu-line</v-icon>
        </v-btn>
      </template>
      Abrir/Fechar menu lateral
    </v-tooltip>

    <v-row>
      <v-col cols="12" md="12" class="mx-auto">
        <!-- Admin Upload Card -->
        <AdminUploadCard v-if="isAdmin?.value" @navigate-to-upload="handleNavigateToUpload" />

        <!-- Sequential Config Panel -->
        <SequentialConfigPanel
          :show="showSequentialConfig"
          :selected-stations="selectedStationsSequence"
          @toggle="toggleSequentialConfig"
          @move-station="moveStationInSequence"
          @remove-station="handleRemoveFromSequence"
          @start="startSequentialSimulation"
          @reset="resetSequentialConfig"
        />

        <!-- Candidate Search -->
        <CandidateSearchBar
          v-model="candidateSearchQuery"
          v-model:show-suggestions="showCandidateSuggestions"
          :suggestions="candidateSearchSuggestions"
          :loading="isLoadingCandidateSearch"
          :selected-candidate="selectedCandidate"
          @search="searchCandidates"
          @select-candidate="selectCandidate"
          @clear-selection="clearCandidateSelection"
        />

        <!-- Global Search -->
        <SearchBar
          v-model="globalSearchQuery"
          v-model:selected-station="selectedStation"
          :items="globalAutocompleteItems"
          :total-stations="metadata?.total || 0"
          @station-selected="handleStartSimulation"
        />

        <!-- Loading Metadata -->
        <v-card v-if="isLoadingMetadata" class="mb-6" elevation="0">
          <v-card-text class="text-center py-8">
            <v-progress-circular indeterminate color="primary" size="40" class="mb-4"></v-progress-circular>
            <div class="text-h6">Carregando estações...</div>
          </v-card-text>
        </v-card>

        <!-- Error State -->
        <v-alert v-if="metadataError" type="error" variant="tonal" class="mb-6">
          {{ metadataError }}
        </v-alert>

        <!-- Debug Info (Development only) -->
        <v-card v-if="isDevelopment" class="mb-6" elevation="0">
          <v-card-text>
            <div class="text-caption">
              <strong>Debug Info:</strong><br>
              isLoadingMetadata: {{ isLoadingMetadata }}<br>
              metadata: {{ !!metadata }}<br>
              metadata.inep: {{ !!metadata?.inep }}<br>
              metadata.revalidaFacil: {{ !!metadata?.revalidaFacil }}<br>
              total stations: {{ metadata?.total || 0 }}<br>
              INEP total: {{ metadata?.inep?.total || 0 }}<br>
              Revalida total: {{ metadata?.revalidaFacil?.total || 0 }}
            </div>
          </v-card-text>
        </v-card>

        <!-- Estações por categoria (PROGRESSIVE LOADING) -->
        <v-expansion-panels v-if="metadata && !isLoadingMetadata" variant="accordion" class="mb-6">
          
          <!-- Fallback se metadata estiver vazio -->
          <v-card v-if="!metadata.inep && !metadata.revalidaFacil" class="mb-6" elevation="0">
            <v-card-text class="text-center py-8">
              <v-icon color="primary" size="48" class="mb-3">ri-inbox-line</v-icon>
              <div class="text-h6">Nenhuma estação encontrada</div>
              <div class="text-body-2 text-medium-emphasis mt-2">
                Verifique sua conexão ou tente recarregar a página
              </div>
              <v-btn color="primary" variant="tonal" class="mt-4" @click="fetchStationMetadata">
                <v-icon start>ri-refresh-line</v-icon>
                Tentar Novamente
              </v-btn>
            </v-card-text>
          </v-card>
          
          <!-- INEP Revalida -->
          <v-expansion-panel v-if="metadata.inep" class="contained-panel">
            <v-expansion-panel-title 
              class="text-h6 font-weight-bold rounded-button-title"
              @click="handleSectionExpand('inep-main', 'inep')"
            >
              <template #default>
                <v-row no-gutters align="center" class="w-100">
                  <v-col cols="auto">
                    <v-img :src="inepIcon" style="height: 80px; width: 80px; margin-right: 24px;" />
                  </v-col>
                  <v-col class="d-flex flex-column">
                    <div class="text-h6 font-weight-bold">INEP Revalida – Provas Anteriores</div>
                  </v-col>
                  <v-col cols="auto">
                    <v-badge :content="metadata.inep?.total || 0" color="primary" inline />
                  </v-col>
                </v-row>
              </template>
            </v-expansion-panel-title>
            
            <v-expansion-panel-text>
              <v-expansion-panels variant="accordion" class="mt-4">
                <INEPPeriodSectionOptimized
                  v-for="period in metadata.inep.periods"
                  :key="period"
                  :period="period"
                  :station-count="metadata.inep.byPeriod[period].length"
                  :stations="loadedSections.get(`inep-period:${period}`) || []"
                  :is-loading="isLoadingSections && !loadedSections.has(`inep-period:${period}`)"
                  :show-sequential-config="showSequentialConfig"
                  :is-admin="isAdmin?.value"
                  :get-user-station-score="(id) => userScores[id] || { completed: false, score: 0 }"
                  :get-station-background-color="getStationBackgroundColor"
                  :get-specialty="getSpecialty"
                  :is-station-in-sequence="isStationInSequence"
                  :creating-session-for-station-id="creatingSessionForStationId"
                  @expand="() => handleSectionExpand('inep-period', period)"
                  @collapse="() => handleSectionCollapse('inep-period', period)"
                  @station-click="handleStartSimulation"
                  @add-to-sequence="handleAddToSequence"
                  @remove-from-sequence="handleRemoveFromSequence"
                  @edit-station="goToEditStation"
                  @start-ai-training="handleStartAITraining"
                />
              </v-expansion-panels>
            </v-expansion-panel-text>
          </v-expansion-panel>

          <!-- REVALIDA FLOW -->
          <v-expansion-panel v-if="metadata.revalidaFacil" class="contained-panel">
            <v-expansion-panel-title class="text-h6 font-weight-bold rounded-button-title">
              <template #default>
                <v-row no-gutters align="center" class="w-100">
                  <v-col cols="auto">
                    <v-img src="/botaosemfundo.png" style="height: 80px; width: 80px; margin-right: 24px;" />
                  </v-col>
                  <v-col class="d-flex flex-column">
                    <div class="text-h6 font-weight-bold">REVALIDA FLOW</div>
                  </v-col>
                  <v-col cols="auto">
                    <v-badge :content="metadata.revalidaFacil?.total || 0" color="primary" inline />
                  </v-col>
                </v-row>
              </template>
            </v-expansion-panel-title>
            
            <v-expansion-panel-text>
              <v-expansion-panels variant="accordion" class="mt-4">
                <!-- Clínica Médica -->
                <SpecialtySectionOptimized
                  v-if="metadata.revalidaFacil.specialties.includes('clinica-medica')"
                  title="Clínica Médica"
                  :station-count="metadata.revalidaFacil.bySpecialty['clinica-medica']?.length || 0"
                  :stations="loadedSections.get('revalida-facil-specialty:clinica-medica') || []"
                  :is-loading="isLoadingSections && !loadedSections.has('revalida-facil-specialty:clinica-medica')"
                  icon="ri-stethoscope-line"
                  color="info"
                  specialty="clinica-medica"
                  :show-sequential-config="showSequentialConfig"
                  :is-admin="isAdmin?.value"
                  :get-user-station-score="(id) => userScores[id] || { completed: false, score: 0 }"
                  :get-station-background-color="getStationBackgroundColor"
                  :is-station-in-sequence="isStationInSequence"
                  :creating-session-for-station-id="creatingSessionForStationId"
                  @expand="() => handleSectionExpand('revalida-facil-specialty', 'clinica-medica')"
                  @collapse="() => handleSectionCollapse('revalida-facil-specialty', 'clinica-medica')"
                  @station-click="handleStartSimulation"
                  @add-to-sequence="handleAddToSequence"
                  @remove-from-sequence="handleRemoveFromSequence"
                  @edit-station="goToEditStation"
                  @start-ai-training="handleStartAITraining"
                />

                <!-- Cirurgia -->
                <SpecialtySectionOptimized
                  v-if="metadata.revalidaFacil.specialties.includes('cirurgia')"
                  title="Cirurgia"
                  :station-count="metadata.revalidaFacil.bySpecialty['cirurgia']?.length || 0"
                  :stations="loadedSections.get('revalida-facil-specialty:cirurgia') || []"
                  :is-loading="isLoadingSections && !loadedSections.has('revalida-facil-specialty:cirurgia')"
                  icon="ri-knife-line"
                  color="primary"
                  specialty="cirurgia"
                  :show-sequential-config="showSequentialConfig"
                  :is-admin="isAdmin?.value"
                  :get-user-station-score="(id) => userScores[id] || { completed: false, score: 0 }"
                  :get-station-background-color="getStationBackgroundColor"
                  :is-station-in-sequence="isStationInSequence"
                  :creating-session-for-station-id="creatingSessionForStationId"
                  @expand="() => handleSectionExpand('revalida-facil-specialty', 'cirurgia')"
                  @collapse="() => handleSectionCollapse('revalida-facil-specialty', 'cirurgia')"
                  @station-click="handleStartSimulation"
                  @add-to-sequence="handleAddToSequence"
                  @remove-from-sequence="handleRemoveFromSequence"
                  @edit-station="goToEditStation"
                  @start-ai-training="handleStartAITraining"
                />

                <!-- Pediatria -->
                <SpecialtySectionOptimized
                  v-if="metadata.revalidaFacil.specialties.includes('pediatria')"
                  title="Pediatria"
                  :station-count="metadata.revalidaFacil.bySpecialty['pediatria']?.length || 0"
                  :stations="loadedSections.get('revalida-facil-specialty:pediatria') || []"
                  :is-loading="isLoadingSections && !loadedSections.has('revalida-facil-specialty:pediatria')"
                  icon="ri-bear-smile-line"
                  color="success"
                  specialty="pediatria"
                  :show-sequential-config="showSequentialConfig"
                  :is-admin="isAdmin?.value"
                  :get-user-station-score="(id) => userScores[id] || { completed: false, score: 0 }"
                  :get-station-background-color="getStationBackgroundColor"
                  :is-station-in-sequence="isStationInSequence"
                  :creating-session-for-station-id="creatingSessionForStationId"
                  @expand="() => handleSectionExpand('revalida-facil-specialty', 'pediatria')"
                  @collapse="() => handleSectionCollapse('revalida-facil-specialty', 'pediatria')"
                  @station-click="handleStartSimulation"
                  @add-to-sequence="handleAddToSequence"
                  @remove-from-sequence="handleRemoveFromSequence"
                  @edit-station="goToEditStation"
                  @start-ai-training="handleStartAITraining"
                />

                <!-- Ginecologia e Obstetrícia -->
                <SpecialtySectionOptimized
                  v-if="metadata.revalidaFacil.specialties.includes('ginecologia')"
                  title="Ginecologia e Obstetrícia"
                  :station-count="metadata.revalidaFacil.bySpecialty['ginecologia']?.length || 0"
                  :stations="loadedSections.get('revalida-facil-specialty:ginecologia') || []"
                  :is-loading="isLoadingSections && !loadedSections.has('revalida-facil-specialty:ginecologia')"
                  icon="ri-women-line"
                  color="error"
                  specialty="ginecologia"
                  :show-sequential-config="showSequentialConfig"
                  :is-admin="isAdmin?.value"
                  :get-user-station-score="(id) => userScores[id] || { completed: false, score: 0 }"
                  :get-station-background-color="getStationBackgroundColor"
                  :is-station-in-sequence="isStationInSequence"
                  :creating-session-for-station-id="creatingSessionForStationId"
                  @expand="() => handleSectionExpand('revalida-facil-specialty', 'ginecologia')"
                  @collapse="() => handleSectionCollapse('revalida-facil-specialty', 'ginecologia')"
                  @station-click="handleStartSimulation"
                  @add-to-sequence="handleAddToSequence"
                  @remove-from-sequence="handleRemoveFromSequence"
                  @edit-station="goToEditStation"
                  @start-ai-training="handleStartAITraining"
                />

                <!-- Preventiva -->
                <SpecialtySectionOptimized
                  v-if="metadata.revalidaFacil.specialties.includes('preventiva')"
                  title="Medicina Preventiva e Social"
                  :station-count="metadata.revalidaFacil.bySpecialty['preventiva']?.length || 0"
                  :stations="loadedSections.get('revalida-facil-specialty:preventiva') || []"
                  :is-loading="isLoadingSections && !loadedSections.has('revalida-facil-specialty:preventiva')"
                  icon="ri-heart-pulse-line"
                  color="warning"
                  specialty="preventiva"
                  :show-sequential-config="showSequentialConfig"
                  :is-admin="isAdmin?.value"
                  :get-user-station-score="(id) => userScores[id] || { completed: false, score: 0 }"
                  :get-station-background-color="getStationBackgroundColor"
                  :is-station-in-sequence="isStationInSequence"
                  :creating-session-for-station-id="creatingSessionForStationId"
                  @expand="() => handleSectionExpand('revalida-facil-specialty', 'preventiva')"
                  @collapse="() => handleSectionCollapse('revalida-facil-specialty', 'preventiva')"
                  @station-click="handleStartSimulation"
                  @add-to-sequence="handleAddToSequence"
                  @remove-from-sequence="handleRemoveFromSequence"
                  @edit-station="goToEditStation"
                  @start-ai-training="handleStartAITraining"
                />

                <!-- Procedimentos -->
                <SpecialtySectionOptimized
                  v-if="metadata.revalidaFacil.specialties.includes('procedimentos')"
                  title="Procedimentos"
                  :station-count="metadata.revalidaFacil.bySpecialty['procedimentos']?.length || 0"
                  :stations="loadedSections.get('revalida-facil-specialty:procedimentos') || []"
                  :is-loading="isLoadingSections && !loadedSections.has('revalida-facil-specialty:procedimentos')"
                  icon="ri-tools-line"
                  color="secondary"
                  specialty="procedimentos"
                  :show-sequential-config="showSequentialConfig"
                  :is-admin="isAdmin?.value"
                  :get-user-station-score="(id) => userScores[id] || { completed: false, score: 0 }"
                  :get-station-background-color="getStationBackgroundColor"
                  :is-station-in-sequence="isStationInSequence"
                  :creating-session-for-station-id="creatingSessionForStationId"
                  @expand="() => handleSectionExpand('revalida-facil-specialty', 'procedimentos')"
                  @collapse="() => handleSectionCollapse('revalida-facil-specialty', 'procedimentos')"
                  @station-click="handleStartSimulation"
                  @add-to-sequence="handleAddToSequence"
                  @remove-from-sequence="handleRemoveFromSequence"
                  @edit-station="goToEditStation"
                  @start-ai-training="handleStartAITraining"
                />
              </v-expansion-panels>
            </v-expansion-panel-text>
          </v-expansion-panel>

        </v-expansion-panels>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.main-content-container {
  padding-top: 1rem;
}

.contained-panel {
  margin-bottom: 1rem;
  border: 1px solid rgba(var(--v-border-color), 0.12);
  border-radius: 12px;
  overflow: hidden;
}

.rounded-button-title {
  border-radius: 12px !important;
}

.z-index-5 {
  z-index: 5;
}
</style>
