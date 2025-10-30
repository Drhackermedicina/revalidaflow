/**
 * useStationNavigation.js
 *
 * Composable para gerenciar navegação e inicialização de simulações
 */

import { ref } from 'vue'
import { useRouter } from 'vue-router'
import Logger from '@/utils/logger';
import { backendUrl } from '@/utils/backendUrl.js'
import { getAuthHeadersAsync } from '@/utils/authHeaders.js'

const logger = new Logger('useStationNavigation');


export function useStationNavigation() {
  const router = useRouter()

  const creatingSessionForStationId = ref(null)
  const isLoadingSession = ref(false)
  const errorApi = ref('')

  /**
   * Cria uma sessão no backend para uso em navegação direta
   * @param {String} stationId - ID da estação
   * @param {Number} durationMinutes - Duração da simulação em minutos
   * @returns {Promise<String>} - Retorna o sessionId gerado
   */
  async function createSessionForDirectNavigation(stationId, durationMinutes = 10) {
    logger.debug('[SESSION-CREATION] 🆕 Criando sessão para navegação direta...', { stationId, durationMinutes });

    try {
      const authHeaders = await getAuthHeadersAsync()

      if (!authHeaders.Authorization) {
        throw new Error('Sessão expirada. Faça login novamente.')
      }

      const response = await fetch(`${backendUrl}/api/create-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({
          stationId: stationId,
          durationMinutes: durationMinutes,
          localSessionId: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        })
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Autenticação necessária. Faça login novamente.')
        }
        throw new Error(`Erro ao criar sessão: HTTP ${response.status}`)
      }

      const sessionData = await response.json()
      const sessionId = sessionData.sessionId

      logger.debug('[SESSION-CREATION] ✅ Sessão criada com sucesso:', sessionId);
      return sessionId

    } catch (error) {
      logger.error('[SESSION-CREATION] ❌ Erro ao criar sessão:', error);
      throw new Error(`Falha ao criar sessão: ${error.message}`)
    }
  }

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
      clearSearchFields,
      durationMinutes = 10
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

      logger.debug('[SIMULATION-START] 🔧 Criando sessão para navegação direta...', { stationId, durationMinutes });

      // Criar sessão no backend antes de navegar
      // A criação da sessão será tratada na própria página de simulação.
      // A navegação agora ocorre sem um sessionId, que será gerado posteriormente.
      const sessionId = `placeholder_${Date.now()}`; // Usar um placeholder

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
          role: 'actor',
          // O sessionId será gerado na página de simulação
          // sessionId: sessionId
        }
      })

      // Limpar campos de busca quando abre a simulação
      if (clearSearchFields) {
        clearSearchFields()
      }

      // Armazenar candidato selecionado (sessionStorage – mesma aba)
      if (selectedCandidate?.value) {
        const candidateData = {
          uid: selectedCandidate.value.uid,
          name: `${selectedCandidate.value.nome} ${selectedCandidate.value.sobrenome}`.trim(),
          email: selectedCandidate.value.email,
          photoURL: selectedCandidate.value.photoURL,
          selectedAt: Date.now(),
          sessionId: sessionId
        }

        try { sessionStorage.setItem('selectedCandidate', JSON.stringify(candidateData)) } catch {}
      }

      // Navegar na MESMA aba (mantém sessionStorage e contexto)
      router.push(routeData)

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
        query: { mode: 'ai-training' }
      })

      // Limpar campos de busca quando abre a simulação
      if (clearSearchFields) {
        clearSearchFields()
      }

      // Navegar na mesma aba
      router.push(routeData)
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
