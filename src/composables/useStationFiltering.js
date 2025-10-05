import { ref, computed } from 'vue'
import { useStationCache } from './useStationCache'

/**
 * Composable para filtros e busca de estações
 * Consolida toda lógica de filtragem, normalização e limpeza de títulos
 */
export function useStationFiltering(stations) {
  const { memoize } = useStationCache()

  // --- State ---
  const globalSearchQuery = ref('')

  // --- Helpers ---

  /**
   * Normaliza texto removendo acentos, convertendo para minúsculas e removendo espaços extras
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
   * Extrai período do INEP (ex: 2025.1, 2024.2)
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
   * Limpa título da estação removendo prefixos redundantes (VERSÃO ROBUSTA)
   * Implementa a mesma lógica complexa do StationList.vue original
   */
  const getCleanStationTitleImpl = (originalTitle) => {
    if (!originalTitle) return 'ESTAÇÃO SEM TÍTULO'

    let cleanTitle = originalTitle

    // Remover prefixos INEP 2024.2
    cleanTitle = cleanTitle.replace(/^INEP\s*2024\.2[\s\:\-]*\/?/gi, '')
    cleanTitle = cleanTitle.replace(/INEP\s*2024\.2[\s\:\-]*\/?/gi, '')

    // Remover prefixos REVALIDA
    cleanTitle = cleanTitle.replace(/^REVALIDA[\s\:\-]*\/?/gi, '')
    cleanTitle = cleanTitle.replace(/^REVALIDA\s*F[AÁ]CIL\s*[\-\:\s]+/i, '')
    cleanTitle = cleanTitle.replace(/^REVALIDAFACIL\s*[\-\:\s]+/i, '')

    // Remover prefixos de estação e especialidades
    cleanTitle = cleanTitle.replace(/^(ESTAÇÃO\s+|CLINICA\s*MEDICA\s+|CLÍNICA\s*MÉDICA\s+|CIRURGIA\s+|PEDIATRIA\s+|PREVENTIVA\s+|GINECOLOGIA\s+|OBSTETRICIA\s+|G\.O\s+|GO\s+|\d{4}\.\d\s+|\d{4}\s+|\d+\s*[\-\|\:]\s*)/gi, '')

    // Remover códigos de especialidade em parênteses/colchetes
    cleanTitle = cleanTitle.replace(/\s*[\(\[\-]\s*(CM|CR|PED|G\.O|GO|PREV|GERAL)\s*[\)\]\-]\s*/gi, ' ')
    cleanTitle = cleanTitle.replace(/\s+\-\s+(CM|CR|PED|G\.O|GO|PREV|GERAL)\s*/gi, ' ')
    cleanTitle = cleanTitle.replace(/\s+(CM|CR|PED|G\.O|GO|PREV|GERAL)(?=\s|$|[\-\:\.])/gi, ' ')
    cleanTitle = cleanTitle.replace(/^(CM|CR|PED|G\.O|GO|PREV|GERAL)(?=\s|$|[\-\:\.])/gi, '')

    // Remover caracteres especiais no início
    cleanTitle = cleanTitle.replace(/^[\s\-\:\|\.\\_]*/, '')
    cleanTitle = cleanTitle.replace(/^[^a-zA-ZÀ-ÿ]*([a-zA-ZÀ-ÿ].*)$/, '$1')
    cleanTitle = cleanTitle.trim()

    // Fallback se resultado for muito curto
    if (!cleanTitle || cleanTitle.length < 2) {
      let fallback = originalTitle
        .replace(/INEP\s*2024\.2[\s\:\-]*\/?/gi, '')
        .replace(/Clínica Médica|Clinica Medica/gi, '')
        .replace(/Cirurgia Geral|Cirurgia/gi, '')
        .replace(/Pediatria/gi, '')
        .replace(/Ginecologia e Obstetrícia|Ginecologia E Obstetricia/gi, '')
        .replace(/Medicina da Família|Medicina De Familia/gi, '')
        .replace(/(CM|CR|PED|G\.O|GO|PREV|GERAL)(?=\s|$|[\s\:\-]+)/gi, '')
        .replace(/[\s\-\:\s]{2,}/g, ' ')
        .trim()

      return fallback || originalTitle
    }

    // Capitalizar primeira letra de cada palavra
    cleanTitle = cleanTitle.toLowerCase().split(' ').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')

    return cleanTitle
  }

  // Memoizar getCleanStationTitle
  const getCleanStationTitle = memoize(
    getCleanStationTitleImpl,
    (originalTitle) => originalTitle || 'EMPTY'
  )

  // --- Computed: Filtros principais ---

  /**
   * Estações filtradas pela busca global
   */
  const filteredStations = computed(() => {
    if (!stations.value || !Array.isArray(stations.value)) return []

    const query = globalSearchQuery.value
    if (!query || query.trim() === '') return stations.value

    const normalizedQuery = normalizeText(query)

    return stations.value.filter(station => {
      const title = normalizeText(getCleanStationTitle(station.tituloEstacao))
      const specialty = normalizeText(station.especialidade || '')
      const idEstacao = normalizeText(station.idEstacao || '')

      return title.includes(normalizedQuery) ||
             specialty.includes(normalizedQuery) ||
             idEstacao.includes(normalizedQuery)
    })
  })

  /**
   * Estações do INEP (Provas Anteriores)
   */
  const filteredINEPStations = computed(() => {
    return filteredStations.value.filter(isINEPStation)
  })

  /**
   * Estações do Revalida Fácil
   */
  const filteredRevalidaFacilStations = computed(() => {
    return filteredStations.value.filter(isRevalidaFacilStation)
  })

  // --- Computed: Categorização INEP ---

  /**
   * Estações INEP 2024.2
   */
  const filteredStations2024_2 = computed(() => {
    return filteredINEPStations.value
      .filter(station => getINEPPeriod(station) === '2024.2')
      .sort((a, b) => (a.numeroDaEstacao || 0) - (b.numeroDaEstacao || 0))
  })

  // --- Computed: Categorização Revalida Fácil por especialidade ---

  /**
   * Revalida Fácil - Clínica Médica
   */
  const filteredStationsRevalidaFacilClinicaMedica = computed(() => {
    return filteredRevalidaFacilStations.value
      .filter(station => getRevalidaFacilSpecialty(station).includes('clinica-medica'))
      .sort((a, b) => getCleanStationTitle(a.tituloEstacao).localeCompare(
        getCleanStationTitle(b.tituloEstacao), 'pt-BR', { numeric: true }
      ))
  })

  /**
   * Revalida Fácil - Cirurgia
   */
  const filteredStationsRevalidaFacilCirurgia = computed(() => {
    return filteredRevalidaFacilStations.value
      .filter(station => getRevalidaFacilSpecialty(station).includes('cirurgia'))
      .sort((a, b) => getCleanStationTitle(a.tituloEstacao).localeCompare(
        getCleanStationTitle(b.tituloEstacao), 'pt-BR', { numeric: true }
      ))
  })

  /**
   * Revalida Fácil - Pediatria
   */
  const filteredStationsRevalidaFacilPediatria = computed(() => {
    return filteredRevalidaFacilStations.value
      .filter(station => getRevalidaFacilSpecialty(station).includes('pediatria'))
      .sort((a, b) => getCleanStationTitle(a.tituloEstacao).localeCompare(
        getCleanStationTitle(b.tituloEstacao), 'pt-BR', { numeric: true }
      ))
  })

  /**
   * Revalida Fácil - Ginecologia e Obstetrícia
   */
  const filteredStationsRevalidaFacilGO = computed(() => {
    return filteredRevalidaFacilStations.value
      .filter(station => getRevalidaFacilSpecialty(station).includes('ginecologia'))
      .sort((a, b) => getCleanStationTitle(a.tituloEstacao).localeCompare(
        getCleanStationTitle(b.tituloEstacao), 'pt-BR', { numeric: true }
      ))
  })

  /**
   * Revalida Fácil - Preventiva
   */
  const filteredStationsRevalidaFacilPreventiva = computed(() => {
    return filteredRevalidaFacilStations.value
      .filter(station => getRevalidaFacilSpecialty(station).includes('preventiva'))
      .sort((a, b) => getCleanStationTitle(a.tituloEstacao).localeCompare(
        getCleanStationTitle(b.tituloEstacao), 'pt-BR', { numeric: true }
      ))
  })

  /**
   * Revalida Fácil - Procedimentos
   */
  const filteredStationsRevalidaFacilProcedimentos = computed(() => {
    return filteredRevalidaFacilStations.value
      .filter(station => getRevalidaFacilSpecialty(station).includes('procedimentos'))
      .sort((a, b) => getCleanStationTitle(a.tituloEstacao).localeCompare(
        getCleanStationTitle(b.tituloEstacao), 'pt-BR', { numeric: true }
      ))
  })

  // --- Computed: Agrupamento por período INEP ---

  /**
   * Agrupa estações INEP por período (2025.1, 2024.2, etc)
   */
  const stationsByInepPeriod = computed(() => {
    const grouped = {}
    const inepStations = filteredINEPStations.value

    for (const station of inepStations) {
      const period = getINEPPeriod(station)
      if (period) {
        if (!grouped[period]) {
          grouped[period] = []
        }
        grouped[period].push(station)
      }
    }

    // Ordenar estações dentro de cada período
    for (const period in grouped) {
      grouped[period].sort((a, b) =>
        getCleanStationTitle(a.tituloEstacao).localeCompare(getCleanStationTitle(b.tituloEstacao), 'pt-BR', { numeric: true })
      )
    }

    return grouped
  })

  /**
   * Agrupa estações INEP filtradas por período (para uso com busca global)
   */
  const filteredStationsByInepPeriod = computed(() => {
    const grouped = {}
    const inepStations = filteredINEPStations.value

    // Função para extrair o número da estação do ID
    const getStationNumber = (stationId) => {
      const match = stationId.match(/EST(\d+)/)
      return match ? parseInt(match[1], 10) : 999
    }

    for (const station of inepStations) {
      const period = getINEPPeriod(station)
      if (period) {
        if (!grouped[period]) {
          grouped[period] = []
        }
        grouped[period].push(station)
      }
    }

    // Ordenar estações dentro de cada período
    for (const period in grouped) {
      grouped[period].sort((a, b) => {
        const numA = getStationNumber(a.idEstacao || a.id || '')
        const numB = getStationNumber(b.idEstacao || b.id || '')

        if (numA !== numB) {
          return numA - numB
        }

        return getCleanStationTitle(a.tituloEstacao).localeCompare(getCleanStationTitle(b.tituloEstacao), 'pt-BR', { numeric: true })
      })
    }

    return grouped
  })

  // --- Computed: Autocomplete global ---

  /**
   * Items para autocomplete de busca global
   * Retorna lista formatada com ícones, chips e metadados
   */
  const globalAutocompleteItems = computed(() => {
    if (!stations.value) return []

    const searchQuery = globalSearchQuery.value?.trim().toLowerCase() || ''
    if (searchQuery.length < 2) return []

    return stations.value
      .filter(station => {
        const title = getCleanStationTitle(station.tituloEstacao).toLowerCase()
        const especialidade = (station.especialidade || '').toLowerCase()
        const area = (station.area || '').toLowerCase()
        return title.includes(searchQuery) || especialidade.includes(searchQuery) || area.includes(searchQuery)
      })
      .map(station => {
        const cleanTitle = getCleanStationTitle(station.tituloEstacao)
        const isINEP = isINEPStation(station)

        const specialty = station.especialidade || station.area || ''
        let subsectionChips = []
        let chipColor = 'primary'

        if (isINEP) {
          const period = getINEPPeriod(station)
          if (period) {
            subsectionChips.push(`INEP ${period}`)
          }
          if (specialty) {
            subsectionChips.push(specialty.toUpperCase())
          }
          chipColor = 'primary'
        } else {
          const specialtyNormalized = getRevalidaFacilSpecialty(station)
          const specialtyConfig = {
            'clinica-medica': { label: 'CLÍNICA MÉDICA', color: 'info' },
            'cirurgia': { label: 'CIRURGIA', color: 'primary' },
            'pediatria': { label: 'PEDIATRIA', color: 'success' },
            'ginecologia': { label: 'GINECOLOGIA E OBSTETRÍCIA', color: 'error' },
            'preventiva': { label: 'PREVENTIVA', color: 'warning' },
            'procedimentos': { label: 'PROCEDIMENTOS', color: '#A52A2A' },
            'geral': { label: 'GERAL', color: 'success' }
          }
          const config = specialtyConfig[specialtyNormalized] || { label: specialtyNormalized || '', color: 'success' }
          if (config.label) {
            subsectionChips.push(config.label)
            chipColor = config.color
          }
        }

        return {
          id: station.id,
          title: cleanTitle,
          subtitle: `${cleanTitle} - ${specialty}`,
          fullName: `${cleanTitle} - ${specialty}`,
          subsectionChips: subsectionChips,
          iconImage: isINEP ? '/inep.png' : '/botaosemfundo.png',
          isINEP: isINEP,
          color: chipColor
        }
      })
      .slice(0, 50) // Limitar a 50 resultados
  })

  // --- Return ---
  return {
    // State
    globalSearchQuery,

    // Helpers
    normalizeText,
    isINEPStation,
    isRevalidaFacilStation,
    getINEPPeriod,
    getSpecialty,
    getRevalidaFacilSpecialty,
    getCleanStationTitle,

    // Computed - Filtros
    filteredStations,
    filteredINEPStations,
    filteredRevalidaFacilStations,
    filteredStations2024_2,
    filteredStationsRevalidaFacilClinicaMedica,
    filteredStationsRevalidaFacilCirurgia,
    filteredStationsRevalidaFacilPediatria,
    filteredStationsRevalidaFacilGO,
    filteredStationsRevalidaFacilPreventiva,
    filteredStationsRevalidaFacilProcedimentos,

    // Computed - Agrupamento
    stationsByInepPeriod,
    filteredStationsByInepPeriod,

    // Computed - Autocomplete
    globalAutocompleteItems
  }
}
