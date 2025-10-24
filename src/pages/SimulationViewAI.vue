<script setup>
// Aceitar props para evitar warnings do Vue Router
defineProps({
  id: String
})

// Imports - seguindo mesmo padrão do SimulationView.vue
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
// import PepSideView from '@/components/PepSideView.vue' // Removido - usando PEP completo

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

// Refs para dados da simulação - seguindo mesmo padrão
const releasedData = ref({})
const isChecklistVisibleForCandidate = ref(false)
const pepReleasedToCandidate = ref(false)
const evaluationSubmittedByCandidate = ref(false)
const submittingEvaluation = ref(false)
const candidateReceivedTotalScore = ref(0)

// Refs para PEP - seguindo mesmo padrão
const pepViewState = ref({ isVisible: false })
const markedPepItems = ref({})

// Refs para comunicação AI
const conversationHistory = ref([])
const currentMessage = ref('')
const isProcessingMessage = ref(false)
const chatContainer = ref(null)
const messageInput = ref(null)

function scrollToBottom() {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
}

// Refs para controle de voz
const isListening = ref(false)
const speechRecognition = ref(null)
const isSpeaking = ref(false)
const speechSynthesis = ref(null)
const speechEnabled = ref(true) // Controle se speech está habilitado
const speechTimeout = ref(null) // Timeout para parar gravação automaticamente
const autoRecordMode = ref(true) // Modo automático de gravação (VAD) ativo por padrão
const silenceTimeout = ref(null) // Timeout para detectar silêncio
const lastSpeechTime = ref(null) // Timestamp da última fala detectada
const selectedVoice = ref(null) // Voz selecionada baseada no paciente

// Contagem regressiva antes de iniciar
const countdownActive = ref(false)
const countdownValue = ref(3)
let countdownInterval = null

// Refs para controle de painéis expandidos
const expandedPanels = ref(['materials']) // Materiais sempre expandidos por padrão

// Refs para controle de avaliação automática
const autoEvaluateEnabled = ref(true) // Avaliação automática habilitada por padrão

// Estatísticas AI
const aiStats = ref({
  messageCount: 0
  // Estatísticas simplificadas sem backend
})

// Propriedades computadas

