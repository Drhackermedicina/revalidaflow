/**
 * useStationData.js
 *
 * Composable para gerenciar carregamento e cache de dados de estações
 * Extrai lógica de fetch do StationList.vue
 */

import { ref } from 'vue'
import { db } from '@/plugins/firebase.js'
import { collection, doc, getDoc, getDocs, query, limit, orderBy, startAfter } from 'firebase/firestore'
import { currentUser } from '@/plugins/auth.js'
import Logger from '@/utils/logger';
const logger = new Logger('useStationData');

// Configuração de paginação OTIMIZADA
const PAGE_SIZE = 200 // Carrega 200 estações por vez para balancear performance e disponibilidade

export function useStationData() {
  // --- State ---
  const stations = ref([])
  const isLoadingStations = ref(true)
  const errorMessage = ref('')
  const userScores = ref({}) // Armazena pontuações do usuário por estação
  const totalStationsCount = ref(0)

  // Pagination state MELHORADO
  const currentPage = ref(0)
  const hasMoreStations = ref(true)
  const isLoadingMoreStations = ref(false)
  const lastVisibleDoc = ref(null)

  // Cache de estações completas (lazy loading)
  const fullStationsCache = ref(new Map())
  const isLoadingFullStation = ref(false)

  /**
   * Busca estações com PAGINAÇÃO REAL
   * @param {boolean} loadMore - Se deve carregar mais estações ou resetar
   */
  async function fetchStations(loadMore = false) {
    // Se não é carregamento adicional, reset state
    if (!loadMore) {
      isLoadingStations.value = true
      errorMessage.value = ''
      stations.value = []
      hasMoreStations.value = true
      lastVisibleDoc.value = null
      currentPage.value = 0
    } else {
      // Se já está carregando mais ou não há mais, retorna
      if (isLoadingMoreStations.value || !hasMoreStations.value) return
      isLoadingMoreStations.value = true
      currentPage.value++
    }

    try {
      // Query otimizada com paginação
      const stationsColRef = collection(db, 'estacoes_clinicas')
      let q = query(
        stationsColRef,
        orderBy('numeroDaEstacao', 'asc'),
        limit(PAGE_SIZE)
      )

      // Se está carregando mais, começar após o último documento
      if (loadMore && lastVisibleDoc.value) {
        q = query(
          stationsColRef,
          orderBy('numeroDaEstacao', 'asc'),
          startAfter(lastVisibleDoc.value),
          limit(PAGE_SIZE)
        )
      }
      const querySnapshot = await getDocs(q)

      if (querySnapshot.empty && !loadMore) {
        errorMessage.value = "Nenhuma estação encontrada no Firestore"
        hasMoreStations.value = false
        return
      }

      // Se retornou menos que PAGE_SIZE, não há mais páginas
      hasMoreStations.value = querySnapshot.size === PAGE_SIZE

      // Guardar último documento para próxima paginação
      if (!querySnapshot.empty) {
        const docs = querySnapshot.docs
        lastVisibleDoc.value = docs[docs.length - 1]
      }

      const stationsList = []
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data()
        // Carregar apenas campos necessários para lista
        const stationData = {
          id: docSnap.id,
          idEstacao: data.idEstacao,
          tituloEstacao: data.tituloEstacao,
          especialidade: data.especialidade,
          area: data.area,
          numeroDaEstacao: data.numeroDaEstacao,
          inepPeriod: data.inepPeriod,
          hmAttributeOrgQualifications: data.hmAttributeOrgQualifications,
          criadoEmTimestamp: data.criadoEmTimestamp
        }
        stationsList.push(stationData)
      })

      // Atualizar estado
      if (loadMore) {
        stations.value = [...stations.value, ...stationsList]
      } else {
        stations.value = stationsList
      }

      totalStationsCount.value = stations.value.length
      logger.debug(`Carregadas ${stationsList.length} estações (Total: ${totalStationsCount.value})`)

      // Buscar pontuações do usuário APENAS se autenticado
      if (currentUser.value) {
        await fetchUserScores()
      }

    } catch (error) {
      logger.error('ERRO ao buscar lista de estações:', error)
      errorMessage.value = `Falha ao buscar estações: ${error.message}`

      if (error.code === 'permission-denied') {
        errorMessage.value += " (Erro de permissão! Verifique as Regras de Segurança do Firestore)"
      } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        errorMessage.value += " (Erro de rede! Verifique sua conexão ou as configurações de CORS/segurança do navegador)"
      }
    } finally {
      isLoadingStations.value = false
      isLoadingMoreStations.value = false
    }
  }

  /**
   * Busca pontuações do usuário atual
   */
  async function fetchUserScores() {
    if (!currentUser.value) return

    try {
      const userDocRef = doc(db, 'usuarios', currentUser.value.uid)
      const userDocSnap = await getDoc(userDocRef)

      const scores = {}

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data()
        const estacoesConcluidas = userData.estacoesConcluidas || []

        estacoesConcluidas.forEach((estacao) => {
          if (estacao.idEstacao && estacao.nota !== undefined) {
            // Armazenar apenas o maior score de cada estação
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
        })
      }

      userScores.value = scores

    } catch (error) {
      logger.error('ERRO ao buscar pontuações do usuário:', error)
    }
  }

  /**
   * Carrega estação completa sob demanda (lazy loading)
   * @param {String} stationId - ID da estação
   * @returns {Object|null} - Dados completos da estação ou null
   */
  async function loadFullStation(stationId) {
    if (fullStationsCache.value.has(stationId)) {
      return fullStationsCache.value.get(stationId)
    }

    isLoadingFullStation.value = true

    try {
      const stationDocRef = doc(db, 'estacoes_clinicas', stationId)
      const stationDocSnap = await getDoc(stationDocRef)

      if (stationDocSnap.exists()) {
        const fullStationData = { id: stationId, ...stationDocSnap.data() }
        fullStationsCache.value.set(stationId, fullStationData)
        return fullStationData
      } else {
        logger.error(`Estação ${stationId} não encontrada`)
        return null
      }
    } catch (error) {
      logger.error('Erro ao carregar estação completa:', error)
      errorMessage.value = `Erro ao carregar estação: ${error.message}`
      return null
    } finally {
      isLoadingFullStation.value = false
    }
  }

  /**
   * Obtém score do usuário para uma estação específica
   * @param {String} stationId - ID da estação
   * @returns {Object|null} - Dados de score ou null
   */
  function getUserStationScore(stationId) {
    return userScores.value[stationId] || null
  }

  return {
    // State
    stations,
    isLoadingStations,
    errorMessage,
    userScores,
    fullStationsCache,
    isLoadingFullStation,

    // Lazy loading state
    hasMoreStations,
    isLoadingMoreStations,

    // Methods
    fetchStations,
    fetchUserScores,
    loadFullStation,
    getUserStationScore
  }
}
