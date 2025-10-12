/**
 * useSimulationData.js
 *
 * Composable para gerenciar dados e materiais da simulação
 * Extrai lógica de dados e impressos do SimulationView.vue
 *
 * Responsabilidades:
 * - Gerenciar dados liberados para candidato
 * - Controlar visibilidade de impressos para ator/avaliador
 * - Gerenciar liberação de materiais via socket
 * - Controlar modal de impressos
 * - Reset de dados ao reiniciar simulação
 */

import { ref } from 'vue'
import Logger from '@/utils/logger';
const logger = new Logger('useSimulationData');


/**
 * @typedef {Object} SimulationDataParams
 * @property {Ref<any>} socket
 * @property {Ref<string|null>} sessionId
 * @property {Ref<string|null>} userRole
 * @property {Ref<any>} stationData
 */

export function useSimulationData({
  socket,
  sessionId,
  userRole,
  stationData
}) {

  // --- Estado de dados da simulação ---

  /**
   * Dados/impressos liberados para o candidato
   * Chave: dataItemId, Valor: objeto do impresso
   */
  const releasedData = ref({})

  /**
   * Controla se o checklist está visível para o candidato
   */
  const isChecklistVisibleForCandidate = ref(false)

  /**
   * Controla visibilidade de impressos para ator/avaliador
   * Chave: impressoId, Valor: boolean (visível ou não)
   */
  const actorVisibleImpressoContent = ref({})

  /**
   * IDs de impressos já liberados pelo ator
   * Chave: impressoId, Valor: boolean (liberado ou não)
   */
  const actorReleasedImpressoIds = ref({})

  /**
   * Controla abertura do modal/drawer de impressos
   */
  const impressosModalOpen = ref(false)

  // --- Métodos ---

  /**
   * Alterna a visibilidade de um impresso para ator/avaliador
   * @param {string} impressoId - ID do impresso
   */
  function toggleActorImpressoVisibility(impressoId) {
    actorVisibleImpressoContent.value[impressoId] = !actorVisibleImpressoContent.value[impressoId]
    // Força reatividade criando novo objeto
    actorVisibleImpressoContent.value = { ...actorVisibleImpressoContent.value }
  }

  /**
   * Libera um dado/impresso para o candidato via socket
   * @param {string} dataItemId - ID do item a ser liberado
   */
  function releaseData(dataItemId) {
    if (!socket.value?.connected || !sessionId.value) {
      logger.warn('Socket não conectado ou sessionId não definido')
      return
    }

    // Verifica se já foi liberado para evitar spam
    if (actorReleasedImpressoIds.value[dataItemId]) {
      return
    }

    // Emite evento de liberação via socket
    socket.value.emit('ACTOR_RELEASE_DATA', {
      sessionId: sessionId.value,
      dataItemId
    })

    // Atualiza localmente
    actorReleasedImpressoIds.value = {
      ...actorReleasedImpressoIds.value,
      [dataItemId]: true
    }
  }

  /**
   * Processa dados recebidos pelo candidato via socket
   * Deve ser chamado no listener 'CANDIDATE_RECEIVE_DATA'
   * @param {string} dataItemId - ID do item recebido
   */
  function handleCandidateReceiveData(dataItemId) {
    if (userRole.value !== 'candidate' || !stationData.value?.materiaisDisponiveis?.impressos) {
      return
    }

    const impressoParaLiberar = stationData.value.materiaisDisponiveis.impressos.find(
      (item) => item.idImpresso === dataItemId
    )

    if (impressoParaLiberar) {
      releasedData.value[dataItemId] = { ...impressoParaLiberar }
      // Força reatividade
      releasedData.value = { ...releasedData.value }
    }
  }

  /**
   * Reseta todos os dados da simulação
   * Deve ser chamado ao reiniciar ou sair da simulação
   */
  function resetSimulationData() {
    releasedData.value = {}
    isChecklistVisibleForCandidate.value = false
    actorVisibleImpressoContent.value = {}
    actorReleasedImpressoIds.value = {}
    impressosModalOpen.value = false
  }

  /**
   * Abre o modal de impressos
   */
  function openImpressosModal() {
    impressosModalOpen.value = true
  }

  /**
   * Fecha o modal de impressos
   */
  function closeImpressosModal() {
    impressosModalOpen.value = false
  }

  /**
   * Verifica se um impresso foi liberado
   * @param {string} impressoId - ID do impresso
   * @returns {boolean} true se liberado
   */
  function isImpressoReleased(impressoId) {
    return !!actorReleasedImpressoIds.value[impressoId]
  }

  /**
   * Verifica se um impresso está visível para o ator
   * @param {string} impressoId - ID do impresso
   * @returns {boolean} true se visível
   */
  function isImpressoVisible(impressoId) {
    return !!actorVisibleImpressoContent.value[impressoId]
  }

  /**
   * Conta quantos impressos foram liberados
   * @returns {number} número de impressos liberados
   */
  function getReleasedCount() {
    return Object.keys(actorReleasedImpressoIds.value).filter(
      key => actorReleasedImpressoIds.value[key]
    ).length
  }

  /**
   * Conta quantos dados o candidato recebeu
   * @returns {number} número de dados recebidos
   */
  function getReceivedDataCount() {
    return Object.keys(releasedData.value).length
  }

  return {
    // Estado
    releasedData,
    isChecklistVisibleForCandidate,
    actorVisibleImpressoContent,
    actorReleasedImpressoIds,
    impressosModalOpen,

    // Métodos
    toggleActorImpressoVisibility,
    releaseData,
    handleCandidateReceiveData,
    resetSimulationData,
    openImpressosModal,
    closeImpressosModal,
    isImpressoReleased,
    isImpressoVisible,
    getReleasedCount,
    getReceivedDataCount
  }
}