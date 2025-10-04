import { ref } from 'vue'
import { useRouter } from 'vue-router'

/**
 * Composable para gerenciar modo sequencial de simulações
 * Extrai lógica de simulação sequencial do StationList.vue
 */
export function useSequentialMode(loadFullStation, getCleanStationTitle, getStationArea) {

  const router = useRouter()

  // --- State ---
  const sequentialMode = ref(false)
  const selectedStationsSequence = ref([])
  const currentSequenceIndex = ref(0)
  const isSequentialModeConfiguring = ref(false)
  const sequentialSessionId = ref(null)
  const showSequentialConfig = ref(false)

  // --- Helper: Verifica se estação está na sequência ---
  const isStationInSequence = (stationId) => {
    return selectedStationsSequence.value.some(s => s.id === stationId)
  }

  // --- Methods ---

  /**
   * Toggle modo de configuração sequencial
   */
  const toggleSequentialConfig = () => {
    showSequentialConfig.value = !showSequentialConfig.value
    if (!showSequentialConfig.value) {
      resetSequentialConfig()
    }
  }

  /**
   * Reset configuração sequencial
   */
  const resetSequentialConfig = () => {
    selectedStationsSequence.value = []
    sequentialMode.value = false
    isSequentialModeConfiguring.value = false
    currentSequenceIndex.value = 0
    sequentialSessionId.value = null
  }

  /**
   * Adiciona estação à sequência
   */
  const addToSequence = (station) => {
    if (!isStationInSequence(station.id)) {
      selectedStationsSequence.value.push({
        id: station.id,
        titulo: getCleanStationTitle(station.tituloEstacao),
        especialidade: station.especialidade,
        area: getStationArea(station),
        order: selectedStationsSequence.value.length + 1
      })
    }
  }

  /**
   * Remove estação da sequência
   */
  const removeFromSequence = (stationId) => {
    const index = selectedStationsSequence.value.findIndex(s => s.id === stationId)
    if (index > -1) {
      selectedStationsSequence.value.splice(index, 1)
      // Reordenar
      selectedStationsSequence.value.forEach((station, idx) => {
        station.order = idx + 1
      })
    }
  }

  /**
   * Move estação na sequência (drag and drop)
   */
  const moveStationInSequence = (fromIndex, toIndex) => {
    const stations = [...selectedStationsSequence.value]
    const [movedStation] = stations.splice(fromIndex, 1)
    stations.splice(toIndex, 0, movedStation)

    // Reordenar
    stations.forEach((station, idx) => {
      station.order = idx + 1
    })

    selectedStationsSequence.value = stations
  }

  /**
   * Inicia simulação sequencial
   */
  const startSequentialSimulation = async () => {
    if (selectedStationsSequence.value.length === 0) {
      alert('Selecione pelo menos uma estação para a simulação sequencial')
      return
    }

    try {
      isSequentialModeConfiguring.value = true
      sequentialMode.value = true
      currentSequenceIndex.value = 0

      // Gerar ID único para a sessão sequencial
      sequentialSessionId.value = `seq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // Armazenar configuração da sequência no sessionStorage
      sessionStorage.setItem('sequentialSession', JSON.stringify({
        sessionId: sequentialSessionId.value,
        sequence: selectedStationsSequence.value,
        currentIndex: 0,
        startedAt: new Date().toISOString()
      }))

      // Iniciar primeira estação
      await startCurrentSequentialStation()

    } catch (error) {
      console.error('Erro ao iniciar simulação sequencial:', error)
      alert(`Erro ao iniciar simulação sequencial: ${error.message}`)
      resetSequentialConfig()
    }
  }

  /**
   * Inicia estação atual na sequência
   */
  const startCurrentSequentialStation = async () => {
    if (currentSequenceIndex.value >= selectedStationsSequence.value.length) {
      alert('Simulação sequencial concluída!')
      resetSequentialConfig()
      return
    }

    const currentStation = selectedStationsSequence.value[currentSequenceIndex.value]

    try {
      // 🚀 OTIMIZAÇÃO: Carregar estação completa antes de navegar (lazy loading)
      const fullStation = await loadFullStation(currentStation.id)
      if (!fullStation) {
        throw new Error('Não foi possível carregar os dados da estação')
      }

      // Atualizar sessionStorage com índice atual
      const sequentialData = JSON.parse(sessionStorage.getItem('sequentialSession') || '{}')
      sequentialData.currentIndex = currentSequenceIndex.value
      sessionStorage.setItem('sequentialSession', JSON.stringify(sequentialData))

      // Navegar para a estação atual
      const routeData = router.resolve({
        path: `/app/simulation/${currentStation.id}`,
        query: {
          role: 'actor',
          sequential: 'true',
          sequenceId: sequentialSessionId.value,
          sequenceIndex: currentSequenceIndex.value,
          totalStations: selectedStationsSequence.value.length
        }
      })

      window.open(routeData.href, '_blank')

    } catch (error) {
      console.error('Erro ao iniciar estação sequencial:', error)
      alert(`Erro ao iniciar estação: ${error.message}`)
    }
  }

  /**
   * Avança para próxima estação na sequência
   */
  const nextSequentialStation = () => {
    if (currentSequenceIndex.value < selectedStationsSequence.value.length - 1) {
      currentSequenceIndex.value++
      startCurrentSequentialStation()
    } else {
      alert('Simulação sequencial concluída!')
      resetSequentialConfig()
    }
  }

  // --- Return ---
  return {
    // State
    sequentialMode,
    selectedStationsSequence,
    currentSequenceIndex,
    isSequentialModeConfiguring,
    sequentialSessionId,
    showSequentialConfig,

    // Methods
    isStationInSequence,
    toggleSequentialConfig,
    resetSequentialConfig,
    addToSequence,
    removeFromSequence,
    moveStationInSequence,
    startSequentialSimulation,
    startCurrentSequentialStation,
    nextSequentialStation
  }
}
