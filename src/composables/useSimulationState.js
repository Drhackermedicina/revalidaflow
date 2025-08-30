// src/composables/useSimulationState.js
import { ref, computed } from 'vue';

// Função Helper para Formatar Tempo
function formatTime(totalSeconds) {
  if (isNaN(totalSeconds) || totalSeconds < 0) totalSeconds = 0;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function useSimulationState() {
  // Estado da Estação e Checklist
  const stationData = ref(null);
  const checklistData = ref(null);

  // Estado de Controle da UI
  const isLoading = ref(true);
  const errorMessage = ref('');

  // Estado do Timer e Duração
  const selectedDurationMinutes = ref(10);
  const simulationTimeSeconds = ref(selectedDurationMinutes.value * 60);
  const timerDisplay = ref(formatTime(simulationTimeSeconds.value));

  // Estado de Prontidão dos Participantes
  const myReadyState = ref(false);
  const partnerReadyState = ref(false);

  // Estado do Ciclo de Vida da Simulação
  const simulationStarted = ref(false);
  const simulationEnded = ref(false);
  const simulationWasManuallyEndedEarly = ref(false);

  // Propriedades Computadas
  const bothParticipantsReady = computed(() => myReadyState.value && partnerReadyState.value);

  // Função para resetar o estado para uma nova sessão
  function resetSimulationState() {
    stationData.value = null;
    checklistData.value = null;
    isLoading.value = true;
    errorMessage.value = '';
    selectedDurationMinutes.value = 10;
    simulationTimeSeconds.value = selectedDurationMinutes.value * 60;
    timerDisplay.value = formatTime(simulationTimeSeconds.value);
    myReadyState.value = false;
    partnerReadyState.value = false;
    simulationStarted.value = false;
    simulationEnded.value = false;
    simulationWasManuallyEndedEarly.value = false;
  }

  return {
    // State
    stationData,
    checklistData,
    isLoading,
    errorMessage,
    timerDisplay,
    selectedDurationMinutes,
    simulationTimeSeconds,
    myReadyState,
    partnerReadyState,
    simulationStarted,
    simulationEnded,
    simulationWasManuallyEndedEarly,

    // Computed
    bothParticipantsReady,

    // Functions
    formatTime,
    resetSimulationState,
  };
}
