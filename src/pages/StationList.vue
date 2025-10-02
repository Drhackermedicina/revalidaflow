<script setup>
import inepIcon from '@/assets/images/inep.png';
import revalidaFlowIcon from '@/assets/images/botao rf.png';
import { currentUser } from '@/plugins/auth.js'
import { db, firebaseAuth } from '@/plugins/firebase.js'
import { backendUrl } from '@/utils/backendUrl'
import { signOut } from 'firebase/auth'
import { collection, doc, getDoc, getDocs } from 'firebase/firestore'
import { computed, onMounted, onUnmounted, reactive, ref, watch, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import { useTheme } from 'vuetify'
import { checkStationEditStatus, checkMultipleStationsEditStatus, clearStationCache } from '@/utils/cacheManager.js'

const router = useRouter()
const theme = useTheme()

// --- Refs do Estado ---
const isDevelopment = ref(false); // Adiciona variável de ambiente
const stations = shallowRef([]); // Use shallowRef for performance with large arrays
const isLoadingStations = ref(true);
const errorMessage = ref('');
const creatingSessionForStationId = ref(null);
const isLoadingSession = ref(false);
const generatedCandidateLink = ref('');
const errorApi = ref('');
const showUserMenu = ref(false);
const sidebarOpen = ref(true);
const unreadMessages = ref(0);
const onlineUsers = ref([]);
const userStats = reactive({ simulationsCompleted: 0, averageScore: 0, currentStreak: 0 });
const userScores = ref({}); // Armazena pontuações do usuário por estação

// --- Cache para estações completas (lazy loading) ---
const fullStationsCache = ref(new Map()); // Cache de estações completas carregadas sob demanda
const isLoadingFullStation = ref(false); // Loading para carregamento de estação completa

// --- Refs para Simulação Sequencial ---
const sequentialMode = ref(false);
const selectedStationsSequence = ref([]);
const currentSequenceIndex = ref(0);
const isSequentialModeConfiguring = ref(false);
const sequentialSessionId = ref(null);
const showSequentialConfig = ref(false);

// --- Refs para busca de candidatos ---
const selectedCandidate = ref(null); // Candidato selecionado para visualizar estatísticas
const candidateSearchQuery = ref(''); // Query de busca por candidato
const candidateSearchSuggestions = ref([]); // Sugestões de candidatos
const showCandidateSuggestions = ref(false); // Controle de exibição das sugestões
const selectedCandidateScores = ref({}); // Pontuações do candidato selecionado
const isLoadingCandidateSearch = ref(false); // Loading para busca de candidatos

// --- Refs para filtros e pesquisa ---


const globalSearchQuery = ref('');
const selectedStation = ref(null);

// --- Opções de área para filtro ---
const areaOptions = [
  { title: 'Clínica Médica', value: 'clinica-medica' },
  { title: 'Cirurgia', value: 'cirurgia' },
  { title: 'Ginecologia e Obstetrícia', value: 'ginecologia' },
  { title: 'Pediatria', value: 'pediatria' },
  { title: 'Medicina da Família e Comunidade (Preventiva)', value: 'preventiva' },
  { title: 'Procedimentos', value: 'procedimentos' },
  { title: 'Geral', value: 'geral' }
];

// --- Refs para controle dos accordions ---
const showPreviousExamsSection = ref(false);
const show2024_2Stations = ref(false);
const showRevalidaFacilStations = ref(false); // RECOLHIDO POR PADRÃO
const showRevalidaFacilClinicaMedica = ref(false); // RECOLHIDO POR PADRÃO
const showRevalidaFacilGO = ref(false); // RECOLHIDO POR PADRÃO
const showRevalidaFacilProcedimentos = ref(false); // RECOLHIDO POR PADRÃO
const showRevalidaGO = ref(false); // Alias para GO

// --- Cache para dados dos usuários ---
const usersCache = ref(new Map());
const isLoadingUsers = ref(false);
const showRevalidaFacilCirurgia = ref(false); // RECOLHIDO POR PADRÃO
const showRevalidaFacilPreventiva = ref(false); // RECOLHIDO POR PADRÃO
const showRevalidaFacilPediatria = ref(false); // RECOLHIDO POR PADRÃO

// --- Funções helper para identificação de estações ---
function isINEPStation(station) {
  const idEstacao = station.idEstacao || '';
  return idEstacao.startsWith('INEP') || (idEstacao.startsWith('REVALIDA_') && !idEstacao.startsWith('REVALIDA_FACIL'));
}

function isRevalidaFacilStation(station) {
  const idEstacao = station.idEstacao || '';
  return idEstacao.startsWith('REVALIDA_FACIL');
}

function getINEPPeriod(station) {
  const idEstacao = station.idEstacao || '';
  if (!isINEPStation(station)) return null;
  
  // Extrair período do idEstacao (INEP_2025_1, REVALIDA_2017_CG_02, etc.)
  const match = idEstacao.match(/(?:INEP|REVALIDA)_(\d{4})(?:_(\d))?/);
  if (match) {
    const year = match[1];
    const subPeriod = match[2];
    return subPeriod ? `${year}.${subPeriod}` : year;
  }
  return null;
}

function getSpecialty(station) {
  // Função para normalizar texto (remove acentos, minúsculas, espaços extras)
  const normalizeText = (text) => {
    return text
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/\s+/g, ' '); // Normaliza espaços múltiplos
  };
  
  const especialidade = normalizeText(station.especialidade || '');
  
  // Mapear especialidades com TODAS as variações possíveis (já normalizadas)
  const specialtyMap = {
    'clinica-medica': [
      // Variações principais
      'clinica medica', 'medicina clinica', 'medicina interna',
      'clinicamedica', 'med interna', 'cm', 'clinica',
      // Variações com diferentes acentuações (normalizadas)
      'medicina interna', 'int', 'interna'
    ],
    'pediatria': [
      'pediatria', 'pediatrica', 'infantil', 'ped', 'neonatal',
      'crianca', 'lactente', 'adolescente'
    ],
    'cirurgia': [
      'cirurgia', 'cirurgica', 'cirurgia geral', 'cr',
      'trauma', 'operatoria', 'procedimento cirurgico'
    ],
    'ginecologia': [
      'ginecologia', 'obstetricia', 'ginecoobstetricia',
      'g.o', 'go', 'gineco', 'obstetrica', 'gestante',
      'mulher', 'feminino', 'gravidez'
    ],
    'preventiva': [
      'preventiva', 'medicina da familia', 'medicina de familia',
      'medicina comunitaria', 'etica medica', 'medicina social',
      'familia', 'coletiva', 'saude publica', 'epidemiologia',
      'prevencao', 'sus', 'atencao basica', 'mfc'
    ],
    'procedimentos': [
      'procedimento', 'procedimentos', 'habilidade', 'habilidades',
      'tecnica', 'tecnicas', 'sutura', 'drenagem', 'puncao',
      'acesso venoso', 'intubacao'
    ]
  };
  
  // Encontrar categoria correspondente usando busca normalizada
  for (const [category, keywords] of Object.entries(specialtyMap)) {
    // Normalizar keywords para comparação
    const normalizedKeywords = keywords.map(keyword => normalizeText(keyword));
    
    // Verificar se alguma keyword está contida na especialidade
    const match = normalizedKeywords.some(keyword => {
      // Busca por substring (palavra contida)
      if (especialidade.includes(keyword)) {
        return true;
      }
      
      // Busca por palavras individuais para casos complexos
      const keywordWords = keyword.split(' ');
      const especialidadeWords = especialidade.split(' ');
      
      // Se keyword tem múltiplas palavras, verificar se todas estão presentes
      if (keywordWords.length > 1) {
        return keywordWords.every(word => 
          especialidadeWords.some(espWord => espWord.includes(word))
        );
      }
      
      return false;
    });
    
    if (match) {
      return category;
    }
  }
  
  return 'geral';
}

function getRevalidaFacilSpecialty(station) {
  if (!isRevalidaFacilStation(station)) return [];

  // Função para normalizar texto (remove acentos, minúsculas, espaços extras)
  const normalizeText = (text) => {
    return text
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/\s+/g, ' '); // Normaliza espaços múltiplos
  };

  const especialidade = normalizeText(station.especialidade || '');

  // Mapear especialidades com TODAS as variações possíveis (já normalizadas)
  const specialtyMap = {
    'clinica-medica': [
      // Variações principais
      'clinica medica', 'medicina clinica', 'medicina interna',
      'clinicamedica', 'med interna', 'cm', 'clinica',
      // Variações com diferentes acentuações (normalizadas)
      'medicina interna', 'int', 'interna'
    ],
    'pediatria': [
      'pediatria', 'pediatrica', 'infantil', 'ped', 'neonatal',
      'crianca', 'lactente', 'adolescente'
    ],
    'cirurgia': [
      'cirurgia', 'cirurgica', 'cirurgia geral', 'cr',
      'trauma', 'operatoria', 'procedimento cirurgico'
    ],
    'ginecologia': [
      'ginecologia', 'obstetricia', 'ginecoobstetricia',
      'g.o', 'go', 'gineco', 'obstetrica', 'gestante',
      'mulher', 'feminino', 'gravidez'
    ],
    'preventiva': [
      'preventiva', 'medicina da familia', 'medicina de familia',
      'medicina comunitaria', 'etica medica', 'medicina social',
      'familia', 'coletiva', 'saude publica', 'epidemiologia',
      'prevencao', 'sus', 'atencao basica', 'mfc'
    ],
    'procedimentos': [
      'procedimento', 'procedimentos', 'habilidade', 'habilidades',
      'tecnica', 'tecnicas', 'sutura', 'drenagem', 'puncao',
      'acesso venoso', 'intubacao'
    ]
  };

  const matchedSpecialties = [];

  // Encontrar todas as categorias correspondentes usando busca normalizada
  for (const [category, keywords] of Object.entries(specialtyMap)) {
    // Normalizar keywords para comparação
    const normalizedKeywords = keywords.map(keyword => normalizeText(keyword));

    // Verificar se alguma keyword está contida na especialidade
    const match = normalizedKeywords.some(keyword => {
      // Busca por substring (palavra contida)
      if (especialidade.includes(keyword)) {
        return true;
      }

      // Busca por palavras individuais para casos complexos
      const keywordWords = keyword.split(' ');
      const especialidadeWords = especialidade.split(' ');

      // Se keyword tem múltiplas palavras, verificar se todas estão presentes
      if (keywordWords.length > 1) {
        return keywordWords.every(word =>
          especialidadeWords.some(espWord => espWord.includes(word))
        );
      }

      return false;
    });

    if (match) {
      matchedSpecialties.push(category);
    }
  }

  // Se nenhuma especialidade foi encontrada, retornar 'geral'
  return matchedSpecialties.length > 0 ? matchedSpecialties : ['geral'];
}

// 👥 FUNÇÃO PARA BUSCAR DADOS DOS USUÁRIOS
const buscarDadosUsuario = async (uid) => {
  if (!uid) return null;
  
  // Verificar cache primeiro
  if (usersCache.value.has(uid)) {
    return usersCache.value.get(uid);
  }
  
  try {
    const userDoc = await getDoc(doc(db, 'usuarios', uid));
    if (userDoc.exists()) {
      const userData = {
        uid: uid,
        nome: userDoc.data().nome || 'Usuário Desconhecido',
        email: userDoc.data().email || '',
        isAdmin: userDoc.data().isAdmin || false
      };
      
      // Armazenar no cache
      usersCache.value.set(uid, userData);
      return userData;
    } else {
      // Se não encontrou, criar entrada cache com dados padrão para admins não cadastrados
      const defaultData = {
        uid: uid,
        nome: 'Admin',
        email: '',
        isAdmin: true 
      };
      usersCache.value.set(uid, defaultData);
      return defaultData;
    }
  } catch (error) {
    console.error('❌ Erro ao buscar dados do usuário:', error);
    return {
      uid: uid,
      nome: 'Erro ao carregar',
      email: '',
      isAdmin: false
    };
  }
};

// --- Cache reativo para verificações de edição ---
const editStatusCacheReactive = ref(new Map());

// --- Função otimizada para verificar edição com cache ---
const verificarEdicaoComCache = async (station) => {
  const cacheKey = station.id;

  if (editStatusCacheReactive.value.has(cacheKey)) {
    return editStatusCacheReactive.value.get(cacheKey);
  }

  try {
    const hasBeenEdited = await checkStationEditStatus(db, station.id);
    const result = {
      hasBeenEdited: hasBeenEdited,
      method: 'cache',
      totalEdits: hasBeenEdited ? 1 : 0,
      lastEditDate: null,
      lastEditBy: null,
      createdDate: station.criadoEmTimestamp || station.dataCadastro,
      createdBy: station.criadoPor
    };
    editStatusCacheReactive.value.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error('❌ Erro ao verificar edição com cache:', error);
    const fallbackResult = verificarEdicaoHibrida(station);
    editStatusCacheReactive.value.set(cacheKey, fallbackResult);
    return fallbackResult;
  }
};

// --- Função para pré-carregar verificações de edição ---
const preloadEditStatuses = async (stations) => {
  if (!stations || stations.length === 0) return;

  const stationIds = stations.map(station => station.id);
  
  if (isDevelopment.value) {
    // console.log(`[CACHE] 🔍 Pré-carregando ${stations.length} verificações de edição`);
  }

  try {
    const results = await checkMultipleStationsEditStatus(db, stationIds);
    Object.entries(results).forEach(([stationId, hasBeenEdited]) => {
      const station = stations.find(s => s.id === stationId);
      if (station) {
        const result = {
          hasBeenEdited: hasBeenEdited,
          method: 'cache',
          totalEdits: hasBeenEdited ? 1 : 0,
          lastEditDate: null,
          lastEditBy: null,
          createdDate: station.criadoEmTimestamp || station.dataCadastro,
          createdBy: station.criadoPor
        };
        editStatusCacheReactive.value.set(stationId, result);
      }
    });

    if (isDevelopment.value) {
      // console.log(`[CACHE] ✅ Pré-carregamento concluído para ${Object.keys(results).length} estações`);
    }
  } catch (error) {
    console.error('[CACHE] ❌ Erro no pré-carregamento:', error);
  }
};

// --- Computed Properties ---
const isDarkTheme = computed(() => theme.global.current.value.dark)

// --- REFACTORED ADMIN CHECK ---
const isCurrentUserAdmin = ref(false);

watch(currentUser, async (user) => {
  if (user) {
    const userData = await buscarDadosUsuario(user.uid);
    isCurrentUserAdmin.value = userData?.isAdmin || false;
  } else {
    isCurrentUserAdmin.value = false;
  }
}, { immediate: true });

const isAdmin = computed(() => isCurrentUserAdmin.value);

// --- Computed property para obter status de edição de forma síncrona ---
const getStationEditStatus = (stationId) => {
  return editStatusCacheReactive.value.get(stationId) || {
    hasBeenEdited: false,
    method: 'none',
    totalEdits: 0,
    lastEditDate: null,
    lastEditBy: null,
    createdDate: null,
    createdBy: null
  };
};

// --- REFACTORED INEP STATIONS COMPUTED ---
const inepPeriods = ['2025.1', '2024.2', '2024.1', '2023.2', '2023.1', '2022.2', '2022.1', '2021', '2020', '2017', '2016', '2015', '2014', '2013', '2012', '2011'];

const stationsByInepPeriod = computed(() => {
  const grouped = {};
  const inepStations = stations.value.filter(isINEPStation);

  for (const station of inepStations) {
    const period = getINEPPeriod(station);
    if (period) {
      if (!grouped[period]) {
        grouped[period] = [];
      }
      grouped[period].push(station);
    }
  }

  for (const period in grouped) {
    grouped[period].sort((a, b) => 
      getCleanStationTitle(a.tituloEstacao).localeCompare(getCleanStationTitle(b.tituloEstacao), 'pt-BR', { numeric: true })
    );
  }
  return grouped;
});

const stationsRevalidaFacil = computed(() => {
  if (!stations.value) return [];
  
  const filteredStations = stations.value.filter(station => {
    return isRevalidaFacilStation(station);
  });
  
  return filteredStations.sort((a, b) => 
    getCleanStationTitle(a.tituloEstacao).localeCompare(getCleanStationTitle(b.tituloEstacao), 'pt-BR', { numeric: true })
  );
});

