<template>
  <div class="ai-field-wrapper" :class="{ 'ai-processing': isProcessing }">
    <!-- Campo original com wrapper -->
    <div class="field-container">
      <slot />
      
      <!-- Botão IA integrado -->
      <button
        v-if="!isProcessing"
        @click="showAIDialog"
        class="ai-field-button"
        :class="{ 'ai-field-button--active': showDialog }"
        type="button"
        title="Correção por IA"
      >
        <v-icon size="16">mdi-robot</v-icon>
      </button>
      
      <!-- Indicador de processamento -->
      <div v-if="isProcessing" class="ai-processing-indicator">
        <v-progress-circular size="16" width="2" indeterminate color="primary" />
      </div>
    </div>

    <!-- Dialog de correção rápida -->
    <v-dialog v-model="showDialog" max-width="600" persistent>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="me-2" color="primary">mdi-robot</v-icon>
          Correção IA - {{ fieldLabel || fieldName }}
          
          <!-- Dica sobre seleção de texto -->
          <v-spacer />
          <v-tooltip bottom>
            <template v-slot:activator="{ props }">
              <v-icon v-bind="props" size="small" color="info">mdi-information</v-icon>
            </template>
            <span>💡 Dica: Selecione uma parte do texto antes de abrir este dialog para aplicar a ação apenas na parte selecionada</span>
          </v-tooltip>
        </v-card-title>
        
        <v-card-text>
          <!-- Chat livre com a IA -->
          <div class="mb-4">
            <label class="text-subtitle-2 font-weight-bold mb-2 d-block">💬 Chat Livre com IA:</label>
            <v-textarea
              v-model="freePrompt"
              label="Digite qualquer instrução para a IA"
              placeholder="Ex: 'Reescreva isso de forma mais técnica', 'Adicione mais detalhes sobre sintomas', 'Organize em lista numerada', etc."
              rows="4"
              variant="outlined"
              class="mb-2 prompt-field"
              hint="Chat completamente livre - digite o que quiser que a IA faça"
              persistent-hint
              autofocus
            />
            
            <!-- Botões de controle de prompts -->
            <div class="d-flex gap-2 mb-3">
              <v-btn
                @click="saveCurrentPrompt"
                size="small"
                color="success"
                variant="outlined"
                :disabled="!freePrompt.trim()"
              >
                <v-icon class="me-1" size="16">mdi-content-save</v-icon>
                Salvar Prompt
              </v-btn>
              
              <v-btn
                @click="showSavedPrompts = true"
                size="small"
                color="info"
                variant="outlined"
              >
                <v-icon class="me-1" size="16">mdi-folder-open</v-icon>
                Meus Prompts ({{ savedPrompts.length }})
              </v-btn>
              
              <v-btn
                @click="clearPrompt"
                size="small"
                color="warning"
                variant="outlined"
                :disabled="!freePrompt.trim()"
              >
                <v-icon class="me-1" size="16">mdi-eraser</v-icon>
                Limpar
              </v-btn>
            </div>
          </div>
          
          <!-- Conteúdo atual -->
          <div class="mb-3">
            <h4 class="text-subtitle-2 mb-2">📝 Conteúdo Atual:</h4>
            <div class="content-preview">
              {{ modelValue || '(campo vazio)' }}
            </div>
            
            <!-- Detectar texto selecionado -->
            <div v-if="selectedText" class="mt-2">
              <h5 class="text-caption text-primary">✂️ Texto Selecionado:</h5>
              <div class="selected-text-preview">
                "{{ selectedText }}"
              </div>
              <v-alert type="info" density="compact" class="mt-1">
                A ação será aplicada apenas ao texto selecionado
              </v-alert>
            </div>
          </div>
          
          <!-- Resultado da IA (se existir) -->
          <div v-if="aiSuggestion" class="mb-3">
            <label class="text-subtitle-2 font-weight-bold text-primary">✨ Sugestão da IA:</label>
            <div class="ai-suggestion">
              {{ aiSuggestion }}
            </div>
          </div>
        </v-card-text>
        
        <v-card-actions>
          <v-btn @click="closeDialog" variant="text">Cancelar</v-btn>
          
          <v-spacer />
          
          <!-- Botão gerar -->
          <v-btn
            @click="generateFreeCorrection"
            :loading="isProcessing"
            color="primary"
            :disabled="!freePrompt.trim()"
          >
            <v-icon class="me-1">mdi-auto-fix</v-icon>
            Executar Prompt
          </v-btn>
          </v-btn>
          
          <!-- Botão aplicar (só aparece se houver sugestão) -->
          <v-btn
            v-if="aiSuggestion"
            @click="applySuggestion"
            color="success"
            variant="elevated"
          >
            <v-icon class="me-1">mdi-check</v-icon>
            Aplicar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog para prompts salvos -->
    <v-dialog v-model="showSavedPrompts" max-width="700">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="me-2" color="info">mdi-folder-open</v-icon>
          Prompts Salvos
        </v-card-title>
        
        <v-card-text>
          <div v-if="savedPrompts.length === 0" class="text-center py-4">
            <v-icon size="48" color="grey" class="mb-2">mdi-text-box-outline</v-icon>
            <p class="text-grey">Nenhum prompt salvo ainda.</p>
          </div>
          
          <div v-else>
            <v-list density="compact">
              <v-list-item
                v-for="(prompt, index) in savedPrompts"
                :key="index"
                @click="loadPrompt(prompt)"
                class="mb-2"
                style="border: 1px solid rgba(var(--v-theme-outline), 0.2); border-radius: 8px;"
              >
                <template v-slot:prepend>
                  <v-icon color="primary">mdi-text-box</v-icon>
                </template>
                
                <v-list-item-title class="text-truncate">
                  {{ prompt.title || `Prompt ${index + 1}` }}
                </v-list-item-title>
                
                <v-list-item-subtitle class="text-truncate">
                  {{ prompt.content.substring(0, 50) }}...
                </v-list-item-subtitle>
                
                <template v-slot:append>
                  <v-btn
                    @click.stop="deletePrompt(index)"
                    size="small"
                    color="error"
                    variant="text"
                    icon="mdi-delete"
                  />
                </template>
              </v-list-item>
            </v-list>
          </div>
        </v-card-text>
        
        <v-card-actions>
          <v-spacer />
          <v-btn @click="showSavedPrompts = false" variant="text">Fechar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar de sucesso -->
    <v-snackbar
      v-model="showSuccess"
      color="success"
      timeout="3000"
      location="top"
    >
      ✅ Campo atualizado pela IA com sucesso!
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { geminiService } from '@/services/geminiService.js'
import { globalAIGuidelines, buildPromptWithGuidelines } from '@/services/aiGuidelines.js'

