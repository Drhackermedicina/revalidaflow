<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { watchDebounced } from '@vueuse/core'
import { useRoute, useRouter } from 'vue-router'

import inepIcon from '@/assets/images/inep.png'
import SpecialtySection from '@/components/specialty/SpecialtySection.vue'
import INEPPeriodSection from '@/components/specialty/INEPPeriodSection.vue'
import SearchBar from '@/components/search/SearchBar.vue'
import CandidateSearchBar from '@/components/search/CandidateSearchBar.vue'
import SequentialConfigPanel from '@/components/sequential/SequentialConfigPanel.vue'
import ModeSelectionCard from '@/components/station/ModeSelectionCard.vue'
import SectionHeroCard from '@/components/station/SectionHeroCard.vue'
import StationListHeader from '@/components/station/StationListHeader.vue'
import AdminUploadCard from '@/components/admin/AdminUploadCard.vue'
import stationRepository from '@/repositories/stationRepository'

import { useStationData } from '@/composables/useStationData'
import { useStationFilteringOptimized } from '@/composables/useStationFilteringOptimized'
import { useStationCategorization } from '@/composables/useStationCategorization'
import { useSequentialMode } from '@/composables/useSequentialMode'
import { useCandidateSearch } from '@/composables/useCandidateSearch'
import { useUserManagement } from '@/composables/useUserManagement'
import { useStationNavigation } from '@/composables/useStationNavigation'
import { currentUser } from '@/plugins/auth.js'

const {
  stations,
  fetchUserScores,
  fetchStations,
  loadFullStation,
  getUserStationScore,
  hasMoreStations,
  isLoadingMoreStations
} = useStationData()

const {
  globalSearchQuery,
  isINEPStation,
  isRevalidaFacilStation,
  getSpecialty,
  getRevalidaFacilSpecialty,
  getCleanStationTitle,
  filteredINEPStations,
  filteredRevalidaFacilStations,
  filteredStationsRevalidaFacilClinicaMedica,
  filteredStationsRevalidaFacilCirurgia,
  filteredStationsRevalidaFacilPediatria,
  filteredStationsRevalidaFacilGO,
  filteredStationsRevalidaFacilPreventiva,
  filteredStationsRevalidaFacilProcedimentos,
  filteredStationsByInepPeriod,
  globalAutocompleteItems
} = useStationFilteringOptimized(stations)

const { getStationBackgroundColor, getStationArea } = useStationCategorization()

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
} = useSequentialMode(loadFullStation, getCleanStationTitle, getStationArea)

const {
  selectedCandidate,
  candidateSearchQuery,
  candidateSearchSuggestions,
  showCandidateSuggestions,
  isLoadingCandidateSearch,
  searchCandidates,
  selectCandidate,
  clearCandidateSelection
} = useCandidateSearch(currentUser)

const { isAdmin } = useUserManagement()

const {
  creatingSessionForStationId,
  startSimulationAsActor,
  goToEditStation,
  goToAdminUpload,
  expandCorrectSection
} = useStationNavigation()

const route = useRoute()
const router = useRouter()

const currentState = ref('initial') // initial, candidate-selected, simple-training, simulation
const selectedMode = ref(null)

const selectedStation = ref(null)
const inepPeriods = ['2025.1', '2024.2', '2024.1', '2023.2', '2023.1', '2022.2', '2022.1', '2021', '2020', '2017', '2016', '2015', '2014', '2013', '2012', '2011']

const loadMoreSentinel = ref(null)
let intersectionObserver = null

const accordionRefs = {
  showPreviousExamsSection: ref(false),
  showRevalidaFacilClinicaMedica: ref(false),
  showRevalidaFacilCirurgia: ref(false),
  showRevalidaFacilPediatria: ref(false),
  showRevalidaFacilGO: ref(false),
  showRevalidaFacilPreventiva: ref(false),
  showRevalidaFacilProcedimentos: ref(false)
}

// Removido: não abrimos mais os painéis nesta página; usamos páginas dedicadas

const shouldShowCandidateSearch = computed(() => currentState.value === 'initial')
const shouldShowModeSelection = computed(() => currentState.value === 'candidate-selected')
const shouldShowStationList = computed(() => ['simple-training', 'simulation'].includes(currentState.value))
const isSimulationModeActive = computed(() => selectedMode.value === 'simulation')

