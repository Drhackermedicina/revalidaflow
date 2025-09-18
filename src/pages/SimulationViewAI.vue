<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTheme } from 'vuetify'
import { currentUser } from '@/plugins/auth.js'
import { backendUrl } from '@/utils/backendUrl.js'

// Configuração do tema
const theme = useTheme()
const isDarkTheme = computed(() => theme.global.name.value === 'dark')

const route = useRoute()
const router = useRouter()

// Estado da simulação
const isLoading = ref(true)
const isConnecting = ref(false)
const isProcessingMessage = ref(false)
const errorMessage = ref('')

// Dados da simulação
const sessionId = ref(null)
const stationId = ref(route.params.id)
const stationData = ref(null)
const patientProfile = ref(null)
const conversationHistory = ref([])
const releasedMaterials = ref([])

// Interface do chat
const currentMessage = ref('')
const chatContainer = ref(null)
const messageInput = ref(null)

// Estatísticas e monitoramento
const stats = ref({
  messageCount: 0,
  tokensUsed: 0,
  keyUsed: null,
  startTime: null
})

// Computed properties
const canSendMessage = computed(() =>
  currentMessage.value.trim().length > 0 &&
  !isProcessingMessage.value &&
  sessionId.value
)

const simulationTime = computed(() => {
  if (!stats.value.startTime) return '00:00'
  const elapsed = Math.floor((Date.now() - stats.value.startTime) / 1000)
  const minutes = Math.floor(elapsed / 60)
  const seconds = elapsed % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
})

