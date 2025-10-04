import { computed } from 'vue'

/**
 * Composable para categorização e cores de especialidades
 * Extrai lógica de categorização do StationList.vue
 */
export function useStationCategorization() {

  // --- Opções de área para filtros ---
  const areaOptions = [
    { title: 'Clínica Médica', value: 'clinica-medica' },
    { title: 'Cirurgia', value: 'cirurgia' },
    { title: 'Ginecologia e Obstetrícia', value: 'ginecologia' },
    { title: 'Pediatria', value: 'pediatria' },
    { title: 'Medicina da Família e Comunidade (Preventiva)', value: 'preventiva' },
    { title: 'Procedimentos', value: 'procedimentos' },
    { title: 'Geral', value: 'geral' }
  ]

  // --- Mapa de cores por especialidade ---
  const specialtyColorMap = {
    'clinica-medica': '#1976D2',   // Azul
    'cirurgia': '#D32F2F',         // Vermelho
    'ginecologia': '#E91E63',      // Rosa
    'pediatria': '#9C27B0',        // Roxo
    'preventiva': '#388E3C',       // Verde
    'procedimentos': '#F57C00',    // Laranja
    'geral': '#616161'             // Cinza
  }

  /**
   * Obtém cor da especialidade
   */
  const getSpecialtyColor = (station) => {
    if (!station) return specialtyColorMap.geral

    const idEstacao = station.idEstacao || ''
    const especialidade = station.especialidade || ''

    // Priorizar idEstacao para Revalida Fácil
    if (idEstacao.includes('CLINICA_MEDICA')) return specialtyColorMap['clinica-medica']
    if (idEstacao.includes('CIRURGIA')) return specialtyColorMap['cirurgia']
    if (idEstacao.includes('PEDIATRIA')) return specialtyColorMap['pediatria']
    if (idEstacao.includes('GO')) return specialtyColorMap['ginecologia']
    if (idEstacao.includes('PREVENTIVA')) return specialtyColorMap['preventiva']
    if (idEstacao.includes('PROCEDIMENTOS')) return specialtyColorMap['procedimentos']

    // Fallback para campo especialidade
    const normalized = especialidade.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

    if (normalized.includes('clinica') && normalized.includes('medica')) return specialtyColorMap['clinica-medica']
    if (normalized.includes('cirurgia')) return specialtyColorMap['cirurgia']
    if (normalized.includes('ginecologia') || normalized.includes('obstetricia') || normalized.includes('go')) return specialtyColorMap['ginecologia']
    if (normalized.includes('pediatria')) return specialtyColorMap['pediatria']
    if (normalized.includes('preventiva') || normalized.includes('familia') || normalized.includes('comunidade')) return specialtyColorMap['preventiva']
    if (normalized.includes('procedimento')) return specialtyColorMap['procedimentos']

    return specialtyColorMap['geral']
  }

  /**
   * Obtém área da estação (retorna objeto com label e value)
   */
  const getStationArea = (station) => {
    const color = getSpecialtyColor(station)
    const area = Object.keys(specialtyColorMap).find(key => specialtyColorMap[key] === color) || 'geral'
    const areaOption = areaOptions.find(opt => opt.value === area)

    return {
      label: areaOption?.title || 'Geral',
      value: area,
      color: color
    }
  }

  /**
   * Obtém opacidade do background baseado no status de edição
   */
  const getBackgroundOpacity = (station) => {
    // Estações não editadas têm fundo mais transparente (10%)
    // Estações editadas têm fundo mais visível (25%)
    return station.hasBeenEdited === false ? '1A' : '40'  // 1A = 10%, 40 = 25% em hex
  }

  /**
   * Obtém cor completa com opacidade para background
   */
  const getStationBackgroundColor = (station) => {
    const baseColor = getSpecialtyColor(station)
    const opacity = getBackgroundOpacity(station)
    return baseColor + opacity
  }

  // --- Return ---
  return {
    // Constants
    areaOptions,
    specialtyColorMap,

    // Methods
    getSpecialtyColor,
    getStationArea,
    getBackgroundOpacity,
    getStationBackgroundColor
  }
}
