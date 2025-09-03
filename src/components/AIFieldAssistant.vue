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
        </v-card-title>
        
        <v-card-text>
          <!-- Ações rápidas -->
          <v-chip-group v-model="selectedQuickAction" class="mb-3" mandatory>
            <v-chip 
              v-for="action in quickActions" 
              :key="action.value"
              :value="action.value"
              size="small"
            >
              {{ action.title }}
            </v-chip>
          </v-chip-group>

          <!-- Input para instrução personalizada -->
          <v-textarea
            v-if="selectedQuickAction === 'custom'"
            v-model="userInstruction"
            label="Sua instrução personalizada"
            placeholder="Ex: 'Organize em tópicos', 'Corrija a gramática', 'Seja mais específico'"
            rows="2"
            variant="outlined"
            class="mb-4"
          />
          
          <!-- Valor atual -->
          <div class="mb-3">
            <label class="text-subtitle-2 font-weight-bold">📄 Conteúdo Atual:</label>
            <div class="current-content">
              {{ currentValue || 'Vazio' }}
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
            v-if="!aiSuggestion"
            @click="generateCorrection"
            :loading="isProcessing"
            color="primary"
            variant="elevated"
          >
            <v-icon class="me-1">mdi-auto-fix</v-icon>
            Gerar Correção
          </v-btn>
          
          <!-- Botões aplicar/nova correção -->
          <template v-else>
            <v-btn
              @click="generateCorrection"
              :loading="isProcessing"
              color="secondary"
              variant="outlined"
            >
              Nova Correção
            </v-btn>
            <v-btn
              @click="applySuggestion"
              color="success"
              variant="elevated"
            >
              <v-icon class="me-1">mdi-check</v-icon>
              Aplicar Agora
            </v-btn>
          </template>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Notificação de sucesso -->
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
import memoryService from '@/services/memoryService.js'

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
const selectedQuickAction = ref('improve')
const userInstruction = ref('')
const aiSuggestion = ref('')

// Ações rápidas
const quickActions = [
  { title: 'Melhorar', value: 'improve' },
  { title: 'Expandir', value: 'expand' },
  { title: 'Corrigir', value: 'grammar' },
  { title: 'Organizar', value: 'organize' },
  { title: 'Personalizado', value: 'custom' }
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
  showDialog.value = true
  selectedQuickAction.value = 'improve'
  userInstruction.value = ''
  aiSuggestion.value = ''
}

// Fechar dialog
const closeDialog = () => {
  showDialog.value = false
  userInstruction.value = ''
  aiSuggestion.value = ''
}

