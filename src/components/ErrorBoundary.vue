<script setup>
/**
 * ErrorBoundary.vue
 *
 * Componente para capturar erros de componentes filhos
 * Evita que erro de um componente quebre toda a aplicação
 */
import { ref, onErrorCaptured } from 'vue'

defineProps({
  fallbackMessage: {
    type: String,
    default: 'Ops! Algo deu errado nesta seção'
  },
  showDetails: {
    type: Boolean,
    default: false
  }
})

const error = ref(null)
const errorInfo = ref(null)

onErrorCaptured((err, instance, info) => {
  error.value = err
  errorInfo.value = info

  // Log para debug
  console.error('ErrorBoundary capturou erro:', {
    error: err,
    component: instance,
    info
  })

  // Impedir propagação do erro
  return false
})

function reset() {
  error.value = null
  errorInfo.value = null
}

const emit = defineEmits(['error', 'reset'])

// Emitir evento quando erro ocorrer
function handleError() {
  emit('error', { error: error.value, info: errorInfo.value })
}

// Watch para emitir evento
import { watch } from 'vue'
watch(error, (newError) => {
  if (newError) {
    handleError()
  }
})
</script>

<template>
  <div v-if="error" class="error-boundary">
    <v-alert
      type="error"
      prominent
      border="start"
      variant="tonal"
      class="mb-4"
    >
      <template #prepend>
        <v-icon size="32">ri-error-warning-line</v-icon>
      </template>

      <div class="d-flex flex-column">
        <div class="text-h6 mb-2">{{ fallbackMessage }}</div>

        <div class="text-body-2 text-medium-emphasis mb-3">
          Ocorreu um erro ao carregar esta seção. Por favor, tente novamente.
        </div>

        <!-- Detalhes do erro (apenas em desenvolvimento) -->
        <v-expand-transition>
          <div v-if="showDetails && error" class="error-details mt-2">
            <v-divider class="mb-2" />
            <div class="text-caption text-error mb-1">
              <strong>Erro:</strong> {{ error.message }}
            </div>
            <div v-if="errorInfo" class="text-caption text-error">
              <strong>Info:</strong> {{ errorInfo }}
            </div>
          </div>
        </v-expand-transition>

        <!-- Botões de ação -->
        <div class="mt-3">
          <v-btn
            color="error"
            variant="elevated"
            @click="reset(); emit('reset')"
            prepend-icon="ri-refresh-line"
          >
            Tentar novamente
          </v-btn>

          <v-btn
            color="error"
            variant="text"
            @click="$router.go(0)"
            class="ml-2"
          >
            Recarregar página
          </v-btn>
        </div>
      </div>
    </v-alert>
  </div>

  <!-- Conteúdo normal quando não há erro -->
  <slot v-else />
</template>

<style scoped>
.error-boundary {
  width: 100%;
  padding: 16px;
}

.error-details {
  background-color: rgba(var(--v-theme-error), 0.05);
  border: 1px solid rgba(var(--v-theme-error), 0.2);
  border-radius: 4px;
  padding: 12px;
  font-family: 'Courier New', monospace;
  font-size: 0.75rem;
  max-height: 200px;
  overflow-y: auto;
}
</style>
