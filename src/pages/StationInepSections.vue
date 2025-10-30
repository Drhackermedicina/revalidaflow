<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import inepIcon from '@/assets/images/inep.png'
import INEPPeriodSection from '@/components/specialty/INEPPeriodSection.vue'
import SearchBar from '@/components/search/SearchBar.vue'
import StationListHeader from '@/components/station/StationListHeader.vue'
import SequentialConfigPanel from '@/components/sequential/SequentialConfigPanel.vue'

import { useStationData } from '@/composables/useStationData'
import { useStationFilteringOptimized } from '@/composables/useStationFilteringOptimized'
import stationRepository from '@/repositories/stationRepository'
import { useStationCategorization } from '@/composables/useStationCategorization'
import { useSequentialMode } from '@/composables/useSequentialMode'
import { useCandidateSearch } from '@/composables/useCandidateSearch'
import { useUserManagement } from '@/composables/useUserManagement'
import { useStationNavigation } from '@/composables/useStationNavigation'
import { currentUser } from '@/plugins/auth.js'

const route = useRoute()
const router = useRouter()

const {
  loadFullStation,
  getUserStationScore,
} = useStationData()

const stations = ref([]) // Usar stationRepository.getAll() ao invés de paginação

const {
  globalSearchQuery,
  getSpecialty,
  filteredStationsByInepPeriod,
  filteredINEPStations,
  isINEPStation,
} = useStationFilteringOptimized(stations)

const allStationsForCounts = ref([])

// Autocomplete restrito ao escopo INEP
const inepAutocompleteItems = computed(() => {
  const flat = Object.values(filteredStationsByInepPeriod.value || {}).flat()
  const unique = new Map()
  for (const s of flat) {
    const id = s.id || s.idEstacao
    if (!id || unique.has(id)) continue
    unique.set(id, {
      title: s.cleanTitle || s.tituloEstacao,
      value: id,
      subtitle: s.especialidade,
      isINEP: true,
      iconImage: inepIcon,
    })
  }
  return Array.from(unique.values())
})

const inepTotalAll = computed(() => (allStationsForCounts.value || []).filter(isINEPStation).length)

const { getStationBackgroundColor } = useStationCategorization()

const {
  showSequentialConfig,
  selectedStationsSequence,
  isStationInSequence,
  toggleSequentialConfig,
  resetSequentialConfig,
  addToSequence,
  removeFromSequence,
  moveStationInSequence,
  startSequentialSimulation,
} = useSequentialMode(loadFullStation, s => s?.title || '', () => null)

const {
  selectedCandidate,
  selectCandidate,
} = useCandidateSearch(currentUser)

const { isAdmin } = useUserManagement()

const {
  creatingSessionForStationId,
  startSimulationAsActor,
  goToEditStation,
} = useStationNavigation()

const selectedMode = ref(null)
const isLoadingStations = ref(true) // Controlar loading para quando usar stationRepository.getAll()
const isSimulationModeActive = computed(() => selectedMode.value === 'simulation')

const inepPeriods = ['2025.1', '2024.2', '2024.1', '2023.2', '2023.1', '2022.2', '2022.1', '2021', '2020', '2017', '2016', '2015', '2014', '2013', '2012', '2011']

const modeInfoMap = {
  'simple-training': {
    title: 'Treinamento Simples',
    description: 'Treine uma estação por vez, no seu próprio ritmo.'
  },
  simulation: {
    title: 'Simulação Completa',
    description: 'Monte uma sequência e percorra várias estações em sequência.'
  }
}

const modeInfo = computed(() => {
  if (!selectedMode.value) return null
  return modeInfoMap[selectedMode.value]
})

function setModeQuery(mode) {
  const newQuery = { ...route.query }
  if (mode) newQuery.mode = mode
  else delete newQuery.mode
  router.replace({ query: newQuery }).catch(() => {})
}

async function restoreCandidateFromSession() {
  if (selectedCandidate.value || typeof window === 'undefined') return
  const stored = sessionStorage.getItem('selectedCandidate')
  if (!stored) return
  try {
    const candidate = JSON.parse(stored)
    if (candidate?.uid) await selectCandidate(candidate)
  } catch {
    sessionStorage.removeItem('selectedCandidate')
  }
}

function applyRouteState() {
  const modeFromRoute = route.query.mode
  if (modeFromRoute === 'simple-training' || modeFromRoute === 'simulation') {
    selectedMode.value = modeFromRoute
    showSequentialConfig.value = modeFromRoute === 'simulation'
  } else {
    selectedMode.value = 'simple-training'
    showSequentialConfig.value = false
  }
}

