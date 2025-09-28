<script setup>
// Aceitar props para evitar warnings do Vue Router
defineProps({
  id: String
})

// Imports - seguindo mesmo padrão do SimulationView.vue
import { usePrivateChatNotification } from '@/plugins/privateChatListener.js'
import { currentUser } from '@/plugins/auth.js'
import { db } from '@/plugins/firebase.js'
import { backendUrl } from '@/utils/backendUrl.js'
import {
  formatTime,
  getEvaluationColor,
  getEvaluationLabel,
  formatActorText,
  formatIdentificacaoPaciente,
  formatItemDescriptionForDisplay,
  parseEnumeratedItems,
  splitIntoParagraphs,
  getInfrastructureColor,
  getInfrastructureIcon,
  processInfrastructureItems
} from '@/utils/simulationUtils.ts'
import { addDoc, collection, doc, getDoc } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { computed, onMounted, onUnmounted, ref, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTheme } from 'vuetify'
import PepSideView from '@/components/PepSideView.vue'

// Configuração do tema
const theme = useTheme()
const isDarkTheme = computed(() => theme.global.name.value === 'dark')

// Configuração do chat privado
const { reloadListeners } = usePrivateChatNotification()

const route = useRoute()
const router = useRouter()

// Refs para dados da estação e checklist - seguindo mesmo padrão
const stationData = ref(null)
const checklistData = ref(null)
const isLoading = ref(true)
const errorMessage = ref('')

// Refs para controle de simulação AI
const sessionId = ref(null)
const stationId = ref(route.params.id)
const userRole = ref('candidate') // Usuário sempre candidato na simulação AI
const aiPartner = ref({ name: 'IA Virtual', role: 'actor' }) // IA como ator/avaliador

// Refs para estado de simulação - seguindo mesmo padrão
const myReadyState = ref(false)
const aiReadyState = ref(false) // IA sempre pronta
const simulationStarted = ref(false)
const simulationEnded = ref(false)
const candidateReadyButtonEnabled = ref(false)

// Refs para timer - seguindo mesmo padrão
const simulationTimeSeconds = ref(10 * 60)
const timerDisplay = ref(formatTime(simulationTimeSeconds.value))
const selectedDurationMinutes = ref(10)

// Refs para dados da simulação - seguindo mesmo padrão
const releasedData = ref({})
const evaluationScores = ref({})
const isChecklistVisibleForCandidate = ref(false)
const pepReleasedToCandidate = ref(false)
const evaluationSubmittedByCandidate = ref(false)
const actorVisibleImpressoContent = ref({})
const candidateReceivedScores = ref({})
const candidateReceivedTotalScore = ref(0)
const actorReleasedImpressoIds = ref({})

// Refs para PEP - seguindo mesmo padrão
const pepViewState = ref({ isVisible: false })
const markedPepItems = ref({})

// Refs para comunicação AI
const conversationHistory = ref([])
const currentMessage = ref('')
const isProcessingMessage = ref(false)
const chatContainer = ref(null)
const messageInput = ref(null)

// Refs para controle de voz
const isListening = ref(false)
const speechRecognition = ref(null)
const isSpeaking = ref(false)
const speechSynthesis = ref(null)

// Estatísticas AI
const aiStats = ref({
  messageCount: 0,
  tokensUsed: 0,
  keyUsed: null
})

// Propriedades computadas
const isCandidate = computed(() => true) // Sempre candidato
const isActorOrEvaluator = computed(() => false) // Nunca ator/avaliador

const canSendMessage = computed(() =>
  currentMessage.value.trim().length > 0 &&
  !isProcessingMessage.value &&
  simulationStarted.value
)

const bothUsersReady = computed(() => myReadyState.value && aiReadyState.value)

