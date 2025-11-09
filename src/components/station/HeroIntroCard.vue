<script setup>
/**
 * HeroIntroCard.vue
 * Card hero moderno para introdução da página de estações
 * Substitui o texto simples com design glassmorphism e animações
 */

import { computed } from 'vue'

const props = defineProps({
  title: {
    type: String,
    default: 'Como você quer treinar hoje?'
  },
  subtitle: {
    type: String,
    default: 'Escolha entre treinamento individual ou simulação completa sequencial'
  },
  icon: {
    type: String,
    default: 'ri-stethoscope-line'
  },
  stationCount: {
    type: Number,
    default: 0
  },
  showCTA: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['explore'])

function onExplore() {
  emit('explore')
}

const formattedCount = computed(() => {
  if (props.stationCount > 0) {
    return `${props.stationCount}+ estações`
  }
  return 'Várias estações'
})
</script>

<template>
  <div class="hero-intro-card rf-glass-card rf-animated-shimmer rf-light-overlay">
    <!-- Decorative Elements -->
    <div class="hero-decoration hero-decoration-1" />
    <div class="hero-decoration hero-decoration-2" />
    
    <div class="hero-content">
      <!-- Icon Badge -->
      <div class="hero-icon-wrapper rf-animated-float">
        <div class="hero-icon-badge">
          <v-icon :icon="icon" size="48" />
        </div>
      </div>
      
      <!-- Title -->
      <h2 class="hero-title rf-text-gradient-primary">
        {{ title }}
      </h2>
      
      <!-- Subtitle -->
      <p class="hero-subtitle">
        {{ subtitle }}
      </p>
      
      <!-- Stats Chips -->
      <div class="hero-stats">
        <v-chip
          class="rf-chip-glass stat-chip"
          prepend-icon="ri-hospital-line"
          size="small"
        >
          {{ formattedCount }}
        </v-chip>
        <v-chip
          class="rf-chip-glass stat-chip"
          prepend-icon="ri-time-line"
          size="small"
        >
          15-90 min
        </v-chip>
        <v-chip
          class="rf-chip-glass stat-chip"
          prepend-icon="ri-user-star-line"
          size="small"
        >
          Avaliação IA
        </v-chip>
      </div>
      
      <!-- CTA Button (opcional) -->
      <v-btn
        v-if="showCTA"
        class="hero-cta-btn rf-animated-glare"
        color="primary"
        variant="flat"
        size="large"
        rounded="lg"
        prepend-icon="ri-compass-3-line"
        @click="onExplore"
      >
        Explorar Estações
      </v-btn>
    </div>
  </div>
</template>

<style scoped lang="scss">
// ============================================================================
// 🎴 HERO INTRO CARD - CONTAINER PRINCIPAL
// ============================================================================

.hero-intro-card {
  position: relative;
  padding: 2rem 1.75rem;
  margin: 2rem auto;
  max-width: 700px;
  min-height: 260px;
  overflow: hidden;
  border-radius: var(--rf-radius-2xl);
  background: linear-gradient(145deg, rgba(126, 87, 255, 0.18), rgba(34, 197, 255, 0.08)), var(--rf-glass-bg);
  backdrop-filter: var(--rf-glass-blur-strong);
  border: 1px solid var(--rf-glass-border);
  box-shadow: var(--rf-shadow-hero);
  transition: all var(--rf-transition-normal) var(--rf-ease-smooth);
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 30px 60px rgba(0, 0, 0, 0.18);
  }
}

// ============================================================================
// 🎨 ELEMENTOS DECORATIVOS
// ============================================================================

.hero-decoration {
  position: absolute;
  border-radius: 50%;
  opacity: 0.15;
  pointer-events: none;
  z-index: 0;
}

.hero-decoration-1 {
  top: -50px;
  right: -50px;
  width: 200px;
  height: 200px;
  background: radial-gradient(circle, rgba(102, 126, 234, 0.4) 0%, transparent 70%);
  animation: rf-pulse 4s ease-in-out infinite;
}

.hero-decoration-2 {
  bottom: -60px;
  left: -60px;
  width: 250px;
  height: 250px;
  background: radial-gradient(circle, rgba(118, 75, 162, 0.3) 0%, transparent 70%);
  animation: rf-pulse 5s ease-in-out infinite reverse;
}

// ============================================================================
// 📦 CONTEÚDO PRINCIPAL
// ============================================================================

.hero-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 1rem;
}

// ============================================================================
// 🎯 ÍCONE HERO
// ============================================================================

.hero-icon-wrapper {
  margin-bottom: 0.5rem;
}

