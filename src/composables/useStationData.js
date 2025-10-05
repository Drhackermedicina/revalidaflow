/**
 * useStationData.js
 *
 * Composable para gerenciar carregamento e cache de dados de estações
 * Extrai lógica de fetch do StationList.vue
 */

import { ref } from 'vue'
import { db } from '@/plugins/firebase.js'
import { collection, doc, getDoc, getDocs } from 'firebase/firestore'
import { currentUser } from '@/plugins/auth.js'

export function useStationData() {
  // --- State ---
  const stations = ref([])
  const isLoadingStations = ref(true)
  const errorMessage = ref('')
  const userScores = ref({}) // Armazena pontuações do usuário por estação

  // Cache de estações completas (lazy loading)
  const fullStationsCache = ref(new Map())
  const isLoadingFullStation = ref(false)

  /**
   * Busca lista de estações (apenas metadados)
   * Carrega apenas campos essenciais para performance
   */
  async function fetchStations() {
    isLoadingStations.value = true
    errorMessage.value = ''

    try {
      const stationsColRef = collection(db, 'estacoes_clinicas')
      const querySnapshot = await getDocs(stationsColRef)
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

      // Ordenar por número da estação
      stationsList.sort((a, b) => {
        const numA = a.numeroDaEstacao || 0
        const numB = b.numeroDaEstacao || 0
        return numA - numB
      })

      stations.value = stationsList

      // Buscar pontuações do usuário se logado
      if (currentUser.value) {
        await fetchUserScores()
      }

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

    // Methods
    fetchStations,
    fetchUserScores,
    loadFullStation,
    getUserStationScore
  }
}
