import { ref, computed, nextTick, inject } from 'vue'
import { geminiService } from '@/services/geminiService.js'

export function useMedicalChat() {
  // Estado reativo
  const messages = ref([])
  const userInput = ref('')
  const isLoading = ref(false)
  const chatContainer = ref(null)

  // Injeção do tema Vuetify
  const $vuetify = inject('$vuetify', null)
  
  // Computed para verificar se está no tema escuro
  const isDark = computed(() => {
    try {
      return $vuetify?.theme?.current?.dark ?? false
    } catch (error) {
      console.warn('Erro ao acessar tema Vuetify:', error)
      return false
    }
  })

  // Limite de mensagens para performance
  const MAX_MESSAGES = 50

  // Mensagem inicial especializada para medicina
  const initialMessage = {
    id: Date.now(),
    text: 'Olá! Sou o Gemini, seu assistente médico especializado. Tenho conhecimento atualizado até outubro de 2025, incluindo as diretrizes médicas mais recentes. Posso ajudá-lo com dúvidas sobre medicina, Revalida, estações clínicas, casos médicos e muito mais. Como posso auxiliá-lo hoje?',
    sender: 'gemini',
    timestamp: new Date(),
    type: 'medical'
  }

  // Inicializar chat
  const initializeChat = () => {
    messages.value = [initialMessage]
  }

  // Gerar ID único para mensagens
  const generateMessageId = () => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  // Limpar mensagens antigas se exceder limite
  const cleanupOldMessages = () => {
    if (messages.value.length > MAX_MESSAGES) {
      // Manter apenas as últimas 30 mensagens
      messages.value = messages.value.slice(-30)
    }
  }

  // Scroll otimizado
  const scrollToBottom = async () => {
    await nextTick()
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  }

  // Enviar mensagem com contexto médico
  const sendMessage = async () => {
    if (!userInput.value.trim() || isLoading.value) return

    const userMessage = {
      id: generateMessageId(),
      text: userInput.value.trim(),
      sender: 'user',
      timestamp: new Date(),
      type: 'user'
    }

    messages.value.push(userMessage)
    const currentInput = userInput.value.trim()
    userInput.value = ''
    isLoading.value = true

    // Limpar mensagens antigas
    cleanupOldMessages()

    try {
      // Contexto médico especializado com data atual
      const currentDate = new Date().toLocaleDateString('pt-BR')
      const medicalContext = `
Você é um assistente médico especializado para profissionais de saúde e estudantes de medicina.
Contexto: Sistema de avaliação médica Revalida - estações clínicas, casos médicos, procedimentos.

INSTRUÇÕES CRÍTICAS:
- Data atual: ${currentDate} (outubro de 2025)
- Tenha conhecimento médico atualizado até outubro de 2025
- Use diretrizes médicas mais recentes (OMS, Ministério da Saúde, sociedades médicas)
- Considere atualizações em protocolos, vacinas, medicamentos e condutas
- Forneça respostas baseadas em evidências científicas atuais
- Use terminologia médica apropriada e atual
- Foque em aspectos clínicos relevantes e contemporâneos
- Mantenha ética médica e confidencialidade
- Seja útil para preparação de exames e prática clínica moderna

IMPORTANTE SOBRE TEMPO:
- Estamos em outubro de 2025
- Considere avanços médicos recentes
- Inclua conhecimentos atualizados sobre COVID-19, novas vacinas, IA em medicina, etc.

Pergunta do usuário: ${currentInput}

Responda de forma clara, objetiva e clinicamente relevante, considerando o contexto temporal atual.
      `

      const response = await geminiService.makeRequest(currentInput, medicalContext)

      const geminiMessage = {
        id: generateMessageId(),
        text: response,
        sender: 'gemini',
        timestamp: new Date(),
        type: 'medical'
      }

      messages.value.push(geminiMessage)

    } catch (error) {
      console.error('Erro no chat médico:', error)

      const errorMessage = {
        id: generateMessageId(),
        text: 'Desculpe, estou enfrentando problemas técnicos. Como assistente médico, recomendo consultar um profissional de saúde qualificado para questões clínicas urgentes. Tente novamente em alguns instantes.',
        sender: 'gemini',
        timestamp: new Date(),
        type: 'error',
        isError: true
      }

      messages.value.push(errorMessage)
    } finally {
      isLoading.value = false
      await scrollToBottom()
    }
  }

  // Limpar chat
  const clearChat = () => {
    messages.value = [initialMessage]
    userInput.value = ''
  }

  // Manipular tecla Enter
  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      sendMessage()
    }
  }

  // Retornar estado e métodos
  return {
    // Estado
    messages,
    userInput,
    isLoading,
    chatContainer,
    isDark,

    // Métodos
    initializeChat,
    sendMessage,
    clearChat,
    handleKeyPress,
    scrollToBottom
  }
}