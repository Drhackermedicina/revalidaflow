/**
 * stationRepository.js
 * 
 * Repository pattern para abstração de operações com estações no Firebase
 * Centraliza toda a lógica de acesso a dados, facilitando manutenção e testes
 */

import { db } from '@/plugins/firebase'
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter,
  updateDoc,
  setDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore'
import { useSmartCache } from '@/composables/useSmartCache'

const COLLECTION_NAME = 'estacoes_clinicas'
const { getCachedData, invalidateCache } = useSmartCache()

class StationRepository {
  /**
   * Busca uma estação específica por ID
   */
  async getById(stationId) {
    if (!stationId) {
      throw new Error('ID da estação é obrigatório')
    }

    // Usa cache inteligente
    return getCachedData(
      `station_${stationId}`,
      async () => {
        const docRef = doc(db, COLLECTION_NAME, stationId)
        const docSnap = await getDoc(docRef)
        
        if (!docSnap.exists()) {
          throw new Error(`Estação ${stationId} não encontrada`)
        }
        
        return {
          id: docSnap.id,
          ...docSnap.data()
        }
      },
      { cacheType: 'station_full' }
    )
  }

  /**
   * Busca lista paginada de estações
   */
  async getList(options = {}) {
    const {
      pageSize = 20,
      startAfterDoc = null,
      filters = {},
      sortBy = 'numeroDaEstacao',
      sortOrder = 'asc'
    } = options

    // Constrói query
    let q = query(
      collection(db, COLLECTION_NAME),
      orderBy(sortBy, sortOrder),
      limit(pageSize)
    )

    // Adiciona filtros
    if (filters.especialidade) {
      q = query(q, where('especialidade', '==', filters.especialidade))
    }
    if (filters.inepPeriod) {
      q = query(q, where('inepPeriod', '==', filters.inepPeriod))
    }
    if (filters.area) {
      q = query(q, where('area', '==', filters.area))
    }

    // Adiciona paginação
    if (startAfterDoc) {
      q = query(q, startAfter(startAfterDoc))
    }

    const snapshot = await getDocs(q)
    const stations = []
    let lastDoc = null

    snapshot.forEach(docSnap => {
      stations.push({
        id: docSnap.id,
        ...this._extractMinimalData(docSnap.data())
      })
      lastDoc = docSnap
    })

    return {
      stations,
      lastDoc,
      hasMore: stations.length === pageSize
    }
  }

  /**
   * Busca todas as estações (use com cautela - alto custo)
   */
  async getAll(useCache = true) {
    if (useCache) {
      return getCachedData(
        'all_stations',
        async () => await this._fetchAllStations(),
        { cacheType: 'stations', ttl: 15 * 60 * 1000 } // 15 minutos
      )
    }
    
    return await this._fetchAllStations()
  }

  /**
   * Busca estações por período INEP
   */
  async getByInepPeriod(period) {
    return getCachedData(
      `stations_inep_${period}`,
      async () => {
        const q = query(
          collection(db, COLLECTION_NAME),
          where('inepPeriod', '==', period),
          orderBy('numeroDaEstacao')
        )
        
        const snapshot = await getDocs(q)
        const stations = []
        
        snapshot.forEach(docSnap => {
          stations.push({
            id: docSnap.id,
            ...this._extractMinimalData(docSnap.data())
          })
        })
        
        return stations
      },
      { cacheType: 'stations' }
    )
  }

  /**
   * Busca estações por especialidade
   */
  async getBySpecialty(specialty) {
    return getCachedData(
      `stations_specialty_${specialty}`,
      async () => {
        const q = query(
          collection(db, COLLECTION_NAME),
          where('especialidade', '==', specialty),
          orderBy('numeroDaEstacao'),
          limit(50) // Limita para economizar
        )
        
        const snapshot = await getDocs(q)
        const stations = []
        
        snapshot.forEach(docSnap => {
          stations.push({
            id: docSnap.id,
            ...this._extractMinimalData(docSnap.data())
          })
        })
        
        return stations
      },
      { cacheType: 'stations' }
    )
  }

