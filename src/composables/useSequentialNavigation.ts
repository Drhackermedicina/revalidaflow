/**
 * useSequentialNavigation.ts
 *
 * Composable para navegação entre estações no modo sequencial
 * Extrai lógica de navegação sequencial do SimulationView.vue
 *
 * Responsabilidades:
 * - Navegação para próxima/anterior estação
 * - Gerenciamento de dados da sessão sequencial
 * - Cálculo de progresso da sequência
 * - Recuperação de dados perdidos do sessionStorage
 */

import { computed, type Ref } from 'vue'
import { useRouter } from 'vue-router'

interface SequentialNavigationParams {
  isSequentialMode: Ref<boolean>
  sequenceId: Ref<string | null>
  sequenceIndex: Ref<number>
  totalSequentialStations: Ref<number>
  sequentialData: Ref<any>
}

export function useSequentialNavigation({
  isSequentialMode,
  sequenceId,
  sequenceIndex,
  totalSequentialStations,
  sequentialData
}: SequentialNavigationParams) {

  const router = useRouter()

  /**
   * Configura navegação sequencial (logs e debug)
   */
  function setupSequentialNavigation() {
    
    if (sequentialData.value && sequentialData.value.sequence) {
      const currentStation = sequentialData.value.sequence[sequenceIndex.value]
    }
  }

  /**
   * Tenta reconstruir sequentialData do sessionStorage
   */
  function reconstructSequentialData(): boolean {
    console.warn('[SEQUENTIAL] sequentialData is null, attempting to reconstruct from sessionStorage')

    const savedData = sessionStorage.getItem('sequentialSession')
    if (savedData) {
      try {
        sequentialData.value = JSON.parse(savedData)
        return true
      } catch (error) {
        console.error('[SEQUENTIAL] Failed to parse sessionStorage:', error)
        return false
      }
    }

    return false
  }

  /**
   * Avança para a próxima estação na sequência
   */
  function goToNextSequentialStation() {
    
    if (!isSequentialMode.value) {
      console.error('[SEQUENTIAL] Not in sequential mode, aborting navigation')
      return
    }

    // Fallback para reconstruir sequentialData se estiver perdido
    if (!sequentialData.value) {
      const recovered = reconstructSequentialData()

      // Se ainda não temos sequentialData, tentar navegar com informações limitadas
      if (!recovered || !sequentialData.value) {
        console.warn('[SEQUENTIAL] sequentialData still null, attempting navigation with route params only')

        const nextIndex = sequenceIndex.value + 1
        if (nextIndex < totalSequentialStations.value) {
          // Voltar para lista de estações para reconfigurar
          const routeData = router.resolve({
            path: `/app/stations`,
            query: {
              sequential: 'true',
              sequenceId: sequenceId.value,
              sequenceIndex: nextIndex,
              totalStations: totalSequentialStations.value,
              message: 'sequential_data_lost'
            }
          })

          alert('Dados da sessão sequencial foram perdidos. Redirecionando para reconfiguração...')
          window.location.href = routeData.href
          return
        } else {
          alert('Simulação sequencial concluída!')
          sessionStorage.removeItem('sequentialSession')
          router.push('/app/stations')
          return
        }
      }
    }

    const nextIndex = sequenceIndex.value + 1
    
    if (nextIndex < totalSequentialStations.value) {
      // Atualizar sessionStorage
      const updatedData = { ...sequentialData.value }
      updatedData.currentIndex = nextIndex
      sessionStorage.setItem('sequentialSession', JSON.stringify(updatedData))
      
      // Navegar para próxima estação
      const nextStation = sequentialData.value.sequence[nextIndex]
      
      if (nextStation) {
        const routeData = router.resolve({
          path: `/app/simulation/${nextStation.id}`,
          query: {
            role: 'actor',
            sequential: 'true',
            sequenceId: sequenceId.value,
            sequenceIndex: nextIndex,
            totalStations: totalSequentialStations.value,
            autoReady: 'true'  // Indica que deve ir direto para o estado "pronto"
          }
        })

        console.log('[SEQUENTIAL] Navigating to:', routeData.href)
        window.location.href = routeData.href
      } else {
        console.error('[SEQUENTIAL] Next station not found in sequence')
        alert('Erro: Próxima estação não encontrada na sequência')
      }
    } else {
      console.log('[SEQUENTIAL] Reached end of sequence')
      alert('Simulação sequencial concluída!')
      sessionStorage.removeItem('sequentialSession')
      router.push('/app/stations')
    }
  }

  /**
   * Volta para a estação anterior na sequência
   */
  function goToPreviousSequentialStation() {
    if (!isSequentialMode.value || !sequentialData.value) return

    const prevIndex = sequenceIndex.value - 1
    if (prevIndex >= 0) {
      // Atualizar sessionStorage
      const updatedData = { ...sequentialData.value }
      updatedData.currentIndex = prevIndex
      sessionStorage.setItem('sequentialSession', JSON.stringify(updatedData))

      // Navegar para estação anterior
      const prevStation = sequentialData.value.sequence[prevIndex]
      if (prevStation) {
        const routeData = router.resolve({
          path: `/app/simulation/${prevStation.id}`,
          query: {
            role: 'actor',
            sequential: 'true',
            sequenceId: sequenceId.value,
            sequenceIndex: prevIndex,
            totalStations: totalSequentialStations.value
          }
        })

        window.location.href = routeData.href
      }
    }
  }

  /**
   * Sai do modo sequencial
   */
  function exitSequentialMode() {
    sessionStorage.removeItem('sequentialSession')
    router.push('/app/stations')
  }

  /**
   * Verifica se pode navegar para estação anterior
   */
  const canGoToPrevious = computed(() => {
    return isSequentialMode.value && sequenceIndex.value > 0
  })

  /**
   * Verifica se pode navegar para próxima estação
   */
  const canGoToNext = computed(() => {
    return isSequentialMode.value && sequenceIndex.value < totalSequentialStations.value - 1
  })

  /**
   * Calcula progresso da simulação sequencial
   */
  const sequentialProgress = computed(() => {
    if (!isSequentialMode.value || totalSequentialStations.value === 0) {
      return { current: 0, total: 0, percentage: 0 }
    }

    const current = sequenceIndex.value + 1
    const total = totalSequentialStations.value
    const percentage = Math.round((current / total) * 100)

    return { current, total, percentage }
  })

  /**
   * Retorna a estação atual na sequência
   */
  const currentSequentialStation = computed(() => {
    if (!isSequentialMode.value || !sequentialData.value || !sequentialData.value.sequence) {
      return null
    }

    return sequentialData.value.sequence[sequenceIndex.value] || null
  })

  /**
   * Função de debug global para diagnosticar problemas sequenciais
   */
  function setupDebugFunction(additionalData: any = {}) {
    (window as any).debugSequentialNavigation = function() {
      console.log('=== SEQUENTIAL NAVIGATION DEBUG ===')
      console.log('isSequentialMode:', isSequentialMode.value)
      console.log('sequenceIndex:', sequenceIndex.value)
      console.log('totalSequentialStations:', totalSequentialStations.value)
      console.log('sequentialData:', sequentialData.value)
      console.log('sessionStorage sequentialSession:', sessionStorage.getItem('sequentialSession'))
      console.log('canGoToPrevious:', canGoToPrevious.value)
      console.log('canGoToNext:', canGoToNext.value)
      console.log('sequentialProgress:', sequentialProgress.value)
      console.log('currentSequentialStation:', currentSequentialStation.value)

      // Log dados adicionais
      Object.entries(additionalData).forEach(([key, value]) => {
        console.log(`${key}:`, value)
      })

      console.log('===================================')
    }
  }

  return {
    // Funções de navegação
    setupSequentialNavigation,
    goToNextSequentialStation,
    goToPreviousSequentialStation,
    exitSequentialMode,

    // Computeds
    canGoToPrevious,
    canGoToNext,
    sequentialProgress,
    currentSequentialStation,

    // Utilitários
    setupDebugFunction
  }
}
