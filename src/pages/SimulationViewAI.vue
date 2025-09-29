<script setup>
// Aceitar props para evitar warnings do Vue Router
defineProps({
  id: String
})

// Imports - seguindo mesmo padrão do SimulationView.vue
import { usePrivateChatNotification } from '@/plugins/privateChatListener.js'
import { currentUser } from '@/plugins/auth.js'
import { db } from '@/plugins/firebase.js'
import { backendUrl } from '@/utils/backendUrl.js' // Necessário para IA
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
// import PepSideView from '@/components/PepSideView.vue' // Removido - usando PEP completo

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
const sessionId = ref(null) // Local apenas, sem backend
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
const submittingEvaluation = ref(false)
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
const speechEnabled = ref(true) // Controle se speech está habilitado

// Refs para controle de painéis expandidos
const expandedPanels = ref(['materials']) // Materiais sempre expandidos por padrão

// Estatísticas AI
const aiStats = ref({
  messageCount: 0
  // Estatísticas simplificadas sem backend
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

    // Inicializar sessão AI local (sem backend)
    initializeLocalAISession()

  } catch (error) {
    console.error('Erro ao carregar dados da estação:', error)
    errorMessage.value = error.message
  } finally {
    isLoading.value = false
  }
}

// Inicializar sessão AI local (sem backend)
function initializeLocalAISession() {
  // Gerar ID de sessão local
  sessionId.value = `ai-local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  aiReadyState.value = true // IA sempre pronta

  console.log('✅ Sessão AI local inicializada:', sessionId.value)

  // Candidato deve iniciar a conversa
  console.log('📝 IA aguardando candidato iniciar a conversa...')
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
  console.log('🔚 Finalizando simulação...')
  simulationEnded.value = true

  // A liberação do PEP e avaliação automática será feita pelo watcher de simulationEnded
  console.log('✅ Simulação marcada como finalizada - aguardando watcher para liberar PEP')

  // Finalizar sessão AI
  finalizeAISimulation()
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
    // Processar resposta da IA baseada no script (sem backend)
    const aiResponse = await processAIResponse(message)

    // Adicionar resposta da IA ao histórico
    conversationHistory.value.push({
      role: 'ai_actor',
      content: aiResponse,
      timestamp: new Date()
    })

    await nextTick()
    scrollToBottom()

    // Falar a resposta se speech estiver habilitado
    if (speechEnabled.value && speechSynthesis) {
      speakText(aiResponse)
    }

    // Atualizar contador de mensagens
    aiStats.value.messageCount++

  } catch (error) {
    console.error('❌ Erro ao processar mensagem da IA:', error)
    conversationHistory.value.push({
      role: 'system',
      content: 'Desculpe, houve um erro. Tente novamente.',
      timestamp: new Date(),
      isError: true
    })
  } finally {
    isProcessingMessage.value = false
  }
}

// Função para processar resposta da IA usando Gemini 2.5 Flash
async function processAIResponse(candidateMessage) {
  console.log('🤖 Enviando para Gemini 2.5 Flash:', candidateMessage)

  try {
    // Chamar API do backend que usa Gemini 2.5 Flash
    const response = await fetch(`${backendUrl}/api/ai-chat/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentUser.value?.accessToken || ''}`,
        'user-id': currentUser.value?.uid || ''
      },
      body: JSON.stringify({
        message: candidateMessage,
        stationData: stationData.value,
        conversationHistory: conversationHistory.value.slice(-10) // Últimas 10 mensagens para contexto
      })
    })

    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`)
    }

    const aiResponse = await response.json()
    console.log('✅ Resposta da IA:', aiResponse.message)

    // Verificar se IA quer liberar material
    if (aiResponse.releaseMaterial && aiResponse.materialToRelease) {
      console.log('📄 IA liberou material:', aiResponse.materialToRelease)
      releaseMaterialById(aiResponse.materialToRelease)
    }

    return aiResponse.message

  } catch (error) {
    console.error('❌ Erro ao conectar com IA:', error)

    // Fallback para erro de conexão
    return 'Desculpe, estou com um problema técnico no momento. Pode repetir a pergunta?'
  }
}

