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
import HeroIntroCard from '@/components/station/HeroIntroCard.vue'
import SelectedCandidateCard from '@/components/station/SelectedCandidateCard.vue'
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
  <!-- Hero Section Moderno -->
  <v-container fluid class="pa-0 main-content-container">
    <!-- Hero Intro Card - Apenas quando ainda não escolheu o modo -->
    <v-row v-if="!selectedMode && !shouldShowCandidateSearch">
      <v-col cols="12" class="py-8">
        <HeroIntroCard
          title="Como você quer treinar hoje?"
          subtitle="Escolha entre treinamento individual ou simulação completa sequencial"
          icon="ri-stethoscope-line"
          :station-count="allStationsForCounts.length"
        />
      </v-col>
    </v-row>
    
    <!-- Hero Section Simples (para estado inicial de busca) -->
    <v-row v-if="shouldShowCandidateSearch">
      <v-col cols="12" class="text-center py-12 hero-section-modern">
        <h1 class="display-lg mb-4">
          <span class="gradient-text">Estações de Simulação</span>
        </h1>
        <p class="body-lg text-medium-emphasis mb-8 max-width-600 mx-auto">
          Escolha entre treinamento individual ou simulação completa sequencial
        </p>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="12" class="mx-auto section-container">
        <div class="page-content">
          <AdminUploadCard
            v-if="isAdmin"
            class="admin-card"
            @navigate-to-upload="goToAdminUpload"
          />

          <div v-if="shouldShowCandidateSearch" class="candidate-search-section">
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

            <div class="d-flex justify-center mt-6">
              <v-btn
                class="modern-btn outline-btn"
                variant="outlined"
                size="large"
                @click="viewStationsDirectly"
              >
                <VIcon icon="ri-eye-line" class="mr-2" :tabindex="undefined" />
                Explorar Estações sem Seleção
              </v-btn>
            </div>
          </div>

          <div v-if="shouldShowModeSelection" class="mode-selection-container hero-card-modern">
            <div class="text-center mb-8">
              <h2 class="heading-lg mb-4 gradient-text">Escolha o Modo de Treinamento</h2>
              <p class="body-md text-medium-emphasis">
                Selecione como deseja realizar suas simulações médicas
              </p>
            </div>
            
            <v-row>
              <v-col cols="12" md="6" class="mb-4">
                <ModeSelectionCard
                  title="Treinamento Simples"
                  description="Pratique uma estação por vez, no seu próprio ritmo e horário"
                  icon="ri-user-follow-line"
                  color="success"
                  duration="~ 15 minutos por estação"
                  @select="handleModeSelection('simple-training')"
                />
              </v-col>
              <v-col cols="12" md="6" class="mb-4">
                <ModeSelectionCard
                  title="Simulação Completa"
                  description="Experimente múltiplas estações em sequência realista"
                  icon="ri-play-list-line"
                  color="primary"
                  duration="~ 60-90 minutos total"
                  @select="handleModeSelection('simulation')"
                />
              </v-col>
            </v-row>
          </div>

          <div
            v-if="shouldShowStationList && selectedMode && selectedCandidate"
            class="selected-candidate-wrapper"
          >
            <SelectedCandidateCard
              :candidate="selectedCandidate"
              @back="handleBackToModeSelection"
              @change="handleChangeCandidate"
            />
          </div>

          <SequentialConfigPanel
            v-if="isSimulationModeActive && shouldShowStationList"
            class="sequential-panel"
            :show="showSequentialConfig"
            :selected-stations="selectedStationsSequence"
            @toggle="toggleSequentialConfig"
            @move-station="moveStationInSequence"
            @remove-station="removeFromSequence"
            @start="handleStartSequentialSimulation"
            @reset="resetSequentialConfig"
          />

          <!-- Seção de Cards Hero Modernos - Apenas após escolher o modo -->
          <div v-if="shouldShowStationList && selectedMode" class="hero-cards-section">
            <div class="text-center mb-8">
              <h3 class="heading-md mb-4">Escolha a Categoria</h3>
              <p class="body-md text-medium-emphasis">
                Acesse diferentes tipos de estações organizadas por origem
              </p>
            </div>
            
            <v-row class="justify-center">
              <v-col cols="12" sm="6" md="5" lg="4" class="d-flex justify-center mb-6">
                <div class="hero-card-wrapper">
                  <SectionHeroCard
                    title="INEP — Provas Anteriores"
                    subtitle="Acesse estações organizadas por período de exame oficial"
                    :image="inepIcon"
                    :badge-count="inepTotalAll"
                    color="primary"
                    gradient-start="#ECF4FF"
                    gradient-end="#F7FAFF"
                    cta-label="Explorar INEP"
                    cta-icon="ri-arrow-right-line"
                    decorative-icon="ri-government-line"
                    @click="openInepSection"
                  />
                </div>
              </v-col>
              <v-col cols="12" sm="6" md="5" lg="4" class="d-flex justify-center mb-6">
                <div class="hero-card-wrapper">
                  <SectionHeroCard
                    title="REVALIDA FLOW"
                    subtitle="Estações organizadas por especialidade médica para treino focado"
                    image="/botaosemfundo.png"
                    :badge-count="revalidaTotalAll"
                    color="success"
                    gradient-start="#E9F7EF"
                    gradient-end="#F5FBF7"
                    cta-label="Explorar Especialidades"
                    cta-icon="ri-arrow-right-line"
                    decorative-icon="ri-heart-pulse-line"
                    @click="openRevalidaSection"
                  />
                </div>
              </v-col>
            </v-row>
          </div>

          <!-- Loading State Modernizado -->
          <div v-if="shouldShowStationList" ref="loadMoreSentinel" class="load-more-sentinel" />
          
          <v-row v-if="shouldShowStationList && isLoadingMoreStations" class="mt-8">
            <v-col cols="12" class="text-center">
              <div class="loading-container">
                <v-progress-circular
                  indeterminate
                  size="48"
                  width="4"
                  color="primary"
                  class="mb-4"
                />
                <div class="body-md text-medium-emphasis">Carregando mais estações...</div>
              </div>
            </v-col>
          </v-row>
        </div>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped lang="scss">
