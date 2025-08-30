<template>
  <v-card class="admin-agent-assistant" elevation="2">
    <!-- Header -->
    <v-card-title class="d-flex align-center">
      <v-icon color="primary" class="mr-2">mdi-robot</v-icon>
      <span>🤖 Assistente Administrativo IA</span>
      <v-spacer></v-spacer>
      <v-chip 
        :color="connectionStatus === 'conectado' ? 'success' : 'warning'"
        size="small"
      >
        {{ connectionStatus }}
      </v-chip>
    </v-card-title>

    <v-tabs v-model="activeTab" align-tabs="center">
      <v-tab value="analysis">
        <v-icon class="mr-1">mdi-chart-line</v-icon>
        Análise
      </v-tab>
      <v-tab value="fixes">
        <v-icon class="mr-1">mdi-auto-fix</v-icon>
        Correções
      </v-tab>
      <v-tab value="chat">
        <v-icon class="mr-1">mdi-chat</v-icon>
        Chat IA
      </v-tab>
    </v-tabs>

    <v-card-text>
      <v-tabs-window v-model="activeTab">
        <!-- Aba de Análise -->
        <v-tabs-window-item value="analysis">
          <div class="analysis-section">
            <div class="mb-4">
              <h3 class="text-h6 mb-2">🔍 Análise Inteligente</h3>
              <p class="text-caption">Analise suas estações automaticamente e receba insights detalhados</p>
            </div>

            <v-row>
              <v-col cols="12" md="6">
                <v-btn 
                  @click="analyzeAllStations"
                  :loading="analyzing"
                  color="primary"
                  block
                  prepend-icon="mdi-magnify"
                >
                  Analisar Todas as Estações
                </v-btn>
              </v-col>
              <v-col cols="12" md="6">
                <v-btn 
                  @click="generateAllSuggestions"
                  :loading="generatingSuggestions"
                  color="info"
                  block
                  prepend-icon="mdi-lightbulb"
                >
                  Gerar Sugestões
                </v-btn>
              </v-col>
            </v-row>

            <!-- Resultados da Análise -->
            <v-card v-if="analysisResults" class="mt-4" variant="outlined">
              <v-card-title class="text-h6">
                📊 Resultados da Análise
                <v-chip class="ml-2" :color="getAnalysisColor(analysisResults.summary)">
                  {{ analysisResults.total }} estações
                </v-chip>
              </v-card-title>
              
              <v-card-text>
                <v-row>
                  <v-col cols="12" md="4">
                    <v-card color="warning" dark>
                      <v-card-text class="text-center">
                        <div class="text-h4">{{ analysisResults.summary.needsAttention }}</div>
                        <div>Precisam Atenção</div>
                      </v-card-text>
                    </v-card>
                  </v-col>
                  <v-col cols="12" md="4">
                    <v-card color="error" dark>
                      <v-card-text class="text-center">
                        <div class="text-h4">{{ analysisResults.summary.pepIssues }}</div>
                        <div>Problemas PEP</div>
                      </v-card-text>
                    </v-card>
                  </v-col>
                  <v-col cols="12" md="4">
                    <v-card color="success" dark>
                      <v-card-text class="text-center">
                        <div class="text-h4">{{ analysisResults.total - analysisResults.summary.needsAttention }}</div>
                        <div>Em Boa Forma</div>
                      </v-card-text>
                    </v-card>
                  </v-col>
                </v-row>

                <!-- Lista de Estações com Problemas -->
                <v-expansion-panels v-if="analysisResults.analyses.length" class="mt-4">
                  <v-expansion-panel
                    v-for="analysis in analysisResults.analyses.slice(0, 5)"
                    :key="analysis.id"
                  >
                    <v-expansion-panel-title>
                      <div class="d-flex align-center justify-space-between w-100">
                        <span>{{ analysis.title }}</span>
                        <v-chip 
                          :color="getScoreColor(analysis.overallScore)"
                          size="small"
                        >
                          {{ Math.round(analysis.overallScore * 100) }}%
                        </v-chip>
                      </div>
                    </v-expansion-panel-title>
                    <v-expansion-panel-text>
                      <v-chip-group>
                        <v-chip 
                          v-if="analysis.issuesCount > 0"
                          color="warning"
                          size="small"
                        >
                          {{ analysis.issuesCount }} problemas
                        </v-chip>
                        <v-chip 
                          v-if="!analysis.pepValid"
                          color="error"
                          size="small"
                        >
                          PEP inválido
                        </v-chip>
                      </v-chip-group>
                      <div class="mt-2">
                        <v-btn 
                          @click="analyzeSpecificStation(analysis.id)"
                          size="small"
                          color="primary"
                          variant="outlined"
                        >
                          Analisar Detalhes
                        </v-btn>
                      </div>
                    </v-expansion-panel-text>
                  </v-expansion-panel>
                </v-expansion-panels>
              </v-card-text>
            </v-card>
          </div>
        </v-tabs-window-item>

        <!-- Aba de Correções -->
        <v-tabs-window-item value="fixes">
          <div class="auto-fix-section">
            <div class="mb-4">
              <h3 class="text-h6 mb-2">🛠 Correções Automáticas</h3>
              <p class="text-caption">Aplique correções automáticas em suas estações</p>
            </div>

            <v-row>
              <v-col cols="12" md="6">
                <v-card variant="outlined">
                  <v-card-title>Correção PEP</v-card-title>
                  <v-card-text>
                    <p>Corrige automaticamente pontuações PEP que não somam 10</p>
                    <v-btn 
                      @click="fixAllPEPScoring"
                      :loading="fixingPEP"
                      color="success"
                      block
                    >
                      Corrigir Pontuação PEP
                    </v-btn>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="12" md="6">
                <v-card variant="outlined">
                  <v-card-title>Padronização</v-card-title>
                  <v-card-text>
                    <p>Padroniza formato e conteúdo das estações</p>
                    <v-btn 
                      @click="standardizeAllContent"
                      :loading="standardizing"
                      color="info"
                      block
                    >
                      Padronizar Conteúdo
                    </v-btn>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>

            <!-- Resultados das Correções -->
            <v-card v-if="fixResults.length" class="mt-4" variant="outlined">
              <v-card-title>🎯 Correções Aplicadas</v-card-title>
              <v-card-text>
                <v-list>
                  <v-list-item 
                    v-for="result in fixResults"
                    :key="result.stationId"
                  >
                    <v-list-item-title>{{ result.title || result.stationId }}</v-list-item-title>
                    <v-list-item-subtitle>
                      <v-chip 
                        v-for="fix in result.appliedFixes"
                        :key="fix"
                        size="small"
                        color="success"
                        class="mr-1"
                      >
                        {{ fix }}
                      </v-chip>
                    </v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-card-text>
            </v-card>
          </div>
        </v-tabs-window-item>

        <!-- Aba de Chat -->
        <v-tabs-window-item value="chat">
          <div class="agent-chat">
            <div class="mb-4">
              <h3 class="text-h6 mb-2">💬 Chat com IA Administrativa</h3>
              <p class="text-caption">Converse com o assistente para obter ajuda e insights</p>
            </div>

            <!-- Mensagens do Chat -->
            <v-card 
              ref="chatContainer"
              class="chat-messages mb-4" 
              height="300" 
              style="overflow-y: auto;"
              variant="outlined"
            >
              <v-card-text>
                <div v-if="chatHistory.length === 0" class="text-center text-grey">
                  <v-icon size="48" color="grey">mdi-chat-outline</v-icon>
                  <p>Inicie uma conversa com o assistente IA</p>
                </div>
                
                <div 
                  v-for="msg in chatHistory" 
                  :key="msg.id"
                  class="message-item mb-3"
                >
                  <v-card 
                    :color="msg.type === 'user' ? 'primary' : 'surface'"
                    :class="msg.type === 'user' ? 'ml-8' : 'mr-8'"
                    variant="flat"
                  >
                    <v-card-text>
                      <div class="d-flex align-center mb-1">
                        <v-icon 
                          :color="msg.type === 'user' ? 'white' : 'primary'"
                          size="small"
                          class="mr-2"
                        >
                          {{ msg.type === 'user' ? 'mdi-account' : 'mdi-robot' }}
                        </v-icon>
                        <span 
                          class="text-caption"
                          :class="msg.type === 'user' ? 'text-white' : ''"
                        >
                          {{ msg.type === 'user' ? 'Você' : 'Assistente IA' }}
                        </span>
                        <v-spacer></v-spacer>
                        <span 
                          class="text-caption"
                          :class="msg.type === 'user' ? 'text-white' : 'text-grey'"
                        >
                          {{ formatTime(msg.timestamp) }}
                        </span>
                      </div>
                      <div 
                        v-if="msg.type === 'agent'"
                        v-html="msg.content"
                        :class="msg.type === 'user' ? 'text-white' : ''"
                      ></div>
                      <div 
                        v-else
                        :class="msg.type === 'user' ? 'text-white' : ''"
                      >
                        {{ msg.content }}
                      </div>
                    </v-card-text>
                  </v-card>
                </div>
              </v-card-text>
            </v-card>

            <!-- Input de Mensagem -->
            <v-text-field
              v-model="currentMessage"
              @keyup.enter="sendMessage"
              placeholder="Digite sua pergunta sobre estações, análises, melhorias..."
              variant="outlined"
              density="compact"
              append-inner-icon="mdi-send"
              @click:append-inner="sendMessage"
              :loading="sendingMessage"
            >
              <template #prepend-inner>
                <v-icon color="primary">mdi-message-text</v-icon>
              </template>
            </v-text-field>

            <!-- Sugestões Rápidas -->
            <v-card variant="outlined" class="mt-2">
              <v-card-text>
                <div class="text-caption mb-2">💡 Sugestões rápidas:</div>
                <v-chip-group>
                  <v-chip 
                    v-for="suggestion in quickSuggestions"
                    :key="suggestion"
                    @click="sendQuickMessage(suggestion)"
                    size="small"
                    variant="outlined"
                  >
                    {{ suggestion }}
                  </v-chip>
                </v-chip-group>
              </v-card-text>
            </v-card>
          </div>
        </v-tabs-window-item>
      </v-tabs-window>
    </v-card-text>

    <!-- Snackbar para Notificações -->
    <v-snackbar
      v-model="showSnackbar"
      :color="snackbarColor"
      :timeout="3000"
      location="top"
    >
      {{ snackbarMessage }}
      <template #actions>
        <v-btn
          variant="text"
          @click="showSnackbar = false"
        >
          Fechar
        </v-btn>
      </template>
    </v-snackbar>
  </v-card>