// Função para liberar material específico por ID
function releaseMaterialById(materialId) {
  if (!materialId || !stationData.value) return

  // Buscar material na estação
  const materiaisImpressos = stationData.value.materiaisImpressos || []
  const material = materiaisImpressos.find(m =>
    m.idImpresso === materialId || m.id === materialId
  )

  if (material) {
    // Liberar o material
    releasedData.value[materialId] = {
      ...material,
      releasedAt: new Date(),
      releasedBy: 'ai'
    }

    // Adicionar notificação
    conversationHistory.value.push({
      sender: 'system',
      message: `📄 Material liberado: ${material.tituloImpresso || material.titulo || 'Documento'}`,
      timestamp: new Date(),
      isSystemMessage: true
    })

    console.log('✅ Material liberado pela IA:', material.tituloImpresso)
  }
}

// *** FUNÇÕES DE RESPOSTA ESTÁTICA REMOVIDAS ***
// Agora usamos IA real (Gemini 2.5 Flash) para todas as respostas
// As funções identificarSecaoRelevante, buscarRespostasNaSecao, perguntaCorrespondeAoGatilho
// e checkAndReleaseMaterials foram removidas pois a IA agora decide tudo dinamicamente


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

// Forçar carregamento do PEP
async function forceLoadPEP() {
  console.log('🔧 Forçando carregamento do PEP...')
  try {
    // Recarregar dados da estação para obter PEP
    await fetchSimulationData(stationId.value)

    // Forçar liberação
    pepReleasedToCandidate.value = true
    isChecklistVisibleForCandidate.value = true

    console.log('✅ PEP carregado forçadamente:', {
      checklistData: !!checklistData.value,
      pepReleased: pepReleasedToCandidate.value
    })
  } catch (error) {
    console.error('❌ Erro ao forçar PEP:', error)
  }
}

// Finalizar simulação AI local (sem backend)
function finalizeAISimulation() {
  console.log('🏁 Simulação AI finalizada localmente:', {
    sessionId: sessionId.value,
    messageCount: conversationHistory.value.length,
    evaluations: markedPepItems.value,
    pepReleased: pepReleasedToCandidate.value
  })

  // Dados ficam apenas no frontend
  // Futuramente pode salvar no localStorage ou Firestore se necessário
}


// Função para abrir material liberado
function openMaterial(material) {
  console.log('🔍 Material clicado:', material) // Debug para ver estrutura

  // Verificar se tem link direto
  if (material.linkOriginal) {
    window.open(material.linkOriginal, '_blank')
    return
  }

  // Usar o conteúdo que já está no material (fornecido pela IA)
  if (material.conteudo || material.conteudoImpresso) {
    console.log('✅ Usando conteúdo do material')
    openFullMaterial(material)
    return
  }

  // Se não tem conteúdo, buscar na estação como fallback
  const fullMaterial = findMaterialInStation(material.idImpresso)
  if (fullMaterial) {
    console.log('✅ Usando material da estação')
    openFullMaterial(fullMaterial)
    return
  }

  // Fallback final
  console.log('❌ Nenhum conteúdo encontrado')
  const info = `
Material: ${material.tituloImpresso || 'Sem título'}
Tipo: ${material.tipoConteudo || 'Documento'}
ID: ${material.idImpresso || 'N/A'}

⚠️ Conteúdo completo não disponível.
Este material foi liberado pela IA mas o conteúdo detalhado não foi fornecido.
  `.trim()

  alert(info)
}

