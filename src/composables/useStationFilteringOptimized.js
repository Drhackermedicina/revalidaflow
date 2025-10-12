/**
 * useStationFilteringOptimized.js
 * 
 * Versão OTIMIZADA do composable de filtros
 * Elimina filtros redundantes e melhora performance
 */

import { ref, computed } from 'vue'
import { useStationCache } from './useStationCache'
import { useDebounce } from '@vueuse/core'

export function useStationFilteringOptimized(stations) {
  const { memoize } = useStationCache()

  // --- State ---
  const globalSearchQuery = ref('')
  
  // Debounce inteligente para busca (300ms)
  const debouncedSearchQuery = useDebounce(globalSearchQuery, 300)

  // --- Helpers ---
  
  /**
   * Normaliza texto removendo acentos e espaços extras
   */
  const normalizeText = (text) => {
    if (!text) return ''
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  /**
   * Verifica se a estação é do INEP
   */
  const isINEPStation = (station) => {
    const idEstacao = station.idEstacao || ''
    return idEstacao.startsWith('INEP') || (idEstacao.startsWith('REVALIDA_') && !idEstacao.startsWith('REVALIDA_FACIL'))
  }

  /**
   * Verifica se a estação é do Revalida Fácil
   */
  const isRevalidaFacilStation = (station) => {
    const idEstacao = station.idEstacao || ''
    return idEstacao.startsWith('REVALIDA_FACIL')
  }

  /**
   * Extrai período do INEP
   */
  const getINEPPeriod = (station) => {
    const idEstacao = station.idEstacao || ''
    if (!isINEPStation(station)) return null

    const match = idEstacao.match(/(?:INEP|REVALIDA)_(\d{4})(?:_(\d))?/)
    if (match) {
      const year = match[1]
      const subPeriod = match[2]
      return subPeriod ? `${year}.${subPeriod}` : year
    }
    return null
  }

  /**
   * Extrai especialidade normalizada
   */
  const getSpecialty = (station) => {
    const especialidade = station.especialidade || ''
    const normalized = normalizeText(especialidade)

    if (normalized.includes('clinica') && normalized.includes('medica')) return 'clinica-medica'
    if (normalized.includes('cirurgia')) return 'cirurgia'
    if (normalized.includes('ginecologia') || normalized.includes('obstetricia') || normalized.includes('go')) return 'ginecologia'
    if (normalized.includes('pediatria')) return 'pediatria'
    if (normalized.includes('preventiva') || normalized.includes('familia') || normalized.includes('comunidade')) return 'preventiva'
    if (normalized.includes('procedimento')) return 'procedimentos'

    return 'geral'
  }

  /**
   * Extrai especialidade do Revalida Fácil
   */
  const getRevalidaFacilSpecialty = (station) => {
    const idEstacao = station.idEstacao || ''
    const normalized = normalizeText(idEstacao)

    if (normalized.includes('clinica_medica')) return 'clinica-medica'
    if (normalized.includes('cirurgia')) return 'cirurgia'
    if (normalized.includes('pediatria')) return 'pediatria'
    if (normalized.includes('go')) return 'ginecologia'
    if (normalized.includes('preventiva')) return 'preventiva'
    if (normalized.includes('procedimentos')) return 'procedimentos'

    return getSpecialty(station)
  }

  /**
   * Limpa título da estação - VERSÃO SIMPLIFICADA
   */
  const cleanStationTitleCache = new Map()
  
  const getCleanStationTitle = (originalTitle) => {
    if (!originalTitle) return 'Estação sem título'
    
    // Check cache first
    if (cleanStationTitleCache.has(originalTitle)) {
      return cleanStationTitleCache.get(originalTitle)
    }

    // Simplificar regex - usar apenas os necessários
    let clean = originalTitle
      .replace(/^(INEP|REVALIDA)[\s_-]+/i, '')
      .replace(/^\d{4}[.\s]+/i, '')
      .replace(/^(CM|CR|PED|GO|PREV)[\s-]+/i, '')
      .trim()

    // Capitalizar primeira letra
    if (clean.length > 0) {
      clean = clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase()
    }

    // Cache result
    cleanStationTitleCache.set(originalTitle, clean)
    return clean
  }

  /**
   * OTIMIZAÇÃO PRINCIPAL: Um único computed que agrupa TUDO
   * Elimina múltiplos filtros redundantes
   */
  const groupedStations = computed(() => {
    if (!stations.value || !Array.isArray(stations.value)) {
      return {
        all: [],
        filtered: [],
        inep: {},
        revalidaFacil: {
          'clinica-medica': [],
          'cirurgia': [],
          'pediatria': [],
          'ginecologia': [],
          'preventiva': [],
          'procedimentos': []
        }
      }
    }

    // Aplicar busca global se houver
    const query = debouncedSearchQuery.value.trim()
    const normalizedQuery = query ? normalizeText(query) : ''
    
    const result = {
      all: stations.value,
      filtered: [],
      inep: {},
      revalidaFacil: {
        'clinica-medica': [],
        'cirurgia': [],
        'pediatria': [],
        'ginecologia': [],
        'preventiva': [],
        'procedimentos': []
      }
    }

    // Um único loop para processar TUDO
    for (const station of stations.value) {
      // Adicionar título limpo ao objeto station (cache inline)
      if (!station.cleanTitle) {
        station.cleanTitle = getCleanStationTitle(station.tituloEstacao)
      }

      // Filtro de busca global
      let matchesSearch = true
      if (normalizedQuery) {
        const title = normalizeText(station.cleanTitle)
        const specialty = normalizeText(station.especialidade || '')
        const idEstacao = normalizeText(station.idEstacao || '')
        
        matchesSearch = title.includes(normalizedQuery) ||
                       specialty.includes(normalizedQuery) ||
                       idEstacao.includes(normalizedQuery)
      }

      if (!matchesSearch) continue
      
      result.filtered.push(station)

      // Classificar por tipo
      if (isINEPStation(station)) {
        const period = getINEPPeriod(station)
        if (period) {
          if (!result.inep[period]) {
            result.inep[period] = []
          }
          result.inep[period].push(station)
        }
      } else if (isRevalidaFacilStation(station)) {
        const specialty = getRevalidaFacilSpecialty(station)
        if (result.revalidaFacil[specialty]) {
          result.revalidaFacil[specialty].push(station)
        }
      }
    }

    return result
  })

  // Computed properties derivadas do groupedStations
  const filteredStations = computed(() => groupedStations.value.filtered)
  
  const filteredINEPStations = computed(() => {
    const inepGroups = groupedStations.value.inep
    return Object.values(inepGroups).flat()
  })

  const filteredRevalidaFacilStations = computed(() => {
    const rfGroups = groupedStations.value.revalidaFacil
    return Object.values(rfGroups).flat()
  })

  // Especialidades do Revalida Fácil
  const filteredStationsRevalidaFacilClinicaMedica = computed(() => 
    groupedStations.value.revalidaFacil['clinica-medica']
  )
  
  const filteredStationsRevalidaFacilCirurgia = computed(() => 
    groupedStations.value.revalidaFacil['cirurgia']
  )
  
  const filteredStationsRevalidaFacilPediatria = computed(() => 
    groupedStations.value.revalidaFacil['pediatria']
  )
  
  const filteredStationsRevalidaFacilGO = computed(() => 
    groupedStations.value.revalidaFacil['ginecologia']
  )
  
  const filteredStationsRevalidaFacilPreventiva = computed(() => 
    groupedStations.value.revalidaFacil['preventiva']
  )
  
  const filteredStationsRevalidaFacilProcedimentos = computed(() => 
    groupedStations.value.revalidaFacil['procedimentos']
  )

  // Períodos INEP
  const filteredStationsByInepPeriod = computed(() => groupedStations.value.inep)

  // Autocomplete items para busca global
  const globalAutocompleteItems = computed(() => {
    // Usar Map para garantir unicidade por ID
    const uniqueStationsMap = new Map()
    
    filteredStations.value.forEach(station => {
      const id = station.id || station.idEstacao
      if (id && !uniqueStationsMap.has(id)) {
        uniqueStationsMap.set(id, {
          title: station.cleanTitle || station.tituloEstacao,
          value: id,
          subtitle: station.especialidade
        })
      }
    })
    
    return Array.from(uniqueStationsMap.values())
  })

  return {
    // State
    globalSearchQuery,
    
    // Helpers
    isINEPStation,
    isRevalidaFacilStation,
    getINEPPeriod,
    getSpecialty,
    getRevalidaFacilSpecialty,
    getCleanStationTitle,
    
    // Filtered data
    filteredStations,
    filteredINEPStations,
    filteredRevalidaFacilStations,
    filteredStationsRevalidaFacilClinicaMedica,
    filteredStationsRevalidaFacilCirurgia,
    filteredStationsRevalidaFacilPediatria,
    filteredStationsRevalidaFacilGO,
    filteredStationsRevalidaFacilPreventiva,
    filteredStationsRevalidaFacilProcedimentos,
    filteredStationsByInepPeriod,
    globalAutocompleteItems,
    
    // Acesso ao agrupamento principal (para debug)
    groupedStations
  }
}
