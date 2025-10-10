/**
 * useScriptMarking.js
 *
 * Composable para gerenciar marcação de roteiros
 * Extrai lógica de marcação do SimulationView.vue
 *
 * Responsabilidades:
 * - Marcar/desmarcar contextos do roteiro
 * - Marcar/desmarcar sentenças
 * - Marcar/desmarcar parágrafos
 * - Marcar/desmarcar itens principais e subitens
 * - Controle de debounce para evitar cliques duplicados
 * - Manipulação de classes CSS para marcações
 */

import { ref, nextTick } from 'vue'

/**
 * @typedef {Object} ScriptMarkingParams
 * @property {Ref<string|null>} userRole
 */

export function useScriptMarking({ userRole }) {

  // --- Estado de marcação ---
  const markedScriptContexts = ref({})
  const markedScriptSentences = ref({})
  const markedParagraphs = ref({})
  const markedMainItems = ref({})
  const markedSubItems = ref({})
  const lastClickTime = ref({})

  /**
   * Marca/desmarca contexto do roteiro com debounce
   */
  function toggleScriptContext(idx, event) {
    // Impedir a propagação do evento para evitar múltiplos cliques
    if (event) {
      event.stopPropagation()
      event.preventDefault()
    }

    if (userRole.value === 'actor' || userRole.value === 'evaluator') {
      const clickKey = `c-${idx}`

      // Verificar se houve um clique recente para evitar duplicação
      const now = Date.now()
      if (lastClickTime.value[clickKey] && now - lastClickTime.value[clickKey] < 500) {
        return
      }

      // Registrar o tempo do clique
      lastClickTime.value[clickKey] = now

      // Use um timeout mínimo para evitar problemas de renderização
      setTimeout(() => {
        // Toggle o valor (invertendo o estado atual)
        markedScriptContexts.value[idx] = !markedScriptContexts.value[idx]

        // Criar uma cópia do objeto ref para garantir que a atualização da UI seja acionada
        markedScriptContexts.value = { ...markedScriptContexts.value }

        // Força a atualização do DOM após a alteração
        nextTick(() => {
          // Atualiza o atributo data-marked explicitamente
          const elements = document.querySelectorAll(`[data-marked]`)
          elements.forEach(el => {
            // Garante que a classe CSS permaneça aplicada
            if (el.getAttribute('data-marked') === 'true') {
              if (el.classList.contains('marked-context-primary') || el.classList.contains('marked-context-warning')) {
                el.style.backgroundColor = el.classList.contains('marked-context-primary')
                  ? 'rgba(var(--v-theme-primary), 0.15)'
                  : 'rgba(var(--v-theme-warning), 0.2)'
              }
            }
          })
        })
      }, 10)
    }
  }

  /**
   * Marca/desmarca sentença do roteiro
   */
  function toggleScriptSentence(idx, sentenceIdx) {
    if (userRole.value === 'actor' || userRole.value === 'evaluator') {
      const key = `${idx}-${sentenceIdx}`
      markedScriptSentences.value[key] = !markedScriptSentences.value[key]
      // Criar uma cópia do objeto ref para garantir que a atualização da UI seja acionada
      markedScriptSentences.value = { ...markedScriptSentences.value }
    }
  }

  /**
   * Verifica se um parágrafo está marcado
   */
  function isParagraphMarked(contextIdx, paragraphIdx) {
    if (!markedParagraphs.value) return false
    const key = `${contextIdx}-${paragraphIdx}`
    return markedParagraphs.value[key] === true
  }

  /**
   * Marca/desmarca parágrafo do roteiro com debounce
   */
  function toggleParagraphMark(contextIdx, paragraphIdx, event) {
    // Impedir a propagação do evento para evitar múltiplos cliques
    if (event) {
      event.stopPropagation()
      event.preventDefault()
    }

    if (userRole.value === 'actor' || userRole.value === 'evaluator') {
      const key = `${contextIdx}-${paragraphIdx}`
      const clickKey = `p-${key}`

      // Verificar se houve um clique recente para evitar duplicação
      const now = Date.now()
      if (lastClickTime.value[clickKey] && now - lastClickTime.value[clickKey] < 500) {
        return
      }

      // Registrar o tempo do clique
      lastClickTime.value[clickKey] = now

      // Use um timeout mínimo para evitar problemas de renderização
      setTimeout(() => {
        // Toggle o estado de marcação
        markedParagraphs.value[key] = !markedParagraphs.value[key]

        // Forçar reatividade criando um novo objeto
        markedParagraphs.value = { ...markedParagraphs.value }
      }, 10)
    }
  }

  /**
   * Marca/desmarca item principal do roteiro
   */
  function toggleMainItem(itemId) {
    markedMainItems.value[itemId] = !markedMainItems.value[itemId]
  }

  /**
   * Marca/desmarca subitem do roteiro
   */
  function toggleSubItem(itemId) {
    markedSubItems.value[itemId] = !markedSubItems.value[itemId]
  }

  /**
   * Retorna classe CSS baseada no estado do item
   */
  function getItemClasses(itemType, itemId) {
    if (itemType === 'main') {
      return {
        'marked': markedMainItems.value[itemId]
      }
    } else if (itemType === 'sub') {
      return {
        'marked': markedSubItems.value[itemId]
      }
    }
    return {}
  }

  /**
   * Manipula cliques nos itens do roteiro
   */
  function handleClick(event) {
    // Identifica qual elemento foi clicado
    const mainItem = event.target.closest('.main-item')
    const subItem = event.target.closest('.subitem')

    if (mainItem) {
      // Se clicou em um item principal
      const itemId = mainItem.getAttribute('data-main-item-id')
      if (itemId) {
        toggleMainItem(itemId)
        event.stopPropagation() // Evita a propagação do evento
      }
    } else if (subItem) {
      // Se clicou em um subitem
      const itemId = subItem.getAttribute('data-subitem-id')
      if (itemId) {
        toggleSubItem(itemId)
        event.stopPropagation() // Evita a propagação do evento
      }
    }
  }

  /**
   * Limpa todas as marcações
   */
  function clearAllMarkings() {
    markedScriptContexts.value = {}
    markedScriptSentences.value = {}
    markedParagraphs.value = {}
    markedMainItems.value = {}
    markedSubItems.value = {}
    lastClickTime.value = {}
  }

  return {
    // Estado
    markedScriptContexts,
    markedScriptSentences,
    markedParagraphs,
    markedMainItems,
    markedSubItems,

    // Métodos
    toggleScriptContext,
    toggleScriptSentence,
    isParagraphMarked,
    toggleParagraphMark,
    toggleMainItem,
    toggleSubItem,
    getItemClasses,
    handleClick,
    clearAllMarkings
  }
}