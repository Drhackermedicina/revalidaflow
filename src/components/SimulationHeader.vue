<script setup>
import { ref, watch } from 'vue'
// Emits para comunicação com o componente pai
const emit = defineEmits([
  'goToPreviousSequentialStation',
  'goToNextSequentialStation',
  'exitSequentialMode',
  'clearSelectedCandidate',
  'openEditPage',
  'updateTimerDisplayFromSelection',
  'manuallyEndSimulation',
  'toggleCollapse',
  'update:selectedDurationMinutes'
])

// Props necessárias para o componente
const props = defineProps({
  // Navegação sequencial
  isSequentialMode: {
    type: Boolean,
    default: false
  },
  sequentialProgress: {
    type: Object,
    default: () => ({ current: 0, total: 0, percentage: 0 })
  },
  canGoToPrevious: {
    type: Boolean,
    default: false
  },
  canGoToNext: {
    type: Boolean,
    default: false
  },
  // Informações da estação
  stationData: {
    type: Object,
    default: null
  },
  // Estado da simulação
  simulationStarted: {
    type: Boolean,
    default: false
  },
  simulationEnded: {
    type: Boolean,
    default: false
  },
  // Candidato selecionado
  selectedCandidateForSimulation: {
    type: Object,
    default: null
  },
  // Timer
  timerDisplay: {
    type: String,
    default: '00:00'
  },
  selectedDurationMinutes: {
    type: Number,
    default: 10
  },
  // Permissões
  isActorOrEvaluator: {
    type: Boolean,
    default: false
  },
  isCandidate: {
    type: Boolean,
    default: false
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  stationId: {
    type: String,
    default: ''
  },
  // Estados de erro
  errorMessage: {
    type: String,
    default: ''
  }
})

// Valor local para o seletor de duração (sincronizado com prop)
const localSelectedDurationMinutes = ref(props.selectedDurationMinutes)

// 🔧 LOG: Computeds seguros para evitar undefined
const safeSimulationStarted = computed(() => props.simulationStarted ?? false);
const safeSimulationEnded = computed(() => props.simulationEnded ?? false);

// Sincronizar valor local quando prop muda
watch(() => props.selectedDurationMinutes, (newValue) => {
  localSelectedDurationMinutes.value = newValue
})

// Funções para emitir eventos
function handlePreviousStation() {
  emit('goToPreviousSequentialStation')
}

function handleNextStation() {
  emit('goToNextSequentialStation')
}

function handleExitSequentialMode() {
  emit('exitSequentialMode')
}

function handleClearSelectedCandidate() {
  emit('clearSelectedCandidate')
}

function handleOpenEditPage() {
  emit('openEditPage')
}

function handleTimerSelectionUpdate(newValue) {
  emit('update:selectedDurationMinutes', newValue)
  emit('updateTimerDisplayFromSelection')
}

function handleManuallyEndSimulation() {
  emit('manuallyEndSimulation')
}

function handleToggleCollapse() {
  emit('toggleCollapse')
}
</script>

<template>
  <!-- Barra de Navegação Sequencial -->
  <v-app-bar
    v-if="isSequentialMode"
    color="primary"
    density="compact"
    elevation="2"
    style="position: relative; margin-bottom: 16px;"
  >
    <v-container fluid class="d-flex align-center justify-space-between pa-2">
      <div class="d-flex align-center">
        <v-icon class="me-2">ri-play-list-line</v-icon>
        <span class="text-subtitle-2 font-weight-bold">Simulação Sequencial</span>
        <v-divider vertical class="mx-3" />
        <span class="text-body-2">
          Estação {{ sequentialProgress.current }} de {{ sequentialProgress.total }}
        </span>
        <v-progress-linear
          :model-value="sequentialProgress.percentage"
          color="white"
          height="4"
          class="ml-3"
          style="width: 120px;"
        />
      </div>

      <div class="d-flex align-center gap-2">
        <v-btn
          v-if="canGoToPrevious"
          icon
          size="small"
          variant="text"
          @click="handlePreviousStation"
          :disabled="!canGoToPrevious"
        >
          <v-icon>ri-arrow-left-line</v-icon>
          <v-tooltip activator="parent" location="bottom">Estação Anterior</v-tooltip>
        </v-btn>

        <v-chip
          color="white"
          variant="elevated"
          size="small"
          class="text-primary font-weight-bold"
        >
          {{ sequentialProgress.percentage }}%
        </v-chip>

        <v-btn
          v-if="canGoToNext"
          icon
          size="small"
          variant="text"
          @click="handleNextStation"
          :disabled="!canGoToNext"
        >
          <v-icon>ri-arrow-right-line</v-icon>
          <v-tooltip activator="parent" location="bottom">Próxima Estação</v-tooltip>
        </v-btn>

        <v-btn
          icon
          size="small"
          variant="text"
          @click="handleExitSequentialMode"
          color="warning"
        >
          <v-icon>ri-close-line</v-icon>
          <v-tooltip activator="parent" location="bottom">Sair do Modo Sequencial</v-tooltip>
        </v-btn>
      </div>
    </v-container>
  </v-app-bar>

  <!-- Cabeçalho Principal -->
  <v-card
    class="mb-6 main-header-card"
  >
    <v-card-text>
      <!-- Selected Candidate Info -->
      <div v-if="selectedCandidateForSimulation" class="mb-4">
        <v-card
          color="primary"
          variant="tonal"
          class="candidate-card"
        >
          <v-card-text>
            <div class="d-flex align-center">
              <v-avatar size="40" class="me-3">
                <v-img
                  :src="selectedCandidateForSimulation.photoURL || '/images/avatars/avatar-1.png'"
                  :alt="selectedCandidateForSimulation.name"
                />
              </v-avatar>
              <div class="flex-grow-1">
                <div class="text-subtitle-1 font-weight-medium">
                  Candidato Selecionado: {{ selectedCandidateForSimulation.name }}
                </div>
                <div class="text-caption text-medium-emphasis">
                  {{ selectedCandidateForSimulation.email }}
                </div>
              </div>
              <v-btn
                size="small"
                variant="text"
                color="error"
                @click="handleClearSelectedCandidate"
                prepend-icon="mdi-close"
              >
                Limpar Seleção
              </v-btn>
            </div>
          </v-card-text>
        </v-card>
      </div>

      <div class="d-flex flex-wrap justify-space-between align-center gap-4">
        <!-- Título -->
        <div class="d-flex align-center gap-3">
            <v-btn icon variant="text" @click="handleToggleCollapse">
                <v-icon icon="ri-menu-line" />
            </v-btn>
            <div>
                <h2 class="text-h5">{{
                  isCandidate
                    ? stationData?.especialidade
                    : `${stationData?.especialidade} - ${stationData?.tituloEstacao}`
                }}</h2>
            </div>
        </div>

        <!-- Timer e Controles -->
        <div class="d-flex align-center gap-3">
          <!-- Botão de Edição para Admins -->
          <v-btn
            v-if="isAdmin && stationId"
            icon
            variant="text"
            size="small"
            color="warning"
            title="Editar Estação (abrir em nova aba)"
            @click="handleOpenEditPage"
            style="background-color: yellow !important; color: black !important;"
          >
            <v-icon icon="ri-pencil-line" style="color: black !important;" />
          </v-btn>

          <!-- Seletor de Duração -->
          <div v-if="isActorOrEvaluator && !simulationStarted && !simulationEnded" style="width: 150px;">
            <v-select
              v-model="localSelectedDurationMinutes"
              label="Duração"
              :items="[5, 6, 7, 8, 9, 10].map(n => ({ title: `${n} min`, value: n }))"
              density="compact"
              hide-details
              @update:model-value="handleTimerSelectionUpdate"
            />
          </div>

          <!-- Timer Display -->
          <div class="timer-display" :class="{ 'ended': simulationEnded }">
            <v-icon icon="ri-time-line" class="me-1" />
            {{ timerDisplay }}
          </div>

          <!-- Botão de Encerramento Manual -->
          <v-btn
            v-if="isActorOrEvaluator && simulationStarted && !simulationEnded"
            color="error"
            variant="tonal"
            @click="handleManuallyEndSimulation"
          >
            Encerrar
          </v-btn>
        </div>
      </div>

      <!-- Mensagem de Erro -->
      <v-alert v-if="errorMessage && stationData" type="warning" density="compact" class="mt-4">
        {{ errorMessage }}
      </v-alert>
    </v-card-text>
  </v-card>
</template>

<style scoped>
/* Estilos específicos do componente podem ser adicionados aqui */
</style>
