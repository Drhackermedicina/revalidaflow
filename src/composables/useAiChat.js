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

  const titleStopWords = new Set(['exame', 'exames'])
  const tokenAliases = new Map([
    ['laboratorio', 'laboratoriais'],
    ['laboratorios', 'laboratoriais'],
    ['laboratorial', 'laboratoriais'],
    ['laboratoria', 'laboratoriais'],
    ['laboratoriais', 'laboratoriais'],
  ])

  function applyAliasesToString(text = '') {
    const normalized = normalizeText(text)
    if (!normalized) return ''
    return normalized
      .split(' ')
      .map(token => tokenAliases.get(token) || token)
      .join(' ')
      .trim()
  }

  function tokenizeForMatching(text = '') {
    return applyAliasesToString(text)
      .split(' ')
      .filter(token => token && token.length > 1 && !titleStopWords.has(token))
  }

  function normalizedStringWithoutStops(text = '') {
    return tokenizeForMatching(text).join(' ').trim()
  }

  function buildTokenMatchInfo(message, title) {
    const normalizedMessage = applyAliasesToString(message)
    const normalizedTitle = applyAliasesToString(title)
    if (!normalizedTitle) {
      return { tokens: [], matches: 0, ratio: 0, consecutiveHit: false, literalHit: false }
    }

    const messageNoStops = normalizedStringWithoutStops(normalizedMessage)
    const titleNoStops = normalizedStringWithoutStops(normalizedTitle)

    const literalHit = Boolean(titleNoStops && messageNoStops.includes(titleNoStops))

    const titleTokens = tokenizeForMatching(normalizedTitle)
    const messageTokensSet = new Set(tokenizeForMatching(normalizedMessage))
    const matches = titleTokens.filter(token => messageTokensSet.has(token))
    const ratio = titleTokens.length ? matches.length / titleTokens.length : 0

    let consecutiveHit = false
    if (titleTokens.length >= 2) {
      for (let i = 0; i < titleTokens.length - 1; i++) {
        const phrase = `${titleTokens[i]} ${titleTokens[i + 1]}`
        if (messageNoStops.includes(phrase)) {
          consecutiveHit = true
          break
        }
      }
    }

    return {
      tokens: titleTokens,
      matches: matches.length,
      ratio,
      consecutiveHit,
      literalHit,
    }
  }

  function doesRequestMatchMaterialTitle(message, material) {
    const title = material?.tituloImpresso || material?.titulo || ''
    if (!title) return { matched: false, score: 0 }

    const { tokens, matches, ratio, consecutiveHit, literalHit } = buildTokenMatchInfo(message, title)
    if (!tokens.length) {
      return { matched: false, score: 0 }
    }

    if (literalHit) {
      return { matched: true, score: 1 }
    }

    const tokenThreshold = tokens.length <= 2 ? tokens.length : Math.max(2, Math.ceil(tokens.length * 0.6))
    const matchedByTokens = matches >= tokenThreshold
    const matchedWithConsecutive = consecutiveHit && matches >= 2

    const matched = matchedByTokens || matchedWithConsecutive
    const score = Math.max(ratio, matches / tokens.length)

    return { matched, score }
  }

  function handleMaterialRequest(candidateMessage) {
    if (!isFormalRequest(candidateMessage) || !stationData.value) {
      return { status: 'none' }
    }

    const materials = getAllStationMaterials()
    if (!materials.length) {
      return { status: 'not_found', message: 'Não está disponível esse impresso.' }
    }

    const cleanedMessage = stripRequestPrefix(candidateMessage)
    const matchedMaterials = []

    materials.forEach(material => {
      const { matched, score } = doesRequestMatchMaterialTitle(cleanedMessage, material)
      if (matched) {
        matchedMaterials.push({ material, score })
      }
    })

    if (!matchedMaterials.length) {
      return { status: 'not_found', message: 'Não está disponível esse impresso.' }
    }

    matchedMaterials
      .sort((a, b) => b.score - a.score)
      .forEach(({ material }) => {
        const key = String(material.idImpresso || material.id)
        if (key && !releasedData.value[key]) {
          releaseMaterialById(material.idImpresso || material.id, material)
        }
      })

    const titles = [...new Set(matchedMaterials.map(({ material }) => material.tituloImpresso || material.titulo || 'Impresso'))]
    const response = titles.length === 1
      ? `${titles[0]} liberado.`
      : `${titles.join(', ')} liberados.`

    return { status: 'released', message: response }
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