const props = defineProps({
  fieldName: String,
  fieldLabel: String,
  modelValue: [String, Number, Array],
  stationContext: [String, Object],
  stationId: String,
  itemIndex: Number // Para campos de array
})

const emit = defineEmits(['update:modelValue', 'field-updated'])

// Estado do componente
const showDialog = ref(false)
const isProcessing = ref(false)
const showSuccess = ref(false)
const freePrompt = ref('')
const aiSuggestion = ref('')
const showSavedPrompts = ref(false)
const savedPrompts = ref([])
const selectedText = ref('')

// Carregar prompts salvos do localStorage
const loadSavedPrompts = () => {
  try {
    const saved = localStorage.getItem('aiFieldAssistant_prompts')
    if (saved) {
      savedPrompts.value = JSON.parse(saved)
    }
  } catch (error) {
    console.warn('Erro ao carregar prompts salvos:', error)
  }
}

// Carregar prompts salvos ao inicializar
loadSavedPrompts()

// Função para obter ícone da ação
const getActionIcon = (actionValue) => {
  const icons = {
    split: 'mdi-call-split',
    custom: 'mdi-pencil',
    tarefas: 'mdi-clipboard-check',
    sintomas_acompanhantes: 'mdi-stethoscope',
    identificacao_paciente: 'mdi-account-card-details',
    duvidas_paciente: 'mdi-help-circle',
    orientacoes_chefe: 'mdi-school',
    infraestrutura: 'mdi-office-building',
    habitos: 'mdi-run',
    antecedentes_pessoais: 'mdi-account-heart',
    antecedentes_patologicos: 'mdi-medical-bag',
    antecedentes_familiares: 'mdi-family-tree',
    antecedentes_epidemiologicos: 'mdi-chart-line',
    descricao_caso: 'mdi-file-document'
  }
  return icons[actionValue] || 'mdi-robot'
}