const canSendMessage = computed(() =>
  currentMessage.value.trim().length > 0 &&
  !isProcessingMessage.value &&
  simulationStarted.value
)


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
  console.log('?? Histórico de conversa limpo para nova estação:', currentStationId)

  selectedVoice.value = null
  console.log('?? Voz resetada para nova estação')

  try {
    await fetchSessionData(currentStationId)

    if (!stationData.value) {
      throw new Error('Falha ao carregar dados da estação')
    }

    const patientScript = stationData.value?.materiaisDisponiveis?.informacoesVerbaisSimulado || []
    console.log('?? Script do paciente carregado:', patientScript.length, 'seções')
    if (patientScript.length > 0) {
      console.log('?? Primeira seção do script:', patientScript[0])
    } else {
      console.warn('?? AVISO: Script do paciente está vazio!')
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
    console.error('Erro ao carregar dados da estação (IA):', error)
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

  console.log('? Sessão AI local inicializada:', sessionId.value)

  // Candidato deve iniciar a conversa
  console.log('?? IA aguardando candidato iniciar a conversa...')
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

function startSimulationCountdown() {
  cancelCountdown()
  countdownValue.value = 3
  countdownActive.value = true

  countdownInterval = setInterval(() => {
    if (countdownValue.value <= 1) {
      cancelCountdown()
      startSimulation()
      if (autoRecordMode.value && !isListening.value) {
        startListening()
      }
    } else {
      countdownValue.value -= 1
    }
  }, 1000)
}

function cancelCountdown() {
  if (countdownInterval) {
    clearInterval(countdownInterval)
    countdownInterval = null
  }
  countdownActive.value = false
  countdownValue.value = 3
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
    } else {
      // Se síntese de voz está desabilitada mas modo automático está ativo, reiniciar gravação
      if (autoRecordMode.value && !isListening.value) {
        console.log('🎤 IA respondeu (sem síntese de voz) - reiniciando gravação automática...')
        setTimeout(() => {
          if (autoRecordMode.value && !isListening.value) {
            startListening()
          }
        }, 500)
      }
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
    const response = await fetch(`${backendUrl}/ai-chat/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentUser.value?.accessToken || ''}`
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
    console.log('🔍 DEBUG - Resposta completa da IA:', aiResponse)

    // LÓGICA SIMPLES: Se IA respondeu positivamente, liberar material
    const shouldRelease = shouldReleaseSimple(aiResponse.message, candidateMessage)

    if (shouldRelease) {
      console.log('📄 Liberando material - IA respondeu positivamente')
      releaseSpecificMaterial(candidateMessage)
    } else {
      console.log('❌ Não liberando - IA negou ou não é solicitação de material')
    }

    return aiResponse.message

  } catch (error) {
    console.error('❌ Erro ao conectar com IA:', error)

    // Fallback para erro de conexão
    return 'Desculpe, estou com um problema técnico no momento. Pode repetir a pergunta?'
  }
}

// LÓGICA SUPER SIMPLES para liberação de material
function shouldReleaseSimple(aiMessage, userRequest) {
  const aiText = aiMessage.toLowerCase()
  const userText = userRequest.toLowerCase()

  // NÃO liberar se IA negou explicitamente
  if (aiText.includes('não consta no script') || aiText.includes('seja mais específico')) {
    return false
  }

  // LIBERAR se usuário solicitou algo que parece exame/procedimento
  const medicalKeywords = ['exame', 'hemograma', 'radiografia', 'físico', 'laborat', 'pcr', 'vhs', 'solicito', 'glicemia']
  const hasMedicalRequest = medicalKeywords.some(keyword => userText.includes(keyword))

  // LIBERAR se IA respondeu positivamente
  const positiveResponses = ['ok', 'tudo bem', 'pode', 'certo', 'sim']
  const hasPositiveResponse = positiveResponses.some(word => aiText.includes(word))

  const shouldRelease = hasMedicalRequest && hasPositiveResponse

  console.log('🔍 Análise simples:', {
    hasMedicalRequest,
    hasPositiveResponse,
    shouldRelease,
    userText: userText.substring(0, 50),
    aiText: aiText.substring(0, 50)
  })

  return shouldRelease
}

// Liberar material específico baseado na análise semântica da solicitação
function releaseSpecificMaterial(candidateMessage) {
  if (!stationData.value) return

  // Buscar materiais na estrutura CORRETA!
  const materials = stationData.value.materiaisDisponiveis?.impressos ||
                   stationData.value.materiaisImpressos ||
                   stationData.value.materiais ||
                   []

  console.log('🔍 DEBUG - Estrutura completa da estação:', Object.keys(stationData.value))
  console.log('🔍 DEBUG - materiaisDisponiveis:', stationData.value.materiaisDisponiveis)
  console.log('🔍 Materiais encontrados:', materials)

  if (materials.length === 0) {
    console.log('❌ Nenhum material disponível na estação - CRIANDO MATERIAL FAKE PARA TESTE')

    // Criar material fake para teste
    const fakeMaterial = {
      id: 'fake-material-test',
      idImpresso: 'fake-material-test',
      tituloImpresso: 'Resultado de Exame (TESTE)',
      titulo: 'Resultado de Exame (TESTE)',
      conteudo: 'Material de teste criado automaticamente',
      conteudoImpresso: 'Material de teste criado automaticamente'
    }

    console.log('📄 Liberando material FAKE para teste:', fakeMaterial.tituloImpresso)

    // Liberar material fake diretamente
    releasedData.value[fakeMaterial.idImpresso] = {
      ...fakeMaterial,
      releasedAt: new Date(),
      releasedBy: 'ai'
    }

    conversationHistory.value.push({
      sender: 'system',
      message: `📄 Material liberado: ${fakeMaterial.tituloImpresso}`,
      timestamp: new Date(),
      isSystemMessage: true
    })

    console.log('✅ Material FAKE liberado com sucesso!')
    return
  }

  // Encontrar material específico baseado na solicitação
  const materialId = findSpecificMaterial(candidateMessage, materials)

  if (materialId) {
    // Verificar se o material já foi liberado
    if (releasedData.value[materialId]) {
      console.log('⚠️ Material já foi liberado anteriormente:', releasedData.value[materialId].tituloImpresso)
      return
    }

    const material = materials.find(m => (m.idImpresso || m.id) === materialId)
    console.log('📄 Liberando material específico:', material?.tituloImpresso || material?.titulo)
    releaseMaterialById(materialId)
  } else {
    console.log('❌ Nenhum material específico encontrado para a solicitação')
  }
}

// Encontrar material específico baseado na análise dinâmica dos impressos
function findSpecificMaterial(candidateMessage, materials) {
  if (!candidateMessage || !materials || materials.length === 0) {
    return null
  }

  const messageLower = candidateMessage.toLowerCase()
  console.log('🔍 Procurando material para solicitação:', candidateMessage)
  console.log('📋 Materiais disponíveis:', materials.map(m => ({ id: m.idImpresso, titulo: m.tituloImpresso, tipo: m.tipoConteudo })))

  // Função para extrair todo o texto de um impresso baseado no tipoConteudo
  function extractTextFromMaterial(material) {
    let extractedText = ''

    // Sempre incluir o título (CRÍTICO para materiais com imagens)
    if (material.tituloImpresso) {
      extractedText += material.tituloImpresso.toLowerCase() + ' '
    }

    // Para materiais baseados em imagem, expandir o título com termos relacionados
    const isImageBased = material.tipoConteudo === 'imagem' ||
                         material.tipoConteudo === 'imagemComLaudo' ||
                         (material.conteudo && material.conteudo.imagemUrl && !material.conteudo.texto)

    if (isImageBased && material.tituloImpresso) {
      // Expandir com sinônimos comuns baseados no título
      const titulo = material.tituloImpresso.toLowerCase()

      // Exames de imagem
      if (titulo.includes('ultrassom') || titulo.includes('usg')) {
        extractedText += 'ultrassonografia ecografia doppler '
      }
      if (titulo.includes('raio') || titulo.includes('rx')) {
        extractedText += 'radiografia raio-x '
      }
      if (titulo.includes('tomografia') || titulo.includes('tc')) {
        extractedText += 'tomografia computadorizada '
      }

      // Anatomia
      if (titulo.includes('abdome') || titulo.includes('abdominal')) {
        extractedText += 'abdome pelve fígado vesícula pâncreas baço rins intestino bexiga '
      }
      if (titulo.includes('membros') || titulo.includes('membro')) {
        extractedText += 'perna braço inferior superior venoso arterial '
      }

      // Exames laboratoriais
      if (titulo.includes('exame') || titulo.includes('laborat')) {
        extractedText += 'exames laboratoriais sangue hemograma pcr vhs glicemia ureia creatinina '
      }
    }

    if (!material.conteudo) return extractedText.trim()

    // Processar baseado no tipo de conteúdo
    switch (material.tipoConteudo) {
      case 'texto_simples':
        extractedText += (material.conteudo.texto || '').toLowerCase() + ' '
        break

      case 'lista_chave_valor_secoes':
        if (material.conteudo.secoes && Array.isArray(material.conteudo.secoes)) {
          material.conteudo.secoes.forEach(secao => {
            // Título da seção
            if (secao.tituloSecao) {
              extractedText += secao.tituloSecao.toLowerCase() + ' '
            }
            // Itens da seção
            if (secao.itens && Array.isArray(secao.itens)) {
              secao.itens.forEach(item => {
                if (item.chave) {
                  extractedText += item.chave.toLowerCase() + ' '
                }
                if (item.valor) {
                  extractedText += item.valor.toLowerCase() + ' '
                }
              })
            }
          })
        }
        break

      case 'imagemComLaudo':
      case 'imagem':
        if (material.conteudo.laudoCompleto) {
          extractedText += material.conteudo.laudoCompleto.toLowerCase() + ' '
        }
        if (material.conteudo.texto) {
          extractedText += material.conteudo.texto.toLowerCase() + ' '
        }
        if (material.conteudo.legendaImagem) {
          extractedText += material.conteudo.legendaImagem.toLowerCase() + ' '
        }
        if (material.conteudo.descricao) {
          extractedText += material.conteudo.descricao.toLowerCase() + ' '
        }
        break

      case 'tabela':
        if (material.conteudo.cabecalhos) {
          material.conteudo.cabecalhos.forEach(cab => {
            extractedText += (cab.label || '').toLowerCase() + ' '
          })
        }
        if (material.conteudo.linhas) {
          material.conteudo.linhas.forEach(linha => {
            Object.values(linha).forEach(valor => {
              extractedText += (valor || '').toString().toLowerCase() + ' '
            })
          })
        }
        break
    }

    return extractedText.trim()
  }

  // 🧠 DICIONÁRIO MÉDICO - Mapeia termos para categorias
  const medicalDictionary = {
    // EXAMES LABORATORIAIS
    examesLab: [
      'hemograma', 'leucograma', 'plaquetas', 'hemácias', 'leucócitos', 'neutrófilos', 'eosinófilos',
      'pcr', 'vhs', 'proteína c reativa', 'velocidade de hemossedimentação',
      'glicemia', 'glicose', 'hba1c', 'hemoglobina glicada',
      'ureia', 'creatinina', 'função renal',
      'tgo', 'tgp', 'ast', 'alt', 'transaminases', 'fosfatase alcalina', 'gama gt', 'bilirrubinas',
      'amilase', 'lipase',
      'eletrólitos', 'sódio', 'potássio', 'cálcio', 'magnésio',
      'coagulograma', 'tap', 'ttpa', 'inr',
      'beta hcg', 'bhcg', 'teste de gravidez',
      'hormônios tireoidianos', 'tsh', 't3', 't4',
      'urina', 'urocultura', 'exame de urina', 'urina tipo 1',
      'fezes', 'parasitológico', 'sangue oculto',
      'sorologia', 'hepatite', 'hiv', 'vdrl', 'sífilis'
    ],

    // EXAMES DE IMAGEM
    imagemAbdome: [
      'ultrassom', 'ultrassonografia', 'usg', 'ecografia',
      'abdome', 'abdominal', 'pelve', 'pélvica',
      'fígado', 'vesícula', 'vias biliares', 'pâncreas', 'baço',
      'rins', 'bexiga', 'próstata', 'útero', 'ovários',
      'tomografia', 'tc', 'tomografia computadorizada',
      'ressonância', 'rm', 'ressonância magnética'
    ],

    imagemTorax: [
      'raio-x', 'raio x', 'rx', 'radiografia',
      'tórax', 'torácica', 'pulmão', 'pulmonar',
      'pa', 'perfil', 'anteroposterior', 'lateral',
      'tomografia', 'tc tórax'
    ],

    imagemOutros: [
      'crânio', 'cerebral', 'encefálico',
      'coluna', 'lombar', 'cervical', 'dorsal',
      'articulação', 'joelho', 'ombro', 'quadril',
      'mamografia', 'mama'
    ],

    // EXAME FÍSICO
    exameFisico: [
      'exame físico', 'semiologia', 'propedêutica',
      'sinais vitais', 'ssvv', 'pa', 'pressão arterial', 'temperatura', 'pulso', 'fc', 'fr',
      'ausculta', 'cardíaca', 'pulmonar', 'respiratória',
      'palpação', 'abdominal', 'toque retal',
      'inspeção', 'ectoscopia',
      'percussão'
    ],

    // PROCEDIMENTOS
    procedimentos: [
      'eletrocardiograma', 'ecg', 'ekg',
      'ecocardiograma', 'eco',
      'endoscopia', 'eda',
      'colonoscopia',
      'broncoscopia'
    ]
  }

  // Função inteligente para calcular compatibilidade médica
  function calculateMatchScore(request, materialText, materialTitle) {
    const requestLower = request.toLowerCase()
    const materialLower = materialText.toLowerCase()
    const titleLower = materialTitle.toLowerCase()

    let score = 0
    let matchReasons = []

    // 1. MATCH DIRETO NO TÍTULO (peso alto)
    const requestWords = requestLower.split(/\s+/).filter(w => w.length > 2)
    const titleWords = titleLower.split(/\s+/)

    for (const word of requestWords) {
      if (titleWords.some(tw => tw.includes(word) || word.includes(tw))) {
        score += 0.3
        matchReasons.push(`Título contém "${word}"`)
      }
    }

    // 2. MATCHING SEMÂNTICO POR CATEGORIA
    for (const [category, keywords] of Object.entries(medicalDictionary)) {
      const requestHasCategory = keywords.some(kw => requestLower.includes(kw))
      const materialHasCategory = keywords.some(kw => materialLower.includes(kw) || titleLower.includes(kw))

      if (requestHasCategory && materialHasCategory) {
        score += 0.4
        matchReasons.push(`Categoria médica: ${category}`)
        break // Evitar double counting
      }
    }

    // 3. HIERARQUIA ANATÔMICA
    const anatomyHierarchy = {
      'abdome': ['pelve', 'fígado', 'vesícula', 'pâncreas', 'baço', 'rins', 'intestino', 'bexiga'],
      'tórax': ['pulmão', 'coração', 'mediastino', 'pleura'],
      'exames laboratoriais': ['hemograma', 'pcr', 'glicemia', 'ureia', 'creatinina']
    }

    for (const [parent, children] of Object.entries(anatomyHierarchy)) {
      if (requestLower.includes(parent) && children.some(child => titleLower.includes(child))) {
        score += 0.3
        matchReasons.push(`Hierarquia: ${parent} inclui conteúdo`)
      }
      if (children.some(child => requestLower.includes(child)) && titleLower.includes(parent)) {
        score += 0.3
        matchReasons.push(`Hierarquia: solicitou parte de ${parent}`)
      }
    }

    // 4. SINÔNIMOS MÉDICOS
    const synonyms = [
      ['ultrassom', 'ultrassonografia', 'usg', 'ecografia'],
      ['raio-x', 'raio x', 'rx', 'radiografia'],
      ['tomografia', 'tc', 'tomografia computadorizada'],
      ['ressonância', 'rm', 'ressonância magnética'],
      ['hemograma', 'sangue', 'hematológico'],
      ['exame físico', 'semiologia', 'propedêutica']
    ]

    for (const synGroup of synonyms) {
      const requestHasSyn = synGroup.some(syn => requestLower.includes(syn))
      const materialHasSyn = synGroup.some(syn => materialLower.includes(syn) || titleLower.includes(syn))

      if (requestHasSyn && materialHasSyn) {
        score += 0.2
        matchReasons.push(`Sinônimo encontrado`)
        break
      }
    }

    // 5. PALAVRAS-CHAVE ESPECÍFICAS (peso menor)
    const specificWords = requestWords.filter(w =>
      !['para', 'com', 'que', 'uma', 'dos', 'das', 'por', 'seu', 'sua', 'solicito', 'gostaria', 'favor'].includes(w)
    )

    const wordMatches = specificWords.filter(word => materialLower.includes(word))
    if (wordMatches.length > 0) {
      const wordScore = Math.min(0.3, (wordMatches.length / specificWords.length) * 0.3)
      score += wordScore
      matchReasons.push(`${wordMatches.length}/${specificWords.length} palavras encontradas`)
    }

    // Log detalhado
    if (matchReasons.length > 0) {
      console.log(`  💡 Razões do match:`, matchReasons)
    }

    // Normalizar score (máximo 1.0)
    return Math.min(1.0, score)
  }

  // 1. Verificar correspondência direta no título
  for (const material of materials) {
    const tituloLower = (material.tituloImpresso || '').toLowerCase()

    // Se o candidato mencionou exatamente o nome do impresso
    if (tituloLower.includes(messageLower) || messageLower.includes(tituloLower)) {
      console.log('✅ Correspondência direta no título:', material.tituloImpresso)
      return material.idImpresso
    }
  }

  // 2. Analisar conteúdo de cada material dinamicamente com matching inteligente
  let bestMatch = null
  let bestScore = 0

  for (const material of materials) {
    const materialText = extractTextFromMaterial(material)
    const materialTitle = material.tituloImpresso || ''

    console.log(`📄 Analisando "${materialTitle}" (${material.tipoConteudo})`)
    console.log(`📝 Texto extraído: ${materialText.substring(0, 150)}...`)

    const score = calculateMatchScore(candidateMessage, materialText, materialTitle)
    console.log(`📊 Score de correspondência: ${score.toFixed(2)} (${(score * 100).toFixed(0)}%)`)

    if (score > bestScore) {
      bestScore = score
      bestMatch = material
    }
  }

  // 3. Retornar melhor correspondência se score for suficiente (threshold reduzido para 20%)
  if (bestMatch && bestScore >= 0.20) {
    console.log(`✅ Material escolhido: "${bestMatch.tituloImpresso}" com score ${(bestScore * 100).toFixed(0)}%`)
    return bestMatch.idImpresso
  }

  // 4. Se não encontrou correspondência suficiente
  console.log(`❌ Nenhuma correspondência suficiente (melhor score: ${(bestScore * 100).toFixed(0)}%, threshold: 20%)`)
  return null
}

function releaseMaterialById(materialId) {
  if (!materialId || !stationData.value) return

  console.log('🔍 DEBUG - Tentando liberar material:', materialId)
  console.log('🔍 DEBUG - Materiais disponíveis na estação:', stationData.value.materiaisDisponiveis?.impressos)

  // Buscar material na estação (na estrutura CORRETA!)
  const materiaisImpressos = stationData.value.materiaisDisponiveis?.impressos ||
                            stationData.value.materiaisImpressos || []
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
    await loadSimulationData(stationId.value, { preserveWorkflowState: true })

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

// Refs para controle de zoom de imagens
const imageZoomDialog = ref(false)
const selectedImageForZoom = ref('')
const selectedImageAlt = ref('')

// Função para abrir zoom da imagem
function openImageZoom(imageSrc, imageAlt) {
  if (!imageSrc || imageSrc.trim() === '') {
    console.error(`[ZOOM] ❌ Erro: URL da imagem está vazia ou inválida: "${imageSrc}"`)
    return
  }

  selectedImageForZoom.value = imageSrc
  selectedImageAlt.value = imageAlt || 'Imagem do impresso'
  imageZoomDialog.value = true
}

// Função para fechar zoom da imagem
function closeImageZoom() {
  imageZoomDialog.value = false
  selectedImageForZoom.value = ''
  selectedImageAlt.value = ''
}




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
    speechRecognition.value.continuous = true // Permite gravação contínua
    speechRecognition.value.interimResults = true // Mostra resultados parciais
    speechRecognition.value.maxAlternatives = 1

    speechRecognition.value.onresult = (event) => {
      let finalTranscript = ''
      let interimTranscript = ''

      // Processar todos os resultados
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript

        if (event.results[i].isFinal) {
          finalTranscript += transcript
        } else {
          interimTranscript += transcript
        }
      }

      // Atualizar o texto atual (final + interim para feedback visual)
      currentMessage.value = finalTranscript + interimTranscript

      // Se temos resultado final, usar apenas ele
      if (finalTranscript) {
        currentMessage.value = finalTranscript.trim()
        console.log('🎤 Texto final reconhecido:', finalTranscript)
      }

      // 🎤 VOICE ACTIVITY DETECTION (VAD) - Detectar fala e reiniciar timeout de silêncio
      if (autoRecordMode.value && (finalTranscript || interimTranscript)) {
        lastSpeechTime.value = Date.now()

        // Limpar timeout de silêncio anterior
        if (silenceTimeout.value) {
          clearTimeout(silenceTimeout.value)
        }

        // Iniciar novo timeout de 2 segundos de silêncio
        silenceTimeout.value = setTimeout(() => {
          if (isListening.value && autoRecordMode.value) {
            console.log('🔇 2 segundos de silêncio detectados - parando gravação automática')
            stopListening()
            // Se temos texto, enviar automaticamente
            if (currentMessage.value.trim()) {
              sendMessage()
            }
          }
        }, 2000) // 2 segundos de silêncio
      }
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
      console.log('🎤 Reconhecimento de voz finalizado')

      // Limpar timeouts
      if (speechTimeout.value) {
        clearTimeout(speechTimeout.value)
        speechTimeout.value = null
      }
      if (silenceTimeout.value) {
        clearTimeout(silenceTimeout.value)
        silenceTimeout.value = null
      }

      // Se está em modo automático e ainda deve estar escutando, reiniciar
      if (autoRecordMode.value && isListening.value) {
        console.log('🔄 Modo automático: reiniciando reconhecimento...')
        try {
          setTimeout(() => {
            if (autoRecordMode.value && isListening.value) {
              speechRecognition.value.start()
            }
          }, 100) // Pequeno delay para evitar erro
        } catch (error) {
          console.error('❌ Erro ao reiniciar reconhecimento:', error)
          isListening.value = false
        }
      } else {
        isListening.value = false
      }
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

      // Definir timeout de 30 segundos para parar automaticamente
      speechTimeout.value = setTimeout(() => {
        if (isListening.value) {
          console.log('⏰ Timeout de gravação atingido (30s)')
          stopListening()
        }
      }, 30000) // 30 segundos

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

    // Limpar timeouts
    if (speechTimeout.value) {
      clearTimeout(speechTimeout.value)
      speechTimeout.value = null
    }
    if (silenceTimeout.value) {
      clearTimeout(silenceTimeout.value)
      silenceTimeout.value = null
    }
  }
}

// Extrair informações demográficas do paciente (sexo e idade)
function extractPatientDemographics() {
  if (!stationData.value) return { gender: null, age: null }

  const patientScript = stationData.value.materiaisDisponiveis?.informacoesVerbaisSimulado || []

  let allText = ''
  patientScript.forEach(item => {
    if (item.informacao) {
      allText += item.informacao + '\n'
    }
  })

  const demographics = { gender: null, age: null }

  // Extrair idade
  const ageMatch = allText.match(/(\d+)\s*anos?/i)
  if (ageMatch) {
    demographics.age = parseInt(ageMatch[1])
  }

  // Extrair sexo - procurar por indicadores de gênero
  const text = allText.toLowerCase()

  // Indicadores femininos
  const feminineIndicators = [
    /\b(mulher|feminino|senhora|sra|dona|gestante|grávida|menstruação|menopausa)\b/i,
    /\b(casada|solteira|divorciada|viúva|separada)\b/i,
    /\b(ela|dela)\b/i
  ]

  // Indicadores masculinos
  const masculineIndicators = [
    /\b(homem|masculino|senhor|sr|rapaz)\b/i,
    /\b(casado|solteiro|divorciado|viúvo|separado)\b/i,
    /\b(ele|dele)\b/i
  ]

  let femaleScore = 0
  let maleScore = 0

  feminineIndicators.forEach(pattern => {
    if (pattern.test(text)) femaleScore++
  })

  masculineIndicators.forEach(pattern => {
    if (pattern.test(text)) maleScore++
  })

  // Determinar gênero baseado em score
  if (femaleScore > maleScore) {
    demographics.gender = 'female'
  } else if (maleScore > femaleScore) {
    demographics.gender = 'male'
  }

  console.log('👤 Demografia do paciente:', demographics)
  return demographics
}

// Selecionar voz apropriada baseada em sexo e idade
function selectVoiceForPatient() {
  if (!('speechSynthesis' in window)) return null

  const { gender, age } = extractPatientDemographics()
  const voices = window.speechSynthesis.getVoices()

  console.log('🔊 Vozes disponíveis:', voices.map(v => ({ name: v.name, lang: v.lang, gender: v.name })))

  // Filtrar vozes em português brasileiro
  const ptBRVoices = voices.filter(v => v.lang.includes('pt-BR') || v.lang.includes('pt_BR'))

  if (ptBRVoices.length === 0) {
    console.warn('⚠️ Nenhuma voz pt-BR encontrada, usando vozes pt genéricas')
    const ptVoices = voices.filter(v => v.lang.includes('pt'))
    if (ptVoices.length === 0) {
      console.warn('⚠️ Nenhuma voz em português encontrada')
      return null
    }
  }

  const availableVoices = ptBRVoices.length > 0 ? ptBRVoices : voices.filter(v => v.lang.includes('pt'))

  // Procurar por voz feminina ou masculina baseado em palavras-chave no nome
  let selectedVoice = null

  if (gender === 'female') {
    // Procurar vozes femininas
    selectedVoice = availableVoices.find(v =>
      v.name.toLowerCase().includes('female') ||
      v.name.toLowerCase().includes('feminino') ||
      v.name.toLowerCase().includes('maria') ||
      v.name.toLowerCase().includes('luciana') ||
      v.name.toLowerCase().includes('francisca')
    )
  } else if (gender === 'male') {
    // Procurar vozes masculinas
    selectedVoice = availableVoices.find(v =>
      v.name.toLowerCase().includes('male') ||
      v.name.toLowerCase().includes('masculino') ||
      v.name.toLowerCase().includes('ricardo') ||
      v.name.toLowerCase().includes('felipe')
    )
  }

  // Se não encontrou voz específica, usar primeira disponível
  if (!selectedVoice && availableVoices.length > 0) {
    selectedVoice = availableVoices[0]
  }

  console.log(`🎤 Voz selecionada: ${selectedVoice?.name} (gênero: ${gender}, idade: ${age})`)
  return selectedVoice
}

// Calcular rate e pitch baseado na idade
function getVoiceParametersForAge(age) {
  if (!age) return { rate: 0.9, pitch: 1.0 }

  let rate = 0.9
  let pitch = 1.0

  // Crianças: voz mais aguda e rápida
  if (age < 12) {
    rate = 1.1
    pitch = 1.4
  }
  // Adolescentes: voz um pouco mais aguda
  else if (age < 18) {
    rate = 1.0
    pitch = 1.2
  }
  // Adultos jovens (18-40): voz normal
  else if (age < 40) {
    rate = 0.95
    pitch = 1.0
  }
  // Adultos (40-60): voz um pouco mais grave e lenta
  else if (age < 60) {
    rate = 0.85
    pitch = 0.95
  }
  // Idosos (60+): voz mais grave e lenta
  else {
    rate = 0.75
    pitch = 0.85
  }

  console.log(`🎚️ Parâmetros de voz para idade ${age}: rate=${rate}, pitch=${pitch}`)
  return { rate, pitch }
}

function speakText(text) {
  if ('speechSynthesis' in window) {
    // Parar qualquer fala em andamento
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'pt-BR'

    // Selecionar voz apropriada se ainda não foi selecionada
    if (!selectedVoice.value) {
      selectedVoice.value = selectVoiceForPatient()
    }

    // Aplicar voz selecionada
    if (selectedVoice.value) {
      utterance.voice = selectedVoice.value
    }

    // Aplicar rate e pitch baseado na idade
    const { age } = extractPatientDemographics()
    const { rate, pitch } = getVoiceParametersForAge(age)
    utterance.rate = rate
    utterance.pitch = pitch

    utterance.onstart = () => {
      isSpeaking.value = true
    }

    utterance.onend = () => {
      isSpeaking.value = false

      // 🎤 Se modo automático está habilitado, reiniciar gravação após IA terminar de falar
      if (autoRecordMode.value && !isListening.value) {
        console.log('🎤 IA terminou de falar - reiniciando gravação automática...')
        setTimeout(() => {
          if (autoRecordMode.value && !isListening.value) {
            startListening()
          }
        }, 500) // Pequeno delay de 500ms para evitar capturar eco da síntese
      }
    }

    utterance.onerror = () => {
      isSpeaking.value = false

      // 🎤 Se modo automático está habilitado, reiniciar gravação mesmo em caso de erro
      if (autoRecordMode.value && !isListening.value) {
        console.log('🎤 Erro na síntese de voz - reiniciando gravação automática...')
        setTimeout(() => {
          if (autoRecordMode.value && !isListening.value) {
            startListening()
          }
        }, 500)
      }
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

function toggleVoiceRecording() {
  if (isListening.value) {
    stopListening()
  } else {
    startListening()
  }
}

function toggleAutoRecordMode() {
  autoRecordMode.value = !autoRecordMode.value
  console.log(`🎤 Modo de gravação: ${autoRecordMode.value ? 'AUTOMÁTICO' : 'MANUAL'}`)

  // Se ativou modo automático, iniciar gravação imediatamente
  if (autoRecordMode.value && !isListening.value) {
    console.log('🎤 Iniciando gravação automática...')
    startListening()
  }
  // Se desativou modo automático e está gravando, parar
  else if (!autoRecordMode.value && isListening.value) {
    console.log('🎤 Parando gravação automática...')
    stopListening()
  }
}

// Watchers - ajustes específicos para modo IA
watch(selectedDurationMinutes, () => {
  updateTimerDisplayFromSelection()
})

watch(simulationStarted, (newValue) => {
  if (newValue) {
    if (autoRecordMode.value && !isListening.value) {
      startListening()
    }
  } else {
    cancelCountdown()
    if (isListening.value) {
      stopListening()
    }
  }
})

// Watcher para liberar PEP automaticamente ao final da simulação (mesma lógica do SimulationView.vue)
watch(simulationEnded, (newValue) => {
  if (newValue) {
    finalizeAISimulation()
    console.log('🔚 Simulação finalizada - liberando PEP automaticamente')
    // Liberar PEP automaticamente quando a simulação termina
    pepReleasedToCandidate.value = true
    isChecklistVisibleForCandidate.value = true
    stopListening()

    console.log('✅ PEP liberado automaticamente:', {
      pepReleasedToCandidate: pepReleasedToCandidate.value,
      isChecklistVisibleForCandidate: isChecklistVisibleForCandidate.value,
      checklistData: !!checklistData.value,
      autoEvaluateEnabled: autoEvaluateEnabled.value
    })

    // IA deve agir como avaliador e preencher o PEP automaticamente (somente se habilitado)
    if (autoEvaluateEnabled.value) {
      console.log('🤖 Avaliação automática habilitada - iniciando em 2 segundos...')
      setTimeout(() => {
        aiEvaluatePEP()
      }, 2000) // Aguarda 2 segundos após liberar o PEP
    } else {
      console.log('⏸️ Avaliação automática desabilitada - aguardando ação manual do usuário')
    }
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
    const response = await fetch(`${backendUrl}/ai-chat/evaluate-pep`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentUser.value?.accessToken || ''}`
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
function processAIEvaluation(evaluationData) {
  console.log('🔍 Processando avaliação da IA...', evaluationData)

  // Se evaluation é string, tentar parsear como JSON
  let evaluations = evaluationData
  if (typeof evaluationData === 'string') {
    try {
      evaluations = JSON.parse(evaluationData)
    } catch (e) {
      console.warn('⚠️ Não foi possível parsear JSON, usando fallback simples')
      processAIEvaluationSimple(evaluationData)
      return
    }
  }

  // Se evaluation é objeto com array de itens
  if (evaluations && Array.isArray(evaluations.items)) {
    evaluations.items.forEach((itemEval, index) => {
      const item = checklistData.value.itensAvaliacao[index]
      if (!item) return

      if (!markedPepItems.value[item.idItem]) {
        markedPepItems.value[item.idItem] = []
      }

      // A IA deve retornar: { pontuacao: number, justificativa: string }
      const pontuacao = itemEval.pontuacao || itemEval.score || 0
      const justificativa = itemEval.justificativa || itemEval.observacao || itemEval.reasoning || 'Avaliado pela IA'

      markedPepItems.value[item.idItem] = [{
        pontuacao: pontuacao,
        observacao: justificativa,
        timestamp: new Date().toISOString()
      }]

      // Usar a classificação correta baseada nos valores reais do PEP
      const nivel = getClassificacaoFromPontuacao(pontuacao, item)
      console.log(`✅ Item ${index + 1} (${item.descricaoItem?.substring(0, 50)}...): ${nivel} (${pontuacao} pts)`)
      console.log(`   Justificativa: ${justificativa.substring(0, 100)}...`)
    })
  } else {
    // Fallback para formato simples
    console.warn('⚠️ Formato de avaliação não reconhecido, usando fallback')
    processAIEvaluationSimple(typeof evaluationData === 'string' ? evaluationData : JSON.stringify(evaluationData))
    return
  }

  // Marcar avaliação como concluída
  evaluationSubmittedByCandidate.value = true
  submittingEvaluation.value = false

  console.log('🎯 Avaliação automática concluída:', Object.keys(markedPepItems.value).length, 'itens avaliados')
}

// Fallback para formato simples (compatibilidade)
function processAIEvaluationSimple(evaluationText) {
  if (!evaluationText || !checklistData.value?.itensAvaliacao?.length) {
    console.warn('⚠️ Fallback simples sem dados suficientes para avaliar.')
    submittingEvaluation.value = false
    return
  }

  console.log('🔄 Usando fallback simples com texto:', evaluationText.substring(0, 200))

  const evaluationChunks = evaluationText
    .split(/\r?\n|,/)
    .map(chunk => chunk.trim())
    .filter(chunk => chunk.length > 0)

  checklistData.value.itensAvaliacao.forEach((item, index) => {
    if (!markedPepItems.value[item.idItem]) {
      markedPepItems.value[item.idItem] = []
    }

    const itemEvaluation = evaluationChunks.find(evalText => {
      const lower = evalText.toLowerCase()
      const itemLabel = `item ${index + 1}`
      const startsWithIndex = lower.startsWith(`${index + 1}:`) || lower.startsWith(`${index + 1} -`)
      return lower.includes(itemLabel) || startsWithIndex
    })

    const adequadoPts = item.pontuacoes?.adequado?.pontos ?? 5
    const parcialPts = item.pontuacoes?.parcialmenteAdequado?.pontos ?? Math.max(adequadoPts / 2, 1)
    const inadequadoPts = item.pontuacoes?.inadequado?.pontos ?? 0

    let score = inadequadoPts
    let nivel = 'INADEQUADO'
    let justificativa = 'Avaliação automática: desempenho insuficiente (fallback).'

    if (itemEvaluation) {
      const evalLower = itemEvaluation.toLowerCase()

      if (
        evalLower.includes('não consta') ||
        evalLower.includes('nao consta') ||
        evalLower.includes('não realizou') ||
        evalLower.includes('não fez') ||
        (evalLower.includes('não') && evalLower.includes('script'))
      ) {
        score = inadequadoPts
        nivel = 'INADEQUADO'
        justificativa = 'Avaliado automaticamente: item não foi realizado segundo a IA (fallback).'
      } else if (
        evalLower.includes('parcial') ||
        evalLower.includes('parcialmente') ||
        evalLower.includes('incompleto')
      ) {
        score = parcialPts
        nivel = 'PARCIALMENTE ADEQUADO'
        justificativa = 'Avaliado automaticamente: execução parcial identificada (fallback).'
      } else if (
        evalLower.includes('sim') ||
        evalLower.includes('adequado') ||
        evalLower.includes('realizou') ||
        evalLower.includes('correto') ||
        evalLower.includes('completo')
      ) {
        score = adequadoPts
        nivel = 'ADEQUADO'
        justificativa = 'Avaliado automaticamente: item realizado corretamente (fallback).'
      }

      console.log(`✅ Fallback item ${index + 1} (${item.descricaoItem?.substring(0, 40)}...): ${nivel} (${score} pts)`)
      console.log(`   Texto avaliação: "${itemEvaluation.substring(0, 120)}..."`)
    } else {
      console.warn(`⚠️ Fallback não encontrou menção explícita ao item ${index + 1}; marcando como inadequado.`)
    }

    markedPepItems.value[item.idItem] = [{
      pontuacao: Number(score),
      observacao: justificativa,
      timestamp: new Date().toISOString()
    }]
  })

  evaluationSubmittedByCandidate.value = true
  submittingEvaluation.value = false
  console.log('🎯 Avaliação fallback concluída:', Object.keys(markedPepItems.value).length, 'itens')
}

// Fallback para avaliação automática simples (se IA falhar)
function autoEvaluatePEPFallback() {
  console.log('⚠️ Usando avaliação fallback simples...')

  const candidateMessages = conversationHistory.value.filter(msg =>
    msg.sender === 'candidate' || msg.role === 'candidate'
  )

  const totalMessages = candidateMessages.length

  checklistData.value.itensAvaliacao.forEach(item => {
    if (!markedPepItems.value[item.idItem]) {
      markedPepItems.value[item.idItem] = []
    }

    const adequadoPts = item.pontuacoes?.adequado?.pontos ?? 5
    const parcialPts = item.pontuacoes?.parcialmenteAdequado?.pontos ?? Math.max(adequadoPts / 2, 1)
    const inadequadoPts = item.pontuacoes?.inadequado?.pontos ?? 0

    const adequateThreshold = 6
    const partialThreshold = 3

    let score = inadequadoPts
    let observacao = 'Avaliação automática (fallback): participação insuficiente detectada.'

    if (totalMessages >= adequateThreshold) {
      score = adequadoPts
      observacao = 'Avaliação automática (fallback): participação consistente detectada.'
    } else if (totalMessages >= partialThreshold) {
      score = parcialPts
      observacao = 'Avaliação automática (fallback): participação parcial detectada.'
    }

    markedPepItems.value[item.idItem] = [{
      pontuacao: Number(score),
      observacao,
      timestamp: new Date().toISOString()
    }]
  })

  // Marcar avaliação como concluída
  evaluationSubmittedByCandidate.value = true
  submittingEvaluation.value = false

  console.log('🎯 Avaliação fallback concluída:', Object.keys(markedPepItems.value).length, 'itens avaliados')
}

// Função para classificar pontuação baseada nos valores reais do PEP
function getClassificacaoFromPontuacao(pontuacao, item) {
  if (!item?.pontuacoes) {
    // Fallback para valores antigos fixos se não houver pontuações definidas
    if (pontuacao >= 5) return { label: 'Adequado', color: 'success' }
    if (pontuacao >= 3) return { label: 'Parcialmente Adequado', color: 'warning' }
    return { label: 'Inadequado', color: 'error' }
  }

  const adequado = item.pontuacoes.adequado?.pontos || 1.0
  const parcial = item.pontuacoes.parcialmenteAdequado?.pontos || 0.5
  // Compara com margem de erro mínima (0.01) para lidar com imprecisões de float
  const epsilon = 0.01

  if (Math.abs(pontuacao - adequado) < epsilon || pontuacao >= adequado - epsilon) {
    return { label: 'Adequado', color: 'success' }
  }

  if (Math.abs(pontuacao - parcial) < epsilon || (pontuacao >= parcial - epsilon && pontuacao < adequado - epsilon)) {
    return { label: 'Parcialmente Adequado', color: 'warning' }
  }

  return { label: 'Inadequado', color: 'error' }
}

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
    cancelCountdown()
    stopListening()
  })

  // Inicializar reconhecimento de voz
  initSpeechRecognition()

  // Carregar vozes disponíveis (necessário em alguns navegadores)
  if ('speechSynthesis' in window) {
    // Carregar vozes imediatamente se disponível
    if (window.speechSynthesis.getVoices().length > 0) {
      console.log('🔊 Vozes já carregadas')
    }

    // Listener para quando as vozes forem carregadas
    window.speechSynthesis.onvoiceschanged = () => {
      console.log('🔊 Vozes carregadas:', window.speechSynthesis.getVoices().length)
      // Resetar voz selecionada para forçar nova seleção
      selectedVoice.value = null
    }
  }

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
    <v-overlay
      :model-value="countdownActive"
      class="countdown-overlay"
      :scrim="'rgba(9, 17, 43, 0.8)'"
      persistent
    >
      <div class="countdown-content">
        <div class="countdown-number">{{ countdownValue }}</div>
        <div class="text-subtitle-1 mt-2 text-center">Preparando a simulação...</div>
      </div>
    </v-overlay>

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
                          :key="`infra-main-${index}`"
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
                    <li v-for="(tarefa, i) in stationData.instrucoesParticipante.tarefasPrincipais" :key="`task-main-${i}`" v-html="tarefa"></li>
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
                    <li v-for="(aviso, i) in stationData.instrucoesParticipante.avisosImportantes" :key="`warning-main-${i}`">
                      {{ aviso }}
                    </li>
                  </ul>
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

                      <v-expansion-panels v-else variant="inset" class="mt-4">
                        <v-expansion-panel v-for="(material, id) in releasedData" :key="'released-main-'+id">
                          <v-expansion-panel-title>{{ material.tituloImpresso || 'Material' }}</v-expansion-panel-title>
                          <v-expansion-panel-text class="text-body-1">
                            <div v-if="material.tipoConteudo === 'texto_simples'" v-html="material.conteudo.texto" />
                            <div v-else-if="material.tipoConteudo === 'imagem_com_texto' || material.tipoConteudo === 'imagemComLaudo'">
                              <p v-if="material.conteudo.textoDescritivo" v-html="material.conteudo.textoDescritivo"></p>
                              <img
                                v-if="material.conteudo.caminhoImagem"
                                :src="material.conteudo.caminhoImagem"
                                :alt="material.tituloImpresso"
                                class="impresso-imagem impresso-imagem-clickable"
                                style="max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 4px; margin: 10px 0;"
                                @click="openImageZoom(material.conteudo.caminhoImagem, material.tituloImpresso)"
                              />
                              <p v-if="material.conteudo.legendaImagem" class="text-caption text-center font-italic mt-2">{{ material.conteudo.legendaImagem }}</p>

                              <!-- Exibir laudo se existir -->
                              <v-card v-if="material.conteudo.laudo || material.conteudo.laudoCompleto" variant="tonal" color="info" class="mt-3">
                                <v-card-title class="text-subtitle-1">
                                  <v-icon start>ri-file-text-line</v-icon>
                                  Laudo
                                </v-card-title>
                                <v-card-text class="text-body-2">
                                  {{ material.conteudo.laudo || material.conteudo.laudoCompleto }}
                                </v-card-text>
                              </v-card>
                            </div>
                            <div v-else-if="material.tipoConteudo === 'lista_chave_valor_secoes'">
                              <div v-for="(secao, index) in material.conteudo.secoes" :key="'secao-main-'+index" class="mb-3">
                                <h4 class="mb-2">{{ secao.nomeSecao }}</h4>
                                <table class="w-100 mb-3">
                                  <tbody>
                                    <tr v-for="(item, i) in secao.itens" :key="'item-main-'+i">
                                      <td class="font-weight-bold pa-1" style="width: 30%;">{{ item.chave }}:</td>
                                      <td class="pa-1">{{ item.valor }}</td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            </div>
                            <div v-else-if="material.tipoConteudo === 'tabela'">
                              <v-table density="compact" class="mt-2">
                                <thead>
                                  <tr>
                                    <th
                                      v-for="(cabecalho, i) in material.conteudo.cabecalhos"
                                      :key="'cab-main-'+i"
                                      class="font-weight-bold"
                                    >
                                      {{ cabecalho }}
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr v-for="(linha, i) in material.conteudo.linhas" :key="'linha-main-'+i">
                                    <td v-for="(celula, j) in linha" :key="'cel-main-'+j">{{ celula }}</td>
                                  </tr>
                                </tbody>
                              </v-table>
                            </div>
                          </v-expansion-panel-text>
                        </v-expansion-panel>
                      </v-expansion-panels>
                    </v-expansion-panel-text>
                  </v-expansion-panel>
                </v-expansion-panels>
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
                      @click="aiEvaluatePEP"
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

              <v-alert
                v-if="!simulationStarted"
                variant="tonal"
                color="primary"
                class="mx-4 my-4 pre-sim-alert"
                density="comfortable"
              >
                <strong>Instruções:</strong>
                Fale em voz alta, claramente e não faça pausas prolongadas. Após terminar de falar aguarde de 1 a 2 segundos para que sua fala seja transcrita e enviada. Cada fala tem um tempo limite de 30 segundos; após isso a gravação da voz é finalizada. Faça um resumo do solicitado e aguarde meu comando para prosseguir.
              </v-alert>

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
                          :class="{'criterio-item': true, 'criterio-selecionado': markedPepItems[item.idItem]?.[0]?.pontuacao === 5, 'mb-2': true}">
                          <div class="d-flex align-start">
                            <v-icon
                              :icon="markedPepItems[item.idItem]?.[0]?.pontuacao === 5 ? 'ri-checkbox-circle-fill' : 'ri-checkbox-blank-circle-line'"
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
                          :class="{'criterio-item': true, 'criterio-selecionado': markedPepItems[item.idItem]?.[0]?.pontuacao >= 3 && markedPepItems[item.idItem]?.[0]?.pontuacao < 5, 'mb-2': true}">
                          <div class="d-flex align-start">
                            <v-icon
                              :icon="(markedPepItems[item.idItem]?.[0]?.pontuacao >= 3 && markedPepItems[item.idItem]?.[0]?.pontuacao < 5) ? 'ri-checkbox-indeterminate-fill' : 'ri-checkbox-blank-circle-line'"
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
                          :class="{'criterio-item': true, 'criterio-selecionado': markedPepItems[item.idItem]?.[0]?.pontuacao < 3}">
                          <div class="d-flex align-start">
                            <v-icon
                              :icon="markedPepItems[item.idItem]?.[0]?.pontuacao < 3 ? 'ri-close-circle-fill' : 'ri-checkbox-blank-circle-line'"
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
                      <div v-if="markedPepItems[item.idItem]?.[0]?.pontuacao !== undefined">
                        <v-chip
                          :color="getClassificacaoFromPontuacao(markedPepItems[item.idItem][0].pontuacao, item).color"
                          variant="tonal"
                          class="mb-1"
                        >
                          {{ getClassificacaoFromPontuacao(markedPepItems[item.idItem][0].pontuacao, item).label }}
                        </v-chip>
                        <div class="text-caption">{{ markedPepItems[item.idItem]?.[0]?.pontuacao }} pontos</div>
                        <div v-if="markedPepItems[item.idItem]?.[0]?.observacao" class="text-caption mt-1">{{ markedPepItems[item.idItem][0].observacao }}</div>
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

    <!-- Modal de zoom para imagens -->
    <v-dialog
      v-model="imageZoomDialog"
      max-width="90vw"
      max-height="90vh"
      content-class="image-zoom-dialog"
    >
      <v-card>
        <v-card-title class="d-flex justify-space-between align-center">
          <span>{{ selectedImageAlt }}</span>
          <v-btn
            icon="ri-close-line"
            variant="text"
            @click="closeImageZoom"
          />
        </v-card-title>
        <v-card-text class="pa-0">
          <div class="text-center">
            <img
              :src="selectedImageForZoom"
              :alt="selectedImageAlt"
              style="max-width: 100%; max-height: 80vh; object-fit: contain;"
            />
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>
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

.countdown-overlay .v-overlay__content {
  display: flex;
  align-items: center;
  justify-content: center;
}

.countdown-content {
  background-color: rgba(var(--v-theme-surface), 0.92);
  padding: 32px 48px;
  border-radius: 20px;
  box-shadow: 0 12px 40px rgba(12, 22, 58, 0.45);
  text-align: center;
}

.countdown-number {
  font-size: 4rem;
  font-weight: 700;
  color: rgb(var(--v-theme-primary));
}

.pre-sim-alert {
  font-size: 0.9rem;
  line-height: 1.5;
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

/* DIAGNÓSTICO URGENTE: Usando apenas estilos inline no template */
</style>

