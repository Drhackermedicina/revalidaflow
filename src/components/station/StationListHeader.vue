<script setup>
/**
 * StationListHeader.vue
 *
 * Cabeçalho contextualizado com informações do candidato e modo selecionado
 */

const props = defineProps({
  selectedCandidate: {
    type: Object,
    default: null
  },
  selectedMode: {
    type: String,
    default: null
  },
  modeTitle: {
    type: String,
    default: ''
  },
  modeDescription: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['back-to-mode-selection', 'change-candidate'])

function getModeIcon(mode) {
  const icons = {
    'simple-training': 'ri-user-follow-line',
    'simulation': 'ri-play-list-line',
    'ai-training': 'ri-robot-line'
  }
  return icons[mode] || 'ri-station-line'
}

function getModeColor(mode) {
  const colors = {
    'simple-training': 'success',
    'simulation': 'primary',
    'ai-training': 'purple'
  }
  return colors[mode] || 'grey'
}
</script>

<template>
  <v-card elevation="3" rounded="lg" class="station-list-header mb-4">
    <v-card-text class="pa-4">
      <!-- Informações do Candidato -->
      <div v-if="selectedCandidate" class="candidate-info mb-4">
        <div class="d-flex align-center mb-3">
          <v-avatar size="48" class="me-3">
            <v-img v-if="selectedCandidate.photoURL" :src="selectedCandidate.photoURL" />
            <v-icon v-else>ri-user-line</v-icon>
          </v-avatar>
          <div>
            <h3 class="text-h6 font-weight-bold mb-1">
              {{ selectedCandidate.nome }} {{ selectedCandidate.sobrenome }}
            </h3>
            <p class="text-body-2 text-medium-emphasis mb-0">
              {{ selectedCandidate.email }}
            </p>
          </div>
        </div>
      </div>

      <!-- Informações do Modo -->
      <div v-if="selectedMode" class="mode-info">
        <div class="d-flex align-center justify-space-between mb-3">
          <div class="d-flex align-center">
            <v-icon 
              :icon="getModeIcon(selectedMode)" 
              :color="getModeColor(selectedMode)" 
              size="32" 
              class="me-3"
            />
            <div>
              <h4 class="text-h6 font-weight-bold mb-1">{{ modeTitle }}</h4>
              <p class="text-body-2 text-medium-emphasis mb-0">{{ modeDescription }}</p>
            </div>
          </div>
          
          <!-- Botões de Ação -->
          <div class="action-buttons">
            <v-btn
              variant="outlined"
              color="primary"
              prepend-icon="ri-arrow-left-line"
              @click="emit('back-to-mode-selection')"
              class="me-2"
            >
              Voltar
            </v-btn>
            
            <v-btn
              variant="outlined"
              color="secondary"
              prepend-icon="ri-user-search-line"
              @click="emit('change-candidate')"
            >
              Trocar Candidato
            </v-btn>
          </div>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.station-list-header {
  background: linear-gradient(135deg, rgba(var(--v-theme-surface), 1), rgba(var(--v-theme-surface), 0.8));
  border-left: 4px solid rgb(var(--v-theme-primary));
}

.candidate-info {
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.12);
}

.mode-info {
  padding-top: 16px;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

@media (max-width: 768px) {
  .action-buttons {
    flex-direction: column;
    width: 100%;
    margin-top: 16px;
  }
  
  .action-buttons .v-btn {
    width: 100%;
  }
}
</style>