// Ações rápidas (novas ações médicas específicas)
const quickActions = [
  { title: 'Desmembrar', value: 'split' },
  { title: 'Personalizado', value: 'custom' },
  { title: 'Tarefas', value: 'tarefas' },
  { title: 'Sintomas Acompanhantes', value: 'sintomas_acompanhantes' },
  { title: 'Identificação do Paciente', value: 'identificacao_paciente' },
  { title: 'Dúvidas do Paciente', value: 'duvidas_paciente' },
  { title: 'Orientações ao Chefe de Estação', value: 'orientacoes_chefe' },
  { title: 'Infraestrutura da Unidade', value: 'infraestrutura' },
  { title: 'Hábitos', value: 'habitos' },
  { title: 'Antecedentes Pessoais', value: 'antecedentes_pessoais' },
  { title: 'Antecedentes Patológicos Pessoais', value: 'antecedentes_patologicos' },
  { title: 'Antecedentes Familiares', value: 'antecedentes_familiares' },
  { title: 'Antecedentes Epidemiológicos', value: 'antecedentes_epidemiologicos' },
  { title: 'Descrição do Caso', value: 'descricao_caso' }
]

const currentValue = computed(() => {
  if (Array.isArray(props.modelValue)) {
    return props.modelValue.join('\n')
  }
  return props.modelValue || ''
})

const contextText = computed(() => {
  if (!props.stationContext) return ''
  
  if (typeof props.stationContext === 'string') {
    return props.stationContext
  } else if (typeof props.stationContext === 'object') {
    return props.stationContext.contexto_geral || 
           JSON.stringify(props.stationContext)
  }
  
  return ''
})

// Abrir dialog
const showAIDialog = () => {
  // Detectar texto selecionado antes de abrir o dialog
  detectSelectedText()
  
  showDialog.value = true
  selectedQuickAction.value = 'split' // Valor padrão: Desmembrar
  userInstruction.value = ''
  aiSuggestion.value = ''
}

// ✂️ Detectar texto selecionado no campo
const detectSelectedText = () => {
  selectedText.value = ''
  
  try {
    console.log('🔍 Tentando detectar texto selecionado...')
    
    // Tentar obter seleção atual da página
    const selection = window.getSelection()
    console.log('📋 Seleção obtida:', selection)
    console.log('📋 Texto da seleção:', selection?.toString())
    
    if (selection && selection.toString().trim()) {
      const selectedContent = selection.toString().trim()
      console.log('✂️ Conteúdo selecionado:', selectedContent)
      
      // Verificar se a seleção está dentro do campo atual
      const range = selection.getRangeAt(0)
      const container = range.commonAncestorContainer
      console.log('📦 Container:', container)
      
      // Procurar o elemento pai que contém nosso campo
      let element = container.nodeType === Node.TEXT_NODE ? container.parentNode : container
      let depth = 0
      while (element && !element.classList?.contains('ai-field-wrapper') && depth < 10) {
        console.log(`🔍 Verificando elemento (depth ${depth}):`, element.className)
        element = element.parentNode
        depth++
      }
      
      console.log('🎯 Elemento encontrado:', element)
      console.log('🎯 Tem classe ai-field-wrapper?', element?.classList?.contains('ai-field-wrapper'))
      
      // Se encontrou nosso wrapper, a seleção é válida
      if (element && element.classList.contains('ai-field-wrapper')) {
        selectedText.value = selectedContent
        console.log('✅ Texto selecionado detectado e salvo:', selectedContent)
      } else {
        console.log('❌ Seleção não está dentro do ai-field-wrapper')
      }
    } else {
      console.log('❌ Nenhum texto selecionado ou seleção vazia')
    }
  } catch (error) {
    console.warn('⚠️ Erro ao detectar texto selecionado:', error)
  }
}

// Fechar dialog
const closeDialog = () => {
  showDialog.value = false
  userInstruction.value = ''
  aiSuggestion.value = ''
  selectedText.value = '' // Limpar texto selecionado
}

