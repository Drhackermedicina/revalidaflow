<template>
  <VRow 
    :class="[
      'historico-container',
      isDarkTheme ? 'historico-container--dark' : 'historico-container--light'
    ]"
  >
    <VCol cols="12">
      <VCard 
        title="Histórico de Simulações Realizadas"
        :class="[
          'main-card',
          isDarkTheme ? 'main-card--dark' : 'main-card--light'
        ]"
      >
        <VCardText>
          <p class="text-body-1 mb-4">Visualize todas as simulações que você já realizou, com detalhes sobre a data, pontuação e status.</p>

          <!-- Loading State -->
          <div v-if="loading" 
            :class="[
              'd-flex justify-center align-center pa-8 loading-container',
              isDarkTheme ? 'loading-container--dark' : 'loading-container--light'
            ]"
          >
            <VProgressCircular indeterminate color="primary" size="64" />
            <span class="ml-4 text-h6">Carregando histórico...</span>
          </div>

          <!-- Content -->
          <div v-else>
            <VTable 
              :class="[
                'text-no-wrap history-table',
                isDarkTheme ? 'history-table--dark' : 'history-table--light'
              ]"
            >
            <thead 
              :class="[
                'table-header',
                isDarkTheme ? 'table-header--dark' : 'table-header--light'
              ]"
            >
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
                :class="[
                  'table-row',
                  isDarkTheme ? 'table-row--dark' : 'table-row--light'
                ]"
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
</template>

<script setup>
import { currentUser } from '@/plugins/auth';
import { db } from '@/plugins/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { computed, onMounted, ref, watch } from 'vue';
import { useTheme } from 'vuetify';

const theme = useTheme();

// Computed para detectar tema escuro
const isDarkTheme = computed(() => theme.global.name.value === 'dark');

const loading = ref(true);
const simulations = ref([]);

// Mapeamento de especialidades
const especialidadeNomes = {
  'clinica-medica': 'Clínica Médica',
  'cirurgia': 'Cirurgia Geral',
  'pediatria': 'Pediatria',
  'ginecologia-obstetricia': 'Ginecologia e Obstetrícia',
  'medicina-preventiva': 'Medicina Preventiva',
};

// Função para formatar data
const formatDate = (timestamp) => {
  if (!timestamp) return 'Data não disponível';
  
  try {
    let date;
    if (timestamp.toDate) {
      // Firestore Timestamp
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      // String ou número
      date = new Date(timestamp);
    }
    
    return date.toLocaleDateString('pt-BR');
  } catch (error) {
    console.error('Erro ao formatar data:', error);
    return 'Data inválida';
  }
};

// Carregar histórico de simulações
const loadSimulationHistory = async () => {
  if (!currentUser.value?.uid) {
    loading.value = false;
    return;
  }
  
  try {
    const userDoc = await getDoc(doc(db, 'usuarios', currentUser.value.uid));
    if (!userDoc.exists()) {
      loading.value = false;
      return;
    }
    
    const userData = userDoc.data();
    const simulationsList = [];
    
    // Processar estações concluídas
    if (userData.estacoesConcluidas?.length) {
      for (const estacao of userData.estacoesConcluidas) {
        try {
          // Buscar informações da estação
          let estacaoInfo = null;
          if (estacao.estacaoId) {
            const estacaoDoc = await getDoc(doc(db, 'estacoes_clinicas', estacao.estacaoId));
            estacaoInfo = estacaoDoc.exists() ? estacaoDoc.data() : null;
          }
          
          const simulationEntry = {
            id: estacao.estacaoId || `sim_${Date.now()}_${Math.random()}`,
            date: formatDate(estacao.timestamp || estacao.dataRealizacao),
            type: estacaoInfo?.especialidade ? 
              (especialidadeNomes[estacaoInfo.especialidade] || estacaoInfo.especialidade) : 
              'Simulação Geral',
            score: estacao.nota || 0,
            status: 'Concluída',
            estacaoNome: estacaoInfo?.nome || 'Estação Clínica',
            duracao: estacao.duracao || null,
            tentativas: estacao.tentativas || 1
          };
          
          simulationsList.push(simulationEntry);
        } catch (error) {
          // Silencioso - removido log de erro para reduzir poluição do console
        }
      }
    }
    
    // Ordenar por data (mais recente primeiro)
    simulationsList.sort((a, b) => {
      const dateA = new Date(a.date.split('/').reverse().join('-'));
      const dateB = new Date(b.date.split('/').reverse().join('-'));
      return dateB - dateA;
    });
    
    simulations.value = simulationsList;
    
  } catch (error) {
    // Silencioso - removido log de erro para reduzir poluição do console
  } finally {
    loading.value = false;
  }
};