const filteredStationsRevalidaFacilClinicaMedica = computed(() => {
  return filteredRevalidaFacilStations.value
    .filter(station => getRevalidaFacilSpecialty(station).includes('clinica-medica'))
    .sort((a, b) => getCleanStationTitle(a.tituloEstacao).localeCompare(getCleanStationTitle(b.tituloEstacao), 'pt-BR', { numeric: true }));
});

const filteredStationsRevalidaFacilCirurgia = computed(() => {
  return filteredRevalidaFacilStations.value
    .filter(station => getRevalidaFacilSpecialty(station).includes('cirurgia'))
    .sort((a, b) => getCleanStationTitle(a.tituloEstacao).localeCompare(getCleanStationTitle(b.tituloEstacao), 'pt-BR', { numeric: true }));
});

const filteredStationsRevalidaFacilPreventiva = computed(() => {
  return filteredRevalidaFacilStations.value
    .filter(station => getRevalidaFacilSpecialty(station).includes('preventiva'))
    .sort((a, b) => getCleanStationTitle(a.tituloEstacao).localeCompare(getCleanStationTitle(b.tituloEstacao), 'pt-BR', { numeric: true }));
});


const filteredStationsRevalidaFacilPediatria = computed(() => {
  return filteredRevalidaFacilStations.value
    .filter(station => getRevalidaFacilSpecialty(station).includes('pediatria'))
    .sort((a, b) => getCleanStationTitle(a.tituloEstacao).localeCompare(getCleanStationTitle(b.tituloEstacao), 'pt-BR', { numeric: true }));
});

const filteredStationsByInepPeriod = computed(() => {
  const grouped = {};
  const inepStations = filteredInepStations.value;

  // Função para extrair o número da estação do ID (EST01, EST02, etc.)
  const getStationNumber = (stationId) => {
    const match = stationId.match(/EST(\d+)/);1
    return match ? parseInt(match[1], 10) : 999;
  };

  for (const station of inepStations) {
    const period = getINEPPeriod(station);
    if (period) {
      if (!grouped[period]) {
        grouped[period] = [];
      }
      grouped[period].push(station);
    }
  }

  for (const period in grouped) {
    grouped[period].sort((a, b) => {
      const numA = getStationNumber(a.idEstacao || a.id || '');
      const numB = getStationNumber(b.idEstacao || b.id || '');

      // Primeiro ordena por número da estação
      if (numA !== numB) {
        return numA - numB;
      }

      // Se mesmo número (fallback improvável), ordena alfabeticamente por título
      return getCleanStationTitle(a.tituloEstacao).localeCompare(getCleanStationTitle(b.tituloEstacao), 'pt-BR', { numeric: true });
    });
  }
  return grouped;
});

const filteredStationsRevalidaFacilGO = computed(() => {
  return filteredRevalidaFacilStations.value
    .filter(station => getRevalidaFacilSpecialty(station).includes('ginecologia'))
    .sort((a, b) => getCleanStationTitle(a.tituloEstacao).localeCompare(getCleanStationTitle(b.tituloEstacao), 'pt-BR', { numeric: true }));
});

const filteredStationsRevalidaFacilProcedimentos = computed(() => {
  return filteredRevalidaFacilStations.value
    .filter(station => getRevalidaFacilSpecialty(station).includes('procedimentos'))
    .sort((a, b) => getCleanStationTitle(a.tituloEstacao).localeCompare(getCleanStationTitle(b.tituloEstacao), 'pt-BR', { numeric: true }));
});

const editStatusCache = new Map();

function clearEditStatusCache() {
  editStatusCache.clear();
  if (isDevelopment.value) {
    // console.log('🧹 Cache de status de edição limpo');
  }
}

const isValidTimestamp = (timestamp) => {
  if (!timestamp) return false;
  try {
    let date;
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else {
      date = new Date(timestamp);
    }
    return date instanceof Date && !isNaN(date.getTime()) && date.getTime() > 0;
  } catch (error) {
    return false;
  }
};

const safeToISOString = (timestamp) => {
  try {
    if (!timestamp) return null;
    let date;
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else {
      date = new Date(timestamp);
    }
    if (isNaN(date.getTime())) {
      console.warn('❌ Timestamp inválido detectado:', timestamp);
      return null;
    }
    return date.toISOString();
  } catch (error) {
    console.warn('❌ Erro ao converter timestamp:', error, timestamp);
    return null;
  }
};

function verificarEdicaoHibrida(station) {
  const cacheKey = `${station.id}_${station.hasBeenEdited}_${station.atualizadoEmTimestamp}_${station.criadoEmTimestamp}`;
  if (editStatusCache.has(cacheKey)) {
    return editStatusCache.get(cacheKey);
  }
  
  if (isDevelopment.value) {
    // console.log('🔍 Verificando edição para estação:', station.id);
  }
  
  let result;
  
  if (typeof station.hasBeenEdited === 'boolean') {
    const lastEdit = station.editHistory && station.editHistory.length > 0 
      ? station.editHistory[station.editHistory.length - 1] 
      : null;
    
    if (isDevelopment.value) {
      // console.log('🎯 Campo hasBeenEdited encontrado no banco:', station.hasBeenEdited);
    }
    
    result = {
      hasBeenEdited: station.hasBeenEdited,
      method: 'database',
      totalEdits: station.totalEdits || (station.editHistory ? station.editHistory.length : 0),
      lastEditDate: lastEdit?.timestamp || station.atualizadoEmTimestamp,
      lastEditBy: lastEdit?.editadoPor || station.atualizadoPor || station.criadoPor,
      createdDate: station.criadoEmTimestamp || station.dataCadastro,
      createdBy: station.criadoPor
    };
  }
  else if (station.editHistory && Array.isArray(station.editHistory)) {
    const hasModernEdit = station.editHistory.length > 0;
    const lastEdit = hasModernEdit ? station.editHistory[station.editHistory.length - 1] : null;
    
    // console.log('✅ Sistema moderno detectado:', { hasEdit: hasModernEdit, totalEdits: station.editHistory.length });
    
    result = {
      hasBeenEdited: hasModernEdit,
      method: 'modern',
      totalEdits: station.editHistory.length,
      lastEditDate: lastEdit?.timestamp || null,
      lastEditBy: lastEdit?.editadoPor || null,
      createdDate: station.criadoEmTimestamp || station.dataCadastro || null,
      createdBy: station.criadoPor || null
    };
  }
  else {
    const criadoEm = station.criadoEmTimestamp || station.dataCadastro;
    const atualizadoEm = station.atualizadoEmTimestamp || station.dataUltimaAtualizacao;
    const editadoPor = station.atualizadoPor || station.editadoPor || station.criadoPor || null;
    
    if (isValidTimestamp(criadoEm) && isValidTimestamp(atualizadoEm)) {
      const cadastro = criadoEm.toDate ? criadoEm.toDate() : new Date(criadoEm);
      const ultimaAtualizacao = atualizadoEm.toDate ? atualizadoEm.toDate() : new Date(atualizadoEm);
      const hasLegacyEdit = ultimaAtualizacao.getTime() !== cadastro.getTime();
      
      // console.log('🔧 Sistema legacy detectado:', { 
      //   hasEdit: hasLegacyEdit, 
      //   cadastro: safeToISOString(criadoEm), 
      //   ultimaAtualizacao: safeToISOString(atualizadoEm),
      //   editadoPor: editadoPor
      // });
      
      result = {
        hasBeenEdited: hasLegacyEdit,
        method: 'legacy',
        totalEdits: hasLegacyEdit ? 1 : 0,
        lastEditDate: hasLegacyEdit ? ultimaAtualizacao : null,
        lastEditBy: hasLegacyEdit ? editadoPor : null,
        createdDate: cadastro,
        createdBy: station.criadoPor || editadoPor
      };
    } else if (isValidTimestamp(atualizadoEm)) {
      const ultimaAtualizacao = atualizadoEm.toDate ? atualizadoEm.toDate() : new Date(atualizadoEm);
      // console.log('🔧 Sistema legacy (só atualização) detectado');
      
      result = {
        hasBeenEdited: true,
        method: 'legacy',
        totalEdits: 1,
        lastEditDate: ultimaAtualizacao,
        lastEditBy: editadoPor,
        createdDate: null,
        createdBy: station.criadoPor || editadoPor
      };
    }
    else if (station.hasBeenEdited !== undefined) {
      // console.log('📝 Campo hasBeenEdited detectado:', station.hasBeenEdited);
      result = {
        hasBeenEdited: !!station.hasBeenEdited,
        method: 'boolean',
        totalEdits: station.hasBeenEdited ? 1 : 0,
        lastEditDate: null,
        lastEditBy: editadoPor,
        createdDate: criadoEm ? (criadoEm.toDate ? criadoEm.toDate() : new Date(criadoEm)) : null,
        createdBy: station.criadoPor || editadoPor
      };
    }
    else {
      // console.log('ℹ️ Sem dados de edição válidos encontrados para:', station.id);
      result = {
        hasBeenEdited: false,
        method: 'none',
        totalEdits: 0,
        lastEditDate: null,
        lastEditBy: null,
        createdDate: criadoEm ? (isValidTimestamp(criadoEm) ? (criadoEm.toDate ? criadoEm.toDate() : new Date(criadoEm)) : null) : null,
        createdBy: station.criadoPor || null
      };
    }
  }
  
  editStatusCache.set(cacheKey, result);
  return result;
}

const formatarDataBrasil = (date) => {
  if (!date) return 'Data não disponível';
  try {
    const dateObj = date instanceof Date ? date : (date.toDate ? date.toDate() : new Date(date));
    if (isNaN(dateObj.getTime())) {
      return 'Data inválida';
    }
    const dia = String(dateObj.getDate()).padStart(2, '0');
    const mes = String(dateObj.getMonth() + 1).padStart(2, '0');
    const ano = dateObj.getFullYear();
    const horas = String(dateObj.getHours()).padStart(2, '0');
    const minutos = String(dateObj.getMinutes()).padStart(2, '0');
    const segundos = String(dateObj.getSeconds()).padStart(2, '0');
    return `${dia}/${mes}/${ano} às ${horas}:${minutos}:${segundos}`;
  } catch (error) {
    console.warn('❌ Erro ao formatar data:', error);
    return 'Erro na data';
  }
};

const formatarDataBrasilComUsuario = (station) => {
  const info = verificarEdicaoHibrida(station);
  if (!info.lastEditDate) return 'Data não disponível';
  
  try {
    const dateObj = info.lastEditDate instanceof Date ? info.lastEditDate : 
                   (info.lastEditDate.toDate ? info.lastEditDate.toDate() : new Date(info.lastEditDate));
    
    if (isNaN(dateObj.getTime())) {
      return 'Data inválida';
    }
    
    const dia = String(dateObj.getDate()).padStart(2, '0');
    const mes = String(dateObj.getMonth() + 1).padStart(2, '0');
    const ano = dateObj.getFullYear();
    const horas = String(dateObj.getHours()).padStart(2, '0');
    const minutos = String(dateObj.getMinutes()).padStart(2, '0');
    const segundos = String(dateObj.getSeconds()).padStart(2, '0');
    
    const dataFormatada = `${dia}/${mes}/${ano} às ${horas}:${minutos}:${segundos}`;
    const usuario = info.lastEditBy ? ` por ${info.lastEditBy}` : '';
    
    return `${dataFormatada}${usuario}`;
  } catch (error) {
    console.warn('❌ Erro ao formatar data:', error);
    return 'Erro na data';
  }
};

const formatarInfoEdicao = (station) => {
  const info = verificarEdicaoHibrida(station);
  if (!info.hasBeenEdited || !info.lastEditDate) return '';
  
  const dataFormatada = formatarDataBrasil(info.lastEditDate);
  const usuario = info.lastEditBy ? ` por ${info.lastEditBy}` : '';
  
  return `${dataFormatada}${usuario}`;
};

function getCleanStationTitle(originalTitle) {
  if (!originalTitle) return 'ESTAÇÃO SEM TÍTULO';
  let cleanTitle = originalTitle;

  cleanTitle = cleanTitle.replace(/^INEP\s*2024\.2[\s\:\-]*\/?/gi, '');
  cleanTitle = cleanTitle.replace(/INEP\s*2024\.2[\s\:\-]*\/?/gi, '');
  cleanTitle = cleanTitle.replace(/^REVALIDA[\s\:\-]*\/?/gi, '');
  cleanTitle = cleanTitle.replace(/^REVALIDA\s*F[AÁ]CIL\s*[\-\:\s]+/i, '');
  cleanTitle = cleanTitle.replace(/^REVALIDAFACIL\s*[\-\:\s]+/i, '');
  cleanTitle = cleanTitle.replace(/^(ESTAÇÃO\s+|CLINICA\s*MEDICA\s+|CLÍNICA\s*MÉDICA\s+|CIRURGIA\s+|PEDIATRIA\s+|PREVENTIVA\s+|GINECOLOGIA\s+|OBSTETRICIA\s+|G\.O\s+|GO\s+|\d{4}\.\d\s+|\d{4}\s+|\d+\s*[\-\|\:]\s*)/gi, '');
  cleanTitle = cleanTitle.replace(/\s*[\(\[\-]\s*(CM|CR|PED|G\.O|GO|PREV|GERAL)\s*[\)\]\-]\s*/gi, ' ');
  cleanTitle = cleanTitle.replace(/\s+\-\s+(CM|CR|PED|G\.O|GO|PREV|GERAL)\s*/gi, ' ');
  cleanTitle = cleanTitle.replace(/\s+(CM|CR|PED|G\.O|GO|PREV|GERAL)(?=\s|$|[\-\:\.])/gi, ' ');
  cleanTitle = cleanTitle.replace(/^(CM|CR|PED|G\.O|GO|PREV|GERAL)(?=\s|$|[\-\:\.])/gi, '');
  cleanTitle = cleanTitle.replace(/^[\s\-\:\|\.\_]*/, '');
  cleanTitle = cleanTitle.replace(/^[^a-zA-ZÀ-ÿ]*([a-zA-ZÀ-ÿ].*)$/, '$1');
  cleanTitle = cleanTitle.trim();
  
  if (!cleanTitle || cleanTitle.length < 2) {
    let fallback = originalTitle
      .replace(/INEP\s*2024\.2[\s\:\-]*\/?/gi, '')
      .replace(/Clínica Médica|Clinica Medica/gi, '')
      .replace(/Cirurgia Geral|Cirurgia/gi, '')
      .replace(/Pediatria/gi, '')
      .replace(/Ginecologia e Obstetrícia|Ginecologia E Obstetricia/gi, '')
      .replace(/Medicina da Família|Medicina De Familia/gi, '')
      .replace(/(CM|CR|PED|G\.O|GO|PREV|GERAL)(?=\s|$|[\s\:\-]+)/gi, '')
      .replace(/[\s\-\:\s]{2,}/g, ' ')
      .trim();
    
    return fallback || originalTitle;
  }

  cleanTitle = cleanTitle.toLowerCase().split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');

  return cleanTitle;
}

function getStationYear(station) {
  const period = getINEPPeriod(station);
  if (!period) return 0;

  // Extrair apenas o ano (ex: "2025.1" -> 2025, "2017" -> 2017)
  const yearMatch = period.match(/^(\d{4})/);
  return yearMatch ? parseInt(yearMatch[1], 10) : 0;
}

