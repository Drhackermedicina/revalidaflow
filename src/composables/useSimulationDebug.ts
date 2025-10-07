import { ref } from 'vue'

// Declaração de tipos para funções globais de debug
declare global {
  interface Window {
    debugSimulationState?: () => void
    debugChecklistState?: () => void
    clearDebugLogs?: () => void
    debugSequentialNavigation?: () => void
  }
}

export function useSimulationDebug({
  isActorOrEvaluator,
  simulationEnded,
  allEvaluationsCompleted,
  evaluationScores,
  checklistData
}) {
  const debugInfo = ref('')

  function setupDebugFunction() {
    // Função de debug exposta globalmente para diagnóstico
    window.debugSimulationState = () => {
      console.log('🐛 ESTADO ATUAL DA SIMULAÇÃO:')
      console.log('  isActorOrEvaluator:', isActorOrEvaluator.value)
      console.log('  simulationEnded:', simulationEnded.value)
      console.log('  allEvaluationsCompleted:', allEvaluationsCompleted.value)
      console.log('  evaluationScores:', evaluationScores.value)
      console.log('  checklistData:', checklistData.value)

      if (checklistData.value?.itensAvaliacao) {
        console.log('  Itens de avaliação:')
        checklistData.value.itensAvaliacao.forEach((item, index) => {
          const hasScore = evaluationScores.value[item.id] !== undefined
          console.log(`    Item ${index + 1}: ${item.titulo || item.descricao} - Score: ${evaluationScores.value[item.id] || 'N/A'} ${hasScore ? '✅' : '❌'}`)
        })
      }
    }

    // Adicionar função de debug global para console
    window.debugChecklistState = () => {
      console.log('🐛 ESTADO DO CHECKLIST:')
      console.log('  checklistData:', checklistData.value)
      console.log('  evaluationScores:', evaluationScores.value)
      console.log('  allEvaluationsCompleted:', allEvaluationsCompleted.value)

      if (checklistData.value?.itensAvaliacao) {
        console.log('  Análise detalhada dos itens:')
        checklistData.value.itensAvaliacao.forEach((item, index) => {
          const score = evaluationScores.value[item.id]
          const hasScore = score !== undefined && score !== null
          const isValidScore = hasScore && !isNaN(score) && score >= 0

          console.log(`    Item ${index + 1}:`)
          console.log(`      ID: ${item.id}`)
          console.log(`      Título: ${item.titulo || 'Sem título'}`)
          console.log(`      Score atual: ${score}`)
          console.log(`      Tem score: ${hasScore}`)
          console.log(`      Score válido: ${isValidScore}`)
          console.log(`      Status: ${isValidScore ? '✅ OK' : '❌ Problema'}`)
        })
      }
    }

    // Função para limpar o console
    window.clearDebugLogs = () => {
      console.clear()
      console.log('🧹 Console limpo. Use debugSimulationState() ou debugChecklistState() para analisar o estado.')
    }

    // Função para debug de navegação sequencial
    window.debugSequentialNavigation = () => {
      console.log('🐛 DEBUG DA NAVEGAÇÃO SEQUENCIAL:')
      console.log('  isActorOrEvaluator:', isActorOrEvaluator.value)
      console.log('  simulationEnded:', simulationEnded.value)
      console.log('  allEvaluationsCompleted:', allEvaluationsCompleted.value)
      console.log('  canGoToNext:', false) // Será implementado no composable específico

      console.log('  Análise das condições:')
      console.log(`    ✅ isActorOrEvaluator: ${isActorOrEvaluator.value}`)
      console.log(`    ✅ simulationEnded: ${simulationEnded.value}`)
      console.log(`    ✅ allEvaluationsCompleted: ${allEvaluationsCompleted.value}`)

      if (allEvaluationsCompleted.value) {
        console.log('  🎉 Todas as condições atendidas! Botão deve estar visível.')
      } else {
        console.log('  ❌ Condições não atendidas. Verifique todas as avaliações.')
      }
    }
  }

  function generateDebugReport() {
    const report = {
      timestamp: new Date().toISOString(),
      simulationState: {
        isActorOrEvaluator: isActorOrEvaluator.value,
        simulationEnded: simulationEnded.value,
        allEvaluationsCompleted: allEvaluationsCompleted.value
      },
      evaluationScores: evaluationScores.value,
      checklistItems: checklistData.value?.itensAvaliacao?.length || 0,
      completedItems: Object.keys(evaluationScores.value).length
    }

    debugInfo.value = JSON.stringify(report, null, 2)
    return report
  }

  function logDebug(message: string, data?: any) {
    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      message,
      data
    }

    console.log(`[SIMULATION DEBUG] ${timestamp}: ${message}`, data || '')
    return logEntry
  }

  function validateSimulationState() {
    const issues = []

    if (!checklistData.value?.itensAvaliacao?.length) {
      issues.push('❌ Nenhum item de avaliação encontrado no checklist')
    }

    const itemCount = checklistData.value?.itensAvaliacao?.length || 0
    const scoreCount = Object.keys(evaluationScores.value).length

    if (itemCount > 0 && scoreCount < itemCount) {
      issues.push(`❌ Avaliação incompleta: ${scoreCount}/${itemCount} itens avaliados`)
    }

    if (!simulationEnded.value && allEvaluationsCompleted.value) {
      issues.push('⚠️ Todas as avaliações completas mas simulação não encerrada')
    }

    if (simulationEnded.value && !allEvaluationsCompleted.value) {
      issues.push('⚠️ Simulação encerrada mas avaliações incompletas')
    }

    return {
      valid: issues.length === 0,
      issues,
      itemCount,
      scoreCount,
      completionRate: itemCount > 0 ? (scoreCount / itemCount) * 100 : 0
    }
  }

  return {
    debugInfo,
    setupDebugFunction,
    generateDebugReport,
    logDebug,
    validateSimulationState
  }
}