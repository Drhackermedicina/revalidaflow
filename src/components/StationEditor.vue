<script setup>
import TiptapEditor from '@/components/TiptapEditor.vue';
import { currentUser } from '@/plugins/auth.js';
import { db } from '@/plugins/firebase.js';
import { pepStandardLibrary } from '@/utils/pepCorrector.js';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

const props = defineProps({
  stationId: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(['station-saved', 'close']);

const router = useRouter();

const stationData = ref(null);
const originalStationData = ref(null);

const isLoading = ref(true);
const errorMessage = ref('');
const successMessage = ref('');

const pepStats = ref({
  totalScore: 0,
  itemCount: 0,
  isValid: false,
  maxPossible: 0,
  items: []
});

async function importPEPCorrector() {
  try {
    const module = await import('@/utils/pepCorrector.js');
    return {
      validateAndCorrectPEP: module.validateAndCorrectPEP,
      getPEPStats: module.getPEPStats
    };
  } catch (error) {
    console.error('Erro ao importar corretor PEP:', error);
    return null;
  }
}

async function updatePEPStats() {
  if (!stationData.value) return;
  const corrector = await importPEPCorrector();
  if (!corrector) return;
  const stats = corrector.getPEPStats(stationData.value);
  pepStats.value = stats;
}

async function correctPEPScoring() {
  if (!stationData.value) return;
  const corrector = await importPEPCorrector();
  if (!corrector) {
    errorMessage.value = 'Erro ao carregar corretor PEP';
    return;
  }
  try {
    const correctedStation = corrector.validateAndCorrectPEP(stationData.value);
    Object.assign(stationData.value, correctedStation);
    await updatePEPStats();
    successMessage.value = `Pontuação PEP corrigida automaticamente! ${correctedStation.correctionLog || ''}`;
    setTimeout(() => { successMessage.value = ''; }, 5000);
  } catch (error) {
    console.error('Erro ao corrigir PEP:', error);
    errorMessage.value = `Erro na correção PEP: ${error.message}`;
  }
}

const isAdmin = computed(() => {
  return currentUser.value && (
    currentUser.value.uid === 'KiSITAxXMAY5uU3bOPW5JMQPent2' ||
    currentUser.value.uid === 'RtfNENOqMUdw7pvgeeaBVSuin662' ||
    currentUser.value.uid === 'UD7S8aiyR8TJXHyxdw29BHNfjEf1' ||
    currentUser.value.uid === 'lNwhdYgMwLhS1ZyufRzw9xLD10y1' ||
    currentUser.value.uid === 'lNwhdYgMwLhS1ZyufRzw9xLD10y1'
  );
});

async function fetchStationToEdit() {
  if (!props.stationId) {
    errorMessage.value = "Nenhum ID de estação fornecido para edição.";
    isLoading.value = false;
    return;
  }
  isLoading.value = true;
  errorMessage.value = '';
  successMessage.value = '';
  try {
    const docRef = doc(db, "estacoes_clinicas", props.stationId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const loadedData = { id: docSnap.id, ...docSnap.data() };
      
      loadedData.instrucoesParticipante = loadedData.instrucoesParticipante || { cenarioAtendimento: { infraestruturaUnidade: [] }, tarefasPrincipais: [], avisosImportantes: [] };
      loadedData.instrucoesParticipante.cenarioAtendimento = loadedData.instrucoesParticipante.cenarioAtendimento || { infraestruturaUnidade: [] };
      loadedData.instrucoesParticipante.cenarioAtendimento.infraestruturaUnidade = loadedData.instrucoesParticipante.cenarioAtendimento.infraestruturaUnidade || [];
      loadedData.instrucoesParticipante.tarefasPrincipais = loadedData.instrucoesParticipante.tarefasPrincipais || [];
      loadedData.instrucoesParticipante.avisosImportantes = loadedData.instrucoesParticipante.avisosImportantes || [];
      
      loadedData.materiaisDisponiveis = loadedData.materiaisDisponiveis || { informacoesVerbaisSimulado: [], impressos: [] };
      loadedData.materiaisDisponiveis.informacoesVerbaisSimulado = loadedData.materiaisDisponiveis.informacoesVerbaisSimulado || [];
      loadedData.materiaisDisponiveis.impressos = loadedData.materiaisDisponiveis.impressos || [];
      
      loadedData.padraoEsperadoProcedimento = loadedData.padraoEsperadoProcedimento || { itensAvaliacao: [] };
      loadedData.padraoEsperadoProcedimento.itensAvaliacao = loadedData.padraoEsperadoProcedimento.itensAvaliacao || [];

      stationData.value = reactive(JSON.parse(JSON.stringify(loadedData)));
      originalStationData.value = JSON.parse(JSON.stringify(loadedData));
      
      await correctPEPScoring();
      await updatePEPStats();
    } else {
      errorMessage.value = "Estação não encontrada para edição.";
      stationData.value = null;
    }
  } catch (error) {
    console.error("Erro ao buscar estação para edição:", error);
    errorMessage.value = `Falha ao carregar estação: ${error.message}`;
    stationData.value = null;
  } finally {
    isLoading.value = false;
  }
}

async function saveStationChanges() {
  if (!stationData.value || !stationData.value.id) {
    errorMessage.value = "Nenhum dado da estação para salvar.";
    return;
  }
  if (!isAdmin.value) {
    errorMessage.value = "Apenas administradores podem salvar alterações.";
    return;
  }

  isLoading.value = true;
  errorMessage.value = '';
  successMessage.value = '';

  try {
    await correctPEPScoring();
    
    const stationDocRef = doc(db, 'estacoes_clinicas', stationData.value.id);
    
    const dataToSave = JSON.parse(JSON.stringify(stationData.value));
    delete dataToSave.id; 

    await updateDoc(stationDocRef, dataToSave);
    successMessage.value = "Estação atualizada com sucesso!";
    originalStationData.value = JSON.parse(JSON.stringify(stationData.value)); 
    
    emit('station-saved'); // Emit event to parent
    
    setTimeout(() => { 
        successMessage.value = ''; 
        emit('close'); // Close dialog after a delay
    }, 2000);

  } catch (error) {
    console.error("Erro ao salvar alterações da estação:", error);
    errorMessage.value = `Falha ao salvar: ${error.message}`;
  } finally {
    isLoading.value = false;
  }
}

function addToArray(targetArray, newItemTemplate = {}) {
  if (Array.isArray(targetArray)) {
    targetArray.push(reactive(JSON.parse(JSON.stringify(newItemTemplate))));
  }
}

function removeFromArray(targetArray, index) {
  if (Array.isArray(targetArray)) {
    targetArray.splice(index, 1);
  }
}

function addActorScriptItem() {
  if (stationData.value?.materiaisDisponiveis?.informacoesVerbaisSimulado) {
    addToArray(stationData.value.materiaisDisponiveis.informacoesVerbaisSimulado, { contextoOuPerguntaChave: 'Novo Contexto', informacao: 'Nova Informação' });
  }
}

const impressoTemplates = {
  lista_chave_valor_secoes: { secoes: [{ tituloSecao: "Nova Seção", itens: [{ chave: "Nova Chave", valor: "Novo Valor" }] }] },
  tabela_objetos: { cabecalhos: [{ key: "col1", label: "Coluna 1" }, { key: "col2", label: "Coluna 2" }], linhas: [{ col1: "Valor 1", col2: "Valor 2" }] },
  imagem_descritiva: { descricao: "Descrição da imagem aqui", caminhoImagem: "https://caminho/para/imagem.jpg" },
  imagem_com_texto: { textoDescritivo: "Texto descritivo/interpretação aqui", caminhoImagem: "https://caminho/para/imagem.jpg", legendaImagem: "Legenda da imagem", laudo: "Laudo ou informações adicionais aqui" }
};

function addImpressoItem() {
  if (stationData.value?.materiaisDisponiveis?.impressos) {
    const tipoConteudoPadrao = 'lista_chave_valor_secoes';
    const newImpresso = {
      idImpresso: `est${stationData.value.numeroDaEstacao || 'X'}_novo_impresso_${Date.now()}`,
      tituloImpresso: 'Novo Impresso (Título)',
      tipoConteudo: tipoConteudoPadrao,
      conteudo: JSON.parse(JSON.stringify(impressoTemplates[tipoConteudoPadrao])),
    };
    addToArray(stationData.value.materiaisDisponiveis.impressos, newImpresso);
  }
}

function atualizarTemplateImpresso(impresso) {
  const tipoConteudo = impresso.tipoConteudo;
  if (impressoTemplates[tipoConteudo]) {
    impresso.conteudo = JSON.parse(JSON.stringify(impressoTemplates[tipoConteudo]));
  }
}

function updatePEPItemNumbers() {
  if (stationData.value?.padraoEsperadoProcedimento?.itensAvaliacao) {
    stationData.value.padraoEsperadoProcedimento.itensAvaliacao.forEach((item, index) => {
      item.itemNumeroOficial = (index + 1).toString();
    });
  }
}

// Novo template para itens PEP com a estrutura detalhada
const newPEPItemTemplate = {
  idItem: '', // Será gerado
  itemNumeroOficial: '', // Será definido por updatePEPItemNumbers
  competencia: '', // Novo campo
  item: '', // Novo campo
  detalhes: '', // Novo campo
  sub_itens: [], // Novo campo, array de strings
  descricaoItem: 'Nova descrição do item PEP...', // Campo existente, pode ser preenchido ou depreciado
  pontuacoes: {
    adequado: { criterio: 'Critério para adequado', pontos: 0.0 },
    parcialmenteAdequado: { criterio: 'Critério para parcialmente adequado', pontos: 0.0 },
    inadequado: { criterio: 'Critério para inadequado', pontos: 0.0 }
  }
};

function addPEPItem() {
  if (stationData.value?.padraoEsperadoProcedimento?.itensAvaliacao) {
    const newItem = reactive(JSON.parse(JSON.stringify(newPEPItemTemplate))); // Deep copy e reativo
    newItem.idItem = `pep_est${stationData.value.numeroDaEstacao || 'X'}_novo_item_${Date.now()}`;
    newItem.itemNumeroOficial = (stationData.value.padraoEsperadoProcedimento.itensAvaliacao.length + 1).toString();
    
    addToArray(stationData.value.padraoEsperadoProcedimento.itensAvaliacao, newItem);
    updatePEPItemNumbers(); // Garante que a numeração está correta
  }
}

function removePEPItem(index) {
  if (stationData.value?.padraoEsperadoProcedimento?.itensAvaliacao) {
    removeFromArray(stationData.value.padraoEsperadoProcedimento.itensAvaliacao, index);
    updatePEPItemNumbers();
  }
}

function movePEPItem(index, direction) {
  const items = stationData.value.padraoEsperadoProcedimento.itensAvaliacao;
  if (!items) return;
  if (direction === 'up' && index > 0) {
    [items[index], items[index - 1]] = [items[index - 1], items[index]];
  } else if (direction === 'down' && index < items.length - 1) {
    [items[index], items[index + 1]] = [items[index + 1], items[index]];
  }
  updatePEPItemNumbers();
}

function addStandardPEPItems(category) {
  const itemsToAdd = pepStandardLibrary[category];
  if (!itemsToAdd || !stationData.value?.padraoEsperadoProcedimento?.itensAvaliacao) return;
  itemsToAdd.forEach(itemTemplate => {
    const newItem = reactive(JSON.parse(JSON.stringify(itemTemplate))); // Deep copy e reativo
    const currentItems = stationData.value.padraoEsperadoProcedimento.itensAvaliacao;
    newItem.idItem = `pep_est${stationData.value.numeroDaEstacao || 'X'}_item_${Date.now()}_${Math.random()}`;
    newItem.itemNumeroOficial = (currentItems.length + 1).toString();
    
    // Adaptação para o novo modelo se o item padrão não tiver os campos
    if (!newItem.competencia) newItem.competencia = '';
    if (!newItem.item) newItem.item = newItem.descricaoItem.split(':')[0]?.trim() || '';
    if (!newItem.detalhes) newItem.detalhes = newItem.descricaoItem.split(':')[1]?.trim() || '';
    if (!newItem.sub_itens) newItem.sub_itens = [];

    addToArray(currentItems, newItem);
  });
  updatePEPItemNumbers();
  successMessage.value = `Itens de '${category}' adicionados com sucesso!`;
  setTimeout(() => { successMessage.value = ''; }, 3000);
}

// Função para adaptar itens PEP existentes ao novo modelo
function adaptPEPToNewModel() {
  if (!stationData.value?.padraoEsperadoProcedimento?.itensAvaliacao) return;

  let adaptedCount = 0;
  stationData.value.padraoEsperadoProcedimento.itensAvaliacao.forEach(item => {
    // Se o item já tem a nova estrutura, pula
    if (item.competencia !== undefined && item.item !== undefined && item.detalhes !== undefined && item.sub_itens !== undefined) {
      return;
    }

    // Inicializa os novos campos se não existirem
    item.competencia = item.competencia || '';
    item.item = item.item || '';
    item.detalhes = item.detalhes || '';
    item.sub_itens = item.sub_itens || [];

    // Tenta extrair informações de descricaoItem
    const desc = item.descricaoItem || '';
    let remainingDesc = desc;

    // Tenta extrair "Item:"
    const itemMatch = remainingDesc.match(/^(.*?):\s*(.*)$/);
    if (itemMatch) {
      item.item = itemMatch[1].trim();
      remainingDesc = itemMatch[2].trim();
    } else {
      item.item = remainingDesc.trim();
      remainingDesc = '';
    }

    // Tenta extrair "Detalhes:" e "Sub-itens:"
    const subItemsRegex = /(?:Sub-itens|Subitens|Sub itens):\s*(.*)$/i;
    const subItemsMatch = remainingDesc.match(subItemsRegex);

    if (subItemsMatch) {
      item.detalhes = remainingDesc.substring(0, subItemsMatch.index).trim();
      const rawSubItems = subItemsMatch[1].trim();
      // Divide sub-itens por ponto e vírgula, ou apenas ponto final
      item.sub_itens = rawSubItems.split(/;\s*|\.\s*/).map(s => s.trim()).filter(s => s.length > 0);
    } else {
      item.detalhes = remainingDesc.trim();
      item.sub_itens = [];
    }
    adaptedCount++;
  });

  if (adaptedCount > 0) {
    successMessage.value = `Adaptados ${adaptedCount} itens PEP para o novo padrão. Por favor, revise-os.`;
  } else {
    successMessage.value = 'Nenhum item PEP precisou de adaptação ou já estava no novo padrão.';
  }
  setTimeout(() => { successMessage.value = ''; }, 5000);
}

onMounted(() => {
  fetchStationToEdit();
});

watch(() => props.stationId, (newId) => {
  if (newId) {
    fetchStationToEdit();
  }
});

watch(() => stationData.value?.padraoEsperadoProcedimento?.itensAvaliacao, () => {
  if (stationData.value) {
    setTimeout(() => {
      updatePEPStats();
    }, 500);
  }
}, { deep: true });
</script>

<template>
  <VContainer fluid>
    <VRow justify="center">
      <VCol cols="12">
        <VProgressCircular v-if="isLoading" indeterminate size="64" class="d-block mx-auto" />
        <VAlert v-if="errorMessage" type="error" prominent class="mb-4">{{ errorMessage }}</VAlert>
        <VAlert v-if="successMessage" type="success" prominent class="mb-4">{{ successMessage }}</VAlert>
      </VCol>
    </VRow>

    <form v-if="stationData && !isLoading && isAdmin" @submit.prevent="saveStationChanges">
      <VChip color="primary" class="d-block mx-auto mb-6">
        Editando Estação ID: <strong>{{ stationData.id }}</strong>
      </VChip>

      <!-- Informações Gerais -->
      <VCard class="mb-6">
        <VCardTitle>Informações Gerais da Estação</VCardTitle>
        <VCardText>
          <VRow>
            <VCol cols="12" md="8">
              <VTextField label="Título da Estação" v-model="stationData.tituloEstacao" required />
            </VCol>
            <VCol cols="12" md="4">
              <VTextField label="Número da Estação" v-model.number="stationData.numeroDaEstacao" type="number" required />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField label="Especialidade" v-model="stationData.especialidade" required />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField label="Tempo de Duração (minutos)" v-model.number="stationData.tempoDuracaoMinutos" type="number" required />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField label="Palavras-Chave (separadas por vírgula)" v-model="stationData.palavrasChave" />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField label="Nível de Dificuldade" v-model="stationData.nivelDificuldade" />
            </VCol>
          </VRow>
        </VCardText>
      </VCard>

      <!-- Instruções para o Participante -->
      <VCard class="mb-6" v-if="stationData.instrucoesParticipante">
        <VCardTitle>Instruções para o Participante</VCardTitle>
        <VCardText>
          <VCard variant="tonal" class="mb-4" v-if="stationData.instrucoesParticipante.cenarioAtendimento">
            <VCardTitle class="text-subtitle-1">Cenário de Atendimento</VCardTitle>
            <VCardText>
              <VRow>
                <VCol cols="12" md="6">
                  <VTextField label="Nível de Atenção" v-model="stationData.instrucoesParticipante.cenarioAtendimento.nivelAtencao" />
                </VCol>
                <VCol cols="12" md="6">
                  <VTextField label="Tipo de Atendimento" v-model="stationData.instrucoesParticipante.cenarioAtendimento.tipoAtendimento" />
                </VCol>
              </VRow>
              <div>
                <label class="v-label">Infraestrutura da Unidade</label>
                <div v-for="(infra, index) in stationData.instrucoesParticipante.cenarioAtendimento.infraestruturaUnidade" :key="'infra-' + index" class="d-flex align-center my-2">
                  <VTextField v-model="stationData.instrucoesParticipante.cenarioAtendimento.infraestruturaUnidade[index]" dense hide-details />
                  <VBtn icon="ri-delete-bin-line" size="small" variant="text" color="error" @click="removeFromArray(stationData.instrucoesParticipante.cenarioAtendimento.infraestruturaUnidade, index)" />
                </div>
                <VBtn size="small" color="primary" @click="addToArray(stationData.instrucoesParticipante.cenarioAtendimento.infraestruturaUnidade, '')">Adicionar Infraestrutura</VBtn>
              </div>
            </VCardText>
          </VCard>
          
          <div class="mb-4">
            <label class="v-label">Descrição do Caso Completa</label>
            <TiptapEditor v-model="stationData.instrucoesParticipante.descricaoCasoCompleta" />
          </div>

          <div class="mb-4">
            <label class="v-label">Tarefas Principais</label>
            <div v-for="(tarefa, index) in stationData.instrucoesParticipante.tarefasPrincipais" :key="'tarefa-' + index" class="d-flex align-start my-2">
              <TiptapEditor v-model="stationData.instrucoesParticipante.tarefasPrincipais[index]" class="flex-grow-1" />
              <VBtn icon="ri-delete-bin-line" size="small" variant="text" color="error" @click="removeFromArray(stationData.instrucoesParticipante.tarefasPrincipais, index)" />
            </div>
            <VBtn size="small" color="primary" @click="addToArray(stationData.instrucoesParticipante.tarefasPrincipais, '')">Adicionar Tarefa</VBtn>
          </div>

          <div>
            <label class="v-label">Avisos Importantes</label>
            <div v-for="(aviso, index) in stationData.instrucoesParticipante.avisosImportantes" :key="'aviso-' + index" class="d-flex align-start my-2">
              <TiptapEditor v-model="stationData.instrucoesParticipante.avisosImportantes[index]" class="flex-grow-1" />
              <VBtn icon="ri-delete-bin-line" size="small" variant="text" color="error" @click="removeFromArray(stationData.instrucoesParticipante.avisosImportantes, index)" />
            </div>
            <VBtn size="small" color="primary" @click="addToArray(stationData.instrucoesParticipante.avisosImportantes, '')">Adicionar Aviso</VBtn>
          </div>
        </VCardText>
      </VCard>

      <!-- Roteiro do Ator -->
      <VCard class="mb-6" v-if="stationData.materiaisDisponiveis && stationData.materiaisDisponiveis.informacoesVerbaisSimulado">
        <VCardTitle>Roteiro do Ator (Informações Verbais)</VCardTitle>
        <VCardText>
          <VCard v-for="(info, index) in stationData.materiaisDisponiveis.informacoesVerbaisSimulado" :key="'infoRoteiro-' + index" variant="outlined" class="mb-4 pa-4">
            <VTextField label="Contexto/Pergunta Chave" v-model="info.contextoOuPerguntaChave" class="mb-2" />
            <label class="v-label">Informação (em 1ª pessoa)</label>
            <TiptapEditor v-model="info.informacao" />
            <VCardActions>
              <VSpacer />
              <VBtn color="error" variant="text" @click="removeFromArray(stationData.materiaisDisponiveis.informacoesVerbaisSimulado, index)">Remover Item</VBtn>
            </VCardActions>
          </VCard>
          <VBtn color="primary" @click="addActorScriptItem()">Adicionar Item ao Roteiro</VBtn>
        </VCardText>
      </VCard>

      <!-- Impressos para o Candidato -->
      <VCard class="mb-6" v-if="stationData.materiaisDisponiveis && stationData.materiaisDisponiveis.impressos">
        <VCardTitle>Impressos para o Candidato</VCardTitle>
        <VCardText>
          <VCard v-for="(impresso, impIndex) in stationData.materiaisDisponiveis.impressos" :key="impresso.idImpresso || 'impresso-' + impIndex" variant="outlined" class="mb-4 pa-4">
            <div class="d-flex justify-space-between align-center mb-4">
              <h4 class="text-h6">Impresso {{ impIndex + 1 }}</h4>
              <VBtn color="error" variant="text" @click="removeFromArray(stationData.materiaisDisponiveis.impressos, impIndex)">Remover Impresso</VBtn>
            </div>
            <VRow>
              <VCol cols="12" md="6">
                <VTextField label="ID do Impresso (único)" v-model="impresso.idImpresso" required />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField label="Título do Impresso" v-model="impresso.tituloImpresso" required />
              </VCol>
              <VCol cols="12">
                <VSelect
                  label="Tipo de Conteúdo"
                  v-model="impresso.tipoConteudo"
                  :items="Object.keys(impressoTemplates).map(k => ({title: k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), value: k}))"
                  required
                  @update:modelValue="atualizarTemplateImpresso(impresso)"
                />
              </VCol>
            </VRow>
          </VCard>
          <VBtn color="primary" @click="addImpressoItem()">Adicionar Impresso</VBtn>
        </VCardText>
      </VCard>

      <!-- PEP - Itens de Avaliação -->
      <VCard class="mb-6" v-if="stationData.padraoEsperadoProcedimento">
        <VCardTitle>PEP - Itens de Avaliação</VCardTitle>
        <VCardText>
          <VCard variant="tonal" :color="pepStats.isValid ? 'success' : 'warning'" class="mb-4">
            <VCardText>
              <div class="d-flex justify-space-between align-center">
                <div>
                  <h4 class="text-h6 mb-2">📊 Status da Pontuação PEP</h4>
                  <div class="d-flex gap-4">
                    <VChip :color="pepStats.isValid ? 'success' : 'error'" variant="flat" size="large">
                      Total: {{ pepStats.totalScore }}/10.0 pontos
                    </VChip>
                    <VChip variant="outlined">{{ pepStats.itemCount }} itens</VChip>
                    <VChip :color="pepStats.isValid ? 'success' : 'warning'" variant="outlined">
                      {{ pepStats.isValid ? '✅ Pontuação Correta' : '⚠️ Necessita Correção' }}
                    </VChip>
                  </div>
                </div>
                <div class="text-right">
                  <VBtn color="primary" @click="correctPEPScoring" :loading="isLoading" prepend-icon="ri-calculator-line" class="mb-2">
                    Corrigir Pontuação
                  </VBtn>
                </div>
              </div>
            </VCardText>
          </VCard>
          
          <div class="d-flex flex-wrap gap-2 mb-4">
            <VBtn color="indigo-lighten-1" size="small" @click="addStandardPEPItems('apresentacao')">+ Apresentação</VBtn>
            <VBtn color="blue-lighten-1" size="small" @click="addStandardPEPItems('anamnese')">+ Anamnese</VBtn>
            <VBtn color="green-lighten-1" size="small" @click="addStandardPEPItems('exameFisico')">+ Exame Físico</VBtn>
            <VBtn color="purple-lighten-1" size="small" @click="addStandardPEPItems('diagnostico')">+ Diagnóstico e Tratamento</VBtn>
            <VBtn color="orange-lighten-1" size="small" @click="addStandardPEPItems('diagnosticosDiferenciais')">+ Diagnósticos Diferenciais</VBtn>
            <VBtn color="cyan-lighten-1" size="small" @click="addStandardPEPItems('examesImagem')">+ Exames de Imagem</VBtn>
            <VBtn color="pink-lighten-1" size="small" @click="addStandardPEPItems('examesLaboratoriais')">+ Exames Laboratoriais</VBtn>
            <VBtn color="teal-darken-2" size="small" @click="adaptPEPToNewModel" prepend-icon="ri-magic-line">
              Adaptar Itens Existentes
            </VBtn>
          </div>

          <VCard v-for="(itemPEP, pepIndex) in stationData.padraoEsperadoProcedimento.itensAvaliacao" :key="itemPEP.idItem || 'pep-' + pepIndex" variant="outlined" class="mb-4 pa-4">
            <div class="d-flex justify-space-between align-center mb-4">
              <h4 class="text-h6">Item do PEP {{ itemPEP.itemNumeroOficial }}</h4>
              <div>
                <VBtn icon="ri-arrow-up-line" size="small" variant="text" @click="movePEPItem(pepIndex, 'up')" :disabled="pepIndex === 0" />
                <VBtn icon="ri-arrow-down-line" size="small" variant="text" @click="movePEPItem(pepIndex, 'down')" :disabled="pepIndex === stationData.padraoEsperadoProcedimento.itensAvaliacao.length - 1" />
                <VBtn color="error" variant="text" @click="removePEPItem(pepIndex)">Remover</VBtn>
              </div>
            </div>
            <VRow>
              <VCol cols="12" md="6">
                <VTextField label="ID do Item (único)" v-model="itemPEP.idItem" required />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField label="Nº Oficial" v-model="itemPEP.itemNumeroOficial" type="number" />
              </VCol>
              <VCol cols="12">
                <VTextField label="Competência" v-model="itemPEP.competencia" />
              </VCol>
              <VCol cols="12">
                <VTextField label="Item" v-model="itemPEP.item" />
              </VCol>
              <VCol cols="12">
                <VTextarea label="Detalhes" v-model="itemPEP.detalhes" rows="2" />
              </VCol>
              <VCol cols="12">
                <label class="v-label">Sub-itens</label>
                <div v-for="(subItem, subIndex) in itemPEP.sub_itens" :key="subIndex" class="d-flex align-center my-1">
                  <VTextField v-model="itemPEP.sub_itens[subIndex]" dense hide-details />
                  <VBtn icon="ri-delete-bin-line" size="x-small" variant="text" color="error" @click="removeFromArray(itemPEP.sub_itens, subIndex)" />
                </div>
                <VBtn size="small" color="primary" @click="addToArray(itemPEP.sub_itens, '')">Adicionar Sub-item</VBtn>
              </VCol>
              <VCol cols="12">
                <VTextarea label="Descrição do Item (Legado/Completa)" v-model="itemPEP.descricaoItem" rows="3" hint="Este campo pode ser preenchido automaticamente ou usado para detalhes adicionais." persistent-hint />
              </VCol>
            </VRow>
            <VCard variant="tonal" class="mt-4" v-if="itemPEP.pontuacoes">
              <VCardTitle class="text-subtitle-1">Critérios de Pontuação</VCardTitle>
              <VCardText>
                <div v-if="itemPEP.pontuacoes.adequado" class="mb-4">
                  <label class="v-label">Adequado</label>
                  <TiptapEditor v-model="itemPEP.pontuacoes.adequado.criterio" />
                  <VTextField label="Pontos" v-model.number="itemPEP.pontuacoes.adequado.pontos" type="number" step="0.01" class="mt-2" />
                </div>
                <div v-if="itemPEP.pontuacoes.parcialmenteAdequado" class="mb-4">
                  <label class="v-label">Parcialmente Adequado</label>
                  <TiptapEditor v-model="itemPEP.pontuacoes.parcialmenteAdequado.criterio" />
                  <VTextField label="Pontos" v-model.number="itemPEP.pontuacoes.parcialmenteAdequado.pontos" type="number" step="0.01" class="mt-2" />
                </div>
                <div v-if="itemPEP.pontuacoes.inadequado">
                  <label class="v-label">Inadequado</label>
                  <TiptapEditor v-model="itemPEP.pontuacoes.inadequado.criterio" />
                  <VTextField label="Pontos" v-model.number="itemPEP.pontuacoes.inadequado.pontos" type="number" step="0.01" class="mt-2" />
                </div>
              </VCardText>
            </VCard>
          </VCard>
          <VBtn color="primary" @click="addPEPItem()">Adicionar Item Manualmente</VBtn>
        </VCardText>
      </VCard>

      <!-- Ações Finais -->
      <VCard>
        <VCardActions class="pa-4">
          <VBtn @click="$emit('close')" color="secondary" variant="tonal">
            Cancelar
          </VBtn>
          <VSpacer />
          <VBtn type="submit" color="success" size="large" :loading="isLoading" prepend-icon="ri-save-line">
            Salvar Alterações
          </VBtn>
        </VCardActions>
      </VCard>
    </form>

    <VAlert v-else-if="!isAdmin && !isLoading" type="warning" prominent>
      Você não tem permissão para editar esta estação.
    </VAlert>
  </VContainer>
</template>

<style scoped>
.v-label {
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
  display: block;
}
.flex-grow-1 {
  flex-grow: 1;
}
</style>
