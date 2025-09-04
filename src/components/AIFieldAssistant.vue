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
        title="Chat IA Livre"
      >
        <v-icon size="16">mdi-robot</v-icon>
      </button>
      
      <!-- Indicador de processamento -->
      <div v-if="isProcessing" class="ai-processing-indicator">
        <v-progress-circular size="16" width="2" indeterminate color="primary" />
      </div>
    </div>

    <!-- Dialog de chat livre -->
    <v-dialog v-model="showDialog" max-width="700" persistent>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="me-2" color="primary">mdi-robot</v-icon>
          Chat IA Livre - {{ fieldLabel || fieldName }}
          
          <v-spacer />
          <v-tooltip bottom>
            <template v-slot:activator="{ props }">
              <v-icon v-bind="props" size="small" color="info">mdi-information</v-icon>
            </template>
            <span>💡 Dica: Selecione uma parte do texto antes de abrir para trabalhar apenas com a seleção</span>
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
            
            <!-- Botões para aplicar sugestão -->
            <div class="mt-2">
              <v-btn
                @click="applySuggestion"
                color="success"
                size="small"
                variant="outlined"
              >
                <v-icon class="me-1" size="16">mdi-check</v-icon>
                Aplicar Sugestão
              </v-btn>
            </div>
          </div>
        </v-card-text>
        
        <v-card-actions>
          <v-btn @click="closeDialog" variant="text">Cancelar</v-btn>
          
          <v-spacer />
          
          <!-- Botão executar -->
          <v-btn
            @click="generateFreeCorrection"
            :loading="isProcessing"
            color="primary"
            :disabled="!freePrompt.trim()"
          >
            <v-icon class="me-1">mdi-auto-fix</v-icon>
            Executar Prompt
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog para prompts salvos -->
    <v-dialog v-model="showSavedPrompts" max-width="700">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="me-2" color="info">mdi-folder-open</v-icon>
          Meus Prompts Salvos
        </v-card-title>
        
        <v-card-text>
          <div v-if="savedPrompts.length === 0" class="text-center py-4">
            <v-icon size="48" color="grey" class="mb-2">mdi-text-box-outline</v-icon>
            <p class="text-grey">Nenhum prompt salvo ainda.</p>
            <p class="text-caption">Crie prompts personalizados e salve para reutilizar!</p>
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
                  {{ prompt.content.substring(0, 80) }}...
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
          <v-btn @click="showSavedPrompts = false" variant="text">Fechar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar de sucesso -->
    <v-snackbar v-model="showSuccess" color="success" timeout="3000">
      ✅ Campo atualizado com sucesso!
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, computed, watch, inject, onMounted } from 'vue'
import geminiService from '@/services/geminiService.js'

// Props
const props = defineProps({
  modelValue: [String, Array],
  fieldName: {
    type: String,
    required: true
  },
  fieldLabel: String,
  itemIndex: Number,
  context: {
    type: String,
    default: ''
  }
})

// Emits
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

// Computed para valor atual
const currentValue = computed(() => {
  if (props.itemIndex !== undefined && Array.isArray(props.modelValue)) {
    return props.modelValue[props.itemIndex] || ''
  }
  return props.modelValue || ''
})

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

// Mostrar dialog da IA
const showAIDialog = () => {
  detectSelectedText()
  showDialog.value = true
}

// Auto-detectar texto selecionado
const detectSelectedText = () => {
  try {
    const selection = window.getSelection()
    const selectedContent = selection ? selection.toString().trim() : ''
    
    if (selectedContent) {
      console.log('📝 Texto selecionado detectado:', selectedContent)
      selectedText.value = selectedContent
    } else {
      console.log('❌ Nenhum texto selecionado')
      selectedText.value = ''
    }
  } catch (error) {
    console.warn('⚠️ Erro ao detectar texto selecionado:', error)
  }
}

// Fechar dialog
const closeDialog = () => {
  showDialog.value = false
  freePrompt.value = ''
  aiSuggestion.value = ''
  selectedText.value = ''
}

// Limpar prompt atual
const clearPrompt = () => {
  freePrompt.value = ''
  aiSuggestion.value = ''
}

// Salvar prompt atual
const saveCurrentPrompt = async () => {
  if (!freePrompt.value.trim()) return
  
  const promptTitle = prompt('Digite um nome para este prompt (opcional):') || `Prompt ${savedPrompts.value.length + 1}`
  
  const newPrompt = {
    title: promptTitle,
    content: freePrompt.value.trim(),
    createdAt: new Date().toISOString(),
    fieldName: props.fieldName
  }
  
  savedPrompts.value.push(newPrompt)
  saveSavedPrompts()
  
  // Feedback visual
  aiSuggestion.value = `✅ Prompt "${promptTitle}" salvo com sucesso!`
  setTimeout(() => {
    aiSuggestion.value = ''
  }, 3000)
}