// Buscar material completo na estação carregada
function findMaterialInStation(materialId) {
  if (!stationData.value || !materialId) {
    console.log('❌ Não há stationData ou materialId:', { stationData: !!stationData.value, materialId })
    return null
  }

  console.log('🔍 Procurando material:', materialId)
  console.log('📊 Estrutura da estação:', Object.keys(stationData.value))

  // Verificar em diferentes seções da estação
  const sections = [
    { name: 'materiaisImpressos', data: stationData.value.materiaisImpressos },
    { name: 'anexos', data: stationData.value.anexos },
    { name: 'documentos', data: stationData.value.documentos },
    { name: 'materiais', data: stationData.value.materiais },
    { name: 'impressos', data: stationData.value.impressos }
  ]

  for (const section of sections) {
    if (Array.isArray(section.data)) {
      console.log(`🔍 Procurando em ${section.name} (array):`, section.data.length, 'itens')
      const found = section.data.find(item =>
        item && (
          item.idImpresso === materialId ||
          item.id === materialId ||
          item.titulo === materialId ||
          item.nome === materialId
        )
      )
      if (found) {
        console.log('✅ Material encontrado em', section.name, ':', found)
        return found
      }
    } else if (section.data && typeof section.data === 'object') {
      console.log(`🔍 Procurando em ${section.name} (object):`, Object.keys(section.data))
      const found = Object.values(section.data).find(item =>
        item && (
          item.idImpresso === materialId ||
          item.id === materialId ||
          item.titulo === materialId ||
          item.nome === materialId
        )
      )
      if (found) {
        console.log('✅ Material encontrado em', section.name, ':', found)
        return found
      }
    }
  }

  console.log('❌ Material não encontrado')
  return null
}

// Abrir material completo da estação
function openFullMaterial(material) {
  const newWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes')

  let content = material.conteudoImpresso || 'Conteúdo não disponível'

  // Se tiver conteúdo estruturado
  if (material.conteudo) {
    console.log('📋 Processando conteúdo estruturado:', material.conteudo)

    if (material.tipoConteudo === 'lista_chave_valor_secoes') {
      // Usar secoes se existir, senão tentar extrair do conteudo
      const secoes = material.secoes || material.conteudo.secoes || material.conteudo
      content = formatKeyValueSections(secoes)
    } else {
      // Para outros tipos, converter objeto para HTML
      content = formatObjectContent(material.conteudo)
    }
  } else if (material.tipoConteudo === 'lista_chave_valor_secoes' && material.secoes) {
    content = formatKeyValueSections(material.secoes)
  }

  newWindow.document.write(`
    <html>
      <head>
        <title>${material.titulo || material.tituloImpresso || 'Material'}</title>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          h1 {
            color: #1976d2;
            border-bottom: 2px solid #1976d2;
            padding-bottom: 10px;
          }
          .meta {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
          }
          .section {
            margin: 20px 0;
          }
          .key {
            font-weight: bold;
            color: #333;
          }
          .value {
            margin-left: 10px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>${material.titulo || material.tituloImpresso || 'Material'}</h1>
          <div class="meta">
            <p><strong>Tipo:</strong> ${material.tipoConteudo || 'Documento'}</p>
            <p><strong>ID:</strong> ${material.idImpresso || material.id || 'N/A'}</p>
          </div>
          <div class="content">
            ${content}
          </div>
        </div>
      </body>
    </html>
  `)
  newWindow.document.close()
}

// Abrir conteúdo fornecido pela IA
function openMaterialContent(material) {
  const newWindow = window.open('', '_blank', 'width=600,height=500')
  newWindow.document.write(`
    <html>
      <head>
        <title>${material.tituloImpresso || 'Material'}</title>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
          h1 { color: #1976d2; }
          .meta { background: #f0f0f0; padding: 10px; border-radius: 5px; }
        </style>
      </head>
      <body>
        <h1>${material.tituloImpresso || 'Material'}</h1>
        <div class="meta">
          <p><strong>Tipo:</strong> ${material.tipoConteudo || 'Documento'}</p>
        </div>
        <div>${material.conteudoImpresso}</div>
      </body>
    </html>
  `)
  newWindow.document.close()
}

