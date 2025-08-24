<script setup>
// Imports
import { db } from '@/plugins/firebase.js';
import { backendUrl } from '@/utils/backendUrl.js';
import { doc, getDoc } from 'firebase/firestore';
import { onMounted, onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

// Refs para dados da estação
const stationData = ref(null);
const isLoading = ref(true);
const errorMessage = ref('');

// Refs para criação de sessão
const isCreatingSession = ref(false);
const sessionError = ref('');

// Dados da rota e navegação
const route = useRoute();
const router = useRouter();

const stationId = ref(null);

// Controle do estado offline
const isOfflineMode = ref(false);
let connectionTimeoutId = null;

// --- Função para Buscar Dados da Estação ---
async function fetchStationData(currentStationId) {
  if (!currentStationId) { 
    errorMessage.value = 'ID da estação inválido.';
    isLoading.value = false; 
    return; 
  }
  
  isLoading.value = true; 
  errorMessage.value = '';
  console.log(`FETCH: Buscando Estação ID: ${currentStationId} em 'estacoes_clinicas'`);
  
  try {
    // Busca dados no Firestore
    const docRef = doc(db, "estacoes_clinicas", currentStationId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      console.log("FETCH: Estação encontrada:", docSnap.id);
      stationData.value = { id: docSnap.id, ...docSnap.data() };
    } else {
      console.warn(`FETCH: Estação ID ${currentStationId} não encontrada.`);
      errorMessage.value = 'Estação não encontrada.';
      startOfflineMode("Estação não encontrada");
    }
  } catch (error) {
    console.error("FETCH: Erro ao buscar dados da estação:", error);
    errorMessage.value = `Erro ao buscar dados: ${error.message}`;
    startOfflineMode("Erro ao buscar dados da estação");
  } finally {
    isLoading.value = false; 
    console.log("FETCH: Finalizado. isLoading:", isLoading.value, "stationData:", !!stationData.value);
  }
}

// --- Função para iniciar o modo offline ---
function startOfflineMode(reason = "Razão desconhecida") {
  // Evita iniciar o modo offline múltiplas vezes
  if (isOfflineMode.value) {
    console.log(`Já está em modo offline (razão: ${reason}), ignorando nova chamada`);
    return;
  }
  
  console.log(`Iniciando modo offline (razão: ${reason})`);
  isOfflineMode.value = true;
  
  // Limpa o timeout de conexão se existir
  if (connectionTimeoutId) {
    clearTimeout(connectionTimeoutId);
    connectionTimeoutId = null;
  }
  
  // Exibe mensagem ao usuário sobre o modo offline
  errorMessage.value = `Modo offline ativado: ${reason}. Alguns recursos podem estar limitados.`;
}

// --- Formatação para exibição do conteúdo ---
function formatItemDescriptionForDisplay(descriptionText, itemTitle = '') {
  if (!descriptionText || typeof descriptionText !== 'string') {
    return descriptionText || '';
  }
  let desc = descriptionText.trim();

  // Remove o nome do item do início da descrição (ex: "Apresentação: ...")
  if (itemTitle) {
    const regex = new RegExp('^' + itemTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\s*:', 'i');
    desc = desc.replace(regex, '').trim();
  } else {
    desc = desc.replace(/^([^:]+):/, '').trim();
  }

  // Remove 'e,' e 'e' desnecessários
  desc = desc.replace(/\s+e,?\s+/g, ', ');
  desc = desc.replace(/,\s*,/g, ','); // remove vírgulas duplas
  desc = desc.replace(/,\s*\./g, '.'); // remove vírgula antes de ponto final
  desc = desc.replace(/,\s*$/g, ''); // remove vírgula no final
  desc = desc.replace(/,\s*\(/g, ' ('); // Remove vírgula antes de parênteses

  // Substitui '\n' e ';' por <br>
  desc = desc.replace(/\\n/g, '<br>').replace(/;/g, '<br>');

  // Coloca em negrito apenas o que vem antes dos dois pontos, exceto se estiver entre parênteses
  desc = desc.replace(/(^|<br>)([^<\(\)\n:]+?):/g, '$1<strong>$2:</strong>');

  return desc;
}

// Função para formatar texto do roteiro do ator
function formatActorText(text) {
  if (!text) return '';
  
  // Remove tags HTML existentes mantendo o texto
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = text;
  const plainText = tempDiv.innerText;
  
  // Separa o texto em linhas, considerando múltiplos tipos de quebras
  const lines = plainText
    .split(/[\n\r]+/)
    .map(line => line.trim())
    .filter(line => line);
  
  // Formata cada linha e seus subitens
  const formattedLines = lines.map(line => {
    // Primeiro, procura por ":"
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const label = line.substring(0, colonIndex).trim();
      let value = line.substring(colonIndex + 1).trim();
      
      // Só formata se tivermos texto antes e depois dos dois pontos
      if (label && value) {
        // Remove tags HTML que possam estar presentes
        const cleanLabel = label.replace(/(<([^>]+)>)/gi, '');
        
        // Se houver pontos finais no valor, trata como subitens
        if (value.includes('. ')) {
          const subitems = value
            .split(/\.\s+/)
            .filter(item => item.trim())
            .map((item, index, array) => {
              const cleanItem = item.replace(/(<([^>]+)>)/gi, '');
              // Adiciona ponto final de volta em todos exceto o último
              return index < array.length - 1 ? cleanItem + '.' : cleanItem;
            });

          // Formata cada subitem em itálico
          const formattedSubitems = subitems.map(item => `<em>${item}</em>`);
          return `<p><strong>${cleanLabel}</strong>: ${formattedSubitems.join(' ')}</p>`;
        } else {
          // Sem subitens, formata normalmente
          const cleanValue = value.replace(/(<([^>]+)>)/gi, '');
          return `<p><strong>${cleanLabel}</strong>: <em>${cleanValue}</em></p>`;
        }
      }
    }
    return `<p>${line}</p>`;
  });
  
  return formattedLines.join('');
}

// Formata e processa o roteiro do ator
const processRoteiro = (text) => {
  if (!text) return '';
  return formatActorText(text);
};

// --- Inicialização do componente ---
onMounted(async () => {
  console.log("StationView montado!");
  
  // Extrai o ID da estação da rota
  const routeStationId = route.params.id;
  if (routeStationId) {
    stationId.value = routeStationId;
    console.log(`StationView: ID da estação obtido da rota: ${stationId.value}`);
    await fetchStationData(stationId.value);
  } else {
    errorMessage.value = 'ID da estação não fornecido na rota.';
    console.error("StationView: ID da estação não fornecido na rota");
    isLoading.value = false;
  }
});

// Limpa os recursos quando o componente é desmontado
onUnmounted(() => {
  console.log("StationView desmontado, limpando recursos...");
  
  // Limpa o timeout de conexão se existir
  if (connectionTimeoutId) {
    clearTimeout(connectionTimeoutId);
    connectionTimeoutId = null;
  }
});

// --- Função para voltar para a lista de estações ---
function voltarParaLista() {
  router.push('/app/station-list');
}

// --- Função para iniciar a simulação ---
async function iniciarSimulacao() {
  if (!stationId.value) {
    errorMessage.value = 'Não é possível iniciar a simulação: ID da estação não disponível.';
    return;
  }

  // Verificar se há checklist na estação
  const checklistId = stationData.value?.checklist?.id || stationData.value?.checklistId || stationId.value;
  
  if (!checklistId) {
    errorMessage.value = 'Não é possível iniciar a simulação: Checklist não encontrado.';
    return;
  }

  try {
    isCreatingSession.value = true;
    sessionError.value = '';
    
    console.log(`Criando sessão para estação: ${stationId.value}, checklist: ${checklistId}`);
    
    // Criar sessão no backend
    const response = await fetch(`${backendUrl}/api/create-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        stationId: stationId.value,
        checklistId: checklistId
      }),
    });

    if (!response.ok) {
      throw new Error(`Erro na resposta: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.sessionId) {
      console.log(`Sessão criada com sucesso: ${result.sessionId}`);
      
      // Redirecionar para simulação com os parâmetros corretos
      router.push({
        path: `/app/simulation/${stationId.value}`,
        query: {
          sessionId: result.sessionId, // CORREÇÃO: de 'session' para 'sessionId'
          role: 'actor' // Define o papel padrão como ator
        }
      });
    } else {
      throw new Error('Sessão criada mas sessionId não retornado');
    }

  } catch (error) {
    console.error('Erro ao criar sessão:', error);
    sessionError.value = `Erro ao criar sessão: ${error.message}`;
    errorMessage.value = sessionError.value;
  } finally {
    isCreatingSession.value = false;
  }
}
</script>

<template>
  <div class="station-view-container">
    <!-- Header com informações básicas e botão de voltar -->
    <div class="station-view-header">
      <button @click="voltarParaLista" class="back-button">
        <span class="back-icon">←</span> Voltar para Lista
      </button>
      <h1 v-if="stationData" class="station-title">{{ stationData.tituloEstacao }}</h1>
      <h1 v-else class="station-title">Detalhes da Estação</h1>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-spinner">
      <div class="spinner"></div>
      <p>Carregando dados da estação...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="errorMessage && !stationData" class="error-message">
      <div class="error-icon">⚠️</div>
      <p>{{ errorMessage }}</p>
      <button @click="voltarParaLista" class="retry-btn">Voltar para Lista</button>
    </div>

    <!-- Station Content -->
    <div v-else-if="stationData" class="station-content">
      <!-- Botão para iniciar simulação -->
      <div class="action-buttons">
        <button 
          @click="iniciarSimulacao" 
          :disabled="isCreatingSession" 
          class="start-simulation-button"
          :class="{ 'loading': isCreatingSession }"
        >
          <span v-if="isCreatingSession" class="icon">⏳</span>
          <span v-else class="icon">▶️</span> 
          {{ isCreatingSession ? 'Criando Sessão...' : 'Iniciar Simulação' }}
        </button>
      </div>

      <!-- Erro de sessão -->
      <div v-if="sessionError" class="session-error">
        <div class="error-icon">⚠️</div>
        <p>{{ sessionError }}</p>
      </div>

      <!-- Informações da Estação -->
      <div class="station-info-sections">
        <!-- Seção de Instruções ao Participante -->
        <div class="info-section">
          <h2 class="section-title">📋 Instruções ao Participante</h2>
          
          <div v-if="stationData.instrucoesParticipante" class="instruction-content">
            <!-- Cenário de Atendimento -->
            <div v-if="stationData.instrucoesParticipante.cenarioAtendimento" class="subsection">
              <h3 class="subsection-title">🏥 Cenário de Atendimento</h3>
              <p v-if="stationData.instrucoesParticipante.cenarioAtendimento.descricao" 
                 class="scenario-description" 
                 v-html="stationData.instrucoesParticipante.cenarioAtendimento.descricao">
              </p>
              
              <!-- Infraestrutura da Unidade -->
              <div v-if="stationData.instrucoesParticipante.cenarioAtendimento.infraestruturaUnidade && 
                     stationData.instrucoesParticipante.cenarioAtendimento.infraestruturaUnidade.length > 0" 
                   class="infra-items">
                <h4 class="subsection-subtitle">🔧 Infraestrutura da Unidade</h4>
                <ul class="infra-list">
                  <li v-for="(item, index) in stationData.instrucoesParticipante.cenarioAtendimento.infraestruturaUnidade" 
                      :key="index" 
                      class="infra-item">
                    {{ item }}
                  </li>
                </ul>
              </div>
            </div>
            
            <!-- Tarefas Principais -->
            <div v-if="stationData.instrucoesParticipante.tarefasPrincipais && 
                   stationData.instrucoesParticipante.tarefasPrincipais.length > 0" 
                 class="subsection">
              <h3 class="subsection-title">✅ Tarefas Principais</h3>
              <ol class="tasks-list">
                <li v-for="(task, index) in stationData.instrucoesParticipante.tarefasPrincipais" 
                    :key="index" 
                    class="task-item">
                  {{ task }}
                </li>
              </ol>
            </div>
            
            <!-- Avisos Importantes -->
            <div v-if="stationData.instrucoesParticipante.avisosImportantes && 
                   stationData.instrucoesParticipante.avisosImportantes.length > 0" 
                 class="subsection">
              <h3 class="subsection-title">⚠️ Avisos Importantes</h3>
              <ul class="warnings-list">
                <li v-for="(warning, index) in stationData.instrucoesParticipante.avisosImportantes" 
                    :key="index" 
                    class="warning-item">
                  {{ warning }}
                </li>
              </ul>
            </div>
          </div>
          <p v-else class="no-data-message">Não há instruções disponíveis para esta estação.</p>
        </div>

        <!-- Seção de Materiais Disponíveis -->
        <div class="info-section">
          <h2 class="section-title">📁 Materiais Disponíveis</h2>
          
          <div v-if="stationData.materiaisDisponiveis" class="materials-content">
            <!-- Informações Verbais -->
            <div v-if="stationData.materiaisDisponiveis.informacoesVerbaisSimulado && 
                   stationData.materiaisDisponiveis.informacoesVerbaisSimulado.length > 0" 
                 class="subsection">
              <h3 class="subsection-title">💬 Informações Verbais</h3>
              <div class="verbal-info-list">
                <div v-for="(info, index) in stationData.materiaisDisponiveis.informacoesVerbaisSimulado" 
                     :key="index" 
                     class="verbal-info-item">
                  <div v-if="info.tituloInformacao" class="info-title">{{ info.tituloInformacao }}</div>
                  <div v-if="info.conteudo" class="info-content" v-html="info.conteudo"></div>
                </div>
              </div>
            </div>
            
            <!-- Impressos Disponíveis (prévia) -->
            <div v-if="stationData.materiaisDisponiveis.impressos && 
                   stationData.materiaisDisponiveis.impressos.length > 0" 
                 class="subsection">
              <h3 class="subsection-title">📄 Impressos Disponíveis</h3>
              <div class="prints-list">
                <div v-for="(impresso, index) in stationData.materiaisDisponiveis.impressos" 
                     :key="index" 
                     class="print-item">
                  <div class="print-title">{{ impresso.tituloImpresso }}</div>
                  <!-- Preview do conteúdo - apenas uma indicação visual -->
                  <div class="print-preview">
                    <span class="preview-text">Disponível durante a simulação</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <p v-else class="no-data-message">Não há materiais disponíveis para esta estação.</p>
        </div>

        <!-- Rodapé com informações adicionais -->
        <div class="station-footer">
          <div v-if="stationData.notaMedia !== undefined" class="station-metadata">
            <span class="metadata-item">
              <strong>Dificuldade:</strong> 
              <span :class="stationData.notaMedia < 5 ? 'difficulty-high' : 
                stationData.notaMedia < 7 ? 'difficulty-medium' : 'difficulty-low'">
                {{ stationData.notaMedia < 5 ? 'Difícil' : 
                  stationData.notaMedia < 7 ? 'Moderada' : 'Fácil' }}
              </span>
            </span>
            <span v-if="stationData.especialidade" class="metadata-item">
              <strong>Especialidade:</strong> {{ stationData.especialidade }}
            </span>
            <span v-if="stationData.tempoEstacao" class="metadata-item">
              <strong>Tempo:</strong> {{ stationData.tempoEstacao }} minutos
            </span>
          </div>
          
          <!-- Botão para iniciar simulação (novamente no final da página) -->
          <div class="action-buttons bottom-buttons">
            <button 
              @click="iniciarSimulacao" 
              :disabled="isCreatingSession" 
              class="start-simulation-button"
              :class="{ 'loading': isCreatingSession }"
            >
              <span v-if="isCreatingSession" class="icon">⏳</span>
              <span v-else class="icon">▶️</span> 
              {{ isCreatingSession ? 'Criando Sessão...' : 'Iniciar Simulação' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.station-view-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  color: #333;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.station-view-header {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin-bottom: 24px;
  border-bottom: 1px solid #eaeaea;
  padding-bottom: 16px;
}

.back-button {
  display: flex;
  align-items: center;
  background-color: #f5f5f5;
  border: none;
  border-radius: 4px;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 14px;
  color: #444;
  margin-bottom: 12px;
  transition: background-color 0.2s;
}

.back-button:hover {
  background-color: #e0e0e0;
}

.back-icon {
  margin-right: 8px;
  font-size: 16px;
}

.station-title {
  font-size: 28px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0;
}

.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
}

.spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-top: 4px solid #3498db;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #fff3f3;
  border: 1px solid #ffcece;
  border-radius: 8px;
  padding: 24px;
  margin: 20px 0;
  text-align: center;
}

.error-icon {
  font-size: 32px;
  margin-bottom: 12px;
}

.retry-btn {
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  margin-top: 16px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.retry-btn:hover {
  background-color: #2980b9;
}

.station-content {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.action-buttons {
  display: flex;
  justify-content: center;
  margin: 20px 0;
}

.start-simulation-button {
  display: flex;
  align-items: center;
  background-color: #2ecc71;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.1s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.start-simulation-button:hover {
  background-color: #27ae60;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.start-simulation-button:active {
  transform: translateY(0);
}

.start-simulation-button:disabled {
  background-color: #95a5a6;
  cursor: not-allowed;
  transform: none;
}

.start-simulation-button:disabled:hover {
  background-color: #95a5a6;
  transform: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.start-simulation-button.loading {
  background-color: #f39c12;
}

.session-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #fff8e1;
  border: 1px solid #ffc107;
  border-radius: 8px;
  padding: 16px;
  margin: 16px 0;
  text-align: center;
}

.session-error .error-icon {
  font-size: 24px;
  margin-bottom: 8px;
}

.icon {
  margin-right: 8px;
}

.station-info-sections {
  padding: 0 16px;
}

.info-section {
  margin-bottom: 32px;
}

.section-title {
  font-size: 22px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 2px solid #eaeaea;
}

.subsection {
  margin-bottom: 24px;
}

.subsection-title {
  font-size: 18px;
  font-weight: 600;
  color: #34495e;
  margin-bottom: 12px;
}

.subsection-subtitle {
  font-size: 16px;
  font-weight: 600;
  color: #34495e;
  margin: 12px 0 8px 0;
}

.scenario-description {
  line-height: 1.6;
  margin-bottom: 16px;
}

.infra-list, .tasks-list, .warnings-list {
  padding-left: 24px;
  margin-bottom: 16px;
}

.infra-item, .warning-item {
  margin-bottom: 8px;
  line-height: 1.5;
}

.task-item {
  margin-bottom: 12px;
  line-height: 1.5;
}

.verbal-info-list, .prints-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.verbal-info-item, .print-item {
  background-color: #f9f9f9;
  border-radius: 6px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.info-title, .print-title {
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 8px;
  font-size: 16px;
}

.info-content {
  line-height: 1.5;
}

.print-preview {
  height: 60px;
  background-color: #f0f0f0;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #777;
  font-style: italic;
  margin-top: 8px;
}

.no-data-message {
  color: #777;
  font-style: italic;
  text-align: center;
  padding: 20px;
}

.station-footer {
  margin-top: 32px;
  padding-top: 16px;
  border-top: 1px solid #eaeaea;
}

.station-metadata {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 24px;
}

.metadata-item {
  background-color: #f5f5f5;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 14px;
}

.difficulty-high {
  color: #e74c3c;
  font-weight: 600;
}

.difficulty-medium {
  color: #f39c12;
  font-weight: 600;
}

.difficulty-low {
  color: #27ae60;
  font-weight: 600;
}

.bottom-buttons {
  margin-top: 24px;
  margin-bottom: 32px;
}

@media (max-width: 768px) {
  .station-view-container {
    padding: 12px;
  }
  
  .verbal-info-list, .prints-list {
    grid-template-columns: 1fr;
  }
  
  .station-title {
    font-size: 24px;
  }
  
  .section-title {
    font-size: 20px;
  }
  
  .subsection-title {
    font-size: 16px;
  }
}
</style>
