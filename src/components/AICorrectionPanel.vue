<template>
  <v-card class="ai-correction-panel" elevation="2">
    <v-card-title class="d-flex align-center">
      <v-icon icon="mdi-robot" class="me-2" color="primary" />
      Correção por IA
      <v-spacer />
      <v-chip 
        :color="isOnline ? 'success' : 'warning'" 
        size="small" 
        variant="tonal"
      >
        {{ isOnline ? 'Online' : 'Offline' }}
      </v-chip>
    </v-card-title>

    <v-card-text>
      <!-- Seletor de Campo -->
      <v-select
        v-model="selectedField"
        :items="corrigibleFields"
        item-title="label"
        item-value="value"
        label="Selecione o campo para corrigir"
        variant="outlined"
        density="compact"
        class="mb-4"
        @update:modelValue="onFieldSelected"
      />

      <!-- Seletor Hierárquico para Arrays -->
      <v-select
        v-if="selectedField && fieldConfig[selectedField]?.isArray"
        v-model="selectedItemIndex"
        :items="arrayItems"
        item-title="label"
        item-value="value"
        label="Selecione o item para corrigir"
        variant="outlined"
        density="compact"
        class="mb-4"
        @update:modelValue="onItemSelected"
      />

      <!-- Sugestões da Memória -->
      <div v-if="suggestions.length > 0" class="mb-4">
        <v-divider class="mb-3" />
        <div class="text-subtitle-2 mb-2">💡 Sugestões da memória:</div>
        <v-chip-group>
          <v-chip
            v-for="suggestion in suggestions"
            :key="suggestion.id"
            size="small"
            variant="outlined"
            @click="applySuggestion(suggestion)"
          >
            {{ suggestion.titulo }}
          </v-chip>
        </v-chip-group>
      </div>

      <!-- Valor Atual -->
      <div v-if="currentValue" class="mb-4">
        <div class="text-subtitle-2 mb-2">📝 Valor atual:</div>
        <v-sheet class="pa-3" color="grey-lighten-4" rounded>
          <div class="text-body-2" style="white-space: pre-wrap;">
            {{ truncateText(currentValue, 200) }}
          </div>
        </v-sheet>
      </div>

      <!-- Chat Interface -->
      <div v-if="selectedField" class="chat-interface">
        <v-textarea
          v-model="userRequest"
          label="Descreva o que você quer corrigir"
          placeholder="Ex: Torne o texto mais claro e objetivo, remova redundâncias..."
          variant="outlined"
          rows="3"
          class="mb-3"
          :disabled="isProcessing"
        />

        <v-btn
          :loading="isProcessing"
          :disabled="!userRequest.trim() || isProcessing"
          color="primary"
          variant="flat"
          block
          @click="requestCorrection"
        >
          <v-icon icon="mdi-magic-staff" class="me-2" />
          Gerar Correção
        </v-btn>
      </div>

      <!-- Preview da Correção -->
      <div v-if="correctedValue" class="mt-4">
        <v-divider class="mb-3" />
        
        <!-- Comparação Original vs Corrigido -->
        <div class="correction-comparison">
          <div class="text-subtitle-2 mb-2">📝 Comparação:</div>
          
          <!-- Valor Original -->
          <v-card variant="outlined" class="mb-3">
            <v-card-subtitle class="pb-2">
              <v-icon icon="mdi-file-document-outline" class="me-1" />
              Texto Atual
            </v-card-subtitle>
            <v-card-text class="pt-0">
              <div class="text-body-2 original-text" style="white-space: pre-wrap;">
                {{ truncateText(currentValue, 300) }}
              </div>
            </v-card-text>
          </v-card>
          
          <!-- Valor Corrigido -->
          <v-card variant="outlined" class="mb-3" color="success-lighten-5">
            <v-card-subtitle class="pb-2">
              <v-icon icon="mdi-auto-fix" class="me-1" color="success" />
              Correção Proposta
            </v-card-subtitle>
            <v-card-text class="pt-0">
              <div class="text-body-2 corrected-text" style="white-space: pre-wrap;">
                {{ truncateText(correctedValue, 300) }}
              </div>
            </v-card-text>
          </v-card>
        </div>

        <!-- Botões de Validação -->
        <div class="d-flex gap-2 mb-3">
          <v-btn
            color="success"
            variant="flat"
            @click="approvCorrection"
          >
            <v-icon icon="mdi-check" class="me-1" />
            Aceitar
          </v-btn>
          
          <v-btn
            color="error"
            variant="outlined"
            @click="rejectCorrection"
          >
            <v-icon icon="mdi-close" class="me-1" />
            Rejeitar
          </v-btn>
        </div>

        <!-- Botão Aplicar (só aparece após aprovação) -->
        <v-btn
          v-if="isCorrectionApproved"
          color="primary"
          variant="tonal"
          block
          @click="applyCorrection"
        >
          <v-icon icon="mdi-content-save-edit" class="me-2" />
          Aplicar Correção
        </v-btn>

        <!-- Botão Salvar Prompt -->
        <v-btn
          v-if="isCorrectionApproved"
          color="secondary"
          variant="outlined"
          block
          class="mt-2"
          @click="showSavePromptDialog = true"
        >
          <v-icon icon="mdi-content-save" class="me-2" />
          Salvar Prompt na Memória
        </v-btn>
      </div>

      <!-- Feedback de Erro -->
      <v-alert
        v-if="errorMessage"
        type="error"
        variant="tonal"
        class="mt-3"
        dismissible
        @click:close="errorMessage = ''"
      >
        {{ errorMessage }}
      </v-alert>

      <!-- Feedback de Sucesso -->
      <v-alert
        v-if="successMessage"
        type="success"
        variant="tonal"
        class="mt-3"
        dismissible
        @click:close="successMessage = ''"
      >
        {{ successMessage }}
      </v-alert>
    </v-card-text>

    <!-- Dialog para Salvar Prompt -->
    <v-dialog v-model="showSavePromptDialog" max-width="500">
      <v-card>
        <v-card-title>💾 Salvar Prompt na Memória</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="promptTitle"
            label="Título da correção"
            placeholder="Ex: Simplificar linguagem técnica"
            variant="outlined"
            class="mb-3"
          />
          <div class="text-caption text-grey">
            Este prompt será salvo e poderá ser reutilizado em futuras edições.
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="showSavePromptDialog = false">Cancelar</v-btn>
          <v-btn 
            color="primary" 
            :disabled="!promptTitle.trim()"
            @click="savePrompt"
          >
            Salvar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { geminiService } from '@/services/geminiService.js';
