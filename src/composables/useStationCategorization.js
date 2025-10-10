import { useTheme } from 'vuetify'
import { useStationCache } from './useStationCache'

/**
 * Composable para categorização e cores de especialidades
 * Consolida toda a lógica de categorização, keyword matching e cores das estações
 */
export function useStationCategorization() {
  const theme = useTheme()
  const { memoize } = useStationCache()

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

  // --- Mapa de áreas completo ---
  const areas = {
    'clinica-medica': { name: 'CM', fullName: 'Clínica Médica', icon: '🩺' },
    'cirurgia': { name: 'CR', fullName: 'Cirurgia', icon: '🔪' },
    'pediatria': { name: 'PED', fullName: 'Pediatria', icon: '👶' },
    'ginecologia': { name: 'G.O', fullName: 'Ginecologia e Obstetrícia', icon: '👩‍⚕️' },
    'preventiva': { name: 'PREV', fullName: 'Preventiva', icon: '🛡️' },
    'procedimentos': { name: 'PROC', fullName: 'Procedimentos', icon: '🛠️' },
    'geral': { name: 'GERAL', fullName: 'Medicina Geral', icon: '🏥' }
  }

  // --- Keywords para matching de especialidades ---
  const keywords = {
    'clinica-medica': [
      'clinica medica', 'medicina interna', 'cm', 'clinica', 'medicina clinica',
      'avc', 'acidente vascular cerebral', 'infarto', 'iam', 'miocardio', 'diabetes', 'hipertensao', 'hipertensao arterial',
      'ulcera peptica', 'hemorragia digestiva', 'dengue', 'malaria', 'tuberculose', 'tbc',
      'pneumonia', 'bronquite', 'asma', 'dpoc', 'insuficiencia cardiaca', 'icc',
      'arritmia', 'fibrilacao', 'angina', 'embolia', 'trombose', 'neurologia', 'emergencia clinica',
      'enfarte', 'cardiopatia', 'nefropatia', 'hepatopatia', 'gastrite', 'artrite', 'artrose',
      'lupus', 'hipotireoidismo', 'hipertireoidismo', 'anemia', 'leucemia', 'linfoma',
      'internacao', 'enfermaria', 'ambulatorio', 'consulta', 'isquemico', 'cronico'
    ],
    'cirurgia': [
      'cirurgia', 'cirurgica', 'cr', 'trauma', 'operatoria', 'procedimento cirurgico', 'cirurgia geral',
      'trauma abdominal', 'trauma fechado', 'trauma craniano', 'ulcera peptica perfurada', 'ruptura esplenica',
      'oclusao arterial', 'laparotomia', 'apendicectomia', 'colecistectomia', 'herniorrafia',
      'drenagem', 'sutura', 'urologia', 'ortopedia', 'neurocirurgia',
      'abdome agudo', 'hemorragia interna', 'perfuracao', 'obstrucao intestinal', 'perfurada',
      'politraumatismo', 'fraturas', 'luxacao', 'ferimento', 'corte', 'queimadura',
      'apendicite', 'colecistite', 'pancreatite', 'peritonite', 'hernia'
    ],
    'pediatria': [
      'pediatria', 'pediatrica', 'infantil', 'crianca', 'ped', 'neonatal', 'lactente', 'neonato',
      'puericultura', 'adolescente', 'escolar', 'pre escolar', 'meses', 'anos', 'recem nascido',
      'criptorquidia', 'fimose', 'pressao arterial crianca', 'vacinacao infantil', 'imunizacao',
      'crescimento', 'desenvolvimento', 'aleitamento', 'diarreia infantil', 'gastroenterite',
      'desidratacao', 'febre crianca', 'convulsao febril', 'aferição pediatrica', 'consulta pediatrica',
      'bronquiolite', 'asma infantil', 'pneumonia pediatrica', 'otite', 'faringite',
      'lactante', 'escolar', 'adolescencia', 'puberdade', 'menor', 'criancas'
    ],
    'ginecologia': [
      'ginecologia', 'ginecologica', 'obstetricia', 'obstetrica', 'go', 'g.o', 'ginecoobstetricia',
      'mulher', 'gestante', 'gravida', 'gravidez', 'gestacao', 'obstetrico',
      'pre natal', 'prenatal', 'pielonefrite gestante', 'emergencia obstetrica', 'eclampsia', 'pre eclampsia',
      'sangramento gestacao', 'parto', 'puerpera', 'puerperio', 'amamentacao', 'lactacao',
      'trabalho de parto', 'cesariana', 'cesarea', 'forceps', 'episiotomia',
      'violencia sexual', 'doenca inflamatoria pelvica', 'dip', 'dst', 'corrimento vaginal',
      'cancer colo', 'cancer cervical', 'papanicolaou', 'mama', 'contraceptivo', 'menopausa',
      'ciclo menstrual', 'menstruacao', 'amenorreia', 'dismenorreia', 'endometriose',
      'ovario', 'utero', 'cervix', 'vagina', 'vulva', 'pelvica', 'ginecologico'
    ],
    'preventiva': [
      'preventiva', 'medicina preventiva', 'medicina da familia', 'medicina de familia', 'mfc',
      'familia', 'coletiva', 'saude publica', 'saude coletiva', 'epidemiologia', 'prevencao', 'promocao',
      'medicina comunitaria', 'atencao basica', 'atencao primaria', 'aps', 'sus',
      'tuberculose', 'tbc', 'hiv', 'aids', 'coinfeccao', 'lagarta', 'erucismo', 'infectologia',
      'vacinacao', 'imunizacao', 'vigilancia epidemiologica', 'notificacao compulsoria',
      'saneamento', 'agua', 'esgoto', 'zoonose', 'endemias', 'comunidade', 'populacional',
      'educacao em saude', 'promocao da saude', 'prevencao primaria', 'prevencao secundaria',
      'rastreamento', 'screening', 'deteccao precoce', 'programa de saude',
      'hanseniase', 'chagas', 'esquistossomose', 'malaria', 'dengue', 'zika', 'chikungunya',
      'hepatite', 'sifilis', 'gonorreia', 'clamydia'
    ]
  }

  /**
   * Helper para matching de keywords
   */
  const matchesKeywords = (text, keywordList) => {
    if (!text) return false
    return keywordList.some(keyword => {
      if (text.includes(keyword)) {
        return true
      }
      const keywordWords = keyword.split(/\s+/)
      if (keywordWords.length > 1) {
        const allWordsMatch = keywordWords.every(word => text.includes(word))
        if (allWordsMatch) {
          return true
        }
      }
      return false
    })
  }

  /**
   * Função principal para determinar a área da estação
   * Usa keyword matching em especialidade e título
   * @param {Object} station - Objeto da estação
   * @returns {Object} - { key, name, fullName, icon }
   */
  const getStationAreaImpl = (station) => {
    if (!station) return { key: 'geral', ...areas.geral }

    // Para estações INEP e Revalida Fácil, usar lógica simplificada baseada em idEstacao
    const idEstacao = station.idEstacao || ''
    if (idEstacao.includes('INEP_') || idEstacao.includes('REVALIDA_FACIL_')) {
      if (idEstacao.includes('CLINICA_MEDICA')) return { key: 'clinica-medica', ...areas['clinica-medica'] }
      if (idEstacao.includes('CIRURGIA')) return { key: 'cirurgia', ...areas['cirurgia'] }
      if (idEstacao.includes('PEDIATRIA')) return { key: 'pediatria', ...areas['pediatria'] }
      if (idEstacao.includes('GO')) return { key: 'ginecologia', ...areas['ginecologia'] }
      if (idEstacao.includes('PREVENTIVA')) return { key: 'preventiva', ...areas['preventiva'] }
      if (idEstacao.includes('PROCEDIMENTOS')) return { key: 'procedimentos', ...areas['procedimentos'] }
    }

    // Processar especialidade e título
    const especialidadeRaw = (station.especialidade || '').toLowerCase()
    const titulo = (station.tituloEstacao || '').toLowerCase()

    const especialidades = especialidadeRaw
      .split(/[\/,;\-\s]+/)
      .map(e => e.trim())
      .filter(e => e.length > 0)
      .map(e => e.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))

    const tituloNormalizado = titulo
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    let key = 'geral'

    // Primeiro: tentar match na especialidade
    for (const [areaKey, keywordList] of Object.entries(keywords)) {
      const especialidadeMatch = especialidades.some(esp => matchesKeywords(esp, keywordList))
      if (especialidadeMatch) {
        key = areaKey
        break
      }
    }

    // Se não encontrou, tentar match no título
    if (key === 'geral') {
      for (const [areaKey, keywordList] of Object.entries(keywords)) {
        const tituloMatch = matchesKeywords(tituloNormalizado, keywordList)
        if (tituloMatch) {
          key = areaKey
          break
        }
      }
    }

    // Fallbacks finais baseados em padrões comuns
    if (key === 'geral') {
      const tituloOriginal = (station.tituloEstacao || '').toLowerCase()
      if (tituloOriginal.includes('pre-natal') || tituloOriginal.includes('prenatal') ||
        tituloOriginal.includes('parto') || tituloOriginal.includes('gestante')) {
        key = 'ginecologia'
      } else if (tituloOriginal.includes('crianca') || tituloOriginal.includes('pediatrica') ||
        tituloOriginal.includes('lactente') || tituloOriginal.includes('infantil')) {
        key = 'pediatria'
      } else if (tituloOriginal.includes('trauma') || tituloOriginal.includes('cirurgica') ||
        tituloOriginal.includes('operacao') || tituloOriginal.includes('procedimento cirurgico')) {
        key = 'cirurgia'
      } else if (tituloOriginal.includes('prevencao') || tituloOriginal.includes('sus') ||
        tituloOriginal.includes('atencao basica') || tituloOriginal.includes('familia')) {
        key = 'preventiva'
      }
    }

    return { key, ...areas[key] }
  }

  // Memoizar getStationArea
  const getStationArea = memoize(
    getStationAreaImpl,
    (station) => `${station.id}_${station.especialidade || ''}_${station.tituloEstacao || ''}`
  )

  /**
   * Obtém cor da especialidade com suporte a tema claro/escuro
   * @param {Object} station - Estação
   * @param {String} specificSpecialty - Especialidade específica (opcional)
   * @returns {String} - Cor hexadecimal
   */
  const getSpecialtyColorImpl = (station, specificSpecialty = null) => {
    const isDarkTheme = theme.global.current.value.dark

    const lightColors = {
      'clinica-medica': '#00BFFF',
      'cirurgia': '#000080',
      'pediatria': '#008000',
      'ginecologia': '#FF1493',
      'preventiva': '#FF4500',
      'procedimentos': '#6A0DAD',
      'geral': '#2F4F4F'
    }

    const darkColors = {
      'clinica-medica': '#00CED1',
      'cirurgia': '#4169E1',
      'pediatria': '#32CD32',
      'ginecologia': '#FF69B4',
      'preventiva': '#FFA500',
      'procedimentos': '#9370DB',
      'geral': '#708090'
    }

    const colors = isDarkTheme ? darkColors : lightColors

    if (specificSpecialty) {
      return colors[specificSpecialty] || colors.geral
    }

    const area = getStationArea(station)
    return colors[area.key] || colors.geral
  }

  // Memoizar getSpecialtyColor
  const getSpecialtyColor = memoize(
    getSpecialtyColorImpl,
    (station, specificSpecialty = null) => `${station.id}_${specificSpecialty || 'auto'}_${theme.global.current.value.dark ? 'dark' : 'light'}`
  )

  /**
   * Obtém opacidade do background baseado no tipo de estação
   */
  const getBackgroundOpacity = (station) => {
    const idEstacao = station.idEstacao || station.id || ''
    // Cores mais vivas para INEP
    if (idEstacao.includes('INEP_')) {
      return theme.global.current.value.dark ? '80' : '60'
    }
    // Opacidade original para Revalida Fácil
    return theme.global.current.value.dark ? '60' : '40'
  }

  /**
   * Obtém cor completa com opacidade para background
   */
  const getStationBackgroundColor = (station) => {
    const baseColor = getSpecialtyColor(station)
    const opacity = getBackgroundOpacity(station)
    return baseColor + opacity
  }

  // --- Mapa de cores por especialidade (para compatibilidade) ---
  const specialtyColorMap = {
    'clinica-medica': '#1976D2',
    'cirurgia': '#D32F2F',
    'ginecologia': '#E91E63',
    'pediatria': '#9C27B0',
    'preventiva': '#388E3C',
    'procedimentos': '#F57C00',
    'geral': '#616161'
  }

  return {
    // Constants
    areaOptions,
    specialtyColorMap,
    areas,
    keywords,

    // Methods
    getSpecialtyColor,
    getStationArea,
    getBackgroundOpacity,
    getStationBackgroundColor
  }
}
