<template>
  <v-container class="py-6">
    <!-- Verificação de acesso admin -->
    <v-row v-if="!isAuthorizedAdmin">
      <v-col cols="12">
        <v-card elevation="3" class="text-center pa-6">
          <v-icon icon="ri-shield-keyhole-line" color="error" size="64" class="mb-4" />
          <h2 class="text-h4 mb-4 text-error">Acesso Restrito</h2>
          <p class="text-h6 mb-4">Esta página é restrita apenas para administradores.</p>
          
          <v-btn color="primary" @click="$router.push('/app/dashboard')" class="mt-4">
            Voltar ao Dashboard
          </v-btn>
        </v-card>
      </v-col>
    </v-row>
    
    <!-- Conteúdo principal - visível apenas para admins -->
    <v-row v-else>
      <v-col cols="12">
        <v-card elevation="3" class="admin-reset-card">
          <v-card-title class="d-flex align-center gap-2">
            <v-icon icon="ri-settings-3-line" color="error" size="28" />
            <span class="text-h5 font-weight-bold">Reset de Estatísticas dos Usuários</span>
            <v-chip color="error" variant="elevated" class="ms-auto">
              <v-icon start icon="ri-shield-keyhole-line" />
              Área Admin
            </v-chip>
          </v-card-title>
          
          <v-card-text class="pa-6">
            <v-alert type="warning" prominent variant="tonal" class="mb-6">
              <v-alert-title>⚠️ ATENÇÃO - Operação Irreversível</v-alert-title>
              <p>Esta operação irá resetar permanentemente as estatísticas dos usuários. Esta ação NÃO pode ser desfeita!</p>
            </v-alert>

            <!-- Estatísticas Atuais -->
            <v-card variant="outlined" class="mb-6">
              <v-card-title class="d-flex align-center justify-space-between">
                📊 Estatísticas Atuais da Plataforma
                <div class="d-flex gap-2">
                  <v-btn 
                    icon 
                    variant="text" 
                    color="info"
                    @click="debugUserStats"
                    title="Debug Estatísticas"
                  >
                    <v-icon icon="ri-bug-line" />
                  </v-btn>
                  <v-btn 
                    icon 
                    variant="text" 
                    color="primary"
                    @click="loadCurrentStats"
                    :loading="isLoadingStats"
                    title="Recarregar"
                  >
                    <v-icon icon="ri-refresh-line" />
                  </v-btn>
                </div>
              </v-card-title>
              <v-card-text>
                <v-row>
                  <v-col cols="6" md="3">
                    <v-sheet class="pa-3 text-center rounded" color="primary" variant="tonal">
                      <div class="text-h4 font-weight-bold">{{ totalUsers }}</div>
                      <div class="text-body-2">Total Usuários</div>
                    </v-sheet>
                  </v-col>
                  <v-col cols="6" md="3">
                    <v-sheet class="pa-3 text-center rounded" color="success" variant="tonal">
                      <div class="text-h4 font-weight-bold">{{ onlineUsers }}</div>
                      <div class="text-body-2">Usuários Online</div>
                    </v-sheet>
                  </v-col>
                  <v-col cols="6" md="3">
                    <v-sheet class="pa-3 text-center rounded" color="info" variant="tonal">
                      <div class="text-h4 font-weight-bold">{{ totalEstacoes }}</div>
                      <div class="text-body-2">Total Estações</div>
                    </v-sheet>
                  </v-col>
                  <v-col cols="6" md="3">
                    <v-sheet class="pa-3 text-center rounded" color="warning" variant="tonal">
                      <div class="text-h4 font-weight-bold">{{ averageScore.toFixed(1) }}</div>
                      <div class="text-body-2">Média Geral</div>
                    </v-sheet>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>

            <!-- Opções de Reset -->
            <v-card variant="outlined" class="mb-6">
              <v-card-title>🎯 Opções de Reset</v-card-title>
              <v-card-text>
                <v-row>
                  <v-col cols="12" md="4">
                    <v-card class="pa-4" variant="tonal" color="primary">
                      <h4 class="mb-3">Reset apenas Status</h4>
                      <p class="text-body-2 mb-4">Coloca todos os usuários como offline</p>
                      <v-btn
                        color="primary"
                        size="large"
                        block
                        :loading="isResetting && resetType === 'status'"
                        @click="confirmReset('status')"
                      >
                        <v-icon start icon="ri-user-line" />
                        Reset Status
                      </v-btn>
                    </v-card>
                  </v-col>
                  
                  <v-col cols="12" md="4">
                    <v-card class="pa-4" variant="tonal" color="warning">
                      <h4 class="mb-3">Reset apenas Estatísticas</h4>
                      <p class="text-body-2 mb-4">Zera apenas notas, estações e progresso</p>
                      <v-btn
                        color="warning"
                        size="large"
                        block
                        :loading="isResetting && resetType === 'stats'"
                        @click="confirmReset('stats')"
                      >
                        <v-icon start icon="ri-bar-chart-line" />
                        Reset Estatísticas
                      </v-btn>
                    </v-card>
                  </v-col>
                  
                  <v-col cols="12" md="4">
                    <v-card class="pa-4" variant="tonal" color="error">
                      <h4 class="mb-3">Reset Completo</h4>
                      <p class="text-body-2 mb-4">Reset total: status + estatísticas</p>
                      <v-btn
                        color="error"
                        size="large"
                        block
                        :loading="isResetting && resetType === 'complete'"
                        @click="confirmReset('complete')"
                      >
                        <v-icon start icon="ri-refresh-line" />
                        Reset Completo
                      </v-btn>
                    </v-card>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>

            <!-- Progress Bar -->
            <v-card variant="outlined" v-if="isResetting" class="mb-6">
              <v-card-title>⚡ Progresso da Operação</v-card-title>
              <v-card-text>
                <v-progress-linear
                  :model-value="progressPercentage"
                  height="25"
                  rounded
                  color="primary"
                  class="mb-3"
                >
                  <template #default="{ value }">
                    <strong>{{ Math.ceil(value) }}%</strong>
                  </template>
                </v-progress-linear>
                <p class="text-center">
                  {{ processedUsers }} de {{ totalUsers }} usuários processados
                </p>
              </v-card-text>
            </v-card>

            <!-- Log de Operações -->
            <v-card variant="outlined" v-if="operationLog.length > 0">
              <v-card-title>📋 Log de Operações</v-card-title>
              <v-card-text>
                <v-timeline density="compact" side="end">
                  <v-timeline-item
                    v-for="(log, index) in operationLog"
                    :key="index"
                    :color="log.type === 'success' ? 'success' : log.type === 'error' ? 'error' : 'info'"
                    size="small"
                  >
                    <template #icon>
                      <v-icon 
                        :icon="log.type === 'success' ? 'ri-check-line' : log.type === 'error' ? 'ri-close-line' : 'ri-information-line'"
                      />
                    </template>
                    
                    <div class="d-flex align-center justify-space-between">
                      <span>{{ log.message }}</span>
                      <small class="text-medium-emphasis">{{ formatTime(log.timestamp) }}</small>
                    </div>
                  </v-timeline-item>
                </v-timeline>
              </v-card-text>
            </v-card>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Dialog de Confirmação -->
    <v-dialog v-model="showConfirmDialog" max-width="500">
      <v-card>
        <v-card-title class="text-error">
          <v-icon icon="ri-alert-line" class="me-2" />
          Confirmar Reset
        </v-card-title>
        
        <v-card-text>
          <p class="mb-4">
            Você está prestes a executar um <strong>{{ getResetTypeText() }}</strong>.
          </p>
          
          <v-alert type="error" variant="tonal" class="mb-4">
            Esta operação é <strong>IRREVERSÍVEL</strong> e afetará <strong>{{ totalUsers }} usuários</strong>.
          </v-alert>
          
          <p>Digite <strong>"CONFIRMAR RESET"</strong> para continuar:</p>
          <v-text-field
            v-model="confirmationText"
            label="Digite para confirmar"
            variant="outlined"
            density="compact"
            hide-details
            class="mt-2"
          />
        </v-card-text>
        
        <v-card-actions>
          <v-spacer />
          <v-btn
            color="grey"
            variant="text"
            @click="showConfirmDialog = false"
          >
            Cancelar
          </v-btn>
          <v-btn
            color="error"
            variant="elevated"
            :disabled="confirmationText !== 'CONFIRMAR RESET'"
            :loading="isResetting"
            @click="executeReset"
          >
            Executar Reset
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { useAdminAuth } from '@/composables/useAdminAuth';
import { currentUser } from '@/plugins/auth';
import { db } from '@/plugins/firebase';
import { collection, doc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore';
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

// Verificação de admin
const { isAuthorizedAdmin, isLoading, isAdmin, hasAdminRole } = useAdminAuth();
const router = useRouter();

// Debug das verificações de admin
watch([isAuthorizedAdmin, isLoading, isAdmin, hasAdminRole], () => {
  // console.log('Admin auth state changed:', {
  //   isAuthorizedAdmin: isAuthorizedAdmin.value,
  //   isLoading: isLoading.value,
  //   isAdmin: isAdmin.value,
  //   hasAdminRole: hasAdminRole.value,
  //   currentUser: currentUser.value
  // });
}, { immediate: true });

// Não redirecionar automaticamente - deixar o usuário ver a mensagem

// Estados reativos
const totalUsers = ref(0);
const onlineUsers = ref(0);
const totalEstacoes = ref(0);
const averageScore = ref(0);
const isResetting = ref(false);
const isLoadingStats = ref(false);
const resetType = ref('');
const showConfirmDialog = ref(false);
const confirmationText = ref('');
const operationLog = ref([]);
const processedUsers = ref(0);

// Computed para progresso
const progressPercentage = computed(() => {
  if (totalUsers.value === 0) return 0;
  return (processedUsers.value / totalUsers.value) * 100;
});

// Carregar estatísticas iniciais
onMounted(async () => {
  await loadCurrentStats();
});

async function loadCurrentStats() {
  try {
    isLoadingStats.value = true;
    const usersSnapshot = await getDocs(collection(db, 'usuarios'));
    totalUsers.value = usersSnapshot.size;
    
    let onlineCount = 0;
    let totalScore = 0;
    let scoreCount = 0;
    let totalEstacoesCount = 0;
    
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      
      // Verificar status online
      if (data.status === 'online' || 
          data.status === 'disponivel' || 
          data.status === 'disponível' || 
          data.status === 'ativo') {
        onlineCount++;
      }
      
      if (data.estatisticas?.mediaGeral) {
        totalScore += data.estatisticas.mediaGeral;
        scoreCount++;
      }
      
      if (data.estatisticas?.totalEstacoesFeitas) {
        totalEstacoesCount += data.estatisticas.totalEstacoesFeitas;
      }
    });
    
    onlineUsers.value = onlineCount;
    totalEstacoes.value = totalEstacoesCount;
    averageScore.value = scoreCount > 0 ? totalScore / scoreCount : 0;
    
  } catch (error) {
    console.error('Erro ao carregar estatísticas:', error);
    addLog('error', 'Erro ao carregar estatísticas atuais');
  } finally {
    isLoadingStats.value = false;
  }
}