import memoryService from '@/services/memoryService.js';

const props = defineProps({
  stationId: String,
  formData: Object,
  stationContext: [String, Object] // Aceita tanto String quanto Object
});

const emit = defineEmits(['field-updated', 'show-success', 'show-error']);

// Estado do componente
const selectedField = ref('');
const selectedItemIndex = ref(null);
const userRequest = ref('');
const correctedValue = ref('');
const currentValue = ref('');
const isProcessing = ref(false);
const isCorrectionApproved = ref(false);
const errorMessage = ref('');
const successMessage = ref('');
const suggestions = ref([]);
const isOnline = ref(navigator.onLine);

// Função para extrair o contexto corretamente
const contextText = computed(() => {
  if (!props.stationContext) return '';
  
  if (typeof props.stationContext === 'string') {
    return props.stationContext;
  } else if (typeof props.stationContext === 'object') {
    return props.stationContext.contexto_geral || 
           JSON.stringify(props.stationContext);
  }
  
  return '';
});

// Dialog para salvar prompt
const showSavePromptDialog = ref(false);
const promptTitle = ref('');

// Configuração dos campos corrigíveis
const fieldConfig = {
  'descricaoCasoCompleta': { 
    label: 'Descrição Completa do Caso', 
    isArray: false 
  },
  'tarefasPrincipais': { 
    label: 'Tarefas Principais', 
    isArray: false 
  },
  'roteiroCandidato': { 
    label: 'Roteiro do Candidato', 
    isArray: false 
  },
  'informacoesVerbaisSimulado': { 
    label: 'Informações Verbais do Simulado', 
    isArray: true 
  },
  'impressos': { 
    label: 'Impressos', 
    isArray: true 
  },
  'padraoEsperadoProcedimento.itensAvaliacao': { 
    label: 'Itens de Avaliação PEP', 
    isArray: true 
  }
};

// Lista de campos corrigíveis
const corrigibleFields = computed(() => {
  return Object.entries(fieldConfig).map(([value, config]) => ({
    value,
    label: config.label
  }));
});

// Itens do array selecionado
const arrayItems = computed(() => {
  if (!selectedField.value || !fieldConfig[selectedField.value]?.isArray) {
    return [];
  }

  const fieldPath = selectedField.value.split('.');
  let data = props.formData;
  
  for (const key of fieldPath) {
    data = data?.[key];
  }

  if (!Array.isArray(data)) return [];

  return data.map((item, index) => ({
    value: index,
    label: getItemLabel(selectedField.value, item, index)
  }));
});

