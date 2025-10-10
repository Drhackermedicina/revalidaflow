/**
 * useSimulationPEP.js
 *
 * Composable para gerenciar PEP (Prontuário Eletrônico do Paciente)
 * Responsabilidades:
 * - Controlar visibilidade do painel PEP (split view)
 * - Gerenciar marcação de itens do PEP
 * - Fornecer estado reativo para componentes PEP
 */

import { ref } from 'vue'

// Constante compartilhada para índice do título
// Usa 999 pois o spread operator não copia propriedades negativas (array[-1])
export const TITLE_INDEX = 999

/**
 * @typedef {Object} SimulationPEPParams
 * @property {Ref<string|null>} userRole
 * @property {Ref<any>} checklistData
 */

export function useSimulationPEP({ userRole, checklistData }) {
  // Estado do PEP
  const pepViewState = ref({ isVisible: false })
  const markedPepItems = ref({})

  /**
   * Alterna marcação de um ponto do PEP
   * @param {string} itemId - ID do item
   * @param {number} pointIndex - Índice (-1 para título, 0+ para subitens)
   */
  function togglePepItemMark(itemId, pointIndex) {
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
    checklistData.value?.itensAvaliacao?.forEach(item => {
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
  function isPointMarked(itemId, pointIndex) {
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