.hero-icon-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 88px;
  height: 88px;
  border-radius: var(--rf-radius-xl);
  background: var(--rf-gradient-primary-soft);
  border: 2px solid var(--rf-glass-border);
  box-shadow: var(--rf-shadow-primary);
  transition: all var(--rf-transition-normal) var(--rf-ease-smooth);
  
  .hero-intro-card:hover & {
    transform: scale(1.05) rotate(5deg);
    box-shadow: var(--rf-shadow-primary-hover);
  }
  
  :deep(.v-icon) {
    color: rgba(244, 241, 255, 0.98) !important;
    opacity: 1 !important;
    filter: drop-shadow(0 10px 22px rgba(102, 126, 234, 0.55));
  }
}

// ============================================================================
// 📝 TIPOGRAFIA
// ============================================================================

.hero-title {
  font-size: 1.75rem;
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: -0.01em;
  margin: 0;
  color: rgba(244, 241, 255, 0.95);
  
  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
}

.hero-subtitle {
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.5;
  color: rgba(231, 228, 255, 0.75);
  max-width: 420px;
  margin: 0;
  
  @media (max-width: 768px) {
    font-size: 0.95rem;
  }
}

// ============================================================================
// 📊 STATS CHIPS
// ============================================================================

.hero-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: center;
  align-items: center;
  margin-top: 0.5rem;
}

.stat-chip {
  font-weight: 600;
  font-size: 0.875rem;
  padding: 0.5rem 1rem;
  transition: all var(--rf-transition-normal) var(--rf-ease-smooth);
  background: rgba(245, 242, 255, 0.1);
  color: rgba(240, 238, 255, 0.9);
  border-radius: 999px;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--rf-shadow-card);
  }
  
  :deep(.v-icon) {
    opacity: 0.95;
    color: rgba(240, 238, 255, 0.92);
  }
}

// ============================================================================
// 🎯 CTA BUTTON
// ============================================================================

.hero-cta-btn {
  margin-top: 0.5rem;
  padding: 0.85rem 2rem !important;
  font-weight: 600;
  font-size: 0.95rem;
  text-transform: none;
  letter-spacing: 0.02em;
  box-shadow: var(--rf-shadow-primary);
  
  &:hover {
    box-shadow: var(--rf-shadow-primary-hover);
    transform: translateY(-2px);
  }
  
  :deep(.v-btn__prepend) {
    margin-inline-end: 0.6rem;
  }
}

// ============================================================================
// 📱 RESPONSIVIDADE
// ============================================================================

@media (max-width: 768px) {
  .hero-intro-card {
    padding: 2rem 1.5rem;
    margin: 1.5rem auto;
  }
  
  .hero-icon-badge {
    width: 80px;
    height: 80px;
    
    :deep(.v-icon) {
      font-size: 40px !important;
    }
  }
  
  .hero-stats {
    gap: 0.5rem;
  }
  
  .stat-chip {
    font-size: 0.8rem;
    padding: 0.4rem 0.8rem;
  }
  
  .hero-cta-btn {
    width: 100%;
    padding: 1rem 2rem !important;
  }
  
  .hero-decoration-1,
  .hero-decoration-2 {
    display: none; // Simplificar em mobile
  }
}

// ============================================================================
// ⚡ PERFORMANCE - REDUZIR ANIMAÇÕES EM MOBILE
// ============================================================================

@media (prefers-reduced-motion: reduce) {
  .hero-intro-card,
  .hero-icon-badge,
  .stat-chip,
  .hero-cta-btn {
    transition: none;
    animation: none;
  }
  
  .hero-decoration-1,
  .hero-decoration-2 {
    animation: none;
  }
}
</style>

<style lang="scss">
// ============================================================================
// 🌙 DARK MODE (Não-scoped para funcionar com Vuetify)
// ============================================================================

.v-theme--dark {
  .hero-intro-card {
    background: linear-gradient(150deg, rgba(113, 86, 220, 0.22), rgba(45, 249, 255, 0.08)), rgba(94, 76, 180, 0.45) !important;
    border-color: rgba(193, 174, 255, 0.32) !important;
    box-shadow: 0 28px 60px rgba(31, 18, 73, 0.45) !important;
    
    .hero-subtitle {
      color: rgba(232, 226, 255, 0.85) !important;
    }
    
    .hero-icon-badge {
      background: linear-gradient(135deg, rgba(136, 109, 255, 0.42) 0%, rgba(78, 208, 255, 0.3) 100%) !important;
      border-color: rgba(205, 190, 255, 0.4) !important;
      box-shadow: 0 20px 46px rgba(24, 15, 56, 0.55) !important;
    }
    
    .hero-decoration-1 {
      background: radial-gradient(circle, rgba(136, 109, 255, 0.28) 0%, transparent 70%) !important;
    }
    
    .hero-decoration-2 {
      background: radial-gradient(circle, rgba(78, 180, 255, 0.22) 0%, transparent 70%) !important;
    }
  }
}
</style>

