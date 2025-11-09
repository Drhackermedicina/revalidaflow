<script setup>
// Aceitar props para evitar warnings do Vue Router
defineProps({
  id: String
})

import Logger from '@/utils/logger.js'
const logger = new Logger('SimulationViewAI');
import { currentUser } from '@/plugins/auth.js'
import { db } from '@/plugins/firebase.js'
import { backendUrl } from '@/utils/backendUrl.js'
import { addDoc, collection } from 'firebase/firestore'
import { computed, onMounted, onUnmounted, ref, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTheme } from 'vuetify'
import { useSimulationSession } from '@/composables/useSimulationSession.js'
import { useSimulationWorkflowStandalone } from '@/composables/useSimulationWorkflowStandalone.js'
import { useUserStatusManager } from '@/composables/useUserStatusManager.js'
import CandidateContentPanel from '@/components/CandidateContentPanel.vue'
import ChatPanel from '@/components/ChatPanel.vue'
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
  startSimulation,
  manuallyEndSimulation,
  sendReady,
  updateTimerDisplayFromSelection,
  resetWorkflowState
} = useSimulationWorkflowStandalone({
  simulationTimeSeconds,
  timerDisplay,
  selectedDurationMinutes,
  autoStartOnReady: false
})

// Inicializa composable de gerenciamento de status
const {
  updateUserStatus
} = useUserStatusManager()

// Refs para PEP - seguindo mesmo padrão
const markedPepItems = ref({})

import { useAiChat } from '@/composables/useAiChat.js'
import { useSpeechInteraction } from '@/composables/useSpeechInteraction.js'
import { useChatInput } from '@/composables/useChatInput.js'

const { formatMessageText } = useChatInput()

function collectAllStationMaterials(station) {
  if (!station) return []
  const sources = [
    Array.isArray(station?.materiaisDisponiveis?.impressos) ? station.materiaisDisponiveis.impressos : [],
    Array.isArray(station?.materiaisImpressos) ? station.materiaisImpressos : [],
    Array.isArray(station?.materiais) ? station.materiais : [],
  ]
  const unique = new Map()
  sources.flat().forEach(item => {
    if (!item) return
    const key = String(item.idImpresso ?? item.id ?? '')
    if (!key) return
    if (!unique.has(key)) {
      unique.set(key, item)
    }
  })
  return Array.from(unique.values())
}

