/**
 * useSimulationData.ts
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

import { ref, type Ref } from 'vue'

interface SimulationDataParams {
  socket: Ref<any>
  sessionId: Ref<string | null>
  userRole: Ref<string | null>
  stationData: Ref<any>
}

export function useSimulationData({
  socket,
  sessionId,
  userRole,
  stationData
}: SimulationDataParams) {

  // --- Estado de dados da simulação ---

  /**
   * Dados/impressos liberados para o candidato
   * Chave: dataItemId, Valor: objeto do impresso
   */
  const releasedData = ref<Record<string, any>>({})

  /**
   * Controla se o checklist está visível para o candidato
   */
  const isChecklistVisibleForCandidate = ref<boolean>(false)

  /**
   * Controla visibilidade de impressos para ator/avaliador
   * Chave: impressoId, Valor: boolean (visível ou não)
   */
  const actorVisibleImpressoContent = ref<Record<string, boolean>>({})

  /**
   * IDs de impressos já liberados pelo ator
   * Chave: impressoId, Valor: boolean (liberado ou não)
   */
  const actorReleasedImpressoIds = ref<Record<string, boolean>>({})

  /**
   * Controla abertura do modal/drawer de impressos
   */
  const impressosModalOpen = ref<boolean>(false)

  // --- Métodos ---

  /**
   * Alterna a visibilidade de um impresso para ator/avaliador
   * @param impressoId - ID do impresso
   */
  function toggleActorImpressoVisibility(impressoId: string) {
    actorVisibleImpressoContent.value[impressoId] = !actorVisibleImpressoContent.value[impressoId]
    // Força reatividade criando novo objeto
    actorVisibleImpressoContent.value = { ...actorVisibleImpressoContent.value }
  }

  /**
   * Libera um dado/impresso para o candidato via socket
   * @param dataItemId - ID do item a ser liberado
   */
  function releaseData(dataItemId: string) {
    if (!socket.value?.connected || !sessionId.value) {
      console.warn('Socket não conectado ou sessionId não definido')
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
   * @param dataItemId - ID do item recebido
   */
  function handleCandidateReceiveData(dataItemId: string) {
    if (userRole.value !== 'candidate' || !stationData.value?.materiaisDisponiveis?.impressos) {
      return
    }

    const impressoParaLiberar = stationData.value.materiaisDisponiveis.impressos.find(
      (item: any) => item.idImpresso === dataItemId
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
   * @param impressoId - ID do impresso
   * @returns true se liberado
   */
  function isImpressoReleased(impressoId: string): boolean {
    return !!actorReleasedImpressoIds.value[impressoId]
  }

  /**
   * Verifica se um impresso está visível para o ator
   * @param impressoId - ID do impresso
   * @returns true se visível
   */
  function isImpressoVisible(impressoId: string): boolean {
    return !!actorVisibleImpressoContent.value[impressoId]
  }

  /**
   * Conta quantos impressos foram liberados
   * @returns número de impressos liberados
   */
  function getReleasedCount(): number {
    return Object.keys(actorReleasedImpressoIds.value).filter(
      key => actorReleasedImpressoIds.value[key]
    ).length
  }

  /**
   * Conta quantos dados o candidato recebeu
   * @returns número de dados recebidos
   */
  function getReceivedDataCount(): number {
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