function confirmReset(type) {
  resetType.value = type;
  showConfirmDialog.value = true;
  confirmationText.value = '';
}

function getResetTypeText() {
  switch (resetType.value) {
    case 'status': return 'RESET DE STATUS';
    case 'stats': return 'RESET DE ESTATÍSTICAS';
    case 'complete': return 'RESET COMPLETO';
    default: return 'RESET';
  }
}

async function executeReset() {
  isResetting.value = true;
  showConfirmDialog.value = false;
  processedUsers.value = 0;
  
  try {
    addLog('info', `Iniciando ${getResetTypeText().toLowerCase()}...`);
    
    if (resetType.value === 'status') {
      await executeStatusReset();
    } else if (resetType.value === 'stats') {
      await executeStatsReset();
    } else if (resetType.value === 'complete') {
      await executeCompleteReset();
    }
    
    addLog('success', 'Reset executado com sucesso!');
    await loadCurrentStats(); // Recarregar estatísticas
    
  } catch (error) {
    console.error('Erro durante o reset:', error);
    addLog('error', `Erro durante o reset: ${error.message}`);
  } finally {
    isResetting.value = false;
    resetType.value = '';
    processedUsers.value = 0;
  }
}

async function executeStatusReset() {
  const usersSnapshot = await getDocs(collection(db, 'usuarios'));
  
  for (const userDoc of usersSnapshot.docs) {
    try {
      const userRef = doc(db, 'usuarios', userDoc.id);
      await updateDoc(userRef, {
        status: 'offline',
        dataUltimaAtualizacao: serverTimestamp()
      });
      
      processedUsers.value++;
      
    } catch (error) {
      console.error(`❌ Erro ao resetar status do usuário ${userDoc.id}:`, error);
    }
  }
  
  addLog('success', `Status resetado para ${processedUsers.value} usuários`);
}

