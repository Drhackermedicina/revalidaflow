import { ref, computed, nextTick } from 'vue'
import { currentUser } from '@/plugins/auth.js'
import { backendUrl } from '@/utils/backendUrl.js'

/**
 * @typedef {import('vue').Ref} Ref
 */

/**
 * Gerencia todo o fluxo de chat com a IA, incluindo o envio de mensagens,
 * processamento de respostas e a lógica complexa para liberação de materiais.
 * @param {{stationData: Ref<object>, simulationStarted: Ref<boolean>, speakText: (text: string) => void, scrollToBottom: () => void}} props
 */
export function useAiChat({ stationData, simulationStarted, speakText, scrollToBottom }) {
  const conversationHistory = ref([])
  const currentMessage = ref('')
  const isProcessingMessage = ref(false)
  const releasedData = ref({})
  const requestAttemptCount = ref({}); // Novo: Rastreia tentativas de solicitação por impressoId

  const canSendMessage = computed(() =>
    currentMessage.value.trim().length > 0 &&
    !isProcessingMessage.value &&
    simulationStarted.value
  )

  // Função que verifica se a mensagem do usuário é uma solicitação de material
  function isMaterialRequest(message) {
    const lowerMessage = message.toLowerCase();
    const triggerPhrases = [
        'solicito', 'solicita', 'eu quero', 'quero', 'posso ver',
        'vou solicitar', 'irei solicitar', 'vou pedir um exame'
    ];
    return triggerPhrases.some(phrase => lowerMessage.includes(phrase));
  }

  // Lógica principal para lidar com solicitações de material
  async function handleMaterialRequest(message) {
    const materials = stationData.value?.materiaisDisponiveis?.impressos || [];
    if (materials.length === 0) return;

    const { bestMatch, bestScore } = findSpecificMaterial(message, materials);

    if (!bestMatch) {
      // Se nenhum impresso corresponder, a IA pode informar que não entendeu.
      const responseText = "Não compreendi sua solicitação. Poderia especificar o exame ou material?";
      conversationHistory.value.push({
          role: 'ai_actor',
          content: responseText,
          timestamp: new Date(),
      });
      await nextTick();
      scrollToBottom();
      speakText(responseText);
      return;
    }

    const impressoId = bestMatch.idImpresso;
    const tipo = bestMatch.tipoConteudo;
    const titulo = bestMatch.tituloImpresso.toLowerCase();

    // Grupo de Liberação Imediata (Exceções)
    const immediateReleaseTitles = ['exame físico', 'sinais vitais'];
    if (tipo === 'imagem_com_texto' || immediateReleaseTitles.some(t => titulo.includes(t))) {
        releaseMaterialById(impressoId);
        return; 
    }

    // Lógica Condicional para outros tipos (principalmente 'lista_chave_valor_secoes')
    requestAttemptCount.value[impressoId] = (requestAttemptCount.value[impressoId] || 0) + 1;

    // Lógica da Segunda Tentativa
    if (requestAttemptCount.value[impressoId] > 1) {
        releaseMaterialById(impressoId);
        return;
    }

    // Lógica da Primeira Tentativa
    if (bestScore >= 0.20) {
        releaseMaterialById(impressoId);
    } else {
        let responseText = "Seja mais específico"; // Resposta padrão
        if (tipo === 'lista_chave_valor_secoes') {
            responseText = "Terminou sua solicitação?";
        }
        
        conversationHistory.value.push({
            role: 'ai_actor', // Atua como "Chefe da Estação"
            content: responseText,
            timestamp: new Date(),
        });
        await nextTick();
        scrollToBottom();
        speakText(responseText);
    }
  }

  // Função original que conversa com a IA como paciente
  async function processAIResponse(candidateMessage) {
    try {
      const response = await fetch(`${backendUrl}/ai-chat/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.value?.accessToken || ''}`,
        },
        body: JSON.stringify({
          message: candidateMessage,
          stationData: stationData.value,
          conversationHistory: conversationHistory.value.slice(-10),
        }),
      })

      if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`)

      const aiResponse = await response.json()
      return aiResponse.message
    } catch (error) {
      console.error('❌ Erro ao conectar com IA:', error)
      return 'Desculpe, estou com um problema técnico no momento. Pode repetir a pergunta?'
    }
  }

  function releaseMaterialById(materialId) {
    if (!materialId || !stationData.value) return
    const allMaterials = stationData.value.materiaisDisponiveis?.impressos || []
    const material = allMaterials.find(m => m.idImpresso === materialId)

    if (material && !releasedData.value[materialId]) {
      releasedData.value[materialId] = {
        ...material,
        releasedAt: new Date(),
        releasedBy: 'ai',
      }
      conversationHistory.value.push({
        role: 'system',
        content: `📄 Material liberado: ${material.tituloImpresso || 'Documento'}`,
        timestamp: new Date(),
      })
    }
  }

  function findSpecificMaterial(candidateMessage, materials) {
    if (!candidateMessage || !materials || materials.length === 0) {
        return { bestMatch: null, bestScore: 0 };
    }

    function extractTextFromMaterial(material) {
        let extractedText = (material.tituloImpresso || '').toLowerCase();
        if (material.conteudo) {
            if (material.tipoConteudo === 'texto_simples') {
                extractedText += ` ${material.conteudo.texto || ''}`;
            } else if (material.tipoConteudo === 'lista_chave_valor_secoes' && material.conteudo.secoes) {
                material.conteudo.secoes.forEach(secao => {
                    extractedText += ` ${secao.tituloSecao || ''}`;
                    if (secao.itens) {
                        secao.itens.forEach(item => {
                            extractedText += ` ${item.chave || ''}`;
                        });
                    }
                });
            }
        }
        return extractedText.toLowerCase().trim();
    }

    const medicalDictionary = {
        'hemograma': ['hemoglobina', 'leucócitos', 'plaquetas', 'hematócrito'],
        'radiografia': ['raio-x', 'rx'],
        'ecg': ['eletrocardiograma'],
    };

    function calculateMatchScore(request, materialText, materialTitle) {
        let score = 0;
        const requestWords = request.toLowerCase().split(/\s+/);
        const titleWords = materialTitle.toLowerCase().split(/\s+/);

        requestWords.forEach(word => {
            if (titleWords.includes(word)) {
                score += 1.0;
            }
            if (materialText.includes(word)) {
                score += 0.1;
            }
            Object.entries(medicalDictionary).forEach(([key, synonyms]) => {
                if (key === word || synonyms.includes(word)) {
                    if (materialText.includes(key) || synonyms.some(s => materialText.includes(s))) {
                        score += (key === word) ? 0.4 : 0.2;
                    }
                }
            });
        });
        return score;
    }

    let bestMatch = null;
    let bestScore = 0;

    for (const material of materials) {
        const materialText = extractTextFromMaterial(material);
        const score = calculateMatchScore(candidateMessage, materialText, material.tituloImpresso);
        if (score > bestScore) {
            bestScore = score;
            bestMatch = material;
        }
    }

    return { bestMatch, bestScore };
  }

  async function sendMessage() {
    if (!canSendMessage.value) return;

    const message = currentMessage.value.trim();
    currentMessage.value = '';
    isProcessingMessage.value = true;

    conversationHistory.value.push({
      role: 'candidate',
      content: message,
      timestamp: new Date(),
    });
    await nextTick();
    scrollToBottom();

    if (isMaterialRequest(message)) {
        await handleMaterialRequest(message);
    } else {
        try {
            const aiResponse = await processAIResponse(message);
            conversationHistory.value.push({
                role: 'ai_actor',
                content: aiResponse,
                timestamp: new Date(),
            });
            await nextTick();
            scrollToBottom();
            speakText(aiResponse);
        } catch (error) {
            conversationHistory.value.push({
                role: 'system',
                content: 'Desculpe, houve um erro. Tente novamente.',
                timestamp: new Date(),
                isError: true,
            });
            await nextTick();
            scrollToBottom();
        }
    }
    isProcessingMessage.value = false;
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