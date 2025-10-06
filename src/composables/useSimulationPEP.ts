/**
 * useSimulationPEP.ts
 *
 * Composable para gerenciar PEP (Prontuário Eletrônico do Paciente)
 * Responsabilidades:
 * - Controlar visibilidade do painel PEP (split view)
 * - Gerenciar marcação de itens do PEP
 * - Fornecer estado reativo para componentes PEP
 */

import { ref, type Ref } from 'vue'

// Constante compartilhada para índice do título
// Usa 999 pois o spread operator não copia propriedades negativas (array[-1])
export const TITLE_INDEX = 999

interface SimulationPEPParams {
  userRole: Ref<string | null>
  checklistData: Ref<any>
}

export function useSimulationPEP({ userRole, checklistData }: SimulationPEPParams) {
  // Estado do PEP
  const pepViewState = ref({ isVisible: false })
  const markedPepItems = ref<Record<string, boolean[]>>({})

  /**
   * Alterna marcação de um ponto do PEP
   * @param itemId - ID do item
   * @param pointIndex - Índice (-1 para título, 0+ para subitens)
   */
  function togglePepItemMark(itemId: string, pointIndex: number) {
    if (userRole.value !== 'actor' && userRole.value !== 'evaluator') return

    const marks = markedPepItems.value[itemId] || []
    const index = pointIndex === -1 ? TITLE_INDEX : pointIndex

    // Expande array se necessário
    while (marks.length <= index) marks.push(false)

    marks[index] = !marks[index]
    markedPepItems.value = { ...markedPepItems.value, [itemId]: [...marks] }
  }

  /** Inicializa marcações para itens do checklist */
  function initializePepItems() {
    checklistData.value?.itensAvaliacao?.forEach((item: any) => {
      if (item.idItem && !markedPepItems.value[item.idItem]) {
        markedPepItems.value[item.idItem] = []
      }
    })
  }

  /** Alterna visibilidade do painel PEP */
  function togglePepView() {
    pepViewState.value.isVisible = !pepViewState.value.isVisible
  }

  /** Reseta todas as marcações */
  function resetPepMarks() {
    markedPepItems.value = {}
  }

  /** Verifica se ponto está marcado */
  function isPointMarked(itemId: string, pointIndex: number): boolean {
    const index = pointIndex === -1 ? TITLE_INDEX : pointIndex
    return markedPepItems.value[itemId]?.[index] === true
  }

  return {
    pepViewState,
    markedPepItems,
    togglePepItemMark,
    initializePepItems,
    togglePepView,
    resetPepMarks,
    isPointMarked
  }
}
