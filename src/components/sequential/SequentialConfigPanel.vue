<script setup>
/**
 * SequentialConfigPanel.vue
 *
 * Painel de configuração de simulação sequencial
 */

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  selectedStations: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits([
  'toggle',
  'move-station',
  'remove-station',
  'start',
  'reset'
])

function getAreaColor(areaKey) {
  const colors = {
    'clinica-medica': 'blue',
    'cirurgia': 'indigo',
    'pediatria': 'green',
    'ginecologia': 'pink',
    'preventiva': 'orange',
    'procedimentos': 'purple',
    'geral': 'grey'
  }
  return colors[areaKey] || 'grey'
}
</script>

<template>
  <div>
    <!-- Card de controle -->
    <v-card class="mb-4" elevation="2" rounded color="primary" variant="tonal">
      <v-card-text class="py-3">
        <v-row align="center">
          <v-col>
            <div class="d-flex align-center">
              <v-icon class="me-2" color="primary">ri-play-list-line</v-icon>
              <div>
                <div class="text-subtitle-1 font-weight-bold">Simulação Sequencial de Estações</div>
                <div class="text-caption text-medium-emphasis">Configure uma sequência de estações para simulação contínua</div>
              </div>
            </div>
          </v-col>
          <v-col cols="auto">
            <v-btn
              :color="show ? 'warning' : 'primary'"
              variant="elevated"
              size="default"
              @click="emit('toggle')"
              class="text-none"
              :prepend-icon="show ? 'ri-close-line' : 'ri-settings-3-line'"
            >
              {{ show ? 'Cancelar' : 'Configurar Sequência' }}
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Painel expandido -->
    <v-expand-transition>
      <v-card v-if="show" class="mb-4" elevation="3" rounded>
        <v-card-title class="bg-primary text-white d-flex align-center">
          <v-icon class="me-2">ri-list-ordered</v-icon>
          Configuração da Simulação Sequencial
        </v-card-title>
        <v-card-text class="pa-4">
          <!-- Lista de estações selecionadas -->
          <div v-if="selectedStations.length > 0" class="mb-4">
            <div class="text-subtitle-1 font-weight-medium pa-0 mb-2 d-flex align-center">
              <v-icon class="me-2">ri-check-line</v-icon>
              Estações Selecionadas ({{ selectedStations.length }})
            </div>
            <v-list density="compact" class="bg-grey-lighten-4 rounded">
              <v-list-item
                v-for="(station, index) in selectedStations"
                :key="station.id"
                class="mb-1"
              >
                <template #prepend>
                  <v-chip
                    color="primary"
                    size="small"
                    variant="elevated"
                    class="me-3"
                  >
                    {{ station.order }}
                  </v-chip>
                  <v-icon :color="getAreaColor(station.area.key)">
                    ri-file-list-3-line
                  </v-icon>
                </template>
                <v-list-item-title class="text-body-2 font-weight-medium">
                  {{ station.titulo }}
                </v-list-item-title>
                <v-list-item-subtitle class="text-caption">{{ station.area.fullName }}</v-list-item-subtitle>
                <template #append>
                  <div class="d-flex gap-1">
                    <v-btn
                      v-if="index > 0"
                      icon
                      size="x-small"
                      variant="text"
                      @click="emit('move-station', index, index - 1)"
                    >
                      <v-icon>ri-arrow-up-line</v-icon>
                    </v-btn>
                    <v-btn
                      v-if="index < selectedStations.length - 1"
                      icon
                      size="x-small"
                      variant="text"
                      @click="emit('move-station', index, index + 1)"
                    >
                      <v-icon>ri-arrow-down-line</v-icon>
                    </v-btn>
                    <v-btn
                      icon
                      size="x-small"
                      color="error"
                      variant="text"
                      @click="emit('remove-station', station.id)"
                    >
                      <v-icon>ri-delete-bin-line</v-icon>
                    </v-btn>
                  </div>
                </template>
              </v-list-item>
            </v-list>
            <v-row class="mt-3">
              <v-col>
                <v-btn
                  color="success"
                  variant="elevated"
                  block
                  size="large"
                  @click="emit('start')"
                  :disabled="selectedStations.length === 0"
                  prepend-icon="ri-play-line"
                >
                  Iniciar Simulação Sequencial ({{ selectedStations.length }} estações)
                </v-btn>
              </v-col>
              <v-col cols="auto">
                <v-btn
                  color="warning"
                  variant="outlined"
                  @click="emit('reset')"
                  prepend-icon="ri-refresh-line"
                >
                  Limpar
                </v-btn>
              </v-col>
            </v-row>
          </div>
          <!-- Instruções -->
          <v-alert
            v-else
            type="info"
            variant="tonal"
            class="mb-0"
          >
            <template #title>Como usar a Simulação Sequencial</template>
            <div class="text-body-2 mt-2">
              <p>1. Clique no botão <v-icon size="small">ri-plus-line</v-icon> ao lado de cada estação que deseja incluir na sequência</p>
              <p>2. Organize a ordem das estações usando as setas ↑↓</p>
              <p>3. Clique em "Iniciar Simulação Sequencial" para começar</p>
              <p class="mt-2 font-weight-medium text-primary">
                A simulação abrirá cada estação sequencialmente em novas abas
              </p>
            </div>
          </v-alert>
        </v-card-text>
      </v-card>
    </v-expand-transition>
  </div>
</template>
