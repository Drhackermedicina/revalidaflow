<script setup>
// 🔧 CORREÇÃO: Definir props para aceitar ID da rota
const props = defineProps({
  id: String // Para aceitar o ID da rota sem warnings
})

import { currentUser } from '@/plugins/auth.js';
import { db, storage, testStorageConnection } from '@/plugins/firebase.js';
import { deleteDoc, doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import imageCompression from 'browser-image-compression';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTheme } from 'vuetify';
import AIFieldAssistant from '@/components/AIFieldAssistant.vue';
import { geminiService } from '@/services/geminiService.js';
import memoryService from '@/services/memoryService.js';

// Debug do storage
console.log('🔧 Configuração de Storage:');
console.log('Storage importado:', storage);
console.log('Funções do storage importadas:', { storageRef, uploadBytes, getDownloadURL });

const route = useRoute();
const router = useRouter();
const theme = useTheme();

// Computed para detectar tema escuro
const isDarkTheme = computed(() => theme.global.name.value === 'dark');

// 🔧 CORREÇÃO: Usar props.id se disponível
const stationId = ref(props.id || route.params.id || null);

// Debug da inicialização
console.log('🔍 Inicialização do stationId:', {
  propsId: props.id,
  routeParamsId: route.params.id,
  finalStationId: stationId.value,
  routePath: route.path,
  routeName: route.name
});

console.log('🔍 Valores detalhados:', {
  'props.id': props.id,
  'route.params.id': route.params.id,
  'stationId.value': stationId.value,
  'route.params': JSON.stringify(route.params),
  'route.path': route.path
});
const isLoading = ref(true);
const errorMessage = ref('');
const successMessage = ref('');
const isSaving = ref(false);
const keyboardShortcutUsed = ref(false);

// Variáveis para controle de upload de imagens
const uploadingImages = ref({});
const uploadProgress = ref({});

// 🤖 Variáveis para o sistema de IA
const stationContext = ref('');
// DESABILITADO: Painel antigo removido em favor do sistema integrado
// const showAIPanel = ref(false);
const isGeneratingContext = ref(false);
// const aiPanelPosition = ref('right'); // 'right', 'bottom', 'floating'

// Função para obter o estado inicial do formulário
function getInitialFormData() {
  return {
    idEstacao: '',
    tituloEstacao: '',
    numeroDaEstacao: null,
    especialidade: '',
    tempoDuracaoMinutos: 10,
    palavrasChave: '',
    nivelDificuldade: 'Médio',
    cenarioAtendimento_nivelAtencao: 'atenção primária à saúde',
    cenarioAtendimento_tipoAtendimento: 'ambulatorial',
    cenarioAtendimento_infraestruturaUnidade: '',
    descricaoCasoCompleta: '',
    tarefasPrincipais: '',
    avisosImportantes: '',
    roteiroCandidato: '',
    orientacoesCandidato: '',
    informacoesVerbaisSimulado: [{ 
      idInfoVerbal: `infoVerbal_${Date.now()}_1`,
      contextoOuPerguntaChave: '', 
      informacao: '' 
    }],
    impressos: [], // Inicia com array vazio - impressos são opcionais
    padraoEsperadoProcedimento: {
      idChecklistAssociado: '',
      sinteseEstacao: { resumoCasoPEP: '', focoPrincipalDetalhado: [''] },
      itensAvaliacao: [{
          idItem: `itempep_${Date.now()}_1`,
          itemNumeroOficial: '',
          descricaoItem: '',
          pontuacoes: {
              adequado: { criterio: 'Realizou corretamente e completamente.', pontos: 0 },
              parcialmenteAdequado: { criterio: 'Realizou parcialmente ou com pequenas falhas.', pontos: 0 },
              inadequado: { criterio: 'Não realizou ou realizou incorretamente.', pontos: 0 }
          }
      }],
      pontuacaoTotalEstacao: 0,
      feedbackEstacao: {
        resumoTecnico: '',
        fontes: [''] // Inicializa com pelo menos um campo vazio
      }
    }
  };
}

const formData = ref(getInitialFormData());

// Variável para armazenar dados originais que devem ser preservados
const originalStationData = ref(null);

// Status de edição da estação
const editStatus = ref({
  hasBeenEdited: false,
  totalEdits: 0,
  lastEditDate: null,
  lastEditBy: null
});

// Verifica se o usuário atual é admin
const isAdmin = computed(() => {
  return currentUser.value && (
    currentUser.value.uid === 'KiSITAxXMAY5uU3bOPW5JMQPent2' ||
    currentUser.value.uid === 'RtfNENOqMUdw7pvgeeaBVSuin662' ||
    currentUser.value.uid === 'UD7S8aiyR8TJXHyxdw29BHNfjEf1' ||
    currentUser.value.uid === 'lNwhdYgMwLhS1ZyufRzw9xLD10y1'
  );
});

// Computed para calcular pontuação total do PEP
const calcularPontuacaoTotalPEP = computed(() => {
  if (!formData.value.padraoEsperadoProcedimento?.itensAvaliacao?.length) return 0;
  
  const total = formData.value.padraoEsperadoProcedimento.itensAvaliacao.reduce((acc, item) => {
    const pontosAdequado = parseFloat(item.pontuacoes?.adequado?.pontos) || 0;
    return acc + pontosAdequado;
  }, 0);
  
  return total;
});

// Computed para verificar se a pontuação total está correta (deve ser 10)
const isPontuacaoTotalValida = computed(() => {
  const total = calcularPontuacaoTotalPEP.value;
  return Math.abs(total - 10) < 0.001; // Usa tolerância para comparação de float
});

// Computed para mensagem de alerta da pontuação
const alertaPontuacaoTotal = computed(() => {
  const total = calcularPontuacaoTotalPEP.value;
  if (total === 0) return '';
  
  if (total < 10) {
    const diferenca = (10 - total).toFixed(3);
    return `⚠️ ATENÇÃO: A pontuação total está ${diferenca} pontos ABAIXO de 10. Ajuste os valores dos campos "Adequado".`;
  } else if (total > 10) {
    const diferenca = (total - 10).toFixed(3);
    return `⚠️ ATENÇÃO: A pontuação total está ${diferenca} pontos ACIMA de 10. Ajuste os valores dos campos "Adequado".`;
  }
  
  return '';
});

// Watch para atualizar pontuação total automaticamente
watch(calcularPontuacaoTotalPEP, (novaTotal) => {
  if (formData.value.padraoEsperadoProcedimento) {
    formData.value.padraoEsperadoProcedimento.pontuacaoTotalEstacao = novaTotal;
  }
}, { immediate: true });

// Função para detectar campos alterados comparando dados originais com formulário atual
function detectChangedFields() {
  if (!originalStationData.value) return [];
  
  const changedFields = [];
  const original = originalStationData.value;
  const current = formData.value;
  
  // Mapeamento de campos para detecção de mudanças
  const fieldsToCheck = [
    { key: 'tituloEstacao', label: 'Título da Estação' },
    { key: 'numeroDaEstacao', label: 'Número da Estação' },
    { key: 'especialidade', label: 'Especialidade' },
    { key: 'tempoDuracaoMinutos', label: 'Duração em Minutos' },
    { key: 'nivelDificuldade', label: 'Nível de Dificuldade' },
    { key: 'palavrasChave', label: 'Palavras-chave' },
    { key: 'descricaoCasoCompleta', label: 'Descrição do Caso' },
    { key: 'tarefasPrincipais', label: 'Tarefas Principais' },
    { key: 'avisosImportantes', label: 'Avisos Importantes' },
    { key: 'roteiroCandidato', label: 'Roteiro do Candidato' },
    { key: 'orientacoesCandidato', label: 'Orientações do Candidato' },
    { key: 'cenarioAtendimento_nivelAtencao', label: 'Nível de Atenção' },
    { key: 'cenarioAtendimento_tipoAtendimento', label: 'Tipo de Atendimento' },
    { key: 'cenarioAtendimento_infraestruturaUnidade', label: 'Infraestrutura da Unidade' }
  ];
  
  // Verificar campos simples
  fieldsToCheck.forEach(field => {
    const originalValue = getNestedValue(original, field.key);
    const currentValue = current[field.key];
    
    if (normalizeValue(originalValue) !== normalizeValue(currentValue)) {
      changedFields.push(field.label);
    }
  });
  
  // Verificar arrays complexos - Informações Verbais
  const originalInfoVerbais = original.materiaisDisponiveis?.informacoesVerbaisSimulado || [];
  const currentInfoVerbais = current.informacoesVerbaisSimulado || [];
  
  if (JSON.stringify(originalInfoVerbais) !== JSON.stringify(currentInfoVerbais)) {
    changedFields.push('Informações Verbais do Simulado');
  }
  
  // Verificar impressos
  const originalImpressos = original.materiaisDisponiveis?.impressos || [];
  const currentImpressos = current.impressos || [];
  
  if (JSON.stringify(originalImpressos) !== JSON.stringify(currentImpressos)) {
    changedFields.push('Impressos');
  }
  
  // Verificar PEP
  const originalPEP = original.padraoEsperadoProcedimento || {};
  const currentPEP = current.padraoEsperadoProcedimento || {};
  
  if (JSON.stringify(originalPEP) !== JSON.stringify(currentPEP)) {
    changedFields.push('Padrão Esperado de Procedimento (PEP)');
  }
  
  return changedFields;
}

// Função auxiliar para obter valores aninhados
function getNestedValue(obj, path) {
  if (path.includes('cenarioAtendimento_')) {
    const field = path.replace('cenarioAtendimento_', '');
    return obj.instrucoesParticipante?.cenarioAtendimento?.[field] || '';
  }
  
  if (path === 'descricaoCasoCompleta') {
    return obj.instrucoesParticipante?.descricaoCasoCompleta || '';
  }
  
  if (path === 'tarefasPrincipais') {
    const tarefas = obj.instrucoesParticipante?.tarefasPrincipais || [];
    return Array.isArray(tarefas) ? tarefas.join('\n') : tarefas;
  }
  
  if (path === 'avisosImportantes') {
    const avisos = obj.instrucoesParticipante?.avisosImportantes || [];
    return Array.isArray(avisos) ? avisos.join('\n') : avisos;
  }
  
  if (path === 'palavrasChave') {
    const palavras = obj.palavrasChave;
    return Array.isArray(palavras) ? palavras.join(', ') : palavras;
  }
  
  return obj[path] || '';
}

// Função auxiliar para normalizar valores para comparação
function normalizeValue(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'string') return value.trim();
  return JSON.stringify(value);
}

// 🔄 FUNÇÃO DE NORMALIZAÇÃO DO HISTÓRICO DE EDIÇÕES
async function normalizarHistoricoEdicao(stationData) {
  console.log('🔄 Iniciando normalização do histórico para:', stationData.id);
  
  // Se já tem editHistory moderno, não precisa normalizar
  if (stationData.editHistory && Array.isArray(stationData.editHistory)) {
    console.log('✅ Estação já tem editHistory moderno');
    return stationData;
  }
  
  // Detectar se é estação legacy (com qualquer campo de timestamp)
  const isLegacy = !stationData.editHistory && (
    stationData.dataCadastro || stationData.dataUltimaAtualizacao || 
    stationData.criadoEmTimestamp || stationData.atualizadoEmTimestamp
  );
  
  if (!isLegacy) {
    console.log('ℹ️ Estação não é legacy, mantendo estrutura atual');
    return stationData;
  }
  
  console.log('🔧 Detectada estação legacy, criando estrutura moderna...');
  
  // Criar estrutura de histórico moderna baseada em dados legacy
  const editHistory = [];
  
  // Verificar múltiplos formatos de campos de timestamp
  const criadoEm = stationData.criadoEmTimestamp || stationData.dataCadastro;
  const atualizadoEm = stationData.atualizadoEmTimestamp || stationData.dataUltimaAtualizacao;
  
  const hasBeenEdited = !!atualizadoEm;
  
  // Se tem timestamp de atualização diferente de criação, foi editada
  if (hasBeenEdited && atualizadoEm && criadoEm) {
    const cadastro = criadoEm.toDate ? criadoEm.toDate() : new Date(criadoEm);
    const ultimaAtualizacao = atualizadoEm.toDate ? atualizadoEm.toDate() : new Date(atualizadoEm);
    
    // Se datas são diferentes, houve edição
    if (ultimaAtualizacao.getTime() !== cadastro.getTime()) {
      editHistory.push({
        timestamp: ultimaAtualizacao,
        userId: 'legacy-system',
        userName: 'Sistema Legacy',
        changedFields: ['Migração automática - dados legacy'],
        totalChangedFields: 1,
        isLegacyMigration: true
      });
    }
  }
  
  // Estrutura normalizada
  const normalizedData = {
    ...stationData,
    editHistory: editHistory,
    hasBeenEdited: hasBeenEdited,
    totalEdits: editHistory.length,
    // Manter campos legacy para compatibilidade
    dataCadastro: stationData.dataCadastro,
    dataUltimaAtualizacao: stationData.dataUltimaAtualizacao
  };
  
  console.log('✅ Normalização concluída:', {
    hasBeenEdited: normalizedData.hasBeenEdited,
    totalEdits: normalizedData.totalEdits,
    editHistoryLength: normalizedData.editHistory.length
  });
  
  return normalizedData;
}

// 🤖 ============ FUNÇÕES DO SISTEMA DE IA ============

// Função para carregar ou gerar contexto da estação
async function loadOrGenerateStationContext() {
  if (!stationId.value) return;

  try {
    // Tentar carregar contexto existente
    const existingContext = await memoryService.loadStationContext(stationId.value);
    
    if (existingContext) {
      stationContext.value = existingContext;
      console.log('✅ Contexto da estação carregado do cache');
      return;
    }

    // Se não existir, gerar novo contexto
    console.log('🤖 Gerando contexto da estação pela primeira vez...');
    isGeneratingContext.value = true;
    
    const context = await geminiService.generateStationContext(formData.value);
    
    if (context) {
      stationContext.value = context;
      await memoryService.saveStationContext(stationId.value, context);
      console.log('✅ Contexto da estação gerado e salvo');
    }
  } catch (error) {
    console.error('❌ Erro ao carregar/gerar contexto:', error);
    // Contexto padrão se falhar
    stationContext.value = `Estação clínica: ${formData.value.tituloEstacao || 'Sem título'} - ${formData.value.especialidade || 'Especialidade não definida'}`;
  } finally {
    isGeneratingContext.value = false;
  }
}

// DESABILITADO: Função do painel antigo
// function toggleAIPanel() {
//   showAIPanel.value = !showAIPanel.value;
//   
//   if (showAIPanel.value && !stationContext.value) {
//     loadOrGenerateStationContext();
//   }
// }

// Função para lidar com atualização de campo pela IA INTEGRADA
function handleAIFieldUpdate({ field, value, index, original }) {
  console.log('🤖 Campo atualizado pela IA integrada:', { 
    field, 
    value: value?.substring(0, 50) + '...', 
    index 
  })
  
  if (!field || !formData.value) {
    console.error('❌ Dados insuficientes para atualização:', { field: !!field, formData: !!formData.value })
    return
  }
  
  try {
    // 🔧 APLICAÇÃO DIRETA: A IA integrada já emitiu update:modelValue
    // Esta função é apenas para logging e notificações
    
    if (typeof index === 'number') {
      console.log('✅ Item de array atualizado via IA integrada:', { field, index })
    } else {
      console.log('✅ Campo simples atualizado via IA integrada:', { field })
    }
    
    // Mostrar sucesso
    showAISuccess('Campo atualizado pela IA!')
    
  } catch (error) {
    console.error('❌ Erro ao processar atualização da IA:', error)
  }
}