async function logMaterialReleaseTelemetry(material, source) {
  try {
    await fetch(`${backendUrl}/ai-chat/material-release-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source,
        stationId: stationId.value,
        stationTitle: stationData.value?.tituloEstacao || stationData.value?.titulo || null,
        materialId: material?.idImpresso || material?.id || null,
        materialTitle: material?.tituloImpresso || material?.titulo || 'Documento',
        userId: currentUser.value?.uid || currentUser.value?.userId || '',
        timestamp: new Date().toISOString(),
      }),
    })
  } catch (error) {
    logger.warn('Falha ao registrar telemetria de liberação de material', error)
  }
}

const chatPanelRef = ref(null)
const confirmManualRelease = ref(false)
const showMicHint = ref(false)
let micHintTimer = null
const showPepCorrection = ref(false)

function scrollToBottom() {
  nextTick(() => {
    const container = chatPanelRef.value?.$el?.querySelector('.chat-history')
    if (container) {
      container.scrollTop = container.scrollHeight
    }
  })
}

// --- Lógica de Voz (Deve ser inicializada antes do AiChat) ---
let speakTextBridge = () => {}
// --- Lógica de Chat com IA ---
const {
  conversationHistory,
  currentMessage,
  isProcessingMessage,
  releasedData,
  sendMessage,
} = useAiChat({
  stationData,
  simulationStarted,
  speakText: (...args) => speakTextBridge(...args),
  scrollToBottom,
});

const speechBuffer = ref('')

function combineSpeechSegments(...segments) {
  return segments
    .filter(part => typeof part === 'string' && part.trim().length > 0)
    .map(part => part.trim())
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeTranscriptPayload(payload) {
  if (typeof payload === 'string') {
    return { interim: payload, final: '' }
  }
  if (!payload || typeof payload !== 'object') {
    return { interim: '', final: '' }
  }
  return {
    interim: payload.interim ?? '',
    final: payload.final ?? ''
  }
}

function handleSpeechTranscript(payload) {
  const { interim } = normalizeTranscriptPayload(payload)
  currentMessage.value = combineSpeechSegments(speechBuffer.value, interim)
}

function handleTranscriptEnd(finalChunk) {
  const chunk = typeof finalChunk === 'string' ? finalChunk.trim() : ''
  if (!chunk) return
  speechBuffer.value = combineSpeechSegments(speechBuffer.value, chunk)
  currentMessage.value = speechBuffer.value
}

function handleSendMessage(messageOverride) {
  const rawMessage = typeof messageOverride === 'string'
    ? messageOverride
    : currentMessage.value
  if (!rawMessage?.trim()) return
  sendMessage(rawMessage)
  speechBuffer.value = ''
}

function handleListeningEnd() {}

function handleChatKeyPress(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    handleSendMessage()
  }
}

function handleStartListening() {
  speechBuffer.value = currentMessage.value.trim()
  startListening()
}

function handleStopListening() {
  stopListening()
}

const {
  isListening,
  autoRecordMode,
  start: startListening,
  stop: stopListening,
  speak: speakText,
  stopSpeaking,
  toggleAutoRecordMode,
} = useSpeechInteraction({
  stationData,
  onTranscript: handleSpeechTranscript,
  onTranscriptEnd: handleTranscriptEnd,
  onListeningEnd: handleListeningEnd,
})

speakTextBridge = speakText

async function releaseAllPendingMaterials() {
  try {
    const allMaterials = collectAllStationMaterials(stationData.value)
    const current = releasedData.value || {}
    const pending = allMaterials.filter(m => !current[m.idImpresso] && !current[m.id])
    if (pending.length === 0) {
      confirmManualRelease.value = false
      return
    }
    for (const m of pending) {
      const key = m.idImpresso || m.id
      releasedData.value[key] = { ...m, releasedAt: new Date(), releasedBy: 'manual' }
      conversationHistory.value.push({
        role: 'system',
        content: formatMessageText(`📄 Material liberado manualmente: ${m.tituloImpresso || m.titulo || 'Documento'}`),
        timestamp: new Date(),
      })
      await logMaterialReleaseTelemetry(m, 'manual')
    }
  } finally {
    confirmManualRelease.value = false
    scrollToBottom()
  }
}

// toggleVoiceRecording removido (não utilizado)

// Refs para contagem regressiva antes da simulação
const isCountdownActive = ref(false)
const countdownValue = ref(3)
const countdownInterval = ref(null)
const showTutorialDialog = ref(false)

// (removido) expandedPanels não utilizado

// Refs para controle de avaliação automática
const autoEvaluateEnabled = ref(true)
const candidateReceivedDetails = ref(null); // Avaliação automática habilitada por padrão
const candidateReceivedScores = ref({}); // Variável que faltava

const actorScriptSections = computed(() => stationData.value?.materiaisDisponiveis?.informacoesVerbaisSimulado || [])
const allStationImpressos = computed(() => collectAllStationMaterials(stationData.value))
const allowedActorTags = ['p', 'strong', 'em', 'u', 'br', 'ol', 'ul', 'li']

function sanitizeActorScriptHtml(text = '') {
  if (!text || typeof text !== 'string') {
    return ''
  }
  let sanitized = text
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
  sanitized = sanitized.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')

  const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g
  sanitized = sanitized.replace(tagRegex, (match, tagName) => {
    return allowedActorTags.includes(tagName.toLowerCase()) ? match : ''
  })

  return sanitized
}

const pendingImpressos = computed(() => {
  const released = releasedData.value || {}
  const releasedKeys = new Set(Object.keys(released))
  return allStationImpressos.value.filter(item => {
    const key = item.idImpresso || item.id
    if (!key) return false
    return !releasedKeys.has(String(key))
  })
})

watch(currentMessage, (val, oldVal) => {
  if (!val && oldVal) {
    speechBuffer.value = ''
  }
})

watch(autoRecordMode, (value) => {
  if (value) {
    speechBuffer.value = ''
  }
})

// Estatísticas AI

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

  showPepCorrection.value = false
  conversationHistory.value = []
  speechBuffer.value = ''
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
    try { const { captureFirebaseError } = await import('@/plugins/sentry.js'); captureFirebaseError(error, { operation: 'fetchSessionData', collection: 'estacoes_clinicas', userId: currentUser.value?.uid }) } catch (_) {}
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
  if (!candidateReadyButtonEnabled.value || simulationEnded.value) return

  const wasReady = myReadyState.value
  sendReady()

  if (!wasReady && myReadyState.value) {
    if (simulationStarted.value || isCountdownActive.value) return
    startSimulationCountdown()
  } else if (wasReady && !myReadyState.value) {
    cancelCountdown()
    stopListening()
    stopSpeaking()
  }
}

// Funções para contagem regressiva antes da simulação
function startSimulationCountdown() {
  if (isCountdownActive.value || simulationStarted.value) return

  isCountdownActive.value = true
  countdownValue.value = 3

  countdownInterval.value = setInterval(() => {
    if (!myReadyState.value) {
      cancelCountdown()
      return
    }

    countdownValue.value--
    if (countdownValue.value <= 0) {
      cancelCountdown()
      startSimulation()
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

// Submeter avaliação - seguindo mesmo padrão
async function submitEvaluation() {
  if (evaluationSubmittedByCandidate.value) return

  try {
    const evaluationData = {
      stationId: stationId.value,
      sessionId: sessionId.value,
      userId: currentUser.value?.uid || '',
      stationTitle: stationData.value?.tituloEstacao || stationData.value?.titulo || '',
      period: stationData.value?.periodoInep || stationData.value?.anoEdicao || stationData.value?.ano || '',
      evaluations: markedPepItems.value,
      timestamp: new Date().toISOString()
    }

    // Salvar no Firestore
    await addDoc(collection(db, 'avaliacoes_ai'), evaluationData)

    evaluationSubmittedByCandidate.value = true

    logger.debug('Avaliação submetida com sucesso')

  } catch (error) {
    logger.error('Erro ao submeter avaliação:', error)
    try { const { captureFirebaseError } = await import('@/plugins/sentry.js'); captureFirebaseError(error, { operation: 'addDoc', collection: 'avaliacoes_ai', userId: currentUser.value?.uid }) } catch (_) {}
    // TODO: enviar para Sentry quando disponível
  }
}

// Forçar carregamento do PEP
/* async function forceLoadPEP() {
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
} */

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

/* function getMessageStyle(role) {
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
*/

function goBack() {
  cancelCountdown()
  stopListening()
  stopSpeaking()
  if (simulationStarted.value && !simulationEnded.value) {
    manuallyEndSimulation()
  }
  resetWorkflowState()
  finalizeAISimulation()
  router.push({ name: 'station-list' })
}

import { useAiEvaluation } from '@/composables/useAiEvaluation.js'
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
const isChecklistVisibleForCandidate = ref(false);

const availableDurations = [7, 8, 9, 10, 11, 12];

// Removidas as variáveis computadas desnecessárias (stationTagChips, stationHighlightCards, infrastructureHighlights)
// pois não são mais usadas na nova interface simplificada de IA

// Lógica de avaliação com IA (Refatorada)
const { 
  isEvaluating: submittingEvaluation, 
  evaluationCompleted: evaluationSubmittedByCandidate, 
  runAiEvaluation 
} = useAiEvaluation({
  checklistData,
  stationData,
  conversationHistory,
  sessionId,
  releasedData
});

// Watcher para finalizar, liberar PEP, avaliar e atualizar status
watch(simulationEnded, async (ended) => {
  if (!ended) return

  finalizeAISimulation()
  pepReleasedToCandidate.value = true
  isChecklistVisibleForCandidate.value = true
  autoRecordMode.value = false
  stopListening()
  stopSpeaking()
  showPepCorrection.value = false
  speechBuffer.value = ''

  if (autoEvaluateEnabled.value) {
    try {
      const result = await runAiEvaluation()
      if (result) {
        candidateReceivedScores.value = result.scores
        candidateReceivedTotalScore.value = result.total
        candidateReceivedDetails.value = result.details
      }
    } catch (err) {
      logger.error('Erro na avaliação automática:', err)
    }
  }

  // Após 5 segundos, voltar para status disponível
  setTimeout(() => {
    updateUserStatus('disponivel')
    logger.debug('Simulação IA finalizada - voltando para status "disponivel"')
  }, 5000)
})

// Watchers para atualizar status do usuário
watch(simulationStarted, (newValue) => {
  if (newValue) {
    logger.debug('Simulação IA iniciada - status "treinando_com_ia" ativo')
    speechBuffer.value = ''
    if (autoRecordMode.value) {
      startListening()
    } else {
      stopListening()
    }
    showMicHint.value = true
    if (micHintTimer) clearTimeout(micHintTimer)
    micHintTimer = setTimeout(() => {
      showMicHint.value = false
      micHintTimer = null
    }, 6000)
    nextTick(() => {
      const inputEl = chatPanelRef.value?.$el?.querySelector('#chat-message-input')
      if (inputEl) {
        inputEl.focus()
      }
    })
    } else {
      autoRecordMode.value = false
      stopListening()
      stopSpeaking()
      showMicHint.value = false
      speechBuffer.value = ''
      if (micHintTimer) {
      clearTimeout(micHintTimer)
      micHintTimer = null
    }
  }
});

watch(isListening, (listening) => {
  if (listening) {
    showMicHint.value = false
    if (micHintTimer) {
      clearTimeout(micHintTimer)
      micHintTimer = null
    }
  }
})

// Manter timer sincronizado com seleção
watch(selectedDurationMinutes, () => {
 updateTimerDisplayFromSelection()
})

// Lifecycle
// Handler global para ESC fechar zoom
const handleEscKey = (event) => {
  if (event.key === 'Escape' && imageZoomDialog.value) {
    closeImageZoom()
  }
}

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscKey)
  cancelCountdown()
  stopListening()
  stopSpeaking()
  showMicHint.value = false
  if (micHintTimer) {
    clearTimeout(micHintTimer)
    micHintTimer = null
  }
  resetWorkflowState()
  finalizeAISimulation()
})

onMounted(async () => {
  if (!currentUser.value) {
    errorMessage.value = 'Usuário não autenticado'
    return
  }

  // Event listener ESC já definido globalmente

  // Carregar dados da estação
  await loadSimulationData(stationId.value)

  // Habilitar botão de pronto após carregar dados
  candidateReadyButtonEnabled.value = true

  // Focus no input após simulação iniciar
  await nextTick()
  if (simulationStarted.value) {
    const inputEl = chatPanelRef.value?.$el?.querySelector('#chat-message-input')
    if (inputEl) {
      inputEl.focus()
    }
  }

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
            {{ conversationHistory.length }} mensagens
          </div>
          <div class="text-caption" v-else>
            Aguardando início
          </div>
        </div>
      </template>
    </v-app-bar> -->

    <!-- Loading inicial -->
    <div v-if="isLoading" class="simulation-loading d-flex align-center justify-center">
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
    </div>

    <!-- Erro -->
    <div v-else-if="errorMessage" class="simulation-error d-flex align-center justify-center">
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
    </div>

    <!-- Tela de preparação - antes do início -->
    <div v-else-if="!simulationStarted && !simulationEnded" class="ai-pre-simulation-main">
      <v-container class="py-8">
        <v-row justify="center">
          <v-col cols="12" md="10" lg="8">
            <v-card class="ai-preparation-card" elevation="0">
              <!-- Header principal -->
              <div class="ai-prep-header">
                <div class="d-flex align-center mb-4">
                  <v-avatar size="48" class="me-3" color="primary">
                    <v-icon size="28" color="white">ri-robot-line</v-icon>
                  </v-avatar>
                  <div>
                    <h1 class="ai-title">Treinamento com IA Virtual</h1>
                    <p class="ai-subtitle">Pratique com nosso paciente virtual inteligente</p>
                  </div>
                </div>
              </div>

              <v-card-text class="pa-6">
                <!-- Configuração de tempo -->
                <div class="mb-6">
                  <h3 class="text-h6 mb-3 d-flex align-center">
                    <v-icon class="me-2" color="primary">ri-time-line</v-icon>
                    Duração da sessão
                  </h3>
                  <v-btn-toggle
                    v-model="selectedDurationMinutes"
                    variant="outlined"
                    color="primary"
                    class="duration-selector"
                    mandatory
                  >
                    <v-btn
                      v-for="duration in availableDurations"
                      :key="duration"
                      :value="duration"
                      class="duration-btn"
                    >
                      {{ duration }} min
                    </v-btn>
                  </v-btn-toggle>
                </div>

                <!-- Status cards -->
                <v-row class="mb-6">
                  <v-col cols="12" sm="6">
                    <v-card variant="outlined" class="status-card">
                      <v-card-text class="pa-4">
                        <div class="d-flex align-center">
                          <v-avatar size="40" color="primary" variant="tonal" class="me-3">
                            <v-icon>ri-user-line</v-icon>
                          </v-avatar>
                          <div>
                            <div class="text-body-2 text-medium-emphasis">Você</div>
                            <div class="text-subtitle-1 font-weight-medium">
                              {{ myReadyState ? 'Pronto' : 'Aguardando' }}
                            </div>
                          </div>
                        </div>
                      </v-card-text>
                    </v-card>
                  </v-col>
                  <v-col cols="12" sm="6">
                    <v-card variant="outlined" class="status-card">
                      <v-card-text class="pa-4">
                        <div class="d-flex align-center">
                          <v-avatar size="40" color="success" variant="tonal" class="me-3">
                            <v-icon>ri-robot-line</v-icon>
                          </v-avatar>
                          <div>
                            <div class="text-body-2 text-medium-emphasis">IA Virtual</div>
                            <div class="text-subtitle-1 font-weight-medium text-success">
                              Pronta
                            </div>
                          </div>
                        </div>
                      </v-card-text>
                    </v-card>
                  </v-col>
                </v-row>

                <!-- Instruções rápidas -->
                <v-alert
                  type="info"
                  variant="tonal"
                  class="mb-6"
                >
                  <template #prepend>
                    <v-icon>ri-lightbulb-line</v-icon>
                  </template>
                  <div class="text-body-2">
                    <strong>Como funciona:</strong> Você conversará com um paciente virtual via voz ou texto. 
                    Faça perguntas, solicite exames e conduza a consulta como em uma estação real.
                  </div>
                </v-alert>

                <!-- Botões de ação -->
                <div class="d-flex flex-wrap gap-3 justify-space-between align-center">
                  <div class="d-flex gap-3">
                    <v-btn
                      variant="outlined"
                      color="secondary"
                      @click="showTutorialDialog = true"
                    >
                      <v-icon start>ri-question-line</v-icon>
                      Guia Rápido
                    </v-btn>
                    <v-btn
                      variant="outlined"
                      @click="goBack"
                    >
                      <v-icon start>ri-arrow-left-line</v-icon>
                      Voltar
                    </v-btn>
                  </div>
                  
                  <v-btn
                    color="primary"
                    size="large"
                    :disabled="!candidateReadyButtonEnabled || !selectedDurationMinutes"
                    @click="toggleReadyState"
                    class="ready-btn"
                  >
                    <v-icon start>{{ myReadyState ? 'ri-stop-line' : 'ri-play-line' }}</v-icon>
                    {{ myReadyState ? 'Cancelar' : 'Iniciar Treinamento' }}
                  </v-btn>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </div>

    <div v-else-if="(simulationStarted || simulationEnded) && !isCountdownActive" class="simulation-main">
      <v-container fluid class="pa-0">
            <v-row no-gutters>
              <v-col cols="12" md="8" class="d-flex flex-column">
                <div class="pa-3 flex-grow-1">
                  <CandidateContentPanel :station-data="stationData" :is-dark-theme="isDarkTheme" :simulation-started="simulationStarted" />
                  <CandidateImpressosPanel
                    :released-data="Object.values(releasedData)"
                    :is-dark-theme="isDarkTheme"
                    :open-image-zoom="openImageZoom"
                    :get-image-source="getImageSource"
                    :get-image-id="getImageId"
                    :handle-image-error="handleImageError"
                    :handle-image-load="handleImageLoad"
                    :on-request-release-all="() => { confirmManualRelease = true }"
                  />

                  <v-card class="mb-4" v-if="simulationEnded && pendingImpressos.length">
                    <v-card-item>
                      <template #prepend><v-icon icon="ri-file-list-3-line" color="primary" /></template>
                      <v-card-title>Impressos não solicitados</v-card-title>
                    </v-card-item>
                    <v-card-text>
                      <v-list density="compact">
                        <v-list-item
                          v-for="impresso in pendingImpressos"
                          :key="impresso.idImpresso || impresso.id"
                          :title="impresso.tituloImpresso || impresso.titulo || 'Impresso'"
                        />
                      </v-list>
                    </v-card-text>
                  </v-card>

                  <v-card class="mb-4" v-if="simulationEnded && actorScriptSections.length">
                    <v-card-item>
                      <template #prepend><v-icon icon="ri-discuss-line" color="primary" /></template>
                      <v-card-title>Roteiro do ator</v-card-title>
                    </v-card-item>
                    <v-card-text>
                      <div
                        v-for="(section, idx) in actorScriptSections"
                        :key="idx"
                        class="mb-4"
                      >
                        <h6 class="text-subtitle-1 text-primary" v-if="section.contextoOuPerguntaChave">{{ section.contextoOuPerguntaChave }}</h6>
                        <div
                          class="text-body-2 actor-script-text"
                          v-if="section.informacao"
                          v-html="sanitizeActorScriptHtml(section.informacao)"
                        ></div>
                      </div>
                    </v-card-text>
                  </v-card>

                  <v-card class="mb-4">
                    <v-card-item>
                      <template #prepend><v-icon icon="ri-settings-line" color="primary" /></template>
                      <v-card-title>Controles</v-card-title>
                    </v-card-item>
                    <v-card-text>
                      <div class="d-flex flex-column gap-2">
                        <v-btn color="warning" variant="outlined" @click="manuallyEndSimulation" v-if="!simulationEnded" block>
                          <v-icon start>ri-stop-line</v-icon>
                          Finalizar
                        </v-btn>
                        <v-btn
                          v-if="simulationEnded && !evaluationSubmittedByCandidate"
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
                          v-if="simulationEnded"
                          color="primary"
                          variant="tonal"
                          @click="showPepCorrection = !showPepCorrection"
                          block
                        >
                          <v-icon start>ri-list-check-2-line</v-icon>
                          {{ showPepCorrection ? 'Ocultar Correção do PEP' : 'Correção do PEP' }}
                        </v-btn>
                      </div>
                    </v-card-text>
                  </v-card>

                  <v-expand-transition>
                    <div v-if="showPepCorrection">
                      <CandidateChecklist
                        :checklist-data="checklistData"
                        :simulation-started="simulationStarted"
                        :simulation-ended="simulationEnded"
                        :is-checklist-visible-for-candidate="isChecklistVisibleForCandidate"
                        :marked-pep-items="markedPepItems"
                        :candidate-received-scores="candidateReceivedScores"
                        :candidate-received-total-score="candidateReceivedTotalScore"
                        :candidate-received-details="candidateReceivedDetails"
                        :is-actor-or-evaluator="false"
                        :is-candidate="true"
                        @submit-evaluation="submitEvaluation"
                      />
                    </div>
                  </v-expand-transition>
                </div>
              </v-col>

              <v-col cols="12" md="4" class="d-flex flex-column chat-column" style="position: relative;">
                <div class="chat-fixed-wrapper">
                  <ChatPanel
                    ref="chatPanelRef"
                    :is-dark-theme="isDarkTheme"
                    :timer-display="timerDisplay"
                    :conversation-history="conversationHistory"
                    v-model:current-message="currentMessage"
                    :is-processing-message="isProcessingMessage"
                    :is-listening="isListening"
                    :auto-record-mode="autoRecordMode"
                    :show-mic-hint="showMicHint"
                    :format-timestamp="formatTimestamp"
                    :format-message-text="formatMessageText"
                    @sendMessage="handleSendMessage"
                    @handleKeyPress="handleChatKeyPress"
                    @toggleAutoRecordMode="toggleAutoRecordMode"
                    @startListening="handleStartListening"
                    @stopListening="handleStopListening"
                  />
                </div>
              </v-col>
            </v-row>
      </v-container>
    </div>

        <!-- Confirmação para liberação manual de impressos -->
        <v-dialog v-model="confirmManualRelease" max-width="520">
          <v-card>
            <v-card-title class="text-h6">Liberar todos os impressos?</v-card-title>
            <v-card-text>
              Esta ação irá liberar, de uma só vez, todos os impressos disponíveis nesta estação que ainda não foram liberados pelo fluxo com IA. Deseja continuar?
            </v-card-text>
            <v-card-actions>
              <v-spacer />
              <v-btn variant="text" @click="confirmManualRelease = false">Cancelar</v-btn>
              <v-btn color="primary" @click="releaseAllPendingMaterials">Confirmar</v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>

    <v-dialog v-model="showTutorialDialog" max-width="700">
      <v-card>
        <v-card-title class="text-h5">Guia Rápido: Treinamento com IA Virtual</v-card-title>
        <v-card-text>
          <h4 class="mb-2 text-primary">1. Como conversar com a IA</h4>
          <p class="mb-4">
            - Você pode falar ou digitar. Para voz, clique em <strong>Gravar</strong>; quando terminar, pare a gravação e clique em <strong>Enviar</strong> para registrar sua pergunta.<br>
            - Precisa que a IA continue ouvindo sozinha? Ative o botão <strong>Modo Automático</strong>.<br>
            - A IA responde como o personagem definido na estação, com voz e ritmo ajustados automaticamente.
          </p>

          <h4 class="mb-2 text-primary mt-4">2. Amostragem e liberação de impressos</h4>
          <p class="mb-4">
            - Para solicitar qualquer exame ou documento, comece com <strong>“Solicito …”</strong> (ex.: “Solicito sinais vitais”).<br>
            - Se o impresso existir, você verá a resposta <em>“[Título] liberado.”</em> e ele aparecerá no painel de Impressos.<br>
            - Precisa abrir tudo de uma vez? Use o botão <strong>“Liberar Impressos”</strong> no painel à esquerda.
          </p>

          <h4 class="mb-2 text-primary mt-4">3. Fluxo do treinamento com IA</h4>
          <p class="mb-4">
            - O cronômetro inicia quando você pressiona “Iniciar Treinamento” e a IA só responde após sua primeira interação.<br>
            - Assim que a simulação termina, os impressos restantes são liberados e você pode solicitar a avaliação automática do checklist.<br>
            - A IA gera feedback com base no que encontrou no PEP; use a resposta para revisar itens faltantes.
          </p>

          <h4 class="mb-2 text-primary mt-4">4. Boas práticas</h4>
          <p class="mb-4">
            - Mantenha perguntas curtas e diretas para facilitar o reconhecimento de voz.<br>
            - Se a IA não entender um pedido, reformule ou use os exemplos fornecidos no roteiro.<br>
            - Utilize o botão <strong>Finalizar</strong> sempre que quiser encerrar antes do tempo para garantir que o fluxo seja concluído corretamente.
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" @click="showTutorialDialog = false">Fechar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <ImageZoomModal
      v-model:is-open="imageZoomDialog"
      :image-url="zoomedImageSrc"
      :image-alt="zoomedImageAlt"
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
@import '@/assets/styles/simulation-view.scss';

/* Tela de preparação da IA - mantendo fundo roxo padrão */
.ai-pre-simulation-main {
  background: linear-gradient(135deg, rgba(7, 13, 34, 0.95), rgba(31, 18, 59, 0.9));
  min-height: 100vh;
  display: flex;
  align-items: center;
}

.ai-preparation-card {
  background: rgba(var(--v-theme-surface), 0.98) !important;
  border-radius: 20px !important;
  border: 1px solid rgba(var(--v-theme-outline), 0.12) !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08) !important;
  backdrop-filter: blur(16px);
}

.ai-prep-header {
  padding: 24px 24px 0;
  border-bottom: 1px solid rgba(var(--v-theme-outline), 0.08);
  margin-bottom: 0;
}

.ai-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: rgb(var(--v-theme-on-surface));
  margin: 0;
  line-height: 1.2;
}

.ai-subtitle {
  color: rgb(var(--v-theme-on-surface-variant));
  font-size: 1rem;
  margin: 4px 0 0;
  line-height: 1.4;
}

.duration-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.duration-btn {
  min-width: 80px;
  font-weight: 600;
  text-transform: none;
}

.status-card {
  transition: all 0.2s ease;
  border-radius: 12px !important;
}

.status-card:hover {
  box-shadow: 0 4px 16px rgba(var(--v-theme-primary), 0.1) !important;
  transform: translateY(-2px);
}

.ready-btn {
  min-width: 180px;
  font-weight: 600;
  text-transform: none;
  border-radius: 12px;
}

/* Responsividade para a nova interface de IA */
@media (max-width: 768px) {
  .ai-preparation-card {
    margin: 16px;
    border-radius: 16px !important;
  }
  
  .ai-prep-header {
    padding: 20px 20px 0;
  }
  
  .ai-title {
    font-size: 1.5rem;
  }
  
  .duration-selector {
    justify-content: center;
  }
  
  .d-flex.justify-space-between {
    flex-direction: column;
    gap: 16px;
  }
  
  .ready-btn {
    width: 100%;
  }
}

.simulation-container {
  min-height: 100vh;
}

.simulation-main {
  width: 100%;
  padding-bottom: 32px;
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
<style scoped>
/* Wrapper fixo do chat em telas md+ para evitar sobreposição */
@media (min-width: 960px) {
  .chat-fixed-wrapper {
    position: fixed;
    right: 16px;
    top: 80px; /* Ajustado para considerar navbar */
    bottom: 16px; /* Define bottom para height automática */
    width: calc(33.333% - 32px); /* ~col md=4 com margens */
    max-width: 520px;
    height: auto; /* Height automática baseada em top/bottom */
    z-index: 5;
  }
}

.chat-card {
  display: flex;
  flex-direction: column;
  height: 100%; /* Usa height completa do container */
  max-height: calc(100vh - 120px); /* Evita que fique muito alto */
  box-shadow: 0 10px 24px rgba(0,0,0,0.25);
  border-radius: 16px;
}

.chat-history {
  flex: 1 1 0; /* Mudado para 0 para forçar uso do min-height */
  overflow-y: auto; /* Scroll vertical apenas */
  overflow-x: hidden; /* Evita scroll horizontal */
  min-height: 200px; /* Height mínima */
  max-height: none; /* Remove limitação de height */
  padding-top: 16px !important; /* garante folga abaixo do header */
  scrollbar-width: thin; /* Firefox */
}

/* Customizar scrollbar */
.chat-history::-webkit-scrollbar {
  width: 6px;
}

.chat-history::-webkit-scrollbar-track {
  background: rgba(var(--v-theme-outline), 0.1);
  border-radius: 3px;
}

.chat-history::-webkit-scrollbar-thumb {
  background: rgba(var(--v-theme-primary), 0.3);
  border-radius: 3px;
}

.chat-history::-webkit-scrollbar-thumb:hover {
  background: rgba(var(--v-theme-primary), 0.5);
}

.chat-input-actions {
  flex: 0 0 auto; /* Não cresce nem encolhe */
  position: sticky; /* Fica sempre visível no bottom */
  bottom: 0;
  background: rgb(var(--v-theme-surface));
  border-top: 1px solid rgba(var(--v-theme-outline), 0.12);
  z-index: 1; /* Fica acima das mensagens */
}

/* Em telas pequenas, volta ao fluxo normal */
@media (max-width: 959px) {
  .chat-fixed-wrapper {
    position: static;
    width: auto;
    max-width: none;
    height: auto;
  }
  
  .chat-card {
    height: auto;
    max-height: 70vh; /* Limita height em mobile */
  }
  
  .chat-history {
    max-height: calc(70vh - 160px); /* Considera header + input */
    min-height: 300px;
  }
}
</style>