// Inicializar simulação
async function startSimulation() {
  try {
    isLoading.value = true
    errorMessage.value = ''

    console.log('🔥 [FRONTEND] backendUrl:', backendUrl)
    console.log('🔥 [FRONTEND] URL completa:', `${backendUrl}/api/ai-simulation/start`)

    const response = await fetch(`${backendUrl}/api/ai-simulation/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'user-id': currentUser.value?.uid || 'anonymous'
      },
      body: JSON.stringify({
        stationId: stationId.value,
        userId: currentUser.value?.uid || 'anonymous'
      })
    })

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.error || 'Falha ao iniciar simulação')
    }

    sessionId.value = result.sessionId
    stationData.value = {
      id: result.stationId,
      tituloEstacao: result.stationTitle
    }
    patientProfile.value = result.patientProfile

    // Adicionar mensagem de boas-vindas
    conversationHistory.value = [{
      role: 'paciente',
      content: result.welcomeMessage,
      timestamp: new Date(),
      isWelcome: true
    }]

    stats.value.startTime = Date.now()

    console.log('✅ Simulação iniciada com sucesso:', result)

  } catch (error) {
    console.error('❌ Erro ao iniciar simulação:', error)
    errorMessage.value = error.message
  } finally {
    isLoading.value = false
  }
}

// Enviar mensagem
async function sendMessage() {
  if (!canSendMessage.value) return

  const message = currentMessage.value.trim()
  currentMessage.value = ''
  isProcessingMessage.value = true

  // Adicionar mensagem do médico ao histórico
  conversationHistory.value.push({
    role: 'medico',
    content: message,
    timestamp: new Date()
  })

  // Scroll para baixo
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
        message: message
      })
    })

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.error || 'Falha ao processar mensagem')
    }

    // Adicionar resposta do paciente
    conversationHistory.value.push({
      role: 'paciente',
      content: result.patientResponse,
      timestamp: new Date(),
      contextUsed: result.contextUsed || [],
      materialsReleased: result.materialsReleased || []
    })

    // Atualizar materiais liberados
    if (result.materialsReleased && result.materialsReleased.length > 0) {
      result.materialsReleased.forEach(material => {
        if (!releasedMaterials.value.find(m => m.idImpresso === material.idImpresso)) {
          releasedMaterials.value.push(material)
        }
      })
    }

    // Atualizar estatísticas
    stats.value.messageCount++
    stats.value.tokensUsed += result.metadata?.tokensUsed || 0
    stats.value.keyUsed = result.metadata?.keyUsed

  } catch (error) {
    console.error('❌ Erro ao enviar mensagem:', error)

    // Adicionar mensagem de erro do sistema
    conversationHistory.value.push({
      role: 'sistema',
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

// Solicitar material específico
async function requestMaterial(materialName) {
  if (isProcessingMessage.value) return

  isProcessingMessage.value = true

  try {
    const response = await fetch(`${backendUrl}/api/ai-simulation/request-material`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'user-id': currentUser.value?.uid || 'anonymous'
      },
      body: JSON.stringify({
        sessionId: sessionId.value,
        materialKeywords: materialName
      })
    })

    const result = await response.json()

    if (result.success && result.materialsReleased?.length > 0) {
      // Adicionar materiais liberados
      result.materialsReleased.forEach(material => {
        if (!releasedMaterials.value.find(m => m.idImpresso === material.idImpresso)) {
          releasedMaterials.value.push(material)
        }
      })

      // Adicionar mensagem do sistema
      conversationHistory.value.push({
        role: 'sistema',
        content: `📋 Material liberado: ${result.materialNames}`,
        timestamp: new Date(),
        materialsReleased: result.materialsReleased
      })
    }

  } catch (error) {
    console.error('❌ Erro ao solicitar material:', error)
  } finally {
    isProcessingMessage.value = false
  }
}

// Scroll para o final do chat
function scrollToBottom() {
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight
  }
}

// Formatar timestamp
function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Finalizar simulação
async function endSimulation() {
  try {
    await fetch(`${backendUrl}/api/ai-simulation/end`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'user-id': currentUser.value?.uid || 'anonymous'
      },
      body: JSON.stringify({
        sessionId: sessionId.value
      })
    })
  } catch (error) {
    console.warn('Erro ao finalizar simulação:', error)
  }
}

// Voltar para a lista de estações
function goBack() {
  endSimulation()
  router.push('/app/station-list')
}

// Event listeners
function handleKeyPress(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    sendMessage()
  }
}

// Lifecycle
onMounted(async () => {
  if (!currentUser.value) {
    errorMessage.value = 'Usuário não autenticado'
    return
  }

  await startSimulation()

  // Focus no input de mensagem
  await nextTick()
  if (messageInput.value) {
    messageInput.value.focus()
  }
})

onUnmounted(() => {
  endSimulation()
})
</script>

<template>
  <div class="ai-simulation-container">
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
            {{ simulationTime }}
          </div>
          <div class="text-caption">
            {{ stats.messageCount }} mensagens
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
        <v-card-title>Iniciando simulação com IA...</v-card-title>
        <v-card-text>
          Conectando ao sistema de simulação e carregando dados da estação
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

    <!-- Interface principal -->
    <v-main v-else class="ai-simulation-main">
      <v-container fluid class="pa-0 fill-height">
        <v-row no-gutters class="fill-height">
          <!-- Chat principal -->
          <v-col cols="12" md="8" class="d-flex flex-column">
            <!-- Área do chat -->
            <v-card class="flex-1-1 d-flex flex-column" flat>
              <!-- Histórico de conversa -->
              <div
                ref="chatContainer"
                class="chat-history flex-1-1 pa-4"
                :class="{ 'dark-theme': isDarkTheme }"
              >
                <div
                  v-for="(message, index) in conversationHistory"
                  :key="index"
                  class="message-item mb-4"
                  :class="{
                    'message-medico': message.role === 'medico',
                    'message-paciente': message.role === 'paciente',
                    'message-sistema': message.role === 'sistema',
                    'message-welcome': message.isWelcome,
                    'message-error': message.isError
                  }"
                >
                  <div class="message-header d-flex align-center mb-1">
                    <v-avatar
                      size="24"
                      :color="message.role === 'medico' ? 'blue' :
                              message.role === 'paciente' ? 'green' : 'orange'"
                      class="me-2"
                    >
                      <v-icon size="12" color="white">
                        {{
                          message.role === 'medico' ? 'ri-user-line' :
                          message.role === 'paciente' ? 'ri-user-heart-line' :
                          'ri-robot-line'
                        }}
                      </v-icon>
                    </v-avatar>
                    <span class="text-caption font-weight-bold">
                      {{
                        message.role === 'medico' ? 'Você' :
                        message.role === 'paciente' ? (patientProfile?.name || 'Paciente') :
                        'Sistema'
                      }}
                    </span>
                    <v-spacer />
                    <span class="text-caption text-medium-emphasis">
                      {{ formatTime(message.timestamp) }}
                    </span>
                  </div>

                  <div class="message-content">
                    <v-card
                      :color="message.role === 'medico' ? 'primary' :
                              message.role === 'paciente' ? 'surface-variant' :
                              message.isError ? 'error' : 'info'"
                      :variant="message.role === 'medico' ? 'elevated' : 'tonal'"
                      class="pa-3"
                    >
                      <div
                        :class="{ 'text-white': message.role === 'medico' }"
                        class="text-body-2"
                        style="white-space: pre-wrap;"
                      >
                        {{ message.content }}
                      </div>

                      <!-- Materiais liberados -->
                      <div v-if="message.materialsReleased?.length > 0" class="mt-2">
                        <v-chip
                          v-for="material in message.materialsReleased"
                          :key="material.idImpresso"
                          size="small"
                          color="success"
                          variant="outlined"
                          class="me-1 mb-1"
                        >
                          <v-icon start size="12">ri-file-line</v-icon>
                          {{ material.tituloImpresso }}
                        </v-chip>
                      </div>
                    </v-card>
                  </div>
                </div>

                <!-- Indicador de digitação -->
                <div v-if="isProcessingMessage" class="message-item">
                  <div class="message-header d-flex align-center mb-1">
                    <v-avatar size="24" color="green" class="me-2">
                      <v-icon size="12" color="white">ri-user-heart-line</v-icon>
                    </v-avatar>
                    <span class="text-caption font-weight-bold">
                      {{ patientProfile?.name || 'Paciente' }}
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
                        Pensando...
                      </span>
                    </div>
                  </v-card>
                </div>
              </div>

              <!-- Input de mensagem -->
              <v-card-actions class="pa-4">
                <v-text-field
                  ref="messageInput"
                  v-model="currentMessage"
                  label="Digite sua pergunta ou orientação..."
                  placeholder="Ex: Como você está se sentindo? Quando começou a dor?"
                  variant="outlined"
                  density="comfortable"
                  :disabled="isProcessingMessage"
                  @keydown="handleKeyPress"
                  hide-details
                  class="flex-1-1"
                  append-inner-icon="ri-send-plane-line"
                  @click:append-inner="sendMessage"
                />
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
            </v-card>
          </v-col>

          <!-- Sidebar com materiais e informações -->
          <v-col cols="12" md="4">
            <v-card class="fill-height" flat>
              <v-card-title class="d-flex align-center">
                <v-icon class="me-2">ri-folder-line</v-icon>
                Materiais e Informações
              </v-card-title>

              <v-divider />

              <v-card-text class="pa-0">
                <!-- Perfil do paciente -->
                <v-expansion-panels variant="accordion" class="mb-0">
                  <v-expansion-panel
                    title="Perfil do Paciente"
                    :text="patientProfile?.name || 'Carregando...'"
                  >
                    <template #text>
                      <div class="pa-4">
                        <v-list density="compact">
                          <v-list-item v-if="patientProfile?.name">
                            <v-list-item-title>Nome</v-list-item-title>
                            <v-list-item-subtitle>{{ patientProfile.name }}</v-list-item-subtitle>
                          </v-list-item>
                          <v-list-item v-if="patientProfile?.age">
                            <v-list-item-title>Idade</v-list-item-title>
                            <v-list-item-subtitle>{{ patientProfile.age }} anos</v-list-item-subtitle>
                          </v-list-item>
                          <v-list-item v-if="patientProfile?.occupation">
                            <v-list-item-title>Profissão</v-list-item-title>
                            <v-list-item-subtitle>{{ patientProfile.occupation }}</v-list-item-subtitle>
                          </v-list-item>
                          <v-list-item v-if="patientProfile?.chiefComplaint">
                            <v-list-item-title>Queixa Principal</v-list-item-title>
                            <v-list-item-subtitle>{{ patientProfile.chiefComplaint }}</v-list-item-subtitle>
                          </v-list-item>
                        </v-list>
                      </div>
                    </template>
                  </v-expansion-panel>

                  <!-- Materiais liberados -->
                  <v-expansion-panel>
                    <v-expansion-panel-title>
                      <div class="d-flex align-center">
                        <v-icon class="me-2">ri-file-list-3-line</v-icon>
                        Exames e Resultados
                        <v-chip
                          v-if="releasedMaterials.length > 0"
                          size="small"
                          color="success"
                          class="ml-2"
                        >
                          {{ releasedMaterials.length }}
                        </v-chip>
                      </div>
                    </v-expansion-panel-title>

                    <v-expansion-panel-text>
                      <div v-if="releasedMaterials.length === 0" class="text-center pa-4">
                        <v-icon size="48" color="grey-lighten-1" class="mb-2">ri-file-search-line</v-icon>
                        <div class="text-body-2 text-medium-emphasis">
                          Nenhum exame liberado ainda
                        </div>
                        <div class="text-caption text-medium-emphasis mt-1">
                          Solicite exames durante a consulta
                        </div>
                      </div>

                      <v-list v-else density="compact">
                        <v-list-item
                          v-for="material in releasedMaterials"
                          :key="material.idImpresso"
                        >
                          <template #prepend>
                            <v-icon color="success">ri-file-check-line</v-icon>
                          </template>
                          <v-list-item-title>{{ material.tituloImpresso }}</v-list-item-title>
                          <v-list-item-subtitle>{{ material.tipoConteudo || 'Documento' }}</v-list-item-subtitle>
                        </v-list-item>
                      </v-list>

                      <!-- Botões de solicitação rápida -->
                      <v-divider class="my-2" />
                      <div class="pa-2">
                        <div class="text-caption text-medium-emphasis mb-2">Solicitar exames:</div>
                        <div class="d-flex flex-wrap gap-1">
                          <v-btn
                            size="small"
                            variant="outlined"
                            @click="requestMaterial('hemograma')"
                            :disabled="isProcessingMessage"
                          >
                            Hemograma
                          </v-btn>
                          <v-btn
                            size="small"
                            variant="outlined"
                            @click="requestMaterial('radiografia')"
                            :disabled="isProcessingMessage"
                          >
                            Raio-X
                          </v-btn>
                          <v-btn
                            size="small"
                            variant="outlined"
                            @click="requestMaterial('exame físico')"
                            :disabled="isProcessingMessage"
                          >
                            Exame Físico
                          </v-btn>
                        </div>
                      </div>
                    </v-expansion-panel-text>
                  </v-expansion-panel>

                  <!-- Estatísticas da simulação -->
                  <v-expansion-panel>
                    <v-expansion-panel-title>
                      <v-icon class="me-2">ri-bar-chart-line</v-icon>
                      Estatísticas
                    </v-expansion-panel-title>

                    <v-expansion-panel-text>
                      <v-list density="compact">
                        <v-list-item>
                          <v-list-item-title>Tempo de simulação</v-list-item-title>
                          <v-list-item-subtitle>{{ simulationTime }}</v-list-item-subtitle>
                        </v-list-item>
                        <v-list-item>
                          <v-list-item-title>Mensagens trocadas</v-list-item-title>
                          <v-list-item-subtitle>{{ stats.messageCount }}</v-list-item-subtitle>
                        </v-list-item>
                        <v-list-item>
                          <v-list-item-title>Exames solicitados</v-list-item-title>
                          <v-list-item-subtitle>{{ releasedMaterials.length }}</v-list-item-subtitle>
                        </v-list-item>
                        <v-list-item v-if="stats.keyUsed">
                          <v-list-item-title>API utilizada</v-list-item-title>
                          <v-list-item-subtitle>
                            <v-chip
                              size="x-small"
                              :color="stats.keyUsed === 'free' ? 'success' : 'warning'"
                            >
                              {{ stats.keyUsed === 'free' ? 'Gratuita' : 'Paga' }}
                            </v-chip>
                          </v-list-item-subtitle>
                        </v-list-item>
                      </v-list>
                    </v-expansion-panel-text>
                  </v-expansion-panel>
                </v-expansion-panels>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </div>
</template>

<style scoped>
.ai-simulation-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.ai-simulation-main {
  flex: 1;
  overflow: hidden;
}

.chat-history {
  overflow-y: auto;
  max-height: calc(100vh - 200px);
  scroll-behavior: smooth;
}

.message-item {
  opacity: 0;
  animation: fadeInUp 0.3s ease forwards;
}

.message-medico .message-content {
  margin-left: 20%;
}

.message-paciente .message-content,
.message-sistema .message-content {
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

/* Responsividade */
@media (max-width: 960px) {
  .message-medico .message-content,
  .message-paciente .message-content,
  .message-sistema .message-content {
    margin-left: 0;
    margin-right: 0;
  }
}
</style>