// Função para mostrar mensagem de sucesso
function showAISuccess(message) {
  successMessage.value = message;
  setTimeout(() => {
    successMessage.value = '';
  }, 4000);
}

// Função para mostrar mensagem de erro
function showAIError(message) {
  errorMessage.value = message;
  setTimeout(() => {
    errorMessage.value = '';
  }, 5000);
}

// Função para alternar posição do painel de IA
function toggleAIPanelPosition() {
  const positions = ['right', 'bottom', 'floating'];
  const currentIndex = positions.indexOf(aiPanelPosition.value);
  aiPanelPosition.value = positions[(currentIndex + 1) % positions.length];
}

// ===================================================

// Função para carregar estação do Firestore
async function fetchStationData() {
  console.log('🚀 fetchStationData chamada com stationId:', stationId.value);
  
  if (!stationId.value) {
    console.error('❌ Nenhum ID de estação fornecido');
    errorMessage.value = "Nenhum ID de estação fornecido para edição.";
    isLoading.value = false;
    return;
  }
  
  isLoading.value = true;
  errorMessage.value = '';
  successMessage.value = '';
  
  try {
    const docRef = doc(db, "estacoes_clinicas", stationId.value);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const stationData = { id: docSnap.id, ...docSnap.data() };
      
      console.log('📊 Dados carregados da estação:', {
        id: stationData.id,
        titulo: stationData.tituloEstacao,
        temEditHistory: !!stationData.editHistory,
        temDataCadastro: !!stationData.dataCadastro,
        temDataUltimaAtualizacao: !!stationData.dataUltimaAtualizacao
      });
      
      // 🔄 NORMALIZAÇÃO AUTOMÁTICA DO HISTÓRICO
      const stationDataNormalized = await normalizarHistoricoEdicao(stationData);
      
      // Salvar dados originais para preservação
      originalStationData.value = JSON.parse(JSON.stringify(stationDataNormalized));
      
// Função auxiliar para converter timestamp para Date
const convertTimestampToDate = (timestamp) => {
  if (!timestamp) return null;
  
  // Se é um objeto Timestamp do Firestore
  if (timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  
  // Se é uma string de data
  if (typeof timestamp === 'string') {
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? null : date;
  }
  
  // Se é um número (unix timestamp)
  if (typeof timestamp === 'number') {
    return new Date(timestamp);
  }
  
  // Se já é uma Date
  if (timestamp instanceof Date) {
    return timestamp;
  }
  
  return null;
};

// Carregar status de edição normalizado
      const editHistory = stationDataNormalized.editHistory || [];
      const lastEditTimestamp = editHistory.length > 0 ? editHistory[editHistory.length - 1].timestamp : 
                     (stationDataNormalized.atualizadoEmTimestamp || stationDataNormalized.dataUltimaAtualizacao || stationDataNormalized.criadoEmTimestamp || stationDataNormalized.dataCadastro || null);
      
      editStatus.value = {
        hasBeenEdited: stationDataNormalized.hasBeenEdited || editHistory.length > 0,
        totalEdits: stationDataNormalized.totalEdits || editHistory.length,
        lastEditDate: convertTimestampToDate(lastEditTimestamp),
        lastEditBy: editHistory.length > 0 ? editHistory[editHistory.length - 1].editadoPor : 
                   (stationDataNormalized.atualizadoPor || stationDataNormalized.criadoPor || 'Sistema')
      };
      
      console.log('✅ Status de edição normalizado:', editStatus.value);
      
      // 👥 Buscar nomes dos usuários mencionados no histórico
      const usuariosParaBuscar = new Set();
      if (editStatus.value.lastEditBy) usuariosParaBuscar.add(editStatus.value.lastEditBy);
      if (stationDataNormalized.criadoPor) usuariosParaBuscar.add(stationDataNormalized.criadoPor);
      if (stationDataNormalized.atualizadoPor) usuariosParaBuscar.add(stationDataNormalized.atualizadoPor);
      
      // Buscar também do histórico de edições
      if (editHistory.length > 0) {
        editHistory.forEach(edit => {
          if (edit.editadoPor) usuariosParaBuscar.add(edit.editadoPor);
        });
      }
      
      loadStationIntoForm(stationDataNormalized);
      successMessage.value = `Estação "${stationDataNormalized.tituloEstacao}" carregada com sucesso!`;
      setTimeout(() => { successMessage.value = ''; }, 3000);
      
      // 🤖 Carregar contexto da IA após carregar a estação
      loadOrGenerateStationContext();
    } else {
      errorMessage.value = "Estação não encontrada.";
    }
  } catch (error) {
    console.error("Erro ao buscar estação:", error);
    errorMessage.value = `Falha ao carregar estação: ${error.message}`;
  } finally {
    isLoading.value = false;
  }
}

// Função para carregar dados da estação no formulário
function loadStationIntoForm(stationData) {
  const form = formData.value;
  
  // Dados gerais
  form.idEstacao = stationData.idEstacao || '';
  form.tituloEstacao = stationData.tituloEstacao || '';
  form.numeroDaEstacao = stationData.numeroDaEstacao || null;
  form.especialidade = stationData.especialidade || '';
  form.tempoDuracaoMinutos = stationData.tempoDuracaoMinutos || 10;
  form.nivelDificuldade = stationData.nivelDificuldade || 'Médio';
  
  // Palavras-chave
  if (Array.isArray(stationData.palavrasChave)) {
    form.palavrasChave = stationData.palavrasChave.join(', ');
  } else if (typeof stationData.palavrasChave === 'string') {
    form.palavrasChave = stationData.palavrasChave;
  } else {
    form.palavrasChave = '';
  }
  
  // Instruções para participante
  const ip = stationData.instrucoesParticipante || {};
  form.descricaoCasoCompleta = ip.descricaoCasoCompleta || '';
  
  const tarefas = ip.tarefasPrincipais || [];
  form.tarefasPrincipais = Array.isArray(tarefas) ? tarefas.join('\n') : (tarefas || '');
  
  const avisos = ip.avisosImportantes || [];
  form.avisosImportantes = Array.isArray(avisos) ? avisos.join('\n') : (avisos || '');
  
  // Carregar campos específicos do candidato
  form.roteiroCandidato = stationData.roteiroCandidato || '';
  form.orientacoesCandidato = stationData.orientacoesCandidato || '';
  
  // Cenário de atendimento
  const ca = ip.cenarioAtendimento || {};
  form.cenarioAtendimento_nivelAtencao = ca.nivelAtencao || 'atenção primária à saúde';
  form.cenarioAtendimento_tipoAtendimento = ca.tipoAtendimento || 'ambulatorial';
  const infra = ca.infraestruturaUnidade || [];
  form.cenarioAtendimento_infraestruturaUnidade = Array.isArray(infra) ? infra.join('; ') : (infra || '');
  
  // Materiais disponíveis
  const md = stationData.materiaisDisponiveis || {};
  
  // Informações verbais simulado
  const informacoesVerbaisExistentes = md.informacoesVerbaisSimulado || [];
  if (Array.isArray(informacoesVerbaisExistentes) && informacoesVerbaisExistentes.length > 0) {
//  formData.value.padraoEsperadoProcedimento.itensAvaliacao = itensExistentes.map(item => ({
    form.informacoesVerbaisSimulado = informacoesVerbaisExistentes.map((info, index) => ({
      idInfoVerbal: info.idInfoVerbal || `infoVerbal_${Date.now()}_${index + 1}`,
      contextoOuPerguntaChave: info.contextoOuPerguntaChave || '',
      informacao: info.informacao || ''
    }));
  } else {
    form.informacoesVerbaisSimulado = [{ 
      idInfoVerbal: `infoVerbal_${Date.now()}_1`,
      contextoOuPerguntaChave: '', 
      informacao: '' 
    }];
  }
  
  // Impressos
  if (Array.isArray(md.impressos) && md.impressos.length > 0) {
    form.impressos = md.impressos.map((imp, idx) => {
      const defaultConteudo = (type) => {
        if (type === 'texto_simples') return { texto: '' };
        if (type === 'imagem_com_texto') return { textoDescritivo: '', caminhoImagem: '', laudo: '' };
        if (type === 'lista_chave_valor_secoes') return { secoes: [{ tituloSecao: '', itens: [{ chave: '', valor: '' }] }] };
        return {};
      };
      
      const tipo = imp.tipoConteudo || 'texto_simples';
      let conteudo = defaultConteudo(tipo);
      
      if (imp.conteudo) {
        if (tipo === 'texto_simples') {
          conteudo.texto = typeof imp.conteudo.texto === 'string' ? imp.conteudo.texto : '';
        } else if (tipo === 'imagem_com_texto') {
          conteudo.textoDescritivo = typeof imp.conteudo.textoDescritivo === 'string' ? imp.conteudo.textoDescritivo : '';
          conteudo.caminhoImagem = typeof imp.conteudo.caminhoImagem === 'string' ? imp.conteudo.caminhoImagem : '';
          conteudo.laudo = typeof imp.conteudo.laudo === 'string' ? imp.conteudo.laudo : '';
        } else if (tipo === 'lista_chave_valor_secoes') {
          conteudo.secoes = (Array.isArray(imp.conteudo.secoes) ? imp.conteudo.secoes : []).map(s => ({
            tituloSecao: typeof s.tituloSecao === 'string' ? s.tituloSecao : '',
            itens: (Array.isArray(s.itens) ? s.itens : []).map(i => ({ 
              chave: typeof i.chave === 'string' ? i.chave : '',
              valor: typeof i.valor === 'string' ? i.valor : '' 
            })).filter(i => i.chave || i.valor)
          })).filter(s => s.tituloSecao || s.itens.length > 0);
          
          if (conteudo.secoes.length === 0) { 
            conteudo.secoes = [{ tituloSecao: '', itens: [{chave: '', valor: ''}] }];
          }
        } else { 
          conteudo = JSON.parse(JSON.stringify(imp.conteudo)); 
        }
      }
      
      return {
        idImpresso: imp.idImpresso || `imp_loaded_${Date.now()}_${idx}`,
        tituloImpresso: imp.tituloImpresso || '',
        tipoConteudo: tipo,
        conteudo: conteudo
      };
    });
  } else {
    // Não força criação de impresso - mantém array vazio se station não tem impressos
    form.impressos = [];
  }
  
  // PEP
  const jsonPep = stationData.padraoEsperadoProcedimento || {};
  
  form.padraoEsperadoProcedimento.idChecklistAssociado = jsonPep.idChecklistAssociado || '';
  
  const sintese = jsonPep.sinteseEstacao || {};
  form.padraoEsperadoProcedimento.sinteseEstacao.resumoCasoPEP = sintese.resumoCasoPEP || '';
  
  const focos = sintese.focoPrincipalDetalhado || [];
  form.padraoEsperadoProcedimento.sinteseEstacao.focoPrincipalDetalhado = Array.isArray(focos) && focos.length > 0 ? focos : [''];
  
  // Itens de avaliação
  const itensExistentes = jsonPep.itensAvaliacao || [];
  if (Array.isArray(itensExistentes) && itensExistentes.length > 0) {
    form.padraoEsperadoProcedimento.itensAvaliacao = itensExistentes.map(item => ({
      idItem: item.idItem || '',
      itemNumeroOficial: item.itemNumeroOficial || '',
      descricaoItem: item.descricaoItem || '',
      pontuacoes: {
        adequado: { 
          criterio: item.pontuacoes?.adequado?.criterio || 'Realizou corretamente e completamente.', 
          pontos: parseFloat(item.pontuacoes?.adequado?.pontos) || 0 
        },
        parcialmenteAdequado: { 
          criterio: item.pontuacoes?.parcialmenteAdequado?.criterio || 'Realizou parcialmente ou com pequenas falhas.', 
          pontos: parseFloat(item.pontuacoes?.parcialmenteAdequado?.pontos) || 0 
        },
        inadequado: { 
          criterio: item.pontuacoes?.inadequado?.criterio || 'Não realizou ou realizou incorretamente.', 
          pontos: parseFloat(item.pontuacoes?.inadequado?.pontos) || 0 
        }
      }
    }));
  } else {
    form.padraoEsperadoProcedimento.itensAvaliacao = [{
      idItem: `itempep_${Date.now()}_1`,
      itemNumeroOficial: '',
      descricaoItem: '',
      pontuacoes: {
        adequado: { criterio: 'Realizou corretamente e completamente.', pontos: 0 },
        parcialmenteAdequado: { criterio: 'Realizou parcialmente ou com pequenas falhas.', pontos: 0 },
        inadequado: { criterio: 'Não realizou ou realizou incorretamente.', pontos: 0 }
      }
    }];
  }
  
  form.padraoEsperadoProcedimento.pontuacaoTotalEstacao = parseFloat(jsonPep.pontuacaoTotalEstacao) || 0;
  
  // Carregar feedbackEstacao se existir
  const feedbackExistente = jsonPep.feedbackEstacao || {};
  form.padraoEsperadoProcedimento.feedbackEstacao = {
    resumoTecnico: feedbackExistente.resumoTecnico || '',
    fontes: Array.isArray(feedbackExistente.fontes) && feedbackExistente.fontes.length > 0 
      ? feedbackExistente.fontes 
      : [''] // Sempre inicializa com pelo menos um campo vazio para fontes
  };
  
  // Atualiza números oficiais dos itens após carregar
  setTimeout(() => {
    atualizarNumerosOficiaisItens();
  }, 100);
}