// Salvar prompt personalizado
const savePrompt = () => {
  if (!customPrompt.value.trim()) return
  
  const promptTitle = prompt('Digite um nome para este prompt (opcional):') || `Prompt ${savedPrompts.value.length + 1}`
  
  const newPrompt = {
    title: promptTitle,
    content: customPrompt.value.trim(),
    createdAt: new Date().toISOString(),
    fieldName: props.fieldName
  }
  
  savedPrompts.value.push(newPrompt)
  
  // Salvar no localStorage
  localStorage.setItem('aiFieldAssistant_prompts', JSON.stringify(savedPrompts.value))
  
  // Mostrar confirmação
  alert('Prompt salvo com sucesso!')
}

// Carregar prompt salvo
const loadPrompt = (prompt) => {
  customPrompt.value = prompt.content
  selectedQuickAction.value = 'custom'
  showSavedPrompts.value = false
  
  // Mostrar confirmação
  alert(`Prompt "${prompt.title}" carregado com sucesso!`)
}

// Deletar prompt salvo
const deletePrompt = (index) => {
  if (confirm('Tem certeza que deseja deletar este prompt?')) {
    savedPrompts.value.splice(index, 1)
    localStorage.setItem('aiFieldAssistant_prompts', JSON.stringify(savedPrompts.value))
  }
}

