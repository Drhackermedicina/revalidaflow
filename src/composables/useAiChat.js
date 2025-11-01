import { ref, computed, nextTick } from 'vue'
import { currentUser } from '@/plugins/auth.js'
import { backendUrl } from '@/utils/backendUrl.js'
import { useChatInput } from '@/composables/useChatInput.js'

/**
 * @typedef {import('vue').Ref} Ref
 */

/**
 * Gerencia todo o fluxo de chat com a IA, incluindo o envio de mensagens,
 * processamento de respostas e a lógica complexa para liberação de materiais.
 * @param {{stationData: Ref<object>, simulationStarted: Ref<boolean>, speakText: (text: string) => void, scrollToBottom: () => void}} props
 */
export function useAiChat({ stationData, simulationStarted, speakText, scrollToBottom }) {
  const { formatMessageText } = useChatInput()
  const conversationHistory = ref([])
  const currentMessage = ref('')
  const isProcessingMessage = ref(false)
  const releasedData = ref({})

  const canSendMessage = computed(() =>
    currentMessage.value.trim().length > 0 &&
    !isProcessingMessage.value &&
    simulationStarted.value
  )

  // Detecta pedido formal de exame iniciando com palavras-chave
  function isFormalRequest(text) {
    if (!text) return false
    const t = text.trim().toLowerCase()
    return (
      t.startsWith('solicito ') ||
      t.startsWith('solicita ') ||
      t.startsWith('solicitar ') ||
      t.startsWith('eu quero ')
    )
  }

  function normalizeText(str = "") {
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  function stripRequestPrefix(message = '') {
    const prefixes = ['solicito ', 'solicita ', 'solicitar ', 'eu quero ']
    let text = message.toLowerCase().trim()
    for (const prefix of prefixes) {
      if (text.startsWith(prefix)) {
        text = text.slice(prefix.length)
        break
      }
    }
    return text
  }

  function findSpecificMaterial(candidateMessage, materials) {
    if (!candidateMessage || !materials || materials.length === 0) return null

    const request = stripRequestPrefix(candidateMessage)
    const reqNorm = normalizeText(request)

    const synonyms = [
      ['raio x', 'raiox', 'raio-x', 'rx', 'radiografia', 'radriografia'],
      ['torax', 'torac', 'tx', 'peito'],
      ['abdomen', 'abdomen', 'abdomem'],
      ['tomografia', 'tc', 'tomo'],
      ['ressonancia', 'rm', 'ressonancia'],
      ['ultrassom', 'usg', 'ultrassonografia', 'ecografia'],
      ['eletrocardiograma', 'ecg'],
      ['hemograma', 'hemograma completo'],
      ['glicemia', 'glicemia capilar'],
      ['sinais vitais', 'ssvv', 'sinais'],
      ['exame fisico', 'exame fisico', 'fisico', 'semiologia', 'propedeutica']
    ]

    function expandSynonyms(text) {
      let expanded = text
      for (const group of synonyms) {
        const normalizedGroup = group.map(term => normalizeText(term))
        if (normalizedGroup.some(term => expanded.includes(term))) {
          for (const term of normalizedGroup) {
            if (!expanded.includes(term)) expanded += ' ' + term
          }
        }
      }
      return expanded
    }

    const reqExpanded = expandSynonyms(reqNorm)

    function extractMaterialFields(material) {
      const title = normalizeText([material.tituloImpresso, material.titulo].filter(Boolean).join(' '))
      const bagParts = [
        material.tipoConteudo,
        material.descricao,
        material.categoria,
        material.subcategoria,
        Array.isArray(material.palavrasChave) ? material.palavrasChave.join(' ') : '',
        material.conteudo?.texto,
        material.conteudo?.textoDescritivo,
        material.conteudo?.laudo
      ].filter(Boolean)
      const bag = normalizeText(bagParts.join(' '))
      const tipo = (material.tipoConteudo || '').toLowerCase()
      return { title, bag, tipo }
    }

    const tokenSet = str => new Set(str.split(' ').filter(Boolean))
    const jaccard = (a, b) => {
      const A = tokenSet(a)
      const B = tokenSet(b)
      const inter = [...A].filter(x => B.has(x)).length
      const uni = new Set([...A, ...B]).size || 1
      return inter / uni
    }
    const includesAny = (hay, needles) => needles.some(n => hay.includes(n))

    let best = { mat: null, score: 0 }

    for (const material of materials) {
      const { title, bag, tipo } = extractMaterialFields(material)

      const titleScore = jaccard(reqExpanded, title)
      const bagScore = tipo.includes('imagem') ? 0 : jaccard(reqExpanded, bag)

      const hasRxSyn = includesAny(title, ['raio x','raio-x','rx','radiografia'])
      const hasTorax = includesAny(title, ['torax','torac'])
      let bonus = 0
      if (hasRxSyn && includesAny(reqExpanded, ['raio x','raio-x','rx','radiografia'])) bonus += 0.2
      if (hasTorax && includesAny(reqExpanded, ['torax','torac'])) bonus += 0.1

      const isPhysical = includesAny(reqExpanded, ['exame fisico','semiologia','propedeutica'])
      const isVitals = includesAny(reqExpanded, ['sinais vitais','ssvv'])
      let score = titleScore * 0.8 + bagScore * 0.2 + bonus
      if (isPhysical || isVitals) score += 0.15
      if (tipo.includes('imagem')) {
        score = titleScore + bonus
      }

      if (score > best.score) best = { mat: material, score }
    }

    const threshold = 0.2
    if (best.mat && best.score >= threshold) return best.mat.idImpresso

    const requestTokens = [...tokenSet(reqExpanded)].filter(token => token.length > 2)
    for (const material of materials) {
      const titleTokens = tokenSet(normalizeText(material.tituloImpresso || material.titulo || ''))
      if (requestTokens.some(token => titleTokens.has(token))) {
        return material.idImpresso
      }
    }

    return null
  }

  function collectMaterialsByKeywords(materials, keywords) {
    const matches = new Set()
    materials.forEach(material => {
      const text = normalizeText([
        material.tituloImpresso,
        material.titulo,
        material.tipoConteudo,
        material.descricao,
        material.categoria,
        material.subcategoria,
        Array.isArray(material.palavrasChave) ? material.palavrasChave.join(' ') : '',
        material.conteudo?.texto
      ].filter(Boolean).join(' '))

      if (keywords.some(keyword => text.includes(keyword))) {
        matches.add(material.idImpresso || material.id)
      }
    })
    return matches
  }

  async function resolveAuthContext() {
    const user = currentUser.value
    if (!user || typeof user.getIdToken !== 'function') {
      return { token: null, userId: '' }
    }

    try {
      const token = await user.getIdToken()
      return {
        token,
        userId: user.uid || user.userId || ''
      }
    } catch (_error) {
      return {
        token: null,
        userId: user.uid || user.userId || ''
      }
    }
  }

  function handleMaterialRequest(candidateMessage) {
    if (!isFormalRequest(candidateMessage) || !stationData.value) {
      return { status: 'none' }
    }

    const materials = stationData.value.materiaisDisponiveis?.impressos || stationData.value.materiaisImpressos || stationData.value.materiais || []
    if (!materials.length) return { status: 'not_found' }

    const normalizedRequest = normalizeText(stripRequestPrefix(candidateMessage))
    const matchedIds = new Set()

    const labRequestKeywords = ['exame labor', 'exames labor', 'laborator', 'laboratorio', 'laboratorio', 'laboratoriais']
    if (labRequestKeywords.some(k => normalizedRequest.includes(k))) {
      const labMaterialKeywords = ['lab', 'hemograma', 'hemat', 'bioquim', 'bioquimica', 'glic', 'ureia', 'creatinina', 'gasometr', 'coagul', 'urina', 'urinalise', 'cultura', 'copro', 'paras', 'eletr', 'sodio', 'potassio', 'colesterol', 'enzim']
      collectMaterialsByKeywords(materials, labMaterialKeywords).forEach(id => matchedIds.add(id))
    }

    const physicalRequestKeywords = ['exame fisic', 'exame fisic', 'semiolog', 'propedeut', 'avaliacao fis', 'sinais vitais', 'ssvv']
    if (physicalRequestKeywords.some(k => normalizedRequest.includes(k))) {
      const physicalMaterialKeywords = ['fisic', 'semiolog', 'propedeut', 'avaliacao', 'sinais vitais', 'ssvv', 'inspec', 'palpac', 'auscult', 'percuss']
      collectMaterialsByKeywords(materials, physicalMaterialKeywords).forEach(id => matchedIds.add(id))
    }

    if (!matchedIds.size) {
      const specificId = findSpecificMaterial(candidateMessage, materials)
      if (specificId) matchedIds.add(specificId)
    }

    if (matchedIds.size) {
      matchedIds.forEach(id => {
        if (id && !releasedData.value[id]) {
          releaseMaterialById(id)
        }
      })
      return { status: 'released' }
    }

    return { status: 'not_found' }
  }

  async function processAIResponse(candidateMessage) {
    const materialOutcome = handleMaterialRequest(candidateMessage)

    if (materialOutcome.status === 'released') {
      return 'Considere solicitado.'
    }

    if (materialOutcome.status === 'not_found') {
      return 'Não está disponível esse exame.'
    }

    try {
      const authContext = await resolveAuthContext()
      if (!authContext.token || !authContext.userId) {
        throw new Error('AUTHENTICATION_REQUIRED')
      }

      const response = await fetch(`${backendUrl}/ai-chat/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authContext.token}`,
          'user-id': authContext.userId
        },
        body: JSON.stringify({
          message: candidateMessage,
          stationData: stationData.value,
          conversationHistory: conversationHistory.value.slice(-10),
          responseMode: isFormalRequest(candidateMessage) ? 'chief' : 'actor'
        }),
      })

      if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`)

      const aiResponse = await response.json()
      let message = aiResponse.message || ''

      if (/seja mais\s+especi[fí]co/.test(message.toLowerCase())) {
        message = 'Não está disponível esse exame.'
      }

      return message
    } catch (error) {
      if (error.message === 'AUTHENTICATION_REQUIRED') {
        return 'Não consegui validar sua sessão. Atualize a página ou faça login novamente.'
      }
      try { const { captureSimulationError } = await import('@/plugins/sentry.js'); captureSimulationError(error, { simulationState: 'ai_response', stationId: stationData.value?.id, sessionId: conversationHistory.value?.length }) } catch (_) {}
      return 'Desculpe, estou com um problema técnico no momento. Pode repetir a pergunta?'
    }
  }
  function releaseMaterialById(materialId) {
    if (!materialId || !stationData.value) return
    const allMaterials = stationData.value.materiaisDisponiveis?.impressos || stationData.value.materiaisImpressos || []
    const material = allMaterials.find(m => m.idImpresso === materialId || m.id === materialId)

    if (material) {
      releasedData.value[materialId] = {
        ...material,
        releasedAt: new Date(),
        releasedBy: 'ai',
      }
      conversationHistory.value.push({
        role: 'system',
        content: formatMessageText(`📄 Material liberado: ${material.tituloImpresso || material.titulo || 'Documento'}`),
        timestamp: new Date(),
      })
    }
  }

  async function sendMessage() {
    if (!canSendMessage.value) return

    const message = currentMessage.value.trim()
    currentMessage.value = ''
    isProcessingMessage.value = true

    conversationHistory.value.push({
      role: 'candidate',
      content: formatMessageText(message),
      timestamp: new Date(),
    })
    await nextTick()
    scrollToBottom()

    try {
      const aiResponse = await processAIResponse(message)
      conversationHistory.value.push({
        role: 'ai_actor',
        content: formatMessageText(aiResponse),
        timestamp: new Date(),
      })
      await nextTick()
      scrollToBottom()
      speakText(aiResponse)
    } catch (error) {
      conversationHistory.value.push({
        role: 'system',
        content: formatMessageText('Desculpe, houve um erro. Tente novamente.'),
        timestamp: new Date(),
        isError: true,
      })
      await nextTick()
      scrollToBottom()
    } finally {
      isProcessingMessage.value = false
    }
  }

  function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      sendMessage()
    }
  }

  return {
    conversationHistory,
    currentMessage,
    isProcessingMessage,
    releasedData,
    canSendMessage,
    sendMessage,
    handleKeyPress,
  }
}



