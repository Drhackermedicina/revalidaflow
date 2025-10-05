/**
 * useStationHelpers.js
 *
 * Composable com funções helper para formatação de dados de estações
 * Extrai funções utilitárias do StationList.vue
 */

/**
 * Formata data no padrão brasileiro (DD/MM/AAAA às HH:MM:SS)
 */
export function formatarDataBrasil(date) {
  if (!date) return 'Data não disponível'

  try {
    const dateObj = date instanceof Date ? date : (date.toDate ? date.toDate() : new Date(date))
    if (isNaN(dateObj.getTime())) {
      return 'Data inválida'
    }

    const dia = String(dateObj.getDate()).padStart(2, '0')
    const mes = String(dateObj.getMonth() + 1).padStart(2, '0')
    const ano = dateObj.getFullYear()
    const horas = String(dateObj.getHours()).padStart(2, '0')
    const minutos = String(dateObj.getMinutes()).padStart(2, '0')
    const segundos = String(dateObj.getSeconds()).padStart(2, '0')

    return `${dia}/${mes}/${ano} às ${horas}:${minutos}:${segundos}`
  } catch (error) {
    console.warn('❌ Erro ao formatar data:', error)
    return 'Erro na data'
  }
}

/**
 * Formata data da estação de forma relativa (hoje, ontem, X dias atrás)
 */
export function formatStationDate(station) {
  try {
    let date = null
    let label = ''

    if (station.criadoEmTimestamp) {
      date = station.criadoEmTimestamp.toDate ? station.criadoEmTimestamp.toDate() : new Date(station.criadoEmTimestamp)
      label = 'Criada'
    } else {
      date = new Date(station.idEstacao || station.id || '')
      label = 'Criada'
    }

    if (!date) return 'Data N/A'

    const now = new Date()
    const diffTime = Math.abs(now - date)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) {
      return `${label} hoje`
    } else if (diffDays === 2) {
      return `${label} ontem`
    } else if (diffDays <= 7) {
      return `${label} ${diffDays - 1}d atrás`
    } else {
      return `${label} ${date.toLocaleDateString('pt-BR')}`
    }
  } catch (error) {
    return 'Data inválida'
  }
}

/**
 * Determina dificuldade da estação baseado em score médio
 * @param {String} stationId - ID da estação
 * @param {Number} averageScore - Score médio (0-100)
 * @returns {Object} - { level, text, color, score }
 */
export function getStationDifficulty(stationId, averageScore = null) {
  let avgScore = averageScore

  if (avgScore === null) {
    // Gerar score baseado em hash do ID (fallback quando não há score real)
    const hash = stationId?.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0)
      return a & a
    }, 0) || 0
    avgScore = (Math.abs(hash) % 61) + 40 // Range: 40-100
  }

  const normalizedScore = avgScore / 10

  if (avgScore >= 80) {
    return { level: 1, text: 'Fácil', color: '#22c55e', score: normalizedScore.toFixed(1) }
  } else if (avgScore >= 60 && avgScore < 80) {
    return { level: 2, text: 'Moderado', color: '#f59e0b', score: normalizedScore.toFixed(1) }
  } else if (avgScore >= 40 && avgScore < 60) {
    return { level: 3, text: 'Difícil', color: '#ef4444', score: normalizedScore.toFixed(1) }
  } else {
    return { level: 4, text: 'Muito Difícil', color: '#dc2626', score: normalizedScore.toFixed(1) }
  }
}

/**
 * Gera score de usuário baseado em hash (para mock/demo)
 * @param {String} stationId - ID da estação
 * @param {String} userId - ID do usuário
 * @returns {Number} - Score gerado
 */
export function getUserScore(stationId, userId = 'anonymous') {
  const userHash = userId + stationId
  const hash = userHash.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0)
    return a & a
  }, 0) || 0
  return hash
}

/**
 * Extrai ano de uma estação INEP baseado no período
 */
export function getStationYear(station, getINEPPeriod) {
  const period = getINEPPeriod(station)
  if (!period) return 0

  // Extrair apenas o ano (ex: "2025.1" -> 2025, "2017" -> 2017)
  const yearMatch = period.match(/^(\d{4})/)
  return yearMatch ? parseInt(yearMatch[1], 10) : 0
}

/**
 * Exportação do composable completo
 */
export function useStationHelpers() {
  return {
    formatarDataBrasil,
    formatStationDate,
    getStationDifficulty,
    getUserScore,
    getStationYear
  }
}
