<script setup>
// Props necessárias para o componente
const props = defineProps({
  // Estados da simulação
  simulationStarted: {
    type: Boolean,
    default: false
  },
  simulationEnded: {
    type: Boolean,
    default: false
  },
  // Timer
  timerDisplay: {
    type: String,
    default: '00:00'
  },
  // Dados da estação
  stationData: {
    type: Object,
    default: null
  },
  // Permissões
  isCandidate: {
    type: Boolean,
    default: false
  }
})

// Emits para comunicação com o componente pai
const emit = defineEmits([])

// Funções utilitárias
function processRoteiro(roteiro) {
  if (!roteiro) return ''

  // Processa o roteiro para formatar corretamente
  return roteiro
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>')
}
</script>

<template>
  <!-- Coluna Direita Fixa (Sidebar do Candidato) -->
  <VCol v-if="isCandidate" cols="12" md="4">
      <div class="candidate-sidebar">
          <VCard class="mb-6">
              <VCardTitle class="text-center">Tempo Restante</VCardTitle>
              <VCardText>
                  <div class="timer-display-candidate" :class="{ 'ended': simulationEnded }">
                      <VIcon icon="ri-time-line" class="me-1" />
                      {{ timerDisplay }}
                  </div>
              </VCardText>
          </VCard>
          <VCard v-if="simulationStarted && stationData?.instrucoesParticipante?.tarefasPrincipais?.length">
              <VCardItem>
                  <template #prepend>
                      <VIcon icon="ri-task-line" color="success" />
                  </template>
                  <VCardTitle>Suas Tarefas</VCardTitle>
              </VCardItem>
              <VCardText class="text-body-1">
                  <ul class="tasks-list pl-5">
                      <li v-for="(tarefa, i) in stationData.instrucoesParticipante.tarefasPrincipais" :key="`cand-task-sidebar-${i}`" v-html="tarefa"></li>
                  </ul>
              </VCardText>
          </VCard>

          <!-- Orientações do Candidato na Sidebar -->
          <VCard v-if="stationData?.roteiroCandidato || stationData?.orientacoesCandidato" class="mb-6">
              <VCardItem>
                  <template #prepend>
                      <VIcon icon="ri-user-line" color="primary" />
                  </template>
                  <VCardTitle>Orientações</VCardTitle>
              </VCardItem>
              <VCardText class="text-body-1">
                  <div v-if="stationData.roteiroCandidato" class="mb-4">
                      <h6 class="text-subtitle-1 font-weight-bold mb-2">Instruções:</h6>
                      <div v-html="processRoteiro(stationData.roteiroCandidato)"></div>
                  </div>
                  <div v-if="stationData.orientacoesCandidato">
                      <h6 class="text-subtitle-1 font-weight-bold mb-2">Orientações Adicionais:</h6>
                      <div v-html="stationData.orientacoesCandidato"></div>
                  </div>
              </VCardText>
          </VCard>
      </div>
  </VCol>
</template>

<style scoped>
.candidate-sidebar {
  position: sticky;
  top: 20px;
}

.timer-display-candidate {
  font-size: 2rem;
  font-weight: bold;
  text-align: center;
  color: rgb(var(--v-theme-primary));
  transition: color 0.3s ease;
}

.timer-display-candidate.ended {
  color: rgb(var(--v-theme-error));
}

.tasks-list {
  list-style-type: none;
  padding: 0;
}

.tasks-list li {
  margin-bottom: 8px;
  padding-left: 16px;
  position: relative;
}

.tasks-list li::before {
  content: "✓";
  color: rgb(var(--v-theme-success));
  font-weight: bold;
  position: absolute;
  left: 0;
}
</style>
