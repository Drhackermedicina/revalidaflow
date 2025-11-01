<script setup>
import { computed } from 'vue'

const props = defineProps({
  station: {
    type: Object,
    required: true
  },
  userScore: {
    type: Object,
    default: null
  },
  specialty: {
    type: String,
    default: null
  },
  showSequentialConfig: {
    type: Boolean,
    default: false
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  isInSequence: {
    type: Boolean,
    default: false
  },
  isCreatingSession: {
    type: Boolean,
    default: false
  },
  backgroundColor: {
    type: String,
    default: ''
  },
  showDetailedDates: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'click',
  'add-to-sequence',
  'remove-from-sequence',
  'edit-station'
])

// Detectar tema atual
const scoreColor = computed(() => {
  if (!props.userScore) return 'primary'
  if (props.userScore.percentage >= 70) return 'success'
  if (props.userScore.percentage >= 50) return 'warning'
  return 'error'
})

const cardClasses = computed(() => {
  return [
    'station-card',
    props.showSequentialConfig ? 'station-card--sequence' : '',
    props.showSequentialConfig && props.isInSequence ? 'station-card--selected' : '',
    props.isCreatingSession ? 'station-card--loading' : ''
  ].filter(Boolean)
})

const defaultAccent = { r: 102, g: 57, b: 186 }

const parseColor = color => {
  if (!color || typeof color !== 'string') return null
  const trimmed = color.trim()

  const hexMatch = trimmed.match(/^#([0-9a-fA-F]{3,8})$/)
  if (hexMatch) {
    let hex = hexMatch[1]
    if (hex.length === 3) {
      hex = hex.split('').map(ch => ch + ch).join('')
    } else if (hex.length === 4) {
      hex = hex.split('').map(ch => ch + ch).join('')
    }
    if (hex.length === 6) {
      hex += 'ff'
    }
    if (hex.length === 8) {
      const intVal = parseInt(hex, 16)
      return {
        r: (intVal >> 24) & 0xff,
        g: (intVal >> 16) & 0xff,
        b: (intVal >> 8) & 0xff
      }
    }
  }

  const rgbaMatch = trimmed.match(/^rgba?\(([^)]+)\)$/i)
  if (rgbaMatch) {
    const [r, g, b] = rgbaMatch[1].split(',').map(value => Number(value.trim()))
    if ([r, g, b].every(v => Number.isFinite(v))) {
      return { r, g, b }
    }
  }

  return null
}

const toRgba = (parsed, alpha) => {
  const base = parsed || defaultAccent
  return `rgba(${base.r}, ${base.g}, ${base.b}, ${alpha})`
}

const cardStyle = computed(() => {
  const parsed = parseColor(props.backgroundColor)
  return {
    '--station-accent-strong': toRgba(parsed, 0.22),
    '--station-accent-soft': toRgba(parsed, 0.12),
    '--station-accent-border': toRgba(parsed, 0.42)
  }
})

const toTitleCase = value => {
  if (!value || typeof value !== 'string') return ''
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, char => char.toUpperCase())
}

const stationSubtitle = computed(() => {
  if (props.showDetailedDates) return ''
  if (props.station?.descricaoCurta) return props.station.descricaoCurta
  if (props.station?.especialidade) return props.station.especialidade
  if (props.specialty) return toTitleCase(props.specialty)
  return ''
})