// Gerar correção
const generateCorrection = async () => {
  console.log('🚀 INÍCIO generateCorrection()')
  console.log('📊 Estado atual:', {
    currentValue: currentValue.value,
    selectedText: selectedText.value,
    selectedQuickAction: selectedQuickAction.value,
    userInstruction: userInstruction.value
  })
  
  if (!currentValue.value && !selectedText.value) {
    console.log('❌ Campo vazio, abortar')
    alert('Campo está vazio. Adicione algum conteúdo primeiro.')
    return
  }

  if (selectedQuickAction.value === 'custom' && !customPrompt.value.trim()) {
    console.log('❌ Prompt personalizado vazio, abortar')
    alert('Por favor, digite um prompt personalizado no campo acima.')
    return
  }

  console.log('✅ Validações passaram, iniciando processamento...')
  isProcessing.value = true
  
  try {
    console.log('🤖 Gerando correção...')
    console.log('📝 Campo:', props.fieldName)
    console.log('🎯 Ação:', selectedQuickAction.value)
    console.log('💭 Prompt custom:', customPrompt.value)
    console.log('📄 Conteúdo:', currentValue.value)
    console.log('✂️ Texto selecionado:', selectedText.value)
    console.log('🏥 Contexto da estação:', contextText.value)
    
    const prompt = buildCorrectionPrompt()
    console.log('📝 Prompt construído:', prompt)
    
    let response
    if (props.itemIndex !== undefined) {
      // Para itens de array
      response = await geminiService.correctArrayItem(
        props.fieldName, 
        props.itemIndex, 
        selectedText.value || currentValue.value, // 🎯 Usar texto selecionado se disponível
        selectedQuickAction.value === 'custom' ? userInstruction.value : selectedQuickAction.value,
        contextText.value
      )
    } else {
      // Para campos simples
      response = await geminiService.correctField(
        props.fieldName,
        selectedText.value || currentValue.value, // 🎯 Usar texto selecionado se disponível
        selectedQuickAction.value === 'custom' ? userInstruction.value : selectedQuickAction.value,
        contextText.value
      )
    }
    
    console.log('📨 Resposta recebida:', response)
    
    if (response) {
      let cleanResponse = response.trim()
      console.log('✅ Sugestão processada:', cleanResponse)
      
      // 🎯 Se havia texto selecionado, processar de forma especial
      if (selectedText.value && selectedQuickAction.value === 'split') {
        console.log('✂️ Modo desmembramento ativo: substituir texto selecionado')
        
        // 🔍 VALIDAR se a resposta está no formato correto
        const isCorrectFormat = cleanResponse.includes(':') && cleanResponse.includes('"')
        console.log('🔍 Formato correto detectado:', isCorrectFormat)
        
        if (!isCorrectFormat) {
          console.log('⚠️ Formato incorreto! Tentando forçar formato...')
          // Sistema de backup inteligente que detecta conceitos automaticamente
          const originalText = selectedText.value.toLowerCase()
          const formattedLines = []
          
          // 🧠 DETECÇÃO INTELIGENTE DE CONCEITOS
          
          // 1. NÁUSEAS E VÔMITOS
          if (originalText.includes('náuseas') && originalText.includes('vômitos')) {
            formattedLines.push('Náuseas: "Relata náuseas"')
            formattedLines.push('Vômitos: "Relata vômitos"')
          }
          // 2. ALTERAÇÃO DO ESTADO MENTAL (múltiplos conceitos)
          else if (originalText.includes('confus') && originalText.includes('concentr') && originalText.includes('sonol')) {
            formattedLines.push('Confusão mental: "Sim, estou confuso"')
            formattedLines.push('Concentração: "Tenho dificuldade para me concentrar, não consigo pensar direito"')
            formattedLines.push('Sonolência: "Estou mais sonolento que o normal"')
          }
          // 3. HÁBITOS (tabagismo, etilismo, drogas)
          else if (originalText.includes('hábitos') || (originalText.includes('fuma') && originalText.includes('bebe'))) {
            if (originalText.includes('fuma')) formattedLines.push('Tabagismo: "Conforme descrito"')
            if (originalText.includes('bebe') || originalText.includes('álcool')) formattedLines.push('Etilismo: "Conforme descrito"')
            if (originalText.includes('droga')) formattedLines.push('Drogas ilícitas: "Conforme descrito"')
          }
          // 4. DETECÇÃO GENÉRICA (usar palavras-chave conectoras)
          else {
            // Buscar por conectores comuns que indicam múltiplos conceitos
            const connectors = [' e ', ' ou ', ' além de ', ' também ', ', ']
            let hasMultipleConcepts = false
            
            for (const connector of connectors) {
              if (originalText.includes(connector)) {
                hasMultipleConcepts = true
                break
              }
            }
            
            if (hasMultipleConcepts) {
              // Tentar separar por conectores mais comuns
              const parts = selectedText.value.split(/\s+e\s+|\s+ou\s+|,\s+/)
              for (let i = 0; i < parts.length && i < 5; i++) { // Máximo 5 conceitos
                const part = parts[i].trim()
                if (part && part.length > 3) {
                  const conceptName = `Conceito ${i + 1}`
                  formattedLines.push(`${conceptName}: "${part}"`)
                }
              }
            } else {
              // Caso simples: um conceito apenas
              const lines = cleanResponse.split('\n').filter(line => line.trim())
              for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim()
                if (line && !line.includes(':')) {
                  formattedLines.push(`Sintoma: "${line}"`)
                } else {
                  formattedLines.push(line)
                }
              }
            }
          }
          
          cleanResponse = formattedLines.join('\n')
          console.log('🔧 Resposta reformatada:', cleanResponse)
        }
        
        const originalContent = currentValue.value
        const selectedContent = selectedText.value
        
        console.log('🔄 Conteúdo original:', originalContent)
        console.log('✂️ Texto selecionado:', selectedContent)
        console.log('🆕 Desmembramento recebido:', cleanResponse)
        
        // 🎯 SUBSTITUIR diretamente o texto selecionado pelo desmembramento
        const updatedContent = originalContent.replace(selectedContent, cleanResponse)
        aiSuggestion.value = updatedContent
        
        console.log('✅ Resultado final:', updatedContent)
      } else {
        // Comportamento normal para outras ações
        aiSuggestion.value = cleanResponse
      }
    } else {
      console.warn('⚠️ Resposta vazia do serviço Gemini')
      alert('Não foi possível gerar uma sugestão. Tente novamente.')
    }
  } catch (error) {
    console.error('❌ Erro ao gerar correção:', error)
    console.error('❌ Stack trace:', error.stack)
    console.error('❌ Detalhes do erro:', {
      message: error.message,
      name: error.name,
      cause: error.cause
    })
    
    let errorMessage = 'Erro desconhecido'
    if (error.message) {
      errorMessage = error.message
    } else if (typeof error === 'string') {
      errorMessage = error
    } else if (error.toString) {
      errorMessage = error.toString()
    }
    
    alert('Erro ao gerar correção: ' + errorMessage)
  } finally {
    isProcessing.value = false
  }
}

