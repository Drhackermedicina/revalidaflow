import { ref, computed, onMounted } from 'vue'
import { collection, query, where, orderBy, limit, startAfter, getDocs, getDoc, doc } from 'firebase/firestore'
import { db } from '@/plugins/firebase.js'
import { checkStationEditStatus } from '@/utils/cacheManager.js'  // Para status básico
import Logger from '@/utils/logger';
const logger = new Logger('useStationList');


const stationsMetadados = ref([])
const fullStationsCache = ref(new Map())  // Cache para estações completas
const isLoadingInitial = ref(true)
const isLoadingMore = ref(false)
const lastDoc = ref(null)
const error = ref('')
const currentPage = ref(1)
const itemsPerPage = 50
const cacheTTL = 10 * 60 * 1000  // 10min em ms
const cacheTimestamps = ref(new Map())  // Para TTL

// Função para verificar TTL
const isCacheValid = (stationId) => {
  const timestamp = cacheTimestamps.value.get(stationId)
  if (!timestamp) return false
  return Date.now() - timestamp < cacheTTL
}

// Fetch metadados iniciais (campos leves)
const fetchMetadados = async (afterDoc = null) => {
  try {
    const baseQuery = query(
      collection(db, 'estacoes_clinicas'),
      where('idEstacao', '!=', null),  // Filtra estações válidas
      orderBy('idEstacao', 'desc'),  // Ordena por ID recente
      limit(itemsPerPage)
    )

    const q = afterDoc 
      ? query(baseQuery, startAfter(afterDoc))
      : baseQuery

    const snapshot = await getDocs(q)
    const newMetadados = snapshot.docs.map(doc => ({
      id: doc.id,
      tituloEstacao: doc.data().tituloEstacao,
      especialidade: doc.data().especialidade,
      idEstacao: doc.data().idEstacao,
      numeroDaEstacao: doc.data().numeroDaEstacao || 0,
      criadoEmTimestamp: doc.data().criadoEmTimestamp,
      hasBeenEdited: doc.data().hasBeenEdited || false  // Campo básico se disponível
    }))

    // Adiciona status edição básico se não em metadados
    for (const station of newMetadados) {
      if (!station.hasBeenEdited) {
        station.hasBeenEdited = await checkStationEditStatus(db, station.id)
      }
    }

    if (afterDoc) {
      stationsMetadados.value.push(...newMetadados)
      isLoadingMore.value = false
    } else {
      stationsMetadados.value = newMetadados
      isLoadingInitial.value = false
    }

    lastDoc.value = snapshot.docs[snapshot.docs.length - 1]
    currentPage.value++
    return snapshot.docs.length > 0
  } catch (err) {
    error.value = err.message
    isLoadingInitial.value = false
    isLoadingMore.value = false
    return false
  }
}

// Load full station on-click com cache
const loadFullStation = async (stationId) => {
  if (fullStationsCache.value.has(stationId) && isCacheValid(stationId)) {
    return fullStationsCache.value.get(stationId)
  }

  try {
    const fullDoc = await getDoc(doc(db, 'estacoes_clinicas', stationId))
    if (fullDoc.exists()) {
      const fullData = { id: stationId, ...fullDoc.data() }
      fullStationsCache.value.set(stationId, fullData)
      cacheTimestamps.value.set(stationId, Date.now())
      return fullData
    }
    return null
  } catch (err) {
    logger.error('Erro ao carregar estação completa:', err)
    return null
  }
}

// Load more metadados (paginação)
const loadMore = async () => {
  if (isLoadingMore.value || !lastDoc.value) return false
  isLoadingMore.value = true
  const hasMore = await fetchMetadados(lastDoc.value)
  return hasMore
}

// Expor
export function useStationList() {
  // Computed para estações filtradas baseadas em metadados
  const filteredMetadadosStations = computed(() => {
    // Lógica de filtro similar à original, mas só em metadados (ex: por especialidade)
    return stationsMetadados.value  // Placeholder - integre filtros aqui
  })

  // Inicializar dentro do setup context
  onMounted(async () => {
    await fetchMetadados()
  })

  return {
    stationsMetadados,
    fullStationsCache,
    filteredMetadadosStations,
    loadFullStation,
    loadMore,
    isLoadingInitial,
    isLoadingMore,
    error,
    hasMore: computed(() => lastDoc.value !== null)
  }
}