async function executeStatsReset() {
  const usersSnapshot = await getDocs(collection(db, 'usuarios'));
  
  
  for (const userDoc of usersSnapshot.docs) {
    try {
      const userRef = doc(db, 'usuarios', userDoc.id);
      const userData = userDoc.data();
      
      
      // Objeto completo de reset - TODOS os campos de estatísticas
      const resetData = {
        // ======= CAMPOS PRINCIPAIS DE ESTATÍSTICAS =======
        estatisticas: {
          totalEstacoesFeitas: 0,
          estacoesPorEspecialidade: {},
          mediaGeral: 0,
          melhorNota: 0,
          piorNota: 0,
          tempoTotalTreinamento: 0,
          ultimaAtividade: null,
          progressoSemanal: [],
          rankingPosicao: null,
          totalPontos: 0,
          sessoesCompletadas: 0,
          tempoMedioSessao: 0,
          diasConsecutivos: 0,
          ultimaSessao: null
        },
        
        // ======= ARRAYS DE HISTÓRICO =======
        estacoesConcluidas: [], // ESTE É O PRINCIPAL!
        historicoSimulacoes: [],
        historicoEstacoes: [],
        
        // ======= ESTATÍSTICAS DETALHADAS =======
        statistics: {}, // Limpar o mapa de estatísticas por especialidade
        
        // ======= NÍVEL E PONTUAÇÃO =======
        nivelHabilidade: 0, // Zerar nível de habilidade
        score: 0,
        totalScore: 0,
        
        // ======= PROGRESSO =======
        progresso: {
          nivelAtual: 'Iniciante',
          pontosExperiencia: 0,
          conquistas: [],
          metasSemana: {
            estacoesPlanejadas: 0,
            estacoesRealizadas: 0,
            progresso: 0
          },
          nivel: 'Iniciante',
          experiencia: 0,
          badges: [],
          streak: 0
        },
        
        // ======= OUTROS CAMPOS DE PERFORMANCE =======
        performance: {},
        pontuacoes: {},
        resultados: {},
        ranking: null,
        
        // ======= TIMESTAMP =======
        dataUltimaAtualizacao: serverTimestamp()
      };
      
      await updateDoc(userRef, resetData);
      
      processedUsers.value++;
      
    } catch (error) {
      console.error(`❌ Erro ao resetar estatísticas do usuário ${userDoc.id}:`, error);
      addLog('error', `Erro ao resetar usuário ${userDoc.id}: ${error.message}`);
    }
  }
  
  addLog('success', `Estatísticas resetadas para ${processedUsers.value} usuários`);
}

