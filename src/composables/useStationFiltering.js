import { ref, computed } from 'vue'

/**
 * Composable para filtros e busca de estações
 * Extrai lógica de filtragem do StationList.vue
 */
export function useStationFiltering(stations) {
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
   * Limpa título da estação removendo prefixos redundantes
   */
  const getCleanStationTitle = (originalTitle) => {
    if (!originalTitle) return 'ESTAÇÃO SEM TÍTULO'

    let cleanTitle = originalTitle
      .replace(/^ESTAÇÃO\s+/i, '')
      .replace(/^ESTACAO\s+/i, '')
      .replace(/^E\.\s+/i, '')
      .replace(/^E\s+/i, '')
      .replace(/^\d+\s*[-–—]\s*/g, '')
      .replace(/^REVALIDA_FACIL_/i, '')
      .replace(/^REVALIDA_/i, '')
      .replace(/^INEP_/i, '')
      .replace(/_/g, ' ')
      .trim()

    if (!cleanTitle) return 'ESTAÇÃO SEM TÍTULO'

    cleanTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1)

    return cleanTitle
  }

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

    // Computed
    filteredStations,
    filteredINEPStations,
    filteredRevalidaFacilStations,
    filteredStations2024_2,
    filteredStationsRevalidaFacilClinicaMedica,
    filteredStationsRevalidaFacilCirurgia,
    filteredStationsRevalidaFacilPediatria,
    filteredStationsRevalidaFacilGO,
    filteredStationsRevalidaFacilPreventiva,
    filteredStationsRevalidaFacilProcedimentos
  }
}