// Aplicar sugestão
const applySuggestion = async () => {
  if (!aiSuggestion.value) return
  
  try {
    // Emitir atualização
    emit('update:modelValue', aiSuggestion.value)
    emit('field-updated', {
      field: props.fieldName,
      value: aiSuggestion.value,
      index: props.itemIndex,
      original: currentValue.value
    })

    // Fechar dialog
    showSuccess.value = true
    closeDialog()
    
    console.log('✅ Sugestão aplicada com sucesso:', aiSuggestion.value)
  } catch (error) {
    console.error('❌ Erro ao aplicar sugestão:', error)
    alert('Erro ao aplicar a sugestão.')
  }
}

const buildCorrectionPrompt = () => {
  // 🎯 PROMPT ESPECIAL PARA DESMEMBRAMENTO COM SELEÇÃO
  if (selectedQuickAction.value === 'split' && selectedText.value) {
    return `
TAREFA: DESMEMBRAMENTO INTELIGENTE DE SINTOMAS MÉDICOS

TEXTO A PROCESSAR:
${selectedText.value}

INSTRUÇÃO:
Analise o texto e identifique CADA conceito médico individual (sintomas, condições, hábitos).
Para CADA conceito encontrado, crie UMA linha no formato: "Conceito: descrição"

REGRAS:
1. Use nomenclatura médica específica (ex: "Náuseas" e "Vômitos" separados)
2. Formato obrigatório: [Sintoma]: "[Descrição]"  
3. Não repita palavras entre o termo e a descrição
4. Se houver múltiplos conceitos em uma frase, separe todos

EXEMPLOS:

ENTRADA: "Náuseas e Vômitos: Paciente relata ambos desde ontem"
SAÍDA:
Náuseas: "Relata desde ontem"
Vômitos: "Relata desde ontem"

ENTRADA: "Alteração do estado mental: Confusão, dificuldade de concentração e sonolência"
SAÍDA:
Confusão mental: "Sim, estou confuso"
Concentração: "Tenho dificuldade para me concentrar"
Sonolência: "Estou sonolento"

ENTRADA: "Hábitos: Fuma 1 maço/dia, bebe socialmente, nega drogas"
SAÍDA:
Tabagismo: "Fuma 1 maço por dia"
Etilismo: "Bebe socialmente"
Drogas ilícitas: "Nega uso"

PROCESSE O TEXTO ACIMA E RETORNE APENAS AS LINHAS NO FORMATO CORRETO:
`
  }
  
  // PROMPT NORMAL PARA OUTRAS AÇÕES
  const actionPrompts = {
    improve: 'COMO ESPECIALISTA MÉDICO, melhore este texto clínico tornando-o mais preciso, profissional e adequado para uma estação de exame médico. Mantenha a terminologia médica correta e a estrutura clínica apropriada.',
    expand: 'COMO PROFESSOR DE MEDICINA, expanda este conteúdo clínico adicionando detalhes relevantes, informações complementares e contexto médico apropriado. Mantenha o foco na formação médica.',
    grammar: 'COMO EDITOR MÉDICO, corrija toda a gramática, ortografia, pontuação e estilo deste texto médico. Garanta que esteja adequado para documentação médica profissional.',
    organize: 'COMO ORGANIZADOR DE CONTEÚDO MÉDICO, reestruture este texto em formato clínico organizado, com seções claras, hierarquia de informações e fluxo lógico médico.',
    split: 'COMO ANALISTA CLÍNICO, desmembre este conteúdo médico em componentes individuais. Separe cada sintoma, sinal, diagnóstico ou conceito em uma linha própria com sua descrição específica.',
    custom: customPrompt.value || userInstruction.value || 'Como especialista médico, processe este conteúdo clínico conforme solicitado.',
    
    // Novos prompts específicos
    tarefas: 'COMO COORDENADOR MÉDICO, organize este conteúdo em uma lista clara de tarefas e responsabilidades médicas. Estruture as informações de forma que facilite o acompanhamento e execução das atividades clínicas.',
    sintomas_acompanhantes: 'COMO CLÍNICO EXPERIENTE, identifique e organize os sintomas acompanhantes relacionados ao quadro clínico principal. Liste cada sintoma com sua intensidade, frequência e relação com o sintoma principal.',
    identificacao_paciente: 'COMO MÉDICO RESPONSÁVEL, organize as informações de identificação do paciente seguindo os padrões médicos brasileiros. Inclua dados demográficos, identificação e informações relevantes para o atendimento.',
    duvidas_paciente: 'COMO EDUCADOR EM SAÚDE, organize as dúvidas do paciente de forma clara e didática. Estruture as respostas de maneira compreensível, usando linguagem acessível mas mantendo a precisão médica.',
    orientacoes_chefe: 'COMO SUPERVISOR MÉDICO, elabore orientações claras e objetivas para o chefe de estação. Foque em aspectos pedagógicos, segurança do paciente e qualidade do atendimento.',
    infraestrutura: 'COMO GESTOR HOSPITALAR, avalie e organize as informações sobre infraestrutura da unidade. Considere aspectos de equipamentos, recursos humanos, espaço físico e condições de trabalho.',
    habitos: 'COMO ESPECIALISTA EM MEDICINA PREVENTIVA, organize os hábitos do paciente de forma sistemática. Inclua tabagismo, etilismo, atividade física, alimentação e outros fatores de risco.',
    antecedentes_pessoais: 'COMO CLÍNICO GERAL, organize os antecedentes pessoais do paciente seguindo a classificação médica padrão. Estruture por sistemas e inclua datas, evoluções e tratamentos relevantes.',
    antecedentes_patologicos: 'COMO INTERNISTA, organize os antecedentes patológicos pessoais do paciente. Foque nas doenças crônicas, cirurgias, internações e tratamentos relevantes para o quadro atual.',
    antecedentes_familiares: 'COMO GENETICISTA CLÍNICO, organize os antecedentes familiares relevantes. Inclua doenças hereditárias, neoplasias, doenças cardiovasculares e outros fatores de risco genético.',
    antecedentes_epidemiologicos: 'COMO EPIDEMIOLOGISTA, organize os antecedentes epidemiológicos relevantes. Considere fatores de risco populacionais, exposição a agentes infecciosos e contexto epidemiológico.',
    descricao_caso: 'COMO PROFESSOR DE MEDICINA, elabore uma descrição completa e didática do caso clínico. OBRIGATÓRIO: REMOVER TODOS OS DADOS DE IDENTIFICAÇÃO (nome, idade, sexo, procedência, ocupação, estado civil, religião). Estruture seguindo o formato médico padrão ANÔNIMO: história, exame físico, exames complementares e evolução. Use apenas termos genéricos como "paciente", "responsável", "criança", "lactente" SEM especificar dados pessoais.'
  }
  
  const instruction = actionPrompts[selectedQuickAction.value]
  
  // Determinar o conteúdo a ser processado
  const contentToProcess = selectedText.value || currentValue.value || 'Vazio'
  const processingNote = selectedText.value 
    ? `\n\n🎯 IMPORTANTE: Retorne APENAS o desmembramento do texto selecionado abaixo. NÃO inclua o resto do conteúdo.\n\n✂️ TEXTO PARA DESMEMBRAR:\n${selectedText.value}\n\n📋 CONTEXTO (apenas para referência, NÃO incluir na resposta):\n${currentValue.value}`
    : `\n\nCONTEÚDO ATUAL:\n${contentToProcess}`
  
  return `
VOCÊ É UM ESPECIALISTA MÉDICO SÊNIOR COM 20+ ANOS DE EXPERIÊNCIA EM MEDICINA CLÍNICA E EDUCAÇÃO MÉDICA.

TAREFA: ${instruction}

CONTEXTO DA ESTAÇÃO CLÍNICA:
${contextText.value || 'Estação clínica para exame médico brasileiro'}

CAMPO MÉDICO: ${props.fieldLabel || props.fieldName}
${props.itemIndex !== undefined ? `(Item ${props.itemIndex + 1} da lista clínica)` : ''}
${processingNote}

PROTOCOLO MÉDICO OBRIGATÓRIO:
1. ✅ Mantenha rigorosamente a terminologia médica brasileira
2. ✅ Use linguagem técnica apropriada para profissionais médicos
3. ✅ Garanta precisão clínica e relevância médica
4. ✅ Preserve a estrutura e formato adequados para o campo médico
${selectedText.value ? '5. 🎯 CRÍTICO: Processe APENAS o texto selecionado, retornando apenas o resultado processado' : '5. ✅ Processe todo o conteúdo fornecido mantendo a integridade médica'}
6. ✅ Forneça apenas o conteúdo médico final, sem metadados ou explicações
${selectedText.value ? '7. 📝 Para desmembramento: Uma linha por conceito no formato "Sintoma: descrição"\n8. ❌ Não inclua o texto original não processado' : ''}
9. 🚫 CRÍTICO: Se o campo for "Descrição do Caso", REMOVER OBRIGATORIAMENTE todos os dados de identificação: nomes próprios, idades específicas, sexo, procedência, ocupação, estado civil, religião. Use apenas termos genéricos como "paciente", "responsável", "lactente", "criança".
10. ✅ VERIFICAÇÃO FINAL: Releia o resultado e confirme que não há dados pessoais identificáveis.

RESULTADO MÉDICO FINAL:
`
}
</script>