  /**
   * Atualiza uma estação
   */
  async update(stationId, data) {
    if (!stationId) {
      throw new Error('ID da estação é obrigatório')
    }

    const docRef = doc(db, COLLECTION_NAME, stationId)
    
    // Adiciona timestamp de atualização
    const updateData = {
      ...data,
      atualizadoEm: serverTimestamp()
    }
    
    await updateDoc(docRef, updateData)
    
    // Invalida cache da estação
    invalidateCache(`station_${stationId}`)
    invalidateCache('stations_') // Invalida listas
    
    return { success: true, id: stationId }
  }

  /**
   * Cria uma nova estação
   */
  async create(data) {
    const docRef = doc(collection(db, COLLECTION_NAME))
    
    const newData = {
      ...data,
      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp()
    }
    
    await setDoc(docRef, newData)
    
    // Invalida cache de listas
    invalidateCache('stations_')
    invalidateCache('all_stations')
    
    return { success: true, id: docRef.id }
  }

  /**
   * Deleta uma estação
   */
  async delete(stationId) {
    if (!stationId) {
      throw new Error('ID da estação é obrigatório')
    }

    const docRef = doc(db, COLLECTION_NAME, stationId)
    await deleteDoc(docRef)
    
    // Invalida caches
    invalidateCache(`station_${stationId}`)
    invalidateCache('stations_')
    invalidateCache('all_stations')
    
    return { success: true }
  }

  /**
   * Busca estatísticas das estações
   */
  async getStatistics() {
    return getCachedData(
      'stations_statistics',
      async () => {
        const snapshot = await getDocs(collection(db, COLLECTION_NAME))
        
        const stats = {
          total: 0,
          bySpecialty: {},
          byInepPeriod: {},
          byArea: {}
        }
        
        snapshot.forEach(docSnap => {
          const data = docSnap.data()
          stats.total++
          
          // Por especialidade
          if (data.especialidade) {
            stats.bySpecialty[data.especialidade] = (stats.bySpecialty[data.especialidade] || 0) + 1
          }
          
          // Por período INEP
          if (data.inepPeriod) {
            stats.byInepPeriod[data.inepPeriod] = (stats.byInepPeriod[data.inepPeriod] || 0) + 1
          }
          
          // Por área
          if (data.area) {
            stats.byArea[data.area] = (stats.byArea[data.area] || 0) + 1
          }
        })
        
        return stats
      },
      { cacheType: 'stations', ttl: 30 * 60 * 1000 } // 30 minutos
    )
  }

  /**
   * Busca estações recentes (últimas adicionadas/modificadas)
   */
  async getRecent(limit = 10) {
    return getCachedData(
      `stations_recent_${limit}`,
      async () => {
        const q = query(
          collection(db, COLLECTION_NAME),
          orderBy('atualizadoEm', 'desc'),
          limit(limit)
        )
        
        const snapshot = await getDocs(q)
        const stations = []
        
        snapshot.forEach(docSnap => {
          stations.push({
            id: docSnap.id,
            ...this._extractMinimalData(docSnap.data())
          })
        })
        
        return stations
      },
      { cacheType: 'stations', ttl: 5 * 60 * 1000 } // 5 minutos
    )
  }

  /**
   * Invalida todo o cache de estações
   */
  clearCache() {
    invalidateCache('station')
    invalidateCache('all_stations')
  }

  // --- Métodos Privados ---

  /**
   * Busca todas as estações (método privado)
   */
  async _fetchAllStations() {
    const snapshot = await getDocs(collection(db, COLLECTION_NAME))
    const stations = []
    
    snapshot.forEach(docSnap => {
      stations.push({
        id: docSnap.id,
        ...this._extractMinimalData(docSnap.data())
      })
    })
    
    // Ordena por número da estação
    stations.sort((a, b) => {
      const numA = a.numeroDaEstacao || 0
      const numB = b.numeroDaEstacao || 0
      return numA - numB
    })
    
    return stations
  }

  /**
   * Extrai apenas dados essenciais para listagens
   */
  _extractMinimalData(data) {
    return {
      idEstacao: data.idEstacao,
      tituloEstacao: data.tituloEstacao,
      especialidade: data.especialidade,
      area: data.area,
      numeroDaEstacao: data.numeroDaEstacao,
      inepPeriod: data.inepPeriod,
      hmAttributeOrgQualifications: data.hmAttributeOrgQualifications,
      criadoEmTimestamp: data.criadoEmTimestamp,
      atualizadoEm: data.atualizadoEm
    }
  }
}

// Exporta instância única (Singleton)
export const stationRepository = new StationRepository()
export default stationRepository
