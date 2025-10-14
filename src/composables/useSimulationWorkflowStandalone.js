/**
 * useSimulationWorkflowStandalone.js
 *
 * Fluxo simplificado de simulação voltado para cenários locais/IA
 * sem dependências de socket ou backend. Inspirado em useSimulationWorkflow,
 * porém com timer controlado internamente.
 */

import { ref, computed, watch } from 'vue'
import { formatTime } from '@/utils/simulationUtils'

export function useSimulationWorkflowStandalone({
  simulationTimeSeconds,
  timerDisplay,
  selectedDurationMinutes,
  autoStartOnReady = false
} = {}) {
  const myReadyState = ref(false)
  const partnerReadyState = ref(true)
  const candidateReadyButtonEnabled = ref(false)
  const actorReadyButtonEnabled = computed(() => true)

  const simulationStarted = ref(false)
  const simulationEnded = ref(false)
  const simulationWasManuallyEndedEarly = ref(false)

  const backendActivated = ref(true)
  const bothParticipantsReady = computed(() => myReadyState.value && partnerReadyState.value)

  let timerId = null

  function clearTimer() {
    if (timerId) {
      clearInterval(timerId)
      timerId = null
    }
  }

  function runTimer() {
    clearTimer()

    let remainingSeconds = selectedDurationMinutes.value * 60
    simulationTimeSeconds.value = remainingSeconds
    timerDisplay.value = formatTime(remainingSeconds)

    timerId = setInterval(() => {
      if (simulationEnded.value) {
        clearTimer()
        return
      }

      remainingSeconds -= 1
      simulationTimeSeconds.value = remainingSeconds

      if (remainingSeconds <= 0) {
        clearTimer()
        simulationEnded.value = true
        timerDisplay.value = '00:00'
      } else {
        timerDisplay.value = formatTime(remainingSeconds)
      }
    }, 1000)
  }

  function startSimulation() {
    if (simulationStarted.value) return

    simulationStarted.value = true
    simulationEnded.value = false
    simulationWasManuallyEndedEarly.value = false
    runTimer()
  }

  function stopSimulation(markManual = false) {
    clearTimer()
    simulationStarted.value = false
    simulationEnded.value = true
    simulationWasManuallyEndedEarly.value = markManual
    timerDisplay.value = '00:00'
    return simulationEnded.value
  }

  function sendReady() {
    myReadyState.value = !myReadyState.value

    if (autoStartOnReady && myReadyState.value) {
      startSimulation()
    }

    if (!myReadyState.value && simulationStarted.value) {
      stopSimulation(false)
      backendActivated.value = true
    }
  }

  function manuallyEndSimulation() {
    if (!simulationStarted.value || simulationEnded.value) return
    stopSimulation(true)
  }

  function updateTimerDisplayFromSelection() {
    if (!simulationStarted.value) {
      timerDisplay.value = formatTime(selectedDurationMinutes.value * 60)
    }
  }

  function resetWorkflowState() {
    clearTimer()
    myReadyState.value = false
    simulationStarted.value = false
    simulationEnded.value = false
    simulationWasManuallyEndedEarly.value = false
    candidateReadyButtonEnabled.value = false
    backendActivated.value = true
    timerDisplay.value = formatTime(selectedDurationMinutes.value * 60)
  }

  watch(selectedDurationMinutes, () => {
    if (!simulationStarted.value) {
      timerDisplay.value = formatTime(selectedDurationMinutes.value * 60)
    }
  })

  setTimeout(() => {
    candidateReadyButtonEnabled.value = true
  }, 0)

  return {
    myReadyState,
    partnerReadyState,
    candidateReadyButtonEnabled,
    actorReadyButtonEnabled,
    simulationStarted,
    simulationEnded,
    simulationWasManuallyEndedEarly,
    backendActivated,
    bothParticipantsReady,
  sendReady,
  startSimulation,
  manuallyEndSimulation,
  updateTimerDisplayFromSelection,
  resetWorkflowState,
  simulationWasManuallyEndedEarly,
  bothParticipantsReady
}
}
