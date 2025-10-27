<script setup>
// Aceitar props para evitar warnings do Vue Router
defineProps({
  id: String
})

import Logger from '@/utils/logger.js'
const logger = new Logger('SimulationViewAI');
import { currentUser } from '@/plugins/auth.js'
import { db } from '@/plugins/firebase.js'
import { backendUrl } from '@/utils/backendUrl.js' // Necessário para IA
import {  getInfrastructureColor,
  getInfrastructureIcon,
  processInfrastructureItems
} from '@/utils/simulationUtils.js'
import { addDoc, collection } from 'firebase/firestore'
import { computed, onMounted, onUnmounted, ref, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTheme } from 'vuetify'
import { useSimulationSession } from '@/composables/useSimulationSession.js'
import { useSimulationWorkflowStandalone } from '@/composables/useSimulationWorkflowStandalone.js'
import CandidateContentPanel from '@/components/CandidateContentPanel.vue'
import CandidateImpressosPanel from '@/components/CandidateImpressosPanel.vue'
import CandidateChecklist from '@/components/CandidateChecklist.vue'
import ImageZoomModal from '@/components/ImageZoomModal.vue'

// Configuração do tema
const theme = useTheme()
const isDarkTheme = computed(() => theme.global.name.value === 'dark')

const route = useRoute()
const router = useRouter()

// Estado e carregamento compartilhados com SimulationView
const {
  stationId,
  sessionId,
  userRole,
  stationData,
  checklistData,
  isLoading,
  errorMessage,
  simulationTimeSeconds,
  timerDisplay,
  selectedDurationMinutes,
  fetchSimulationData: fetchSessionData,
  setupDuration
} = useSimulationSession()

stationId.value = route.params.id || null
userRole.value = 'candidate'
setupDuration(route.query || {})

const {
  myReadyState,
  partnerReadyState,
  candidateReadyButtonEnabled,
  simulationStarted,
  simulationEnded,
  manuallyEndSimulation,
  sendReady,
  updateTimerDisplayFromSelection,
  resetWorkflowState
} = useSimulationWorkflowStandalone({
  simulationTimeSeconds,
  timerDisplay,
  selectedDurationMinutes,
  autoStartOnReady: true
})

// Refs para PEP - seguindo mesmo padrão
const pepViewState = ref({ isVisible: false })
const markedPepItems = ref({})

import { useAiChat } from '@/composables/useAiChat.js'
import { useSpeechInteraction } from '@/composables/useSpeechInteraction.js'

const chatContainer = ref(null)
const messageInput = ref(null)

function scrollToBottom() {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
}

// --- Lógica de Voz (Deve ser inicializada antes do AiChat) ---
const {
  isListening,
  isSpeaking,
  autoRecordMode,
  start: startListening,
  stop: stopListening,
  speak: speakText,
  stopSpeaking,
  toggleAutoRecordMode,
} = useSpeechInteraction({
  stationData,
  onTranscript: (transcript) => {
    currentMessage.value = transcript
  },
  onTranscriptEnd: (transcript) => {
    currentMessage.value = transcript
  },
  onListeningEnd: () => {
    if (currentMessage.value.trim()) {
      sendMessage()
    }
  },
})

// --- Lógica de Chat com IA ---
const { 
  conversationHistory, 
  currentMessage, 
  isProcessingMessage, 
  releasedData, 
  canSendMessage, 
  sendMessage, 
  handleKeyPress 
} = useAiChat({
  stationData,
  simulationStarted,
  speakText,
  scrollToBottom
});

function toggleVoiceRecording() {
  if (isListening.value) {
    stopListening()
  } else {
    startListening()
  }
}

// Refs para contagem regressiva antes da simulação
const isCountdownActive = ref(false)
const countdownValue = ref(3)
const countdownInterval = ref(null)

// Refs para controle de painéis expandidos
const expandedPanels = ref(['materials']) // Materiais sempre expandidos por padrão

// Refs para controle de avaliação automática
const autoEvaluateEnabled = ref(true) // Avaliação automática habilitada por padrão

// Estatísticas AI
const aiStats = ref({
  messageCount: 0
  // Estatísticas simplificadas sem backend
})


// Inicializar dados da estação - seguindo mesmo padrão do SimulationView
async function loadSimulationData(currentStationId, { preserveWorkflowState = false } = {}) {
  if (!preserveWorkflowState) {
    resetWorkflowState()
  }

  if (!currentStationId) {
    errorMessage.value = 'ID da estação inválido.'
    isLoading.value = false
    return
  }

  conversationHistory.value = []
  logger.debug('Histórico de conversa limpo para nova estação:', currentStationId)

  try {
    await fetchSessionData(currentStationId)

    if (!stationData.value) {
      throw new Error('Falha ao carregar dados da estação')
    }

    const patientScript = stationData.value?.materiaisDisponiveis?.informacoesVerbaisSimulado || []
    logger.debug('Script do paciente carregado:', patientScript.length, 'seções')
    if (patientScript.length > 0) {
      logger.debug('Primeira seção do script:', patientScript[0])
    } else {
      logger.warn('AVISO: Script do paciente está vazio!')
    }

    if (checklistData.value?.itensAvaliacao?.length > 0) {
      checklistData.value.itensAvaliacao.forEach(item => {
        if (item.idItem && !markedPepItems.value[item.idItem]) {
          markedPepItems.value[item.idItem] = []
        }
      })
    }

    initializeLocalAISession()
  } catch (error) {
    logger.error('Erro ao carregar dados da estação (IA):', error)
    if (!errorMessage.value) {
      errorMessage.value = error.message || 'Falha ao carregar dados da estação.'
    }
  }
}