// ============================================================================
// 🎨 SISTEMA DE CORES MODERNO
// ============================================================================

:root {
  // Gradientes Primários
  --gradient-primary: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --gradient-accent: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  --gradient-success: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  --gradient-warning: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
  
  // Cores de Fundo
  --bg-gradient: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  --card-gradient: linear-gradient(145deg, rgba(255,255,255,0.25), rgba(255,255,255,0.1));
  
  // Cores Temáticas
  --inep-color: #2563eb;
  --revalida-color: #16a34a;
  --glass-border: rgba(255,255,255,0.2);
  
  // Sombras Modernas
  --shadow-card: 0 4px 20px rgba(0,0,0,0.08);
  --shadow-hover: 0 20px 40px rgba(0,0,0,0.12);
  --shadow-hero: 0 25px 50px rgba(0,0,0,0.15);
}
:deep(.v-theme--dark) {
  --bg-gradient: linear-gradient(170deg, #1d1237 0%, #0f0a23 100%);
  --card-gradient: linear-gradient(155deg, rgba(126, 87, 255, 0.22), rgba(34, 197, 255, 0.1));
  --glass-border: rgba(193, 174, 255, 0.35);
  --shadow-card: 0 18px 42px rgba(24, 15, 56, 0.55);
  --shadow-hover: 0 26px 54px rgba(24, 15, 56, 0.6);
  --shadow-hero: 0 32px 68px rgba(31, 18, 73, 0.58);
}

// ============================================================================
// 🌟 LAYOUT PRINCIPAL MODERNO
// ============================================================================

.main-content-container {
  background: var(--bg-gradient) !important;
  min-height: 100vh;
  position: relative;
  
  &::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.1) 0%, transparent 50%),
                radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.1) 0%, transparent 50%);
    pointer-events: none;
    z-index: -1;
  }
}