// Inicializar dados da estação - seguindo mesmo padrão do SimulationView
async function fetchSimulationData(currentStationId) {
  if (!currentStationId) {
    errorMessage.value = 'ID da estação inválido.'
    isLoading.value = false
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    const auth = getAuth()
    const user = auth.currentUser

    if (!user) {
      throw new Error('Usuário não autenticado no Firebase')
    }

    // Carregar dados da estação do Firestore
    const stationRef = doc(db, 'estacoes_clinicas', currentStationId)
    const stationDoc = await getDoc(stationRef)

    if (!stationDoc.exists()) {
      throw new Error('Estação não encontrada no banco de dados')
    }

    const data = stationDoc.data()
    stationData.value = { id: currentStationId, ...data }

    // Configurar timer
    simulationTimeSeconds.value = selectedDurationMinutes.value * 60
    timerDisplay.value = formatTime(simulationTimeSeconds.value)

    // Carregar checklist (PEP)
    if (stationData.value?.padraoEsperadoProcedimento) {
      checklistData.value = stationData.value.padraoEsperadoProcedimento

      if (stationData.value.feedbackEstacao && !checklistData.value.feedbackEstacao) {
        checklistData.value.feedbackEstacao = stationData.value.feedbackEstacao
      }

      if (checklistData.value.itensAvaliacao?.length > 0) {
        checklistData.value.itensAvaliacao.forEach(item => {
          if (item.idItem && !markedPepItems.value[item.idItem]) {
            markedPepItems.value[item.idItem] = []
          }
        })
      }
    }

    // Inicializar sessão AI
    await initializeAISession()

  } catch (error) {
    console.error('Erro ao carregar dados da estação:', error)
    errorMessage.value = error.message
  } finally {
    isLoading.value = false
  }
}

// Inicializar sessão AI
async function initializeAISession() {
  try {
    const response = await fetch(`${backendUrl}/api/ai-simulation/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'user-id': currentUser.value?.uid || 'anonymous'
      },
      body: JSON.stringify({
        stationId: stationId.value,
        userId: currentUser.value?.uid || 'anonymous',
        stationData: stationData.value
      })
    })

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.error || 'Falha ao iniciar sessão AI')
    }

    sessionId.value = result.sessionId
    aiReadyState.value = true // IA sempre pronta

    // NÃO adicionar mensagem automática - candidato deve iniciar

    console.log('✅ Sessão AI iniciada com sucesso:', result)

  } catch (error) {
    console.error('❌ Erro ao iniciar sessão AI:', error)
    throw error
  }
}

// Funções de controle da simulação - seguindo mesmo padrão
function toggleReadyState() {
  if (!candidateReadyButtonEnabled.value) return
  myReadyState.value = !myReadyState.value
}

function startSimulationTimer() {
  if (!bothUsersReady.value) return

  simulationStarted.value = true

  const interval = setInterval(() => {
    if (simulationTimeSeconds.value > 0 && !simulationEnded.value) {
      simulationTimeSeconds.value--
      timerDisplay.value = formatTime(simulationTimeSeconds.value)
    } else {
      clearInterval(interval)
      if (!simulationEnded.value) {
        endSimulation()
      }
    }
  }, 1000)
}

function endSimulation() {
  simulationEnded.value = true
  // Liberar PEP para candidato
  pepReleasedToCandidate.value = true
  isChecklistVisibleForCandidate.value = true
}

// Enviar mensagem para IA
async function sendMessage() {
  if (!canSendMessage.value) return

  const message = currentMessage.value.trim()
  currentMessage.value = ''
  isProcessingMessage.value = true

  // Adicionar mensagem do candidato ao histórico
  conversationHistory.value.push({
    role: 'candidate',
    content: message,
    timestamp: new Date()
  })

  await nextTick()
  scrollToBottom()

  try {
    const response = await fetch(`${backendUrl}/api/ai-simulation/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'user-id': currentUser.value?.uid || 'anonymous'
      },
      body: JSON.stringify({
        sessionId: sessionId.value,
        message: message,
        stationData: stationData.value,
        releasedData: releasedData.value
      })
    })

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.error || 'Falha ao processar mensagem')
    }

    // Adicionar resposta da IA
    conversationHistory.value.push({
      role: 'ai_actor',
      content: result.aiResponse,
      timestamp: new Date(),
      materialsReleased: result.materialsReleased || []
    })

    // Falar a resposta da IA automaticamente
    speakText(result.aiResponse)

    // Processar materiais liberados
    if (result.materialsReleased?.length > 0) {
      result.materialsReleased.forEach(material => {
        if (!releasedData.value[material.idImpresso]) {
          releasedData.value[material.idImpresso] = material
        }
      })
    }

    // Atualizar estatísticas
    aiStats.value.messageCount++
    aiStats.value.tokensUsed += result.metadata?.tokensUsed || 0
    aiStats.value.keyUsed = result.metadata?.keyUsed

  } catch (error) {
    console.error('❌ Erro ao enviar mensagem:', error)
    conversationHistory.value.push({
      role: 'system',
      content: `Erro: ${error.message}`,
      timestamp: new Date(),
      isError: true
    })
  } finally {
    isProcessingMessage.value = false
    await nextTick()
    scrollToBottom()
  }
}