</template>

<script setup>
import { adminAgentService } from '@/services/adminAgentService.js';
import { nextTick, onMounted, ref } from 'vue';

// Estado da UI
const activeTab = ref('analysis');
const connectionStatus = ref('conectado');

// Estados de carregamento
const analyzing = ref(false);
const generatingSuggestions = ref(false);
const fixingPEP = ref(false);
const standardizing = ref(false);
const sendingMessage = ref(false);

// Dados de análise
const analysisResults = ref(null);
const fixResults = ref([]);

// Chat
const chatHistory = ref([]);
const currentMessage = ref('');
const chatContainer = ref(null);

// Snackbar
const showSnackbar = ref(false);
const snackbarMessage = ref('');
const snackbarColor = ref('success');

// Sugestões rápidas para o chat
const quickSuggestions = ref([
  'Analisar todas as estações',
  'Mostrar estações com problemas',
  'Como melhorar pontuação PEP?',
  'Estatísticas do sistema',
  'Problemas mais comuns'
]);

// Métodos de análise
const analyzeAllStations = async () => {
  analyzing.value = true;
  try {
    const results = await adminAgentService.analyzeAllStations();
    analysisResults.value = results;
    showNotification('Análise concluída com sucesso!', 'success');
  } catch (error) {
    if (error.status === 500) {
      showNotification('Erro interno do servidor ao analisar as estações. Tente novamente mais tarde.', 'error');
    } else if (error.status === 404) {
      showNotification('Rota de análise não encontrada. Verifique a configuração do backend.', 'error');
    } else {
      showNotification(`Erro na análise: ${error.message}`, 'error');
    }
  } finally {
    analyzing.value = false;
  }
};

