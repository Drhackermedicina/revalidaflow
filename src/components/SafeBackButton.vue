<template>
  <v-btn
    :icon="icon"
    :variant="variant"
    :color="color"
    :size="size"
    :disabled="isNavigating || disabled"
    :loading="isNavigating"
    @click="handleBack"
    class="safe-back-button"
    v-bind="$attrs"
  >
    <v-icon v-if="icon" :icon="icon" />
    <slot v-else />
  </v-btn>
</template>

<script setup>
import { computed } from 'vue'
import { useSafeNavigation } from '@/composables/useSafeNavigation'

const props = defineProps({
  // Aparência
  icon: {
    type: String,
    default: 'ri-arrow-left-line'
  },
  variant: {
    type: String,
    default: 'text'
  },
  color: {
    type: String,
    default: 'primary'
  },
  size: {
    type: String,
    default: 'default'
  },

  // Comportamento
  fallback: {
    type: String,
    default: '/app/dashboard'
  },
  disabled: {
    type: Boolean,
    default: false
  },
  showFallbackAlert: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['back', 'error'])

const { safeBack, isNavigating, hasHistory } = useSafeNavigation()

const canGoBack = computed(() => {
  return hasHistory() && !props.disabled
})

async function handleBack() {
  if (!canGoBack.value || isNavigating.value) return

  emit('back')

  try {
    const success = await safeBack({
      fallback: props.fallback,
      showFallbackAlert: props.showFallbackAlert
    })

    if (!success) {
      emit('error', new Error('Navegação falhou, usando fallback'))
    }
  } catch (error) {
    console.error('[SafeBackButton] Erro na navegação:', error)
    emit('error', error)
  }
}
</script>

<style scoped>
.safe-back-button {
  transition: all 0.2s ease;
}

.safe-back-button:hover:not(:disabled) {
  transform: translateX(-2px);
}
</style>