// Função para construir objeto da estação
function construirObjetoEstacao() {
  const pepForm = formData.value.padraoEsperadoProcedimento;
  const idEstacaoBase = formData.value.idEstacao.trim();
  const originalData = originalStationData.value || {};

  const estacaoAtualizada = {
    idEstacao: idEstacaoBase,
    tituloEstacao: formData.value.tituloEstacao.trim(),
    numeroDaEstacao: parseInt(formData.value.numeroDaEstacao, 10) || 0,
    especialidade: formData.value.especialidade.trim(),
    tempoDuracaoMinutos: parseInt(formData.value.tempoDuracaoMinutos, 10) || 10,
    palavrasChave: formData.value.palavrasChave.split(',').map(kw => kw.trim()).filter(kw => kw),
    nivelDificuldade: formData.value.nivelDificuldade,
    origem: 'REVALIDA_FACIL',
    roteiroCandidato: formData.value.roteiroCandidato.trim(),
    orientacoesCandidato: formData.value.orientacoesCandidato.trim(),

    // Preservar metadados originais
    ...(originalData.dataCriacao && { dataCriacao: originalData.dataCriacao }),
    ...(originalData.dataModificacao && { dataModificacao: originalData.dataModificacao }),
    ...(originalData.criadorId && { criadorId: originalData.criadorId }),
    ...(originalData.versao && { versao: originalData.versao }),

    instrucoesParticipante: {
      cenarioAtendimento: {
        nivelAtencao: formData.value.cenarioAtendimento_nivelAtencao.trim(),
        tipoAtendimento: formData.value.cenarioAtendimento_tipoAtendimento.trim(),
        infraestruturaUnidade: formData.value.cenarioAtendimento_infraestruturaUnidade.split(';').map(inf => inf.trim()).filter(inf => inf),
      },
      descricaoCasoCompleta: formData.value.descricaoCasoCompleta.trim(),
      tarefasPrincipais: formData.value.tarefasPrincipais.split('\n').map(t => t.trim()).filter(t => t),
      avisosImportantes: formData.value.avisosImportantes.split('\n').map(a => a.trim()).filter(a => a),
    },

    materiaisDisponiveis: {
      impressos: formData.value.impressos.filter(
        imp => imp.idImpresso.trim() !== '' && imp.tituloImpresso.trim() !== ''
      ).map(imp => {
          let finalConteudo = {};
          const currentConteudo = imp.conteudo || {};
          if (imp.tipoConteudo === 'texto_simples') {
              finalConteudo = { texto: currentConteudo.texto?.trim() || '' };
          } else if (imp.tipoConteudo === 'imagem_com_texto') {
              finalConteudo = {
                  textoDescritivo: currentConteudo.textoDescritivo?.trim() || '',
                  caminhoImagem: currentConteudo.caminhoImagem?.trim() || '',
                  laudo: currentConteudo.laudo?.trim() || ''
              };
          } else if (imp.tipoConteudo === 'lista_chave_valor_secoes') {
              const secoesTratadas = (Array.isArray(currentConteudo.secoes) ? currentConteudo.secoes : []).map(sec => ({
                  tituloSecao: sec.tituloSecao?.trim() || '',
                  itens: (Array.isArray(sec.itens) ? sec.itens : []).map(it => ({
                      chave: it.chave?.trim() || '',
                      valor: it.valor?.trim() || ''
                  })).filter(it => it.chave || it.valor)
              })).filter(sec => sec.tituloSecao || sec.itens.length > 0);
              finalConteudo = { secoes: secoesTratadas.length > 0 ? secoesTratadas : [{ tituloSecao: '', itens: [{ chave: '', valor: ''}] }] };
          } else {
              finalConteudo = typeof currentConteudo === 'object' && currentConteudo !== null ? JSON.parse(JSON.stringify(currentConteudo)) : {};
          }
          return {
              idImpresso: imp.idImpresso.trim(),
              tituloImpresso: imp.tituloImpresso.trim(),
              tipoConteudo: imp.tipoConteudo,
              conteudo: finalConteudo
          };
      }),
      informacoesVerbaisSimulado: formData.value.informacoesVerbaisSimulado.filter(
        info => info.contextoOuPerguntaChave.trim() !== '' || info.informacao.trim() !== ''
      ).map(info => ({
          contextoOuPerguntaChave: info.contextoOuPerguntaChave.trim(),
          informacao: info.informacao.trim()
      })),
      // Preservar perguntasAtorSimulado existentes
      perguntasAtorSimulado: originalData.materiaisDisponiveis?.perguntasAtorSimulado || []
    },

    padraoEsperadoProcedimento: {
      idChecklistAssociado: pepForm.idChecklistAssociado.trim() || `pep_${idEstacaoBase || Date.now()}`,
      sinteseEstacao: {
        resumoCasoPEP: pepForm.sinteseEstacao.resumoCasoPEP.trim(),
        focoPrincipalDetalhado: pepForm.sinteseEstacao.focoPrincipalDetalhado.map(f => f.trim()).filter(f => f)
      },
      itensAvaliacao: pepForm.itensAvaliacao.filter(
        item => item.idItem.trim() !== '' && item.descricaoItem.trim() !== ''
      ).map(item => ({
          idItem: item.idItem.trim(),
          itemNumeroOficial: item.itemNumeroOficial.trim(),
          descricaoItem: item.descricaoItem.trim(),
          pontuacoes: {
              adequado: { criterio: item.pontuacoes.adequado.criterio.trim(), pontos: parseFloat(item.pontuacoes.adequado.pontos) || 0 },
              parcialmenteAdequado: { criterio: item.pontuacoes.parcialmenteAdequado.criterio.trim(), pontos: parseFloat(item.pontuacoes.parcialmenteAdequado.pontos) || 0 },
              inadequado: { criterio: item.pontuacoes.inadequado.criterio.trim(), pontos: parseFloat(item.pontuacoes.inadequado.pontos) || 0 },
          }
      })),
      pontuacaoTotalEstacao: calcularPontuacaoTotalPEP.value,
      feedbackEstacao: pepForm.feedbackEstacao || {
        resumoTecnico: '',
        fontes: []
      }
    }
  };

  if (estacaoAtualizada.instrucoesParticipante.avisosImportantes && estacaoAtualizada.instrucoesParticipante.avisosImportantes.length === 0) {
      delete estacaoAtualizada.instrucoesParticipante.avisosImportantes;
  }
  
  // Limpar campos vazios do candidato
  if (!estacaoAtualizada.roteiroCandidato) {
      delete estacaoAtualizada.roteiroCandidato;
  }
  if (!estacaoAtualizada.orientacoesCandidato) {
      delete estacaoAtualizada.orientacoesCandidato;
  }

  return estacaoAtualizada;
}

// Função para validar estrutura da estação
function validarEstruturaEstacao(estacao) {
  return estacao && 
         estacao.idEstacao && 
         estacao.idEstacao.trim() !== '' && 
         estacao.tituloEstacao && 
         estacao.tituloEstacao.trim() !== '';
}

// Função de diagnóstico completo do Firebase Storage
async function diagnosticarStorageCompleto() {
  console.log('🔍 === DIAGNÓSTICO COMPLETO DO STORAGE ===');
  
  try {
    // 1. Verificar configuração
    console.log('📋 Configuração atual:');
    console.log('- Storage object:', storage);
    console.log('- Storage bucket:', storage.app.options.storageBucket);
    console.log('- Project ID:', storage.app.options.projectId);
    
    // 2. Verificar autenticação
    console.log('🔐 Autenticação:');
    console.log('- User UID:', currentUser.value?.uid);
    console.log('- Is Admin:', isAdmin.value);
    console.log('- Token exists:', !!currentUser.value?.accessToken);
    
    // 3. Testar criação de referência
    console.log('📁 Teste de referência:');
    const testRef = storageRef(storage, 'test/diagnóstico.txt');
    console.log('- Referência criada:', testRef.toString());
    
    // 4. Testar upload simples
    console.log('📤 Teste de upload simples:');
    const testBlob = new Blob(['Teste de diagnóstico'], { type: 'text/plain' });
    const uploadResult = await uploadBytes(testRef, testBlob);
    console.log('- Upload OK:', uploadResult);
    
    // 5. Testar download URL
    console.log('🔗 Teste de URL:');
    const testURL = await getDownloadURL(uploadResult.ref);
    console.log('- URL obtida:', testURL);
    
    console.log('✅ DIAGNÓSTICO COMPLETO: TUDO OK!');
    return { success: true, testURL };
    
  } catch (error) {
    console.error('❌ ERRO NO DIAGNÓSTICO:', error);
    console.error('- Error code:', error.code);
    console.error('- Error message:', error.message);
    console.error('- Full error:', error);
    return { success: false, error };
  }
}

// Função para fazer upload de imagem para o Firebase Storage
async function uploadImageToStorage(file, impressoIndex, retryCount = 0) {
  const maxRetries = 3;
  const uploadTimeout = 60000; // 60 segundos
  
  try {
    // Verifica se o usuário está autenticado
    if (!currentUser.value) {
      throw new Error('Usuário não autenticado');
    }
    
    // Validação inicial
    if (!storage) {
      throw new Error('Firebase Storage não inicializado');
    }
    
    console.log(`🚀 Upload iniciado (tentativa ${retryCount + 1}/${maxRetries + 1}):`, {
      fileName: file.name,
      fileSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      userUID: currentUser.value.uid
    });
    
    // --- INÍCIO DA MODIFICAÇÃO: COMPRESSÃO DE IMAGEM ---
    console.log('Compressing image...');
    const options = {
      maxSizeMB: 1,           // (max file size in MB)
      maxWidthOrHeight: 1920, // (max width or height in pixels)
      useWebWorker: true,     // (use web worker for faster compression)
      fileType: 'image/webp'  // (output file type)
    };
    let compressedFile = file;
    try {
      compressedFile = await imageCompression(file, options);
      console.log(`Image compressed from ${(file.size / 1024 / 1024).toFixed(2)} MB to ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);
    } catch (error) {
      console.error('Error compressing image:', error);
      errorMessage.value = 'Erro ao comprimir imagem. Tentando upload sem compressão.';
      // Continue sem compressão se houver erro
    }
    // --- FIM DA MODIFICAÇÃO: COMPRESSÃO DE IMAGEM ---
    
    // Gera nome único e sanitizado para o arquivo
    const timestamp = Date.now();
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `impressos/est_${formData.value.numeroDaEstacao || 'temp'}_impresso_${impressoIndex}_${timestamp}_${cleanFileName}`;
    
    // Cria a referência no Storage
    const imageRef = storageRef(storage, fileName);
    
    // --- INÍCIO DA MODIFICAÇÃO: METADADOS COM CACHE-CONTROL ---
    const metadata = {
      contentType: compressedFile.type, // Use o tipo do arquivo comprimido
      cacheControl: 'public, max-age=31536000', // Cache por 1 ano
    };
    // --- FIM DA MODIFICAÇÃO: METADADOS COM CACHE-CONTROL ---
    
    // Inicia o upload com indicadores visuais
    uploadingImages.value[`impresso-${impressoIndex}`] = true;
    uploadProgress.value[`impresso-${impressoIndex}`] = 0;
    
    // Função para upload com timeout
    const uploadWithTimeout = () => {
      return Promise.race([
        // --- MODIFICAÇÃO: USAR compressedFile E metadata ---
        uploadBytes(imageRef, compressedFile, metadata),
        // --- FIM DA MODIFICAÇÃO ---
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Upload timeout - tentativa excedeu 60 segundos')), uploadTimeout)
        )
      ]);
    };
    
    // Executa o upload
    console.log('📤 Executando upload para:', fileName);
    const snapshot = await uploadWithTimeout();
    console.log('✅ Upload concluído! Snapshot:', {
      fullPath: snapshot.ref.fullPath,
      bucket: snapshot.ref.bucket,
      size: snapshot.totalBytes
    });
    
    // Obtém a URL de download com timeout
    console.log('🔗 Obtendo URL de download...');
    const downloadURLPromise = Promise.race([
      getDownloadURL(snapshot.ref),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout ao obter URL de download')), 10000)
      )
    ]);
    
    const downloadURL = await downloadURLPromise;
    console.log('🎉 URL de download obtida com sucesso:', downloadURL);
    
    // Atualiza o campo automaticamente
    if (formData.value.impressos[impressoIndex]?.conteudo) {
      formData.value.impressos[impressoIndex].conteudo.caminhoImagem = downloadURL;
      console.log('📝 Campo atualizado com sucesso');
    } else {
      console.warn('⚠️ Estrutura do impresso não encontrada:', formData.value.impressos[impressoIndex]);
      throw new Error('Estrutura de dados do impresso inválida');
    }
    
    // Finaliza o upload
    uploadingImages.value[`impresso-${impressoIndex}`] = false;
    uploadProgress.value[`impresso-${impressoIndex}`] = 100;
    
    successMessage.value = '✅ Imagem carregada com sucesso!';
    setTimeout(() => { successMessage.value = ''; }, 3000);
    
    return downloadURL;
    
  } catch (error) {
    console.error(`❌ Erro no upload (tentativa ${retryCount + 1}):`, {
      errorCode: error.code,
      errorMessage: error.message,
      fileName: file.name
    });
    
    // Limpa indicadores de upload
    uploadingImages.value[`impresso-${impressoIndex}`] = false;
    uploadProgress.value[`impresso-${impressoIndex}`] = 0;
    
    // Retry automático para erros temporários
    const retryableErrors = [
      'storage/retry-limit-exceeded',
      'storage/timeout',
      'storage/unknown',
      'network-request-failed'
    ];
    
    if (retryCount < maxRetries && (
      retryableErrors.includes(error.code) || 
      error.message.includes('timeout') ||
      error.message.includes('network')
    )) {
      console.log(`🔄 Tentando novamente em ${(retryCount + 1) * 2} segundos...`);
      await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 2000));
      return uploadImageToStorage(file, impressoIndex, retryCount + 1);
    }
    
    // Mensagens de erro específicas e usuário-amigáveis
    let errorMsg = 'Erro no upload da imagem';
    
    if (error.code === 'storage/unauthorized') {
      errorMsg = '🔒 Sem permissão para fazer upload. Verifique se você está logado como administrador.';
    } else if (error.code === 'storage/quota-exceeded') {
      errorMsg = '💾 Cota de armazenamento excedida. Contate o administrador.';
    } else if (error.code === 'storage/invalid-format') {
      errorMsg = '📄 Formato de arquivo inválido. Use JPG, PNG, GIF ou WebP.';
    } else if (error.code === 'storage/object-not-found') {
      errorMsg = '🔍 Arquivo não encontrado no storage.';
    } else if (error.code === 'storage/retry-limit-exceeded') {
      errorMsg = '⏱️ Muitas tentativas. Tente novamente em alguns minutos.';
    } else if (error.message.includes('timeout')) {
      errorMsg = '⏰ Upload demorou muito. Verifique sua conexão e tente novamente.';
    } else if (error.message.includes('network')) {
      errorMsg = '🌐 Problema de conexão. Verifique sua internet e tente novamente.';
    } else if (error.message.includes('Estrutura de dados')) {
      errorMsg = '⚠️ Erro interno: estrutura de dados inválida. Recarregue a página.';
    } else {
      errorMsg = `❌ ${error.message || 'Erro desconhecido no upload'}`;
    }
    
    errorMessage.value = errorMsg;
    setTimeout(() => { errorMessage.value = ''; }, 8000);
    
    throw error;
  }
}

// Função para lidar com a seleção de arquivo
function handleImageUpload(event, impressoIndex) {
  const file = event.target.files[0];
  if (!file) return;
  
  console.log('handleImageUpload chamado com:', {
    file: file.name,
    impressoIndex,
    currentUser: currentUser.value?.uid
  });
  
  // Verificações básicas
  if (!currentUser.value) {
    errorMessage.value = 'Você precisa estar logado para fazer upload de imagens.';
    setTimeout(() => { errorMessage.value = ''; }, 5000);
    return;
  }
  
  if (!storage) {
    errorMessage.value = 'Storage do Firebase não configurado.';
    setTimeout(() => { errorMessage.value = ''; }, 5000);
    return;
  }
  
  // Validações do arquivo
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (file.size > maxSize) {
    errorMessage.value = 'Arquivo muito grande. Máximo 10MB.';
    setTimeout(() => { errorMessage.value = ''; }, 5000);
    return;
  }
  
  if (!allowedTypes.includes(file.type)) {
    errorMessage.value = 'Tipo de arquivo não suportado. Use JPG, PNG, GIF ou WebP.';
    setTimeout(() => { errorMessage.value = ''; }, 5000);
    return;
  }
  
  // Faz o upload
  uploadImageToStorage(file, impressoIndex);
}

// Função para salvar alterações
async function saveStationChanges() {
  if (!stationId.value) {
    errorMessage.value = "Nenhum ID de estação para salvar.";
    return;
  }
  
  if (!isAdmin.value) {
    errorMessage.value = "Apenas administradores podem salvar alterações.";
    return;
  }

  isSaving.value = true;
  errorMessage.value = '';
  successMessage.value = '';

  try {
    const estacaoAtualizada = construirObjetoEstacao();
    
    console.log('🔄 Tentando salvar estação:', {
      id: stationId.value,
      titulo: estacaoAtualizada.tituloEstacao,
      usuario: currentUser.value?.uid,
      timestamp: new Date().toISOString()
    });
    
    if (!validarEstruturaEstacao(estacaoAtualizada)) {
      errorMessage.value = "Falha na validação da estrutura da estação. Verifique 'ID da Estação' e 'Título da Estação'.";
      isSaving.value = false;
      return;
    }
    
    if (typeof estacaoAtualizada.numeroDaEstacao !== 'number' || isNaN(estacaoAtualizada.numeroDaEstacao) || estacaoAtualizada.numeroDaEstacao <= 0) {
      errorMessage.value = "Erro de validação: O campo 'Número da Estação' deve ser um número válido e maior que zero.";
      isSaving.value = false;
      return;
    }

    if (!estacaoAtualizada.padraoEsperadoProcedimento?.itensAvaliacao?.length || estacaoAtualizada.padraoEsperadoProcedimento.itensAvaliacao.some(item => !item.idItem || !item.descricaoItem)) {
        errorMessage.value = "Erro de validação: O PEP (Checklist) deve conter pelo menos um item de avaliação com ID e Descrição preenchidos.";
        isSaving.value = false;
        return;
    }

    // Validação da pontuação total (deve ser exatamente 10)
    if (!isPontuacaoTotalValida.value) {
      const total = calcularPontuacaoTotalPEP.value;
      errorMessage.value = `Erro de validação: A pontuação total dos campos "Adequado" deve ser exatamente 10 pontos. Atualmente está ${total.toFixed(3)} pontos. Ajuste os valores antes de salvar.`;
      isSaving.value = false;
      return;
    }
    
    const stationDocRef = doc(db, 'estacoes_clinicas', stationId.value);
    
    // Detectar campos alterados
    const changedFields = detectChangedFields();
    
    // Criar entrada do histórico se houver mudanças
    let editHistoryEntry = null;
    if (changedFields.length > 0) {
      editHistoryEntry = {
        timestamp: new Date(),
        userId: currentUser.value?.uid || 'unknown',
        userName: currentUser.value?.displayName || currentUser.value?.email || 'Usuário Desconhecido',
        changedFields: changedFields,
        totalChangedFields: changedFields.length
      };
    }
    
    // Preparar dados para salvar incluindo histórico
    const currentEditHistory = originalStationData.value?.editHistory || [];
    const updatedEditHistory = editHistoryEntry ? [...currentEditHistory, editHistoryEntry] : currentEditHistory;
    
    const dataToSave = {
      ...estacaoAtualizada,
      atualizadoEmTimestamp: serverTimestamp(),
      editHistory: updatedEditHistory,
      hasBeenEdited: updatedEditHistory.length > 0,
      totalEdits: updatedEditHistory.length,
      // Manter campos de integração se existirem, senão adicionar padrões
      mediaNotas: originalStationData.value?.mediaNotas || 0,
      totalAvaliacoes: originalStationData.value?.totalAvaliacoes || 0,
      usuariosQueConcluíram: originalStationData.value?.usuariosQueConcluíram || []
    };

    await updateDoc(stationDocRef, dataToSave);
    
    console.log('✅ Estação salva com sucesso no Firestore:', {
      id: stationId.value,
      coleção: 'estacoes_clinicas',
      campos_alterados: changedFields.length,
      timestamp: new Date().toISOString()
    });
    
    // Atualizar status de edição local
    if (editHistoryEntry) {
      editStatus.value = {
        hasBeenEdited: true,
        totalEdits: updatedEditHistory.length,
        lastEditDate: new Date(),
        lastEditBy: currentUser.value?.displayName || currentUser.value?.email || 'Usuário Desconhecido'
      };
      
      successMessage.value = `Estação "${estacaoAtualizada.tituloEstacao}" atualizada com sucesso! ${changedFields.length} campo(s) alterado(s): ${changedFields.join(', ')}.`;
    } else {
      successMessage.value = `Estação "${estacaoAtualizada.tituloEstacao}" salva (nenhuma alteração detectada).`;
    }
    
    setTimeout(() => { successMessage.value = ''; }, 5000);

  } catch (error) {
    console.error("Erro ao salvar alterações da estação:", error);
    let detalheErro = error.message;
    if (error.code === 'permission-denied') {
      detalheErro += " (ERRO DE PERMISSÃO DO FIRESTORE - Verifique as regras de segurança e o UID do admin)";
    }
    errorMessage.value = `Falha ao salvar: ${detalheErro}`;
  } finally {
    isSaving.value = false;
  }
}

// Função para excluir a estação
async function deleteStation() {
  if (!stationId.value) {
    errorMessage.value = "Nenhuma estação para excluir.";
    return;
  }
  
  if (!isAdmin.value) {
    errorMessage.value = "Apenas administradores podem excluir estações.";
    return;
  }
  
  const confirmDelete = confirm(`ATENÇÃO: Você está prestes a EXCLUIR permanentemente a estação "${formData.value.tituloEstacao}". Esta ação NÃO pode ser desfeita. Deseja continuar?`);
  
  if (!confirmDelete) {
    return;
  }
  
  isSaving.value = true;
  errorMessage.value = '';
  
  try {
    const stationDocRef = doc(db, 'estacoes_clinicas', stationId.value);
    await deleteDoc(stationDocRef);
    
    successMessage.value = "Estação excluída com sucesso!";
    
    setTimeout(() => {
      router.push('/app/station-list');
    }, 1500);
    
  } catch (error) {
    console.error("Erro ao excluir estação:", error);
    errorMessage.value = `Falha ao excluir: ${error.message}`;
    isSaving.value = false;
  }
}

// Estado do download
const isDownloading = ref(false);
const downloadMessage = ref('');

// Função para fazer download da estação atual como JSON
async function downloadCurrentStationJSON() {
  if (!stationId.value) {
    errorMessage.value = 'ID da estação não encontrado';
    return;
  }

  isDownloading.value = true;
  downloadMessage.value = 'Preparando download...';
  errorMessage.value = '';

  try {
    // URL do backend para download da estação específica
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
    const downloadUrl = `${backendUrl}/api/stations/${stationId.value}/download-json`;

    console.log('🔽 Iniciando download da estação:', stationId.value);
    
    const response = await fetch(downloadUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Erro HTTP: ${response.status}`);
    }

    // Obter dados JSON
    const jsonData = await response.json();
    
    // Criar blob e fazer download
    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { 
      type: 'application/json' 
    });
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Nome do arquivo baseado na estação
    const fileName = `estacao_${stationId.value}_${new Date().toISOString().split('T')[0]}.json`;
    link.download = fileName;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    downloadMessage.value = 'Download concluído com sucesso!';
    successMessage.value = `Arquivo ${fileName} baixado com sucesso!`;
    
    console.log('✅ Download concluído:', fileName);
    
    // Limpar mensagem após alguns segundos
    setTimeout(() => {
      downloadMessage.value = '';
      successMessage.value = '';
    }, 3000);

  } catch (error) {
    console.error('❌ Erro no download:', error);
    errorMessage.value = `Falha no download: ${error.message}`;
    downloadMessage.value = '';
  } finally {
    isDownloading.value = false;
  }
}

