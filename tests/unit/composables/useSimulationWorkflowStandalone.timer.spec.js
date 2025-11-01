import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useSimulationWorkflowStandalone } from '@/composables/useSimulationWorkflowStandalone.js'

describe('useSimulationWorkflowStandalone - timer display update', () => {
  it('atualiza timerDisplay quando selectedDurationMinutes muda e simulação não iniciou', async () => {
    const simulationTimeSeconds = ref(0)
    const timerDisplay = ref('00:00')
    const selectedDurationMinutes = ref(10)

    const wf = useSimulationWorkflowStandalone({ simulationTimeSeconds, timerDisplay, selectedDurationMinutes })

    // inicial
    expect(timerDisplay.value).toBe('10:00')

    // alterar antes de iniciar
    selectedDurationMinutes.value = 12
    // watch deve atualizar
    await Promise.resolve()
    expect(timerDisplay.value).toBe('12:00')
  })
})