<style scoped>
.content-preview {
  background: rgba(var(--v-theme-surface-variant), 0.3);
  border: 1px solid rgba(var(--v-theme-outline), 0.2);
  border-radius: 6px;
  padding: 12px;
  max-height: 120px;
  overflow-y: auto;
  font-family: monospace;
  font-size: 0.875rem;
  line-height: 1.4;
  white-space: pre-wrap;
}

.ai-suggestion {
  background: rgba(var(--v-theme-primary), 0.1);
  border: 1px solid rgba(var(--v-theme-primary), 0.2);
  border-radius: 6px;
  padding: 12px;
  max-height: 120px;
  overflow-y: auto;
  font-family: monospace;
  font-size: 0.875rem;
  line-height: 1.4;
  white-space: pre-wrap;
}

.ai-processing {
  opacity: 0.7;
}

/* Ajustes para diferentes tipos de campo */
.ai-field-wrapper :deep(textarea),
.ai-field-wrapper :deep(input) {
  padding-right: 52px !important;
}

.ai-field-wrapper :deep(.v-field__field) {
  padding-right: 52px !important;
}

.ai-field-wrapper :deep(.v-input__control) {
  position: relative;
}

.ai-field-wrapper :deep(.v-field__input) {
  padding-right: 52px !important;
}