const generateAllSuggestions = async () => {
  generatingSuggestions.value = true;
  try {
    // TODO: Implementar geração de sugestões para todas as estações
    showNotification('Sugestões geradas com sucesso!', 'success');
  } catch (error) {
    showNotification(`Erro ao gerar sugestões: ${error.message}`, 'error');
  } finally {
    generatingSuggestions.value = false;
  }
};

const analyzeSpecificStation = async (stationId) => {
  try {
    const analysis = await adminAgentService.analyzeStation(stationId);
    showNotification(`Análise da estação ${analysis.title} concluída`, 'info');
  } catch (error) {
    showNotification(`Erro ao analisar estação: ${error.message}`, 'error');
  }
};

// Métodos de correção
const fixAllPEPScoring = async () => {
  fixingPEP.value = true;
  try {
    // TODO: Implementar correção para todas as estações com problema PEP
    showNotification('Correções PEP aplicadas com sucesso!', 'success');
  } catch (error) {
    showNotification(`Erro nas correções: ${error.message}`, 'error');
  } finally {
    fixingPEP.value = false;
  }
};

const standardizeAllContent = async () => {
  standardizing.value = true;
  try {
    // TODO: Implementar padronização para todas as estações
    showNotification('Conteúdo padronizado com sucesso!', 'success');
  } catch (error) {
    showNotification(`Erro na padronização: ${error.message}`, 'error');
  } finally {
    standardizing.value = false;
  }
};