// Função para alternar marcação de itens do PEP - seguindo mesmo padrão
function togglePepItemMark(itemId, pointIndex) {
  if (!markedPepItems.value[itemId]) {
    markedPepItems.value[itemId] = []
  }

  while (markedPepItems.value[itemId].length <= pointIndex) {
    markedPepItems.value[itemId].push(false)
  }

  const currentItemMarks = [...markedPepItems.value[itemId]]
  currentItemMarks[pointIndex] = !currentItemMarks[pointIndex]
  markedPepItems.value[itemId] = currentItemMarks
  markedPepItems.value = { ...markedPepItems.value }
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

    console.log('✅ Avaliação submetida com sucesso')

  } catch (error) {
    console.error('❌ Erro ao submeter avaliação:', error)
  }
}

// Finalizar simulação AI
async function finalizeAISimulation() {
  try {
    await fetch(`${backendUrl}/api/ai-simulation/end`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'user-id': currentUser.value?.uid || 'anonymous'
      },
      body: JSON.stringify({
        sessionId: sessionId.value,
        finalData: {
          evaluations: markedPepItems.value,
          stats: aiStats.value,
          conversationHistory: conversationHistory.value
        }
      })
    })
  } catch (error) {
    console.warn('Erro ao finalizar simulação AI:', error)
  }
}


// Funções auxiliares
function scrollToBottom() {
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight
  }
}

function formatTimestamp(timestamp) {
  return new Date(timestamp).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

function goBack() {
  finalizeAISimulation()
  router.push('/app/station-list')
}

function handleKeyPress(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    sendMessage()
  }
}

// Funções de voz
function initSpeechRecognition() {
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    speechRecognition.value = new SpeechRecognition()
    speechRecognition.value.lang = 'pt-BR'
    speechRecognition.value.continuous = false
    speechRecognition.value.interimResults = false

    speechRecognition.value.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      currentMessage.value = transcript
      isListening.value = false
    }

    speechRecognition.value.onerror = (event) => {
      console.error('Speech recognition error:', event.error)
      isListening.value = false
    }

    speechRecognition.value.onend = () => {
      isListening.value = false
    }
  }
}

function startListening() {
  if (speechRecognition.value && !isListening.value) {
    isListening.value = true
    speechRecognition.value.start()
  }
}

function stopListening() {
  if (speechRecognition.value && isListening.value) {
    speechRecognition.value.stop()
    isListening.value = false
  }
}

function speakText(text) {
  if ('speechSynthesis' in window) {
    // Parar qualquer fala em andamento
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'pt-BR'
    utterance.rate = 0.9
    utterance.pitch = 1.0

    utterance.onstart = () => {
      isSpeaking.value = true
    }

    utterance.onend = () => {
      isSpeaking.value = false
    }

    utterance.onerror = () => {
      isSpeaking.value = false
    }

    window.speechSynthesis.speak(utterance)
  }
}

function stopSpeaking() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel()
    isSpeaking.value = false
  }
}

