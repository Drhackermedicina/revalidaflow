/**
 * useStationData.js
 *
 * Composable para gerenciar carregamento e cache de dados de estações
 * Extrai lógica de fetch do StationList.vue
 */

import { ref } from 'vue'
import { db } from '@/plugins/firebase.js'
import { collection, doc, getDoc, getDocs, query, limit, orderBy } from 'firebase/firestore'
import { currentUser } from '@/plugins/auth.js'

export function useStationData() {
  // --- State ---
  const stations = ref([])
  const isLoadingStations = ref(true)
  const errorMessage = ref('')
  const userScores = ref({}) // Armazena pontuações do usuário por estação

  // Lazy loading state
  const hasMoreStations = ref(false)
  const isLoadingMoreStations = ref(false)
  const lastVisibleDoc = ref(null)

  // Cache de estações completas (lazy loading)
  const fullStationsCache = ref(new Map())
  const isLoadingFullStation = ref(false)

  /**
   * Busca todas as estações (carregamento completo inicial)
   * Carrega todas as estações para manter compatibilidade com filtros existentes
   */
  async function fetchStations(loadMore = false) {
    // Se não é carregamento adicional, reset state
    if (!loadMore) {
      isLoadingStations.value = true
      errorMessage.value = ''
      stations.value = []
      hasMoreStations.value = false
      lastVisibleDoc.value = null
    } else {
      // Se já está carregando mais ou não há mais, retorna
      if (isLoadingMoreStations.value || !hasMoreStations.value) return
      isLoadingMoreStations.value = true
    }

    try {
      // Carregar estações com apenas os campos necessários para otimização
      // Ordena por número da estação no Firestore para melhor performance
      const stationsColRef = collection(db, 'estacoes_clinicas')
      const q = query(
        stationsColRef,
        orderBy('numeroDaEstacao', 'asc'),
        limit(1000) // Limite razoável para evitar sobrecarga
      )
      const querySnapshot = await getDocs(q)
      const stationsList = []

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data()
        const modifiedData = {
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
        stationsList.push(modifiedData)
      })

      // Como já ordenamos no Firestore, não precisamos ordenar novamente
      // stationsList.sort((a, b) => {
      //   const numA = a.numeroDaEstacao || 0
      //   const numB = b.numeroDaEstacao || 0
      //   return numA - numB
      // })

      // Atualizar estado
      if (loadMore) {
        stations.value = [...stations.value, ...stationsList]
      } else {
        stations.value = stationsList
      }

      // Não há mais estações para carregar (carregamos tudo de uma vez)
      hasMoreStations.value = false

      // Buscar pontuações do usuário (sempre haverá usuário autenticado)
      await fetchUserScores()

      if (stations.value.length === 0) {
        errorMessage.value = "Nenhuma estação encontrada no Firestore na coleção 'estacoes_clinicas'"
      }

    } catch (error) {
      console.error('ERRO ao buscar lista de estações:', error)
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
      console.error('ERRO ao buscar pontuações do usuário:', error)
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
        console.error(`Estação ${stationId} não encontrada`)
        return null
      }
    } catch (error) {
      console.error('Erro ao carregar estação completa:', error)
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