// Formatar seções chave-valor
function formatKeyValueSections(secoes) {
  console.log('🔧 Formatando seções:', secoes)

  if (!secoes) return 'Nenhuma seção fornecida'

  // Se for array, processar normalmente
  if (Array.isArray(secoes)) {
    return secoes.map(secao => {
      let html = `<div class="section"><h3>${secao.titulo || secao.nome || 'Seção'}</h3>`

      if (Array.isArray(secao.itens)) {
        secao.itens.forEach(item => {
          html += `<div><span class="key">${item.chave || item.nome}:</span> <span class="value">${item.valor || item.valor}</span></div>`
        })
      } else if (secao.itens && typeof secao.itens === 'object') {
        // Se itens for objeto, converter para HTML
        Object.entries(secao.itens).forEach(([key, value]) => {
          html += `<div><span class="key">${key}:</span> <span class="value">${value}</span></div>`
        })
      }

      html += '</div>'
      return html
    }).join('')
  }

  // Se for objeto, tentar converter
  if (typeof secoes === 'object') {
    return formatObjectContent(secoes)
  }

  return 'Formato de seções não reconhecido'
}

// Formatar conteúdo de objeto genérico
function formatObjectContent(obj) {
  if (!obj || typeof obj !== 'object') return 'Conteúdo inválido'

  let html = ''

  Object.entries(obj).forEach(([key, value]) => {
    html += `<div class="section">`
    html += `<h3>${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</h3>`

    if (Array.isArray(value)) {
      value.forEach(item => {
        if (typeof item === 'object') {
          Object.entries(item).forEach(([subKey, subValue]) => {
            html += `<div><span class="key">${subKey}:</span> <span class="value">${subValue}</span></div>`
          })
        } else {
          html += `<div class="value">${item}</div>`
        }
      })
    } else if (typeof value === 'object') {
      Object.entries(value).forEach(([subKey, subValue]) => {
        html += `<div><span class="key">${subKey}:</span> <span class="value">${subValue}</span></div>`
      })
    } else {
      html += `<div class="value">${value}</div>`
    }

    html += '</div>'
  })

  return html
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
      console.log('🎤 Texto reconhecido:', transcript)
    }

    speechRecognition.value.onerror = (event) => {
      console.error('❌ Erro no reconhecimento de voz:', event.error)
      isListening.value = false
      // Mostrar feedback visual
      conversationHistory.value.push({
        role: 'system',
        content: `Erro no reconhecimento de voz: ${event.error}`,
        timestamp: new Date(),
        isError: true
      })
    }

    speechRecognition.value.onend = () => {
      isListening.value = false
      console.log('🎤 Reconhecimento de voz finalizado')
    }

    speechRecognition.value.onstart = () => {
      console.log('🎤 Reconhecimento de voz iniciado')
    }

    console.log('✅ Reconhecimento de voz inicializado')
  } else {
    console.warn('⚠️ Reconhecimento de voz não suportado neste navegador')
  }
}

function startListening() {
  if (!speechRecognition.value) {
    // Mostrar feedback se não suportar
    conversationHistory.value.push({
      role: 'system',
      content: 'Reconhecimento de voz não disponível neste navegador. Use Chrome ou Edge para funcionalidade completa.',
      timestamp: new Date(),
      isError: true
    })
    return
  }

  if (!isListening.value) {
    try {
      isListening.value = true
      speechRecognition.value.start()
      console.log('🎤 Iniciando gravação...')
    } catch (error) {
      console.error('❌ Erro ao iniciar gravação:', error)
      isListening.value = false
      conversationHistory.value.push({
        role: 'system',
        content: `Erro ao iniciar gravação: ${error.message}`,
        timestamp: new Date(),
        isError: true
      })
    }
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

// Watcher para liberar PEP automaticamente ao final da simulação (mesma lógica do SimulationView.vue)
watch(simulationEnded, (newValue) => {
  if (newValue) {
    console.log('🔚 Simulação finalizada - liberando PEP automaticamente')
    // Liberar PEP automaticamente quando a simulação termina
    pepReleasedToCandidate.value = true
    isChecklistVisibleForCandidate.value = true

    console.log('✅ PEP liberado automaticamente:', {
      pepReleasedToCandidate: pepReleasedToCandidate.value,
      isChecklistVisibleForCandidate: isChecklistVisibleForCandidate.value,
      checklistData: !!checklistData.value
    })

    // IA deve agir como avaliador e preencher o PEP automaticamente
    setTimeout(() => {
      aiEvaluatePEP()
    }, 2000) // Aguarda 2 segundos após liberar o PEP
  }
})

// Função para IA avaliar automaticamente o PEP usando Gemini 2.5 Flash
async function aiEvaluatePEP() {
  if (!checklistData.value?.itensAvaliacao?.length) {
    console.log('❌ Não há itens de avaliação no PEP')
    return
  }

  console.log('🤖 IA iniciando avaliação inteligente do PEP...')

  // Marcar como processando
  submittingEvaluation.value = true

  try {
    // Chamar endpoint de avaliação PEP
    const response = await fetch(`${backendUrl}/api/ai-chat/evaluate-pep`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentUser.value?.accessToken || ''}`,
        'user-id': currentUser.value?.uid || ''
      },
      body: JSON.stringify({
        stationData: stationData.value,
        conversationHistory: conversationHistory.value,
        checklistData: checklistData.value
      })
    })

    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`)
    }

    const aiEvaluation = await response.json()
    console.log('✅ Avaliação da IA recebida:', aiEvaluation.evaluation)

    // Processar avaliação automática da IA
    processAIEvaluation(aiEvaluation.evaluation)

  } catch (error) {
    console.error('❌ Erro na avaliação automática por IA:', error)

    // Fallback: avaliação automática simples
    autoEvaluatePEPFallback()
  }
}

