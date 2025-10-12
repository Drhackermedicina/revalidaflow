/**
 * useStationNavigation.js
 *
 * Composable para gerenciar navegação e inicialização de simulações
 */

import { ref } from 'vue'
import { useRouter } from 'vue-router'
import Logger from '@/utils/logger';
const logger = new Logger('useStationNavigation');


export function useStationNavigation() {
  const router = useRouter()

  const creatingSessionForStationId = ref(null)
  const isLoadingSession = ref(false)
  const errorApi = ref('')

  /**
   * Inicia simulação como ator para uma estação
   * @param {String} stationId - ID da estação
   * @param {Object} options - Opções adicionais
   */
  async function startSimulationAsActor(stationId, options = {}) {
    const {
      loadFullStation,
      expandCorrectSection,
      findStation,
      selectedCandidate,
      clearSearchFields
    } = options

    if (!stationId) {
      logger.error('stationId ausente:', stationId)
      errorApi.value = "ID da Estação ausente"
      alert("Erro: ID da estação não encontrado.")
      return
    }

    try {
      creatingSessionForStationId.value = stationId
      isLoadingSession.value = true
      errorApi.value = ''

      // Carregar estação completa antes de navegar (lazy loading)
      if (loadFullStation) {
        const fullStation = await loadFullStation(stationId)
        if (!fullStation) {
          throw new Error('Não foi possível carregar os dados da estação')
        }
      }

      // Encontrar e expandir seção correta
      if (findStation && expandCorrectSection) {
        const station = findStation(stationId)
        if (station) {
          expandCorrectSection(station)
        }
      }

      const routeData = router.resolve({
        path: `/app/simulation/${stationId}`,
        query: {
          role: 'actor'
        }
      })

      // Limpar campos de busca quando abre a simulação
      if (clearSearchFields) {
        clearSearchFields()
      }

      // Armazenar candidato selecionado no sessionStorage
      if (selectedCandidate?.value) {
        const candidateData = {
          uid: selectedCandidate.value.uid,
          name: `${selectedCandidate.value.nome} ${selectedCandidate.value.sobrenome}`.trim(),
          email: selectedCandidate.value.email,
          photoURL: selectedCandidate.value.photoURL,
          selectedAt: Date.now(),
          sessionId: null
        }

        sessionStorage.setItem('selectedCandidate', JSON.stringify(candidateData))
      }

      // Abre a URL em uma nova janela/aba
      window.open(routeData.href, '_blank')

    } catch (error) {
      logger.error('Erro ao navegar para simulação:', error)
      errorApi.value = `Erro: ${error.message}`
      alert(`Erro ao iniciar simulação: ${error.message}`)
    } finally {
      isLoadingSession.value = false
      creatingSessionForStationId.value = null
    }
  }

  /**
   * Inicia treinamento com IA para uma estação
   * @param {String} stationId - ID da estação
   * @param {Object} options - Opções adicionais
   */
  async function startAITraining(stationId, options = {}) {
    const {
      loadFullStation,
      expandCorrectSection,
      findStation,
      clearSearchFields
    } = options

    if (!stationId) {
      logger.error('stationId ausente:', stationId)
      alert("Erro: ID da estação não encontrado.")
      return
    }

    try {
      // Carregar estação completa antes de navegar (lazy loading)
      if (loadFullStation) {
        const fullStation = await loadFullStation(stationId)
        if (!fullStation) {
          throw new Error('Não foi possível carregar os dados da estação')
        }
      }

      // Encontrar e expandir seção correta
      if (findStation && expandCorrectSection) {
        const station = findStation(stationId)
        if (station) {
          expandCorrectSection(station)
        }
      }

      // Resolve a rota para obter a URL completa
      const routeData = router.resolve({
        path: `/app/simulation-ai/${stationId}`,
        query: {
          mode: 'ai-training'
        }
      })

      // Limpar campos de busca quando abre a simulação
      if (clearSearchFields) {
        clearSearchFields()
      }

      // Abre a URL em uma nova janela/aba
      window.open(routeData.href, '_blank')
    } catch (error) {
      logger.error('Erro ao navegar para treinamento com IA:', error)
      alert(`Erro ao iniciar treinamento: ${error.message}`)
    }
  }

  /**
   * Navega para página de edição de estação
   * @param {String} stationId - ID da estação
   */
  function goToEditStation(stationId) {
    router.push(`/app/edit-station/${stationId}`)
  }

  /**
   * Navega para página de upload admin
   */
  function goToAdminUpload() {
    router.push('/app/admin-upload')
  }

  /**
   * Expande a seção correta baseada na estação selecionada
   * @param {Object} station - Objeto da estação
   * @param {Object} accordionRefs - Refs dos accordions
   * @param {Function} isINEPStation - Função para verificar se é INEP
   * @param {Function} isRevalidaFacilStation - Função para verificar se é Revalida Fácil
   * @param {Function} getRevalidaFacilSpecialty - Função para obter especialidade
   */
  function expandCorrectSection(station, accordionRefs, isINEPStation, isRevalidaFacilStation, getRevalidaFacilSpecialty) {
    if (!station || !accordionRefs) return

    // Sempre mostrar a seção de provas anteriores se for INEP
    if (isINEPStation && isINEPStation(station)) {
      if (accordionRefs.showPreviousExamsSection) {
        accordionRefs.showPreviousExamsSection.value = true
      }
      return
    }

    // Se for estação REVALIDA_FACIL, expandir a seção correspondente
    if (isRevalidaFacilStation && isRevalidaFacilStation(station) && getRevalidaFacilSpecialty) {
      const especialidades = getRevalidaFacilSpecialty(station)
      if (especialidades.includes('clinica-medica') && accordionRefs.showRevalidaFacilClinicaMedica) {
        accordionRefs.showRevalidaFacilClinicaMedica.value = true
      }
      if (especialidades.includes('cirurgia') && accordionRefs.showRevalidaFacilCirurgia) {
        accordionRefs.showRevalidaFacilCirurgia.value = true
      }
      if (especialidades.includes('pediatria') && accordionRefs.showRevalidaFacilPediatria) {
        accordionRefs.showRevalidaFacilPediatria.value = true
      }
      if (especialidades.includes('ginecologia') && accordionRefs.showRevalidaFacilGO) {
        accordionRefs.showRevalidaFacilGO.value = true
      }
      if (especialidades.includes('preventiva') && accordionRefs.showRevalidaFacilPreventiva) {
        accordionRefs.showRevalidaFacilPreventiva.value = true
      }
      if (especialidades.includes('procedimentos') && accordionRefs.showRevalidaFacilProcedimentos) {
        accordionRefs.showRevalidaFacilProcedimentos.value = true
      }
    }
  }

  return {
    // State
    creatingSessionForStationId,
    isLoadingSession,
    errorApi,

    // Methods
    startSimulationAsActor,
    startAITraining,
    goToEditStation,
    goToAdminUpload,
    expandCorrectSection
  }
}