// ============================================================================
// 🎴 CONTAINER DE SELEÇÃO DE MODO
// ============================================================================

.mode-selection-container {
  margin: 3rem 0;
  padding: 2rem;
  background: var(--card-gradient);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  border: 1px solid var(--glass-border);
  box-shadow: var(--shadow-card);
}

// ============================================================================
// 💫 CARDS MODERNOS E INTERATIVOS
// ============================================================================


// ============================================================================
// 🔍 BARRA DE BUSCA MODERNA
// ============================================================================

.rounded-input {
  .v-input__control .v-input__slot {
    border-radius: 50px !important;
    background: rgba(255,255,255,0.9) !important;
    backdrop-filter: blur(20px) !important;
    border: 2px solid transparent !important;
    padding: 1rem 2rem !important;
    box-shadow: 0 8px 32px rgba(0,0,0,0.1) !important;
    transition: all 0.3s ease !important;
    
    &:focus-within {
      border-color: #667eea !important;
      box-shadow: 0 8px 32px rgba(102,126,234,0.2) !important;
    }
  }
}

// ============================================================================
// 🎯 BOTÕES DE SEÇÃO COM DESIGN MODERNO
// ============================================================================

.v-expansion-panel-title.rounded-button-title.section-button {
  min-height: 120px;
  padding: 2rem;
  border-radius: 24px;
  background: var(--card-gradient);
  backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
  box-shadow: var(--shadow-card);
  position: relative;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: var(--gradient-primary);
    transform: scaleX(0);
    transition: transform 0.3s ease;
  }
  
  &:hover {
    transform: translateY(-6px) scale(1.02);
    box-shadow: var(--shadow-hero);
    
    &::before {
      transform: scaleX(1);
    }
  }
}

// ============================================================================
// 🎨 ÍCONES DAS SEÇÕES COM EFEITOS
// ============================================================================

.section-icon {
  width: 72px;
  height: 72px;
  border-radius: 18px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 100%);
  }
  
  &:hover {
    transform: scale(1.1) rotate(5deg);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.16);
  }
}

// ============================================================================
// 📝 TIPOGRAFIA MODERNA E HIERÁRQUICA
// ============================================================================

.section-title {
  font-size: 1.25rem;
  font-weight: 800;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1.3;
}

.section-subtitle {
  margin-top: 0.5rem;
  font-size: 1rem;
  opacity: 0.8;
  font-weight: 400;
  line-height: 1.5;
}

// ============================================================================
// 🎪 GRID RESPONSIVO MODERNO
// ============================================================================

.v-expansion-panel.contained-panel {
  margin: 0 auto;
  max-width: 400px;
  
  @media (min-width: 768px) {
    max-width: 600px;
  }
}

// ============================================================================
// 🌙 DARK MODE SUPPORT
// ============================================================================

:deep(.v-theme--dark) {
  .main-content-container {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%) !important;
  }
  
  .v-expansion-panel-title.rounded-button-title.section-button {
    background: rgba(30,30,30,0.8) !important;
    border-color: rgba(255,255,255,0.1) !important;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4) !important;
    color: rgba(255,255,255,0.9) !important;
  }
  
  .rounded-input .v-input__control .v-input__slot {
    background: rgba(30,30,30,0.9) !important;
    border-color: rgba(255,255,255,0.1) !important;
  }
  
  .section-icon {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  }
  
  .hero-section-modern {
    h1, h2, h3 {
      color: rgba(255,255,255,0.95) !important;
    }
  }
  
  .mode-selection-container {
    background: rgba(30,30,30,0.8) !important;
    border-color: rgba(255,255,255,0.1) !important;
  }
}

// ============================================================================
// 🎨 ELEMENTOS VISUAIS FINAIS
// ============================================================================