.field-container {
  position: relative;
  width: 100%;
}

.ai-field-button {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 36px;
  height: 36px;
  border: 3px solid rgb(var(--v-theme-primary));
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  z-index: 1001;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);
  font-size: 18px;
}

.ai-field-button:hover {
  background: linear-gradient(135deg, #5a67d8 0%, #667eea 100%);
  color: white;
  transform: scale(1.1);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
  border-color: #fff;
}

.ai-field-button--active {
  background: rgb(var(--v-theme-primary));
  color: white;
}

.ai-processing-indicator {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--v-theme-surface), 0.9);
  border-radius: 6px;
  z-index: 10;
}

/* Garantir que o wrapper seja relativo */
.ai-field-wrapper {
  position: relative !important;
}

.ai-field-wrapper .field-container {
  position: relative !important;
}

/* ✂️ Estilos para texto selecionado */
.selected-text-preview {
  background: rgba(var(--v-theme-info), 0.1);
  border: 1px solid rgba(var(--v-theme-info), 0.3);
  border-radius: 6px;
  padding: 8px 12px;
  font-family: 'Roboto Mono', monospace;
  font-size: 0.875rem;
  color: rgba(var(--v-theme-info), 1);
  margin-top: 4px;
  line-height: 1.4;
  word-break: break-word;
}

/* Melhorar a visualização da seleção */
.ai-field-wrapper textarea::selection,
.ai-field-wrapper input::selection {
  background: rgba(var(--v-theme-primary), 0.3);
  color: inherit;
}

/* Estilo para o select de ações */
.action-select :deep(.v-field) {
  border-radius: 8px;
}

.action-select :deep(.v-field__input) {
  font-weight: 500;
}

/* Estilo para o campo de prompt personalizado */
.prompt-field :deep(.v-field) {
  border-radius: 8px;
}

.prompt-field :deep(.v-field__input) {
  font-family: 'Roboto', sans-serif;
}
</style>
