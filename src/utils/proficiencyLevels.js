const PROFICIENCY_LEVELS = [
  {
    key: 'chefe_clinica',
    label: 'Chefe de Clinica',
    min: 8.8,
    icon: 'ri-vip-crown-2-fill',
    color: 'deep-purple-accent-2'
  },
  {
    key: 'preceptor',
    label: 'Preceptor',
    min: 7.5,
    icon: 'ri-user-star-fill',
    color: 'amber-darken-2'
  },
  {
    key: 'residente',
    label: 'Residente',
    min: 6.0,
    icon: 'ri-stethoscope-line',
    color: 'teal-darken-1'
  },
  {
    key: 'especializando',
    label: 'Especializando',
    min: 4.5,
    icon: 'ri-flask-line',
    color: 'primary'
  },
  {
    key: 'interno',
    label: 'Interno',
    min: 2.5,
    icon: 'ri-user-heart-line',
    color: 'indigo-lighten-1'
  },
  {
    key: 'academico',
    label: 'Academico',
    min: 0,
    icon: 'ri-book-open-line',
    color: 'blue-grey-darken-1'
  }
]

const STATION_DIFFICULTY_LEVELS = [
  {
    key: 'muito_facil',
    label: 'Muito Facil',
    min: 8.5,
    icon: 'ri-emoji-sticker-line',
    color: 'success'
  },
  {
    key: 'facil',
    label: 'Facil',
    min: 7.0,
    icon: 'ri-thumb-up-line',
    color: 'success-darken-1'
  },
  {
    key: 'moderada',
    label: 'Moderada',
    min: 5.5,
    icon: 'ri-equalizer-line',
    color: 'info'
  },
  {
    key: 'complexa',
    label: 'Complexa',
    min: 4.5,
    icon: 'ri-alert-line',
    color: 'warning'
  },
  {
    key: 'critica',
    label: 'Critica',
    min: 3.5,
    icon: 'ri-alert-triangle-line',
    color: 'error'
  },
  {
    key: 'emergencial',
    label: 'Emergencial',
    min: 0,
    icon: 'ri-skull-line',
    color: 'error-darken-2'
  }
]

function normalizeKey(value) {
  if (!value) return ''
  return value.toString().toLowerCase().replace(/\s+/g, '_')
}

function findProficiencyByKeyOrLabel(key, label) {
  const normalizedKey = normalizeKey(key)
  const normalizedLabel = normalizeKey(label)

  return (
    PROFICIENCY_LEVELS.find(level => normalizeKey(level.key) === normalizedKey) ||
    PROFICIENCY_LEVELS.find(level => normalizeKey(level.label) === normalizedLabel) ||
    null
  )
}

function findDifficultyByKeyOrLabel(key, label) {
  const normalizedKey = normalizeKey(key)
  const normalizedLabel = normalizeKey(label)

  return (
    STATION_DIFFICULTY_LEVELS.find(level => normalizeKey(level.key) === normalizedKey) ||
    STATION_DIFFICULTY_LEVELS.find(level => normalizeKey(level.label) === normalizedLabel) ||
    null
  )
}

export function getProficiencyByScore(score, explicitKey, explicitLabel) {
  const explicit = findProficiencyByKeyOrLabel(explicitKey, explicitLabel)
  if (explicit) return explicit

  const numericScore = Number.isFinite(score) ? score : 0
  return PROFICIENCY_LEVELS.find(level => numericScore >= level.min) || PROFICIENCY_LEVELS[PROFICIENCY_LEVELS.length - 1]
}

export function getProficiencyMetadata({ score = 0, key, label } = {}) {
  const base = getProficiencyByScore(score, key, label)
  return {
    ...base,
    score
  }
}

export function getDifficultyByScore(score, explicitKey, explicitLabel) {
  const explicit = findDifficultyByKeyOrLabel(explicitKey, explicitLabel)
  if (explicit) return explicit

  const numericScore = Number.isFinite(score) ? score : 0
  return STATION_DIFFICULTY_LEVELS.find(level => numericScore >= level.min) || STATION_DIFFICULTY_LEVELS[STATION_DIFFICULTY_LEVELS.length - 1]
}

export function getDifficultyMetadata({ score = 0, key, label } = {}) {
  const base = getDifficultyByScore(score, key, label)
  return {
    ...base,
    score
  }
}

export function calculateRankingScore(totalStations, averageScore) {
  const stationFactor = Number(totalStations || 0) * 4
  const averageFactor = Number(averageScore || 0) * 10
  return Math.max(0, Math.round(stationFactor + averageFactor))
}

export function getProficiencyFromUser(user) {
  if (!user) return getProficiencyMetadata({ score: 0 })

  const score = Number.isFinite(user?.nivelHabilidade)
    ? user.nivelHabilidade
    : Number(user?.statistics?.geral?.mediaNotas) || 0

  return getProficiencyMetadata({
    score,
    key: user?.nivelProficienciaKey,
    label: user?.nivelProficiencia
  })
}

export {
  PROFICIENCY_LEVELS,
  STATION_DIFFICULTY_LEVELS
}