// Carregar prompt selecionado
const loadPrompt = (prompt) => {
  freePrompt.value = prompt.content
  showSavedPrompts.value = false
  aiSuggestion.value = `✅ Prompt "${prompt.title}" carregado!`
  setTimeout(() => {
    aiSuggestion.value = ''
  }, 2000)
}

// Deletar prompt
const deletePrompt = (index) => {
  if (confirm('Tem certeza que deseja deletar este prompt?')) {
    savedPrompts.value.splice(index, 1)
    saveSavedPrompts()
  }
}

// Salvar prompts no localStorage
const saveSavedPrompts = () => {
  try {
    localStorage.setItem('aiFieldAssistant_prompts', JSON.stringify(savedPrompts.value))
  } catch (error) {
    console.warn('Erro ao salvar prompts:', error)
  }
}

// Gerar correção com chat livre
const generateFreeCorrection = async () => {
  console.log('🚀 INÍCIO generateFreeCorrection()')
  console.log('📊 Estado atual:', {
    currentValue: currentValue.value,
    selectedText: selectedText.value,
    freePrompt: freePrompt.value
  })
  
  if (!currentValue.value && !selectedText.value) {
    console.log('❌ Campo vazio, abortar')
    alert('Campo está vazio. Adicione algum conteúdo primeiro.')
    return
  }

  if (!freePrompt.value.trim()) {
    console.log('❌ Prompt livre vazio, abortar')
    alert('Por favor, digite uma instrução para a IA.')
    return
  }

  console.log('✅ Validações passaram, iniciando processamento...')
  isProcessing.value = true
  
  try {
    console.log('🤖 Gerando correção com chat livre...')
    console.log('📝 Campo:', props.fieldName)
    console.log('💭 Prompt livre:', freePrompt.value)
    console.log('📄 Conteúdo:', currentValue.value)
    console.log('✂️ Texto selecionado:', selectedText.value)
    
    // Chat completamente livre - usar prompt exatamente como digitado pelo usuário
    const targetContent = selectedText.value || currentValue.value
    
    console.log('📝 Prompt do usuário:', freePrompt.value)
    console.log('📄 Conteúdo para trabalhar:', targetContent)
    
    // 🎯 PROMPT DIRETO SEM EXPLICAÇÕES (exatamente como funcionava antes)
    let editPrompt
    
    // Detecção especial para comandos de remoção
    if (freePrompt.value.toLowerCase().includes('remov') && selectedText.value) {
      editPrompt = `Você deve remover este texto específico do conteúdo:

TEXTO A REMOVER:
"${selectedText.value}"

CONTEÚDO COMPLETO:
${currentValue.value}

Retorne o conteúdo completo SEM o texto especificado para remoção. Não adicione explicações.`
    } else {
      editPrompt = `${freePrompt.value}

Texto para editar:
${targetContent}

IMPORTANTE: Retorne APENAS o texto editado, sem explicações ou comentários adicionais.`
    }
    
    // Enviar tudo como prompt principal (sem contexto separado)
    const response = await geminiService.makeRequest(editPrompt)
    
    console.log('📨 Resposta recebida:', response)
    
    if (response) {
      let cleanResponse = response.trim()
      console.log('✅ Sugestão processada:', cleanResponse)
      
      // 🧹 LIMPAR RESPOSTAS EXPLICATIVAS (detectar padrões do problema)
      if (cleanResponse.includes('Tarefa removida:') || 
          cleanResponse.includes('Texto resultante:') ||
          cleanResponse.includes('removida com sucesso') ||
          cleanResponse.toLowerCase().includes('(nenhum texto restante)')) {
        console.log('🧹 Detectada resposta explicativa, extraindo resultado...')
        
        // Se a IA disse que removeu, então remover o texto selecionado
        if (selectedText.value && freePrompt.value.toLowerCase().includes('remov')) {
          // Para remoção: remover o texto selecionado do conteúdo original
          cleanResponse = currentValue.value.replace(selectedText.value, '').trim()
          // Limpar linhas vazias duplas
          cleanResponse = cleanResponse.replace(/\n\s*\n\s*\n/g, '\n\n')
          console.log('✂️ Texto removido aplicado:', cleanResponse)
        } else {
          // Para outros casos explicativos, tentar extrair apenas resultado
          const lines = cleanResponse.split('\n')
          const resultLine = lines.find(line => 
            !line.includes('Tarefa removida') && 
            !line.includes('Texto resultante') && 
            line.trim().length > 0 &&
            !line.includes('nenhum texto restante')
          )
          if (resultLine) {
            cleanResponse = resultLine.trim()
          }
        }
      }
      
      // Mostrar sugestão
      aiSuggestion.value = cleanResponse
      
      // 🔧 AUTO-APLICAÇÃO DESABILITADA - usuário deve decidir
      // Apenas mostrar o resultado, não aplicar automaticamente
      
    } else {
      console.log('❌ Resposta vazia')
      alert('A IA não conseguiu gerar uma resposta. Tente reformular o prompt.')
    }
    
  } catch (error) {
    console.error('❌ Erro na geração:', error)
    alert(`Erro ao processar: ${error.message}`)
  } finally {
    isProcessing.value = false
  }
}