async function executeCompleteReset() {
  const usersSnapshot = await getDocs(collection(db, 'usuarios'));
  
  
  for (const userDoc of usersSnapshot.docs) {
    try {
      const userRef = doc(db, 'usuarios', userDoc.id);
      const userData = userDoc.data();
      
      
      // Reset completo: status + todas as estatísticas
      const resetData = {
        // ======= STATUS =======
        status: 'offline',
        ultimoLogin: serverTimestamp(),
        
        // ======= CAMPOS PRINCIPAIS DE ESTATÍSTICAS =======
        estatisticas: {
          totalEstacoesFeitas: 0,
          estacoesPorEspecialidade: {},
          mediaGeral: 0,
          melhorNota: 0,
          piorNota: 0,
          tempoTotalTreinamento: 0,
          ultimaAtividade: null,
          progressoSemanal: [],
          rankingPosicao: null,
          totalPontos: 0,
          sessoesCompletadas: 0,
          tempoMedioSessao: 0,
          diasConsecutivos: 0,
          ultimaSessao: null
        },
        
        // ======= ARRAYS DE HISTÓRICO =======
        estacoesConcluidas: [], // PRINCIPAL!
        historicoSimulacoes: [],
        historicoEstacoes: [],
        
        // ======= ESTATÍSTICAS DETALHADAS =======
        statistics: {}, // Limpar estatísticas por especialidade
        
        // ======= NÍVEL E PONTUAÇÃO =======
        nivelHabilidade: 0, // Zerar nível de habilidade
        score: 0,
        totalScore: 0,
        
        // ======= PROGRESSO =======
        progresso: {
          nivelAtual: 'Iniciante',
          pontosExperiencia: 0,
          conquistas: [],
          metasSemana: {
            estacoesPlanejadas: 0,
            estacoesRealizadas: 0,
            progresso: 0
          },
          nivel: 'Iniciante',
          experiencia: 0,
          badges: [],
          streak: 0
        },
        
        // ======= OUTROS CAMPOS =======
        performance: {},
        pontuacoes: {},
        resultados: {},
        ranking: null,
        
        // ======= TIMESTAMP =======
        dataUltimaAtualizacao: serverTimestamp()
      };
      
      await updateDoc(userRef, resetData);
      
      processedUsers.value++;
      
    } catch (error) {
      console.error(`❌ Erro no reset completo do usuário ${userDoc.id}:`, error);
      addLog('error', `Erro no reset completo do usuário ${userDoc.id}: ${error.message}`);
    }
  }
  
  addLog('success', `Reset completo executado para ${processedUsers.value} usuários`);
}