function handleStartSimulation(stationId) {
  const mode = selectedMode.value
  if (mode === 'simple-training') {
    startSimulationAsActor(stationId, {
      loadFullStation,
      expandCorrectSection: null,
      findStation: id => stations.value.find(s => s.id === id),
      selectedCandidate,
      clearSearchFields: () => { globalSearchQuery.value = '' },
    })
  } else if (mode === 'simulation') {
    const station = stations.value.find(s => s.id === stationId)
    if (station && !isStationInSequence(stationId)) addToSequence(station)
  }
}

async function loadAllStations() {
  isLoadingStations.value = true
  try {
    console.log('[DEBUG STATION_INEP] Carregando TODAS as estações via stationRepository.getAll()...')
    stations.value = await stationRepository.getAll(true)
    console.log(`[DEBUG STATION_INEP] ✅ Carregadas ${stations.value.length} estações totais`)
    
    // Log específico para stations INEP 2021
    const inep2021Stations = stations.value.filter(station => 
      station.idEstacao && station.idEstacao.includes('2021')
    )
    console.log(`[DEBUG STATION_INEP] 🔍 Estações INEP 2021 detectadas: ${inep2021Stations.length} de 14 esperadas`)
    inep2021Stations.forEach((station, index) => {
      console.log(`[DEBUG STATION_INEP] ${index + 1}. ${station.idEstacao}`)
    })
    
  } catch (error) {
    console.error('[DEBUG STATION_INEP] ❌ Erro ao carregar estações:', error)
    stations.value = []
  } finally {
    isLoadingStations.value = false
  }
}

function handleStartSequentialSimulation() {
  startSequentialSimulation({ candidate: selectedCandidate.value || null })
}

onMounted(async () => {
  await loadAllStations() // Carrega TODAS as estações de uma vez
  await restoreCandidateFromSession()
  applyRouteState()
  allStationsForCounts.value = stations.value // Usar a mesma lista
})

watch(
  () => route.query.mode,
  () => applyRouteState()
)
</script>

<template>
  <v-container fluid class="pa-0">
    <v-row>
      <v-col cols="12" md="12" class="mx-auto">
        <!-- Loading Overlay -->
        <v-overlay
          v-model="isLoadingStations"
          contained
          class="d-flex align-center justify-center"
        >
          <div class="text-center">
            <v-progress-circular indeterminate size="64" color="primary" class="mb-4" />
            <div class="text-h6">Carregando todas as estações...</div>
            <div class="text-body-2 mt-2">Garantindo que todas as 14 estações INEP 2021 sejam carregadas</div>
          </div>
        </v-overlay>

        <StationListHeader
          :selected-candidate="selectedCandidate"
          :selected-mode="selectedMode"
          :mode-title="modeInfo?.title"
          :mode-description="modeInfo?.description"
          @back-to-mode-selection="() => router.push({ name: 'station-list' })"
          @change-candidate="() => router.push({ name: 'station-list' })"
        />

        <SequentialConfigPanel
          v-if="isSimulationModeActive"
          :show="showSequentialConfig"
          :selected-stations="selectedStationsSequence"
          @toggle="toggleSequentialConfig"
          @move-station="moveStationInSequence"
          @remove-station="removeFromSequence"
          @start="handleStartSequentialSimulation"
          @reset="resetSequentialConfig"
        />

        <SearchBar
          v-model="globalSearchQuery"
          :items="inepAutocompleteItems"
          :total-stations="inepTotalAll"
          @station-selected="handleStartSimulation"
        />

        <v-card class="pa-4 mb-4" rounded="lg" elevation="1">
          <div class="d-flex align-center">
            <v-img :src="inepIcon" max-width="48" class="me-3" />
            <div class="text-h6 font-weight-bold">INEP — Provas Anteriores</div>
            <v-spacer />
            <v-badge :content="inepTotalAll" color="primary" inline />
          </div>
        </v-card>

        <v-expansion-panels variant="accordion" class="mb-6">
          <INEPPeriodSection
            v-for="period in inepPeriods"
            :key="period"
            v-show="filteredStationsByInepPeriod[period]?.length > 0"
            :period="period"
            :stations="filteredStationsByInepPeriod[period] || []"
            :show-sequential-config="showSequentialConfig"
            :is-admin="isAdmin"
            :get-user-station-score="getUserStationScore"
            :get-station-background-color="getStationBackgroundColor"
            :get-specialty="getSpecialty"
            :is-station-in-sequence="isStationInSequence"
            :creating-session-for-station-id="creatingSessionForStationId"
            @station-click="handleStartSimulation"
            @add-to-sequence="addToSequence"
            @remove-from-sequence="removeFromSequence"
            @edit-station="goToEditStation"
          />
        </v-expansion-panels>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
</style>
