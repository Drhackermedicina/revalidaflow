<template>
  <div :class="themeClasses.container">
    <VContainer fluid class="px-0">
      <VRow>
        <VCol cols="12">
          <VCard
            title="Histórico de Simulações Realizadas"
            :class="themeClasses.card"
            elevation="2"
          >
            <VCardText>
              <p class="text-body-1 mb-4 historico-description">
                Visualize todas as simulações que você já realizou, com detalhes sobre a data, pontuação e status.
              </p>

              <!-- Loading State -->
              <div v-if="loading"
                :class="[
                  'd-flex justify-center align-center pa-8',
                  themeClasses.loading
                ]"
                role="status"
                aria-live="polite"
              >
                <VProgressCircular indeterminate color="primary" size="64" aria-hidden="true" />
                <span class="ml-4 text-h6" aria-label="Carregando histórico">Carregando histórico...</span>
              </div>

              <!-- Content -->
              <div v-else>
                <VTable class="text-no-wrap history-table">
                  <thead class="table-header">
                    <tr>
                      <th class="text-uppercase">Data</th>
                      <th class="text-uppercase">Tipo de Simulação</th>
                      <th class="text-uppercase">Pontuação</th>
                      <th class="text-uppercase">Status</th>
                      <th class="text-uppercase">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="simulation in simulations"
                      :key="simulation.id"
                      class="table-row"
                    >
                      <td>{{ simulation.date }}</td>
                      <td>{{ simulation.type }}</td>
                      <td>
                        <VChip
                          :color="getScoreColor(simulation.score)"
                          size="small"
                          class="font-weight-medium"
                        >
                          {{ simulation.score }}
                        </VChip>
                      </td>
                      <td>
                        <VChip
                          :color="getStatusColor(simulation.status)"
                          size="small"
                          class="text-capitalize"
                        >
                          {{ simulation.status }}
                        </VChip>
                      </td>
                      <td>
                        <VBtn
                          icon
                          variant="text"
                          size="small"
                          color="medium-emphasis"
                          @click="viewSimulationDetails(simulation.id)"
                        >
                          <VIcon icon="ri-eye-line" />
                        </VBtn>
                      </td>
                    </tr>
                  </tbody>
                </VTable>

                <VAlert
                  v-if="simulations.length === 0"
                  type="info"
                  variant="tonal"
                  class="mt-4"
                >
                  Nenhuma simulação encontrada. Comece uma nova simulação para ver seu histórico aqui!
                </VAlert>
              </div>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>
    </VContainer>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useThemeConfig } from '@/composables/useThemeConfig'
import { useFirebaseData } from '@/composables/useFirebaseData'

const { themeClasses } = useThemeConfig()
const { loading, userData, fetchUserStats } = useFirebaseData()

// Mapeamento de especialidades
const especialidadeNomes = {
  'clinica-medica': 'Clínica Médica',
  'cirurgia': 'Cirurgia Geral',
  'pediatria': 'Pediatria',
  'ginecologia-obstetricia': 'Ginecologia e Obstetrícia',
  'medicina-preventiva': 'Medicina Preventiva',
}

// Computed properties simplificadas
const simulations = computed(() => {
  const concluidas = userData.value?.estacoesConcluidas || []

  return concluidas.map((estacao, index) => ({
    id: estacao.estacaoId || `sim_${index}`,
    date: formatDate(estacao.timestamp || estacao.dataRealizacao),
    type: especialidadeNomes[estacao.especialidade] || 'Simulação Geral',
    score: estacao.nota || 0,
    status: 'Concluída'
  })).sort((a, b) => {
    // Ordenar por data (mais recente primeiro)
    const dateA = new Date(a.date.split('/').reverse().join('-'))
    const dateB = new Date(b.date.split('/').reverse().join('-'))
    return dateB - dateA
  })
})

// Função auxiliar para formatar data
const formatDate = (timestamp) => {
  if (!timestamp) return 'Data não disponível'

  try {
    let date
    if (timestamp.toDate) {
      date = timestamp.toDate()
    } else if (timestamp instanceof Date) {
      date = timestamp
    } else {
      date = new Date(timestamp)
    }

    return date.toLocaleDateString('pt-BR')
  } catch (error) {
    return 'Data inválida'
  }
}

const getScoreColor = (score) => {
  if (score >= 8) return 'success'
  if (score >= 6) return 'warning'
  return 'error'
}

const getStatusColor = (status) => {
  if (status === 'Concluída') return 'success'
  if (status === 'Em Andamento') return 'info'
  return 'error'
}

const viewSimulationDetails = (id) => {
  // Lógica para navegar para os detalhes da simulação
  console.log('Visualizar detalhes da simulação:', id)
}

// Lifecycle hooks
onMounted(() => {
  fetchUserStats()
})
</script>

<style scoped>
/* Estilos específicos da página Historico */
.historico-description {
  font-size: 1rem;
  line-height: 1.5;
  margin-bottom: 1rem;
  color: rgb(var(--v-theme-on-surface));
}

.history-table {
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  border-radius: 12px;
  overflow: hidden;
}

.table-header {
  background: rgba(var(--v-theme-primary), 0.05);
  color: rgb(var(--v-theme-on-surface));
}

.table-header th {
  font-weight: 600;
  padding: 16px 12px;
  border-bottom: 2px solid rgba(var(--v-theme-primary), 0.2);
}

.table-row {
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  transition: background-color 0.3s ease;
}

.table-row:hover {
  background: rgba(var(--v-theme-primary), 0.05);
}

.table-row td {
  padding: 12px;
  border-bottom: 1px solid rgba(var(--v-theme-outline), 0.12);
}

/* Responsividade */
@media (max-width: 768px) {
  .history-table {
    font-size: 0.875rem;
  }

  .table-header th,
  .table-row td {
    padding: 8px 6px;
  }
}

/* Melhoria adicional para VTable */
:deep(.v-table) {
  background: transparent !important;
}

:deep(.v-table .v-table__wrapper) {
  background: transparent !important;
}
</style>