function getStationArea(station) {
  let specialty = null;
  
  if (isRevalidaFacilStation(station) || isINEPStation(station)) {
    specialty = getSpecialty(station);
    
    const areas = {
      'clinica-medica': { name: 'CM', fullName: 'Clínica Médica', icon: '🩺' },
      'cirurgia': { name: 'CR', fullName: 'Cirurgia', icon: '🔪' },
      'pediatria': { name: 'PED', fullName: 'Pediatria', icon: '👶' },
      'ginecologia': { name: 'G.O', fullName: 'Ginecologia e Obstetrícia', icon: '👩‍⚕️' },
      'preventiva': { name: 'PREV', fullName: 'Preventiva', icon: '🛡️' },
      'procedimentos': { name: 'PROC', fullName: 'Procedimentos', icon: '🛠️' },
      'geral': { name: 'GERAL', fullName: 'Medicina Geral', icon: '🏥' }
    };
    
    return { key: specialty, ...areas[specialty] };
  }
  
  const especialidadeRaw = (station.especialidade || '').toLowerCase();
  const titulo = (station.tituloEstacao || '').toLowerCase();

  const especialidades = especialidadeRaw
    .split(/[\\/,;\-\s]+/) // Split by common delimiters
    .map(e => e.trim())
    .filter(e => e.length > 0)
    .map(e => e.normalize('NFD').replace(/[\u0300-\u036f]/g, '')); // Normalize and remove accents
  
  const tituloNormalizado = titulo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const keywords = {
    'clinica-medica': [
      'clinica medica', 'medicina interna', 'cm', 'clinica', 'medicina clinica',
      'avc', 'acidente vascular cerebral', 'infarto', 'iam', 'miocardio', 'diabetes', 'hipertensao', 'hipertensao arterial',
      'ulcera peptica', 'hemorragia digestiva', 'dengue', 'malaria', 'tuberculose', 'tbc',
      'pneumonia', 'bronquite', 'asma', 'dpoc', 'insuficiencia cardiaca', 'icc',
      'arritmia', 'fibrilacao', 'angina', 'embolia', 'trombose', 'neurologia', 'emergencia clinica',
      'enfarte', 'cardiopatia', 'nefropatia', 'hepatopatia', 'gastrite', 'artrite', 'artrose',
      'lupus', 'hipotireoidismo', 'hipertireoidismo', 'anemia', 'leucemia', 'linfoma',
      'internacao', 'enfermaria', 'ambulatorio', 'consulta', 'isquemico', 'cronico'
    ],
    'cirurgia': [
      'cirurgia', 'cirurgica', 'cr', 'trauma', 'operatoria', 'procedimento cirurgico', 'cirurgia geral',
      'trauma abdominal', 'trauma fechado', 'trauma craniano', 'ulcera peptica perfurada', 'ruptura esplenica',
      'oclusao arterial', 'laparotomia', 'apendicectomia', 'colecistectomia', 'herniorrafia', 
      'drenagem', 'sutura', 'urologia', 'ortopedia', 'neurocirurgia',
      'abdome agudo', 'hemorragia interna', 'perfuracao', 'obstrucao intestinal', 'perfurada',
      'politraumatismo', 'fraturas', 'luxacao', 'ferimento', 'corte', 'queimadura',
      'apendicite', 'colecistite', 'pancreatite', 'peritonite', 'hernia'
    ],
    'pediatria': [
      'pediatria', 'pediatrica', 'infantil', 'crianca', 'ped', 'neonatal', 'lactente', 'neonato',
      'puericultura', 'adolescente', 'escolar', 'pre escolar', 'meses', 'anos', 'recem nascido',
      'criptorquidia', 'fimose', 'pressao arterial crianca', 'vacinacao infantil', 'imunizacao',
      'crescimento', 'desenvolvimento', 'aleitamento', 'diarreia infantil', 'gastroenterite',
      'desidratacao', 'febre crianca', 'convulsao febril', 'aferição pediatrica', 'consulta pediatrica',
      'bronquiolite', 'asma infantil', 'pneumonia pediatrica', 'otite', 'faringite',
      'lactante', 'escolar', 'adolescencia', 'puberdade', 'menor', 'criancas'
    ],
    'ginecologia': [
      'ginecologia', 'ginecologica', 'obstetricia', 'obstetrica', 'go', 'g.o', 'ginecoobstetricia',
      'mulher', 'gestante', 'gravida', 'gravidez', 'gestacao', 'obstetrico',
      'pre natal', 'prenatal', 'pielonefrite gestante', 'emergencia obstetrica', 'eclampsia', 'pre eclampsia',
      'sangramento gestacao', 'parto', 'puerpera', 'puerperio', 'amamentacao', 'lactacao',
      'trabalho de parto', 'cesariana', 'cesarea', 'forceps', 'episiotomia',
      'violencia sexual', 'doenca inflamatoria pelvica', 'dip', 'dst', 'corrimento vaginal',
      'cancer colo', 'cancer cervical', 'papanicolaou', 'mama', 'contraceptivo', 'menopausa',
      'ciclo menstrual', 'menstruacao', 'amenorreia', 'dismenorreia', 'endometriose',
      'ovario', 'utero', 'cervix', 'vagina', 'vulva', 'pelvica', 'ginecologico'
    ],
    'preventiva': [
      'preventiva', 'medicina preventiva', 'medicina da familia', 'medicina de familia', 'mfc',
      'familia', 'coletiva', 'saude publica', 'saude coletiva', 'epidemiologia', 'prevencao', 'promocao',
      'medicina comunitaria', 'atencao basica', 'atencao primaria', 'aps', 'sus',
      'tuberculose', 'tbc', 'hiv', 'aids', 'coinfeccao', 'lagarta', 'erucismo', 'infectologia',
      'vacinacao', 'imunizacao', 'vigilancia epidemiologica', 'notificacao compulsoria',
      'saneamento', 'agua', 'esgoto', 'zoonose', 'endemias', 'comunidade', 'populacional',
      'educacao em saude', 'promocao da saude', 'prevencao primaria', 'prevencao secundaria',
      'rastreamento', 'screening', 'deteccao precoce', 'programa de saude',
      'hanseniase', 'chagas', 'esquistossomose', 'malaria', 'dengue', 'zika', 'chikungunya',
      'hepatite', 'sifilis', 'gonorreia', 'clamydia'
    ]
  };

  const matchesKeywords = (text, keywordList) => {
    if (!text) return false;
    return keywordList.some(keyword => {
      if (text.includes(keyword)) {
        return true;
      }
      const keywordWords = keyword.split(/\s+/);
      if (keywordWords.length > 1) {
        const allWordsMatch = keywordWords.every(word => text.includes(word));
        if (allWordsMatch) {
          return true;
        }
      }
      return false;
    });
  };

  let key = 'geral';
  let matchInfo = '';
  
  for (const [areaKey, keywordList] of Object.entries(keywords)) {
    const especialidadeMatch = especialidades.some(esp => matchesKeywords(esp, keywordList));
    if (especialidadeMatch) {
      key = areaKey;
      matchInfo = 'especialidade';
      break;
    }
  }
  
  if (key === 'geral') {
    for (const [areaKey, keywordList] of Object.entries(keywords)) {
      const tituloMatch = matchesKeywords(tituloNormalizado, keywordList);
      if (tituloMatch) {
        key = areaKey;
        matchInfo = 'titulo';
        break;
      }
    }
  }

  if (key === 'geral') {
    const tituloOriginal = (station.tituloEstacao || '').toLowerCase();
    if (tituloOriginal.includes('pre-natal') || tituloOriginal.includes('prenatal') || 
        tituloOriginal.includes('parto') || tituloOriginal.includes('gestante')) {
      key = 'ginecologia';
      matchInfo = 'fallback-obstetrica';
    } else if (tituloOriginal.includes('crianca') || tituloOriginal.includes('pediatrica') || 
               tituloOriginal.includes('lactente') || tituloOriginal.includes('infantil')) {
      key = 'pediatria';
      matchInfo = 'fallback-pediatrico';
    } else if (tituloOriginal.includes('trauma') || tituloOriginal.includes('cirurgica') || 
               tituloOriginal.includes('operacao') || tituloOriginal.includes('procedimento cirurgico')) {
      key = 'cirurgia';
      matchInfo = 'fallback-cirurgico';
    } else if (tituloOriginal.includes('prevencao') || tituloOriginal.includes('sus') || 
               tituloOriginal.includes('atencao basica') || tituloOriginal.includes('familia')) {
      key = 'preventiva';
      matchInfo = 'fallback-preventivo';
    }
  }

  const areas = {
    'clinica-medica': { name: 'CM', fullName: 'Clínica Médica', icon: '🩺' },
    'cirurgia': { name: 'CR', fullName: 'Cirurgia', icon: '🔪' },
    'pediatria': { name: 'PED', fullName: 'Pediatria', icon: '👶' },
    'ginecologia': { name: 'G.O', fullName: 'Ginecologia e Obstetrícia', icon: '👩‍⚕️' },
    'preventiva': { name: 'PREV', fullName: 'Preventiva', icon: '🛡️' },
    'geral': { name: 'GERAL', fullName: 'Medicina Geral', icon: '🏥' }
  };

  return { key, ...areas[key] };
}

function getSpecialtyColor(station, specificSpecialty = null) {
  const lightColors = {
    'clinica-medica': '#00BFFF', // Azul mais vivo
    'cirurgia': '#000080', // Azul marinho mais escuro e vivo
    'pediatria': '#008000', // Verde mais vivo
    'ginecologia': '#FF1493', // Rosa mais vivo
    'preventiva': '#FF4500', // Laranja vermelho mais vivo
    'procedimentos': '#6A0DAD', // Roxo mais vivo
    'geral': '#2F4F4F' // Cinza mais escuro
  };

  const darkColors = {
    'clinica-medica': '#00CED1', // Turquesa mais vivo
    'cirurgia': '#4169E1', // Azul royal mais vivo
    'pediatria': '#32CD32', // Verde lime mais vivo
    'ginecologia': '#FF69B4', // Rosa quente mais vivo
    'preventiva': '#FFA500', // Laranja mais vivo
    'procedimentos': '#9370DB', // Roxo médio mais vivo
    'geral': '#708090' // Cinza mais claro para dark
  };

  const colors = isDarkTheme.value ? darkColors : lightColors;

  // Se foi especificada uma especialidade específica, usar ela
  if (specificSpecialty) {
    return colors[specificSpecialty] || colors.geral;
  }

  // Senão, usar a lógica original (primeira especialidade encontrada)
  const area = getStationArea(station);
  return colors[area.key] || colors.geral;
}

function getBackgroundOpacity(station) {
  // Cores mais vivas para INEP
  if (isINEPStation(station)) {
    return isDarkTheme.value ? '80' : '60';
  }
  // Opacidade original para Revalida Fácil
  return isDarkTheme.value ? '60' : '40';
}

function formatStationDate(station) {
  try {
    let date = null;
    let label = '';
    
    if (station.hasBeenEdited && station.atualizadoEmTimestamp) {
      date = station.atualizadoEmTimestamp.toDate ? station.atualizadoEmTimestamp.toDate() : new Date(station.atualizadoEmTimestamp);
      label = 'Editada';
    } 
    else if (station.criadoEmTimestamp) {
      date = station.criadoEmTimestamp.toDate ? station.criadoEmTimestamp.toDate() : new Date(station.criadoEmTimestamp);
      label = 'Criada';
    }
    
    if (!date) return 'Data N/A';
    
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return `${label} hoje`;
    } else if (diffDays === 2) {
      return `${label} ontem`;
    } else if (diffDays <= 7) {
      return `${label} ${diffDays - 1}d atrás`;
    } else {
      return `${label} ${date.toLocaleDateString('pt-BR')}`;
    }
  } catch (error) {
    return 'Data inválida';
  }
}

function getStationDifficulty(stationId, averageScore = null) {
  let avgScore = averageScore;
  if (avgScore === null) {
    const hash = stationId?.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0) || 0;
    avgScore = (Math.abs(hash) % 61) + 40;
  }
  
  const normalizedScore = avgScore / 10;
  
  if (avgScore >= 80) {
    return { level: 1, text: 'Fácil', color: '#22c55e', score: normalizedScore.toFixed(1) };
  } else if (avgScore >= 60 && avgScore < 80) {
    return { level: 2, text: 'Moderado', color: '#f59e0b', score: normalizedScore.toFixed(1) };
  } else if (avgScore >= 40 && avgScore < 60) {
    return { level: 3, text: 'Difícil', color: '#ef4444', score: normalizedScore.toFixed(1) };
  } else {
    return { level: 4, text: 'Muito Difícil', color: '#dc2626', score: normalizedScore.toFixed(1) };
  }
}

function getUserScore(stationId) {
  const userHash = (currentUser.value?.uid || 'anonymous') + stationId;
  const hash = userHash.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0) || 0;
  
  const hasScore = Math.abs(hash) % 3 !== 0;
  if (!hasScore) return null;
  
  const score = (Math.abs(hash) % 41) + 60;
  const finalScore = Math.min(score, 100);
  
  return (finalScore / 10).toFixed(1);
}

const globalFilteredStations = computed(() => {
  let filtered = stations.value;

  if (globalSearchQuery.value.trim()) {
    const query = globalSearchQuery.value.toLowerCase();
    filtered = filtered.filter(station => {
      const title = station.tituloEstacao?.toLowerCase() || '';
      const cleanTitle = getCleanStationTitle(station.tituloEstacao).toLowerCase();
      const specialty = getStationArea(station).fullName.toLowerCase();
      const inepPeriod = getINEPPeriod(station)?.toLowerCase() || '';
      const areaName = getStationArea(station).name.toLowerCase();
      const revalidaSpecialties = isRevalidaFacilStation(station)
        ? getRevalidaFacilSpecialty(station).map(s => s.toLowerCase()).join(' ')
        : '';

      return title.includes(query) ||
             cleanTitle.includes(query) ||
             specialty.includes(query) ||
             inepPeriod.includes(query) ||
             areaName.includes(query) ||
             revalidaSpecialties.includes(query);
    });
  }
  return filtered;
});

const globalAutocompleteItems = computed(() => {
  if (!globalSearchQuery.value || globalSearchQuery.value.length < 3) {
    return [];
  }

  const items = globalFilteredStations.value.map(station => {
    const area = getStationArea(station);
    const inepPeriod = getINEPPeriod(station);
    const isInep = isINEPStation(station);
    const isRevalida = isRevalidaFacilStation(station);

    const section = isInep ? `INEP ${inepPeriod}`
                  : isRevalida ? "RF " + getStationArea(station).fullName
                  : '';

    const displayedSpecialty = isRevalida ? area.fullName : station.especialidade;

    return {
      id: station.id,
      title: `${section ? section + ' - ' : ''}${getCleanStationTitle(station.tituloEstacao)}`,
      subtitle: displayedSpecialty,
      raw: {
        ...station,
        color: getSpecialtyColor(station),
        icon: area.icon,
        fullName: area.fullName,
        section: section
      }
    };
  });

  return items.sort((a, b) => {
    const aIsINEP = isINEPStation(a.raw);
    const bIsINEP = isINEPStation(b.raw);

    // Priorizar estações com período válido
    if (aIsINEP && !bIsINEP) return -1;
    if (!aIsINEP && bIsINEP) return 1;

    // Ordenar por ano descendente
    const aYear = getStationYear(a.raw);
    const bYear = getStationYear(b.raw);
    return bYear - aYear;
  });
});

const filteredInepStations = computed(() => {
  return globalFilteredStations.value.filter(isINEPStation);
});

const filteredRevalidaFacilStations = computed(() => {
  return globalFilteredStations.value.filter(isRevalidaFacilStation);
});

const totalStations = computed(() => {
  // Contar estações INEP (não duplicadas)
  const inepTotal = filteredInepStations.value.length;

  // Contar estações Revalida Fácil por subseção (incluindo duplicações)
  const revalidaFacilTotal =
    filteredStationsRevalidaFacilClinicaMedica.value.length +
    filteredStationsRevalidaFacilCirurgia.value.length +
    filteredStationsRevalidaFacilPediatria.value.length +
    filteredStationsRevalidaFacilGO.value.length +
    filteredStationsRevalidaFacilPreventiva.value.length +
    filteredStationsRevalidaFacilProcedimentos.value.length;

  return inepTotal + revalidaFacilTotal;
});

