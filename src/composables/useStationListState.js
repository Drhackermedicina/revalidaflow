import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import stationRepository from '@/repositories/stationRepository'
import { useStationData } from '@/composables/useStationData'
import { useStationFilteringOptimized } from '@/composables/useStationFilteringOptimized'
import { useStationCategorization } from '@/composables/useStationCategorization'
import { useSequentialMode } from '@/composables/useSequentialMode'
import { useCandidateSearch } from '@/composables/useCandidateSearch'
import { useUserManagement } from '@/composables/useUserManagement'
import { useStationNavigation } from '@/composables/useStationNavigation'
import { currentUser } from '@/plugins/auth.js'

export function useStationListState() {
  const route = useRoute()
  const router = useRouter()

  const {
    stations,
    fetchUserScores,
    fetchStations,
    loadFullStation,
    getUserStationScore,
    hasMoreStations,
    isLoadingMoreStations
  } = useStationData()

  const stationFiltering = useStationFilteringOptimized(stations)
  const {
    isINEPStation,
    isRevalidaFacilStation,
    getRevalidaFacilSpecialty,
    getCleanStationTitle,
    filteredINEPStations,
    filteredStationsRevalidaFacilClinicaMedica,
    filteredStationsRevalidaFacilCirurgia,
    filteredStationsRevalidaFacilPediatria,
    filteredStationsRevalidaFacilGO,
    filteredStationsRevalidaFacilPreventiva,
    filteredStationsRevalidaFacilProcedimentos
  } = stationFiltering

  const { getStationArea } = useStationCategorization()

  const sequentialMode = useSequentialMode(loadFullStation, getCleanStationTitle, getStationArea)
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
  } = sequentialMode

  const candidateSearch = useCandidateSearch(currentUser)
  const {
    selectedCandidate,
    candidateSearchQuery,
    candidateSearchSuggestions,
    showCandidateSuggestions,
    recentCandidates,
    isLoadingCandidateSearch,
    searchCandidates,
    selectCandidate,
    clearCandidateSelection
  } = candidateSearch

  const { isAdmin } = useUserManagement()

  const {
    creatingSessionForStationId,
    startSimulationAsActor,
    goToAdminUpload,
    expandCorrectSection
  } = useStationNavigation()

  const currentState = ref('initial')
  const selectedMode = ref(null)

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

  const shouldShowCandidateSearch = computed(() => currentState.value === 'initial')
  const shouldShowModeSelection = computed(() => currentState.value === 'candidate-selected')
  const shouldShowStationList = computed(() => ['simple-training', 'simulation'].includes(currentState.value))
  const isSimulationModeActive = computed(() => selectedMode.value === 'simulation')

  const allStationsForCounts = ref([])
  const inepTotalAll = computed(() => allStationsForCounts.value.filter(isINEPStation).length)
  const revalidaTotalAll = computed(() => allStationsForCounts.value.filter(isRevalidaFacilStation).length)

  function findStation(stationId) {
    return stations.value.find(station => station.id === stationId)
  }

  function clearSearchFields() {
    candidateSearchQuery.value = ''
  }

  function handleStartSimulation(stationId) {
    if (selectedMode.value !== 'simulation') {
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
      return
    }

    const station = findStation(stationId)
    if (station && !isStationInSequence(stationId)) {
      addToSequence(station)
    }
  }

  function handleStartSequentialSimulation() {
    startSequentialSimulation({ candidate: selectedCandidate.value || null })
  }

  function resetModeState() {
    selectedMode.value = null
    showSequentialConfig.value = false
    resetSequentialConfig()
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

    setTimeout(() => {
      expandFirstSection()
    }, 200)
  }

  function handleBackToModeSelection() {
    currentState.value = 'candidate-selected'
    resetModeState()
    setModeQuery()
  }

  function openInepSection() {
    const mode = selectedMode.value || 'simple-training'
    router.push({ name: 'stations-inep', query: { mode } })
  }

  function openRevalidaSection() {
    const mode = selectedMode.value || 'simple-training'
    router.push({ name: 'stations-revalida', query: { mode } })
  }

  function viewStationsDirectly() {
    router.push({ name: 'stations-hub' })
  }

  function handleChangeCandidate() {
    clearCandidateSelection()
    currentState.value = 'initial'
    resetModeState()
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
      if (group.value.length > 0) {
        accordionRefs[accordionSlots[index]].value = true
        return true
      }
      return false
    })
  }

  onMounted(async () => {
    document.documentElement.classList.add('station-list-page-active')
    clearCandidateSelection()

    await fetchStations()
    clearSearchFields()

    if (hasMoreStations.value) {
      await fetchStations(true)
      if (hasMoreStations.value) {
        await fetchStations(true)
      }
    }

    if (loadMoreSentinel.value) {
      intersectionObserver = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting && hasMoreStations.value && !isLoadingMoreStations.value) {
          fetchStations(true)
        }
      }, {
        rootMargin: '200px',
        threshold: 0.1
      })

      intersectionObserver.observe(loadMoreSentinel.value)
    }

    applyRouteState()

    try {
      allStationsForCounts.value = await stationRepository.getAll(true)
    } catch (error) {
      allStationsForCounts.value = []
    }
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
          setTimeout(() => expandFirstSection(), 200)
        }
      } else {
        currentState.value = 'candidate-selected'
      }
    } else {
      currentState.value = 'initial'
      resetModeState()
      setModeQuery()
    }
  })

  watch(currentUser, newUser => {
    if (newUser && stations.value.length > 0) {
      fetchUserScores()
    }
  }, { immediate: true })

  watch(() => route.query.mode, () => {
    applyRouteState()
  })

  function setModeQuery(mode) {
    const currentMode = route.query.mode
    if ((!mode && !currentMode) || mode === currentMode) return

    const newQuery = { ...route.query }
    if (mode) newQuery.mode = mode
    else delete newQuery.mode
    router.replace({ query: newQuery }).catch(() => {})
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

    resetModeState()
    currentState.value = 'initial'
  }

  return {
    isAdmin,
    shouldShowCandidateSearch,
    shouldShowModeSelection,
    shouldShowStationList,
    isSimulationModeActive,

    candidateSearchQuery,
    candidateSearchSuggestions,
    showCandidateSuggestions,
    recentCandidates,
    isLoadingCandidateSearch,
    searchCandidates,
    selectCandidate,
    clearCandidateSelection,

    handleModeSelection,
    handleBackToModeSelection,
    handleStartSequentialSimulation,
    handleChangeCandidate,
    openInepSection,
    openRevalidaSection,
    viewStationsDirectly,
    goToAdminUpload,

    selectedCandidate,
    selectedMode,
    selectedStationsSequence,
    showSequentialConfig,
    toggleSequentialConfig,
    moveStationInSequence,
    removeFromSequence,
    resetSequentialConfig,

    loadMoreSentinel,
    hasMoreStations,
    isLoadingMoreStations,
    getUserStationScore,
    inepTotalAll,
    revalidaTotalAll
  }
}