.hero-section-modern {
  background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%);
  backdrop-filter: blur(10px);
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at 50% 50%, rgba(102,126,234,0.1) 0%, transparent 70%);
    animation: float 8s ease-in-out infinite;
  }
  
  .gradient-text {
    background: var(--gradient-primary);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    font-weight: 800;
  }
}

.candidate-search-section {
  margin: 3rem 0;
  text-align: center;
}

.modern-btn {
  border-radius: 50px !important;
  padding: 1rem 2.5rem !important;
  font-weight: 600 !important;
  text-transform: none !important;
  letter-spacing: 0.5px !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
  position: relative !important;
  overflow: hidden !important;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
    transition: left 0.5s;
  }
  
  &:hover {
    transform: translateY(-2px) !important;
    box-shadow: 0 8px 25px rgba(0,0,0,0.15) !important;
    
    &::before {
      left: 100% !important;
    }
  }
}

.outline-btn {
  border: 2px solid transparent !important;
  background: rgba(255,255,255,0.1) !important;
  backdrop-filter: blur(10px) !important;
  
  &:hover {
    border-color: #667eea !important;
    background: rgba(102,126,234,0.1) !important;
  }
}

.section-container {
  position: relative;
  z-index: 1;
}

.hero-cards-section {
  margin: 4rem 0;
  padding: 2rem 0;
}

.hero-card-wrapper {
  width: 100%;
  max-width: 380px;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  
  &:hover {
    transform: translateY(-8px) scale(1.02);
  }
}

.loading-container {
  background: var(--card-gradient);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 3rem 2rem;
  border: 1px solid var(--glass-border);
  box-shadow: var(--shadow-card);
}

.selected-candidate-wrapper {
  max-width: 520px;
  margin: 0 auto;
  display: flex;
  justify-content: center;
}