async function fetchStations() {
  isLoadingStations.value = true;
  errorMessage.value = '';
  stations.value = [];

  clearEditStatusCache();

  try {
    // 🚀 OTIMIZAÇÃO: Carregar apenas metadados (id, título, especialidade, numeroDaEstacao)
    // Reduz de ~100MB para ~500KB de dados iniciais
    const stationsColRef = collection(db, 'estacoes_clinicas');
    const querySnapshot = await getDocs(stationsColRef);

    const stationsList = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Carregar apenas campos essenciais para listagem
      stationsList.push({
        id: doc.id,
        tituloEstacao: data.tituloEstacao,
        especialidade: data.especialidade,
        idEstacao: data.idEstacao,
        numeroDaEstacao: data.numeroDaEstacao || 0,
        criadoEmTimestamp: data.criadoEmTimestamp,
        hasBeenEdited: data.hasBeenEdited || false
        // Campos pesados (checklist, anamnese, etc) serão carregados sob demanda
      });
    });

    stationsList.sort((a, b) => {
      const numA = a.numeroDaEstacao || 0;
      const numB = b.numeroDaEstacao || 0;
      return numA - numB;
    });

    stations.value = stationsList;

    await preloadEditStatuses(stationsList);

    if (currentUser.value) {
      await fetchUserScores();
    }

    if (stations.value.length === 0) {
      errorMessage.value = "Nenhuma estação encontrada no Firestore na coleção 'estacoes_clinicas'.";
    }

  } catch (error) {
    console.error("ERRO ao buscar lista de estações:", error);
    errorMessage.value = `Falha ao buscar estações: ${error.message}`;
    if (error.code === 'permission-denied') {
      errorMessage.value += " (Erro de permissão! Verifique as Regras de Segurança do Firestore)";
    } else if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
      errorMessage.value += " (Erro de rede! Verifique sua conexão ou as configurações de CORS/segurança do navegador)";
    }
  } finally {
    isLoadingStations.value = false;
  }
}

async function fetchUserScores() {
  if (!currentUser.value) return;
  
  try {
    const userDocRef = doc(db, 'usuarios', currentUser.value.uid);
    const userDocSnap = await getDoc(userDocRef);
    
    const scores = {};
    
    if (userDocSnap.exists()) {
      const userData = userDocSnap.data();
      const estacoesConcluidas = userData.estacoesConcluidas || [];
      
      estacoesConcluidas.forEach((estacao) => {
        if (estacao.idEstacao && estacao.nota !== undefined) {
          if (!scores[estacao.idEstacao] || estacao.nota > scores[estacao.idEstacao].score) {
            scores[estacao.idEstacao] = {
              score: estacao.nota,
              maxScore: 100,
              date: estacao.data?.toDate ? estacao.data.toDate() : estacao.data,
              nomeEstacao: estacao.nomeEstacao,
              especialidade: estacao.especialidade,
              origem: estacao.origem
            };
          }
        }
      });
    }
    
    userScores.value = scores;
    
  } catch (error) {
    console.error("ERRO ao buscar pontuações do usuário:", error);
  }
}

// 🚀 OTIMIZAÇÃO: Carregar estação completa sob demanda (lazy loading)
async function loadFullStation(stationId) {
  // Verificar se já está em cache
  if (fullStationsCache.value.has(stationId)) {
    return fullStationsCache.value.get(stationId);
  }

  isLoadingFullStation.value = true;
  try {
    const stationDocRef = doc(db, 'estacoes_clinicas', stationId);
    const stationDocSnap = await getDoc(stationDocRef);

    if (stationDocSnap.exists()) {
      const fullStationData = { id: stationId, ...stationDocSnap.data() };

      // Armazenar em cache
      fullStationsCache.value.set(stationId, fullStationData);

      return fullStationData;
    } else {
      console.error(`Estação ${stationId} não encontrada`);
      return null;
    }
  } catch (error) {
    console.error('Erro ao carregar estação completa:', error);
    errorMessage.value = `Erro ao carregar estação: ${error.message}`;
    return null;
  } finally {
    isLoadingFullStation.value = false;
  }
}

async function searchCandidates() {
  if (!candidateSearchQuery.value?.trim()) {
    candidateSearchSuggestions.value = [];
    showCandidateSuggestions.value = false;
    return;
  }

  isLoadingCandidateSearch.value = true;
  try {
    const searchTerm = candidateSearchQuery.value.trim().toLowerCase();
    
    if (!currentUser.value?.uid) {
      throw new Error('Usuário não autenticado');
    }
    
    const usuariosRef = collection(db, 'usuarios');
    
    const snapshot = await getDocs(usuariosRef);
    const candidates = [];
    
    snapshot.forEach((doc) => {
      try {
        const userData = doc.data();
        const fullName = `${userData.nome || ''} ${userData.sobrenome || ''}`.toLowerCase();
        const email = (userData.email || '').toLowerCase();
        
        if (fullName.includes(searchTerm) || email.includes(searchTerm)) {
          candidates.push({
            uid: doc.id,
            nome: userData.nome || 'Sem nome',
            sobrenome: userData.sobrenome || '',
            email: userData.email || 'Sem email',
            photoURL: userData.photoURL || null
          });
        }
      } catch (docError) {
        console.warn('Erro ao processar documento do usuário:', doc.id, docError);
      }
    });
    
    candidateSearchSuggestions.value = candidates.slice(0, 10);
    showCandidateSuggestions.value = candidates.length > 0;
    
  } catch (error) {
    console.error('Erro ao buscar candidatos:', error);
    candidateSearchSuggestions.value = [];
    showCandidateSuggestions.value = false;
    
    if (error.code === 'permission-denied') {
      console.warn('Permissão negada para buscar dados do candidato. Verifique as regras do Firestore.');
    }
  } finally {
    isLoadingCandidateSearch.value = false;
  }
}

async function selectCandidate(candidate) {
  selectedCandidate.value = candidate;
  candidateSearchQuery.value = `${candidate.nome} ${candidate.sobrenome}`.trim();
  showCandidateSuggestions.value = false;
  
  await fetchCandidateScores(candidate.uid);
}

async function fetchCandidateScores(candidateUid) {
  try {
    if (!candidateUid) {
      throw new Error('UID do candidato não fornecido');
    }
    
    const scores = {};
    
    const userDocRef = doc(db, 'usuarios', candidateUid);
    const userDocSnap = await getDoc(userDocRef);
    
    if (userDocSnap.exists()) {
      const userData = userDocSnap.data();
      const estacoesConcluidas = userData.estacoesConcluidas || [];
      
      estacoesConcluidas.forEach((estacao) => {
        try {
          if (estacao.idEstacao && estacao.nota !== undefined) {
            if (!scores[estacao.idEstacao] || estacao.nota > scores[estacao.idEstacao].score) {
              scores[estacao.idEstacao] = {
                score: estacao.nota,
                maxScore: 100,
                date: estacao.data?.toDate ? estacao.data.toDate() : estacao.data,
                nomeEstacao: estacao.nomeEstacao,
                especialidade: estacao.especialidade,
                origem: estacao.origem
              };
            }
          }
        } catch (estacaoError) {
          console.warn('Erro ao processar estação do candidato:', estacao, estacaoError);
        }
      });
    } else {
      console.warn('Documento do candidato não encontrado:', candidateUid);
    }
    
    selectedCandidateScores.value = scores;
    // console.log('Pontuações do candidato carregadas:', scores);
    
  } catch (error) {
    console.error('Erro ao buscar pontuações do candidato:', error);
    selectedCandidateScores.value = {};
    
    if (error.code === 'permission-denied') {
      console.warn('Permissão negada para buscar dados do candidato. Verifique as regras do Firestore.');
    }
  }
}

function clearCandidateSelection() {
  selectedCandidate.value = null;
  candidateSearchQuery.value = '';
  selectedCandidateScores.value = {};
  showCandidateSuggestions.value = false;
}

function getUserStationScore(stationId) {
  const scoresData = selectedCandidate.value ? selectedCandidateScores.value : userScores.value;
  const userScore = scoresData[stationId];
  
  if (!userScore) return null;
  
  const percentage = (userScore.score / userScore.maxScore) * 100;
  return {
    score: userScore.score,
    maxScore: userScore.maxScore,
    percentage: percentage.toFixed(1),
    date: userScore.date,
    sessionId: userScore.sessionId
  };
}

async function startSimulationAsActor(stationId) {
  if (!stationId) {
    console.error('stationId ausente:', stationId);
    errorApi.value = "ID da Estação ausente";
    alert("Erro: ID da estação não encontrado.");
    return;
  }

  try {
    creatingSessionForStationId.value = stationId;
    isLoadingSession.value = true;
    errorApi.value = '';

    // 🚀 OTIMIZAÇÃO: Carregar estação completa antes de navegar (lazy loading)
    // Isso pré-carrega a estação para a página de simulação usar
    const fullStation = await loadFullStation(stationId);
    if (!fullStation) {
      throw new Error('Não foi possível carregar os dados da estação');
    }

    // Encontrar a estação selecionada para expandir a seção correta
    const station = stations.value.find(s => s.id === stationId);
    if (station) {
      expandCorrectSection(station);
    }

    if (selectedCandidate.value) {
      const candidateData = {
        uid: selectedCandidate.value.uid,
        name: `${selectedCandidate.value.nome} ${selectedCandidate.value.sobrenome}`.trim(),
        email: selectedCandidate.value.email,
        photoURL: selectedCandidate.value.photoURL,
        selectedAt: Date.now(),
        sessionId: null
      };

      sessionStorage.setItem('selectedCandidate', JSON.stringify(candidateData));
    }

    // Navigate to simulation view without sessionId (view mode)
    // Resolve a rota para obter a URL completa
    const routeData = router.resolve({
      path: `/app/simulation/${stationId}`,
      query: {
        role: 'actor'
      }
    });

    // Limpar os campos de busca quando abre a simulação
    selectedStation.value = null;
    globalSearchQuery.value = '';

    // Abre a URL em uma nova janela/aba
    window.open(routeData.href, '_blank');

  } catch (error) {
    console.error('Erro ao navegar para simulação:', error);
    errorApi.value = `Erro: ${error.message}`;
    alert(`Erro ao iniciar simulação: ${error.message}`);
  } finally {
    isLoadingSession.value = false;
    creatingSessionForStationId.value = null;
  }
}

function goToEditStation(stationId) {
  router.push(`/app/edit-station/${stationId}`);
}

// Função para iniciar treinamento com IA
async function startAITraining(stationId) {
  if (!stationId) {
    console.error('stationId ausente:', stationId);
    alert("Erro: ID da estação não encontrado.");
    return;
  }

  try {
    // 🚀 OTIMIZAÇÃO: Carregar estação completa antes de navegar (lazy loading)
    const fullStation = await loadFullStation(stationId);
    if (!fullStation) {
      throw new Error('Não foi possível carregar os dados da estação');
    }

    // Encontrar a estação selecionada para expandir a seção correta
    const station = stations.value.find(s => s.id === stationId);
    if (station) {
      expandCorrectSection(station);
    }

    // Resolve a rota para obter a URL completa
    const routeData = router.resolve({
      path: `/app/simulation-ai/${stationId}`,
      query: {
        mode: 'ai-training'
      }
    });

    // Limpar os campos de busca quando abre a simulação
    selectedStation.value = null;
    globalSearchQuery.value = '';

    // Abre a URL em uma nova janela/aba
    window.open(routeData.href, '_blank');

  } catch (error) {
    console.error('Erro ao navegar para treinamento com IA:', error);
    alert(`Erro ao iniciar treinamento: ${error.message}`);
  }
}

// Função para expandir a seção correta baseada na estação selecionada
function expandCorrectSection(station) {
  // Sempre mostrar a seção de provas anteriores se for INEP
  if (isINEPStation(station)) {
    showPreviousExamsSection.value = true;
    return;
  }

  // Se for estação REVALIDA_FACIL, expandir a seção correspondente
  if (isRevalidaFacilStation(station)) {
    showRevalidaFacilStations.value = true;

    // Expandir todas as subseções baseadas nas especialidades da estação
    const especialidades = getRevalidaFacilSpecialty(station);

    // Expandir cada subseção correspondente
    if (especialidades.includes('clinica-medica')) {
      showRevalidaFacilClinicaMedica.value = true;
    }
    if (especialidades.includes('cirurgia')) {
      showRevalidaFacilCirurgia.value = true;
    }
    if (especialidades.includes('pediatria')) {
      showRevalidaFacilPediatria.value = true;
    }
    if (especialidades.includes('ginecologia')) {
      showRevalidaFacilGO.value = true;
    }
    if (especialidades.includes('preventiva')) {
      showRevalidaFacilPreventiva.value = true;
    }
    if (especialidades.includes('procedimentos')) {
      showRevalidaFacilProcedimentos.value = true;
    }
  }
}

// --- Funções para Simulação Sequencial ---
function toggleSequentialConfig() {
  showSequentialConfig.value = !showSequentialConfig.value;
  if (!showSequentialConfig.value) {
    resetSequentialConfig();
  }
}

function resetSequentialConfig() {
  selectedStationsSequence.value = [];
  sequentialMode.value = false;
  isSequentialModeConfiguring.value = false;
  currentSequenceIndex.value = 0;
  sequentialSessionId.value = null;
}

// Helper function to check if station is in sequence (performance optimization)
function isStationInSequence(stationId) {
  return selectedStationsSequence.value.some(s => s.id === stationId);
}

function addToSequence(station) {
  if (!isStationInSequence(station.id)) {
    selectedStationsSequence.value.push({
      id: station.id,
      titulo: getCleanStationTitle(station.tituloEstacao),
      especialidade: station.especialidade,
      area: getStationArea(station),
      order: selectedStationsSequence.value.length + 1
    });
  }
}

function removeFromSequence(stationId) {
  const index = selectedStationsSequence.value.findIndex(s => s.id === stationId);
  if (index > -1) {
    selectedStationsSequence.value.splice(index, 1);
    // Reordenar
    selectedStationsSequence.value.forEach((station, idx) => {
      station.order = idx + 1;
    });
  }
}

function moveStationInSequence(fromIndex, toIndex) {
  const stations = [...selectedStationsSequence.value];
  const [movedStation] = stations.splice(fromIndex, 1);
  stations.splice(toIndex, 0, movedStation);

  // Reordenar
  stations.forEach((station, idx) => {
    station.order = idx + 1;
  });

  selectedStationsSequence.value = stations;
}