// Função para obter label do item
function getItemLabel(fieldName, item, index) {
  switch (fieldName) {
    case 'informacoesVerbaisSimulado':
      const contexto = item.contextoOuPerguntaChave || 'Sem contexto';
      return `${index + 1}. ${contexto}`;
    case 'impressos':
      return `${index + 1}. ${item.tituloImpresso || 'Impresso sem título'}`;
    case 'padraoEsperadoProcedimento.itensAvaliacao':
      const desc = item.descricaoItem || 'Item sem descrição';
      return `${index + 1}. ${desc.substring(0, 50)}${desc.length > 50 ? '...' : ''}`;
    default:
      return `Item ${index + 1}`;
  }
}

// Função para obter valor atual do campo
function getCurrentFieldValue() {
  if (!selectedField.value) return '';

  if (fieldConfig[selectedField.value]?.isArray && selectedItemIndex.value !== null) {
    // Para arrays, pegar o item específico
    const fieldPath = selectedField.value.split('.');
    let data = props.formData;
    
    for (const key of fieldPath) {
      data = data?.[key];
    }

    if (Array.isArray(data) && data[selectedItemIndex.value]) {
      const item = data[selectedItemIndex.value];
      
      // 🎯 EXTRAÇÃO DE TEXTO ESPECÍFICO PARA CAMPOS COMPLEXOS
      switch (selectedField.value) {
        case 'informacoesVerbaisSimulado':
          // Retorna apenas o texto da informação
          return item.informacao || '';
          
        case 'impressos':
          // Retorna o conteúdo baseado no tipo
          if (item.tipoConteudo === 'texto_simples') {
            return item.conteudo?.texto || '';
          } else if (item.tipoConteudo === 'imagem_com_texto') {
            const parts = [];
            if (item.conteudo?.textoDescritivo) parts.push(`Descrição: ${item.conteudo.textoDescritivo}`);
            if (item.conteudo?.laudo) parts.push(`Laudo: ${item.conteudo.laudo}`);
            return parts.join('\n\n') || '';
          } else if (item.tipoConteudo === 'lista_chave_valor_secoes') {
            const sections = item.conteudo?.secoes || [];
            return sections.map(secao => {
              const items = secao.itens?.map(i => `${i.chave}: ${i.valor}`).join('\n') || '';
              return `${secao.tituloSecao}\n${items}`;
            }).join('\n\n') || '';
          }
          return '';
          
        case 'padraoEsperadoProcedimento.itensAvaliacao':
          // Retorna apenas a descrição do item
          return item.descricaoItem || '';
          
        default:
          // Para outros arrays, retorna JSON como antes
          return typeof item === 'object' 
            ? JSON.stringify(item, null, 2)
            : item;
      }
    }
  } else {
    // Para campos simples
    const fieldPath = selectedField.value.split('.');
    let data = props.formData;
    
    for (const key of fieldPath) {
      data = data?.[key];
    }

    return data || '';
  }

  return '';
}

// Watchers
watch(selectedField, () => {
  resetCorrection();
  loadSuggestions();
  currentValue.value = getCurrentFieldValue();
});

watch(selectedItemIndex, () => {
  resetCorrection();
  currentValue.value = getCurrentFieldValue();
});

// Detectar mudanças na conexão
window.addEventListener('online', () => { isOnline.value = true; });
window.addEventListener('offline', () => { isOnline.value = false; });

// Métodos
function onFieldSelected() {
  selectedItemIndex.value = null;
  resetCorrection();
}

function onItemSelected() {
  resetCorrection();
}

function resetCorrection() {
  userRequest.value = '';
  correctedValue.value = '';
  isCorrectionApproved.value = false;
  errorMessage.value = '';
  successMessage.value = '';
  // 🔧 CORREÇÃO: Atualizar o valor atual após aplicar correção
  currentValue.value = getCurrentFieldValue();
}

async function loadSuggestions() {
  if (!selectedField.value || !props.stationId) return;
  
  try {
    const memories = await memoryService.getMemoriesByField(props.stationId, selectedField.value);
    suggestions.value = await geminiService.getSuggestions(selectedField.value, memories);
  } catch (error) {
    console.error('Erro ao carregar sugestões:', error);
  }
}

function applySuggestion(suggestion) {
  userRequest.value = suggestion.prompt;
}