const modeInfoMap = {
  'simple-training': {
    title: 'Treinamento Simples',
    description: 'Treine uma estação por vez, no seu próprio ritmo.',
    icon: 'ri-user-follow-line',
    color: 'success',
    duration: 'Aprox. 15 min por estação'
  },
  simulation: {
    title: 'Simulação Completa',
    description: 'Monte uma sequência e percorra várias estações em sequência.',
    icon: 'ri-play-list-line',
    color: 'primary',
    duration: 'Aprox. 60-90 min'
  }
}

const modeInfo = computed(() => {
  if (!selectedMode.value) return null
  return modeInfoMap[selectedMode.value]
})

// Totais por seção calculados a partir de todas as estações (via cache do repositório)
const allStationsForCounts = ref([])
const inepTotalAll = computed(() => (allStationsForCounts.value || []).filter(s => isINEPStation(s)).length)
const revalidaTotalAll = computed(() => (allStationsForCounts.value || []).filter(s => isRevalidaFacilStation(s)).length)

function findStation(stationId) {
  return stations.value.find(s => s.id === stationId)
}

function clearSearchFields() {
  selectedStation.value = null
  globalSearchQuery.value = ''
}

function handleStartSimulation(stationId) {
  const mode = selectedMode.value

  if (mode === 'simple-training') {
    startSimulationAsActor(stationId, {
      loadFullStation,
      expandCorrectSection: station => expandCorrectSection(
        station,
        accordionRefs,
        isINEPStation,
        isRevalidaFacilStation,
        getRevalidaFacilSpecialty
      ),
      findStation,
      selectedCandidate,
      clearSearchFields
    })
  } else if (mode === 'simulation') {
    const station = findStation(stationId)
    if (station && !isStationInSequence(stationId)) {
      addToSequence(station)
    }
  }
}

function handleStartSequentialSimulation() {
  startSequentialSimulation({
    candidate: selectedCandidate.value || null
  })
}

function handleModeSelection(mode) {
  selectedMode.value = mode

  if (mode === 'simulation') {
    resetSequentialConfig()
    showSequentialConfig.value = true
  } else {
    showSequentialConfig.value = false
    resetSequentialConfig()
  }

  currentState.value = mode
  setModeQuery(mode)

  // Expandir primeira seção relevante após escolher o modo
  setTimeout(() => {
    expandFirstSection()
  }, 200)
}

function handleBackToModeSelection() {
  currentState.value = 'candidate-selected'
  selectedMode.value = null
  showSequentialConfig.value = false
  resetSequentialConfig()
  setModeQuery()
}

// Novas ações: navegação para páginas dedicadas
function openInepSection() {
  const mode = selectedMode.value || 'simple-training'
  router.push({ name: 'stations-inep', query: { mode } })
}

function openRevalidaSection() {
  const mode = selectedMode.value || 'simple-training'
  router.push({ name: 'stations-revalida', query: { mode } })
}

// Botão central: Apenas visualizar as estações
function viewStationsDirectly() {
  router.push({ name: 'stations-hub' })
}

function handleChangeCandidate() {
  clearCandidateSelection()
  currentState.value = 'initial'
  selectedMode.value = null
  showSequentialConfig.value = false
  resetSequentialConfig()
  setModeQuery()
}

function expandFirstSection() {
  if (filteredINEPStations.value.length > 0) {
    accordionRefs.showPreviousExamsSection.value = true
    return
  }

  const orderedRevalidaGroups = [
    filteredStationsRevalidaFacilClinicaMedica,
    filteredStationsRevalidaFacilCirurgia,
    filteredStationsRevalidaFacilPediatria,
    filteredStationsRevalidaFacilGO,
    filteredStationsRevalidaFacilPreventiva,
    filteredStationsRevalidaFacilProcedimentos
  ]

  const accordionSlots = [
    'showRevalidaFacilClinicaMedica',
    'showRevalidaFacilCirurgia',
    'showRevalidaFacilPediatria',
    'showRevalidaFacilGO',
    'showRevalidaFacilPreventiva',
    'showRevalidaFacilProcedimentos'
  ]

  orderedRevalidaGroups.some((group, index) => {
    if ((group.value || []).length > 0) {
      accordionRefs[accordionSlots[index]].value = true
      return true
    }
    return false
  })
}

