import { ref } from 'vue'
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore'
import { db } from '@/plugins/firebase.js'
import Logger from '@/utils/logger';
const logger = new Logger('useCandidateSearch');


/**
 * Composable para busca de candidatos e suas pontuações
 * Extrai lógica de busca de candidatos do StationList.vue
 */
export function useCandidateSearch(currentUser) {

  // --- State ---
  const selectedCandidate = ref(null)
  const candidateSearchQuery = ref('')
  const candidateSearchSuggestions = ref([])
  const showCandidateSuggestions = ref(false)
  const selectedCandidateScores = ref({})
  const isLoadingCandidateSearch = ref(false)

  // --- Methods ---

  /**
   * Busca candidatos por nome
   */
  const searchCandidates = async () => {
    if (!candidateSearchQuery.value?.trim()) {
      candidateSearchSuggestions.value = []
      showCandidateSuggestions.value = false
      return
    }

    isLoadingCandidateSearch.value = true
    try {
      const searchTerm = candidateSearchQuery.value.trim().toLowerCase()

      if (!currentUser.value?.uid) {
        throw new Error('Usuário não autenticado')
      }

      // Buscar dados do usuário ATUAL
      const usuariosRef = collection(db, 'usuarios')
      const currentUserDoc = await getDoc(doc(db, 'usuarios', currentUser.value.uid))

      if (!currentUserDoc.exists()) {
        return
      }

      const currentUserData = currentUserDoc.data()
      const instituicaoId = currentUserData.instituicaoId

      // Buscar candidatos com ou sem filtro de instituição
      let candidatesQuery
      if (instituicaoId) {
        // Usuário tem instituicaoId - buscar apenas da mesma instituição
        candidatesQuery = query(
          usuariosRef,
          where('instituicaoId', '==', instituicaoId)
        )
      } else {
        // Usuário NÃO tem instituicaoId - buscar TODOS os usuários
        candidatesQuery = usuariosRef
      }

      const candidatesSnapshot = await getDocs(candidatesQuery)

      const candidates = candidatesSnapshot.docs
        .map(doc => ({ uid: doc.id, ...doc.data() }))
        .filter(candidate => {
          if (!candidate) return false

          // Evitar exibir o próprio usuário logado
          if (candidate.uid === currentUser.value?.uid) return false

          const fullName = `${candidate.nome || ''} ${candidate.sobrenome || ''}`.trim().toLowerCase()
          const displayName = (candidate.displayName || '').toLowerCase()
          const email = (candidate.email || '').toLowerCase()

          return (
            fullName.includes(searchTerm) ||
            displayName.includes(searchTerm) ||
            email.includes(searchTerm)
          )
        })

      candidateSearchSuggestions.value = candidates.slice(0, 10)
      showCandidateSuggestions.value = candidates.length > 0

    } catch (error) {
      logger.error('Erro ao buscar candidatos:', error)
      candidateSearchSuggestions.value = []
      showCandidateSuggestions.value = false

      if (error.code === 'permission-denied') {
        logger.warn('Permissão negada para buscar candidatos. Verifique as regras do Firestore.')
      }
    } finally {
      isLoadingCandidateSearch.value = false
    }
  }

  /**
   * Seleciona um candidato e carrega suas pontuações
   */
  const selectCandidate = async (candidate) => {
    selectedCandidate.value = candidate
    candidateSearchQuery.value = `${candidate.nome} ${candidate.sobrenome}`.trim()
    showCandidateSuggestions.value = false

    await fetchCandidateScores(candidate.uid)
  }

  /**
   * Busca pontuações do candidato
   */
  const fetchCandidateScores = async (candidateUid) => {
    try {
      if (!candidateUid) {
        throw new Error('UID do candidato não fornecido')
      }

      const scores = {}

      const userDocRef = doc(db, 'usuarios', candidateUid)
      const userDocSnap = await getDoc(userDocRef)

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data()
        const estacoesConcluidas = userData.estacoesConcluidas || []

        estacoesConcluidas.forEach((estacao) => {
          try {
            if (estacao.idEstacao && estacao.nota !== undefined) {
              if (!scores[estacao.idEstacao] || estacao.nota > scores[estacao.idEstacao].score) {
                scores[estacao.idEstacao] = {
                  score: estacao.nota,
                  maxScore: 100,
                  date: estacao.data?.toDate ? estacao.data.toDate() : estacao.data,
                  nomeEstacao: estacao.nomeEstacao,
                  especialidade: estacao.especialidade,
                  origem: estacao.origem
                }
              }
            }
          } catch (estacaoError) {
            logger.warn('Erro ao processar estação do candidato:', estacao, estacaoError)
          }
        })
      } else {
        logger.warn('Documento do candidato não encontrado:', candidateUid)
      }

      selectedCandidateScores.value = scores

    } catch (error) {
      logger.error('Erro ao buscar pontuações do candidato:', error)
      selectedCandidateScores.value = {}

      if (error.code === 'permission-denied') {
        logger.warn('Permissão negada para buscar dados do candidato. Verifique as regras do Firestore.')
      }
    }
  }

  /**
   * Limpa seleção de candidato
   */
  const clearCandidateSelection = () => {
    selectedCandidate.value = null
    candidateSearchQuery.value = ''
    selectedCandidateScores.value = {}
    showCandidateSuggestions.value = false
  }

  /**
   * Obtém pontuação do usuário/candidato para uma estação
   */
  const getUserStationScore = (stationId, userScores) => {
    const scoresData = selectedCandidate.value ? selectedCandidateScores.value : userScores
    const userScore = scoresData[stationId]

    if (!userScore) return null

    const percentage = (userScore.score / userScore.maxScore) * 100
    return {
      score: userScore.score,
      maxScore: userScore.maxScore,
      percentage: percentage.toFixed(1),
      date: userScore.date,
      sessionId: userScore.sessionId
    }
  }

  // --- Return ---
  return {
    // State
    selectedCandidate,
    candidateSearchQuery,
    candidateSearchSuggestions,
    showCandidateSuggestions,
    selectedCandidateScores,
    isLoadingCandidateSearch,

    // Methods
    searchCandidates,
    selectCandidate,
    fetchCandidateScores,
    clearCandidateSelection,
    getUserStationScore
  }
}