// Aplicar sugestão manualmente
const applySuggestion = () => {
  if (!aiSuggestion.value) return

  console.log('🎯 Aplicando sugestão:', {
    aiSuggestion: aiSuggestion.value,
    aiSuggestionType: typeof aiSuggestion.value,
    selectedText: selectedText.value,
    selectedTextType: typeof selectedText.value,
    currentValue: currentValue.value,
    currentValueType: typeof currentValue.value,
    itemIndex: props.itemIndex,
    fieldName: props.fieldName
  })

  let finalValue

  if (selectedText.value) {
    // 🔧 SIMPLIFICAÇÃO: Quando há texto selecionado, substituir todo o conteúdo
    // Isso evita problemas com a função replace que podem corromper a string
    console.log('✂️ Texto selecionado detectado, substituindo todo o conteúdo')
    finalValue = String(aiSuggestion.value || '')
  } else {
    // Substituir todo o conteúdo
    finalValue = String(aiSuggestion.value || '')
    console.log('📝 Substituindo todo o conteúdo:', finalValue)
  }

  // 🔧 SIMPLIFICAÇÃO: Sempre emitir apenas o valor final
  // Deixar que o Vue cuide da atualização do v-model
  console.log('📤 Emitindo valor final:', finalValue)
  
  // 🛡️ VERIFICAÇÃO FINAL: Garantir que seja sempre uma string válida
  const safeValue = typeof finalValue === 'string' ? finalValue : 
                   Array.isArray(finalValue) ? finalValue.join('') : 
                   String(finalValue || '')
  
  console.log('🛡️ Valor seguro final:', {
    original: finalValue,
    originalType: typeof finalValue,
    safe: safeValue,
    safeType: typeof safeValue
  })
  
  emit('update:modelValue', safeValue)

  // Emitir evento de atualização para o pai
  emit('field-updated', {
    fieldName: props.fieldName,
    oldValue: currentValue.value,
    newValue: finalValue,
    itemIndex: props.itemIndex,
    field: props.fieldName,
    value: finalValue,
    index: props.itemIndex
  })

  showSuccess.value = true
  setTimeout(() => {
    closeDialog()
    showSuccess.value = false
  }, 2000)
}

// � REMOVIDA: Função updateValue separada - agora tudo é feito em applySuggestion

// Watch para detectar mudanças
watch(() => props.modelValue, () => {
  selectedText.value = ''
}, { deep: true })

onMounted(() => {
  loadSavedPrompts()
})
</script>

<style scoped>
.ai-field-wrapper {
  position: relative;
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
  z-index: 10;
  background: rgba(var(--v-theme-primary), 0.1);
  border: 1px solid rgba(var(--v-theme-primary), 0.3);
  border-radius: 4px;
  padding: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.ai-field-button:hover {
  background: rgba(var(--v-theme-primary), 0.2);
  transform: scale(1.05);
}

.ai-field-button--active {
  background: rgba(var(--v-theme-primary), 0.3);
}

.ai-processing-indicator {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 10;
  padding: 4px;
}

.content-preview {
  background: #f5f5f5;
  padding: 12px;
  border-radius: 4px;
  max-height: 150px;
  overflow-y: auto;
  font-size: 0.9em;
  white-space: pre-wrap;
}

.selected-text-preview {
  background: rgba(var(--v-theme-primary), 0.1);
  padding: 8px;
  border-radius: 4px;
  font-style: italic;
  border-left: 3px solid rgb(var(--v-theme-primary));
}

.ai-suggestion {
  background: rgba(var(--v-theme-success), 0.1);
  padding: 12px;
  border-radius: 4px;
  border: 1px solid rgba(var(--v-theme-success), 0.3);
  white-space: pre-wrap;
  max-height: 200px;
  overflow-y: auto;
}

.prompt-field {
  font-family: 'Courier New', monospace;
}
</style>