// Processar resultado da avaliação da IA
function processAIEvaluation(evaluationText) {
  // A IA retorna avaliações no formato: "Item 1: SIM, Item 2: NÃO, Item 3: SIM..."
  const items = evaluationText.split(',')

  checklistData.value.itensAvaliacao.forEach((item, index) => {
    if (!markedPepItems.value[item.idItem]) {
      markedPepItems.value[item.idItem] = []
    }

    // Procurar avaliação para este item
    const itemEvaluation = items.find(evalText =>
      evalText.toLowerCase().includes(`item ${index + 1}`) ||
      evalText.toLowerCase().includes(`${index + 1}:`)
    )

    if (itemEvaluation) {
      const isPositive = itemEvaluation.toLowerCase().includes('sim')
      const score = isPositive ? 5 : 1 // Adequado ou Inadequado

      // Marcar item como avaliado
      markedPepItems.value[item.idItem] = [{
        pontuacao: score,
        observacao: `Avaliado automaticamente pela IA: ${isPositive ? 'Adequado' : 'Inadequado'}`,
        timestamp: new Date().toISOString()
      }]

      console.log(`✅ Item ${index + 1} avaliado:`, isPositive ? 'ADEQUADO' : 'INADEQUADO')
    }
  })

  // Marcar avaliação como concluída
  evaluationSubmittedByCandidate.value = true
  submittingEvaluation.value = false

  console.log('🎯 Avaliação automática concluída:', Object.keys(markedPepItems.value).length, 'itens avaliados')
}

