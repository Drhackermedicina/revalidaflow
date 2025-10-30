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
    class="mode-selection-card" 
    :class="{ 'mode-disabled': disabled }"
    elevation="3" 
    rounded="lg"
    @click="onSelect"
  >
    <v-card-text class="pa-6">
      <div class="text-center">
        <v-icon 
          :icon="icon" 
          :color="color" 
          size="48" 
          class="mb-4"
        />
        <h3 class="text-h5 font-weight-bold mb-2">{{ title }}</h3>
        <p class="text-body-2 text-medium-emphasis mb-3">{{ description }}</p>
        <v-chip 
          :color="color" 
          variant="tonal" 
          size="small"
          prepend-icon="ri-time-line"
        >
          {{ duration }}
        </v-chip>
      </div>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.mode-selection-card {
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  height: 100%;
}

.mode-selection-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.mode-disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.mode-disabled:hover {
  transform: none;
  box-shadow: none;
}
</style>