// Inicializar sessão AI local (sem backend)
function initializeLocalAISession() {
  // Gerar ID de sessão local
  sessionId.value = `ai-local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  partnerReadyState.value = true // IA sempre pronta

  logger.debug('Sessão AI local inicializada:', sessionId.value)

  // Candidato deve iniciar a conversa
  logger.debug('IA aguardando candidato iniciar a conversa...')
}

function toggleReadyState() {
  if (!candidateReadyButtonEnabled.value) return
  const wasReady = myReadyState.value
  sendReady()

  if (!wasReady && myReadyState.value) {
    startSimulationCountdown()
  } else if (wasReady && !myReadyState.value) {
    cancelCountdown()
    if (isListening.value) {
      stopListening()
    }
  }
}

// Funções para contagem regressiva antes da simulação
function startSimulationCountdown() {
  isCountdownActive.value = true
  countdownValue.value = 3

  countdownInterval.value = setInterval(() => {
    countdownValue.value--
    if (countdownValue.value <= 0) {
      cancelCountdown()
      // A simulação já é iniciada automaticamente pelo workflow
    }
  }, 1000)
}

function cancelCountdown() {
  if (countdownInterval.value) {
    clearInterval(countdownInterval.value)
    countdownInterval.value = null
  }
  isCountdownActive.value = false
  countdownValue.value = 3
}

const contextKeywordMap = {
  physical_exam: [
    'exame físico', 'exame fisico', 'semiologia', 'propedêutica', 'propedeutica',
    'abdome', 'abdômen', 'abdominal', 'neurológico', 'neurologico', 'respiratório', 'respiratorio',
    'cardíaco', 'cardiaco', 'musculoesquelético', 'musculo esquelético', 'osteoarticular', 'dermatológico',
    'otorrinolaringológico', 'ginecológico', 'urológico'
  ],
  vitals: [
    'sinais vitais', 'ssvv', 'pressão arterial', 'pa', 'temperatura', 'pulso', 'frequência cardíaca',
    'frequencia cardiaca', 'frequência respiratória', 'frequencia respiratoria', 'oximetria', 'saturação',
    'saturacao', 'glicemia capilar'
  ],
  lab: [
    'exame', 'exames', 'teste', 'testes', 'laboratorial', 'laboratoriais', 'dosagem', 'dosagens',
    'marcador', 'marcadores', 'sorologia', 'sorologias', 'imunológico', 'bioquímica', 'hemograma',
    'hemograma completo', 'hemograma total', 'coagulograma', 'perfil', 'lipidograma', 'hepatograma',
    'renal', 'eletrólitos', 'elelitros', 'gases arteriais', 'beta hcg', 'bhcg', 'pcr', 'vhs', 'urina',
    'urocultura', 'coleta', 'resultado', 'painel', 'dosagem hormonal'
  ],
  imaging: [
    'imagem', 'raio-x', 'raio x', 'rx', 'radiografia', 'tomografia', 'tc', 'ressonância', 'ressonancia',
    'rm', 'ultrassom', 'ultrassonografia', 'usg', 'ecografia', 'mamografia', 'angiografia', 'cintilografia',
    'densitometria', 'colonoscopia', 'endoscopia', 'broncoscopia', 'ectoscopia', 'enema', 'artrografia',
    'histerossalpingografia', 'videolaringoscopia', 'retossigmoidoscopia'
  ]
}

function getContextOption(value) {
  return requestContextOptions.find(option => option.value === value) || null
}

function setRequestContext(newContext) {
  const normalized = newContext || null
  const previous = requestContext.value

  if (previous === normalized) {
    requestContext.value = null
    if (previous) {
      resetCategoryState(previous)
      conversationHistory.value.push({
        role: 'system',
        content: 'Contexto de solicitação removido. Você pode continuar normalmente.',
        timestamp: new Date(),
        isSystemMessage: true
      })
    }
    return
  }

  requestContext.value = normalized
  if (normalized) {
    resetCategoryState(normalized)
  }

  const option = getContextOption(normalized)
  if (option) {
    conversationHistory.value.push({
      role: 'system',
      content: 'Desculpe, houve um erro. Tente novamente.',
      timestamp: new Date(),
      isError: true
    })
  }
}


// Submeter avaliação - seguindo mesmo padrão
async function submitEvaluation() {
  if (evaluationSubmittedByCandidate.value) return

  try {
    const evaluationData = {
      stationId: stationId.value,
      sessionId: sessionId.value,
      evaluations: markedPepItems.value,
      timestamp: new Date().toISOString()
    }

    // Salvar no Firestore
    await addDoc(collection(db, 'avaliacoes_ai'), evaluationData)

    evaluationSubmittedByCandidate.value = true

    logger.debug('Avaliação submetida com sucesso')

  } catch (error) {
    logger.error('Erro ao submeter avaliação:', error)
  }
}

// Forçar carregamento do PEP
async function forceLoadPEP() {
  logger.debug('Forçando carregamento do PEP...')
  try {
    // Recarregar dados da estação para obter PEP
    await loadSimulationData(stationId.value, { preserveWorkflowState: true })

    // Forçar liberação
    pepReleasedToCandidate.value = true
    isChecklistVisibleForCandidate.value = true

    logger.debug('PEP carregado forçadamente:', {
      checklistData: !!checklistData.value,
      pepReleased: pepReleasedToCandidate.value
    })
  } catch (error) {
    logger.error('Erro ao forçar PEP:', error)
  }
}

// Finalizar simulação AI local (sem backend)
function finalizeAISimulation() {
  logger.debug('Simulação AI finalizada localmente:', {
    sessionId: sessionId.value,
    messageCount: conversationHistory.value.length,
    evaluations: markedPepItems.value,
    pepReleased: pepReleasedToCandidate.value
  })

  // Dados ficam apenas no frontend
  // Futuramente pode salvar no localStorage ou Firestore se necessário
}

// A lógica de zoom de imagem foi movida para o composable useImagePreloading




// Formatar seções chave-valor
function formatTimestamp(timestamp) {
  return new Date(timestamp).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getMessageStyle(role) {
  const isDark = isDarkTheme.value

  switch (role) {
    case 'candidate':
      return {
        backgroundColor: isDark ? '#1976d2' : '#e3f2fd',
        color: isDark ? '#fff' : '#1565c0',
        marginLeft: 'auto',
        maxWidth: '80%'
      }
    case 'ai_actor':
      return {
        backgroundColor: isDark ? '#2e7d32' : '#e8f5e9',
        color: isDark ? '#fff' : '#2e7d32',
        marginRight: 'auto',
        maxWidth: '80%'
      }
    case 'system':
      return {
        backgroundColor: isDark ? '#f57c00' : '#fff3e0',
        color: isDark ? '#fff' : '#e65100',
        textAlign: 'center',
        maxWidth: '90%',
        margin: '0 auto'
      }
    default:
      return {
        backgroundColor: isDark ? '#424242' : '#f5f5f5',
        color: isDark ? '#fff' : '#212121'
      }
  }
}

function goBack() {
  finalizeAISimulation()
  router.push('/app/station-list')
}

import { useAiEvaluation, getClassificacaoFromPontuacao } from '@/composables/useAiEvaluation.js'
import { useImagePreloading } from '@/composables/useImagePreloading.js'

// --- Lógica de Imagem ---
const { 
  getImageSource, 
  getImageId, 
  handleImageError, 
  handleImageLoad, 
  openImageZoom, 
  closeImageZoom, 
  zoomedImageSrc, 
  zoomedImageAlt, 
  imageZoomDialog 
} = useImagePreloading({ stationData });

// --- Variáveis de Estado que Faltavam ---
const pepReleasedToCandidate = ref(false);
const candidateReceivedTotalScore = ref(0);
const speechEnabled = ref(true);
const isChecklistVisibleForCandidate = ref(false);

// Lógica de avaliação com IA (Refatorada)
const { 
  isEvaluating: submittingEvaluation, 
  evaluationCompleted: evaluationSubmittedByCandidate, 
  runAiEvaluation 
} = useAiEvaluation({
  checklistData,
  stationData,
  conversationHistory,
  markedPepItems
});

// Watcher para liberar PEP e iniciar avaliação automática
watch(simulationEnded, (newValue) => {
  if (newValue) {
    finalizeAISimulation()
    pepReleasedToCandidate.value = true
    isChecklistVisibleForCandidate.value = true

    if (autoEvaluateEnabled.value) {
      setTimeout(() => {
        runAiEvaluation()
      }, 2000)
    }
  }
})

// Lifecycle
onMounted(async () => {
  if (!currentUser.value) {
    errorMessage.value = 'Usuário não autenticado'
    return
  }

  // Event listener para tecla ESC fechar modal de zoom
  const handleEscKey = (event) => {
    if (event.key === 'Escape' && imageZoomDialog.value) {
      closeImageZoom()
    }
  }

  // Register cleanup BEFORE any await statements
  onUnmounted(() => {
    document.removeEventListener('keydown', handleEscKey)
    resetWorkflowState()
    finalizeAISimulation()
  })

  // A inicialização da voz foi movida para o composable useSpeechInteraction

  // Habilitar botão de pronto após delay
  setTimeout(() => {
    candidateReadyButtonEnabled.value = true
  }, 3000)

  // Carregar dados da estação
  await loadSimulationData(stationId.value)

  // Focus no input após simulação iniciar
  await nextTick()
  if (messageInput.value && simulationStarted.value) {
    messageInput.value.focus()
  }

  // Register event listener after setup
  document.addEventListener('keydown', handleEscKey)
})
</script>

<template>
  <div class="simulation-container">
    <!-- Header da simulação -->
    <!-- <v-app-bar color="primary" density="comfortable" elevation="2">
      <v-btn
        icon="ri-arrow-left-line"
        variant="text"
        color="white"
        @click="goBack"
      />

      <v-app-bar-title class="text-white">
        <div class="d-flex align-center">
          <v-icon class="me-2">ri-robot-line</v-icon>
          <div>
            <div class="text-body-1 font-weight-bold">
              Treinamento com IA
            </div>
            <div class="text-caption" v-if="stationData">
              {{ stationData.tituloEstacao }}
            </div>
          </div>
        </div>
      </v-app-bar-title>

      <template #append>
        <div class="text-right text-white me-4">
          <div class="text-body-2 font-weight-bold">
            {{ timerDisplay }}
          </div>
          <div class="text-caption" v-if="simulationStarted">
            {{ aiStats.messageCount }} mensagens
          </div>
          <div class="text-caption" v-else>
            Aguardando início
          </div>
        </div>
      </template>
    </v-app-bar> -->

    <!-- Loading inicial -->
    <v-main v-if="isLoading" class="d-flex align-center justify-center">
      <v-card class="pa-6 text-center" width="400">
        <v-progress-circular
          indeterminate
          color="primary"
          size="64"
          class="mb-4"
        />
        <v-card-title>Carregando simulação com IA...</v-card-title>
        <v-card-text>
          Preparando estação e sistema de IA virtual
        </v-card-text>
      </v-card>
    </v-main>

    <!-- Erro -->
    <v-main v-else-if="errorMessage" class="d-flex align-center justify-center">
      <v-card class="pa-6 text-center" width="400" color="error" variant="tonal">
        <v-icon size="64" class="mb-4" color="error">ri-error-warning-line</v-icon>
        <v-card-title>Erro na simulação</v-card-title>
        <v-card-text>{{ errorMessage }}</v-card-text>
        <v-card-actions class="justify-center">
          <v-btn color="primary" @click="goBack">
            Voltar à lista
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-main>

    <!-- Tela de preparação - antes do início -->
    <v-main v-else-if="!simulationStarted && !simulationEnded" class="d-flex align-center justify-center">
      <v-container class="text-center">
        <v-row justify="center">
          <v-col cols="12" md="8" lg="6">
            <v-card class="pa-6">
              <v-card-title class="text-h5 mb-4">
                <v-icon class="me-2" color="primary">ri-robot-line</v-icon>
                Treinamento com IA Virtual
              </v-card-title>

              <v-card-text>
                <div class="mb-6">
                  <h3>{{ stationData?.tituloEstacao }}</h3>
                  <p class="text-medium-emphasis mt-2">
                    Você é o <strong>candidato</strong> nesta simulação.
                    A IA atuará como <strong>ator/paciente e avaliador</strong>.
                  </p>
                </div>

                <!-- Configuração de tempo -->
                <div class="mb-6">
                  <h4 class="mb-3">Duração da simulação</h4>
                  <v-btn-toggle
                    v-model="selectedDurationMinutes"
                    mandatory
                    color="primary"
                    variant="outlined"
                  >
                    <v-btn :value="7">7 min</v-btn>
                    <v-btn :value="8">8 min</v-btn>
                    <v-btn :value="9">9 min</v-btn>
                    <v-btn :value="10">10 min</v-btn>
                    <v-btn :value="11">11 min</v-btn>
                    <v-btn :value="12">12 min</v-btn>
                  </v-btn-toggle>
                </div>

                <!-- Status dos participantes -->
                <v-row class="mb-4">
                  <v-col cols="6">
                    <v-card variant="tonal" :color="myReadyState ? 'success' : 'default'">
                      <v-card-text class="text-center">
                        <v-icon
                          size="32"
                          :color="myReadyState ? 'success' : 'default'"
                          class="mb-2"
                        >
                          {{ myReadyState ? 'ri-check-line' : 'ri-user-line' }}
                        </v-icon>
                        <div class="text-subtitle-2">Você (Candidato)</div>
                        <div class="text-caption">
                          {{ myReadyState ? 'Pronto!' : 'Aguardando...' }}
                        </div>
                      </v-card-text>
                    </v-card>
                  </v-col>
                  <v-col cols="6">
                    <v-card variant="tonal" color="success">
                      <v-card-text class="text-center">
                        <v-icon size="32" color="success" class="mb-2">
                          ri-check-line
                        </v-icon>
                        <div class="text-subtitle-2">IA Virtual</div>
                        <div class="text-caption">Pronta!</div>
                      </v-card-text>
                    </v-card>
                  </v-col>
                </v-row>
              </v-card-text>

              <v-card-actions class="justify-center">
                <v-btn
                  :color="myReadyState ? 'warning' : 'success'"
                  :variant="myReadyState ? 'outlined' : 'elevated'"
                  size="large"
                  :disabled="!candidateReadyButtonEnabled"
                  @click="toggleReadyState"
                >
                  <v-icon class="me-2">
                    {{ myReadyState ? 'ri-close-line' : 'ri-check-line' }}
                  </v-icon>
                  {{ myReadyState ? 'Cancelar' : 'Estou Pronto!' }}
                </v-btn>
              </v-card-actions>

              <v-card-text v-if="!candidateReadyButtonEnabled" class="text-center">
                <v-progress-linear indeterminate color="primary" class="mb-2" />
                <div class="text-caption text-medium-emphasis">
                  Preparando sistema... Aguarde alguns segundos
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>

    <!-- Interface principal da simulação -->
    <v-main v-else class="simulation-main">
      <v-container fluid class="pa-0 fill-height">
        <v-row no-gutters class="fill-height">
          <!-- Sidebar com informações da estação -->
          <v-col
            v-if="!pepViewState.isVisible"
            cols="12"
            md="8"
            class="d-flex flex-column"
            style="max-height: calc(100vh - 120px); overflow-y: auto;"
          >
            <div class="pa-3">
              <!-- Conteúdo do Candidato (Refatorado com Componentes) -->
              <CandidateContentPanel 
                :station-data="stationData" 
                :is-dark-theme="isDarkTheme"
                :simulation-started="simulationStarted"
              />

              <!-- Impressos do Candidato (Refatorado com Componentes) -->
              <CandidateImpressosPanel
                :released-data="Object.values(releasedData)"
                :is-dark-theme="isDarkTheme"
                :open-image-zoom="openImageZoom"
                :get-image-source="getImageSource"
                :get-image-id="getImageId"
                :handle-image-error="handleImageError"
                :handle-image-load="handleImageLoad"
              />

              <!-- Controles da simulação -->
              <v-card class="mb-4">
                <v-card-item>
                  <template #prepend>
                    <v-icon icon="ri-settings-line" color="primary" />
                  </template>
                  <v-card-title>Controles</v-card-title>
                </v-card-item>
                <v-card-text>
                  <div class="d-flex flex-column gap-2">
                    <v-btn
                      v-if="simulationEnded && checklistData"
                      color="primary"
                      variant="elevated"
                      @click="pepViewState.isVisible = true"
                      block
                    >
                      <v-icon start>ri-checklist-line</v-icon>
                      Ver PEP
                    </v-btn>
                    <v-btn
                      v-if="simulationEnded && !checklistData"
                      color="info"
                      variant="outlined"
                      @click="forceLoadPEP"
                      block
                    >
                      <v-icon start>ri-download-line</v-icon>
                      Carregar PEP
                    </v-btn>
                    <v-btn
                      v-if="simulationEnded && checklistData && !evaluationSubmittedByCandidate"
                      color="secondary"
                      variant="tonal"
                      :loading="submittingEvaluation"
                      @click="runAiEvaluation"
                      block
                    >
                      <v-icon start>ri-robot-line</v-icon>
                      Solicitar Avaliação da IA
                    </v-btn>
                    <v-btn
                      v-if="simulationEnded && !evaluationSubmittedByCandidate && checklistData"
                      color="success"
                      variant="outlined"
                      @click="submitEvaluation"
                      block
                    >
                      <v-icon start>ri-send-plane-line</v-icon>
                      Enviar Avaliação
                    </v-btn>
                    <v-btn
                      color="warning"
                      variant="outlined"
                      @click="manuallyEndSimulation"
                      v-if="!simulationEnded"
                      block
                    >
                      <v-icon start>ri-stop-line</v-icon>
                      Finalizar
                    </v-btn>
                  </div>
                </v-card-text>
              </v-card>
            </div>
          </v-col>

          <!-- Chat Interface -->
          <v-col
            v-if="!pepViewState.isVisible"
            cols="12"
            md="4"
            class="d-flex flex-column chat-column"
            style="height: calc(100vh - 60px);"
          >
            <!-- Cenário da estação -->
            <v-card class="flex-1-1 d-flex flex-column ma-2 chat-card" flat>
              <v-card-title class="chat-card-header d-flex align-center py-3">
                <v-icon class="me-2 chat-title-icon" size="26">ri-message-3-line</v-icon>
                <span class="chat-title">Chat</span>
                <v-spacer />
                <div class="chat-timer">
                  <v-icon size="20">ri-timer-line</v-icon>
                  <span>{{ timerDisplay }}</span>
                </div>
              </v-card-title>

              <v-divider />

              <!-- Histórico de conversa -->
              <div
                ref="chatContainer"
                class="chat-history flex-1-1 pa-4"
                :class="{ 'dark-theme': isDarkTheme }"
              >
                <div v-if="conversationHistory.length === 0" class="text-center mt-8">
                  <v-icon size="64" color="grey-lighten-1" class="mb-4">ri-user-heart-line</v-icon>
                  <h3 class="mb-2">Inicie a comunicação</h3>
                  <p class="text-medium-emphasis">
                    Cumprimente o paciente e comece a conversa.
                  </p>
                </div>

                <div
                  v-for="(message, index) in conversationHistory"
                  :key="index"
                  class="message-item mb-4"
                  :class="{
                    'message-candidate': message.role === 'candidate',
                    'message-ai-actor': message.role === 'ai_actor',
                    'message-system': message.role === 'system',
                    'message-welcome': message.isWelcome,
                    'message-error': message.isError
                  }"
                >
                  <div class="message-header d-flex align-center mb-1">
                    <v-avatar
                      size="24"
                      :color="message.role === 'candidate' ? 'blue' :
                              message.role === 'ai_actor' ? 'green' : 'orange'"
                      class="me-2"
                    >
                      <v-icon size="12" color="white">
                        {{
                          message.role === 'candidate' ? 'ri-user-line' :
                          message.role === 'ai_actor' ? 'ri-robot-line' :
                          'ri-information-line'
                        }}
                      </v-icon>
                    </v-avatar>
                    <div class="text-body-2 font-weight-medium">
                      {{
                        message.role === 'candidate' ? 'Você' :
                        message.role === 'ai_actor' ? 'Paciente Virtual' :
                        'Sistema'
                      }}
                    </div>
                    <v-spacer />
                    <div class="text-caption text-medium-emphasis">
                      {{ formatTimestamp(message.timestamp) }}
                    </div>
                  </div>
                  <div
                    class="message-content pa-3 rounded"
                    :style="getMessageStyle(message.role)"
                    v-html="message.content || message.message"
                  />
                </div>
              </div>

              <!-- Input de mensagem com controles de voz -->
              <v-card-actions class="pa-4 chat-input-actions">
                <v-text-field
                  id="chat-message-input"
                  ref="messageInput"
                  v-model="currentMessage"
                  label="Digite ou fale sua pergunta..."
                  placeholder="Ex: Bom dia! Qual o seu nome?"
                  variant="outlined"
                  density="comfortable"
                  :disabled="isProcessingMessage"
                  @keydown="handleKeyPress"
                  hide-details
                  class="flex-1-1 chat-message-field"
                  append-inner-icon="ri-send-plane-line"
                  @click:append-inner="sendMessage"
                  :style="{
                    color: isDarkTheme ? 'white' : '#212121',
                    fontWeight: isDarkTheme ? '400' : '500',
                    backgroundColor: 'white'
                  }"
                >
                </v-text-field>

                <!-- Botão para alternar modo automático -->
                <v-btn
                  :color="autoRecordMode ? 'success' : 'grey'"
                  variant="tonal"
                  size="large"
                  class="ml-2"
                  :aria-label="autoRecordMode ? 'Modo automático ativo' : 'Modo manual ativo'"
                  @click="toggleAutoRecordMode"
                >
                  <v-icon>{{ autoRecordMode ? 'ri-robot-2-line' : 'ri-user-voice-line' }}</v-icon>
                  <v-tooltip activator="parent" location="top">
                    {{ autoRecordMode ? 'Modo Automático (clique para Manual)' : 'Modo Manual (clique para Automático)' }}
                  </v-tooltip>
                </v-btn>

                <!-- Botão de voz -->
                <v-btn
                  color="primary"
                  variant="tonal"
                  size="large"
                  class="ml-2"
                  :disabled="isProcessingMessage"
                  :aria-label="isListening ? 'Parar gravação' : 'Iniciar gravação de voz'"
                  @click="toggleVoiceRecording"
                >
                  <v-icon>{{ isListening ? 'ri-mic-fill' : 'ri-mic-line' }}</v-icon>
                  <v-tooltip activator="parent" location="top">
                    {{ autoRecordMode ? 'Gravando automaticamente' : (isListening ? 'Parar gravação' : 'Iniciar gravação') }}
                  </v-tooltip>
                </v-btn>

                <!-- Botão para parar a fala -->
                <v-btn
                  v-if="isSpeaking"
                  color="warning"
                  variant="tonal"
                  size="large"
                  class="ml-2"
                  :disabled="!isSpeaking"
                  aria-label="Parar síntese de voz"
                  @click="stopSpeaking"
                >
                  <v-icon>ri-volume-mute-line</v-icon>
                </v-btn>

                <!-- Botão para controlar voz da IA -->
                <v-btn
                  :color="speechEnabled ? 'success' : 'grey'"
                  variant="tonal"
                  size="large"
                  class="ml-2"
                  :aria-label="speechEnabled ? 'Desativar voz da IA' : 'Ativar voz da IA'"
                  @click="speechEnabled = !speechEnabled"
                >
                  <v-icon>{{ speechEnabled ? 'ri-volume-up-line' : 'ri-volume-mute-line' }}</v-icon>
                  <v-tooltip activator="parent" location="top">
                    {{ speechEnabled ? 'Voz da IA ativada (clique para desativar)' : 'Voz da IA desativada (clique para ativar)' }}
                  </v-tooltip>
                </v-btn>

                <!-- Botão de enviar -->
                <v-btn
                  color="primary"
                  variant="elevated"
                  size="large"
                  class="ml-2"
                  :disabled="!canSendMessage"
                  :loading="isProcessingMessage"
                  aria-label="Enviar mensagem"
                  @click="sendMessage"
                >
                  <v-icon>ri-send-plane-line</v-icon>
                </v-btn>
              </v-card-actions>

              <!-- Mensagem de simulação finalizada -->
              <v-card-text v-if="simulationEnded" class="text-center">
                <v-icon size="48" color="success" class="mb-2">ri-check-double-line</v-icon>
                <div class="text-h6 mb-2">Simulação Finalizada!</div>
                <div class="text-body-2 text-medium-emphasis">
                  Agora você pode avaliar sua performance usando o PEP.
                </div>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- PEP Completo (Refatorado com Componente) -->
          <CandidateChecklist
            :checklist-data="checklistData"
            :simulation-started="simulationStarted"
            :simulation-ended="simulationEnded"
            :is-checklist-visible-for-candidate="pepReleasedToCandidate"
            :marked-pep-items="markedPepItems"
            :evaluation-scores="{ /* IA não tem scores de avaliação em tempo real */ }"
            :candidate-received-scores="markedPepItems"
            :candidate-received-total-score="candidateReceivedTotalScore"
            :total-score="candidateReceivedTotalScore"
            :evaluation-submitted-by-candidate="evaluationSubmittedByCandidate"
            :is-actor-or-evaluator="false"
            :is-candidate="true"
            @submit-evaluation="submitEvaluation"
          />
        </v-row>
      </v-container>
    </v-main>

    <!-- Modal de zoom para imagens -->
    <ImageZoomModal
      v-model:is-open="imageZoomDialog"
      :image-url="selectedImageForZoom"
      :image-alt="selectedImageAlt"
      @close="closeImageZoom"
    />
  </div>

  <!-- Overlay de contagem regressiva -->
  <v-overlay
    v-model="isCountdownActive"
    class="countdown-overlay align-center justify-center"
    persistent
    opacity="0.9"
  >
    <div class="countdown-container">
      <div class="countdown-number">
        {{ countdownValue }}
      </div>
      <div class="countdown-text">
        Preparando simulação...
      </div>
    </div>
  </v-overlay>
</template>

<style scoped>
.simulation-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.simulation-main {
  flex: 1;
  overflow-y: auto;
}

.chat-history {
  overflow-y: auto;
  max-height: calc(100vh - 300px);
  scroll-behavior: smooth;
  flex: 1;
}

.message-item {
  opacity: 0;
  animation: fadeInUp 0.3s ease forwards;
}

.message-candidate .message-content {
  margin-left: 20%;
}

.message-ai-actor .message-content,
.message-system .message-content {
  margin-right: 20%;
}

.message-welcome {
  border-left: 4px solid rgb(var(--v-theme-primary));
  padding-left: 12px;
  margin-left: -16px;
}

.message-error {
  border-left: 4px solid rgb(var(--v-theme-error));
  padding-left: 12px;
  margin-left: -16px;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.chat-input-actions {
  background-color: rgb(var(--v-theme-surface));
  border-top: 1px solid rgb(var(--v-theme-outline-variant));
}

/* Estilos específicos para o input do chat */
.chat-input-actions :deep(.v-text-field) {
  background-color: rgb(var(--v-theme-surface));
}

.chat-input-actions :deep(.v-text-field .v-field) {
  background-color: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  border-color: rgb(var(--v-theme-outline-variant));
}

.chat-input-actions :deep(.v-text-field .v-field:hover) {
  border-color: rgb(var(--v-theme-primary));
}

.chat-input-actions :deep(.v-text-field .v-field:focus) {
  border-color: rgb(var(--v-theme-primary));
  box-shadow: 0 0 0 2px rgba(var(--v-theme-primary), 0.2);
}

.chat-input-actions :deep(.v-text-field .v-field__input) {
  color: rgb(var(--v-theme-on-surface));
}

/* Estilos para garantir visibilidade do card do chat no tema escuro */
.chat-history {
  background-color: rgb(var(--v-theme-surface)) !important;
  color: rgb(var(--v-theme-on-surface)) !important;
}

.chat-card {
  position: relative;
}

.chat-card-header {
  position: sticky;
  top: 96px;
  z-index: 6;
  background-color: rgb(var(--v-theme-surface));
  border-bottom: 1px solid rgb(var(--v-theme-outline-variant));
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.06);
}

.chat-title {
  font-size: clamp(1.6rem, 2.8vw, 2.4rem);
  font-weight: 700;
  letter-spacing: 0.02em;
}

.chat-title-icon {
  color: rgb(var(--v-theme-primary));
}

.chat-timer {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: clamp(2rem, 3.6vw, 3.2rem);
  font-weight: 700;
  color: rgb(var(--v-theme-primary));
  line-height: 1;
}

.chat-timer :deep(.v-icon) {
  color: inherit;
  margin-top: 4px;
}

.chat-history.dark-theme {
  background-color: rgb(var(--v-theme-surface)) !important;
}

/* Garantir que as mensagens tenham boa visibilidade */
.message-item {
  color: rgb(var(--v-theme-on-surface)) !important;
}

.message-header {
  color: rgb(var(--v-theme-on-surface-variant)) !important;
}

.message-content {
  background-color: rgb(var(--v-theme-surface-variant)) !important;
  color: rgb(var(--v-theme-on-surface-variant)) !important;
  border: 1px solid rgb(var(--v-theme-outline-variant)) !important;
  border-radius: 8px !important;
  padding: 12px !important;
}

/* Mensagens do candidato (usuário) */
.message-candidate .message-content {
  background-color: rgb(var(--v-theme-primary-container)) !important;
  color: rgb(var(--v-theme-on-primary-container)) !important;
  border-color: rgb(var(--v-theme-primary)) !important;
}

/* Mensagens da IA/Ator */
.message-ai-actor .message-content {
  background-color: rgb(var(--v-theme-secondary-container)) !important;
  color: rgb(var(--v-theme-on-secondary-container)) !important;
  border-color: rgb(var(--v-theme-secondary)) !important;
}

/* Mensagens do sistema */
.message-system .message-content {
  background-color: rgb(var(--v-theme-tertiary-container)) !important;
  color: rgb(var(--v-theme-on-tertiary-container)) !important;
  border-color: rgb(var(--v-theme-tertiary)) !important;
}

/* Mensagens especiais */
.message-welcome {
  background-color: rgb(var(--v-theme-primary-container)) !important;
  color: rgb(var(--v-theme-on-primary-container)) !important;
  border-left: 4px solid rgb(var(--v-theme-primary)) !important;
}

.message-error {
  background-color: rgb(var(--v-theme-error-container)) !important;
  color: rgb(var(--v-theme-on-error-container)) !important;
  border-left: 4px solid rgb(var(--v-theme-error)) !important;
}

.timer-display-candidate {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  padding: 16px;
  font-size: 2rem;
  font-weight: 500;
  text-align: center;
  background-color: rgba(var(--v-theme-on-surface), 0.04);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.timer-display-candidate.ended {
  border-color: rgb(var(--v-theme-error));
  background-color: rgba(var(--v-theme-error), 0.1);
  color: rgb(var(--v-theme-error));
}

.tasks-list {
  list-style-type: disc;
  margin: 0;
  padding-left: 1.5rem;
}

.tasks-list li {
  margin-bottom: 0.5rem;
}

.warnings-list {
  list-style-type: disc;
  margin: 0;
  padding-left: 1.5rem;
}

.warnings-list li {
  margin-bottom: 0.5rem;
}

.infra-icons-list {
  list-style: none;
  padding-left: 0;
  margin: 0;
}

.infra-icons-list li {
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
}

.infra-icons-list li.sub-item {
  margin-left: 1.5rem;
}

.chat-history-sidebar {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  padding: 8px;
  background-color: rgba(var(--v-theme-surface), 0.5);
}

.chat-history-sidebar.dark-theme {
  background-color: rgba(var(--v-theme-surface-variant), 0.5);
}

.message-item-sidebar {
  opacity: 0;
  animation: fadeInUp 0.2s ease forwards;
}

.message-content-sidebar {
  font-size: 0.875rem;
}

.infra-list {
  list-style: none;
  padding-left: 0;
  margin: 0;
}

.cursor-pointer {
  cursor: pointer;
}

.cursor-pointer:hover {
  background-color: rgba(var(--v-theme-primary), 0.1);
}

/* Responsividade */
@media (max-width: 960px) {
  .message-candidate .message-content,
  .message-ai-actor .message-content,
  .message-system .message-content {
    margin-left: 0;
    margin-right: 0;
  }

  .timer-display-candidate {
    font-size: 1.5rem;
    padding: 12px;
  }

  .chat-history-sidebar {
    max-height: 200px;
  }

  /* Sidebar móvel - altura ajustada */
  .d-flex.flex-column[style*="max-height"] {
    max-height: calc(100vh - 200px) !important;
  }
}

/* Estilos para contagem regressiva */
.countdown-overlay {
  background-color: rgba(0, 0, 0, 0.8) !important;
}

.countdown-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: white;
}

.countdown-number {
  font-size: 8rem;
  font-weight: bold;
  margin-bottom: 1rem;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
  animation: countdownPulse 1s ease-in-out infinite;
}

.countdown-text {
  font-size: 1.5rem;
  font-weight: 500;
  opacity: 0.9;
}

@keyframes countdownPulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
}

/* DIAGNÓSTICO URGENTE: Usando apenas estilos inline no template */
</style>