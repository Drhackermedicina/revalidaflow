<script setup>
/**
 * SectionHeroCard.vue
 * Card alto, mais estreito, para destacar seções
 * Versão melhorada com glassmorphism e animações
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
  ctaLabel: { type: String, default: 'Abrir seção' },
  ctaIcon: { type: String, default: 'ri-arrow-right-line' },
  decorativeIcon: { type: String, default: null },
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
    class="section-hero-card rf-glass-card rf-hover-lift rf-animated-shimmer"
    :style="cardStyle"
    elevation="0"
    rounded="xl"
    @click="onClick"
  >
    <!-- Decorative Background Element -->
    <div class="card-decoration" />
    
    <v-card-text class="pa-6 d-flex flex-column align-center text-center card-content">
      <!-- Badge com animação -->
      <div class="hero-badge rf-animated-pulse" v-if="badgeCount > 0">
        <v-chip :color="color" size="small" variant="elevated" class="badge-chip">
          {{ badgeCount }}
        </v-chip>
      </div>

      <!-- Ícone decorativo opcional -->
      <div v-if="decorativeIcon" class="decorative-icon-wrapper mb-3">
        <v-icon :icon="decorativeIcon" size="32" :color="color" class="decorative-icon" />
      </div>

      <!-- Imagem/Logo com efeito hover -->
      <div class="hero-media mb-4">
        <v-img v-if="image" :src="image" class="hero-image" />
        <div v-else class="hero-placeholder">
          <v-icon icon="ri-hospital-line" size="64" :color="color" />
        </div>
      </div>

      <!-- Título com gradiente -->
      <div class="hero-title mb-1">{{ title }}</div>
      
      <!-- Subtítulo -->
      <div v-if="subtitle" class="hero-subtitle mb-5">{{ subtitle }}</div>

      <!-- CTA Button melhorado -->
      <v-btn 
        :color="color" 
        variant="flat" 
        rounded="lg" 
        class="mt-auto px-6 hero-cta-btn rf-animated-glare"
        :append-icon="ctaIcon"
      >
        {{ ctaLabel }}
      </v-btn>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.section-hero-card {
  position: relative;
  border-radius: 28px;
  border: 1px solid var(--rf-glass-border);
  box-shadow: var(--rf-shadow-card);
  overflow: hidden;
  transition: all var(--rf-transition-normal) var(--rf-ease-smooth);
  backdrop-filter: var(--rf-glass-blur);
  cursor: pointer;
}

.section-hero-card:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: var(--rf-shadow-hero);
}

.card-decoration {
  position: absolute;
  top: -50%;
  right: -20%;
  width: 200px;
  height: 200px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(102, 126, 234, 0.15) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
  transition: all var(--rf-transition-slow) var(--rf-ease-smooth);
}

.section-hero-card:hover .card-decoration {
  transform: scale(1.5) translateY(10%);
  opacity: 0.8;
}

.card-content {
  position: relative;
  z-index: 1;
}

.hero-badge {
  position: absolute;
  top: 22px;
  right: 22px;
  z-index: 4;
}

.badge-chip {
  font-weight: 700;
  border-radius: 20px;
  padding: 0.45rem 0.9rem;
  backdrop-filter: blur(12px);
  box-shadow: var(--rf-shadow-card);
}

.decorative-icon-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: var(--rf-radius-lg);
  background: var(--rf-gradient-primary-soft);
  transition: all var(--rf-transition-normal) var(--rf-ease-smooth);
}

.section-hero-card:hover .decorative-icon-wrapper {
  transform: rotate(10deg) scale(1.1);
}

.decorative-icon {
  filter: drop-shadow(0 4px 8px rgba(102, 126, 234, 0.3));
}

.hero-media {
  width: 160px;
  height: 160px;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: var(--rf-shadow-card);
  transition: all var(--rf-transition-normal) var(--rf-ease-smooth);
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 100%);
    opacity: 0;
    transition: opacity var(--rf-transition-normal);
  }
}

.section-hero-card:hover .hero-media {
  transform: translateY(-4px) scale(1.05);
  box-shadow: var(--rf-shadow-hero);
  
  &::after {
    opacity: 1;
  }
}

.hero-placeholder {
  width: 100%;
  height: 100%;
  background: var(--rf-gradient-primary-soft);
  display: flex;
  align-items: center;
  justify-content: center;
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

.hero-cta-btn {
  font-weight: 600;
  text-transform: none;
  letter-spacing: 0.02em;
  box-shadow: var(--rf-shadow-primary);
  transition: all var(--rf-transition-normal) var(--rf-ease-smooth);
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--rf-shadow-primary-hover);
  }
  
  :deep(.v-btn__append) {
    margin-inline-start: 0.5rem;
    transition: transform var(--rf-transition-normal);
  }
  
  &:hover :deep(.v-btn__append) {
    transform: translateX(4px);
  }
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

