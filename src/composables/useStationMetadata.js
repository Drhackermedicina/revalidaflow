/**
 * useStationMetadata.js
 * 
 * Composable for progressive loading of station metadata
 * Loads only what's needed when needed
 */

import { ref, computed } from 'vue'
import { db } from '@/plugins/firebase.js'
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore'
import { currentUser } from '@/plugins/auth.js'
import Logger from '@/utils/logger'

const logger = new Logger('useStationMetadata')

// Cache for metadata to avoid repeated queries
const metadataCache = ref(null)
const sectionCache = ref(new Map())
const userScoresCache = ref(new Map())

export function useStationMetadata() {
  // --- State ---
  const isLoadingMetadata = ref(false)
  const isLoadingSections = ref(false)
  const metadataError = ref('')

  /**
   * Load only station counts and basic metadata
   * Much faster than loading all station data
   */
  async function fetchStationMetadata() {
    if (metadataCache.value) {
      logger.info('Returning cached metadata')
      return metadataCache.value
    }

    isLoadingMetadata.value = true
    metadataError.value = ''

    try {
      logger.info('Fetching station metadata only')

      // Use aggregation queries to get counts efficiently
      const stationsColRef = collection(db, 'estacoes_clinicas')
      
      // Get total counts by type
      const inepQuery = query(
        stationsColRef,
        where('idEstacao', '>=', 'INEP'),
        where('idEstacao', '<', 'INEP~')
      )
      
      const revalidaFacilQuery = query(
        stationsColRef,
        where('idEstacao', '>=', 'REVALIDA_FACIL'),
        where('idEstacao', '<', 'REVALIDA_FACIL~')
      )

      const [inepSnapshot, revalidaSnapshot] = await Promise.all([
        getDocs(inepQuery),
        getDocs(revalidaFacilQuery)
      ])

      // Process metadata without loading full station data
      const inepStations = []
      const revalidaFacilStations = []
      
      inepSnapshot.forEach(doc => {
        const data = doc.data()
        inepStations.push({
          id: doc.id,
          idEstacao: data.idEstacao,
          especialidade: data.especialidade,
          numeroDaEstacao: data.numeroDaEstacao
        })
      })

      revalidaSnapshot.forEach(doc => {
        const data = doc.data()
        revalidaFacilStations.push({
          id: doc.id,
          idEstacao: data.idEstacao,
          especialidade: data.especialidade,
          numeroDaEstacao: data.numeroDaEstacao
        })
      })

      // Group by periods and specialties for UI
      const inepByPeriod = {}
      const revalidaFacilBySpecialty = {}

      // Process INEP stations by period
      inepStations.forEach(station => {
        const idEstacao = station.idEstacao || ''
        const match = idEstacao.match(/(?:INEP|REVALIDA)_(\d{4})(?:_(\d))?/)
        if (match) {
          const year = match[1]
          const subPeriod = match[2]
          const period = subPeriod ? `${year}.${subPeriod}` : year
          
          if (!inepByPeriod[period]) {
            inepByPeriod[period] = []
          }
          inepByPeriod[period].push(station)
        }
      })

      // Process Revalida Fácil stations by specialty
      const specialties = ['clinica-medica', 'cirurgia', 'pediatria', 'ginecologia', 'preventiva', 'procedimentos']
      
      revalidaFacilStations.forEach(station => {
        const idEstacao = station.idEstacao || ''
        const normalized = idEstacao.toLowerCase()
        
        let specialty = 'geral'
        if (normalized.includes('clinica_medica')) specialty = 'clinica-medica'
        else if (normalized.includes('cirurgia')) specialty = 'cirurgia'
        else if (normalized.includes('pediatria')) specialty = 'pediatria'
        else if (normalized.includes('go')) specialty = 'ginecologia'
        else if (normalized.includes('preventiva')) specialty = 'preventiva'
        else if (normalized.includes('procedimentos')) specialty = 'procedimentos'
        
        if (!revalidaFacilBySpecialty[specialty]) {
          revalidaFacilBySpecialty[specialty] = []
        }
        revalidaFacilBySpecialty[specialty].push(station)
      })

      const metadata = {
        inep: {
          total: inepStations.length,
          byPeriod: inepByPeriod,
          periods: Object.keys(inepByPeriod).sort().reverse()
        },
        revalidaFacil: {
          total: revalidaFacilStations.length,
          bySpecialty: revalidaFacilBySpecialty,
          specialties: Object.keys(revalidaFacilBySpecialty)
        },
        total: inepStations.length + revalidaFacilStations.length
      }

      metadataCache.value = metadata
      logger.info(`Metadata loaded: ${metadata.total} total stations`)
      
      return metadata

    } catch (error) {
      logger.error('Error fetching metadata:', error)
      metadataError.value = 'Failed to load station metadata'
      throw error
    } finally {
      isLoadingMetadata.value = false
    }
  }

  /**
   * Load stations for a specific section (lazy loading)
   */
  async function loadSectionStations(type, key) {
    const cacheKey = `${type}:${key}`
    
    if (sectionCache.value.has(cacheKey)) {
      logger.info(`Returning cached section data for ${cacheKey}`)
      return sectionCache.value.get(cacheKey)
    }

    isLoadingSections.value = true
    
    try {
      logger.info(`Loading section: ${type}:${key}`)
      
      // Handle special case for 'inep-main' - this should not trigger individual loading
      if (type === 'inep-main') {
        logger.warn('Skipping individual loading for inep-main section')
        return []
      }
      
      const stationsColRef = collection(db, 'estacoes_clinicas')
      let q

      if (type === 'inep-period') {
        // Load stations for specific INEP period - simplified query without orderBy for now
        const year = key
        q = query(
          stationsColRef,
          where('idEstacao', '>=', `INEP_${year}`),
          where('idEstacao', '<', `INEP_${year}~`)
          // orderBy('numeroDaEstacao', 'asc') // Removed to avoid index requirement
        )
      } else if (type === 'revalida-facil-specialty') {
        // Load stations for specific Revalida Fácil specialty - simplified query
        q = query(
          stationsColRef,
          where('idEstacao', '>=', 'REVALIDA_FACIL'),
          where('idEstacao', '<', 'REVALIDA_FACIL~')
          // orderBy('numeroDaEstacao', 'asc') // Removed to avoid index requirement
        )
      }

      const querySnapshot = await getDocs(q)
      
      const stations = []
      querySnapshot.forEach(doc => {
        const data = doc.data()
        stations.push({
          id: doc.id,
          idEstacao: data.idEstacao,
          tituloEstacao: data.tituloEstacao,
          especialidade: data.especialidade,
          numeroDaEstacao: data.numeroDaEstacao,
          area: data.area,
          _minimal: true // Mark as minimal data
        })
      })

      // Cache the result
      sectionCache.value.set(cacheKey, stations)
      
      logger.info(`Loaded ${stations.length} stations for section ${cacheKey}`)
      return stations

    } catch (error) {
      logger.error(`Error loading section ${type}:${key}:`, error)
      throw error
    } finally {
      isLoadingSections.value = false
    }
  }

  /**
   * Load user scores for specific station IDs
   */
  async function loadUserScores(stationIds) {
    if (!currentUser.value || !stationIds.length) return {}

    // Check cache first
    const uncachedIds = stationIds.filter(id => !userScoresCache.value.has(id))
    
    if (uncachedIds.length === 0) {
      const result = {}
      stationIds.forEach(id => {
        result[id] = userScoresCache.value.get(id)
      })
      return result
    }

    try {
      logger.info(`Loading user scores for ${uncachedIds.length} stations`)
      
      const scores = {}
      const userId = currentUser.value.uid
      
      // Batch load user scores
      const promises = uncachedIds.map(async (stationId) => {
        try {
          const scoreDoc = await getDoc(doc(db, 'usuarios', userId, 'estacoes', stationId))
          if (scoreDoc.exists()) {
            const data = scoreDoc.data()
            scores[stationId] = {
              completed: data.completed || false,
              score: data.score || 0,
              completedAt: data.completedAt?.toDate()
            }
            userScoresCache.value.set(stationId, scores[stationId])
          } else {
            scores[stationId] = { completed: false, score: 0 }
            userScoresCache.value.set(stationId, scores[stationId])
          }
        } catch (error) {
          logger.error(`Error loading score for station ${stationId}:`, error)
          scores[stationId] = { completed: false, score: 0 }
          userScoresCache.value.set(stationId, scores[stationId])
        }
      })

      await Promise.all(promises)
      
      logger.info(`Loaded scores for ${Object.keys(scores).length} stations`)
      return scores

    } catch (error) {
      logger.error('Error loading user scores:', error)
      throw error
    }
  }

  /**
   * Clear caches (useful for refresh)
   */
  function clearCaches() {
    metadataCache.value = null
    sectionCache.value.clear()
    userScoresCache.value.clear()
    logger.info('Caches cleared')
  }

  return {
    // State
    isLoadingMetadata,
    isLoadingSections,
    metadataError,
    
    // Computed
    metadata: computed(() => metadataCache.value),
    
    // Methods
    fetchStationMetadata,
    loadSectionStations,
    loadUserScores,
    clearCaches
  }
}
