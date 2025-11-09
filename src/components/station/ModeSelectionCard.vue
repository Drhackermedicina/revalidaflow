<script setup>
/**
 * ModeSelectionCard.vue
 *
 * Componente para seleção de modo de treinamento/simulação
 */

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    required: true
  },
  color: {
    type: String,
    required: true
  },
  duration: {
    type: String,
    required: true
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['select'])

function onSelect() {
  if (!props.disabled) {
    emit('select')
  }
}
</script>

<template>
  <v-card 
    class="mode-selection-card rf-glass-card rf-hover-lift" 
    :class="{ 'mode-disabled': disabled }"
    elevation="0" 
    rounded="xl"
    @click="onSelect"
  >
    <!-- Elemento decorativo -->
    <div class="card-glow" :class="`card-glow-${color}`" />
    
    <v-card-text class="pa-8 card-content">
      <div class="text-center">
        <!-- Ícone com fundo -->
        <div class="icon-wrapper mb-5" :class="`icon-wrapper-${color}`">
          <v-icon 
            :icon="icon" 
            :color="color" 
            size="52" 
            class="mode-icon"
          />
        </div>
        
        <!-- Título -->
        <h3 class="mode-title mb-3">{{ title }}</h3>
        
        <!-- Descrição -->
        <p class="mode-description mb-4">{{ description }}</p>
        
        <!-- Chip de duração -->
        <v-chip 
          :color="color" 
          variant="tonal" 
          size="default"
          prepend-icon="ri-time-line"
          class="duration-chip"
        >
          {{ duration }}
        </v-chip>
        
        <!-- Indicador de seleção -->
        <div class="selection-indicator mt-4">
          <v-icon icon="ri-arrow-right-circle-line" :color="color" size="24" />
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<style scoped lang="scss">
.mode-selection-card {
  position: relative;
  cursor: pointer;
  transition: all var(--rf-transition-normal) var(--rf-ease-smooth);
  height: 100%;
  min-height: 340px;
  border: 2px solid var(--rf-glass-border);
  overflow: hidden;
  background: linear-gradient(160deg, rgba(126, 87, 255, 0.18), rgba(34, 197, 255, 0.08)), var(--rf-glass-bg);
  
  &:hover {
    transform: translateY(-8px) scale(1.02);
    box-shadow: var(--rf-shadow-hero);
    border-color: rgba(var(--v-theme-primary), 0.4);
  }
}

.card-glow {
  position: absolute;
  top: -50%;
  left: 50%;
  transform: translateX(-50%);
  width: 300px;
  height: 300px;
  border-radius: 50%;
  opacity: 0;
  pointer-events: none;
  transition: all var(--rf-transition-slow) var(--rf-ease-smooth);
  z-index: 0;
}

.card-glow-success {
  background: radial-gradient(circle, rgba(126, 255, 128, 0.35) 0%, transparent 70%);
}

.card-glow-primary {
  background: radial-gradient(circle, rgba(168, 135, 255, 0.35) 0%, transparent 70%);
}

.mode-selection-card:hover .card-glow {
  opacity: 1;
  top: -30%;
}

.card-content {
  position: relative;
  z-index: 1;
}

.icon-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100px;
  height: 100px;
  border-radius: var(--rf-radius-xl);
  transition: all var(--rf-transition-normal) var(--rf-ease-smooth);
  box-shadow: var(--rf-shadow-card);
}

.icon-wrapper-success {
  background: linear-gradient(135deg, rgba(126, 255, 128, 0.32) 0%, rgba(61, 214, 119, 0.46) 100%);

  :deep(.v-icon) {
    color: rgba(229, 255, 236, 0.98) !important;
    opacity: 1 !important;
    filter: drop-shadow(0 10px 25px rgba(61, 214, 119, 0.45));
  }
}

.icon-wrapper-primary {
  background: linear-gradient(135deg, rgba(168, 135, 255, 0.32) 0%, rgba(116, 90, 243, 0.46) 100%);

  :deep(.v-icon) {
    color: rgba(238, 231, 255, 0.98) !important;
    opacity: 1 !important;
    filter: drop-shadow(0 10px 25px rgba(116, 90, 243, 0.45));
  }
}

.mode-selection-card:hover .icon-wrapper {
  transform: scale(1.1) rotate(5deg);
  box-shadow: var(--rf-shadow-hero);
}

.mode-icon {
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15));
  transition: all var(--rf-transition-normal);
}

.mode-selection-card:hover .mode-icon {
  transform: scale(1.1);
}

.mode-title {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.3;
  color: rgba(var(--v-theme-on-surface), 0.95);
  transition: all var(--rf-transition-normal);
}

.mode-selection-card:hover .mode-title {
  background: var(--rf-text-gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.mode-description {
  font-size: 1rem;
  line-height: 1.6;
  color: rgba(var(--v-theme-on-surface), 0.88);
  max-width: 280px;
  margin: 0 auto;
}

.duration-chip {
  font-weight: 600;
  padding: 0.75rem 1.25rem;
  transition: all var(--rf-transition-normal);
  
  :deep(.v-icon) {
    opacity: 0.8;
  }
}

.mode-selection-card:hover .duration-chip {
  transform: scale(1.05);
}

.selection-indicator {
  opacity: 0;
  transform: translateY(10px);
  transition: all var(--rf-transition-normal) var(--rf-ease-smooth);
}

.mode-selection-card:hover .selection-indicator {
  opacity: 1;
  transform: translateY(0);
}

.mode-disabled {
  cursor: not-allowed;
  opacity: 0.5;
  filter: grayscale(0.5);
  
  &:hover {
    transform: none;
    box-shadow: var(--rf-shadow-card);
    border-color: var(--rf-glass-border);
  }
  
  .card-glow {
    display: none;
  }
}

// Dark mode overrides
:deep(.v-theme--dark) {
  .mode-selection-card {
    background: linear-gradient(150deg, rgba(113, 86, 220, 0.22), rgba(45, 249, 255, 0.08)), rgba(94, 76, 180, 0.45);
    border-color: rgba(193, 174, 255, 0.35);
    box-shadow: var(--rf-shadow-card-dark);
    
    &:hover {
      border-color: rgba(193, 174, 255, 0.55);
      box-shadow: var(--rf-shadow-hero-dark);
    }
  }
  
  .icon-wrapper-success,
  .icon-wrapper-primary {
    box-shadow: var(--rf-shadow-card-dark);
  }
  
  .mode-title {
    color: rgba(236, 229, 255, 0.95);
  }
  
  .mode-description {
    color: rgba(223, 215, 255, 0.75);
  }
}

// Responsividade
@media (max-width: 768px) {
  .mode-selection-card {
    min-height: 300px;
    
    &:hover {
      transform: translateY(-4px);
    }
  }
  
  .icon-wrapper {
    width: 80px;
    height: 80px;
  }
  
  .mode-icon {
    font-size: 44px !important;
  }
  
  .mode-title {
    font-size: 1.25rem;
  }
  
  .mode-description {
    font-size: 0.9rem;
  }
}
</style>