function addLog(type, message) {
  operationLog.value.unshift({
    type,
    message,
    timestamp: new Date()
  });
  
  // Manter apenas os últimos 10 logs
  if (operationLog.value.length > 10) {
    operationLog.value = operationLog.value.slice(0, 10);
  }
}

async function debugUserStats() {
  try {
    const usersSnapshot = await getDocs(collection(db, 'usuarios'));
    
    
    usersSnapshot.forEach((doc, index) => {
      const data = doc.data();
      const userInfo = {
        id: doc.id,
        email: data.email || 'Sem email',
        // CAMPOS PRINCIPAIS DE ESTATÍSTICAS
        estacoesConcluidas: data.estacoesConcluidas ? data.estacoesConcluidas.length : 0,
        nivelHabilidade: data.nivelHabilidade || 0,
        statistics: data.statistics || 'Vazio',
        estatisticas: data.estatisticas || 'Não definido',
        progresso: data.progresso || 'Não definido',
        historicoSimulacoes: data.historicoSimulacoes ? data.historicoSimulacoes.length : 0
      };
      
      
      // Verificar especificamente campos críticos
      if (data.estacoesConcluidas && data.estacoesConcluidas.length > 0) {
      }
      
      if (data.statistics && Object.keys(data.statistics).length > 0) {
      }
      
      if (data.nivelHabilidade && data.nivelHabilidade > 0) {
      }
    });
    
    addLog('info', 'Debug de estatísticas concluído - verifique o console');
    
  } catch (error) {
    console.error('❌ Erro no debug:', error);
    addLog('error', 'Erro ao fazer debug das estatísticas');
  }
}

function formatTime(date) {
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}
</script>

<style scoped>
.admin-reset-card {
  border-radius: 16px;
  box-shadow: 0 4px 24px 0 rgba(123, 31, 162, 0.12);
}

.v-alert {
  border-radius: 12px;
}

.v-card {
  border-radius: 12px;
}

.v-btn {
  border-radius: 8px;
}
</style>