// Fallback para avaliação automática simples (se IA falhar)
function autoEvaluatePEPFallback() {
  console.log('⚠️ Usando avaliação fallback simples...')

  const candidateMessages = conversationHistory.value.filter(msg =>
    msg.sender === 'candidate' || msg.role === 'candidate'
  )

  checklistData.value.itensAvaliacao.forEach((item, index) => {
    if (!markedPepItems.value[item.idItem]) {
      markedPepItems.value[item.idItem] = []
    }

    // Avaliação básica: se participou minimamente, considera adequado
    const score = candidateMessages.length >= 3 ? 3 : 1 // Regular ou Inadequado

    markedPepItems.value[item.idItem] = [{
      pontuacao: score,
      observacao: `Avaliação automática: ${candidateMessages.length >= 3 ? 'Participação adequada' : 'Participação insuficiente'}`,
      timestamp: new Date().toISOString()
    }]
  })

  // Marcar avaliação como concluída
  evaluationSubmittedByCandidate.value = true
  submittingEvaluation.value = false

  console.log('🎯 Avaliação fallback concluída:', Object.keys(markedPepItems.value).length, 'itens avaliados')
}

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
                  :title="speechRecognition ? (isListening ? 'Parar gravação' : 'Gravar voz') : 'Reconhecimento de voz não suportado'"
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
            class="d-flex flex-column"
            style="max-height: calc(100vh - 120px); overflow-y: auto;"
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
                      v-if="simulationEnded && checklistData"
                      color="primary"
                      variant="elevated"
                      @click="pepViewState.isVisible = true"
                      block
                    >
                      <v-icon start>ri-checklist-line</v-icon>
                      Ver PEP
                    </v-btn>

                    <!-- Debug: Forçar liberação PEP -->
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
                <v-expansion-panels variant="accordion" class="mb-0" v-model="expandedPanels">
                  <v-expansion-panel value="materials">
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
                          @click="openMaterial(material)"
                          class="cursor-pointer"
                          :ripple="true"
                        >
                          <template #prepend>
                            <v-icon color="success">ri-file-check-line</v-icon>
                          </template>
                          <v-list-item-title>{{ material.tituloImpresso || 'Material' }}</v-list-item-title>
                          <v-list-item-subtitle>{{ material.tipoConteudo || 'Documento' }}</v-list-item-subtitle>
                          <template #append>
                            <v-icon size="small" color="primary">ri-external-link-line</v-icon>
                          </template>
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
                        <v-list-item>
                          <v-list-item-title>Modo de operação</v-list-item-title>
                          <v-list-item-subtitle>
                            <v-chip size="x-small" color="success">
                              Simulação Local
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

          <!-- PEP Completo - Igual ao SimulationView.vue -->
          <v-col
            cols="12"
          >
            <!-- Card do Checklist de Avaliação (PEP) -->
            <v-card
              v-if="checklistData?.itensAvaliacao?.length > 0 && pepReleasedToCandidate"
              class="mb-6 checklist-candidate-card"
            >
              <v-card-item>
                <v-card-title class="d-flex align-center">
                  <v-icon color="black" icon="ri-file-list-3-fill" size="large" class="me-2" />
                  Checklist de Avaliação (PEP)
                </v-card-title>
              </v-card-item>

              <v-table class="pep-table">
                <thead>
                  <tr>
                    <th class="text-left">Item</th>
                    <th class="text-center" style="width: 20%;">Avaliação da IA</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, index) in checklistData.itensAvaliacao" :key="'ai-pep-' + item.idItem">
                    <td>
                      <!-- Conteúdo do Item -->
                      <p class="font-weight-bold">
                        <span v-if="item.itemNumeroOficial">{{ item.itemNumeroOficial }}. </span>
                        {{ item.descricaoItem ? item.descricaoItem.split(':')[0].trim() : 'Item' }}
                      </p>
                      <!-- Descrição formatada -->
                      <div class="text-body-2" v-if="item.descricaoItem && item.descricaoItem.includes(':')"
                           v-html="item.descricaoItem.split(':').slice(1).join(':').trim()" />

                      <!-- Critérios de Avaliação -->
                      <div class="criterios-integrados mt-2">
                        <div v-if="item.pontuacoes?.adequado"
                          :class="{'criterio-item': true, 'criterio-selecionado': markedPepItems[index]?.pontuacao === 5, 'mb-2': true}">
                          <div class="d-flex align-start">
                            <v-icon
                              :icon="markedPepItems[index]?.pontuacao === 5 ? 'ri-checkbox-circle-fill' : 'ri-checkbox-blank-circle-line'"
                              color="success"
                              size="small"
                              class="me-2 mt-1"
                            />
                            <div>
                              <div class="font-weight-medium">Adequado ({{ item.pontuacoes.adequado.pontos?.toFixed(2) || '1.00' }} pts)</div>
                              <div class="text-caption">{{ item.pontuacoes.adequado.criterio || 'Critério adequado' }}</div>
                            </div>
                          </div>
                        </div>

                        <div v-if="item.pontuacoes?.parcialmenteAdequado"
                          :class="{'criterio-item': true, 'criterio-selecionado': markedPepItems[index]?.pontuacao >= 3 && markedPepItems[index]?.pontuacao < 5, 'mb-2': true}">
                          <div class="d-flex align-start">
                            <v-icon
                              :icon="(markedPepItems[index]?.pontuacao >= 3 && markedPepItems[index]?.pontuacao < 5) ? 'ri-checkbox-indeterminate-fill' : 'ri-checkbox-blank-circle-line'"
                              color="warning"
                              size="small"
                              class="me-2 mt-1"
                            />
                            <div>
                              <div class="font-weight-medium">Parcialmente Adequado ({{ item.pontuacoes.parcialmenteAdequado.pontos?.toFixed(2) || '0.50' }} pts)</div>
                              <div class="text-caption">{{ item.pontuacoes.parcialmenteAdequado.criterio || 'Critério parcialmente adequado' }}</div>
                            </div>
                          </div>
                        </div>

                        <div v-if="item.pontuacoes?.inadequado"
                          :class="{'criterio-item': true, 'criterio-selecionado': markedPepItems[index]?.pontuacao < 3}">
                          <div class="d-flex align-start">
                            <v-icon
                              :icon="markedPepItems[index]?.pontuacao < 3 ? 'ri-close-circle-fill' : 'ri-checkbox-blank-circle-line'"
                              color="error"
                              size="small"
                              class="me-2 mt-1"
                            />
                            <div>
                              <div class="font-weight-medium">Inadequado ({{ item.pontuacoes.inadequado.pontos?.toFixed(2) || '0.00' }} pts)</div>
                              <div class="text-caption">{{ item.pontuacoes.inadequado.criterio || 'Critério inadequado' }}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td class="text-center">
                      <!-- Visualização da pontuação da IA -->
                      <div v-if="markedPepItems[index]?.pontuacao !== undefined">
                        <v-chip
                          :color="markedPepItems[index]?.pontuacao >= 5 ? 'success' : markedPepItems[index]?.pontuacao >= 3 ? 'warning' : 'error'"
                          variant="tonal"
                          class="mb-1"
                        >
                          {{ markedPepItems[index]?.pontuacao >= 5 ? 'Adequado' : markedPepItems[index]?.pontuacao >= 3 ? 'Parcialmente Adequado' : 'Inadequado' }}
                        </v-chip>
                        <div class="text-caption">{{ markedPepItems[index]?.pontuacao }} pontos</div>
                        <div v-if="markedPepItems[index]?.observacoes" class="text-caption mt-1">{{ markedPepItems[index].observacoes }}</div>
                      </div>
                      <div v-else class="text-caption text-medium-emphasis">
                        Aguardando avaliação
                      </div>
                    </td>
                  </tr>
                </tbody>
              </v-table>

              <!-- Ações do PEP -->
              <v-card-actions v-if="simulationEnded && !evaluationSubmittedByCandidate && checklistData" class="pa-4">
                <v-spacer />
                <v-btn
                  color="primary"
                  @click="submitEvaluation"
                  :loading="submittingEvaluation"
                >
                  Ver Resultado Final
                </v-btn>
              </v-card-actions>

              <!-- Feedback da estação -->
              <v-card-text v-if="checklistData?.feedbackEstacao && simulationEnded">
                <v-divider class="mb-4" />
                <h4 class="mb-2">Feedback da Estação</h4>
                <div v-html="checklistData.feedbackEstacao" />
              </v-card-text>

              <!-- Score total -->
              <v-alert
                v-if="simulationEnded && candidateReceivedTotalScore > 0"
                type="info"
                variant="tonal"
                class="ma-4"
              >
                <template #title>Pontuação Total</template>
                Você obteve {{ candidateReceivedTotalScore.toFixed(2) }} pontos nesta simulação.
              </v-alert>
            </v-card>

            <!-- Card quando PEP não está disponível -->
            <v-card v-if="!checklistData?.itensAvaliacao?.length || !pepReleasedToCandidate" class="mb-6 d-flex align-center justify-center" style="min-height: 200px;">
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
</style>