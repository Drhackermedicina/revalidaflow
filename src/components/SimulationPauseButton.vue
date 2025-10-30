<template>
  <div class="simulation-pause-button">
    <VBtn
      :color="isLocallyPaused ? 'success' : 'warning'"
      :variant="isLocallyPaused ? 'elevated' : 'outlined'"
      :prepend-icon="isLocallyPaused ? 'ri-play-line' : 'ri-pause-line'"
      :loading="loading"
      :disabled="!simulationStarted || simulationEnded || loading"
      size="large"
      class="pause-button"
      @click="togglePause"
    >
      {{ isLocallyPaused ? 'Continuar' : 'Pausar' }}
    </VBtn>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { logger } from '@/utils/logger'

// Props
const props = defineProps({
  simulationStarted: {
    type: Boolean,
    required: true
  },
  simulationEnded: {
    type: Boolean,
    required: true
  },
  sessionId: {
    type: String,
    default: ''
  },
  socketRef: {
    type: Object,
    default: null
  },
  userRole: {
    type: String,
    default: ''
  },
  // Props para controle local do timer
  isLocallyPaused: {
    type: Boolean,
    required: true
  },
  toggleLocalPause: {
    type: Function,
    required: true
  },
  clearLocalTimer: {
    type: Function,
    required: true
  }
})

// Estado local
const loading = ref(false)

// Computeds
const canPauseResume = computed(() => {
  return props.userRole === 'actor' || props.userRole === 'evaluator'
})

// Métodos
const togglePause = async () => {
  if (!canPauseResume.value) {
    logger.warn('[PAUSE] Usuário não tem permissão para pausar/continuar', {
      userRole: props.userRole
    })
    return
  }

  loading.value = true

  try {
    props.toggleLocalPause()
  } catch (error) {
    logger.error('[PAUSE] Erro ao alternar timer local', error)
  } finally {
    // Reset loading após breve delay
    setTimeout(() => {
      loading.value = false
    }, 300)
  }
}

// Watch para mudanças na simulação
watch([() => props.simulationStarted, () => props.simulationEnded], () => {
  // Resetar estado quando simulação termina
  if (props.simulationEnded) {
    props.clearLocalTimer()
  }
})
</script>

<style scoped lang="scss">
.simulation-pause-button {
  position: relative;
  
  .pause-button {
    transition: all 0.3s ease;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    }
    
    &:disabled {
      transform: none;
      box-shadow: none;
    }
  }
}

.v-overlay__content {
  backdrop-filter: blur(4px);
}
</style>
