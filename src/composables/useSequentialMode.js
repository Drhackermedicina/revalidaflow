import { ref } from 'vue'
import { useRouter } from 'vue-router'
import Logger from '@/utils/logger';
const logger = new Logger('useSequentialMode');


/**
 * Composable para gerenciar modo sequencial de simulações
 * Extrai lógica de simulação sequencial do StationList.vue
 */
export function useSequentialMode(loadFullStation, getCleanStationTitle, getStationArea) {

  const router = useRouter()
  const SELECTED_CANDIDATE_KEY = 'selectedCandidate'

  // --- State ---
  const sequentialMode = ref(false)
  const selectedStationsSequence = ref([])
  const currentSequenceIndex = ref(0)
  const isSequentialModeConfiguring = ref(false)
  const sequentialSessionId = ref(null)
  const sharedSessionId = ref(null)
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
    sharedSessionId.value = null
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

  function persistSelectedCandidate(candidate, sessionId = null) {
    if (typeof window === 'undefined') return
    if (!candidate) return

    const fullName = `${candidate.nome || ''} ${candidate.sobrenome || ''}`.trim()
    const fallbackName = candidate.displayName || candidate.email || 'Participante'

    const payload = {
      uid: candidate.uid,
      name: fullName || fallbackName,
      email: candidate.email || '',
      photoURL: candidate.photoURL || '',
      selectedAt: Date.now(),
      sessionId
    }

    const serialized = JSON.stringify(payload)
    try { localStorage.setItem(SELECTED_CANDIDATE_KEY, serialized) } catch (error) { logger.warn('localStorage indisponível para persistir candidato:', error) }
    try { sessionStorage.setItem(SELECTED_CANDIDATE_KEY, serialized) } catch (error) { logger.warn('sessionStorage indisponível para persistir candidato:', error) }
  }

  function updateCandidateSession(sessionId) {
    if (typeof window === 'undefined') return
    if (!sessionId) return

    try {
      const raw = (localStorage.getItem(SELECTED_CANDIDATE_KEY) || sessionStorage.getItem(SELECTED_CANDIDATE_KEY))
      if (!raw) return

      const data = JSON.parse(raw)
      data.sessionId = sessionId
      const serialized = JSON.stringify(data)
      try { localStorage.setItem(SELECTED_CANDIDATE_KEY, serialized) } catch {}
      try { sessionStorage.setItem(SELECTED_CANDIDATE_KEY, serialized) } catch {}
    } catch (error) {
      logger.warn('Não foi possível atualizar sessionId do candidato sequencial:', error)
    }
  }

  /**
   * Inicia simulação sequencial
   */
  const startSequentialSimulation = async (options = {}) => {
    if (selectedStationsSequence.value.length === 0) {
      alert('Selecione pelo menos uma estação para a simulação sequencial')
      return
    }

    try {
      isSequentialModeConfiguring.value = true
      sequentialMode.value = true
      currentSequenceIndex.value = 0

      const { candidate = null } = options
      if (candidate && candidate.uid) {
        persistSelectedCandidate(candidate)
      }

      // Gerar IDs únicos para a sequência (controle) e para a sessão compartilhada (socket)
      sequentialSessionId.value = `seq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      sharedSessionId.value = `session_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`

      // Armazenar configuração da sequência no sessionStorage
      sessionStorage.setItem('sequentialSession', JSON.stringify({
        sessionId: sequentialSessionId.value,
        sharedSessionId: sharedSessionId.value,
        sequence: selectedStationsSequence.value,
        currentIndex: 0,
        startedAt: new Date().toISOString()
      }))

      // Iniciar primeira estação
      await startCurrentSequentialStation()

    } catch (error) {
      logger.error('Erro ao iniciar simulação sequencial:', error)
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
      if (!sequentialData.sharedSessionId) {
        sequentialData.sharedSessionId = sharedSessionId.value
      }
      sessionStorage.setItem('sequentialSession', JSON.stringify(sequentialData))

      // Recuperar sessionId compartilhado da sequência
      const sessionId = sequentialData.sharedSessionId || sharedSessionId.value
      sharedSessionId.value = sessionId
      logger.debug(`Utilizando sessionId compartilhado para estação ${currentStation.id}:`, sessionId)

      updateCandidateSession(sessionId)

      // Navegar para a estação atual
      const routeData = router.resolve({
        path: `/app/simulation/${currentStation.id}`,
        query: {
          sessionId,
          role: 'actor',
          sequential: 'true',
          sequenceId: sequentialSessionId.value,
          sequenceIndex: currentSequenceIndex.value,
          totalStations: selectedStationsSequence.value.length
        }
      })

      window.open(routeData.href, '_blank')

    } catch (error) {
      logger.error('Erro ao iniciar estação sequencial:', error)
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