.page-content {
  width: min(100%, 1180px);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.page-content > * {
  margin-bottom: 0 !important;
}

.page-content :deep(.admin-card) {
  border-radius: 20px;
  background: linear-gradient(155deg, rgba(255, 138, 128, 0.18), rgba(255, 255, 255, 0.06));
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: var(--shadow-card);
}

.page-content :deep(.admin-card .v-card-text) {
  padding-inline: 1.5rem;
}

.page-content :deep(.sequential-panel > .v-card) {
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: linear-gradient(160deg, rgba(126, 87, 255, 0.16), rgba(34, 197, 255, 0.06)), rgba(18, 16, 43, 0.6);
  box-shadow: var(--shadow-card);
}

.page-content :deep(.sequential-panel > .v-card:first-of-type) {
  background: linear-gradient(145deg, rgba(126, 87, 255, 0.16), rgba(34, 197, 255, 0.06));
}

.page-content :deep(.sequential-panel .v-card-title) {
  background: linear-gradient(135deg, rgba(126, 87, 255, 0.3), rgba(34, 197, 255, 0.25));
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.page-content :deep(.sequential-panel .v-alert) {
  background: rgba(255, 255, 255, 0.06);
  border-radius: 16px;
}

// ============================================================================
// 📝 TIPOGRAFIA UTILITÁRIA
// ============================================================================

.display-lg {
  font-size: 3.75rem;
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.025em;
  
  @media (max-width: 768px) {
    font-size: 2.5rem;
  }
}

.heading-lg {
  font-size: 2.25rem;
  font-weight: 700;
  line-height: 1.2;
  
  @media (max-width: 768px) {
    font-size: 1.875rem;
  }
}

.heading-md {
  font-size: 1.875rem;
  font-weight: 600;
  line-height: 1.3;
  
  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
}

.body-lg {
  font-size: 1.125rem;
  font-weight: 400;
  line-height: 1.6;
}

.body-md {
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.6;
}

.gradient-text {
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.max-width-600 {
  max-width: 600px;
}

// ============================================================================
// 🎯 MELHORIAS DE ACESSIBILIDADE
// ============================================================================

.v-btn:focus-visible {
  outline: 2px solid #667eea !important;
  outline-offset: 2px !important;
}

// ============================================================================
// 📱 OTIMIZAÇÕES RESPONSIVAS ADICIONAIS
// ============================================================================

@media (max-width: 768px) {
  .hero-section-modern {
    padding: 4rem 1rem !important;
    
    .display-lg {
      font-size: 2.25rem !important;
    }
    
    .body-lg {
      font-size: 1rem !important;
    }
  }
  
  .candidate-search-section {
    margin: 2rem 0;
    padding: 0 1rem;
  }
  
  .mode-selection-container {
    margin: 2rem 0;
    padding: 1.5rem;
    border-radius: 16px;
  }
  
  .hero-cards-section {
    margin: 3rem 0;
    padding: 1rem 0;
  }
  
  .hero-card-wrapper {
    max-width: 100%;
  }
  
  .loading-container {
    padding: 2rem 1rem;
    border-radius: 16px;
  }
}

// ============================================================================
// 🌟 EFEITOS ESPECIAIS PARA INTERAÇÕES
// ============================================================================

// Hover effect para cards com shimmer
.shimmer-hover {
  position: relative;
  overflow: hidden;
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
    transition: left 0.6s;
  }
  
  &:hover::after {
    left: 100%;
  }
}

// Animação para elementos que aparecem
.fade-in-up {
  animation: fadeInUp 0.6s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// ============================================================================
// 🎨 MELHORIAS VISUAIS PARA ESTADOS
// ============================================================================

// Estado de loading mais atrativo
.loading-shimmer {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

// Estados de hover melhorados
.state-hover-lift {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 28px rgba(0,0,0,0.15);
  }
}

// Indicador visual para elementos interativos
.interactive-indicator {
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: -2px;
    left: -2px;
    right: -2px;
    bottom: -2px;
    background: var(--gradient-primary);
    border-radius: inherit;
    opacity: 0;
    transition: opacity 0.3s ease;
    z-index: -1;
  }
  
  &:hover::before {
    opacity: 0.1;
  }
}

// ============================================================================
// 🎮 ANIMAÇÕES ESPECIAIS
// ============================================================================

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

// ============================================================================
// 🎯 ELEMENTOS ESPECIAIS COM ANIMAÇÕES
// ============================================================================

.sequential-selection-btn {
  .v-icon {
    color: var(--inep-color) !important;
    opacity: 1 !important;
    font-weight: 700 !important;
    visibility: visible !important;
    animation: pulse 2s infinite;
  }
}

.v-btn[variant='tonal'].sequential-selection-btn {
  .v-icon {
    color: var(--revalida-color) !important;
  }
}

// ============================================================================
// 📱 RESPONSIVIDADE OTIMIZADA
// ============================================================================

@media (max-width: 768px) {
  .mode-selection-container {
    margin: 2rem 0;
    padding: 1.5rem;
  }
  
  .v-expansion-panel-title.rounded-button-title.section-button {
    min-height: 100px;
    padding: 1.5rem;
  }
  
  .section-icon {
    width: 60px;
    height: 60px;
  }
  
  .section-title {
    font-size: 1.125rem;
  }
  
  .section-subtitle {
    font-size: 0.875rem;
  }
}

// ============================================================================
// 🌈 EFEITOS ESPECIAIS PARA ELEMENTOS
// ============================================================================

.hero-card-modern {
  background: var(--card-gradient);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  border: 1px solid var(--glass-border);
  position: relative;
  overflow: hidden;
  animation: float 6s ease-in-out infinite;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%);
    animation: shimmer 3s infinite;
  }
}

.badge-counter-modern {
  background: var(--gradient-accent);
  color: white;
  border-radius: 25px;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 700;
  box-shadow: 0 6px 20px rgba(0,0,0,0.15);
  animation: pulse 2s infinite;
}
</style>

