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
  const pendingMessages = ref([])

  function stripHtml(text = '') {
    return text
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/?[^>]+(>|$)/g, '')
      .replace(/\s+\n/g, '\n')
      .trim()
  }

  function compactImpressos(list = []) {
    if (!Array.isArray(list)) return []
    return list.map(item => ({
      idImpresso: item?.idImpresso ?? item?.id ?? null,
      tituloImpresso: item?.tituloImpresso ?? item?.titulo ?? '',
      titulo: item?.titulo ?? undefined
    }))
  }

  function prepareStationPayload(station) {
    if (!station || typeof station !== 'object') return {}

    const {
      id,
      tituloEstacao,
      titulo,
      anoEdicao,
      periodoInep,
      informacoesEssenciais,
      padraoEsperadoProcedimento,
      materiaisDisponiveis,
      materiaisImpressos,
      materiais
    } = station

    const sanitizedPep = padraoEsperadoProcedimento && typeof padraoEsperadoProcedimento === 'object'
      ? {
        tituloChecklist: padraoEsperadoProcedimento.tituloChecklist,
        observacoesGerais: padraoEsperadoProcedimento.observacoesGerais,
        itensAvaliacao: Array.isArray(padraoEsperadoProcedimento.itensAvaliacao)
          ? padraoEsperadoProcedimento.itensAvaliacao.map(item => ({
            idItem: item?.idItem ?? null,
            descricaoItem: item?.descricaoItem ?? '',
            criterios: item?.criterios ?? [],
            pontuacoes: item?.pontuacoes ?? null
          }))
          : []
      }
      : undefined

    const verbalScript = Array.isArray(materiaisDisponiveis?.informacoesVerbaisSimulado)
      ? materiaisDisponiveis.informacoesVerbaisSimulado.map(entry => ({
        contextoOuPerguntaChave: entry?.contextoOuPerguntaChave ?? '',
        informacao: entry?.informacao ?? ''
      }))
      : []

    const impressosDisponiveis = compactImpressos(materiaisDisponiveis?.impressos)
    const impressosPrincipais = compactImpressos(materiaisImpressos)
    const impressosAlternativos = compactImpressos(materiais)

    return {
      id,
      tituloEstacao,
      titulo,
      anoEdicao,
      periodoInep,
      informacoesEssenciais,
      padraoEsperadoProcedimento: sanitizedPep,
      materiaisDisponiveis: {
        informacoesVerbaisSimulado: verbalScript,
        impressos: impressosDisponiveis
      },
      materiaisImpressos: impressosPrincipais,
      materiais: impressosAlternativos
    }
  }

  function prepareConversationHistoryPayload(history) {
    if (!Array.isArray(history)) return []
    return history.map(entry => ({
      role: entry?.role ?? entry?.sender ?? 'system',
      message: stripHtml(entry?.content || entry?.message || ''),
      timestamp: entry?.timestamp ? new Date(entry.timestamp).toISOString() : undefined
    }))
  }

  const canSendMessage = computed(() =>
    currentMessage.value.trim().length > 0 &&
    !isProcessingMessage.value &&
    simulationStarted.value
  )

  function isFormalRequest(text) {
    if (!text) return false
    const normalized = text.trim().toLowerCase()
    return (
      normalized.startsWith('solicito ') ||
      normalized.startsWith('solicita ') ||
      normalized.startsWith('solicitar ') ||
      normalized.startsWith('eu quero ')
    )
  }

  function normalizeText(str = '') {
    return String(str || '')
      .toLowerCase()
      .normalize('NFD')
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

  const synonymGroups = [
    ['raio x', 'raiox', 'raio-x', 'rx', 'radiografia', 'radiografias'],
    ['torax', 'torac', 'tx', 'peito'],
    ['abdomen', 'abdomem'],
    ['tomografia', 'tc', 'tomo'],
    ['ressonancia', 'rm'],
    ['ultrassom', 'usg', 'ultrassonografia', 'ecografia'],
    ['eletrocardiograma', 'ecg'],
    ['hemograma', 'hemograma completo'],
    ['glicemia', 'glicemia capilar'],
    ['sinais vitais', 'ssvv', 'sinais'],
    ['exame fisico', 'semiologia', 'propedeutica']
  ].map(group => group.map(term => normalizeText(term)))

  function expandSynonyms(text) {
    let expanded = text
    for (const group of synonymGroups) {
      if (group.some(term => expanded.includes(term))) {
        group.forEach(term => {
          if (!expanded.includes(term)) {
            expanded += ` ${term}`
          }
        })
      }
    }
    return expanded
  }

  function tokenSet(str) {
    return new Set(str.split(' ').filter(Boolean))
  }

  function jaccardSimilarity(a, b) {
    const setA = tokenSet(a)
    const setB = tokenSet(b)
    const intersection = [...setA].filter(item => setB.has(item)).length
    const union = new Set([...setA, ...setB]).size || 1
    return intersection / union
  }

  function includesAny(text, keywords) {
    return keywords.some(keyword => text.includes(keyword))
  }

  function collectMaterialsByKeywords(materials, keywords) {
    const matches = new Set()
    materials.forEach(material => {
      const normalized = normalizeText([
        material.tituloImpresso,
        material.titulo,
        material.tipoConteudo,
        material.descricao,
        material.categoria,
        material.subcategoria,
        Array.isArray(material.palavrasChave) ? material.palavrasChave.join(' ') : '',
        material.conteudo?.texto,
        material.conteudo?.textoDescritivo,
        material.conteudo?.laudo,
      ].filter(Boolean).join(' '))

      if (keywords.some(keyword => normalized.includes(keyword))) {
        const id = material.idImpresso || material.id
        if (id) {
          matches.add(id)
        }
      }
    })
    return matches
  }

  function extractMaterialFields(material) {
    const title = normalizeText([material.tituloImpresso, material.titulo].filter(Boolean).join(' '))

    const contentParts = []
    const content = material.conteudo
    if (typeof content === 'string') {
      contentParts.push(content)
    } else if (content && typeof content === 'object') {
      Object.values(content).forEach(value => {
        if (!value) return
        if (typeof value === 'string') {
          contentParts.push(value)
        } else if (Array.isArray(value)) {
          contentParts.push(value.join(' '))
        } else if (typeof value === 'object') {
          contentParts.push(Object.values(value).join(' '))
        }
      })
    }

    const bag = normalizeText([
      material.tipoConteudo,
      material.descricao,
      material.categoria,
      material.subcategoria,
      Array.isArray(material.palavrasChave) ? material.palavrasChave.join(' ') : '',
      ...contentParts,
    ].filter(Boolean).join(' '))

    return {
      title,
      bag,
      tipo: (material.tipoConteudo || '').toLowerCase(),
    }
  }

  function findSpecificMaterial(candidateMessage, materials) {
    if (!candidateMessage || !Array.isArray(materials) || materials.length === 0) {
      return null
    }

    const request = stripRequestPrefix(candidateMessage)
    const expandedRequest = expandSynonyms(normalizeText(request))

    let bestMatch = { material: null, score: 0 }

    materials.forEach(material => {
      const { title, bag, tipo } = extractMaterialFields(material)
      if (!title && !bag) return

      const titleScore = jaccardSimilarity(expandedRequest, title)
      const bagScore = tipo.includes('imagem') ? 0 : jaccardSimilarity(expandedRequest, bag)

      let bonus = 0
      if (includesAny(title, ['raio x', 'raio-x', 'rx', 'radiografia']) &&
        includesAny(expandedRequest, ['raio x', 'raio-x', 'rx', 'radiografia'])) {
        bonus += 0.2
      }
      if (includesAny(title, ['torax', 'torac']) &&
        includesAny(expandedRequest, ['torax', 'torac'])) {
        bonus += 0.1
      }

      let score = titleScore * 0.8 + bagScore * 0.2 + bonus
      if (tipo.includes('imagem')) {
        score = titleScore + bonus
      }

      if (score > bestMatch.score) {
        bestMatch = { material, score }
      }
    })

    if (bestMatch.material && bestMatch.score >= 0.2) {
      return bestMatch.material.idImpresso || bestMatch.material.id || null
    }

    const bannedTokens = new Set(['exame', 'exames', 'fisico', 'físico', 'fisica', 'física', 'fisicos', 'físicos'])
    const requestTokens = [...tokenSet(expandedRequest)].filter(token => token.length > 2 && !bannedTokens.has(token))
    for (const material of materials) {
      const titleTokens = tokenSet(normalizeText(material.tituloImpresso || material.titulo || ''))
      if (requestTokens.some(token => titleTokens.has(token))) {
        return material.idImpresso || material.id || null
      }
    }

    return null
  }

  function handleMaterialRequest(candidateMessage) {
    if (!isFormalRequest(candidateMessage) || !stationData.value) {
      return { status: 'none' }
    }

    const materials = getAllStationMaterials()
    if (!materials.length) {
      return { status: 'not_found', message: 'Não está disponível esse exame.' }
    }

    const normalizedRequest = normalizeText(stripRequestPrefix(candidateMessage))
    const matchedIds = new Set()

    const labRequestKeywords = ['exame labor', 'exames labor', 'laborator', 'laboratorio', 'laboratoriais']
    if (labRequestKeywords.some(keyword => normalizedRequest.includes(keyword))) {
      const labMaterialKeywords = [
        'lab', 'hemograma', 'hemat', 'bioquim', 'glic', 'ureia', 'creatinina', 'gasometr',
        'coagul', 'urina', 'urinalise', 'cultura', 'paras', 'eletr', 'sodio', 'potassio',
        'colesterol', 'enzim'
      ]
      collectMaterialsByKeywords(materials, labMaterialKeywords).forEach(id => matchedIds.add(id))
    }

    if (!matchedIds.size) {
      const specificId = findSpecificMaterial(candidateMessage, materials)
      if (specificId) {
        matchedIds.add(specificId)
      }
    }

    if (matchedIds.size) {
      matchedIds.forEach(id => {
        const key = String(id)
        if (key && !releasedData.value[key]) {
          releaseMaterialById(id)
        }
      })
      return { status: 'released', message: 'Considere solicitado.' }
    }

    return { status: 'not_found', message: 'Não está disponível esse exame.' }
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

  function getAllStationMaterials() {
    const station = stationData.value
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

  async function processAIResponse(candidateMessage) {
    const materialOutcome = handleMaterialRequest(candidateMessage)
    if (materialOutcome.status === 'released' || materialOutcome.status === 'not_found') {
      return materialOutcome.message
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
          stationData: prepareStationPayload(stationData.value),
          conversationHistory: prepareConversationHistoryPayload(conversationHistory.value.slice(-10)),
        }),
      })

      if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`)

      const aiResponse = await response.json()
      let message = aiResponse?.message || ''

      if (Array.isArray(aiResponse?.materialsReleased) && aiResponse.materialsReleased.length > 0) {
        aiResponse.materialsReleased.forEach(item => {
          const materialId = item?.id || item?.idImpresso;
          if (materialId) {
            releaseMaterialById(materialId, item, 'ai')
          }
        })
      } else if (aiResponse?.releaseMaterial && aiResponse?.materialToRelease?.id) {
        releaseMaterialById(aiResponse.materialToRelease.id, aiResponse.materialToRelease, 'ai')
      }

      if (/seja mais\s+especi[fí]co/.test(message.toLowerCase())) {
        message = 'Não está disponível esse exame.'
      }

      return message || 'Não encontrei esse impresso. Pode especificar melhor?'
    } catch (error) {
      if (error.message === 'AUTHENTICATION_REQUIRED') {
        return 'Não consegui validar sua sessão. Atualize a página ou faça login novamente.'
      }
      try { const { captureSimulationError } = await import('@/plugins/sentry.js'); captureSimulationError(error, { simulationState: 'ai_response', stationId: stationData.value?.id, sessionId: conversationHistory.value?.length }) } catch (_) { }
      return 'Desculpe, estou com um problema técnico no momento. Pode repetir a pergunta?'
    }
  }
  function releaseMaterialById(materialId, materialOverride = {}, source = 'ai') {
    if (!materialId) return

    const allMaterials = getAllStationMaterials()
    let material = allMaterials.find(m => {
      const id = m?.idImpresso ?? m?.id
      return id && String(id) === String(materialId)
    })

    if (!material && materialOverride) {
      material = {
        idImpresso: materialOverride.id || materialOverride.idImpresso || materialId,
        tituloImpresso: materialOverride.tituloImpresso || materialOverride.titulo || '',
        titulo: materialOverride.titulo || undefined,
        conteudo: materialOverride.conteudo || undefined,
      }
    } else if (material && materialOverride) {
      material = { ...material, ...materialOverride }
    }

    if (!material) return

    const key = String(material?.idImpresso ?? material?.id ?? materialId)
    releasedData.value[key] = {
      ...material,
      releasedAt: new Date(),
      releasedBy: source,
    }
    conversationHistory.value.push({
      role: 'system',
      content: formatMessageText(`📄 Material liberado: ${material.tituloImpresso || material.titulo || 'Documento'}`),
      timestamp: new Date(),
    })
  }

  async function processQueuedMessage(message) {
    if (!message) return

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
      if (pendingMessages.value.length > 0) {
        const nextMessage = pendingMessages.value.shift()
        if (nextMessage) {
          setTimeout(() => {
            processQueuedMessage(nextMessage)
          }, 10)
        }
      }
    }
  }

  function sendMessage(messageOverride) {
    const rawMessage = typeof messageOverride === 'string'
      ? messageOverride
      : currentMessage.value

    const trimmedMessage = rawMessage.trim()
    if (!trimmedMessage || !simulationStarted.value) {
      return
    }

    currentMessage.value = ''

    if (isProcessingMessage.value) {
      pendingMessages.value.push(trimmedMessage)
      return
    }

    processQueuedMessage(trimmedMessage)
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
    pendingMessages,
    canSendMessage,
    sendMessage,
    handleKeyPress,
  }
}