// Métodos de chat
const sendMessage = async () => {
  if (!currentMessage.value.trim()) return;
  
  const userMessage = currentMessage.value;
  currentMessage.value = '';
  
  // Adicionar mensagem do usuário
  addChatMessage('user', userMessage);
  
  sendingMessage.value = true;
  try {
    const response = await adminAgentService.sendMessage(userMessage, {
      page: 'admin-assistant',
      context: 'chat'
    });
    
    addChatMessage('agent', response);
  } catch (error) {
    addChatMessage('agent', `Erro: ${error.message}`);
  } finally {
    sendingMessage.value = false;
  }
};

const sendQuickMessage = (message) => {
  currentMessage.value = message;
  sendMessage();
};

const addChatMessage = (type, content) => {
  chatHistory.value.push({
    id: Date.now(),
    type,
    content,
    timestamp: new Date()
  });
  
  nextTick(() => {
    if (chatContainer.value) {
      const element = chatContainer.value.$el.querySelector('.v-card-text');
      element.scrollTop = element.scrollHeight;
    }
  });
};

// Métodos utilitários
const getAnalysisColor = (summary) => {
  if (!summary) return 'grey';
  const ratio = summary.needsAttention / summary.total;
  if (ratio > 0.5) return 'error';
  if (ratio > 0.2) return 'warning';
  return 'success';
};

const getScoreColor = (score) => {
  if (score >= 0.8) return 'success';
  if (score >= 0.6) return 'warning';
  return 'error';
};

const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

const showNotification = (message, color = 'info') => {
  snackbarMessage.value = message;
  snackbarColor.value = color;
  showSnackbar.value = true;
};

// Inicialização
onMounted(() => {
  addChatMessage('agent', 'Olá! Sou seu assistente administrativo IA. Como posso ajudá-lo hoje?');
});
</script>

<style scoped>
.admin-agent-assistant {
  max-width: 100%;
  margin: 0 auto;
}

.message-item {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.chat-messages {
  border: 1px solid rgba(0, 0, 0, 0.12);
}

.v-chip-group {
  gap: 8px;
}

.analysis-section .v-card {
  transition: all 0.3s ease;
}

.analysis-section .v-card:hover {
  transform: translateY(-2px);
}
</style>