const extractKeywords = value => {
  if (!value) return []
  if (Array.isArray(value)) return value.filter(Boolean)
  if (typeof value === 'string') {
    return value
      .replace(/[\[\]]/g, '')
      .split(',')
      .map(keyword => keyword.replace(/['"]/g, '').trim())
      .filter(Boolean)
  }
  return []
}

const metaChips = computed(() => {
  const chips = []

  if (props.station?.especialidade) {
    chips.push({ icon: 'ri-stethoscope-line', label: props.station.especialidade })
  }

  const difficulty = props.station?.nivelDificuldade || props.station?.dificuldade
  if (difficulty) {
    chips.push({ icon: 'ri-signal-tower-line', label: `Dificuldade ${difficulty}` })
  }

  const tipoEstacao = props.station?.tipoEstacao || props.station?.categoria
  if (tipoEstacao) {
    chips.push({ icon: 'ri-flag-2-line', label: tipoEstacao })
  }

  const periodo = props.station?.inepPeriodo || props.station?.periodoInep || props.station?.ano
  if (periodo) {
    chips.push({ icon: 'ri-calendar-event-line', label: periodo })
  }

  const keywords = extractKeywords(props.station?.palavrasChave)
  if (keywords.length) {
    chips.push({ icon: 'ri-hashtag', label: keywords[0] })
  }

  return chips.slice(0, 4)
})

const sequenceLabel = computed(() => (props.isInSequence ? 'Na sequência' : 'Adicionar à sequência'))

const handleCardClick = () => {
  if (props.showSequentialConfig) {
    if (props.isInSequence) {
      emit('remove-from-sequence', props.station.id)
    } else {
      emit('add-to-sequence', props.station)
    }
  } else {
    emit('click', props.station.id)
  }
}
</script>

<template>
  <v-card
    :class="cardClasses"
    :style="cardStyle"
    rounded="xl"
    elevation="0"
    role="button"
    tabindex="0"
    @click="handleCardClick"
    @keydown.enter.prevent="handleCardClick"
    @keydown.space.prevent="handleCardClick"
  >
    <div class="station-card__content">
      <div class="station-card__top">
        <div class="station-card__leading">
          <div class="station-card__icon">
            <v-icon>ri-file-list-3-line</v-icon>
          </div>
          <div class="station-card__titles">
            <p
              v-if="stationSubtitle"
              class="station-card__eyebrow text-caption text-medium-emphasis mb-1"
            >
              {{ stationSubtitle }}
            </p>
            <h3 class="station-card__title">
              {{ station.cleanTitle || station.tituloEstacao }}
            </h3>
          </div>
        </div>
        <div class="station-card__top-actions">
          <v-progress-circular
            v-if="isCreatingSession"
            indeterminate
            size="22"
            color="primary"
          />
          <v-btn
            v-if="isAdmin"
            color="secondary"
            variant="text"
            size="small"
            icon="ri-pencil-line"
            @click.stop="emit('edit-station', station.id)"
            :aria-label="`Editar ${station.cleanTitle || station.tituloEstacao}`"
          />
        </div>
      </div>

      <div v-if="metaChips.length" class="station-card__chips">
        <v-chip
          v-for="chip in metaChips"
          :key="`${station.id}-${chip.label}`"
          class="station-card__chip"
          size="small"
          variant="elevated"
        >
          <v-icon size="16" class="me-1">{{ chip.icon }}</v-icon>
          {{ chip.label }}
        </v-chip>
      </div>

      <div class="station-card__footer">
        <div v-if="userScore" class="station-card__score">
          <v-chip :color="scoreColor" variant="flat" size="small" class="user-score-chip">
            <v-icon start size="16">ri-star-fill</v-icon>
            {{ userScore.score }}/{{ userScore.maxScore }}
          </v-chip>
        </div>

        <div v-if="showSequentialConfig" class="station-card__sequence">
          <v-chip
            :color="isInSequence ? 'success' : 'primary'"
            variant="tonal"
            size="small"
            class="station-card__sequence-chip"
          >
            <v-icon size="16" class="me-1">
              {{ isInSequence ? 'ri-check-line' : 'ri-play-list-add-line' }}
            </v-icon>
            {{ sequenceLabel }}
          </v-chip>
        </div>

        <v-icon class="station-card__arrow" size="22">ri-arrow-right-up-line</v-icon>
      </div>
    </div>
  </v-card>
</template>

<style scoped>
.station-card {
  position: relative;
  overflow: hidden;
  cursor: pointer;
  border-radius: 24px;
  padding: 26px;
  background: var(--station-surface-color);
  border: 1px solid var(--station-surface-border);
  box-shadow: var(--station-surface-shadow);
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
  color: var(--station-text-color);
}

.station-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(140deg, var(--station-accent-strong) 0%, var(--station-accent-soft) 55%, transparent 100%);
  opacity: 0.9;
  pointer-events: none;
  transition: opacity 0.25s ease;
}

.station-card > * {
  position: relative;
  z-index: 1;
}

.station-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 22px 58px rgba(24, 32, 54, 0.24);
  border-color: var(--station-accent-border);
  box-shadow: 0 24px 60px rgba(80, 49, 135, 0.28);
}

.station-card:hover::before {
  opacity: 1;
}

.station-card--sequence {
  border-style: dashed;
}

.station-card--selected {
  border-style: solid;
  border-color: rgba(34, 197, 94, 0.55);
  box-shadow: 0 22px 48px rgba(34, 197, 94, 0.24);
}

.station-card--loading {
  opacity: 0.78;
}

.station-card:focus-visible {
  outline: 2px solid var(--station-outline-focus);
  outline-offset: 4px;
}

.station-card__content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.station-card__top {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.station-card__leading {
  display: flex;
  gap: 18px;
  align-items: flex-start;
  flex: 1;
  color: var(--station-text-color);
}

.station-card__titles {
  flex: 1;
}

.station-card__icon {
  width: 52px;
  height: 52px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--station-accent-soft);
  color: var(--station-accent-border);
}

.station-card__title {
  font-size: 1.08rem;
  font-weight: 700;
  margin: 0;
  line-height: 1.35;
  color: var(--station-text-color);
}

.station-card__eyebrow {
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--station-muted-color);
}