// Watchers - seguindo mesmo padrão
watch(bothUsersReady, (newValue) => {
  if (newValue && !simulationStarted.value) {
    startSimulationTimer()
  }
})

watch(myReadyState, (newValue) => {
  if (newValue && aiReadyState.value && !simulationStarted.value) {
    setTimeout(() => {
      startSimulationTimer()
    }, 1000)
  }
})

watch(selectedDurationMinutes, (newValue) => {
  if (!simulationStarted.value) {
    simulationTimeSeconds.value = newValue * 60
    timerDisplay.value = formatTime(simulationTimeSeconds.value)
  }
})

// Lifecycle
onMounted(async () => {
  if (!currentUser.value) {
    errorMessage.value = 'Usuário não autenticado'
    return
  }

  // Inicializar reconhecimento de voz
  initSpeechRecognition()

  // Habilitar botão de pronto após delay
  setTimeout(() => {
    candidateReadyButtonEnabled.value = true
  }, 3000)

  // Carregar dados da estação
  await fetchSimulationData(stationId.value)

  // Focus no input após simulação iniciar
  await nextTick()
  if (messageInput.value && simulationStarted.value) {
    messageInput.value.focus()
  }
})

onUnmounted(() => {
  finalizeAISimulation()
})
</script>

<template>
  <div class="simulation-container">
    <!-- Header da simulação -->
    <v-app-bar color="primary" density="comfortable" elevation="2">
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
    </v-app-bar>

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
    <v-main v-else-if="!simulationStarted" class="d-flex align-center justify-center">
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
                    <v-btn :value="5">5 min</v-btn>
                    <v-btn :value="10">10 min</v-btn>
                    <v-btn :value="15">15 min</v-btn>
                    <v-btn :value="20">20 min</v-btn>
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
          <!-- Chat de comunicação central -->
          <v-col
            :cols="pepViewState.isVisible ? 6 : 8"
            class="d-flex flex-column"
          >
            <!-- Timer do candidato -->
            <v-card class="ma-2 mb-1" flat>
              <v-card-text class="py-2">
                <div class="timer-display-candidate" :class="{ 'ended': simulationEnded }">
                  <v-icon icon="ri-time-line" class="me-1" />
                  {{ timerDisplay }}
                </div>
              </v-card-text>
            </v-card>

            <!-- Chat de comunicação -->
            <v-card class="flex-1-1 d-flex flex-column ma-2" flat>
              <v-card-title class="d-flex align-center py-2">
                <v-icon class="me-2">ri-chat-3-line</v-icon>
                Comunicação com Paciente Virtual
                <v-spacer />
                <v-chip
                  size="small"
                  :color="simulationEnded ? 'error' : 'success'"
                  variant="tonal"
                >
                  {{ simulationEnded ? 'Finalizada' : 'Em andamento' }}
                </v-chip>
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
                    <span class="text-caption font-weight-bold">
                      {{
                        message.role === 'candidate' ? 'Você (Candidato)' :
                        message.role === 'ai_actor' ? 'Paciente Virtual' :
                        'Sistema'
                      }}
                      <v-icon
                        v-if="message.role === 'ai_actor' && isSpeaking"
                        size="12"
                        color="success"
                        class="ml-1"
                      >
                        ri-volume-up-line
                      </v-icon>
                    </span>
                    <v-spacer />
                    <span class="text-caption text-medium-emphasis">
                      {{ formatTimestamp(message.timestamp) }}
                    </span>
                  </div>

                  <div class="message-content">
                    <v-card
                      :color="message.role === 'candidate' ? 'primary' :
                              message.role === 'ai_actor' ? 'surface-variant' :
                              message.isError ? 'error' : 'info'"
                      :variant="message.role === 'candidate' ? 'elevated' : 'tonal'"
                      class="pa-3"
                    >
                      <div
                        :class="{ 'text-white': message.role === 'candidate' }"
                        class="text-body-2"
                        style="white-space: pre-wrap;"
                      >
                        {{ message.content }}
                      </div>

                      <!-- Materiais liberados pela IA -->
                      <div v-if="message.materialsReleased?.length > 0" class="mt-2">
                        <v-chip
                          v-for="material in message.materialsReleased"
                          :key="material.idImpresso"
                          size="small"
                          color="success"
                          variant="outlined"
                          class="me-1 mb-1"
                        >
                          <v-icon start size="12">ri-file-check-line</v-icon>
                          Material liberado
                        </v-chip>
                      </div>
                    </v-card>
                  </div>
                </div>

                <!-- Indicador de processamento -->
                <div v-if="isProcessingMessage" class="message-item">
                  <div class="message-header d-flex align-center mb-1">
                    <v-avatar size="24" color="green" class="me-2">
                      <v-icon size="12" color="white">ri-robot-line</v-icon>
                    </v-avatar>
                    <span class="text-caption font-weight-bold">
                      Paciente Virtual
                    </span>
                  </div>
                  <v-card color="surface-variant" variant="tonal" class="pa-3">
                    <div class="d-flex align-center">
                      <v-progress-circular
                        indeterminate
                        size="16"
                        width="2"
                        class="me-2"
                      />
                      <span class="text-body-2 text-medium-emphasis">
                        IA processando resposta...
                      </span>
                    </div>
                  </v-card>
                </div>
              </div>

              <!-- DEBUG: simulationEnded = {{ simulationEnded }} -->

              <!-- Input de mensagem com controles de voz -->
              <v-card-actions class="pa-4" style="border-top: 1px solid #ccc; background: white; position: sticky; bottom: 0; z-index: 100;">
                <v-text-field
                  ref="messageInput"
                  v-model="currentMessage"
                  label="Digite ou fale sua pergunta..."
                  placeholder="Ex: Bom dia! Qual o seu nome?"
                  variant="outlined"
                  density="comfortable"
                  :disabled="isProcessingMessage"
                  @keydown="handleKeyPress"
                  hide-details
                  class="flex-1-1"
                  append-inner-icon="ri-send-plane-line"
                  @click:append-inner="sendMessage"
                />

                <!-- Botão de microfone -->
                <v-btn
                  :color="isListening ? 'error' : 'secondary'"
                  :variant="isListening ? 'elevated' : 'outlined'"
                  size="large"
                  class="ml-2"
                  :disabled="isProcessingMessage"
                  @click="isListening ? stopListening() : startListening()"
                  v-if="speechRecognition"
                >
                  <v-icon>{{ isListening ? 'ri-mic-off-line' : 'ri-mic-line' }}</v-icon>
                </v-btn>

                <!-- Botão para parar fala da IA -->
                <v-btn
                  color="warning"
                  variant="outlined"
                  size="large"
                  class="ml-2"
                  :disabled="!isSpeaking"
                  @click="stopSpeaking"
                  v-if="isSpeaking"
                >
                  <v-icon>ri-volume-mute-line</v-icon>
                </v-btn>

                <!-- Botão de enviar -->
                <v-btn
                  color="primary"
                  variant="elevated"
                  size="large"
                  class="ml-2"
                  :disabled="!canSendMessage"
                  :loading="isProcessingMessage"
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

          <!-- Sidebar com informações do candidato -->
          <v-col
            v-if="!pepViewState.isVisible"
            cols="12"
            md="4"
            class="d-flex flex-column overflow-y-auto"
          >
            <div class="pa-3">
              <!-- Cenário do Atendimento -->
              <v-card class="mb-4" v-if="stationData?.instrucoesParticipante?.cenarioAtendimento">
                <v-card-item>
                  <template #prepend>
                    <v-icon icon="ri-hospital-line" color="info" />
                  </template>
                  <v-card-title>Cenário</v-card-title>
                </v-card-item>
                <v-card-text class="text-body-2">
                  <p><strong>Nível:</strong> {{ stationData.instrucoesParticipante.cenarioAtendimento?.nivelAtencao }}</p>
                  <p><strong>Tipo:</strong> {{ stationData.instrucoesParticipante.cenarioAtendimento?.tipoAtendimento }}</p>
                  <div v-if="stationData.instrucoesParticipante.cenarioAtendimento?.infraestruturaUnidade?.length">
                    <p class="font-weight-bold mb-2">Infraestrutura:</p>
                    <ul class="infra-list">
                      <li v-for="(item, index) in processInfrastructureItems(stationData.instrucoesParticipante.cenarioAtendimento.infraestruturaUnidade)"
                          :key="`infra-sidebar-${index}`"
                          class="d-flex align-center mb-1">
                        <v-icon
                          :icon="getInfrastructureIcon(item)"
                          :color="getInfrastructureColor(item)"
                          class="me-2"
                          size="16"
                        />
                        <span class="text-caption">
                          {{ item.startsWith('- ') ? item.substring(2) : item }}
                        </span>
                      </li>
                    </ul>
                  </div>
                </v-card-text>
              </v-card>

              <!-- Descrição do Caso -->
              <v-card class="mb-4" v-if="stationData?.instrucoesParticipante?.descricaoCasoCompleta">
                <v-card-item>
                  <template #prepend>
                    <v-icon icon="ri-file-text-line" color="primary" />
                  </template>
                  <v-card-title>Caso Clínico</v-card-title>
                </v-card-item>
                <v-card-text class="text-body-2" v-html="stationData.instrucoesParticipante.descricaoCasoCompleta" />
              </v-card>

              <!-- Suas Tarefas -->
              <v-card class="mb-4" v-if="stationData?.instrucoesParticipante?.tarefasPrincipais?.length">
                <v-card-item>
                  <template #prepend>
                    <v-icon icon="ri-task-line" color="success" />
                  </template>
                  <v-card-title>Suas Tarefas</v-card-title>
                </v-card-item>
                <v-card-text class="text-body-2">
                  <ul class="tasks-list">
                    <li v-for="(tarefa, i) in stationData.instrucoesParticipante.tarefasPrincipais" :key="`task-sidebar-${i}`" v-html="tarefa"></li>
                  </ul>
                </v-card-text>
              </v-card>

              <!-- Avisos Importantes -->
              <v-card class="mb-4" v-if="stationData?.instrucoesParticipante?.avisosImportantes?.length">
                <v-card-item>
                  <template #prepend>
                    <v-icon icon="ri-error-warning-line" color="warning" />
                  </template>
                  <v-card-title>Avisos</v-card-title>
                </v-card-item>
                <v-card-text class="text-body-2">
                  <ul class="warnings-list">
                    <li v-for="(aviso, i) in stationData.instrucoesParticipante.avisosImportantes" :key="`warning-sidebar-${i}`">
                      {{ aviso }}
                    </li>
                  </ul>
                </v-card-text>
              </v-card>

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
                      v-if="simulationEnded"
                      color="primary"
                      variant="elevated"
                      @click="pepViewState.isVisible = true"
                      block
                    >
                      <v-icon start>ri-checklist-line</v-icon>
                      Ver PEP
                    </v-btn>
                    <v-btn
                      v-if="simulationEnded && !evaluationSubmittedByCandidate"
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
                      @click="endSimulation"
                      v-if="!simulationEnded"
                      block
                    >
                      <v-icon start>ri-stop-line</v-icon>
                      Finalizar
                    </v-btn>
                  </div>
                </v-card-text>
              </v-card>

              <!-- Materiais liberados -->
              <v-card class="mb-4">
                <v-expansion-panels variant="accordion" class="mb-0">
                  <v-expansion-panel>
                    <v-expansion-panel-title>
                      <div class="d-flex align-center">
                        <v-icon class="me-2">ri-file-list-3-line</v-icon>
                        Materiais Liberados
                        <v-chip
                          v-if="Object.keys(releasedData).length > 0"
                          size="small"
                          color="success"
                          class="ml-2"
                        >
                          {{ Object.keys(releasedData).length }}
                        </v-chip>
                      </div>
                    </v-expansion-panel-title>

                    <v-expansion-panel-text>
                      <div v-if="Object.keys(releasedData).length === 0" class="text-center pa-4">
                        <v-icon size="48" color="grey-lighten-1" class="mb-2">ri-file-search-line</v-icon>
                        <div class="text-body-2 text-medium-emphasis">
                          Nenhum material liberado ainda
                        </div>
                        <div class="text-caption text-medium-emphasis mt-1">
                          Solicite exames durante a consulta
                        </div>
                      </div>

                      <v-list v-else density="compact">
                        <v-list-item
                          v-for="(material, id) in releasedData"
                          :key="id"
                        >
                          <template #prepend>
                            <v-icon color="success">ri-file-check-line</v-icon>
                          </template>
                          <v-list-item-title>{{ material.tituloImpresso || 'Material' }}</v-list-item-title>
                          <v-list-item-subtitle>{{ material.tipoConteudo || 'Documento' }}</v-list-item-subtitle>
                        </v-list-item>
                      </v-list>
                    </v-expansion-panel-text>
                  </v-expansion-panel>

                  <!-- Estatísticas -->
                  <v-expansion-panel>
                    <v-expansion-panel-title>
                      <v-icon class="me-2">ri-bar-chart-line</v-icon>
                      Estatísticas
                    </v-expansion-panel-title>

                    <v-expansion-panel-text>
                      <v-list density="compact">
                        <v-list-item>
                          <v-list-item-title>Tempo restante</v-list-item-title>
                          <v-list-item-subtitle>{{ timerDisplay }}</v-list-item-subtitle>
                        </v-list-item>
                        <v-list-item>
                          <v-list-item-title>Mensagens trocadas</v-list-item-title>
                          <v-list-item-subtitle>{{ aiStats.messageCount }}</v-list-item-subtitle>
                        </v-list-item>
                        <v-list-item>
                          <v-list-item-title>Materiais liberados</v-list-item-title>
                          <v-list-item-subtitle>{{ Object.keys(releasedData).length }}</v-list-item-subtitle>
                        </v-list-item>
                        <v-list-item v-if="aiStats.keyUsed">
                          <v-list-item-title>API utilizada</v-list-item-title>
                          <v-list-item-subtitle>
                            <v-chip
                              size="x-small"
                              :color="aiStats.keyUsed === 'free' ? 'success' : 'warning'"
                            >
                              {{ aiStats.keyUsed === 'free' ? 'Gratuita' : 'Paga' }}
                            </v-chip>
                          </v-list-item-subtitle>
                        </v-list-item>
                        <v-list-item v-if="evaluationSubmittedByCandidate">
                          <v-list-item-title>Status</v-list-item-title>
                          <v-list-item-subtitle>
                            <v-chip size="x-small" color="success">
                              Avaliação enviada
                            </v-chip>
                          </v-list-item-subtitle>
                        </v-list-item>
                      </v-list>
                    </v-expansion-panel-text>
                  </v-expansion-panel>
                </v-expansion-panels>
              </v-card>
            </div>
          </v-col>

          <!-- PEP Side View - Integração com componente existente -->
          <v-col
            v-if="pepViewState.isVisible"
            cols="12"
            md="6"
            class="d-flex flex-column"
          >
            <PepSideView
              v-if="checklistData && pepReleasedToCandidate"
              :pep-data="checklistData.itensAvaliacao || []"
              :marked-pep-items="markedPepItems"
              :toggle-pep-item-mark="togglePepItemMark"
              class="flex-1-1"
            />
            <v-card v-else class="flex-1-1 d-flex align-center justify-center">
              <div class="text-center">
                <v-icon size="64" color="grey-lighten-1" class="mb-4">ri-checklist-line</v-icon>
                <h3 class="mb-2">PEP não disponível</h3>
                <p class="text-medium-emphasis">
                  O PEP será liberado após o término da simulação.
                </p>
              </div>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </div>
</template>

<style scoped>
.simulation-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.simulation-main {
  flex: 1;
  overflow: hidden;
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

.chat-history.dark-theme {
  background-color: rgb(var(--v-theme-surface-variant));
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
}
</style>