const getScoreColor = (score) => {
  if (score >= 8) return 'success';
  if (score >= 6) return 'warning';
  return 'error';
};

const getStatusColor = (status) => {
  if (status === 'Concluída') return 'success';
  if (status === 'Em Andamento') return 'info';
  return 'error'; // Para status como 'Cancelada' ou 'Falha'
};

const viewSimulationDetails = (id) => {
  // Lógica para navegar para os detalhes da simulação
  console.log(`Visualizar detalhes da simulação ${id}`);
  // Exemplo: router.push({ name: 'simulation-view', params: { id: id } });
};

// Lifecycle hooks
onMounted(() => {
  loadSimulationHistory();
});

// Watch para mudanças no usuário
watch(currentUser, (newUser) => {
  if (newUser?.uid) {
    loadSimulationHistory();
  }
}, { immediate: false });
</script>

<style scoped>
/* Container do histórico com tema adaptativo */
.historico-container--light {
  background: rgb(var(--v-theme-background));
  color: rgb(var(--v-theme-on-background));
}

.historico-container--dark {
  background: rgb(var(--v-theme-background));
  color: rgb(var(--v-theme-on-background));
}

/* Card principal com tema adaptativo */
.main-card--light {
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  box-shadow: 0 4px 16px rgba(var(--v-theme-primary), 0.08);
}

.main-card--dark {
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  box-shadow: 0 4px 16px rgba(var(--v-theme-primary), 0.12);
}

/* Container de loading com tema adaptativo */
.loading-container--light {
  background: rgba(var(--v-theme-surface), 0.8);
  color: rgb(var(--v-theme-on-surface));
  border-radius: 12px;
}

.loading-container--dark {
  background: rgba(var(--v-theme-surface-dim), 0.9);
  color: rgb(var(--v-theme-on-surface));
  border-radius: 12px;
}

/* Tabela do histórico com tema adaptativo */
.history-table--light {
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  border-radius: 12px;
  overflow: hidden;
}

.history-table--dark {
  background: rgb(var(--v-theme-surface-dim));
  color: rgb(var(--v-theme-on-surface));
  border-radius: 12px;
  overflow: hidden;
}

/* Cabeçalho da tabela com tema adaptativo */
.table-header--light {
  background: rgba(var(--v-theme-primary), 0.05);
  color: rgb(var(--v-theme-on-surface));
}

.table-header--dark {
  background: rgba(var(--v-theme-primary), 0.15);
  color: rgb(var(--v-theme-on-surface));
}

.table-header--light th,
.table-header--dark th {
  font-weight: 600;
  padding: 16px 12px;
  border-bottom: 2px solid rgba(var(--v-theme-primary), 0.2);
}

/* Linhas da tabela com tema adaptativo */
.table-row--light {
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  transition: background-color 0.3s ease;
}

.table-row--dark {
  background: rgb(var(--v-theme-surface-dim));
  color: rgb(var(--v-theme-on-surface));
  transition: background-color 0.3s ease;
}

.table-row--light:hover {
  background: rgba(var(--v-theme-primary), 0.05);
}

.table-row--dark:hover {
  background: rgba(var(--v-theme-primary), 0.10);
}

.table-row--light td,
.table-row--dark td {
  padding: 12px;
  border-bottom: 1px solid rgba(var(--v-theme-outline), 0.12);
}

/* Melhorias gerais para responsividade */
@media (max-width: 768px) {
  .history-table--light,
  .history-table--dark {
    font-size: 0.875rem;
  }
  
  .table-header--light th,
  .table-header--dark th,
  .table-row--light td,
  .table-row--dark td {
    padding: 8px 6px;
  }
  
  .main-card--light,
  .main-card--dark {
    border-radius: 8px;
  }
}

/* Transições suaves para mudanças de tema */
.historico-container--light,
.historico-container--dark,
.main-card--light,
.main-card--dark,
.history-table--light,
.history-table--dark,
.table-header--light,
.table-header--dark,
.table-row--light,
.table-row--dark {
  transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
}

/* Melhoria adicional para VTable no tema escuro */
:deep(.v-table) {
  background: transparent !important;
}

:deep(.v-table .v-table__wrapper) {
  background: transparent !important;
}
</style>
