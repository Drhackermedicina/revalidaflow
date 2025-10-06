/**
 * useSimulationPEP.ts
 *
 * Composable para gerenciar PEP (Prontuário Eletrônico do Paciente)
 * Extrai lógica de PEP do SimulationView.vue
 *
 * Responsabilidades:
 * - Controlar visibilidade do painel PEP (split view)
 * - Gerenciar marcação de itens do PEP
 * - Inicializar estrutura de marcações
 * - Fornecer estado reativo para componente PepSideView
 */

import { ref, type Ref } from 'vue'

interface SimulationPEPParams {
  userRole: Ref<string | null>
  checklistData: Ref<any>
}

export function useSimulationPEP({
  userRole,
  checklistData
}: SimulationPEPParams) {

  // --- Estado do PEP ---

  /**
   * Controla a visibilidade do painel PEP (split view)
   */
  const pepViewState = ref<{
    isVisible: boolean
  }>({
    isVisible: false
  })

  /**
   * Itens marcados do PEP
   * Estrutura: { [itemId]: [boolean, boolean, ...] }
   * Cada itemId mapeia para um array de booleanos representando pontos de verificação
   */
  const markedPepItems = ref<Record<string, boolean[]>>({})

  // --- Métodos ---

  /**
   * Alterna a marcação de um ponto de verificação do PEP
   * @param itemId - ID do item do checklist
   * @param pointIndex - Índice do ponto de verificação (0-based)
   */
  function togglePepItemMark(itemId: string, pointIndex: number) {
    if (userRole.value !== 'actor' && userRole.value !== 'evaluator') {
      return
    }

    // Inicializa array se não existe
    if (!markedPepItems.value[itemId]) {
      markedPepItems.value[itemId] = []
    }

    // Garante que o array tenha o tamanho necessário
    while (markedPepItems.value[itemId].length <= pointIndex) {
      markedPepItems.value[itemId].push(false)
    }

    // Cria uma cópia do array interno para garantir a reatividade
    const currentItemMarks = [...markedPepItems.value[itemId]]
    currentItemMarks[pointIndex] = !currentItemMarks[pointIndex]

    // Atribui a cópia de volta apenas para o item específico
    markedPepItems.value[itemId] = currentItemMarks

    // Garante reatividade do objeto raiz (forçando nova referência)
    markedPepItems.value = { ...markedPepItems.value }
  }

  /**
   * Inicializa estrutura de marcações para todos os itens do checklist
   * Deve ser chamado após carregar os dados da estação
   */
  function initializePepItems() {
    if (!checklistData.value?.itensAvaliacao) {
      return
    }

    checklistData.value.itensAvaliacao.forEach((item: any) => {
      if (item.idItem && !markedPepItems.value[item.idItem]) {
        markedPepItems.value[item.idItem] = []
      }
    })
  }

  /**
   * Mostra o painel PEP
   */
  function showPepView() {
    pepViewState.value.isVisible = true
  }

  /**
   * Oculta o painel PEP
   */
  function hidePepView() {
    pepViewState.value.isVisible = false
  }

  /**
   * Alterna a visibilidade do painel PEP
   */
  function togglePepView() {
    pepViewState.value.isVisible = !pepViewState.value.isVisible
  }

  /**
   * Reseta todas as marcações do PEP
   */
  function resetPepMarks() {
    markedPepItems.value = {}
  }

  /**
   * Verifica se um ponto está marcado
   * @param itemId - ID do item
   * @param pointIndex - Índice do ponto
   * @returns true se marcado
   */
  function isPointMarked(itemId: string, pointIndex: number): boolean {
    return markedPepItems.value[itemId]?.[pointIndex] === true
  }

  /**
   * Conta quantos pontos estão marcados para um item
   * @param itemId - ID do item
   * @returns número de pontos marcados
   */
  function getMarkedPointsCount(itemId: string): number {
    if (!markedPepItems.value[itemId]) {
      return 0
    }
    return markedPepItems.value[itemId].filter(marked => marked === true).length
  }

  /**
   * Conta total de pontos marcados em todos os itens
   * @returns número total de pontos marcados
   */
  function getTotalMarkedPoints(): number {
    return Object.values(markedPepItems.value).reduce(
      (total, marks) => total + marks.filter(mark => mark === true).length,
      0
    )
  }

  /**
   * Marca todos os pontos de um item
   * @param itemId - ID do item
   * @param count - Número de pontos a marcar
   */
  function markAllPoints(itemId: string, count: number) {
    if (userRole.value !== 'actor' && userRole.value !== 'evaluator') {
      return
    }

    markedPepItems.value[itemId] = Array(count).fill(true)
    // Força reatividade
    markedPepItems.value = { ...markedPepItems.value }
  }

  /**
   * Desmarca todos os pontos de um item
   * @param itemId - ID do item
   */
  function unmarkAllPoints(itemId: string) {
    if (userRole.value !== 'actor' && userRole.value !== 'evaluator') {
      return
    }

    if (markedPepItems.value[itemId]) {
      markedPepItems.value[itemId] = markedPepItems.value[itemId].map(() => false)
      // Força reatividade
      markedPepItems.value = { ...markedPepItems.value }
    }
  }

  return {
    // Estado
    pepViewState,
    markedPepItems,

    // Métodos
    togglePepItemMark,
    initializePepItems,
    showPepView,
    hidePepView,
    togglePepView,
    resetPepMarks,
    isPointMarked,
    getMarkedPointsCount,
    getTotalMarkedPoints,
    markAllPoints,
    unmarkAllPoints
  }
}