// Função para fazer download de todas as estações da coleção
async function downloadAllStationsJSON() {
  isDownloading.value = true;
  downloadMessage.value = 'Preparando download de todas as estações...';
  errorMessage.value = '';

  try {
    // URL do backend para download de todas as estações
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
    const downloadUrl = `${backendUrl}/api/stations/download-json`;

    console.log('🔽 Iniciando download de todas as estações');
    
    const response = await fetch(downloadUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Erro HTTP: ${response.status}`);
    }

    // Obter informações dos headers
    const totalStations = response.headers.get('X-Total-Stations');
    const downloadTimestamp = response.headers.get('X-Download-Timestamp');

    // Obter dados JSON
    const jsonData = await response.json();
    
    // Criar blob e fazer download
    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { 
      type: 'application/json' 
    });
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Nome do arquivo com data
    const fileName = `estacoes_clinicas_completo_${new Date().toISOString().split('T')[0]}.json`;
    link.download = fileName;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    downloadMessage.value = `Download concluído! ${totalStations} estações baixadas.`;
    successMessage.value = `Arquivo ${fileName} baixado com sucesso!`;
    
    console.log('✅ Download de todas as estações concluído:', fileName);
    console.log(`📊 Total de estações: ${totalStations}`);
    
    // Limpar mensagem após alguns segundos
    setTimeout(() => {
      downloadMessage.value = '';
      successMessage.value = '';
    }, 4000);

  } catch (error) {
    console.error('❌ Erro no download completo:', error);
    errorMessage.value = `Falha no download: ${error.message}`;
    downloadMessage.value = '';
  } finally {
    isDownloading.value = false;
  }
}

// Funções auxiliares para manipular arrays dinâmicos
function adicionarInfoVerbal() {
  const proximaPos = formData.value.informacoesVerbaisSimulado.length + 1;
  const novaInfoVerbal = {
    idInfoVerbal: `infoVerbal_${Date.now()}_${proximaPos}`,
    contextoOuPerguntaChave: '',
    informacao: ''
  };
  
  // Se há mais de uma info verbal, perguntar onde inserir
  if (formData.value.informacoesVerbaisSimulado.length > 0) {
    newInfoVerbalPosition.value = novaInfoVerbal;
    showPositionDialogInfoVerbal.value = true;
  } else {
    formData.value.informacoesVerbaisSimulado.push(novaInfoVerbal);
  }
}

function adicionarInfoVerbalNaPosicao(posicao) {
  if (newInfoVerbalPosition.value) {
    if (posicao === 'fim') {
      formData.value.informacoesVerbaisSimulado.push(newInfoVerbalPosition.value);
    } else {
      const index = parseInt(posicao) - 1; // Converte posição 1-based para index 0-based
      formData.value.informacoesVerbaisSimulado.splice(index, 0, newInfoVerbalPosition.value);
    }
    
    // Reset dialog
    newInfoVerbalPosition.value = null;
    showPositionDialogInfoVerbal.value = false;
  }
}

function cancelarAdicaoInfoVerbal() {
  newInfoVerbalPosition.value = null;
  showPositionDialogInfoVerbal.value = false;
}

function removerInfoVerbal(index) {
  if (formData.value.informacoesVerbaisSimulado.length > 1) {
    formData.value.informacoesVerbaisSimulado.splice(index, 1);
  }
}

// Funções de reordenação para informações verbais
function moverInfoVerbalParaCima(index) {
  if (index > 0) {
    const infos = formData.value.informacoesVerbaisSimulado;
    const info = infos[index];
    infos.splice(index, 1);
    infos.splice(index - 1, 0, info);
  }
}

function moverInfoVerbalParaBaixo(index) {
  const infos = formData.value.informacoesVerbaisSimulado;
  if (index < infos.length - 1) {
    const info = infos[index];
    infos.splice(index, 1);
    infos.splice(index + 1, 0, info);
  }
}

function moverInfoVerbalParaPosicao(index, novaPosicao) {
  const infos = formData.value.informacoesVerbaisSimulado;
  const novoIndex = parseInt(novaPosicao) - 1; // Converte posição 1-based para index 0-based
  
  if (novoIndex >= 0 && novoIndex < infos.length && novoIndex !== index) {
    const info = infos[index];
    infos.splice(index, 1);
    infos.splice(novoIndex, 0, info);
  }
}

function adicionarImpresso() {
  const novoImpresso = {
    idImpresso: `imp_${Date.now()}_${formData.value.impressos.length + 1}`,
    tituloImpresso: '',
    tipoConteudo: 'texto_simples',
    conteudo: { texto: '' }
  };
  formData.value.impressos.push(novoImpresso);
}

function removerImpresso(index) {
  // Permite remover todos os impressos - array pode ficar vazio
  formData.value.impressos.splice(index, 1);
}

// Funções de reordenação para impressos
function moverImpressoParaCima(index) {
  if (index > 0) {
    const impressos = formData.value.impressos;
    const impresso = impressos[index];
    impressos.splice(index, 1);
    impressos.splice(index - 1, 0, impresso);
  }
}

function moverImpressoParaBaixo(index) {
  const impressos = formData.value.impressos;
  if (index < impressos.length - 1) {
    const impresso = impressos[index];
    impressos.splice(index, 1);
    impressos.splice(index + 1, 0, impresso);
  }
}

function moverImpressoParaPosicao(index, novaPosicao) {
  const impressos = formData.value.impressos;
  const novoIndex = parseInt(novaPosicao) - 1; // Converte posição 1-based para index 0-based
  
  if (novoIndex >= 0 && novoIndex < impressos.length && novoIndex !== index) {
    const impresso = impressos[index];
    impressos.splice(index, 1);
    impressos.splice(novoIndex, 0, impresso);
  }
}

function onTipoConteudoChange(impresso) {
  // Inicializa a estrutura de conteúdo baseada no tipo selecionado
  if (impresso.tipoConteudo === 'texto_simples') {
    impresso.conteudo = { texto: '' };
  } else if (impresso.tipoConteudo === 'imagem_com_texto') {
    impresso.conteudo = { 
      texto: impresso.conteudo?.texto || '', 
      imagemUrl: impresso.conteudo?.imagemUrl || '' 
    };
  } else if (impresso.tipoConteudo === 'lista_chave_valor_secoes') {
    impresso.conteudo = { 
      secoes: impresso.conteudo?.secoes || [
        {
          tituloSecao: '',
          itens: [{ chave: '', valor: '' }]
        }
      ]
    };
  }
}

function adicionarSecaoImpresso(impresso) {
  // Garante que a estrutura existe antes de adicionar
  if (!impresso.conteudo) {
    impresso.conteudo = {};
  }
  if (!impresso.conteudo.secoes) {
    impresso.conteudo.secoes = [];
  }
  
  impresso.conteudo.secoes.push({
    tituloSecao: '',
    itens: [{ chave: '', valor: '' }]
  });
}

function adicionarItemSecao(secao) {
  // Garante que a estrutura existe antes de adicionar
  if (!secao.itens) {
    secao.itens = [];
  }
  
  secao.itens.push({ chave: '', valor: '' });
}

function removerSecaoImpresso(impresso, secaoIndex) {
  // Garante que a estrutura existe e tem pelo menos uma seção
  if (!impresso.conteudo) {
    impresso.conteudo = {};
  }
  if (!impresso.conteudo.secoes) {
    impresso.conteudo.secoes = [];
  }
  
  // Só remove se há mais de uma seção
  if (impresso.conteudo.secoes.length > 1) {
    impresso.conteudo.secoes.splice(secaoIndex, 1);
  }
}

function removerItemSecao(secao, itemIndex) {
  // Garante que a estrutura existe e tem pelo menos um item
  if (!secao.itens) {
    secao.itens = [];
  }
  
  // Só remove se há mais de um item
  if (secao.itens.length > 1) {
    secao.itens.splice(itemIndex, 1);
  }
}

function adicionarFocoPrincipalPEP() {
  formData.value.padraoEsperadoProcedimento.sinteseEstacao.focoPrincipalDetalhado.push('');
}

function removerFocoPrincipalPEP(index) {
  if (formData.value.padraoEsperadoProcedimento.sinteseEstacao.focoPrincipalDetalhado.length > 1) {
    formData.value.padraoEsperadoProcedimento.sinteseEstacao.focoPrincipalDetalhado.splice(index, 1);
  }
}

// Refs para controle de posição ao adicionar item
const showPositionDialog = ref(false);
const newItemPosition = ref(null);

// Refs para controle de posição ao adicionar informação verbal
const showPositionDialogInfoVerbal = ref(false);
const newInfoVerbalPosition = ref(null);

function adicionarItemAvaliacaoPEP() {
  const proximaPos = formData.value.padraoEsperadoProcedimento.itensAvaliacao.length + 1;
  const novoItem = {
    idItem: `itempep_${Date.now()}_${proximaPos}`,
    itemNumeroOficial: proximaPos.toString(),
    descricaoItem: '',
    pontuacoes: {
      adequado: { criterio: 'Realizou corretamente e completamente.', pontos: 0 },
      parcialmenteAdequado: { criterio: 'Realizou parcialmente ou com pequenas falhas.', pontos: 0 },
      inadequado: { criterio: 'Não realizou ou realizou incorretamente.', pontos: 0 }
    }
  };
  
  // Se há mais de um item, perguntar onde inserir
  if (formData.value.padraoEsperadoProcedimento.itensAvaliacao.length > 0) {
    newItemPosition.value = novoItem;
    showPositionDialog.value = true;
  } else {
    formData.value.padraoEsperadoProcedimento.itensAvaliacao.push(novoItem);
    // Atualiza números oficiais após adicionar
    atualizarNumerosOficiaisItens();
  }
}

function adicionarItemNaPosicao(posicao) {
  if (newItemPosition.value) {
    if (posicao === 'fim') {
      formData.value.padraoEsperadoProcedimento.itensAvaliacao.push(newItemPosition.value);
    } else {
      const index = parseInt(posicao) - 1; // Converte posição 1-based para index 0-based
      formData.value.padraoEsperadoProcedimento.itensAvaliacao.splice(index, 0, newItemPosition.value);
    }
    
    // Atualiza números oficiais após adicionar
    atualizarNumerosOficiaisItens();
    
    // Reset dialog
    newItemPosition.value = null;
    showPositionDialog.value = false;
  }
}

function cancelarAdicaoItem() {
  newItemPosition.value = null;
  showPositionDialog.value = false;
}

function removerItemAvaliacaoPEP(index) {
  if (formData.value.padraoEsperadoProcedimento.itensAvaliacao.length > 1) {
    formData.value.padraoEsperadoProcedimento.itensAvaliacao.splice(index, 1);
    // Atualiza números oficiais após remover
    atualizarNumerosOficiaisItens();
  }
}

// Funções de reordenação
function moverItemPEPParaCima(index) {
  if (index > 0) {
    const itens = formData.value.padraoEsperadoProcedimento.itensAvaliacao;
    const item = itens[index];
    itens.splice(index, 1);
    itens.splice(index - 1, 0, item);
    // Atualiza números oficiais após mover
    atualizarNumerosOficiaisItens();
  }
}

function moverItemPEPParaBaixo(index) {
  const itens = formData.value.padraoEsperadoProcedimento.itensAvaliacao;
  if (index < itens.length - 1) {
    const item = itens[index];
    itens.splice(index, 1);
    itens.splice(index + 1, 0, item);
    // Atualiza números oficiais após mover
    atualizarNumerosOficiaisItens();
  }
}

function moverItemPEPParaPosicao(index, novaPosicao) {
  const itens = formData.value.padraoEsperadoProcedimento.itensAvaliacao;
  const novoIndex = parseInt(novaPosicao) - 1; // Converte posição 1-based para index 0-based
  
  if (novoIndex >= 0 && novoIndex < itens.length && novoIndex !== index) {
    const item = itens[index];
    itens.splice(index, 1);
    itens.splice(novoIndex, 0, item);
    // Atualiza números oficiais após mover
    atualizarNumerosOficiaisItens();
  }
}

// Função para atualizar números oficiais dos itens com base na posição
function atualizarNumerosOficiaisItens() {
  if (formData.value.padraoEsperadoProcedimento?.itensAvaliacao) {
    formData.value.padraoEsperadoProcedimento.itensAvaliacao.forEach((item, index) => {
      item.itemNumeroOficial = (index + 1).toString();
    });
  }
}

// Watch para monitorar mudanças na ordem dos itens e atualizar números oficiais
watch(
  () => formData.value.padraoEsperadoProcedimento?.itensAvaliacao?.map(item => item.idItem).join(','),
  () => {
    atualizarNumerosOficiaisItens();
  }
);

// Funções para gerenciar as fontes do feedback
function adicionarFonteFeedback() {
  formData.value.padraoEsperadoProcedimento.feedbackEstacao.fontes.push('');
}

function removerFonteFeedback(index) {
  const fontes = formData.value.padraoEsperadoProcedimento.feedbackEstacao.fontes;
  if (fontes.length > 1) {
    fontes.splice(index, 1);
  } else {
    // Se for a última fonte, limpa o conteúdo mas mantém pelo menos uma
    fontes[0] = '';
  }
}

// Função para lidar com atalhos de teclado
function handleKeydown(event) {
  // Ctrl+S ou Cmd+S para salvar
  if ((event.ctrlKey || event.metaKey) && event.key === 's') {
    event.preventDefault(); // Previne o comportamento padrão do navegador
    if (!isSaving.value) {
      keyboardShortcutUsed.value = true;
      saveStationChanges();
      
      // Remove o feedback após 2 segundos
      setTimeout(() => {
        keyboardShortcutUsed.value = false;
      }, 2000);
    }
  }
}

// Lifecycle
onMounted(async () => {
  // Debug adicional
  console.log('🔧 onMounted - Debug completo:', {
    routePath: route.path,
    routeName: route.name,
    routeParams: route.params,
    propsId: props.id,
    currentStationId: stationId.value,
    isLoading: isLoading.value
  });
  
  // 🔧 BACKUP: Se stationId existe mas ainda está loading, forçar carregamento
  if (stationId.value && isLoading.value) {
    console.log('🔄 BACKUP: Forçando fetchStationData no onMounted');
    setTimeout(() => {
      if (isLoading.value) {
        console.log('🚨 TIMEOUT: Ainda carregando, executando fetchStationData agora!');
        fetchStationData();
      }
    }, 1000);
  }
  
  // O watch com immediate: true já chama fetchStationData na montagem se route.params.id estiver presente
  
  // Debug e teste do Storage no mount
  console.log('🔧 Verificações no mount:');
  console.log('Storage disponível:', !!storage);
  console.log('Usuário atual:', currentUser.value?.uid);
  console.log('Admin status:', isAdmin.value);
  
  // Testa conectividade do Storage
  if (testStorageConnection) {
    try {
      const storageOK = await testStorageConnection();
      console.log('🧪 Teste de conectividade do Storage:', storageOK ? '✅ OK' : '❌ FALHOU');
      
      if (!storageOK) {
        console.warn('⚠️ Storage pode estar com problemas de conectividade');
      }
    } catch (error) {
      console.error('❌ Erro no teste de conectividade:', error);
    }
  }
  
  // Adiciona o listener de teclado
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  // Remove o listener de teclado para evitar vazamentos de memória
  document.removeEventListener('keydown', handleKeydown);
});

// 🔧 CORREÇÃO: Watch mais robusto com debug
watch(() => route.params.id, (newId) => {
  console.log('🔍 Watch route.params.id:', { 
    newId, 
    currentStationId: stationId.value,
    newIdType: typeof newId,
    currentStationIdType: typeof stationId.value,
    areEqual: newId === stationId.value,
    truthyNewId: !!newId
  });
  
  if (newId) {
    if (newId !== stationId.value) {
      console.log('📥 Atualizando stationId e carregando dados:', newId);
      stationId.value = newId;
      fetchStationData();
    } else {
      console.log('🔄 ID igual, não recarregando - MAS VAMOS FORÇAR O CARREGAMENTO!');
      // 🔧 CORREÇÃO: Forçar carregamento se ainda estiver loading
      if (isLoading.value) {
        console.log('🔄 Ainda está carregando, forçando fetchStationData');
        fetchStationData();
      }
    }
  } else {
    console.log('⚠️ Nenhum ID na rota');
  }
}, { immediate: true });

// Também watch props.id se vier direto
watch(() => props.id, (newId) => {
  console.log('🔍 Watch props.id:', { newId, currentStationId: stationId.value });
  if (newId && newId !== stationId.value) {
    console.log('📥 Atualizando stationId via props:', newId);
    stationId.value = newId;
    fetchStationData();
  }
}, { immediate: true });
</script>

<template>
  <!-- 🎨 NOVO LAYOUT: Container principal otimizado -->
  <div 
    :class="[
      'edit-station-main-container',
      isDarkTheme ? 'edit-station-main-container--dark' : 'edit-station-main-container--light'
      // REMOVIDO: { 'with-ai-panel': showAIPanel } - painel antigo desabilitado
    ]"
  >
    <!-- 📝 Área de edição (esquerda) -->
    <div class="edit-content-area">
      <div class="edit-scrollable-content">
        <div 
          :class="[
            'edit-station-container',
            isDarkTheme ? 'edit-station-container--dark' : 'edit-station-container--light'
          ]"
        >
          <div 
            :class="[
              'admin-upload-page',
              isDarkTheme ? 'admin-upload-page--dark' : 'admin-upload-page--light'
            ]"
          >
    <div class="d-flex justify-space-between align-center mb-4">
      <button @click="router.push('/app/station-list')" class="back-button">
        ← Voltar para Lista
      </button>
      <h2>Editar Estação Clínica</h2>
      <div class="action-buttons">
        <!-- Botão do Painel de IA -->
        <!-- REMOVIDO: Botão do painel antigo - agora usamos IA integrada em cada campo -->
        <!-- 
        <button 
          v-if="stationId && !isLoading" 
          @click="toggleAIPanel"
          :disabled="isSaving"
          class="ai-panel-button"
          :class="{ 'active': showAIPanel }"
          title="Abrir painel de correção por IA"
        >
          <span v-if="isGeneratingContext">🔄</span>
          <span v-else>🤖</span>
          IA
        </button>
        -->
        
        <!-- Botões de Download -->
        <button 
          v-if="stationId" 
          @click="downloadCurrentStationJSON" 
          :disabled="isDownloading || isSaving"
          class="download-button"
          title="Baixar dados desta estação em formato JSON"
        >
          📥 Download JSON
        </button>
        
        <button 
          v-if="isAdmin" 
          @click="downloadAllStationsJSON" 
          :disabled="isDownloading || isSaving"
          class="download-all-button"
          title="Baixar todas as estações da coleção em formato JSON"
        >
          📦 Download Todas
        </button>
        
        <!-- Botão de Exclusão -->
        <button 
          v-if="stationId && isAdmin" 
          @click="deleteStation" 
          :disabled="isSaving || isDownloading"
          class="delete-button"
        >
          🗑️ Apagar Estação
        </button>
      </div>
    </div>

    <!-- Mensagem de status do download -->
    <div v-if="downloadMessage" class="status-message-internal info">
      {{ downloadMessage }}
    </div>

    <div v-if="isLoading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>Carregando estação...</p>
    </div>

    <div v-if="errorMessage" class="status-message-internal erro">{{ errorMessage }}</div>
    <div v-if="keyboardShortcutUsed" class="status-message-internal keyboard-shortcut">⌨️ Atalho do teclado usado!</div>

    <div v-if="!isLoading && !isAdmin" class="status-message-internal erro">
      Você não tem permissão para editar esta estação.
    </div>

    <div v-if="!isLoading && isAdmin && stationId" class="tab-content">
      <!-- Status de Edição -->
      <div v-if="originalStationData" class="edit-status-card">
        <div class="edit-status-header">
          <h4>📝 Status de Edição</h4>
          <div class="edit-status-badge" :class="editStatus.hasBeenEdited ? 'edited' : 'not-edited'">
            {{ editStatus.hasBeenEdited ? 'EDITADA' : 'NÃO EDITADA' }}
          </div>
        </div>
        <div class="edit-status-details">
          <div class="status-row">
            <span class="status-label">Total de Edições:</span>
            <span class="status-value">{{ editStatus.totalEdits }}</span>
          </div>
          <div v-if="editStatus.hasBeenEdited" class="status-row">
            <span class="status-label">Última Edição:</span>
            <span class="status-value">
              {{ editStatus.lastEditDate ? editStatus.lastEditDate.toLocaleString('pt-BR') : 'N/A' }}
            </span>
          </div>
          <div v-if="editStatus.hasBeenEdited" class="status-row">
            <span class="status-label">Editado Por:</span>
            <span class="status-value">Administrador</span>
          </div>
        </div>
      </div>

      <div class="card">
        <h3>Editando Estação ID: {{ stationId }}</h3>
        <form @submit.prevent="saveStationChanges" class="manual-form">
          <h4>Dados Gerais da Estação</h4>
          <div class="form-group">
            <label for="manualIdEstacao">ID da Estação (identificador único para o conteúdo, ex: cardio_iam_001):</label>
            <input type="text" id="manualIdEstacao" v-model="formData.idEstacao" required placeholder="Ex: cardio_iam_001">
          </div>
          <div class="form-group">
            <label for="manualTituloEstacao">Título da Estação (como aparecerá na lista):</label>
            <AIFieldAssistant
              field-name="tituloEstacao"
              field-label="Título da Estação"
              v-model="formData.tituloEstacao"
              :station-context="stationContext"
              :station-id="stationId"
              @field-updated="handleAIFieldUpdate"
            >
              <input type="text" id="manualTituloEstacao" v-model="formData.tituloEstacao" required placeholder="Ex: Atendimento ao Paciente com Dor Torácica Aguda">
            </AIFieldAssistant>
          </div>
          
          <div class="form-group">
            <label for="manualNumeroDaEstacao">Número da Estação (para ordenação numérica):</label>
            <input type="number" id="manualNumeroDaEstacao" v-model.number="formData.numeroDaEstacao" required min="1" placeholder="Ex: 1, 2, 10">
          </div>

          <div class="form-group">
            <label for="manualEspecialidade">Especialidade (Área):</label>
            <input type="text" id="manualEspecialidade" v-model="formData.especialidade" required placeholder="Ex: Cardiologia, Clínica Médica">
          </div>
          <div class="form-group">
            <label for="manualTempoDuracaoMinutos">Tempo de Duração (minutos):</label>
            <input type="number" id="manualTempoDuracaoMinutos" v-model.number="formData.tempoDuracaoMinutos" min="1" required>
          </div>
          <div class="form-group">
            <label for="manualPalavrasChave">Palavras-Chave (separadas por vírgula):</label>
            <input type="text" id="manualPalavrasChave" v-model="formData.palavrasChave" placeholder="Ex: infarto, ECG, anamnese, dor precordial">
          </div>
          <div class="form-group">
            <label for="manualNivelDificuldade">Nível de Dificuldade:</label>
            <select id="manualNivelDificuldade" v-model="formData.nivelDificuldade">
              <option>Fácil</option>
              <option>Médio</option>
              <option>Difícil</option>
            </select>
          </div>

          <h4>Instruções para o Participante (Candidato)</h4>
          <div class="form-group">
            <label for="manualDescricaoCaso">Descrição Completa do Caso para o Candidato:</label>
            <AIFieldAssistant
              field-name="descricaoCasoCompleta"
              field-label="Descrição do Caso"
              v-model="formData.descricaoCasoCompleta"
              :station-context="stationContext"
              :station-id="stationId"
              @field-updated="handleAIFieldUpdate"
            >
              <textarea id="manualDescricaoCaso" v-model="formData.descricaoCasoCompleta" rows="5" required placeholder="Descreva o cenário clínico que o candidato encontrará..."></textarea>
            </AIFieldAssistant>
          </div>
          <div class="form-group">
            <label for="manualTarefasPrincipais">Tarefas Principais do Candidato (uma por linha):</label>
            <AIFieldAssistant
              field-name="tarefasPrincipais"
              field-label="Tarefas Principais"
              v-model="formData.tarefasPrincipais"
              :station-context="stationContext"
              :station-id="stationId"
              @field-updated="handleAIFieldUpdate"
            >
              <textarea id="manualTarefasPrincipais" v-model="formData.tarefasPrincipais" rows="4" required placeholder="Ex: Realizar anamnese completa.&#10;Interpretar o ECG.&#10;Propor conduta inicial."></textarea>
            </AIFieldAssistant>
          </div>
          <div class="form-group">
            <label for="manualAvisosImportantes">Avisos Importantes para o Candidato (um por linha, opcional):</label>
            <textarea id="manualAvisosImportantes" v-model="formData.avisosImportantes" rows="3" placeholder="Ex: O paciente simulado pode apresentar instabilidade.&#10;Comunique-se de forma clara e objetiva com o paciente e/ou acompanhante."></textarea>
          </div>

          <h4>Cenário de Atendimento (Visível para o Candidato)</h4>
          <div class="form-group">
            <label for="manualNivelAtencao">Nível de Atenção:</label>
            <input type="text" id="manualNivelAtencao" v-model="formData.cenarioAtendimento_nivelAtencao" placeholder="Ex: atenção primária, secundária, terciária">
          </div>
          <div class="form-group">
            <label for="manualTipoAtendimento">Tipo de Atendimento:</label>
            <input type="text" id="manualTipoAtendimento" v-model="formData.cenarioAtendimento_tipoAtendimento" placeholder="Ex: ambulatorial, emergência, enfermaria">
          </div>
          <div class="form-group">
            <label for="manualInfraestrutura">Infraestrutura da Unidade Disponível (separar por ponto e vírgula ";"):</label>
            <textarea id="manualInfraestrutura" v-model="formData.cenarioAtendimento_infraestruturaUnidade" rows="3" placeholder="Ex: maca; monitor cardíaco; acesso venoso periférico; materiais para intubação"></textarea>
          </div>

          <h4>Roteiro do Ator / Informações Verbais (para o Ator/Avaliador)</h4>
          <div v-for="(info, index) in formData.informacoesVerbaisSimulado" :key="info.idInfoVerbal" class="dynamic-item-group info-verbal-item">
            <div class="info-verbal-header">
              <h5>Informação Verbal {{ index + 1 }}</h5>
              <div class="info-verbal-controls">
                <div class="position-controls">
                  <label :for="'posicaoInfoVerbal' + index" class="position-label">Posição:</label>
                  <select 
                    :id="'posicaoInfoVerbal' + index" 
                    :value="index + 1" 
                    @change="moverInfoVerbalParaPosicao(index, $event.target.value)"
                    class="position-select"
                  >
                    <option v-for="pos in formData.informacoesVerbaisSimulado.length" :key="pos" :value="pos">{{ pos }}</option>
                  </select>
                </div>
                <div class="move-buttons">
                  <button 
                    type="button" 
                    @click="moverInfoVerbalParaCima(index)" 
                    :disabled="index === 0"
                    class="move-button move-up"
                    title="Mover para cima"
                  >
                    ↑
                  </button>
                  <button 
                    type="button" 
                    @click="moverInfoVerbalParaBaixo(index)" 
                    :disabled="index === formData.informacoesVerbaisSimulado.length - 1"
                    class="move-button move-down"
                    title="Mover para baixo"
                  >
                    ↓
                  </button>
                </div>
                <button type="button" @click="removerInfoVerbal(index)" class="remove-item-button-header">Remover Informação Verbal</button>
              </div>
            </div>
            <div class="form-group">
              <label :for="'infoVerbalContexto' + index">Contexto ou Pergunta-Chave do Candidato:</label>
              <AIFieldAssistant
                :field-name="`informacoesVerbaisSimulado.${index}.contextoOuPerguntaChave`"
                field-label="Contexto da Informação Verbal"
                v-model="info.contextoOuPerguntaChave"
                :station-context="stationContext"
                :station-id="stationId"
                :item-index="index"
                @field-updated="handleAIFieldUpdate"
              >
                <input type="text" :id="'infoVerbalContexto' + index" v-model="info.contextoOuPerguntaChave" placeholder="Ex: Se o candidato perguntar sobre alergias...">
              </AIFieldAssistant>
            </div>
            <div class="form-group">
              <label :for="'infoVerbalInformacao' + index">Informação a ser Fornecida pelo Ator:</label>
              <AIFieldAssistant
                :field-name="`informacoesVerbaisSimulado.${index}.informacao`"
                field-label="Informação do Ator"
                v-model="info.informacao"
                :station-context="stationContext"
                :station-id="stationId"
                :item-index="index"
                @field-updated="handleAIFieldUpdate"
              >
                <textarea :id="'infoVerbalInformacao' + index" v-model="info.informacao" rows="2" placeholder="Ex: Diga que o paciente é alérgico à penicilina."></textarea>
              </AIFieldAssistant>
            </div>
          </div>
          <button type="button" @click="adicionarInfoVerbal" class="add-item-button">+ Adicionar Informação Verbal</button>

          <h4>Materiais Disponíveis (Impressos a serem liberados pelo Ator/Avaliador)</h4>
          <div v-if="formData.impressos.length === 0" class="empty-state-message">
            <p>Nenhum impresso adicionado. Impressos são opcionais - use o botão abaixo para adicionar materiais se necessário.</p>
          </div>
          <div v-for="(impresso, index) in formData.impressos" :key="impresso.idImpresso" class="dynamic-item-group">
            <div class="impresso-header">
              <h5>Impresso {{ index + 1 }}</h5>
              <div class="impresso-controls">
                <div class="position-controls">
                  <label :for="'posicaoImpresso' + index" class="position-label">Posição:</label>
                  <select 
                    :id="'posicaoImpresso' + index" 
                    :value="index + 1" 
                    @change="moverImpressoParaPosicao(index, $event.target.value)"
                    class="position-select"
                  >
                    <option v-for="pos in formData.impressos.length" :key="pos" :value="pos">{{ pos }}</option>
                  </select>
                </div>
                <div class="move-buttons">
                  <button 
                    type="button" 
                    @click="moverImpressoParaCima(index)" 
                    :disabled="index === 0"
                    class="move-button move-up"
                    title="Mover para cima"
                  >
                    ↑
                  </button>
                  <button 
                    type="button" 
                    @click="moverImpressoParaBaixo(index)" 
                    :disabled="index === formData.impressos.length - 1"
                    class="move-button move-down"
                    title="Mover para baixo"
                  >
                    ↓
                  </button>
                </div>
                <button type="button" @click="removerImpresso(index)" class="remove-item-button-header">Remover Impresso</button>
              </div>
            </div>
            <div class="form-group" style="display: none;">
              <label :for="'impressoId' + index">ID do Impresso (único, ex: ecg_inicial):</label>
              <input type="text" :id="'impressoId' + index" v-model="impresso.idImpresso" required>
            </div>
            <div class="form-group">
              <label :for="'impressoTitulo' + index">Título do Impresso (Ex: ECG de 12 Derivações):</label>
              <input type="text" :id="'impressoTitulo' + index" v-model="impresso.tituloImpresso" required>
            </div>
            <div class="form-group">
              <label :for="'impressoTipoConteudo' + index">Tipo de Conteúdo do Impresso:</label>
              <select :id="'impressoTipoConteudo' + index" v-model="impresso.tipoConteudo" @change="onTipoConteudoChange(impresso)">
                <option value="texto_simples">Texto Simples</option>
                <option value="imagem_com_texto">Imagem com Texto/Laudo</option>
                <option value="lista_chave_valor_secoes">Lista Chave-Valor (Exames)</option>
              </select>
            </div>

            <div v-if="impresso.tipoConteudo === 'texto_simples'" class="form-group">
              <label :for="'impressoConteudoTexto' + index">Conteúdo (texto):</label>
              <textarea :id="'impressoConteudoTexto' + index" v-model="impresso.conteudo.texto" rows="3" placeholder="Insira o texto do impresso aqui..."></textarea>
            </div>
            <div v-if="impresso.tipoConteudo === 'imagem_com_texto'">
              <div class="form-group">
                <label :for="'impressoConteudoImgDesc' + index">Texto Descritivo (opcional):</label>
                <textarea :id="'impressoConteudoImgDesc' + index" v-model="impresso.conteudo.textoDescritivo" rows="2"></textarea>
              </div>
              <div class="form-group">
                <label :for="'impressoConteudoImgPath' + index">Caminho/URL da Imagem:</label>
                <input type="text" :id="'impressoConteudoImgPath' + index" v-model="impresso.conteudo.caminhoImagem" placeholder="https://exemplo.com/imagem.jpg">
                
                <!-- Campo de Upload de Imagem -->
                <div class="upload-section mt-2">
                  <label class="upload-label">
                    <strong>📎 Carregar Imagem do Computador:</strong>
                  </label>
                  <input 
                    type="file" 
                    :id="'fileUpload' + index"
                    accept="image/*"
                    @change="handleImageUpload($event, index)"
                    :disabled="uploadingImages[`impresso-${index}`]"
                    class="file-input"
                  >
                  
                  <!-- Indicador de Upload -->
                  <div v-if="uploadingImages[`impresso-${index}`]" class="upload-progress">
                    <div class="progress-bar">
                      <div class="progress-fill"></div>
                    </div>
                    <span class="upload-text">📤 Carregando imagem...</span>
                  </div>
                  
                  <div class="upload-info">
                    <small>💡 Formatos aceitos: JPG, PNG, GIF, WebP. Máximo: 10MB</small>
                  </div>
                </div>
              </div>
              <div class="form-group">
                <label :for="'impressoConteudoImgLaudo' + index">Laudo da Imagem (opcional):</label>
                <textarea :id="'impressoConteudoImgLaudo' + index" v-model="impresso.conteudo.laudo" rows="3"></textarea>
              </div>
            </div>
            <div v-if="impresso.tipoConteudo === 'lista_chave_valor_secoes'">
              <div v-for="(secao, secaoIndex) in (impresso.conteudo?.secoes || [])" :key="secaoIndex" class="dynamic-item-group-nested">
                <div class="secao-header">
                  <h5>Seção {{ secaoIndex + 1 }}</h5>
                  <button type="button" @click="removerSecaoImpresso(impresso, secaoIndex)" class="remove-item-button-header">Remover Seção</button>
                </div>
                <div class="form-group">
                  <label :for="'secaoTitulo' + index + '_' + secaoIndex">Título da Seção:</label>
                  <input type="text" :id="'secaoTitulo' + index + '_' + secaoIndex" v-model="secao.tituloSecao" placeholder="Ex: Hemograma">
                </div>
                <div v-for="(itemSecao, itemSecaoIndex) in (secao?.itens || [])" :key="itemSecaoIndex" class="dynamic-item-group-very-nested">
                  <input type="text" v-model="itemSecao.chave" placeholder="Chave (Ex: Hb)" style="flex-basis: 40%;">
                  <input type="text" v-model="itemSecao.valor" placeholder="Valor (Ex: 12.5 g/dL)" style="flex-basis: 40%;">
                  <button type="button" @click="removerItemSecao(secao, itemSecaoIndex)" class="remove-item-button-small" style="flex-basis: auto;">X</button>
                </div>
                <button type="button" @click="adicionarItemSecao(secao)" class="add-item-button-small">+ Item na Seção</button>
              </div>
              <button type="button" @click="adicionarSecaoImpresso(impresso)" class="add-item-button">+ Seção no Impresso</button>
            </div>
          </div>
          <button type="button" @click="adicionarImpresso" class="add-item-button">+ Adicionar Impresso</button>

          <h4>Padrão Esperado de Procedimento (PEP / Checklist para Avaliador)</h4>
          <div class="form-group" style="display: none;">
            <label for="pepIdChecklist">ID do Checklist (Identificador único para este PEP):</label>
            <input type="text" id="pepIdChecklist" v-model="formData.padraoEsperadoProcedimento.idChecklistAssociado" placeholder="Ex: pep_cardio_iam_001">
          </div>
          
          <div class="form-group" style="display: none;">
            <label for="pepResumoCaso">Síntese da Estação - Resumo do Caso Clínico para o PEP:</label>
            <textarea id="pepResumoCaso" v-model="formData.padraoEsperadoProcedimento.sinteseEstacao.resumoCasoPEP" rows="3" placeholder="Breve resumo do caso para orientar o avaliador..."></textarea>
          </div>
          
          <div class="form-group" style="display: none;">
            <label>Síntese da Estação - Foco Principal Detalhado do PEP (um por linha):</label>
            <div v-for="(foco, index) in formData.padraoEsperadoProcedimento.sinteseEstacao.focoPrincipalDetalhado" :key="'focoPep-' + index" class="foco-pep-item">
              <input type="text" v-model="formData.padraoEsperadoProcedimento.sinteseEstacao.focoPrincipalDetalhado[index]" :placeholder="'Foco principal ' + (index + 1) + ' da avaliação...'">
              <button type="button" @click="removerFocoPrincipalPEP(index)" class="remove-item-button-small" title="Remover Foco">X</button>
            </div>
            <button type="button" @click="adicionarFocoPrincipalPEP" class="add-item-button-small">+ Adicionar Foco Principal</button>
          </div>

          <h5>Itens de Avaliação do PEP</h5>
          <div v-for="(item, index) in formData.padraoEsperadoProcedimento.itensAvaliacao" :key="item.idItem" class="dynamic-item-group pep-item">
            <div class="pep-item-header">
              <h6>Item de Avaliação {{ index + 1 }}</h6>
              <div class="pep-controls">
                <div class="position-controls">
                  <label for="'posicaoItem' + index" class="position-label">Posição:</label>
                  <select 
                    :id="'posicaoItem' + index" 
                    :value="index + 1" 
                    @change="moverItemPEPParaPosicao(index, $event.target.value)"
                    class="position-select"
                  >
                    <option v-for="pos in formData.padraoEsperadoProcedimento.itensAvaliacao.length" :key="pos" :value="pos">{{ pos }}</option>
                  </select>
                </div>
                <div class="move-buttons">
                  <button 
                    type="button" 
                    @click="moverItemPEPParaCima(index)" 
                    :disabled="index === 0"
                    class="move-button move-up"
                    title="Mover para cima"
                  >
                    ↑
                  </button>
                  <button 
                    type="button" 
                    @click="moverItemPEPParaBaixo(index)" 
                    :disabled="index === formData.padraoEsperadoProcedimento.itensAvaliacao.length - 1"
                    class="move-button move-down"
                    title="Mover para baixo"
                  >
                    ↓
                  </button>
                </div>
                <button type="button" @click="removerItemAvaliacaoPEP(index)" class="remove-item-button-header">Remover Item</button>
              </div>
            </div>
            <div class="form-group" style="display: none;">
              <label :for="'pepItemId' + index">ID do Item (único no checklist, ex: anamnese_dor):</label>
              <input type="text" :id="'pepItemId' + index" v-model="item.idItem" required>
            </div>
            <div class="form-group" style="display: none;">
              <label :for="'pepItemNumero' + index">Número Oficial do Item (Automático - baseado na posição):</label>
              <input type="text" :id="'pepItemNumero' + index" v-model="item.itemNumeroOficial" readonly title="Este valor é atualizado automaticamente com base na posição do item">
            </div>
            <div class="form-group">
              <label :for="'pepItemDescricao' + index">Descrição do Item de Avaliação:</label>
              <textarea :id="'pepItemDescricao' + index" v-model="item.descricaoItem" rows="2" required placeholder="Descreva o que deve ser avaliado..."></textarea>
            </div>
            <fieldset class="pontuacoes-group">
              <legend>Critérios e Pontuações do Item</legend>
              <div>
                <label :for="'pepItemAdequadoCriterio' + index">Critério - Adequado:</label>
                <input type="text" :id="'pepItemAdequadoCriterio' + index" v-model="item.pontuacoes.adequado.criterio" placeholder="Ex: Realizou completamente e corretamente.">
                <label :for="'pepItemAdequadoPontos' + index">Pontos:</label>
                <input type="number" step="0.001" :id="'pepItemAdequadoPontos' + index" v-model.number="item.pontuacoes.adequado.pontos">
              </div>
              <div>
                <label :for="'pepItemParcialCriterio' + index">Critério - Parcialmente Adequado:</label>
                <input type="text" :id="'pepItemParcialCriterio' + index" v-model="item.pontuacoes.parcialmenteAdequado.criterio" placeholder="Ex: Realizou parcialmente ou com pequenas falhas.">
                <label :for="'pepItemParcialPontos' + index">Pontos:</label>
                <input type="number" step="0.001" :id="'pepItemParcialPontos' + index" v-model.number="item.pontuacoes.parcialmenteAdequado.pontos">
              </div>
              <div>
                <label :for="'pepItemInadequadoCriterio' + index">Critério - Inadequado / Não Fez:</label>
                <input type="text" :id="'pepItemInadequadoCriterio' + index" v-model="item.pontuacoes.inadequado.criterio" placeholder="Ex: Não realizou ou realizou incorretamente.">
                <label :for="'pepItemInadequadoPontos' + index">Pontos:</label>
                <input type="number" step="0.001" :id="'pepItemInadequadoPontos' + index" v-model.number="item.pontuacoes.inadequado.pontos">
              </div>
            </fieldset>
          </div>
          <button type="button" @click="adicionarItemAvaliacaoPEP" class="add-item-button">+ Adicionar Item de Avaliação</button>

          <!-- Seção de Feedback da Estação -->
          <h5>Feedback da Estação</h5>
          <div class="feedback-section">
            <div class="form-group">
              <label for="feedbackResumoTecnico">Resumo Técnico do Feedback:</label>
              <textarea 
                id="feedbackResumoTecnico" 
                v-model="formData.padraoEsperadoProcedimento.feedbackEstacao.resumoTecnico" 
                rows="4" 
                placeholder="Digite aqui o resumo técnico que será apresentado como feedback aos candidatos após a avaliação da estação..."
              ></textarea>
            </div>
            
            <div class="form-group">
              <label>Fontes Bibliográficas e Referências:</label>
              <div v-for="(fonte, index) in formData.padraoEsperadoProcedimento.feedbackEstacao.fontes" :key="'fonte-' + index" class="fonte-feedback-item">
                <input 
                  type="text" 
                  v-model="formData.padraoEsperadoProcedimento.feedbackEstacao.fontes[index]" 
                  :placeholder="'Fonte ' + (index + 1) + ' - Ex: Diretrizes SBC 2024, Protocolo Ministério da Saúde, etc.'"
                >
                <button 
                  type="button" 
                  @click="removerFonteFeedback(index)" 
                  class="remove-item-button-small" 
                  title="Remover Fonte"
                  :disabled="formData.padraoEsperadoProcedimento.feedbackEstacao.fontes.length === 1"
                >×</button>
              </div>
              <button type="button" @click="adicionarFonteFeedback" class="add-item-button-small">+ Adicionar Fonte</button>
            </div>
          </div>

          <!-- Pontuação Total da Estação (movido para antes do botão salvar) -->
          <div class="form-group pep-total-score-display" style="margin-top: 20px; padding: 15px; border: 2px solid #ddd; border-radius: 8px; background-color: #f9f9f9;">
            <label for="pepPontuacaoTotal" style="font-weight: bold; font-size: 1.1em;">Pontuação Total Máxima da Estação (PEP):</label>
            <input type="number" step="0.001" id="pepPontuacaoTotal" v-model.number="formData.padraoEsperadoProcedimento.pontuacaoTotalEstacao" readonly title="Calculado automaticamente com base nos pontos 'Adequado' de cada item." style="font-size: 1.2em; font-weight: bold;">
            <span v-if="typeof calcularPontuacaoTotalPEP === 'number'" style="margin-left: 10px; font-size: 1.1em;">(Calculado: {{ calcularPontuacaoTotalPEP.toFixed(3) }})</span>
            <span v-else style="margin-left: 10px; color: #999;">(Calculado: N/A)</span>
            
            <!-- Alerta de validação da pontuação total -->
            <div v-if="alertaPontuacaoTotal" class="alerta-pontuacao-total" style="margin-top: 10px; padding: 10px; background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; color: #856404;">
              ⚠️ {{ alertaPontuacaoTotal }}
            </div>
          </div>

          <!-- Mensagem de sucesso acima do botão de salvamento -->
          <div v-if="successMessage" class="status-message-internal sucesso" style="margin-bottom: 15px;">{{ successMessage }}</div>

          <button type="submit" :disabled="isSaving" class="save-manual-button">
            <span v-if="isSaving">Salvando Alterações...</span>
            <span v-else>Salvar Alterações da Estação (Ctrl+S)</span>
          </button>
        </form>
      </div>
    </div>
  </div>

  <!-- Dialog para escolher posição do novo item -->
  <div v-if="showPositionDialog" class="dialog-overlay" @click="cancelarAdicaoItem">
    <div class="dialog-content" @click.stop>
      <h3>Escolher Posição do Novo Item</h3>
      <p>Onde você deseja inserir o novo item de avaliação?</p>
      
      <div class="position-options">
        <div v-for="(item, index) in formData.padraoEsperadoProcedimento.itensAvaliacao" :key="'pos-' + index" class="position-option">
          <button 
            type="button" 
            @click="adicionarItemNaPosicao(index + 1)"
            class="position-button"
          >
            Posição {{ index + 1 }} (antes de: "{{ item.descricaoItem || 'Item ' + (index + 1) }}")
          </button>
        </div>
        
        <button 
          type="button" 
          @click="adicionarItemNaPosicao('fim')"
          class="position-button position-end"
        >
          No final (Posição {{ formData.padraoEsperadoProcedimento.itensAvaliacao.length + 1 }})
        </button>
      </div>
      
      <div class="dialog-actions">
        <button type="button" @click="cancelarAdicaoItem" class="cancel-button">Cancelar</button>
      </div>
    </div>
  </div>

  <!-- Dialog para escolher posição da nova informação verbal -->
  <div v-if="showPositionDialogInfoVerbal" class="dialog-overlay" @click="cancelarAdicaoInfoVerbal">
    <div class="dialog-content" @click.stop>
      <h3>Escolher Posição da Nova Informação Verbal</h3>
      <p>Onde você deseja inserir a nova informação verbal?</p>
      
      <div class="position-options">
        <div v-for="(info, index) in formData.informacoesVerbaisSimulado" :key="'pos-' + index" class="position-option">
          <button 
            type="button" 
            @click="adicionarInfoVerbalNaPosicao(index + 1)"
            class="position-button"
          >
            Posição {{ index + 1 }} (antes de: "{{ info.contextoOuPerguntaChave || 'Informação Verbal ' + (index + 1) }}")
          </button>
        </div>
        
        <button 
          type="button" 
          @click="adicionarInfoVerbalNaPosicao('fim')"
          class="position-button position-end"
        >
          No final (Posição {{ formData.informacoesVerbaisSimulado.length + 1 }})
        </button>
      </div>
      
      <div class="dialog-actions">
        <button type="button" @click="cancelarAdicaoInfoVerbal" class="cancel-button">Cancelar</button>
      </div>
    </div>
        </div>
      </div>
      </div> <!-- Fim edit-scrollable-content -->
    </div> <!-- Fim edit-content-area -->
    
    <!-- REMOVIDO: Painel de IA antigo - agora usamos IA integrada em cada campo -->
    <!--
    <div v-if="showAIPanel" class="ai-panel-sidebar">
      <!-- Cabeçalho do Painel -->
      <div class="ai-panel-header">
        <div class="d-flex align-center">
          <v-icon icon="mdi-robot" color="primary" class="me-2" />
          <span class="font-weight-bold">Correção por IA</span>
          <v-chip 
            v-if="isGeneratingContext"
            size="small" 
            color="warning" 
            variant="tonal"
            class="ml-2"
          >
            Gerando contexto...
          </v-chip>
        </div>
        
        <div class="d-flex align-center gap-2">
          <!-- Botão para alternar posição -->
          <v-btn
            size="small"
            variant="text"
            icon="mdi-dock-window"
            @click="toggleAIPanelPosition"
            title="Alternar posição do painel"
          />
          
          <!-- Botão para fechar -->
          <v-btn
            size="small"
            variant="text"
            icon="mdi-close"
            @click="showAIPanel = false"
            title="Fechar painel"
          />
        </div>
      </div>
    
  </div> <!-- Fim edit-station-main-container -->
  
</template><style scoped>
/* Estilos base do container */
.edit-station-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  transition: background-color 0.2s ease, color 0.2s ease;
}

/* Container principal com grid para layout lado a lado */
.edit-station-main-container {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr auto; /* Editor expansível + painel fixo */
  gap: 0;
  overflow: hidden;
}

.edit-station-main-container--light {
  background-color: rgb(var(--v-theme-background));
  color: rgb(var(--v-theme-on-background));
}

.edit-station-main-container--dark {
  background-color: rgb(var(--v-theme-background));
  color: rgb(var(--v-theme-on-background));
}

/* Área de conteúdo principal (editor) */
.edit-content-area {
  overflow: hidden;
  position: relative;
  min-width: 0; /* Permite que o grid funcione corretamente */
}

/* Área rolável interna do editor */
.edit-scrollable-content {
  height: 100%;
  overflow-y: auto;
  padding: 8px 4px 16px 16px; /* Reduzido padding superior e direito */
}

.edit-station-container--light {
  background-color: rgb(var(--v-theme-background));
  color: rgb(var(--v-theme-on-background));
}

.edit-station-container--dark {
  background-color: rgb(var(--v-theme-background));
  color: rgb(var(--v-theme-on-background));
}

/* Estilos da página de upload */
.admin-upload-page { 
  /* Removido max-width e margin para permitir layout full-width */
  width: 100%;
  padding: 8px 16px; /* Reduzido padding para maximizar espaço */
  font-family: 'Inter', sans-serif;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.admin-upload-page--light {
  background-color: rgb(var(--v-theme-background));
  color: rgb(var(--v-theme-on-background));
}

.admin-upload-page--dark {
  background-color: rgb(var(--v-theme-background));
  color: rgb(var(--v-theme-on-background));
}

.admin-upload-page h2 { 
  text-align: center; 
  margin-bottom: 25px; 
  font-weight: 600;
  color: rgb(var(--v-theme-primary));
}

.loading-container {
  text-align: center;
  padding: 40px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.back-button, .delete-button, .download-button, .download-all-button, .ai-panel-button {
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
  margin-left: 8px;
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
}

.back-button {
  background-color: #6c757d;
  color: white;
  margin-left: 0; /* Remove margem esquerda do botão voltar */
}

.back-button:hover {
  background-color: #5a6268;
}

.download-button {
  background-color: #28a745;
  color: white;
}

.download-button:hover:not(:disabled) {
  background-color: #218838;
}

.download-button:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
  opacity: 0.6;
}

.download-all-button {
  background-color: #17a2b8;
  color: white;
}

.download-all-button:hover:not(:disabled) {
  background-color: #138496;
}

.download-all-button:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
  opacity: 0.6;
}

.delete-button {
  background-color: #dc3545;
  color: white;
}

.delete-button:hover:not(:disabled) {
  background-color: #c82333;
}

.delete-button:disabled {
  background-color: #adb5bd;
  cursor: not-allowed;
}

.ai-panel-button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  position: relative;
  overflow: hidden;
}

.ai-panel-button:hover:not(:disabled) {
  background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
}

.ai-panel-button.active {
  background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
  box-shadow: 0 0 20px rgba(76, 175, 80, 0.4);
}

.ai-panel-button:disabled {
  background: #adb5bd;
  cursor: not-allowed;
  opacity: 0.6;
}

.tab-content .card { 
  background-color: #ffffff; 
  padding: 30px; 
  border: 1px solid #e0e0e0; 
  border-radius: 8px; 
  box-shadow: 0 4px 12px rgba(0,0,0,0.08); 
}

.tab-content .card h3 { 
  margin-top: 0; 
  color: #0056b3; 
  border-bottom: 1px solid #eaeaea; 
  padding-bottom: 12px; 
  margin-bottom: 25px; 
  font-weight: 600; 
}

.manual-form .form-group { 
  margin-bottom: 20px; 
}

.manual-form label { 
  display: block; 
  margin-bottom: 6px; 
  font-weight: 500; 
  color: #34495e; 
  font-size: 0.95em; 
}

.manual-form input[type="text"],
.manual-form input[type="number"],
.manual-form select,
.manual-form textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  box-sizing: border-box;
  font-size: 1em;
  transition: border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
}

.manual-form input[type="text"]:focus,
.manual-form input[type="number"]:focus,
.manual-form select:focus,
.manual-form textarea:focus {
  border-color: #007bff;
  box-shadow: 0 0 0 0.2rem rgba(0,123,255,.25);
  outline: none;
}

.manual-form textarea { 
  resize: vertical; 
  min-height: 80px; 
}

.manual-form h4 { 
  margin-top: 35px; 
  margin-bottom: 20px; 
  color: #0056b3; 
  border-bottom: 1px solid #e0e0e0; 
  padding-bottom: 10px; 
  font-weight: 600; 
  font-size: 1.2em; 
}

.manual-form h5 { 
  margin-top: 25px; 
  margin-bottom: 15px; 
  color: #17a2b8; 
  font-weight: 500; 
  font-size: 1.1em; 
}

.manual-form h6 { 
  margin-top: 18px; 
  margin-bottom: 12px; 
  color: #28a745; 
  font-weight: 500; 
  font-size: 1.05em;
}

.dynamic-item-group {
  background-color: #f9f9f9;
  border: 1px solid #e7e7e7;
  border-left: 4px solid #6c757d;
  border-radius: 5px;
  padding: 20px;
  margin-bottom: 25px;
  position: relative;
}

.dynamic-item-group h5, .dynamic-item-group h6 { 
  margin-top: 0; 
}

.dynamic-item-group-nested {
  background-color: #f0f0f0;
  border: 1px solid #d0d0d0;
  border-left: 3px solid #17a2b8;
  padding: 15px;
  margin-top: 10px;
  margin-bottom: 10px;
  border-radius: 4px;
}

.dynamic-item-group-very-nested {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 5px;
  padding-left: 10px;
}

.dynamic-item-group-very-nested input[type="text"] {
  flex-grow: 1;
}

.pep-item { 
  border-left-color: #28a745; 
}

.foco-pep-item { 
  display: flex; 
  align-items: center; 
  margin-bottom: 8px; 
}

.foco-pep-item input[type="text"] { 
  flex-grow: 1; 
  margin-right: 8px; 
}

.add-item-button, .remove-item-button {
  border: none; 
  padding: 8px 15px; 
  border-radius: 4px; 
  cursor: pointer; 
  font-size: 0.9em; 
  margin-top: 10px; 
  transition: background-color 0.2s, transform 0.1s;
  font-weight: 500;
}

.add-item-button { 
  background-color: #007bff; 
  color: white; 
  margin-bottom: 20px; 
  display: inline-block; 
}

.remove-item-button { 
  background-color: #dc3545; 
  color: white; 
}

.dynamic-item-group > .remove-item-button {
  position: absolute;
  top: 15px;
  right: 15px;
  margin-top: 0;
  padding: 6px 10px;
}

.add-item-button:hover:not(:disabled) { 
  background-color: #0056b3; 
  transform: translateY(-1px); 
}

.remove-item-button:hover:not(:disabled) { 
  background-color: #c82333; 
  transform: translateY(-1px); 
}

.add-item-button-small, .remove-item-button-small {
  padding: 5px 10px; 
  font-size: 0.85em; 
  margin-left: 8px; 
  border-radius: 3px;
  border: none; 
  color: white; 
  cursor: pointer;
}

.add-item-button-small { 
  background-color: #5cb85c; 
}

.remove-item-button-small { 
  background-color: #fd7e14; 
}

.add-item-button-small:hover { 
  background-color: #4cae4c;
}

.remove-item-button-small:hover { 
  background-color: #e6690b;
}

.pontuacoes-group { 
  border: 1px solid #ced4da; 
  padding: 15px; 
  margin-top:15px; 
  border-radius: 4px; 
  background-color: #fff; 
}

.pontuacoes-group legend { 
  font-size: 1em; 
  font-weight: 500; 
  padding: 0 8px; 
  color: #495057; 
  margin-bottom: 10px;
}

.pontuacoes-group > div { 
  margin-bottom: 12px; 
  display: grid; 
  grid-template-columns: auto 1fr auto 80px; 
  gap: 8px 12px; 
  align-items: center;
}

.pontuacoes-group > div > label:first-child { 
  font-weight:normal; 
  font-size:0.9em; 
  color: #495057;
}

.pontuacoes-group > div > label:nth-of-type(2) { 
  font-weight:normal; 
  font-size:0.9em; 
  justify-self: end; 
  color: #495057;
}

.pontuacoes-group input[type="text"], .pontuacoes-group input[type="number"] { 
  font-size: 0.95em; 
  padding: 8px 10px;
}

.pep-total-score-display { 
  margin-top: 20px; 
  padding-top:15px; 
  border-top: 1px solid #eee;
}

.pep-total-score-display label { 
  font-weight: 600; 
}

.pep-total-score-display input[type="number"] { 
  background-color: #e9ecef; 
  cursor: not-allowed; 
  width: auto; 
  display: inline-block; 
  max-width:100px; 
  margin-right: 10px;
}

.pep-total-score-display span { 
  font-size: 0.9em; 
  color: #495057;
}

.save-manual-button { 
  display: block; 
  width: 100%; 
  padding: 14px; 
  font-size: 1.15em; 
  font-weight: 600; 
  color: white; 
  background-color: #17a2b8; 
  border: none; 
  border-radius: 5px; 
  cursor: pointer; 
  margin-top: 30px; 
  transition: background-color 0.2s, transform 0.1s; 
}

.save-manual-button:hover:not(:disabled) { 
  background-color: #138496; 
  transform: translateY(-1px); 
}

.save-manual-button:disabled { 
  background-color: #adb5bd; 
  cursor: not-allowed; 
}

.status-message-internal { 
  margin-top: 20px; 
  padding: 15px; 
  border-radius: 5px; 
  font-weight: 500; 
  border: 1px solid transparent; 
  line-height: 1.5;
}

.status-message-internal.info { 
  background-color: #e6f7ff; 
  color: #005f87; 
  border-color: #91d5ff; 
}

.status-message-internal.sucesso { 
  background-color: #f6ffed; 
  color: #389e0d; 
  border-color: #b7eb8f; 
}

.status-message-internal.erro { 
  background-color: #fff1f0; 
  color: #cf1322; 
  border-color: #ffa39e; 
}

.status-message-internal.keyboard-shortcut { 
  background-color: #f0f5ff; 
  color: #1890ff; 
  border-color: #69c0ff;
  font-size: 14px;
  animation: fadeInOut 2s ease-in-out;
}

@keyframes fadeInOut {
  0% { opacity: 0; transform: translateY(-10px); }
  20% { opacity: 1; transform: translateY(0); }
  80% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-10px); }
}

/* Alerta específico para pontuação total */
.alerta-pontuacao-total {
  margin-top: 15px;
  padding: 12px 15px;
  background-color: #fff1f0;
  color: #cf1322;
  border: 1px solid #ffa39e;
  border-radius: 5px;
  font-weight: 500;
  font-size: 14px;
  line-height: 1.4;
  animation: alertPulse 2s ease-in-out infinite;
}

@keyframes alertPulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.02); }
  100% { transform: scale(1); }
}

/* Estilos para controles de reordenação */
.pep-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 2px solid #e9ecef;
}

.pep-controls {
  display: flex;
  align-items: center;
  gap: 15px;
}

.position-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.position-label {
  font-size: 14px;
  font-weight: 500;
  margin: 0;
  color: #495057;
}

.position-select {
  padding: 5px 8px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
  background-color: white;
  min-width: 60px;
}

.position-select:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.move-buttons {
  display: flex;
  gap: 5px;
}

.move-button {
  width: 32px;
  height: 32px;
  border: 1px solid #dee2e6;
  background-color: #f8f9fa;
  border-radius: 4px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.move-button:hover:not(:disabled) {
  background-color: #e9ecef;
  border-color: #adb5bd;
}

.move-button:disabled {
  background-color: #e9ecef;
  color: #6c757d;
  cursor: not-allowed;
  opacity: 0.5;
}

.move-button.move-up {
  color: #28a745;
}

.move-button.move-down {
  color: #dc3545;
}

/* Estilos para controles de informações verbais */
.info-verbal-item {
  border: 1px solid #e9ecef;
  border-radius: 6px;
  background-color: #f8f9fa;
}

.info-verbal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 2px solid #e9ecef;
}

.info-verbal-controls {
  display: flex;
  align-items: center;
  gap: 15px;
}

/* Estilos para controles de impressos */
.impresso-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 2px solid #e9ecef;
}

.impresso-controls {
  display: flex;
  align-items: center;
  gap: 15px;
}

/* Estilos para o dialog de posição */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog-content {
  background-color: white;
  border-radius: 8px;
  padding: 24px;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}

.dialog-content h3 {
  margin: 0 0 16px 0;
  color: #2c3e50;
  font-size: 20px;
}

.dialog-content p {
  margin: 0 0 20px 0;
  color: #6c757d;
}

.position-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
}

.position-option {
  width: 100%;
}

.position-button {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #dee2e6;
  background-color: #f8f9fa;
  border-radius: 6px;
  font-size: 14px;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
}

.position-button:hover {
  background-color: #e9ecef;
  border-color: #007bff;
}

.position-button.position-end {
  background-color: #e3f2fd;
  border-color: #2196f3;
  color: #1976d2;
  font-weight: 500;
}

.position-button.position-end:hover {
  background-color: #bbdefb;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #dee2e6;
}

.cancel-button {
  padding: 8px 16px;
  border: 1px solid #6c757d;
  background-color: transparent;
  color: #6c757d;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
}

.cancel-button:hover {
  background-color: #6c757d;
  color: white;
}

/* Estilos para header das seções */
.secao-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding: 10px;
  background-color: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #dee2e6;
}

.secao-header h5 {
  margin: 0;
  color: #495057;
  font-weight: 600;
}

.remove-item-button-header {
  padding: 6px 12px;
  border: 1px solid #dc3545;
  background-color: #dc3545;
  color: white;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.remove-item-button-header:hover {
  background-color: #c82333;
  border-color: #bd2130;
  transform: translateY(-1px);
}

.remove-item-button-header:active {
  transform: translateY(0);
}

/* Estilos para upload de imagens */
.upload-section {
  border: 2px dashed #e0e0e0;
  border-radius: 8px;
  padding: 15px;
  background-color: #f9f9f9;
  margin-top: 10px;
}

.upload-label {
  display: block;
  margin-bottom: 10px;
  color: #333;
  font-size: 14px;
}

.file-input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: white;
  cursor: pointer;
}

.file-input:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

.upload-progress {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background-color: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4caf50, #8bc34a);
  animation: progress-animation 1.5s ease-in-out infinite;
  width: 100%;
}

@keyframes progress-animation {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.upload-text {
  font-size: 14px;
  color: #4caf50;
  font-weight: 500;
}

.upload-info {
  margin-top: 5px;
}

.upload-info small {
  color: #666;
  font-size: 12px;
}

.mt-2 {
  margin-top: 0.5rem;
}

/* Estilos para seção de feedback */
.feedback-section {
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  border-left: 4px solid #6f42c1;
  border-radius: 5px;
  padding: 20px;
  margin: 20px 0;
}

.fonte-feedback-item {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  gap: 8px;
}

.fonte-feedback-item input[type="text"] {
  flex-grow: 1;
}

.fonte-feedback-item .remove-item-button-small {
  background-color: #fd7e14;
  color: white;
  border: none;
  padding: 5px 8px;
  border-radius: 3px;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fonte-feedback-item .remove-item-button-small:hover {
  background-color: #e6690b;
}

.fonte-feedback-item .remove-item-button-small:disabled {
  background-color: #adb5bd;
  cursor: not-allowed;
  opacity: 0.6;
}

.fonte-feedback-item .remove-item-button-small:disabled:hover {
  background-color: #adb5bd;
}

/* Estilos para status de edição */
.edit-status-card {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border: 1px solid #dee2e6;
  border-left: 4px solid #007bff;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.edit-status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.edit-status-header h4 {
  margin: 0;
  color: #495057;
  font-weight: 600;
}

.edit-status-badge {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: bold;
  text-transform: uppercase;
}

.edit-status-badge.edited {
  background-color: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.edit-status-badge.not-edited {
  background-color: #fff3cd;
  color: #856404;
  border: 1px solid #ffeaa7;
}

.edit-status-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 10px;
}

.status-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #e9ecef;
}

.status-row:last-child {
  border-bottom: none;
}

.status-label {
  font-weight: 500;
  color: #6c757d;
}

.status-value {
  font-weight: 600;
  color: #495057;
}

/* 🤖 ============ ESTILOS DO PAINEL DE IA ============ */

/* Estilos do painel de IA na sidebar (layout à direita) */
.ai-panel-sidebar {
  width: 480px; /* Aumentado para 480px para melhor aproveitamento */
  max-width: 40vw; /* Aumentado para 40% da tela */
  min-width: 360px; /* Aumentado mínimo para 360px */
  height: 100%;
  background: rgb(var(--v-theme-surface));
  border-left: 1px solid rgb(var(--v-theme-outline-variant));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: width 0.2s ease;
  flex-shrink: 0; /* Impede que o painel seja comprimido */
}

.ai-panel-sidebar .ai-panel-header {
  padding: 12px 16px;
  border-bottom: 1px solid rgb(var(--v-theme-outline-variant));
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgb(var(--v-theme-surface-container-high));
  min-height: 56px;
  flex-shrink: 0;
}

/* Estilos para outros layouts do painel de IA */
.ai-panel-container {
  position: fixed;
  background: white;
  border: 2px solid rgb(var(--v-theme-primary));
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.1);
  backdrop-filter: blur(10px);
  z-index: 1000;
  max-height: 90vh;
  overflow-y: auto;
  transition: all 0.3s ease;
}

.ai-panel-right {
  top: 80px;
  right: 20px;
  width: 400px;
  max-width: calc(100vw - 40px);
}

.ai-panel-bottom {
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: 80%;
  max-width: 800px;
  max-height: 50vh;
}

.ai-panel-floating {
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
}

.ai-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(var(--v-theme-outline), 0.12);
  background: rgba(var(--v-theme-primary), 0.05);
  border-radius: 10px 10px 0 0;
}

.ai-panel-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  z-index: 999;
  backdrop-filter: blur(2px);
}

.gap-2 {
  gap: 8px;
}

/* Responsividade para o painel de IA */
@media (max-width: 1024px) {
  .ai-panel-sidebar {
    width: 380px;
    max-width: 40vw;
  }
}

@media (max-width: 768px) {
  /* Em telas pequenas, o layout grid vira coluna */
  .edit-station-main-container {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr auto;
  }
  
  .ai-panel-sidebar {
    width: 100%;
    max-width: none;
    min-width: 0;
    height: 50vh;
    border-left: none;
    border-top: 1px solid rgb(var(--v-theme-outline-variant));
  }
  
  .ai-panel-right {
    width: calc(100vw - 20px);
    right: 10px;
    left: 10px;
  }
  
  .ai-panel-bottom {
    width: calc(100vw - 20px);
    left: 10px;
    transform: none;
  }
  
  .ai-panel-floating {
    width: calc(100vw - 20px);
    height: calc(100vh - 40px);
    max-height: none;
    top: 20px;
    left: 10px;
    transform: none;
  }
}

/* Tema escuro para o painel de IA */
.v-theme--dark .ai-panel-container {
  background: rgb(var(--v-theme-surface));
  border-color: rgb(var(--v-theme-primary));
}

.v-theme--dark .ai-panel-header {
  background: rgba(var(--v-theme-primary), 0.1);
}
</style>