async function requestCorrection() {
  if (!userRequest.value.trim()) return;

  isProcessing.value = true;
  errorMessage.value = '';

  try {
    if (fieldConfig[selectedField.value]?.isArray && selectedItemIndex.value !== null) {
      // Corrigir item de array
      const fieldPath = selectedField.value.split('.');
      let data = props.formData;
      
      for (const key of fieldPath) {
        data = data?.[key];
      }

      const currentItem = data[selectedItemIndex.value];
      correctedValue.value = await geminiService.correctArrayItem(
        selectedField.value,
        selectedItemIndex.value,
        currentItem,
        userRequest.value,
        contextText.value
      );
    } else {
      // Corrigir campo simples
      correctedValue.value = await geminiService.correctField(
        selectedField.value,
        currentValue.value,
        userRequest.value,
        contextText.value
      );
    }

    // 🔧 CORREÇÃO: Remover aplicação automática da correção
    // Agora apenas mostra o preview para o usuário decidir
    
  } catch (error) {
    errorMessage.value = `Erro ao gerar correção: ${error.message}`;
  } finally {
    isProcessing.value = false;
  }
}

// 🔧 CORREÇÃO: Função applyPreview removida para evitar aplicação automática
// A correção agora só é aplicada quando o usuário aceitar explicitamente

function approvCorrection() {
  isCorrectionApproved.value = true;
  successMessage.value = 'Correção aprovada! Agora você pode aplicá-la.';
}

function rejectCorrection() {
  userRequest.value = '';
  const feedback = prompt('O que está incorreto na correção? (Isso ajudará a melhorar a próxima tentativa)');
  if (feedback) {
    userRequest.value = `${userRequest.value}\n\nFeedback: ${feedback}`;
  }
  correctedValue.value = '';
  isCorrectionApproved.value = false;
}

function applyCorrection() {
  if (!correctedValue.value) return;
  
  console.log('🔧 Aplicando correção:', {
    field: selectedField.value,
    value: correctedValue.value,
    index: selectedItemIndex.value
  });
  
  // 🔧 CORREÇÃO: Usar nomes corretos do evento
  emit('field-updated', { 
    field: selectedField.value, 
    value: correctedValue.value, 
    index: selectedItemIndex.value
  });

  emit('show-success', 'Correção aplicada com sucesso!');
  resetCorrection();
}

async function savePrompt() {
  if (!promptTitle.value.trim()) return;

  try {
    // 🔧 CORREÇÃO: Validação mais robusta dos dados
    console.log('💾 Preparando dados para salvar prompt...', {
      hasPromptTitle: !!promptTitle.value,
      hasSelectedField: !!selectedField.value,
      hasUserRequest: !!userRequest.value,
      hasCorrectedValue: !!correctedValue.value,
      selectedItemIndex: selectedItemIndex.value
    });

    const promptData = {
      fieldName: selectedField.value || '',
      itemIndex: selectedItemIndex.value, // Pode ser null para campos simples
      title: promptTitle.value.trim(),
      userRequest: userRequest.value || '',
      correctedValue: correctedValue.value || '',
      originalValue: currentValue.value || ''
    };

    console.log('🔍 Dados do prompt preparados:', promptData);

    await memoryService.savePrompt(props.stationId, promptData);
    
    showSavePromptDialog.value = false;
    promptTitle.value = '';
    emit('show-success', 'Prompt salvo na memória com sucesso!');
    
    // Recarregar sugestões
    loadSuggestions();
  } catch (error) {
    console.error('❌ Erro ao salvar prompt no componente:', error);
    emit('show-error', `Erro ao salvar prompt: ${error.message}`);
  }
}

function truncateText(text, maxLength) {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

// Inicialização
onMounted(() => {
  loadSuggestions();
});
</script>

<style scoped>
.ai-correction-panel {
  border: 2px solid rgb(var(--v-theme-primary));
}

.chat-interface {
  background: rgba(var(--v-theme-surface-variant), 0.3);
  border-radius: 8px;
  padding: 16px;
}

.correction-comparison {
  background: rgba(var(--v-theme-surface-variant), 0.1);
  border-radius: 8px;
  padding: 16px;
}

.original-text {
  background: rgba(var(--v-theme-warning), 0.1);
  padding: 12px;
  border-radius: 6px;
  border-left: 4px solid rgb(var(--v-theme-warning));
}

.corrected-text {
  background: rgba(var(--v-theme-success), 0.1);
  padding: 12px;
  border-radius: 6px;
  border-left: 4px solid rgb(var(--v-theme-success));
}

.gap-2 {
  gap: 8px;
}

.text-body-2 {
  font-family: 'Roboto Mono', monospace;
  font-size: 0.875rem;
  line-height: 1.4;
}
</style>