onMounted(async () => {
  document.documentElement.classList.add('station-list-page-active')

  await fetchStations()
  clearSearchFields()

  if (hasMoreStations.value) {
    await fetchStations(true)
    if (hasMoreStations.value) {
      await fetchStations(true)
    }
  }

  if (loadMoreSentinel.value) {
    intersectionObserver = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMoreStations.value && !isLoadingMoreStations.value) {
          fetchStations(true)
        }
      },
      {
        rootMargin: '200px',
        threshold: 0.1
      }
    )

    intersectionObserver.observe(loadMoreSentinel.value)
  }

  await restoreCandidateFromSession()
  applyRouteState()
  // Carrega todas as estações para contadores precisos por prefixo (INEP x REVALIDA)
  try {
    allStationsForCounts.value = await stationRepository.getAll(true)
  } catch {}
})

onUnmounted(() => {
  document.documentElement.classList.remove('station-list-page-active')
  const wrapper = document.querySelector('.layout-wrapper')
  wrapper?.classList.remove('layout-vertical-nav-collapsed')

  if (intersectionObserver) {
    intersectionObserver.disconnect()
    intersectionObserver = null
  }
})

watch(selectedCandidate, newCandidate => {
  if (newCandidate) {
    if (selectedMode.value) {
      currentState.value = selectedMode.value
      if (selectedMode.value === 'simulation') {
        showSequentialConfig.value = true
        setTimeout(() => {
          expandFirstSection()
        }, 200)
      }
    } else {
      currentState.value = 'candidate-selected'
    }
  } else {
    currentState.value = 'initial'
    selectedMode.value = null
    showSequentialConfig.value = false
    resetSequentialConfig()
    setModeQuery()
  }
})

watchDebounced(
  globalSearchQuery,
  () => {
    // filtros já são réativos
  },
  { debounce: 300 }
)

watch(currentUser, newUser => {
  if (newUser && stations.value.length > 0) {
    fetchUserScores()
  }
}, { immediate: true })

watch(
  () => route.query.mode,
  () => {
    applyRouteState()
  }
)

function setModeQuery(mode) {
  const currentMode = route.query.mode
  if ((!mode && !currentMode) || mode === currentMode) {
    return
  }

  const newQuery = { ...route.query }
  if (mode) {
    newQuery.mode = mode
  } else {
    delete newQuery.mode
  }
  router.replace({ query: newQuery }).catch(() => {})
}

async function restoreCandidateFromSession() {
  if (selectedCandidate.value || typeof window === 'undefined') return

  const stored = sessionStorage.getItem('selectedCandidate')
  if (!stored) return

  try {
    const candidate = JSON.parse(stored)
    if (candidate?.uid) {
      const nameParts = (candidate.name || '').trim().split(/\s+/).filter(Boolean)
      const normalizedCandidate = {
        ...candidate,
        nome: candidate.nome || nameParts[0] || '',
        sobrenome: candidate.sobrenome || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : ''),
      }
      await selectCandidate(normalizedCandidate)
    }
  } catch (error) {
    sessionStorage.removeItem('selectedCandidate')
  }
}

function applyRouteState() {
  const modeFromRoute = route.query.mode

  if (modeFromRoute === 'simple-training' || modeFromRoute === 'simulation') {
    selectedMode.value = modeFromRoute
    showSequentialConfig.value = modeFromRoute === 'simulation'
    currentState.value = selectedCandidate.value ? modeFromRoute : 'initial'
    if (modeFromRoute === 'simulation' && selectedCandidate.value) {
      expandFirstSection()
    }
    return
  }

  selectedMode.value = null
  showSequentialConfig.value = false
  if (selectedCandidate.value) {
    currentState.value = 'candidate-selected'
  } else {
    currentState.value = 'initial'
  }
}
</script>

