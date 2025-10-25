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
                      <th class="text-uppercase">Título da Estação</th>
                      <th class="text-uppercase">Especialidade</th>
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
                      <td>{{ simulation.title }}</td>
                      <td>{{ simulation.especialidade }}</td>
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
                          <CustomEyeIcon :is-open="true" :size="32" />
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
import { computed, onMounted, ref } from 'vue'
import { useThemeConfig } from '@/composables/useThemeConfig'
import { useFirebaseData } from '@/composables/useFirebaseData'
import CustomEyeIcon from '@/components/CustomEyeIcon.vue'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/plugins/firebase'

const { themeClasses } = useThemeConfig()
const { loading, userData, fetchUserStats } = useFirebaseData()

// Cache para títulos de estações
const stationTitleCache = new Map()
const isLoadingTitles = ref(false)

// Mapeamento de especialidades
const especialidadeNomes = {
  'clinica-medica': 'Clínica Médica',
  'cirurgia': 'Cirurgia Geral',
  'pediatria': 'Pediatria',
  'ginecologia-obstetricia': 'Ginecologia e Obstetrícia',
  'medicina-preventiva': 'Medicina Preventiva',
}

// Função para buscar o título real de uma estação pelo ID
async function fetchStationTitleById(stationId) {
  if (!stationId) return null

  // Verificar cache primeiro
  if (stationTitleCache.has(stationId)) {
    return stationTitleCache.get(stationId)
  }

  try {
    const docRef = doc(db, 'estacoes_clinicas', stationId)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      const title = docSnap.data().tituloEstacao || 'Estação sem título'
      stationTitleCache.set(stationId, title)
      return title
    }
  } catch (error) {
    console.warn('Erro ao buscar título da estação:', stationId, error)
  }

  return null
}

// Função para obter o título da estação (com fallbacks)
async function getStationTitle(estacaoConcluida) {
  // Tentar usar nomeEstacao primeiro (pode ter sido salvo corretamente)
  if (estacaoConcluida.nomeEstacao &&
      estacaoConcluida.nomeEstacao !== 'Estação sem título' &&
      estacaoConcluida.nomeEstacao.trim() !== '') {
    return estacaoConcluida.nomeEstacao
  }

  // Buscar o título real no Firestore pelo ID da estação
  if (estacaoConcluida.idEstacao) {
    return await fetchStationTitleById(estacaoConcluida.idEstacao)
  }

  return null
}

// Lista reativa para armazenar títulos carregados
const simulationTitles = ref(new Map())

// Função para carregar títulos das simulações
async function loadSimulationTitles() {
  if (!userData.value?.estacoesConcluidas) return

  isLoadingTitles.value = true

  try {
    const concluidas = userData.value.estacoesConcluidas
    const titlePromises = concluidas.map(async (estacao, index) => {
      const simId = estacao.estacaoId || `sim_${index}`
      const title = await getStationTitle(estacao)
      return { simId, title }
    })

    const titles = await Promise.all(titlePromises)
    const newTitleMap = new Map()

    titles.forEach(({ simId, title }) => {
      newTitleMap.set(simId, title)
    })

    simulationTitles.value = newTitleMap
  } catch (error) {
    console.error('Erro ao carregar títulos das simulações:', error)
  } finally {
    isLoadingTitles.value = false
  }
}

// Computed properties simplificadas
const simulations = computed(() => {
  const concluidas = userData.value?.estacoesConcluidas || []

  return concluidas.map((estacao, index) => {
    const simId = estacao.estacaoId || `sim_${index}`

    // Tentar obter título do cache carregado, senão usar fallback
    const cachedTitle = simulationTitles.value.get(simId)
    const title = cachedTitle ||
                 estacao.nomeEstacao ||
                 `Estação ${index + 1}`

    return {
      id: simId,
      date: formatDate(estacao.data),
      title: title,
      especialidade: especialidadeNomes[estacao.especialidade] || estacao.especialidade || 'Não definida',
      score: estacao.nota || estacao.pontuacao || 0,
      status: 'Concluída'
    }
  }).sort((a, b) => {
    // Ordenar por data (mais recente primeiro) - usando o campo 'data' diretamente
    const dataA = concluidas.find(e => (e.estacaoId || `estacao_${concluidas.indexOf(e)}`) === a.id)?.data
    const dataB = concluidas.find(e => (e.estacaoId || `estacao_${concluidas.indexOf(e)}`) === b.id)?.data

    if (!dataA || !dataB) return 0

    try {
      const dateA = dataA.toDate ? dataA.toDate() : new Date(dataA)
      const dateB = dataB.toDate ? dataB.toDate() : new Date(dataB)
      return dateB - dateA // Mais recente primeiro
    } catch {
      return 0
    }
  })
})

// Função auxiliar para formatar data
const formatDate = (timestamp) => {
  if (!timestamp) return 'Data não disponível'

  try {
    let date

    // Handle Firestore Timestamp
    if (timestamp.toDate) {
      date = timestamp.toDate()
    }
    // Handle if it's already a Date object
    else if (timestamp instanceof Date) {
      date = timestamp
    }
    // Handle if it's a string in various formats
    else if (typeof timestamp === 'string') {
      // Try different date formats
      if (timestamp.includes('/')) {
        // DD/MM/YYYY format
        const parts = timestamp.split('/')
        if (parts.length === 3) {
          date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`)
        }
      } else if (timestamp.includes('-')) {
        // ISO format or YYYY-MM-DD
        date = new Date(timestamp)
      } else {
        // Try as is
        date = new Date(timestamp)
      }
    }
    // Handle if it's a number (timestamp)
    else if (typeof timestamp === 'number') {
      date = new Date(timestamp)
    }
    // Handle as object with seconds (Firestore format)
    else if (timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000)
    }
    // Fallback
    else {
      date = new Date(timestamp)
    }

    // Validate the date
    if (isNaN(date.getTime())) {
      console.warn('Data inválida:', timestamp)
      return 'Data inválida'
    }

    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  } catch (error) {
    console.warn('Erro ao formatar data:', timestamp, error)
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
onMounted(async () => {
  await fetchUserStats()

  // Carregar títulos das simulações após carregar dados do usuário
  if (userData.value?.estacoesConcluidas) {
    await loadSimulationTitles()
  }
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