async function startSequentialSimulation() {
  if (selectedStationsSequence.value.length === 0) {
    alert('Selecione pelo menos uma estação para a simulação sequencial');
    return;
  }

  try {
    isSequentialModeConfiguring.value = true;
    sequentialMode.value = true;
    currentSequenceIndex.value = 0;

    // Gerar ID único para a sessão sequencial
    sequentialSessionId.value = `seq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Armazenar configuração da sequência no sessionStorage
    sessionStorage.setItem('sequentialSession', JSON.stringify({
      sessionId: sequentialSessionId.value,
      sequence: selectedStationsSequence.value,
      currentIndex: 0,
      startedAt: new Date().toISOString()
    }));

    // Iniciar primeira estação
    await startCurrentSequentialStation();

  } catch (error) {
    console.error('Erro ao iniciar simulação sequencial:', error);
    alert(`Erro ao iniciar simulação sequencial: ${error.message}`);
    resetSequentialConfig();
  }
}

async function startCurrentSequentialStation() {
  if (currentSequenceIndex.value >= selectedStationsSequence.value.length) {
    alert('Simulação sequencial concluída!');
    resetSequentialConfig();
    return;
  }

  const currentStation = selectedStationsSequence.value[currentSequenceIndex.value];

  try {
    // 🚀 OTIMIZAÇÃO: Carregar estação completa antes de navegar (lazy loading)
    const fullStation = await loadFullStation(currentStation.id);
    if (!fullStation) {
      throw new Error('Não foi possível carregar os dados da estação');
    }

    // Atualizar sessionStorage com índice atual
    const sequentialData = JSON.parse(sessionStorage.getItem('sequentialSession') || '{}');
    sequentialData.currentIndex = currentSequenceIndex.value;
    sessionStorage.setItem('sequentialSession', JSON.stringify(sequentialData));

    // Navegar para a estação atual
    const routeData = router.resolve({
      path: `/app/simulation/${currentStation.id}`,
      query: {
        role: 'actor',
        sequential: 'true',
        sequenceId: sequentialSessionId.value,
        sequenceIndex: currentSequenceIndex.value,
        totalStations: selectedStationsSequence.value.length
      }
    });

    window.open(routeData.href, '_blank');

  } catch (error) {
    console.error('Erro ao iniciar estação sequencial:', error);
    alert(`Erro ao iniciar estação: ${error.message}`);
  }
}

function nextSequentialStation() {
  if (currentSequenceIndex.value < selectedStationsSequence.value.length - 1) {
    currentSequenceIndex.value++;
    startCurrentSequentialStation();
  } else {
    alert('Simulação sequencial concluída!');
    resetSequentialConfig();
  }
}

function goToAdminUpload() {
  router.push('/app/admin-upload');
}

function copyLink() {
  try {
    navigator.clipboard.writeText(generatedCandidateLink.value);
    // console.log('Link copiado!');
  } catch (error) {
    console.error('Falha ao copiar link:', error);
  }
}

onMounted(() => {
  document.documentElement.classList.add('station-list-page-active');
  fetchStations();

  // Limpar campos de busca quando a página é carregada (quando volta da simulação)
  selectedStation.value = null;
  globalSearchQuery.value = '';

  // Listener para detectar quando o usuário volta para a janela principal
  const handleFocus = () => {
    // Limpar campos se eles contêm IDs (indicando que o usuário voltou da simulação)
    if (selectedStation.value && !globalSearchQuery.value) {
      selectedStation.value = null;
      globalSearchQuery.value = '';
    }
  };

  window.addEventListener('focus', handleFocus);

  // SISTEMA SIMPLIFICADO DE GARANTIA DE VISIBILIDADE DOS ÍCONES
  const ensureIconVisibility = () => {
    try {
      const iconElements = document.querySelectorAll('.sequential-selection-btn .v-icon');
      if (iconElements.length === 0) return;

      iconElements.forEach(icon => {
        // Aplicar apenas estilos básicos de visibilidade
        icon.style.opacity = '1';
        icon.style.visibility = 'visible';
        icon.style.display = 'inline-flex';
      });
    } catch (error) {
      console.warn('Error in ensureIconVisibility:', error);
    }
  };

  // Executar imediatamente
  ensureIconVisibility();

  // Executar apenas uma vez após carregamento
  setTimeout(ensureIconVisibility, 500);

  // FUNÇÃO SIMPLIFICADA: Aplicar apenas quando necessário
  const fixIconsOnce = () => {
    const buttons = document.querySelectorAll('.sequential-selection-btn');
    if (buttons.length === 0) return;

    buttons.forEach(btn => {
      const icon = btn.querySelector('.v-icon');
      if (icon && (!icon.innerHTML.trim() || icon.innerHTML.length < 3)) {
        const isSelected = btn.getAttribute('variant') === 'tonal';

        // Substituir apenas se vazio
        if (isSelected) {
          icon.innerHTML = '✓';
          icon.style.color = '#2E7D32';
        } else {
          icon.innerHTML = '+';
          icon.style.color = '#1565C0';
        }

        // Estilos básicos
        icon.style.fontSize = '18px';
        icon.style.fontWeight = 'bold';
        icon.style.display = 'inline-flex';
        icon.style.alignItems = 'center';
        icon.style.justifyContent = 'center';
      }
    });
  };

  // Executar apenas uma vez
  setTimeout(fixIconsOnce, 1000);

  // Observer DESABILITADO temporariamente para evitar travamentos
  // const observer = new MutationObserver(() => {
  //   // Observer removido por causar travamentos
  // });

  // Cleanup no onUnmounted
  onUnmounted(() => {
    window.removeEventListener('focus', handleFocus);
    // observer.disconnect(); // REMOVIDO: observer não está sendo usado
  });
});

// Debounce the search query to prevent excessive API calls
let searchTimeout;
watch(globalSearchQuery, (newValue) => {
  // Clear previous timeout
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }

  // Debounce search to reduce performance impact
  searchTimeout = setTimeout(() => {
    // A lógica de filtragem já está nas computed properties
    // This prevents excessive re-computation during typing
  }, 300);
});

watch(currentUser, (newUser) => {
  if (newUser && stations.value.length > 0) {
    fetchUserScores();
  }
}, { immediate: true });

function toggleCollapse() {
  const wrapper = document.querySelector('.layout-wrapper')
  wrapper?.classList.toggle('layout-vertical-nav-collapsed')
}
onUnmounted(() => {
  document.documentElement.classList.remove('station-list-page-active');
  const wrapper = document.querySelector('.layout-wrapper')
  wrapper?.classList.remove('layout-vertical-nav-collapsed')
})

function toggleUserMenu() { showUserMenu.value = !showUserMenu.value; }
function logout() { signOut(firebaseAuth); }
function toggleSidebar() { sidebarOpen.value = !sidebarOpen.value; }
function goToHome() { router.push('/'); }
function openGoogleMeet() { window.open('https://meet.google.com', '_blank'); }
function openWhatsApp() { window.open('https://wa.me/', '_blank'); }
function getStatusText(status) { return status; }

const isDebugMode = ref(false);
const selectedElement = ref(null);
const debugStyles = reactive({});

function toggleDebugMode() {
  isDebugMode.value = !isDebugMode.value;
  if (!isDebugMode.value) {
    selectedElement.value = null;
    debugStyles.value = {};
  }
}

function selectElement(event) {
  if (!isDebugMode.value) return;
  event.preventDefault();
  selectedElement.value = event.target;
  debugStyles.backgroundColor = event.target.style.backgroundColor || '';
  debugStyles.color = event.target.style.color || '';
}

function applyStyles() {
  if (selectedElement.value) {
    Object.assign(selectedElement.value.style, debugStyles);
  }
}

const exampleVariable = ref(null);
</script>

<template>
  <v-container fluid class="pa-0 main-content-container">
    <v-tooltip location="right">
      <template #activator="{ props }">
        <v-btn
          icon
          fixed
          top
          left
          @click="toggleCollapse"
          class="ma-3 z-index-5"
          v-bind="props"
          aria-label="Abrir/Fechar menu lateral"
        >
          <v-icon aria-hidden="false" role="img" aria-label="Menu de navegação">ri-menu-line</v-icon>
        </v-btn>
      </template>
      Abrir/Fechar menu lateral
    </v-tooltip>
     <v-row>
      <v-col cols="12" md="12" class="mx-auto">
        <v-card v-if="isAdmin" class="mb-4" elevation="2" rounded color="error" variant="tonal">
          <v-card-text class="py-3">
            <v-row align="center">
              <v-col>
                <div class="d-flex align-center">
                  <v-icon class="me-2" color="error">ri-upload-cloud-2-line</v-icon>
                  <div>
                    <div class="text-subtitle-1 font-weight-bold">Área do Administrador</div>
                    <div class="text-caption text-medium-emphasis">Upload e gerenciamento de estações</div>
                  </div>
                </div>
              </v-col>
              <v-col cols="auto">
                <v-btn
                  color="error"
                  variant="elevated"
                  size="default"
                  @click="goToAdminUpload"
                  class="text-none"
                  prepend-icon="ri-upload-line"
                >
                  Admin Upload
                </v-btn>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <!-- Configuração de Simulação Sequencial -->
        <v-card class="mb-4" elevation="2" rounded color="primary" variant="tonal">
          <v-card-text class="py-3">
            <v-row align="center">
              <v-col>
                <div class="d-flex align-center">
                  <v-icon class="me-2" color="primary">ri-play-list-line</v-icon>
                  <div>
                    <div class="text-subtitle-1 font-weight-bold">Simulação Sequencial de Estações</div>
                    <div class="text-caption text-medium-emphasis">Configure uma sequência de estações para simulação contínua</div>
                  </div>
                </div>
              </v-col>
              <v-col cols="auto">
                <v-btn
                  :color="showSequentialConfig ? 'warning' : 'primary'"
                  variant="elevated"
                  size="default"
                  @click="toggleSequentialConfig"
                  class="text-none"
                  :prepend-icon="showSequentialConfig ? 'ri-close-line' : 'ri-settings-3-line'"
                >
                  {{ showSequentialConfig ? 'Cancelar' : 'Configurar Sequência' }}
                </v-btn>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <!-- Configuração da Sequência (expandida) -->
        <v-expand-transition>
          <v-card v-if="showSequentialConfig" class="mb-4" elevation="3" rounded>
            <v-card-title class="bg-primary text-white d-flex align-center">
              <v-icon class="me-2">ri-list-ordered</v-icon>
              Configuração da Simulação Sequencial
            </v-card-title>

            <v-card-text class="pa-4">
              <!-- Lista de Estações Selecionadas -->
              <div v-if="selectedStationsSequence.length > 0" class="mb-4">
                <div class="text-subtitle-1 font-weight-medium pa-0 mb-2 d-flex align-center">
                  <v-icon class="me-2">ri-check-line</v-icon>
                  Estações Selecionadas ({{ selectedStationsSequence.length }})
                </div>

                <v-list density="compact" class="bg-grey-lighten-4 rounded">
                  <v-list-item
                    v-for="(station, index) in selectedStationsSequence"
                    :key="station.id"
                    class="mb-1"
                  >
                    <template #prepend>
                      <v-chip
                        color="primary"
                        size="small"
                        variant="elevated"
                        class="me-3"
                      >
                        {{ station.order }}
                      </v-chip>
                      <v-icon :color="station.area.key === 'clinica-medica' ? 'blue' : station.area.key === 'cirurgia' ? 'indigo' : station.area.key === 'pediatria' ? 'green' : station.area.key === 'ginecologia' ? 'pink' : station.area.key === 'preventiva' ? 'orange' : 'grey'">
                        ri-file-list-3-line
                      </v-icon>
                    </template>

                    <v-list-item-title class="text-body-2 font-weight-medium">
                      {{ station.titulo }}
                    </v-list-item-title>
                    <v-list-item-subtitle class="text-caption">
                      {{ station.area.fullName }}
                    </v-list-item-subtitle>

                    <template #append>
                      <div class="d-flex gap-1">
                        <v-btn
                          v-if="index > 0"
                          icon
                          size="x-small"
                          variant="text"
                          @click="moveStationInSequence(index, index - 1)"
                        >
                          <v-icon>ri-arrow-up-line</v-icon>
                        </v-btn>
                        <v-btn
                          v-if="index < selectedStationsSequence.length - 1"
                          icon
                          size="x-small"
                          variant="text"
                          @click="moveStationInSequence(index, index + 1)"
                        >
                          <v-icon>ri-arrow-down-line</v-icon>
                        </v-btn>
                        <v-btn
                          icon
                          size="x-small"
                          color="error"
                          variant="text"
                          @click="removeFromSequence(station.id)"
                        >
                          <v-icon>ri-delete-bin-line</v-icon>
                        </v-btn>
                      </div>
                    </template>
                  </v-list-item>
                </v-list>

                <v-row class="mt-3">
                  <v-col>
                    <v-btn
                      color="success"
                      variant="elevated"
                      block
                      size="large"
                      @click="startSequentialSimulation"
                      :disabled="selectedStationsSequence.length === 0"
                      prepend-icon="ri-play-line"
                    >
                      Iniciar Simulação Sequencial ({{ selectedStationsSequence.length }} estações)
                    </v-btn>
                  </v-col>
                  <v-col cols="auto">
                    <v-btn
                      color="warning"
                      variant="outlined"
                      @click="resetSequentialConfig"
                      prepend-icon="ri-refresh-line"
                    >
                      Limpar
                    </v-btn>
                  </v-col>
                </v-row>
              </div>

              <!-- Instruções -->
              <v-alert
                v-else
                type="info"
                variant="tonal"
                class="mb-0"
              >
                <template #title>Como usar a Simulação Sequencial</template>
                <div class="text-body-2 mt-2">
                  <p>1. Clique no botão <v-icon size="small">ri-plus-line</v-icon> ao lado de cada estação que deseja incluir na sequência</p>
                  <p>2. Organize a ordem das estações usando as setas ↑↓</p>
                  <p>3. Clique em "Iniciar Simulação Sequencial" para começar</p>
                  <p class="mt-2 font-weight-medium text-primary">A simulação abrirá cada estação sequencialmente em novas abas</p>
                </div>
              </v-alert>
            </v-card-text>
          </v-card>
        </v-expand-transition>

        <v-card v-if="selectedCandidate" class="mb-4" elevation="2" rounded>
          <v-card-title class="d-flex align-center justify-space-between">
            <div class="d-flex align-center">
              <v-icon class="me-2" color="success">ri-user-check-line</v-icon>
              <span class="text-h6">Candidato Selecionado</span>
            </div>
            <v-btn
              variant="outlined"
              size="small"
              color="error"
              @click="clearCandidateSelection"
              prepend-icon="ri-close-line"
            >
              Limpar
            </v-btn>
          </v-card-title>
          <v-card-text>
            <v-alert
              type="success"
              variant="tonal"
              class="mb-0"
            >
              <template #title>
                <div class="d-flex align-center">
                  <v-avatar size="32" class="me-2">
                    <v-img v-if="selectedCandidate.photoURL" :src="selectedCandidate.photoURL" />
                    <v-icon v-else>ri-user-line</v-icon>
                  </v-avatar>
                  <div>
                    <div class="font-weight-bold">{{ selectedCandidate.nome }} {{ selectedCandidate.sobrenome }}</div>
                    <div class="text-caption">{{ selectedCandidate.email }}</div>
                  </div>
                </div>
              </template>
              <div class="text-body-2 mt-2">
                Visualizando estatísticas deste candidato nas estações abaixo
              </div>
            </v-alert>
          </v-card-text>
        </v-card>

        <v-card v-if="!selectedCandidate" class="mb-4" elevation="2" rounded>
          <v-card-title class="d-flex align-center">
            <v-icon class="me-2" color="primary">ri-search-line</v-icon>
            <span class="text-h6">Buscar Candidato</span>
          </v-card-title>
          <v-card-text>
            <v-menu
              v-model="showCandidateSuggestions"
              :close-on-content-click="false"
              location="bottom"
              offset="4"
              max-height="300"
            >
              <template #activator="{ props }">
                <v-text-field
                  v-bind="props"
                  v-model="candidateSearchQuery"
                  label="Digite o nome do candidato"
                  placeholder="Ex: João Silva"
                  prepend-inner-icon="ri-search-line"
                  variant="outlined"
                  :loading="isLoadingCandidateSearch"
                  @input="searchCandidates"
                  @focus="candidateSearchQuery && searchCandidates()"
                  clearable
                  hide-details
                  class="rounded-input"
                />
              </template>
              
              <v-card
                v-if="candidateSearchSuggestions.length > 0"
                elevation="8"
                max-height="300"
                style="overflow-y: auto;"
              >
                <v-list density="compact">
                  <v-list-item
                    v-for="candidate in candidateSearchSuggestions"
                    :key="candidate.uid"
                    @click="selectCandidate(candidate)"
                    class="candidate-suggestion-item"
                  >
                    <template #prepend>
                      <v-avatar size="32">
                        <v-img v-if="candidate.photoURL" :src="candidate.photoURL" />
                        <v-icon v-else>ri-user-line</v-icon>
                      </v-avatar>
                    </template>
                    <v-list-item-title>{{ candidate.nome }} {{ candidate.sobrenome }}</v-list-item-title>
                    <v-list-item-subtitle>{{ candidate.email }}</v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-card>
            </v-menu>
          </v-card-text>
        </v-card>
        <v-card class="mb-4" elevation="2" rounded>
          <v-card-title class="d-flex align-center">
            <v-icon class="me-2" color="primary">ri-search-line</v-icon>
            <span class="text-h6">Buscar Estação Globalmente ({{ totalStations }})</span>
          </v-card-title>
          <v-card-text>
            <!-- KiloCode Debug: Exibir globalAutocompleteItems no console -->
            <!-- KiloCode Debug: Log movido para a computed property globalAutocompleteItems -->
            <v-autocomplete
              v-model="selectedStation"
              v-model:search="globalSearchQuery"
              :items="globalAutocompleteItems"
              item-title="title"
              item-value="id"
              label="Digite para buscar estações..."
              placeholder="Ex: Estação 1, Clínica Médica"
              prepend-inner-icon="ri-search-line"
              variant="outlined"
              density="compact"
              hide-details
              clearable
              class="rounded-input"
              no-data-text=""
              hide-no-data
            >
              <template #item="{ props, item }">
                <v-list-item
                  v-bind="props"
                  :title="item.title"
                  :subtitle="item.raw.fullName"
                  @click="startSimulationAsActor(item.raw.id)"
                >
                  <template #prepend>
                    <v-icon :color="item.raw.color">{{ item.raw.icon }}</v-icon>
                  </template>
                </v-list-item>
              </template>
            </v-autocomplete>
          </v-card-text>
        </v-card>

        <v-expansion-panels variant="accordion" class="mb-6">
          
          <!-- INEP Revalida -->
          <v-expansion-panel class="contained-panel">
            <v-expansion-panel-title class="text-h6 font-weight-bold rounded-button-title">
              <template #default="{ expanded }">
                <v-row no-gutters align="center" class="w-100">
                  <v-col cols="auto">
                    <v-img :src="inepIcon" style="height: 80px; width: 80px; margin-right: 24px;" />
                  </v-col>
                  <v-col class="d-flex flex-column">
                    <div class="text-h6 font-weight-bold">INEP Revalida – Provas Anteriores</div>
                  </v-col>
                  <v-col cols="auto">
                    <v-badge :content="filteredInepStations.length" color="primary" inline />
                  </v-col>
                </v-row>
              </template>
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <v-expansion-panels variant="accordion" class="mt-4">
                
                <template v-for="period in inepPeriods" :key="period">
                  <v-expansion-panel v-if="filteredStationsByInepPeriod[period]?.length > 0">
                    <v-expansion-panel-title class="text-subtitle-1 font-weight-medium">
                      <template #default="{ expanded }">
                        <v-row no-gutters align="center">
                          <v-col cols="auto">
                            <v-icon class="me-2" color="info">ri-calendar-event-line</v-icon>
                          </v-col>
                          <v-col>
                            INEP {{ period }}
                          </v-col>
                          <v-col cols="auto">
                            <v-badge :content="filteredStationsByInepPeriod[period].length" color="info" inline />
                          </v-col>
                        </v-row>
                      </template>
                    </v-expansion-panel-title>
                    <v-expansion-panel-text>
                      <v-list density="comfortable">
                        <v-list-item
                          v-for="station in filteredStationsByInepPeriod[period]"
                          :key="station.id"
                          class="mb-2 rounded-lg elevation-1 station-list-item clickable-card"
                          :style="{ backgroundColor: getSpecialtyColor(station) + getBackgroundOpacity(station) }"
                          @click="startSimulationAsActor(station.id)"
                        >
                          <template #prepend>
                            <v-icon color="info">ri-file-list-3-line</v-icon>
                          </template>
                          <v-list-item-title class="font-weight-bold text-body-1">{{ getCleanStationTitle(station.tituloEstacao) }}</v-list-item-title>
                          <v-list-item-subtitle class="text-caption">{{ station.especialidade }}</v-list-item-subtitle>
                          
                          <div class="d-flex align-center gap-2 mt-1">
                            <v-chip
                              v-if="getStationEditStatus(station.id).hasBeenEdited === false"
                              color="warning"
                              variant="flat"
                              size="x-small"
                              class="edit-status-chip"
                            >
                              <v-icon start size="12">ri-alert-line</v-icon>
                              NÃO EDITADA
                            </v-chip>
                            <v-chip
                              v-else-if="getStationEditStatus(station.id).hasBeenEdited === true"
                              color="success"
                              variant="flat"
                              size="x-small"
                              class="edit-status-chip"
                            >
                              <v-icon start size="12">ri-check-line</v-icon>
                              EDITADA ({{ getStationEditStatus(station.id).totalEdits || 0 }}x)
                            </v-chip>
                          </div>

                          <div v-if="getUserStationScore(station.id)" class="mt-2">
                            <v-chip 
                              :color="getUserStationScore(station.id).percentage >= 70 ? 'success' : getUserStationScore(station.id).percentage >= 50 ? 'warning' : 'error'"
                              variant="flat"
                              size="small"
                              class="user-score-chip"
                            >
                              <v-icon start size="16">ri-star-fill</v-icon>
                              {{ getUserStationScore(station.id).score }}/{{ getUserStationScore(station.id).maxScore }} ({{ getUserStationScore(station.id).percentage }}%)
                            </v-chip>
                          </div>
                          <template #append>
                            <div class="d-flex align-center">
                              <v-progress-circular
                                v-if="creatingSessionForStationId === station.id"
                                indeterminate
                                size="24"
                                color="primary"
                                class="me-2 sequential-selection-btn"
                              />
                              <v-btn
                                v-if="showSequentialConfig"
                                :color="isStationInSequence(station.id) ? 'success' : 'primary'"
                                :variant="isStationInSequence(station.id) ? 'tonal' : 'outlined'"
                                size="small"
                                @click.stop="isStationInSequence(station.id) ? removeFromSequence(station.id) : addToSequence(station)"
                                class="me-2 sequential-selection-btn"
                                :aria-label="isStationInSequence(station.id) ? 'Remover da sequência' : 'Adicionar à sequência'"
                              >
                                <v-icon
                                :style="{ color: isStationInSequence(station.id) ? 'var(--v-theme-success)' : 'var(--v-theme-primary)', opacity: '1', fontWeight: '600', visibility: 'visible' }"
                                :data-fallback="isStationInSequence(station.id) ? '✓' : '+'"
                                :aria-hidden="false"
                                :aria-label="isStationInSequence(station.id) ? 'Estação selecionada' : 'Selecionar estação'"
                              >{{ isStationInSequence(station.id) ? 'ri-check-line' : 'ri-plus-line' }}</v-icon>
                              </v-btn>
                              <v-btn
                                v-if="isAdmin"
                                color="secondary"
                                variant="text"
                                size="small"
                                icon="ri-pencil-line"
                                @click.stop="goToEditStation(station.id)"
                                class="me-2 sequential-selection-btn"
                                aria-label="Editar Estação"
                              />
                              <v-btn
                                color="primary"
                                variant="text"
                                size="small"
                                icon="ri-robot-line"
                                @click.stop="startAITraining(station.id)"
                                class="me-2 sequential-selection-btn"
                                aria-label="Treinar com IA"
                              />
                            </div>
                          </template>
                        </v-list-item>
                      </v-list>
                    </v-expansion-panel-text>
                  </v-expansion-panel>
                </template>
              </v-expansion-panels>
            </v-expansion-panel-text>
          </v-expansion-panel>

          <!-- REVALIDA FÁCIL -->
          <v-expansion-panel class="contained-panel">
            <v-expansion-panel-title class="text-h6 font-weight-bold rounded-button-title">
              <template #default="{ expanded }">
                <v-row no-gutters align="center" class="w-100">
                  <v-col cols="auto">
                    <v-img :src="revalidaFlowIcon" style="height: 80px; width: 80px; margin-right: 24px;" />
                  </v-col>
                  <v-col class="d-flex flex-column">
                    <div class="text-h6 font-weight-bold">REVALIDA FLOW</div>
                  </v-col>
                  <v-col cols="auto">
                    <v-badge :content="filteredRevalidaFacilStations.length" color="primary" inline />
                  </v-col>
                </v-row>
              </template>
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <v-expansion-panels variant="accordion" class="mt-4">
                
                <v-expansion-panel v-if="filteredStationsRevalidaFacilClinicaMedica.length > 0">
                  <v-expansion-panel-title class="text-subtitle-1 font-weight-medium">
                    <template #default="{ expanded }">
                      <v-row no-gutters align="center">
                        <v-col cols="auto">
                          <v-icon class="me-2" color="info">ri-stethoscope-line</v-icon>
                        </v-col>
                        <v-col>
                          Clínica Médica
                        </v-col>
                        <v-col cols="auto">
                          <v-badge :content="filteredStationsRevalidaFacilClinicaMedica.length" color="info" inline />
                        </v-col>
                      </v-row>
                    </template>
                  </v-expansion-panel-title>
                  <v-expansion-panel-text>
                    <v-list density="comfortable">
                      <v-list-item
                        v-for="station in filteredStationsRevalidaFacilClinicaMedica"
                        :key="station.id"
                        class="mb-2 rounded-lg elevation-1 station-list-item clickable-card"
                        :style="{ backgroundColor: getSpecialtyColor(station, 'clinica-medica') + getBackgroundOpacity(station) }"
                        @click="startSimulationAsActor(station.id)"
                      >
                        <template #prepend>
                          <v-icon color="info">ri-file-list-3-line</v-icon>
                        </template>
                        <v-list-item-title class="font-weight-bold text-body-1 text-on-surface">{{ getCleanStationTitle(station.tituloEstacao) }}</v-list-item-title>
                        
                        <div class="d-flex flex-column gap-1 mt-2">
                          <div class="d-flex align-center gap-2">
                            <v-chip
                              v-if="verificarEdicaoHibrida(station).hasBeenEdited === false"
                              color="warning"
                              variant="flat"
                              size="x-small"
                              class="edit-status-chip"
                            >
                              <v-icon start size="12">ri-alert-line</v-icon>
                              NÃO EDITADA
                            </v-chip>
                            <v-chip
                              v-else-if="verificarEdicaoHibrida(station).hasBeenEdited === true"
                              color="success"
                              variant="flat"
                              size="x-small"
                              class="edit-status-chip"
                            >
                              <v-icon start size="12">ri-check-line</v-icon>
                              EDITADA ({{ verificarEdicaoHibrida(station).totalEdits || 0 }}x)
                            </v-chip>
                          </div>
                          
                          <div v-if="verificarEdicaoHibrida(station).createdDate" class="text-caption text-secondary">
                            <v-icon size="12" class="me-1">ri-calendar-line</v-icon>
                            Criada: {{ formatarDataBrasil(verificarEdicaoHibrida(station).createdDate) }}
                          </div>

                          <div v-if="getStationEditStatus(station.id).lastEditDate && getStationEditStatus(station.id).hasBeenEdited" class="text-caption text-secondary">
                            <v-icon size="12" class="me-1">ri-edit-line</v-icon>
                            Editada: {{ formatarDataBrasil(getStationEditStatus(station.id).lastEditDate) }}
                          </div>
                        </div>
                        
                        <div v-if="getUserStationScore(station.id)" class="mt-2">
                          <v-chip
                            :color="getUserStationScore(station.id).percentage >= 70 ? 'success' : getUserStationScore(station.id).percentage >= 50 ? 'warning' : 'error'"
                            variant="flat"
                            size="small"
                            class="user-score-chip"
                          >
                            <v-icon start size="16">ri-star-fill</v-icon>
                            {{ getUserStationScore(station.id).score }}/{{ getUserStationScore(station.id).maxScore }} ({{ getUserStationScore(station.id).percentage }}%)
                          </v-chip>
                        </div>
                        <template #append>
                          <div class="d-flex align-center">
                            <v-progress-circular
                              v-if="creatingSessionForStationId === station.id"
                              indeterminate
                              size="24"
                              color="primary"
                              class="me-2 sequential-selection-btn"
                            />
                            <v-btn
                              v-if="showSequentialConfig"
                              :color="isStationInSequence(station.id) ? 'success' : 'primary'"
                              :variant="isStationInSequence(station.id) ? 'tonal' : 'outlined'"
                              size="small"
                              @click.stop="isStationInSequence(station.id) ? removeFromSequence(station.id) : addToSequence(station)"
                              class="me-2 sequential-selection-btn"
                              :aria-label="isStationInSequence(station.id) ? 'Remover da sequência' : 'Adicionar à sequência'"
                            >
                              <v-icon
                                :style="{ color: isStationInSequence(station.id) ? 'var(--v-theme-success)' : 'var(--v-theme-primary)', opacity: '1', fontWeight: '600' }"
                                :aria-hidden="false"
                                :aria-label="isStationInSequence(station.id) ? 'Estação selecionada' : 'Selecionar estação'"
                              >{{ isStationInSequence(station.id) ? 'ri-check-line' : 'ri-plus-line' }}</v-icon>
                            </v-btn>
                            <v-btn
                              v-if="isAdmin"
                              color="secondary"
                              variant="text"
                              size="small"
                              icon="ri-pencil-line"
                              @click.stop="goToEditStation(station.id)"
                              class="me-2 sequential-selection-btn"
                              aria-label="Editar Estação"
                            />
                            <v-btn
                              color="primary"
                              variant="text"
                              size="small"
                              icon="ri-robot-line"
                              @click.stop="startAITraining(station.id)"
                              class="me-2 sequential-selection-btn"
                              aria-label="Treinar com IA"
                            />
                          </div>
                        </template>
                      </v-list-item>
                    </v-list>
                  </v-expansion-panel-text>
                </v-expansion-panel>

                <v-expansion-panel v-if="filteredStationsRevalidaFacilCirurgia.length > 0">
                  <v-expansion-panel-title class="text-subtitle-1 font-weight-medium">
                    <template #default="{ expanded }">
                      <v-row no-gutters align="center">
                        <v-col cols="auto">
                          <v-icon :key="'cirurgia-icon'" class="me-2" color="primary">ri-knife-line</v-icon>
                        </v-col>
                        <v-col>
                          Cirurgia
                        </v-col>
                        <v-col cols="auto">
                          <v-badge :content="filteredStationsRevalidaFacilCirurgia.length" color="primary" inline />
                        </v-col>
                      </v-row>
                    </template>
                  </v-expansion-panel-title>
                  <v-expansion-panel-text>
                    <v-list density="comfortable">
                      <v-list-item
                        v-for="station in filteredStationsRevalidaFacilCirurgia"
                        :key="station.id"
                        class="mb-2 rounded-lg elevation-1 station-list-item clickable-card"
                        :style="{ backgroundColor: getSpecialtyColor(station, 'cirurgia') + getBackgroundOpacity(station) }"
                        @click="startSimulationAsActor(station.id)"
                      >
                        <template #prepend>
                          <v-icon color="info">ri-file-list-3-line</v-icon>
                        </template>
                        <v-list-item-title class="font-weight-bold text-body-1 text-on-surface">{{ getCleanStationTitle(station.tituloEstacao) }}</v-list-item-title>
                        
                        <div class="d-flex flex-column gap-1 mt-2">
                          <div class="d-flex align-center gap-2">
                            <v-chip 
                              v-if="verificarEdicaoHibrida(station).hasBeenEdited === false" 
                              color="warning" 
                              variant="flat" 
                              size="x-small"
                              class="edit-status-chip"
                            >
                              <v-icon start size="12">ri-alert-line</v-icon>
                              NÃO EDITADA
                            </v-chip>
                            <v-chip 
                              v-else-if="verificarEdicaoHibrida(station).hasBeenEdited === true" 
                              color="success" 
                              variant="flat" 
                              size="x-small"
                              class="edit-status-chip"
                            >
                              <v-icon start size="12">ri-check-line</v-icon>
                              EDITADA ({{ verificarEdicaoHibrida(station).totalEdits || 0 }}x)
                            </v-chip>
                          </div>
                          
                          <div v-if="verificarEdicaoHibrida(station).createdDate" class="text-caption text-secondary">
                            <v-icon size="12" class="me-1">ri-calendar-line</v-icon>
                            Criada: {{ formatarDataBrasil(verificarEdicaoHibrida(station).createdDate) }}
                          </div>
                          
                          <div v-if="verificarEdicaoHibrida(station).lastEditDate && verificarEdicaoHibrida(station).hasBeenEdited" class="text-caption text-secondary">
                            <v-icon size="12" class="me-1">ri-edit-line</v-icon>
                            Editada: {{ formatarDataBrasil(verificarEdicaoHibrida(station).lastEditDate) }}
                          </div>
                        </div>
                        
                        <div v-if="getUserStationScore(station.id)" class="mt-2">
                          <v-chip 
                            :color="getUserStationScore(station.id).percentage >= 70 ? 'success' : getUserStationScore(station.id).percentage >= 50 ? 'warning' : 'error'"
                            variant="flat"
                            size="small"
                            class="user-score-chip"
                          >
                            <v-icon start size="16">ri-star-fill</v-icon>
                            {{ getUserStationScore(station.id).score }}/{{ getUserStationScore(station.id).maxScore }} ({{ getUserStationScore(station.id).percentage }}%)
                          </v-chip>
                        </div>
                        <template #append>
                          <div class="d-flex align-center">
                            <v-progress-circular
                              v-if="creatingSessionForStationId === station.id"
                              indeterminate
                              size="24"
                              color="primary"
                              class="me-2 sequential-selection-btn"
                            />
                            <v-btn
                              v-if="showSequentialConfig"
                              :color="isStationInSequence(station.id) ? 'success' : 'primary'"
                              :variant="isStationInSequence(station.id) ? 'tonal' : 'outlined'"
                              size="small"
                              @click.stop="isStationInSequence(station.id) ? removeFromSequence(station.id) : addToSequence(station)"
                              class="me-2 sequential-selection-btn"
                              :aria-label="isStationInSequence(station.id) ? 'Remover da sequência' : 'Adicionar à sequência'"
                            >
                              <v-icon
                                :style="{ color: isStationInSequence(station.id) ? 'var(--v-theme-success)' : 'var(--v-theme-primary)', opacity: '1', fontWeight: '600' }"
                                :aria-hidden="false"
                                :aria-label="isStationInSequence(station.id) ? 'Estação selecionada' : 'Selecionar estação'"
                              >{{ isStationInSequence(station.id) ? 'ri-check-line' : 'ri-plus-line' }}</v-icon>
                            </v-btn>
                            <v-btn
                              v-if="isAdmin"
                              color="secondary"
                              variant="text"
                              size="small"
                              icon="ri-pencil-line"
                              @click.stop="goToEditStation(station.id)"
                              class="me-2 sequential-selection-btn"
                              aria-label="Editar Estação"
                            />
                            <v-btn
                              color="primary"
                              variant="text"
                              size="small"
                              icon="ri-robot-line"
                              @click.stop="startAITraining(station.id)"
                              class="me-2 sequential-selection-btn"
                              aria-label="Treinar com IA"
                            />
                          </div>
                        </template>
                      </v-list-item>
                    </v-list>
                  </v-expansion-panel-text>
                </v-expansion-panel>

                <v-expansion-panel v-if="filteredStationsRevalidaFacilPediatria.length > 0">
                  <v-expansion-panel-title class="text-subtitle-1 font-weight-medium">
                    <template #default="{ expanded }">
                      <v-row no-gutters align="center">
                        <v-col cols="auto">
                          <v-icon class="me-2" color="success">ri-bear-smile-line</v-icon>
                        </v-col>
                        <v-col>
                          Pediatria
                        </v-col>
                        <v-col cols="auto">
                          <v-badge :content="filteredStationsRevalidaFacilPediatria.length" color="success" inline />
                        </v-col>
                      </v-row>
                    </template>
                  </v-expansion-panel-title>
                  <v-expansion-panel-text>
                    <v-list density="comfortable">
                      <v-list-item
                        v-for="station in filteredStationsRevalidaFacilPediatria"
                        :key="station.id"
                        class="mb-2 rounded-lg elevation-1 station-list-item clickable-card"
                        :style="{ backgroundColor: getSpecialtyColor(station, 'pediatria') + getBackgroundOpacity(station) }"
                        @click="startSimulationAsActor(station.id)"
                      >
                        <template #prepend>
                          <v-icon color="info">ri-file-list-3-line</v-icon>
                        </template>
                        <v-list-item-title class="font-weight-bold text-body-1 text-on-surface">{{ getCleanStationTitle(station.tituloEstacao) }}</v-list-item-title>
                        
                        <div class="d-flex flex-column gap-1 mt-2">
                          <div class="d-flex align-center gap-2">
                            <v-chip 
                              v-if="verificarEdicaoHibrida(station).hasBeenEdited === false" 
                              color="warning" 
                              variant="flat" 
                              size="x-small"
                              class="edit-status-chip"
                            >
                              <v-icon start size="12">ri-alert-line</v-icon>
                              NÃO EDITADA
                            </v-chip>
                            <v-chip 
                              v-else-if="verificarEdicaoHibrida(station).hasBeenEdited === true" 
                              color="success" 
                              variant="flat" 
                              size="x-small"
                              class="edit-status-chip"
                            >
                              <v-icon start size="12">ri-check-line</v-icon>
                              EDITADA ({{ verificarEdicaoHibrida(station).totalEdits || 0 }}x)
                            </v-chip>
                          </div>
                          
                          <div v-if="verificarEdicaoHibrida(station).createdDate" class="text-caption text-secondary">
                            <v-icon size="12" class="me-1">ri-calendar-line</v-icon>
                            Criada: {{ formatarDataBrasil(verificarEdicaoHibrida(station).createdDate) }}
                          </div>
                          
                          <div v-if="verificarEdicaoHibrida(station).lastEditDate && verificarEdicaoHibrida(station).hasBeenEdited" class="text-caption text-secondary">
                            <v-icon size="12" class="me-1">ri-edit-line</v-icon>
                            Editada: {{ formatarDataBrasil(verificarEdicaoHibrida(station).lastEditDate) }}
                          </div>
                        </div>
                        
                        <div v-if="getUserStationScore(station.id)" class="mt-2">
                          <v-chip 
                            :color="getUserStationScore(station.id).percentage >= 70 ? 'success' : getUserStationScore(station.id).percentage >= 50 ? 'warning' : 'error'"
                            variant="flat"
                            size="small"
                            class="user-score-chip"
                          >
                            <v-icon start size="16">ri-star-fill</v-icon>
                            {{ getUserStationScore(station.id).score }}/{{ getUserStationScore(station.id).maxScore }} ({{ getUserStationScore(station.id).percentage }}%)
                          </v-chip>
                        </div>
                        <template #append>
                          <div class="d-flex align-center">
                            <v-progress-circular
                              v-if="creatingSessionForStationId === station.id"
                              indeterminate
                              size="24"
                              color="primary"
                              class="me-2 sequential-selection-btn"
                            />
                            <v-btn
                              v-if="showSequentialConfig"
                              :color="isStationInSequence(station.id) ? 'success' : 'primary'"
                              :variant="isStationInSequence(station.id) ? 'tonal' : 'outlined'"
                              size="small"
                              @click.stop="isStationInSequence(station.id) ? removeFromSequence(station.id) : addToSequence(station)"
                              class="me-2 sequential-selection-btn"
                              :aria-label="isStationInSequence(station.id) ? 'Remover da sequência' : 'Adicionar à sequência'"
                            >
                              <v-icon
                                :style="{ color: isStationInSequence(station.id) ? 'var(--v-theme-success)' : 'var(--v-theme-primary)', opacity: '1', fontWeight: '600' }"
                                :aria-hidden="false"
                                :aria-label="isStationInSequence(station.id) ? 'Estação selecionada' : 'Selecionar estação'"
                              >{{ isStationInSequence(station.id) ? 'ri-check-line' : 'ri-plus-line' }}</v-icon>
                            </v-btn>
                            <v-btn
                              v-if="isAdmin"
                              color="secondary"
                              variant="text"
                              size="small"
                              icon="ri-pencil-line"
                              @click.stop="goToEditStation(station.id)"
                              class="me-2 sequential-selection-btn"
                              aria-label="Editar Estação"
                            />
                            <v-btn
                              color="primary"
                              variant="text"
                              size="small"
                              icon="ri-robot-line"
                              @click.stop="startAITraining(station.id)"
                              class="me-2 sequential-selection-btn"
                              aria-label="Treinar com IA"
                            />
                          </div>
                        </template>
                      </v-list-item>
                    </v-list>
                  </v-expansion-panel-text>
                </v-expansion-panel>

                <v-expansion-panel v-if="filteredStationsRevalidaFacilGO.length > 0">
                  <v-expansion-panel-title class="text-subtitle-1 font-weight-medium">
                    <template #default="{ expanded }">
                      <v-row no-gutters align="center">
                        <v-col cols="auto">
                          <v-icon class="me-2" color="error">ri-women-line</v-icon>
                        </v-col>
                        <v-col>
                          Ginecologia e Obstetrícia
                        </v-col>
                        <v-col cols="auto">
                          <v-badge :content="filteredStationsRevalidaFacilGO.length" color="error" inline />
                        </v-col>
                      </v-row>
                    </template>
                  </v-expansion-panel-title>
                  <v-expansion-panel-text>
                    <v-list density="comfortable">
                      <v-list-item
                        v-for="station in filteredStationsRevalidaFacilGO"
                        :key="station.id"
                        class="mb-2 rounded-lg elevation-1 station-list-item clickable-card"
                        :style="{ backgroundColor: getSpecialtyColor(station, 'ginecologia') + getBackgroundOpacity(station) }"
                        @click="startSimulationAsActor(station.id)"
                      >
                        <template #prepend>
                          <v-icon color="info">ri-file-list-3-line</v-icon>
                        </template>
                        <v-list-item-title class="font-weight-bold text-body-1 text-on-surface">{{ getCleanStationTitle(station.tituloEstacao) }}</v-list-item-title>
                        
                        <div class="d-flex flex-column gap-1 mt-2">
                          <div class="d-flex align-center gap-2">
                            <v-chip
                              v-if="verificarEdicaoHibrida(station).hasBeenEdited === false"
                              color="warning"
                              variant="flat"
                              size="x-small"
                              class="edit-status-chip"
                            >
                              <v-icon start size="12">ri-alert-line</v-icon>
                              NÃO EDITADA
                            </v-chip>
                            <v-chip
                              v-else-if="verificarEdicaoHibrida(station).hasBeenEdited === true"
                              color="success"
                              variant="flat"
                              size="x-small"
                              class="edit-status-chip"
                            >
                              <v-icon start size="12">ri-check-line</v-icon>
                              EDITADA ({{ verificarEdicaoHibrida(station).totalEdits || 0 }}x)
                            </v-chip>
                          </div>
                          
                          <div v-if="verificarEdicaoHibrida(station).createdDate" class="text-caption text-secondary">
                            <v-icon size="12" class="me-1">ri-calendar-line</v-icon>
                            Criada: {{ formatarDataBrasil(verificarEdicaoHibrida(station).createdDate) }}
                          </div>
                          
                          <div v-if="verificarEdicaoHibrida(station).lastEditDate && verificarEdicaoHibrida(station).hasBeenEdited" class="text-caption text-secondary">
                            <v-icon size="12" class="me-1">ri-edit-line</v-icon>
                            Editada: {{ formatarDataBrasil(verificarEdicaoHibrida(station).lastEditDate) }}
                          </div>
                        </div>
                        
                        <div v-if="getUserStationScore(station.id)" class="mt-2">
                          <v-chip
                            :color="getUserStationScore(station.id).percentage >= 70 ? 'success' : getUserStationScore(station.id).percentage >= 50 ? 'warning' : 'error'"
                            variant="flat"
                            size="small"
                            class="user-score-chip"
                          >
                            <v-icon start size="16">ri-star-fill</v-icon>
                            {{ getUserStationScore(station.id).score }}/{{ getUserStationScore(station.id).maxScore }} ({{ getUserStationScore(station.id).percentage }}%)
                          </v-chip>
                        </div>
                        <template #append>
                          <div class="d-flex align-center">
                            <v-progress-circular
                              v-if="creatingSessionForStationId === station.id"
                              indeterminate
                              size="24"
                              color="primary"
                              class="me-2 sequential-selection-btn"
                            />
                            <v-btn
                              v-if="showSequentialConfig"
                              :color="isStationInSequence(station.id) ? 'success' : 'primary'"
                              :variant="isStationInSequence(station.id) ? 'tonal' : 'outlined'"
                              size="small"
                              @click.stop="isStationInSequence(station.id) ? removeFromSequence(station.id) : addToSequence(station)"
                              class="me-2 sequential-selection-btn"
                              :aria-label="isStationInSequence(station.id) ? 'Remover da sequência' : 'Adicionar à sequência'"
                            >
                              <v-icon
                                :style="{ color: isStationInSequence(station.id) ? 'var(--v-theme-success)' : 'var(--v-theme-primary)', opacity: '1', fontWeight: '600' }"
                                :aria-hidden="false"
                                :aria-label="isStationInSequence(station.id) ? 'Estação selecionada' : 'Selecionar estação'"
                              >{{ isStationInSequence(station.id) ? 'ri-check-line' : 'ri-plus-line' }}</v-icon>
                            </v-btn>
                            <v-btn
                              v-if="isAdmin"
                              color="secondary"
                              variant="text"
                              size="small"
                              icon="ri-pencil-line"
                              @click.stop="goToEditStation(station.id)"
                              class="me-2 sequential-selection-btn"
                              aria-label="Editar Estação"
                            />
                            <v-btn
                              color="primary"
                              variant="text"
                              size="small"
                              icon="ri-robot-line"
                              @click.stop="startAITraining(station.id)"
                              class="me-2 sequential-selection-btn"
                              aria-label="Treinar com IA"
                            />
                          </div>
                        </template>
                      </v-list-item>
                    </v-list>
                  </v-expansion-panel-text>
                </v-expansion-panel>

                <v-expansion-panel v-if="filteredStationsRevalidaFacilPreventiva.length > 0">
                  <v-expansion-panel-title class="text-subtitle-1 font-weight-medium">
                    <template #default="{ expanded }">
                      <v-row no-gutters align="center">
                        <v-col cols="auto">
                          <v-icon class="me-2" color="warning">ri-shield-cross-line</v-icon>
                        </v-col>
                        <v-col>
                          Preventiva
                        </v-col>
                        <v-col cols="auto">
                          <v-badge :content="filteredStationsRevalidaFacilPreventiva.length" color="warning" inline />
                        </v-col>
                      </v-row>
                    </template>
                  </v-expansion-panel-title>
                  <v-expansion-panel-text>
                    <v-list density="comfortable">
                      <v-list-item
                        v-for="station in filteredStationsRevalidaFacilPreventiva"
                        :key="station.id"
                        class="mb-2 rounded-lg elevation-1 station-list-item clickable-card"
                        :style="{ backgroundColor: getSpecialtyColor(station, 'preventiva') + getBackgroundOpacity(station) }"
                        @click="startSimulationAsActor(station.id)"
                      >
                        <template #prepend>
                          <v-icon color="info">ri-file-list-3-line</v-icon>
                        </template>
                        <v-list-item-title class="font-weight-bold text-body-1 text-on-surface">{{ getCleanStationTitle(station.tituloEstacao) }}</v-list-item-title>
                        
                        <div class="d-flex flex-column gap-1 mt-2">
                          <div class="d-flex align-center gap-2">
                            <v-chip 
                              v-if="verificarEdicaoHibrida(station).hasBeenEdited === false" 
                              color="warning" 
                              variant="flat" 
                              size="x-small"
                              class="edit-status-chip"
                            >
                              <v-icon start size="12">ri-alert-line</v-icon>
                              NÃO EDITADA
                            </v-chip>
                            <v-chip 
                              v-else-if="verificarEdicaoHibrida(station).hasBeenEdited === true" 
                              color="success" 
                              variant="flat" 
                              size="x-small"
                              class="edit-status-chip"
                            >
                              <v-icon start size="12">ri-check-line</v-icon>
                              EDITADA ({{ verificarEdicaoHibrida(station).totalEdits || 0 }}x)
                            </v-chip>
                          </div>
                          
                          <div v-if="verificarEdicaoHibrida(station).createdDate" class="text-caption text-secondary">
                            <v-icon size="12" class="me-1">ri-calendar-line</v-icon>
                            Criada: {{ formatarDataBrasil(verificarEdicaoHibrida(station).createdDate) }}
                          </div>
                          
                          <div v-if="verificarEdicaoHibrida(station).lastEditDate && verificarEdicaoHibrida(station).hasBeenEdited" class="text-caption text-secondary">
                            <v-icon size="12" class="me-1">ri-edit-line</v-icon>
                            Editada: {{ formatarDataBrasil(verificarEdicaoHibrida(station).lastEditDate) }}
                          </div>
                        </div>
                        
                        <div v-if="getUserStationScore(station.id)" class="mt-2">
                          <v-chip 
                            :color="getUserStationScore(station.id).percentage >= 70 ? 'success' : getUserStationScore(station.id).percentage >= 50 ? 'warning' : 'error'"
                            variant="flat"
                            size="small"
                            class="user-score-chip"
                          >
                            <v-icon start size="16">ri-star-fill</v-icon>
                            {{ getUserStationScore(station.id).score }}/{{ getUserStationScore(station.id).maxScore }} ({{ getUserStationScore(station.id).percentage }}%)
                          </v-chip>
                        </div>
                        <template #append>
                          <div class="d-flex align-center">
                            <v-progress-circular
                              v-if="creatingSessionForStationId === station.id"
                              indeterminate
                              size="24"
                              color="primary"
                              class="me-2 sequential-selection-btn"
                            />
                            <v-btn
                              v-if="showSequentialConfig"
                              :color="isStationInSequence(station.id) ? 'success' : 'primary'"
                              :variant="isStationInSequence(station.id) ? 'tonal' : 'outlined'"
                              size="small"
                              @click.stop="isStationInSequence(station.id) ? removeFromSequence(station.id) : addToSequence(station)"
                              class="me-2 sequential-selection-btn"
                              :aria-label="isStationInSequence(station.id) ? 'Remover da sequência' : 'Adicionar à sequência'"
                            >
                              <v-icon
                                :style="{ color: isStationInSequence(station.id) ? 'var(--v-theme-success)' : 'var(--v-theme-primary)', opacity: '1', fontWeight: '600' }"
                                :aria-hidden="false"
                                :aria-label="isStationInSequence(station.id) ? 'Estação selecionada' : 'Selecionar estação'"
                              >{{ isStationInSequence(station.id) ? 'ri-check-line' : 'ri-plus-line' }}</v-icon>
                            </v-btn>
                            <v-btn
                              v-if="isAdmin"
                              color="secondary"
                              variant="text"
                              size="small"
                              icon="ri-pencil-line"
                              @click.stop="goToEditStation(station.id)"
                              class="me-2 sequential-selection-btn"
                              aria-label="Editar Estação"
                            />
                            <v-btn
                              color="primary"
                              variant="text"
                              size="small"
                              icon="ri-robot-line"
                              @click.stop="startAITraining(station.id)"
                              class="me-2 sequential-selection-btn"
                              aria-label="Treinar com IA"
                            />
                          </div>
                        </template>
                      </v-list-item>
                    </v-list>
                  </v-expansion-panel-text>
                </v-expansion-panel>

                <v-expansion-panel v-if="filteredStationsRevalidaFacilProcedimentos.length > 0">
                  <v-expansion-panel-title class="text-subtitle-1 font-weight-medium">
                    <template #default="{ expanded }">
                      <v-row no-gutters align="center">
                        <v-col cols="auto">
                          <v-icon class="me-2" color="#A52A2A">ri-syringe-line</v-icon>
                        </v-col>
                        <v-col>
                          Procedimentos
                        </v-col>
                        <v-col cols="auto">
                          <v-badge :content="filteredStationsRevalidaFacilProcedimentos.length" color="#A52A2A" inline />
                        </v-col>
                      </v-row>
                    </template>
                  </v-expansion-panel-title>
                  <v-expansion-panel-text>
                    <v-list density="comfortable">
                      <v-list-item
                        v-for="station in filteredStationsRevalidaFacilProcedimentos"
                        :key="station.id"
                        class="mb-2 rounded-lg elevation-1 station-list-item clickable-card"
                        :style="{ backgroundColor: getSpecialtyColor(station, 'procedimentos') + getBackgroundOpacity(station) }"
                        @click="startSimulationAsActor(station.id)"
                      >
                        <template #prepend>
                          <v-icon color="info">ri-file-list-3-line</v-icon>
                        </template>
                        <v-list-item-title class="font-weight-bold text-body-1 text-on-surface">{{ getCleanStationTitle(station.tituloEstacao) }}</v-list-item-title>
                        
                        <div class="d-flex flex-column gap-1 mt-2">
                          <div class="d-flex align-center gap-2">
                            <v-chip 
                              v-if="verificarEdicaoHibrida(station).hasBeenEdited === false" 
                              color="warning" 
                              variant="flat" 
                              size="x-small"
                              class="edit-status-chip"
                            >
                              <v-icon start size="12">ri-alert-line</v-icon>
                              NÃO EDITADA
                            </v-chip>
                            <v-chip 
                              v-else-if="verificarEdicaoHibrida(station).hasBeenEdited === true" 
                              color="success" 
                              variant="flat" 
                              size="x-small"
                              class="edit-status-chip"
                            >
                              <v-icon start size="12">ri-check-line</v-icon>
                              EDITADA ({{ verificarEdicaoHibrida(station).totalEdits || 0 }}x)
                            </v-chip>
                          </div>
                          
                          <div v-if="verificarEdicaoHibrida(station).createdDate" class="text-caption text-secondary">
                            <v-icon size="12" class="me-1">ri-calendar-line</v-icon>
                            Criada: {{ formatarDataBrasil(verificarEdicaoHibrida(station).createdDate) }}
                          </div>
                          
                          <div v-if="verificarEdicaoHibrida(station).lastEditDate && verificarEdicaoHibrida(station).hasBeenEdited" class="text-caption text-secondary">
                            <v-icon size="12" class="me-1">ri-edit-line</v-icon>
                            Editada: {{ formatarDataBrasil(verificarEdicaoHibrida(station).lastEditDate) }}
                          </div>
                        </div>
                        
                        <div v-if="getUserStationScore(station.id)" class="mt-2">
                          <v-chip 
                            :color="getUserStationScore(station.id).percentage >= 70 ? 'success' : getUserStationScore(station.id).percentage >= 50 ? 'warning' : 'error'"
                            variant="flat"
                            size="small"
                            class="user-score-chip"
                          >
                            <v-icon start size="16">ri-star-fill</v-icon>
                            {{ getUserStationScore(station.id).score }}/{{ getUserStationScore(station.id).maxScore }} ({{ getUserStationScore(station.id).percentage }}%)
                          </v-chip>
                        </div>
                        <template #append>
                          <div class="d-flex align-center">
                            <v-progress-circular
                              v-if="creatingSessionForStationId === station.id"
                              indeterminate
                              size="24"
                              color="primary"
                              class="me-2 sequential-selection-btn"
                            />
                            <v-btn
                              v-if="showSequentialConfig"
                              :color="isStationInSequence(station.id) ? 'success' : 'primary'"
                              :variant="isStationInSequence(station.id) ? 'tonal' : 'outlined'"
                              size="small"
                              @click.stop="isStationInSequence(station.id) ? removeFromSequence(station.id) : addToSequence(station)"
                              class="me-2 sequential-selection-btn"
                              :aria-label="isStationInSequence(station.id) ? 'Remover da sequência' : 'Adicionar à sequência'"
                            >
                              <v-icon
                                :style="{ color: isStationInSequence(station.id) ? 'var(--v-theme-success)' : 'var(--v-theme-primary)', opacity: '1', fontWeight: '600' }"
                                :aria-hidden="false"
                                :aria-label="isStationInSequence(station.id) ? 'Estação selecionada' : 'Selecionar estação'"
                              >{{ isStationInSequence(station.id) ? 'ri-check-line' : 'ri-plus-line' }}</v-icon>
                            </v-btn>
                            <v-btn
                              v-if="isAdmin"
                              color="secondary"
                              variant="text"
                              size="small"
                              icon="ri-pencil-line"
                              @click.stop="goToEditStation(station.id)"
                              class="me-2 sequential-selection-btn"
                              aria-label="Editar Estação"
                            />
                            <v-btn
                              color="primary"
                              variant="text"
                              size="small"
                              icon="ri-robot-line"
                              @click.stop="startAITraining(station.id)"
                              class="me-2 sequential-selection-btn"
                              aria-label="Treinar com IA"
                            />
                          </div>
                        </template>
                      </v-list-item>
                    </v-list>
                  </v-expansion-panel-text>
                </v-expansion-panel>


              </v-expansion-panels>
            </v-expansion-panel-text>
          </v-expansion-panel>

        </v-expansion-panels>
      </v-col>
    </v-row>
    <v-row v-if="isLoadingStations">
      <v-col cols="12" class="text-center">
        <v-progress-circular indeterminate color="primary" />
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.station-list-item .v-list-item-title {
  color: var(--v-theme-on-surface) !important;
}

.station-list-item .v-list-item-subtitle {
  color: var(--v-theme-on-surface-variant) !important;
}

.station-list-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.clickable-card {
  cursor: pointer;
}

.edit-warning-chip {
  margin-top: 4px;
  font-size: 0.7rem !important;
  height: 20px !important;
}

.v-expansion-panels {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border-radius: 12px;
}

.v-expansion-panel {
  border-radius: 12px !important;
  margin-bottom: 8px;
}

.v-expansion-panel-title {
  padding: 16px 20px;
  font-weight: 600;
}

.v-expansion-panel-text {
  padding: 0 20px 20px 20px;
}

.v-expansion-panels .v-expansion-panels {
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  background: rgba(var(--v-theme-surface-variant), 0.3);
}

.v-expansion-panels .v-expansion-panels .v-expansion-panel {
  margin-bottom: 4px;
}

.v-expansion-panels .v-expansion-panels .v-expansion-panel-title {
  padding: 12px 16px;
  font-weight: 500;
}

.v-expansion-panels .v-expansion-panels .v-expansion-panel-text {
  padding: 0 16px 16px 16px;
}

.v-expansion-panel-title,
.v-expansion-panel-text {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@media (max-width: 600px) {
  .v-expansion-panel-title {
    padding: 12px 16px;
    font-size: 0.95rem;
  }
  
  .v-expansion-panel-text {
    padding: 0 16px 16px 16px;
  }
  
  .station-list-item {
    border-radius: 8px !important;
    margin-left: 0 !important;
    margin-right: 0 !important;
  }
}

.v-badge {
  font-weight: 600;
}

.v-list {
  background: transparent;
}

.v-list-item {
  margin-bottom: 8px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  background: rgba(var(--v-theme-surface), 0.8);
}

.v-list-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(var(--v-theme-primary), 0.15);
}

.v-theme--dark .v-expansion-panels {
  background: rgba(var(--v-theme-surface), 0.9);
}

.v-theme--light .v-expansion-panels {
  background: rgba(var(--v-theme-surface), 1);
}

.v-card.v-theme--light[variant="tonal"] {
  background: rgba(var(--v-theme-error), 0.08) !important;
}

.v-card.v-theme--dark[variant="tonal"] {
  background: rgba(var(--v-theme-error), 0.12) !important;
}

.v-btn[color="error"]:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(var(--v-theme-error), 0.3);
}

.station-item:hover .station-title,
.station-item:hover .station-specialty {
  color: #4a4a4a !important; /* Garante que o texto fique escuro no hover */
}

.admin-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(var(--v-theme-error), 0.3);
}

.edit-status-chip {
  font-size: 10px !important;
  height: 20px !important;
  font-weight: 600 !important;
}

.date-chip {
  font-size: 9px !important;
  height: 18px !important;
  opacity: 0.8;
}

.gap-2 {
  gap: 8px;
}

@media (max-width: 768px) {
  .edit-status-chip,
  .date-chip {
    display: none;
  }
}

.user-score-chip {
  font-size: 0.75rem !important;
  font-weight: 600 !important;
  border-radius: 12px !important;
  margin-top: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.user-score-chip .v-icon {
  margin-right: 4px;
}

.candidate-suggestion-item {
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.candidate-suggestion-item:hover {
  background-color: rgba(var(--v-theme-primary), 0.08);
}

.position-relative {
  position: relative;
}

.position-absolute {
  position: absolute;
}

.w-100 {
  width: 100%;
}
.main-content-container {
  background-color: transparent !important;
.rounded-input .v-input__control .v-input__slot {
  border-radius: 8px; /* Cantos mais arredondados */
}

.v-expansion-panel-title.rounded-button-title {
  border-radius: 12px; /* Cantos mais arredondados para os títulos */
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); /* Sombra sutil */
  transition: all 0.3s ease-in-out;
}

.v-expansion-panel-title.rounded-button-title:hover {
  transform: translateY(-2px); /* Efeito de leve levantamento no hover */
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12); /* Sombra mais pronunciada no hover */
}

/* Os painéis de expansão se ajustarão à largura disponível por padrão */
/* Removida a propriedade max-width para garantir visualização completa em mobile */
.v-expansion-panel.contained-panel {
  margin-left: auto;
  margin-right: auto;
}
/* Estilos específicos para botões de seleção sequencial - CORES FIXAS DE ALTO CONTRASTE */
.v-btn.sequential-selection-btn .v-icon {
  color: #1565C0 !important; /* Azul escuro fixo para alto contraste */
  opacity: 1 !important;
  font-weight: 700 !important;
  visibility: visible !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
}

/* Força visibilidade dos ícones em botões outlined */
.v-btn[variant="outlined"].sequential-selection-btn .v-icon {
  color: #1565C0 !important; /* Azul escuro fixo */
  opacity: 1 !important;
  font-weight: 700 !important;
  visibility: visible !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
}

/* Força visibilidade dos ícones em botões tonal (selecionados) */
.v-btn[variant="tonal"].sequential-selection-btn .v-icon {
  color: #2E7D32 !important; /* Verde escuro fixo para alto contraste */
  opacity: 1 !important;
  font-weight: 700 !important;
  visibility: visible !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
}

/* Estilos específicos para tema escuro - CORES FIXAS */
.v-theme--dark .v-btn.sequential-selection-btn .v-icon {
  color: #1565C0 !important; /* Mesmo azul escuro para consistência */
  opacity: 1 !important;
  font-weight: 700 !important;
  visibility: visible !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.v-theme--dark .v-btn[variant="outlined"].sequential-selection-btn .v-icon {
  color: #1565C0 !important; /* Azul escuro fixo */
  opacity: 1 !important;
  font-weight: 700 !important;
  visibility: visible !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.v-theme--dark .v-btn[variant="tonal"].sequential-selection-btn .v-icon {
  color: #2E7D32 !important; /* Verde escuro fixo */
  opacity: 1 !important;
  font-weight: 700 !important;
  visibility: visible !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
}

/* Estilos específicos para tema claro - CORES FIXAS */
.v-theme--light .v-btn.sequential-selection-btn .v-icon {
  color: #1565C0 !important; /* Azul escuro fixo */
  opacity: 1 !important;
  font-weight: 700 !important;
  visibility: visible !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.v-theme--light .v-btn[variant="outlined"].sequential-selection-btn .v-icon {
  color: #1565C0 !important; /* Azul escuro fixo */
  opacity: 1 !important;
  font-weight: 700 !important;
  visibility: visible !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.v-theme--light .v-btn[variant="tonal"].sequential-selection-btn .v-icon {
  color: #2E7D32 !important; /* Verde escuro fixo */
  opacity: 1 !important;
  font-weight: 700 !important;
  visibility: visible !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
}

/* Estilos de emergência para garantir visibilidade - SISTEMA DE FALLBACK */
.sequential-selection-btn .v-icon {
  color: #1565C0 !important; /* Cor azul escuro padrão como fallback */
  opacity: 1 !important;
  font-weight: 700 !important;
  visibility: visible !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  background-color: transparent !important;
  border: none !important;
}
}
</style>
<style>
/* Força a transparência em elementos de alto nível */
.station-list-page-active,
.station-list-page-active body,
.station-list-page-active #app,
.station-list-page-active .v-application {
  background-color: transparent !important;
}

.station-list-page-active .v-main,
.station-list-page-active .v-main__wrap,
.station-list-page-active .layout-wrapper,
.station-list-page-active .layout-content-wrapper {
  background-color: transparent !important;
}

/* CORREÇÃO ESPECÍFICA PARA ÍCONES DOS BOTÕES SEQUENCIAIS */
.v-btn.sequential-selection-btn .v-icon {
  width: 20px !important;
  height: 20px !important;
  font-size: 20px !important;
  line-height: 1 !important;
}

/* Fallback para ícones que não carregam - adiciona conteúdo de emergência */
.v-btn[variant="outlined"].sequential-selection-btn .v-icon:empty::before,
.v-btn[variant="outlined"].sequential-selection-btn .v-icon:not(:has(svg))::before {
  content: '+' !important;
  color: #1565C0 !important;
  font-size: 18px !important;
  font-weight: bold !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 24px !important;
  height: 24px !important;
  line-height: 24px !important;
  text-align: center !important;
}

.v-btn[variant="tonal"].sequential-selection-btn .v-icon:empty::before,
.v-btn[variant="tonal"].sequential-selection-btn .v-icon:not(:has(svg))::before {
  content: '✓' !important;
  color: #2E7D32 !important;
}

/* Força exibição do ícone usando unicode como backup */
.v-btn.sequential-selection-btn .v-icon::after {
  content: attr(data-fallback) !important;
  color: inherit !important;
  font-size: 16px !important;
  font-weight: bold !important;
  display: none !important;
}

.v-btn.sequential-selection-btn .v-icon:empty::after {
  display: inline-flex !important;
}

/* CSS simplificado para botões */
.v-btn.sequential-selection-btn {
  position: relative !important;
  min-width: 32px !important;
  min-height: 32px !important;
}
</style>