<template>
  <v-container fluid class="pa-0 main-content-container">
    <v-row>
      <v-col cols="12" md="12" class="mx-auto">
        <AdminUploadCard v-if="isAdmin" @navigate-to-upload="goToAdminUpload" />

        <div v-if="shouldShowCandidateSearch">
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

          <div class="d-flex justify-center mt-4">
            <v-btn color="primary" variant="elevated" @click="viewStationsDirectly">
              Ir para a Lista de estações sem selecionar candidato
            </v-btn>
          </div>
        </div>

        <div v-if="shouldShowModeSelection" class="mode-selection-container">
          <v-row>
            <v-col cols="12" md="6" class="mb-4">
              <ModeSelectionCard
                title="Treinamento Simples"
                description="Treine uma estação por vez, no seu próprio ritmo"
                icon="ri-user-follow-line"
                color="success"
                duration="Aprox. 15 min por estação"
                @select="handleModeSelection('simple-training')"
              />
            </v-col>
            <v-col cols="12" md="6" class="mb-4">
              <ModeSelectionCard
                title="Simulação Completa"
                description="Simulação sequencial de múltiplas estações"
                icon="ri-play-list-line"
                color="primary"
                duration="Aprox. 60-90 min"
                @select="handleModeSelection('simulation')"
              />
            </v-col>
          </v-row>
        </div>

        <StationListHeader
          v-if="shouldShowStationList"
          :selected-candidate="selectedCandidate"
          :selected-mode="selectedMode"
          :mode-title="modeInfo?.title"
          :mode-description="modeInfo?.description"
          @back-to-mode-selection="handleBackToModeSelection"
          @change-candidate="handleChangeCandidate"
        />

        <SequentialConfigPanel
          v-if="isSimulationModeActive && shouldShowStationList"
          :show="showSequentialConfig"
          :selected-stations="selectedStationsSequence"
          @toggle="toggleSequentialConfig"
          @move-station="moveStationInSequence"
          @remove-station="removeFromSequence"
          @start="handleStartSequentialSimulation"
          @reset="resetSequentialConfig"
        />

        

        <!-- Cards altos e estreitos para abrir as seções principais (após selecionar o modo) -->
        <v-row v-if="shouldShowStationList" class="mt-6 mb-8" justify="center" align="stretch">
          <v-col cols="12" sm="6" md="4" lg="3" class="d-flex justify-center mb-4">
            <SectionHeroCard
              title="INEP — Provas Anteriores"
              subtitle="Acesse estações por período"
              :image="inepIcon"
              :badge-count="inepTotalAll"
              color="primary"
              gradient-start="#ECF4FF"
              gradient-end="#F7FAFF"
              @click="openInepSection"
            />
          </v-col>
          <v-col cols="12" sm="6" md="4" lg="3" class="d-flex justify-center mb-4">
            <SectionHeroCard
              title="REVALIDA FLOW"
              subtitle="Estações por especialidade"
              image="/botaosemfundo.png"
              :badge-count="revalidaTotalAll"
              color="success"
              gradient-start="#E9F7EF"
              gradient-end="#F5FBF7"
              @click="openRevalidaSection"
            />
          </v-col>
        </v-row>

        <!-- Seções antigas removidas desta página -->

        <div v-if="shouldShowStationList" ref="loadMoreSentinel" class="load-more-sentinel" style="height: 1px; margin-top: 20px;" />

        <v-row v-if="shouldShowStationList && isLoadingMoreStations" class="mt-4">
          <v-col cols="12" class="text-center">
            <v-progress-circular indeterminate color="primary" />
            <div class="mt-2">Carregando mais estações...</div>
          </v-col>
        </v-row>

      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.main-content-container {
  background-color: transparent !important;
}

.mode-selection-container {
  margin-bottom: 24px;
}

.station-list-item {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.station-list-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.rounded-input .v-input__control .v-input__slot {
  border-radius: 8px;
}

.v-expansion-panel-title.rounded-button-title.section-button {
  /* Botão mais alto do que largo (ênfase vertical) */
  min-height: 110px;
  padding: 20px 24px;
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(0,0,0,0.04), rgba(0,0,0,0.02));
  border: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
  transition: transform 0.25s ease, box-shadow 0.25s ease, background 0.25s ease;
}

.v-expansion-panel-title.rounded-button-title.section-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.12);
  background: linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0.025));
}

/* Ícone das seções */
.section-icon {
  width: 64px;
  height: 64px;
  border-radius: 14px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
}

/* Tipografia moderna para os títulos das seções */
.section-title {
  font-size: 1.125rem; /* ~18px */
  font-weight: 800;
  letter-spacing: 0.3px;
  text-transform: uppercase;
}

.section-subtitle {
  margin-top: 4px;
  font-size: 0.9rem;
  opacity: 0.8;
}

.v-expansion-panel.contained-panel {
  margin-left: auto;
  margin-right: auto;
}

/* Melhor contraste no tema escuro para os títulos dos painéis principais */
:deep(.v-theme--dark) .v-expansion-panel-title.rounded-button-title {
  background-color: rgba(var(--v-theme-surface), 0.96) !important;
  border: 1px solid rgba(var(--v-theme-outline), 0.24) !important;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4) !important;
  color: rgb(var(--v-theme-on-surface)) !important;
}

.sequential-selection-btn .v-icon {
  color: #1565c0 !important;
  opacity: 1 !important;
  font-weight: 700 !important;
  visibility: visible !important;
}

.v-btn[variant='tonal'].sequential-selection-btn .v-icon {
  color: #2e7d32 !important;
}
</style>



