<script setup>
/**
 * SectionHeroCard.vue
 * Card alto, mais estreito, para destacar seções
 */
import { computed } from 'vue'
import { useTheme } from 'vuetify'

const props = defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  image: { type: String, default: null },
  badgeCount: { type: Number, default: 0 },
  color: { type: String, default: 'primary' },
  gradientStart: { type: String, default: '#EEF2FF' },
  gradientEnd: { type: String, default: '#FAFBFF' },
})

const emit = defineEmits(['click'])

function onClick() {
  emit('click')
}

// Ajuste de fundo por tema (evitar inline light em dark)
const theme = useTheme()
const isDark = computed(() => {
  try {
    return theme.global.current.value?.dark ?? theme.global.name.value === 'dark'
  } catch {
    return false
  }
})

const lightGradient = computed(() => {
  if (!props.gradientStart || !props.gradientEnd) {
    return 'var(--station-hero-gradient)'
  }

  return `linear-gradient(140deg, ${props.gradientStart}, ${props.gradientEnd})`
})

const cardStyle = computed(() => {
  return {
    background: isDark.value ? 'var(--station-hero-gradient)' : lightGradient.value,
    color: 'var(--station-hero-title-color)'
  }
})
</script>

<template>
  <v-card
    class="section-hero-card"
    :style="cardStyle"
    elevation="4"
    rounded="xl"
    @click="onClick"
  >
    <v-card-text class="pa-6 d-flex flex-column align-center text-center">
      <div class="hero-badge" v-if="badgeCount > 0">
        <v-chip :color="color" size="small" variant="elevated">{{ badgeCount }}</v-chip>
      </div>

      <div class="hero-media mb-4">
        <v-img v-if="image" :src="image" class="hero-image" />
        <div v-else class="hero-placeholder" />
      </div>

      <div class="hero-title mb-1">{{ title }}</div>
      <div v-if="subtitle" class="hero-subtitle mb-5">{{ subtitle }}</div>

      <v-btn :color="color" variant="flat" rounded="lg" class="mt-auto px-6">
        Abrir seção
      </v-btn>
    </v-card-text>
  </v-card>
  
</template>

<style scoped>
.section-hero-card {
  position: relative;
  border-radius: 28px;
  border: 1px solid var(--station-panel-border);
  box-shadow: var(--station-panel-shadow);
  overflow: hidden;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
  backdrop-filter: blur(14px);
}

.section-hero-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 32px 78px rgba(32, 45, 99, 0.28);
}

.hero-badge {
  position: absolute;
  top: 22px;
  right: 22px;
  z-index: 4;
}

.hero-badge .v-chip {
  font-weight: 700;
  border-radius: 20px;
  padding: 0.45rem 0.9rem;
  backdrop-filter: blur(12px);
}

.hero-media {
  width: 160px;
  height: 160px;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 16px 36px rgba(32, 45, 99, 0.18);
  transition: transform 0.35s ease, box-shadow 0.35s ease;
}

.section-hero-card:hover .hero-media {
  transform: translateY(-4px);
  box-shadow: 0 24px 48px rgba(32, 45, 99, 0.28);
}

.hero-placeholder {
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.16);
}

.hero-title {
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--station-hero-title-color);
  text-align: center;
  margin-bottom: 0.75rem;
}

.hero-title::after {
  content: '';
  display: block;
  width: 64px;
  height: 2px;
  margin: 0.5rem auto 0;
  background: rgba(102, 126, 234, 0.55);
  border-radius: 1px;
}

.hero-subtitle {
  font-size: 1rem;
  color: var(--station-hero-subtitle-color);
  line-height: 1.6;
  max-width: 260px;
  margin: 0 auto 1.5rem;
}

.section-hero-card :deep(.v-btn) {
  font-weight: 600;
  text-transform: none;
  border-radius: 18px;
  padding: 0.75rem 1.9rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  box-shadow: 0 12px 28px rgba(102, 126, 234, 0.28);
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.section-hero-card :deep(.v-btn:hover) {
  transform: translateY(-2px);
  box-shadow: 0 16px 34px rgba(102, 126, 234, 0.38);
}

:deep(.v-theme--dark) .section-hero-card {
  border-color: var(--station-panel-border);
  box-shadow: var(--station-panel-shadow);
}

:deep(.v-theme--dark) .hero-badge .v-chip {
  background: rgba(129, 140, 248, 0.3);
  color: var(--station-hero-title-color);
  border-color: rgba(129, 140, 248, 0.4);
}

:deep(.v-theme--dark) .hero-media {
  box-shadow: 0 22px 48px rgba(3, 6, 20, 0.55);
}
</style>

