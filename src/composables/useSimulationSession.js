/**
 * useSimulationSession.js
 *
 * Composable para gerenciar o ciclo de vida da sessão de simulação
 * Extrai lógica de setupSession() e fetchSimulationData()
 *
 * Responsabilidades:
 * - Inicialização e configuração da sessão
 * - Busca de dados da estação no Firestore
 * - Configuração de modo sequencial
 * - Gerenciamento de duração da simulação
 * - Inicialização do checklist (PEP)
 */

import { ref, computed } from 'vue'
import { doc, getDoc } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { db } from '@/plugins/firebase.js'
import { formatTime } from '@/utils/simulationUtils.js'
import Logger from '@/utils/logger';
const logger = new Logger('useSimulationSession');


export function useSimulationSession() {
  // --- Estado da sessão ---
  const stationId = ref(null)
  const sessionId = ref(null)
  const userRole = ref(null)
  const localSessionId = ref(null)

  // --- Dados da estação ---
  const stationData = ref(null)
  const checklistData = ref(null)

  // --- Estado de carregamento ---
  const isLoading = ref(true)
  const errorMessage = ref('')
  const isSettingUpSession = ref(false)

  // --- Modo sequencial ---
  const isSequentialMode = ref(false)
  const sequenceId = ref(null)
  const sequenceIndex = ref(0)
  const totalSequentialStations = ref(0)
  const sequentialData = ref(null)

  // --- Timer e duração ---
  const simulationTimeSeconds = ref(10 * 60)
  const timerDisplay = ref(formatTime(simulationTimeSeconds.value))
  const selectedDurationMinutes = ref(10)

  // --- Computeds ---
  const isActorOrEvaluator = computed(() =>
    userRole.value === 'actor' || userRole.value === 'evaluator'
  )

  const isCandidate = computed(() =>
    userRole.value === 'candidate'
  )

  /**
   * Busca dados da estação no Firestore
   */
  async function fetchSimulationData(currentStationId) {
    if (!currentStationId) {
      errorMessage.value = 'ID da estação inválido.'
      isLoading.value = false
      logger.error('[DIAGNOSTIC] Erro: ID da estação não fornecido')
      return
    }

    isLoading.value = true
    errorMessage.value = ''

    try {
      const auth = getAuth()
      const user = auth.currentUser

      if (!user) {
        throw new Error('Usuário não autenticado no Firebase')
      }

      const stationDocRef = doc(db, 'estacoes_clinicas', currentStationId)
      const stationSnap = await getDoc(stationDocRef)

      if (!stationSnap.exists()) {
        throw new Error(`Estação ${currentStationId} não encontrada no Firestore.`)
      }

      const stationDataRaw = stationSnap.data()
      stationData.value = { id: stationSnap.id, ...stationDataRaw }

      // Configuração de duração
      const validOptions = [7, 8, 9, 10, 11, 12]

      const stationDefaultMinutes = stationData.value?.tempoDuracaoMinutos
      if (stationDefaultMinutes && validOptions.includes(stationDefaultMinutes)) {
        selectedDurationMinutes.value = stationDefaultMinutes
      } else {
        if (!validOptions.includes(selectedDurationMinutes.value)) {
          selectedDurationMinutes.value = 10
        }
      }

      simulationTimeSeconds.value = selectedDurationMinutes.value * 60
      timerDisplay.value = formatTime(simulationTimeSeconds.value)

      // Inicialização do PEP (checklist)
      if (stationData.value?.padraoEsperadoProcedimento) {
        checklistData.value = stationData.value.padraoEsperadoProcedimento


        // Verifica feedbackEstacao em diferentes locais
        if (stationData.value.feedbackEstacao && !checklistData.value.feedbackEstacao) {
          checklistData.value.feedbackEstacao = stationData.value.feedbackEstacao
        }

        if (!checklistData.value.itensAvaliacao ||
          !Array.isArray(checklistData.value.itensAvaliacao) ||
          checklistData.value.itensAvaliacao.length === 0) {
          logger.warn("[DIAGNOSTIC] PEP não contém 'itensAvaliacao' válidos.")
        }
      } else {
        logger.warn("[DIAGNOSTIC] 'padraoEsperadoProcedimento' não encontrado na estação. PEP será nulo.")
        checklistData.value = null
      }

    } catch (error) {
      // Classificação de erros para melhor feedback
      if (error.message.includes('permission-denied') || error.message.includes('Permission denied')) {
        errorMessage.value = 'Permissão negada: Verifique se você está autenticado e tem acesso a esta estação.'
      } else if (error.message.includes('not-found') || error.message.includes('not found')) {
        errorMessage.value = `Estação ${currentStationId} não encontrada no banco de dados.`
      } else if (error.message.includes('network') || error.message.includes('Network')) {
        errorMessage.value = 'Erro de rede: Verifique sua conexão com a internet.'
      } else {
        errorMessage.value = `Falha ao carregar dados da estação: ${error.message}`
      }

      stationData.value = null
      checklistData.value = null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Configura modo sequencial a partir dos parâmetros da rota
   */
  function setupSequentialMode(routeQuery) {
    isSequentialMode.value = routeQuery.sequential === 'true'
    sequenceId.value = routeQuery.sequenceId || null
    sequenceIndex.value = parseInt(routeQuery.sequenceIndex) || 0
    totalSequentialStations.value = parseInt(routeQuery.totalStations) || 0

    if (isSequentialMode.value) {
      // Modo sequencial detectado

      // Carregar dados da sessão sequencial do sessionStorage
      const savedSequentialData = sessionStorage.getItem('sequentialSession')

      if (savedSequentialData) {
        try {
          sequentialData.value = JSON.parse(savedSequentialData)
        } catch (error) {
          console.error('[SETUP_SEQUENTIAL_MODE] ❌ Erro ao parsear dados:', error);
          sequentialData.value = null
        }
      } else {
        sequentialData.value = null
      }

      // Validar se sequentialData está correto
      if (sequentialData.value) {
        if (!sequentialData.value.sequence || !Array.isArray(sequentialData.value.sequence)) {
          sequentialData.value = null
        }
      }
    }
  }

  /**
   * Configura duração da simulação a partir dos parâmetros da rota
   */
  function setupDuration(routeQuery) {
    const durationFromQuery = routeQuery.duration ? parseInt(routeQuery.duration) : null
    const validOptions = [7, 8, 9, 10, 11, 12]

    if (durationFromQuery && validOptions.includes(durationFromQuery)) {
      selectedDurationMinutes.value = durationFromQuery
    } else {
      selectedDurationMinutes.value = 10
      if (durationFromQuery) {
      }
    }

    timerDisplay.value = formatTime(selectedDurationMinutes.value * 60)
  }

  /**
   * Valida parâmetros essenciais da sessão
   */
  function validateSessionParams() {
    if (!stationId.value) {
      return {
        valid: false,
        error: "Link inválido: ID Estação não encontrado."
      }
    }

    if (!userRole.value || !['actor', 'candidate', 'evaluator'].includes(userRole.value)) {
      return {
        valid: false,
        error: "Link inválido: Papel não definido/incorreto."
      }
    }

    return { valid: true }
  }

  /**
   * Limpa estado da sessão
   */
  function clearSession() {
    stationData.value = null
    checklistData.value = null
    stationId.value = null
    sessionId.value = null
    userRole.value = null
    errorMessage.value = ''

    // Reset modo sequencial
    isSequentialMode.value = false
    sequenceId.value = null
    sequenceIndex.value = 0
    totalSequentialStations.value = 0
    sequentialData.value = null
  }

  /**
   * Atualiza duração selecionada e timer
   */
  function updateDuration(minutes) {
    const validOptions = [7, 8, 9, 10, 11, 12]
    if (validOptions.includes(minutes)) {
      selectedDurationMinutes.value = minutes
      simulationTimeSeconds.value = minutes * 60
      timerDisplay.value = formatTime(simulationTimeSeconds.value)
    }
  }

  return {
    stationId,
    sessionId,
    userRole,
    localSessionId,
    stationData,
    checklistData,
    isLoading,
    errorMessage,
    isSettingUpSession,
    isSequentialMode,
    sequenceId,
    sequenceIndex,
    totalSequentialStations,
    sequentialData,
    simulationTimeSeconds,
    timerDisplay,
    selectedDurationMinutes,
    isActorOrEvaluator,
    isCandidate,
    fetchSimulationData,
    setupSequentialMode,
    setupDuration,
    validateSessionParams,
    clearSession,
    updateDuration
  }
}
