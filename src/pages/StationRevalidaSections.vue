<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import SpecialtySection from '@/components/specialty/SpecialtySection.vue'
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
  stations,
  fetchStations,
  loadFullStation,
  getUserStationScore,
  hasMoreStations,
} = useStationData()

const {
  globalSearchQuery,
  filteredRevalidaFacilStations,
  filteredStationsRevalidaFacilClinicaMedica,
  filteredStationsRevalidaFacilCirurgia,
  filteredStationsRevalidaFacilPediatria,
  filteredStationsRevalidaFacilGO,
  filteredStationsRevalidaFacilPreventiva,
  filteredStationsRevalidaFacilProcedimentos,
  isRevalidaFacilStation,
} = useStationFilteringOptimized(stations)

const allStationsForCounts = ref([])

// Autocomplete restrito ao escopo REVALIDA FLOW
const revalidaAutocompleteItems = computed(() => {
  const flat = filteredRevalidaFacilStations.value || []
  const unique = new Map()
  for (const s of flat) {
    const id = s.id || s.idEstacao
    if (!id || unique.has(id)) continue
    unique.set(id, {
      title: s.cleanTitle || s.tituloEstacao,
      value: id,
      subtitle: s.especialidade,
      isINEP: false,
      iconImage: '/botaosemfundo.png',
    })
  }
  return Array.from(unique.values())
})

const revalidaTotalAll = computed(() => (allStationsForCounts.value || []).filter(isRevalidaFacilStation).length)

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
const isSimulationModeActive = computed(() => selectedMode.value === 'simulation')

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

function handleStartSequentialSimulation() {
  startSequentialSimulation({ candidate: selectedCandidate.value || null })
}

onMounted(async () => {
  await fetchStations()
  if (hasMoreStations.value) await fetchStations(true)
  await restoreCandidateFromSession()
  applyRouteState()
  try { allStationsForCounts.value = await stationRepository.getAll(true) } catch {}
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
          :items="revalidaAutocompleteItems"
          :total-stations="revalidaTotalAll"
          @station-selected="handleStartSimulation"
        />

        <v-card class="pa-4 mb-4" rounded="lg" elevation="1">
          <div class="d-flex align-center">
            <v-img src="/botaosemfundo.png" max-width="48" class="me-3" />
            <div class="text-h6 font-weight-bold">REVALIDA FLOW</div>
            <v-spacer />
            <v-badge :content="revalidaTotalAll" color="primary" inline />
          </div>
        </v-card>

        <v-expansion-panels variant="accordion" class="mb-6">
          <SpecialtySection
            v-if="filteredStationsRevalidaFacilClinicaMedica.length > 0"
            title="Clínica Médica"
            :stations="filteredStationsRevalidaFacilClinicaMedica"
            icon="ri-stethoscope-line"
            color="info"
            specialty="clinica-medica"
            :show-sequential-config="showSequentialConfig"
            :is-admin="isAdmin"
            :get-user-station-score="getUserStationScore"
            :get-station-background-color="getStationBackgroundColor"
            :is-station-in-sequence="isStationInSequence"
            :creating-session-for-station-id="creatingSessionForStationId"
            @station-click="handleStartSimulation"
            @add-to-sequence="addToSequence"
            @remove-from-sequence="removeFromSequence"
            @edit-station="goToEditStation"
          />

          <SpecialtySection
            v-if="filteredStationsRevalidaFacilCirurgia.length > 0"
            title="Cirurgia"
            :stations="filteredStationsRevalidaFacilCirurgia"
            icon="ri-knife-line"
            color="primary"
            specialty="cirurgia"
            :show-sequential-config="showSequentialConfig"
            :is-admin="isAdmin"
            :get-user-station-score="getUserStationScore"
            :get-station-background-color="getStationBackgroundColor"
            :is-station-in-sequence="isStationInSequence"
            :creating-session-for-station-id="creatingSessionForStationId"
            @station-click="handleStartSimulation"
            @add-to-sequence="addToSequence"
            @remove-from-sequence="removeFromSequence"
            @edit-station="goToEditStation"
          />

          <SpecialtySection
            v-if="filteredStationsRevalidaFacilPediatria.length > 0"
            title="Pediatria"
            :stations="filteredStationsRevalidaFacilPediatria"
            icon="ri-bear-smile-line"
            color="success"
            specialty="pediatria"
            :show-sequential-config="showSequentialConfig"
            :is-admin="isAdmin"
            :get-user-station-score="getUserStationScore"
            :get-station-background-color="getStationBackgroundColor"
            :is-station-in-sequence="isStationInSequence"
            :creating-session-for-station-id="creatingSessionForStationId"
            @station-click="handleStartSimulation"
            @add-to-sequence="addToSequence"
            @remove-from-sequence="removeFromSequence"
            @edit-station="goToEditStation"
          />

          <SpecialtySection
            v-if="filteredStationsRevalidaFacilGO.length > 0"
            title="Ginecologia e Obstetrícia"
            :stations="filteredStationsRevalidaFacilGO"
            icon="ri-women-line"
            color="#E91E63"
            specialty="ginecologia"
            :show-sequential-config="showSequentialConfig"
            :is-admin="isAdmin"
            :get-user-station-score="getUserStationScore"
            :get-station-background-color="getStationBackgroundColor"
            :is-station-in-sequence="isStationInSequence"
            :creating-session-for-station-id="creatingSessionForStationId"
            @station-click="handleStartSimulation"
            @add-to-sequence="addToSequence"
            @remove-from-sequence="removeFromSequence"
            @edit-station="goToEditStation"
          />

          <SpecialtySection
            v-if="filteredStationsRevalidaFacilPreventiva.length > 0"
            title="Preventiva"
            :stations="filteredStationsRevalidaFacilPreventiva"
            icon="ri-shield-cross-line"
            color="warning"
            specialty="preventiva"
            :show-sequential-config="showSequentialConfig"
            :is-admin="isAdmin"
            :get-user-station-score="getUserStationScore"
            :get-station-background-color="getStationBackgroundColor"
            :is-station-in-sequence="isStationInSequence"
            :creating-session-for-station-id="creatingSessionForStationId"
            @station-click="handleStartSimulation"
            @add-to-sequence="addToSequence"
            @remove-from-sequence="removeFromSequence"
            @edit-station="goToEditStation"
          />

          <SpecialtySection
            v-if="filteredStationsRevalidaFacilProcedimentos.length > 0"
            title="Procedimentos"
            :stations="filteredStationsRevalidaFacilProcedimentos"
            icon="ri-syringe-line"
            color="#A52A2A"
            specialty="procedimentos"
            :show-sequential-config="showSequentialConfig"
            :is-admin="isAdmin"
            :get-user-station-score="getUserStationScore"
            :get-station-background-color="getStationBackgroundColor"
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