.station-card__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.station-card__chip {
  backdrop-filter: blur(12px);
  background: var(--station-chip-bg) !important;
  border-color: var(--station-accent-soft) !important;
  font-weight: 600;
  color: var(--station-chip-color) !important;
}

.station-card__top-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.station-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.station-card__sequence {
  flex: 1;
  display: flex;
  justify-content: flex-start;
}

.station-card__sequence-chip {
  font-weight: 600;
  letter-spacing: 0.01em;
  background: var(--station-sequence-bg, var(--station-accent-soft)) !important;
  color: var(--station-sequence-color, var(--station-text-color)) !important;
  border: 1px solid var(--station-accent-border);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.12);
}

.station-card__arrow {
  color: var(--station-muted-color);
  transition: transform 0.2s ease;
}

.station-card:hover .station-card__arrow {
  transform: translate(4px, -4px);
}

.user-score-chip {
  font-weight: 600;
}

@media (max-width: 960px) {
  .station-card {
    padding: 22px;
  }

  .station-card__top {
    flex-direction: column;
    align-items: flex-start;
    gap: 18px;
  }

  .station-card__top-actions {
    align-self: stretch;
    justify-content: space-between;
  }
}

:deep(.v-theme--dark) .station-card {
  background: var(--station-surface-color);
  border-color: var(--station-surface-border);
  box-shadow: var(--station-surface-shadow);
  color: var(--station-text-color);
}

:deep(.v-theme--dark) .station-card__chip {
  background: var(--station-chip-bg) !important;
  color: var(--station-chip-color) !important;
}

:deep(.v-theme--dark) .station-card__eyebrow {
  color: var(--station-muted-color);
}

:deep(.v-theme--dark) .station-card__arrow {
  color: var(--station-muted-color);
}

:deep(.v-theme--dark) .station-card__sequence-chip {
  background: var(--station-sequence-bg, var(--station-accent-soft)) !important;
  color: var(--station-sequence-color, var(--station-text-color)) !important;
  border: 1px solid var(--station-accent-border);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.12);
}
</style>