// Gerar correção
const generateCorrection = async () => {
  isProcessing.value = true
  
  try {
    const prompt = buildCorrectionPrompt()
    console.log('🤖 Gerando correção integrada para campo:', props.fieldName)
    console.log('📝 Prompt enviado:', prompt)
    
    // 🔧 CORREÇÃO: Usar método correto do geminiService
    let response
    if (props.itemIndex !== undefined) {
      // Para itens de array
      response = await geminiService.correctArrayItem(
        props.fieldName, 
        props.itemIndex, 
        currentValue.value, 
        selectedQuickAction.value === 'custom' ? userInstruction.value : selectedQuickAction.value,
        contextText.value
      )
    } else {
      // Para campos simples
      response = await geminiService.correctField(
        props.fieldName,
        currentValue.value,
        selectedQuickAction.value === 'custom' ? userInstruction.value : selectedQuickAction.value,
        contextText.value
      )
    }
    
    console.log('📨 Resposta recebida:', response)
    
    if (response) {
      aiSuggestion.value = response.trim()
      console.log('✅ Sugestão processada:', response.trim())
      
      // REMOVIDO: Não salvar aqui, apenas quando aplicar
      // await saveToMemory()
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

// Aplicar sugestão DIRETAMENTE
const applySuggestion = () => {
  if (!aiSuggestion.value) return
  
  console.log('✅ Aplicando correção IA integrada:', {
    field: props.fieldName,
    newValue: aiSuggestion.value.substring(0, 100) + '...',
    itemIndex: props.itemIndex
  })
  
  // 🔧 APLICAÇÃO DIRETA: Atualizar o v-model
  emit('update:modelValue', aiSuggestion.value)
  
  // Emitir evento para notificar o componente pai
  emit('field-updated', {
    field: props.fieldName,
    value: aiSuggestion.value,
    index: props.itemIndex,
    original: currentValue.value
  })
  
  // 🔧 AGORA SIM: Salvar na memória apenas quando aplicar
  saveToMemory()
  
  // Mostrar sucesso
  showSuccess.value = true
  closeDialog()
}

// Construir prompt baseado na ação selecionada
const buildCorrectionPrompt = () => {
  const actionPrompts = {
    improve: 'Melhore e aperfeiçoe este conteúdo médico, tornando-o mais claro e preciso',
    expand: 'Expanda e detalhe este conteúdo médico, adicionando informações relevantes',
    grammar: 'Corrija a gramática, ortografia e pontuação deste texto médico',
    organize: 'Organize este conteúdo médico de forma mais estruturada e didática',
    custom: userInstruction.value || 'Melhore este conteúdo médico'
  }
  
  const instruction = actionPrompts[selectedQuickAction.value]
  
  return `
Você é um especialista em criar estações clínicas para exames médicos.

INSTRUÇÃO: ${instruction}

CONTEXTO DA ESTAÇÃO:
${contextText.value || 'Estação clínica médica'}

CAMPO: ${props.fieldLabel || props.fieldName}
${props.itemIndex !== undefined ? `(Item ${props.itemIndex + 1} de uma lista)` : ''}

CONTEÚDO ATUAL:
${currentValue.value || 'Vazio'}

REGRAS IMPORTANTES:
1. Mantenha o conteúdo médico tecnicamente correto
2. Use linguagem clara e objetiva
3. Seja específico e detalhado quando apropriado
4. Mantenha a formatação apropriada para o tipo de campo
5. Retorne APENAS o conteúdo corrigido/melhorado, sem explicações ou comentários

CONTEÚDO CORRIGIDO:
`
}

// Salvar na memória
const saveToMemory = async () => {
  if (!props.stationId) return
  
  try {
    const actionTitles = {
      improve: 'Melhoria',
      expand: 'Expansão',
      grammar: 'Correção',
      organize: 'Organização',
      custom: 'Personalizado'
    }
    
    await memoryService.savePrompt(props.stationId, {
      fieldName: props.fieldName,
      itemIndex: props.itemIndex,
      title: `${actionTitles[selectedQuickAction.value]} - ${props.fieldLabel || props.fieldName}`,
      userRequest: selectedQuickAction.value === 'custom' ? userInstruction.value : actionTitles[selectedQuickAction.value],
      originalValue: currentValue.value,
      correctedValue: aiSuggestion.value
    })
    
    console.log('💾 Correção salva na memória')
  } catch (error) {
    console.warn('⚠️ Erro ao salvar na memória:', error)
  }
}
</script>

<style scoped>
.ai-field-wrapper {
  position: relative;
  display: inline-block;
  width: 100%;
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

.current-content {
  background: rgba(var(--v-theme-warning), 0.1);
  border: 1px solid rgba(var(--v-theme-warning), 0.3);
  border-radius: 4px;
  padding: 12px;
  max-height: 120px;
  overflow-y: auto;
  font-family: monospace;
  font-size: 0.875rem;
  line-height: 1.4;
  white-space: pre-wrap;
}

.ai-suggestion {
  background: rgba(var(--v-theme-success), 0.1);
  border: 1px solid rgba(var(--v-theme-success), 0.3);
  border-radius: 4px;
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

/* Garantir que o wrapper seja relativo */
.ai-field-wrapper {
  position: relative !important;
}

.ai-field-wrapper .field-container {
  position: relative !important;
}
</style>
