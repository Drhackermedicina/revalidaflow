<script setup>

import inepIcon from '@/assets/images/inep.png';
import StationListItem from '@/components/StationListItem.vue';
import { currentUser } from '@/plugins/auth.js'
import { db, firebaseAuth } from '@/plugins/firebase.js'
import { backendUrl } from '@/utils/backendUrl'
import { signOut } from 'firebase/auth'
import { collection, doc, getDoc, getDocs } from 'firebase/firestore'
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useTheme } from 'vuetify'

// 🚀 OTIMIZAÇÃO: Composables extraídos para melhor organização
import { useStationFiltering } from '@/composables/useStationFiltering.js'
import { useStationCategorization } from '@/composables/useStationCategorization.js'
import { useSequentialMode } from '@/composables/useSequentialMode.js'
import { useCandidateSearch } from '@/composables/useCandidateSearch.js'

const router = useRouter()
const theme = useTheme()

// --- Refs do Estado ---
const isDevelopment = ref(false); // Adiciona variável de ambiente
const stations = ref([]); // ✅ CORRIGIDO: ref() para reatividade completa (shallowRef causava bugs)
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

// 🚀 OTIMIZAÇÃO: Caches para funções de processamento de estações
const CACHE_SIZE_LIMIT = 1000;
const titleCache = new Map();
const areaCache = new Map();
const colorCache = new Map();

// 🚀 Função de carregamento de estação completa (lazy loading) - precisa estar antes dos composables
async function loadFullStation(stationId) {
  if (fullStationsCache.value.has(stationId)) {
    return fullStationsCache.value.get(stationId);
  }

  isLoadingFullStation.value = true;
  try {
    const stationDocRef = doc(db, 'estacoes_clinicas', stationId);
    const stationDocSnap = await getDoc(stationDocRef);

    if (stationDocSnap.exists()) {
      const fullStationData = { id: stationId, ...stationDocSnap.data() };
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

// 🚀 FUNÇÕES HELPER: Declarações necessárias antes dos composables
// (implementações completas estão mais abaixo, após linha 450)
let getCleanStationTitle, getStationArea;

// 🚀 COMPOSABLES: Lógica extraída para melhor organização e reutilização
const selectedStation = ref(null);

// Composable: Filtros e busca (com aliases para evitar conflitos)
const {
  globalSearchQuery,
  normalizeText: normalizeTextFromComposable,
  isINEPStation: isINEPStationFromComposable,
  isRevalidaFacilStation: isRevalidaFacilStationFromComposable,
  getINEPPeriod: getINEPPeriodFromComposable,
  getSpecialty: getSpecialtyFromComposable,
  getRevalidaFacilSpecialty: getRevalidaFacilSpecialtyFromComposable,
  filteredStations: filteredStationsFromComposable,
  filteredINEPStations: filteredINEPStationsFromComposable,
  filteredRevalidaFacilStations: filteredRevalidaFacilStationsFromComposable,
  filteredStations2024_2: filteredStations2024_2FromComposable,
  filteredStationsRevalidaFacilClinicaMedica,
  filteredStationsRevalidaFacilCirurgia,
  filteredStationsRevalidaFacilPediatria,
  filteredStationsRevalidaFacilGO,
  filteredStationsRevalidaFacilPreventiva,
  filteredStationsRevalidaFacilProcedimentos
} = useStationFiltering(stations);

// Composable: Categorização e cores (com aliases para evitar conflitos)
const {
  areaOptions: areaOptionsFromComposable,
  specialtyColorMap,
  getStationBackgroundColor
} = useStationCategorization();

// Composable: Modo sequencial (com aliases para evitar conflitos)
const {
  sequentialMode: sequentialModeFromComposable,
  selectedStationsSequence: selectedStationsSequenceFromComposable,
  currentSequenceIndex: currentSequenceIndexFromComposable,
  isSequentialModeConfiguring: isSequentialModeConfiguringFromComposable,
  sequentialSessionId: sequentialSessionIdFromComposable,
  showSequentialConfig: showSequentialConfigFromComposable,
  isStationInSequence: isStationInSequenceFromComposable,
  toggleSequentialConfig: toggleSequentialConfigFromComposable,
  resetSequentialConfig: resetSequentialConfigFromComposable,
  addToSequence: addToSequenceFromComposable,
  removeFromSequence: removeFromSequenceFromComposable,
  moveStationInSequence: moveStationInSequenceFromComposable,
  startSequentialSimulation: startSequentialSimulationFromComposable,
  startCurrentSequentialStation: startCurrentSequentialStationFromComposable,
  nextSequentialStation: nextSequentialStationFromComposable
} = useSequentialMode(loadFullStation, getCleanStationTitle, getStationArea);

// Composable: Busca de candidatos (com aliases para evitar conflitos)
const {
  selectedCandidate,
  candidateSearchQuery,
  candidateSearchSuggestions,
  showCandidateSuggestions,
  selectedCandidateScores,
  isLoadingCandidateSearch,
  searchCandidates,
  selectCandidate,
  fetchCandidateScores,
  clearCandidateSelection,
  getUserStationScore: getUserStationScoreFromComposable
} = useCandidateSearch(currentUser);

// ✅ Wrappers para funções dos composables de filtros (MOVED HERE to fix hoisting errors)
const isINEPStation = isINEPStationFromComposable;
const isRevalidaFacilStation = isRevalidaFacilStationFromComposable;
const getINEPPeriod = getINEPPeriodFromComposable;
const getRevalidaFacilSpecialty = getRevalidaFacilSpecialtyFromComposable;

// ✅ Wrappers para computeds de filtros
const filteredInepStations = filteredINEPStationsFromComposable;
const filteredRevalidaFacilStations = filteredRevalidaFacilStationsFromComposable;

// ✅ Wrapper para getSpecialty do composable
const getSpecialty = getSpecialtyFromComposable;

// ✅ Wrapper para getUserStationScore
function getUserStationScore(stationId) {
  return getUserStationScoreFromComposable(stationId, userScores.value);
}

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

// --- Computed Properties ---
const isDarkTheme = computed(() => theme.global.current.value.dark);

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

// Autocomplete items para busca global
const globalAutocompleteItems = computed(() => {
  if (!stations.value) return [];

  // Só mostrar resultados quando o usuário digitar pelo menos 2 caracteres
  const searchQuery = globalSearchQuery.value?.trim().toLowerCase() || '';
  if (searchQuery.length < 2) return [];

  return stations.value
    .filter(station => {
      const title = getCleanStationTitle(station.tituloEstacao).toLowerCase();
      const especialidade = (station.especialidade || '').toLowerCase();
      const area = (station.area || '').toLowerCase();
      return title.includes(searchQuery) || especialidade.includes(searchQuery) || area.includes(searchQuery);
    })
    .map(station => {
      const cleanTitle = getCleanStationTitle(station.tituloEstacao);
      const isINEP = isINEPStation(station);

      // Especialidade ou área
      const specialty = station.especialidade || station.area || '';

      // Determinar a subseção com labels formatados
      let subsection = '';
      let subsectionChips = [];

      if (isINEP) {
        const period = getINEPPeriod(station);
        if (period) {
          subsectionChips.push(`INEP ${period}`);
        }
        // Para INEP, adicionar também a especialidade
        if (specialty) {
          subsectionChips.push(specialty.toUpperCase());
        }
      } else {
        const specialtyNormalized = getRevalidaFacilSpecialty(station);
        // Mapeamento de valores normalizados para labels de exibição
        const specialtyLabels = {
          'clinica-medica': 'CLÍNICA MÉDICA',
          'cirurgia': 'CIRURGIA',
          'pediatria': 'PEDIATRIA',
          'ginecologia': 'GINECOLOGIA E OBSTETRÍCIA',
          'preventiva': 'PREVENTIVA',
          'procedimentos': 'PROCEDIMENTOS',
          'geral': 'GERAL'
        };
        const subsectionLabel = specialtyLabels[specialtyNormalized] || specialtyNormalized || '';
        if (subsectionLabel) {
          subsectionChips.push(subsectionLabel);
        }
      }

      return {
        id: station.id,
        title: cleanTitle,
        subtitle: `${cleanTitle} - ${specialty}`,
        fullName: `${cleanTitle} - ${specialty}`,
        subsectionChips: subsectionChips,
        iconImage: isINEP ? inepIcon : '/botaosemfundo.png',
        isINEP: isINEP,
        color: isINEP ? 'primary' : 'success'
      };
    })
    .slice(0, 50); // Limitar a 50 resultados
});

// 🚀 OTIMIZAÇÃO: Pré-processar dados das estações para evitar recálculo no template
const enrichStation = (station) => {
  return {
    ...station,
    cleanTitle: getCleanStationTitle(station.tituloEstacao),
    userScore: getUserStationScore(station.id),
    backgroundColor: getSpecialtyColor(station) + getBackgroundOpacity(station)
  };
};

// ✅ Removidas duplicatas - agora vêm do composable useStationFiltering

const filteredStationsByInepPeriod = computed(() => {
  const grouped = {};
  const inepStations = filteredInepStations.value;

  // Função para extrair o número da estação do ID (EST01, EST02, etc.)
  const getStationNumber = (stationId) => {
    const match = stationId.match(/EST(\d+)/);
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

    // 🚀 OTIMIZAÇÃO: Enriquecer estações com dados pré-calculados
    grouped[period] = grouped[period].map(enrichStation);
  }

  return grouped;
});

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

// 🚀 OTIMIZAÇÃO: Função com cache - evita 59 linhas de regex repetidas
getCleanStationTitle = function(originalTitle) {
  if (!originalTitle) return 'ESTAÇÃO SEM TÍTULO';

  // Verificar cache primeiro
  if (titleCache.has(originalTitle)) {
    return titleCache.get(originalTitle);
  }

  // Se não está em cache, processar
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

    const result = fallback || originalTitle;

    // Armazenar em cache (com limite de tamanho)
    if (titleCache.size >= CACHE_SIZE_LIMIT) {
      const firstKey = titleCache.keys().next().value;
      titleCache.delete(firstKey);
    }
    titleCache.set(originalTitle, result);

    return result;
  }

  cleanTitle = cleanTitle.toLowerCase().split(' ').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');

  // Armazenar em cache (com limite de tamanho)
  if (titleCache.size >= CACHE_SIZE_LIMIT) {
    const firstKey = titleCache.keys().next().value;
    titleCache.delete(firstKey);
  }
  titleCache.set(originalTitle, cleanTitle);

  return cleanTitle;
}

function getStationYear(station) {
  const period = getINEPPeriod(station);
  if (!period) return 0;

  // Extrair apenas o ano (ex: "2025.1" -> 2025, "2017" -> 2017)
  const yearMatch = period.match(/^(\d{4})/);
  return yearMatch ? parseInt(yearMatch[1], 10) : 0;
}

// 🚀 OTIMIZAÇÃO: Função com cache - evita 161 linhas de processamento repetido
getStationArea = function(station) {
  // Criar chave de cache baseada em id e especialidade
  const cacheKey = `${station.id}_${station.especialidade || ''}_${station.tituloEstacao || ''}`;

  // Verificar cache primeiro
  if (areaCache.has(cacheKey)) {
    return areaCache.get(cacheKey);
  }

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

    const result = { key: specialty, ...areas[specialty] };

    // Armazenar em cache
    if (areaCache.size >= CACHE_SIZE_LIMIT) {
      const firstKey = areaCache.keys().next().value;
      areaCache.delete(firstKey);
    }
    areaCache.set(cacheKey, result);

    return result;
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
    'procedimentos': { name: 'PROC', fullName: 'Procedimentos', icon: '🛠️' },
    'geral': { name: 'GERAL', fullName: 'Medicina Geral', icon: '🏥' }
  };

  const result = { key, ...areas[key] };

  // Armazenar em cache (com limite de tamanho)
  if (areaCache.size >= CACHE_SIZE_LIMIT) {
    const firstKey = areaCache.keys().next().value;
    areaCache.delete(firstKey);
  }
  areaCache.set(cacheKey, result);

  return result;
}

// 🚀 OTIMIZAÇÃO: Função com cache - evita recálculo de cores
function getSpecialtyColor(station, specificSpecialty = null) {
  // Criar chave de cache
  const cacheKey = `${station.id}_${specificSpecialty || 'auto'}_${isDarkTheme.value ? 'dark' : 'light'}`;

  // Verificar cache primeiro
  if (colorCache.has(cacheKey)) {
    return colorCache.get(cacheKey);
  }

  const lightColors = {
    'clinica-medica': '#00BFFF',
    'cirurgia': '#000080',
    'pediatria': '#008000',
    'ginecologia': '#FF1493',
    'preventiva': '#FF4500',
    'procedimentos': '#6A0DAD',
    'geral': '#2F4F4F'
  };

  const darkColors = {
    'clinica-medica': '#00CED1',
    'cirurgia': '#4169E1',
    'pediatria': '#32CD32',
    'ginecologia': '#FF69B4',
    'preventiva': '#FFA500',
    'procedimentos': '#9370DB',
    'geral': '#708090'
  };

  const colors = isDarkTheme.value ? darkColors : lightColors;

  let result;
  // Se foi especificada uma especialidade específica, usar ela
  if (specificSpecialty) {
    result = colors[specificSpecialty] || colors.geral;
  } else {
    // Senão, usar a lógica original (primeira especialidade encontrada)
    const area = getStationArea(station);
    result = colors[area.key] || colors.geral;
  }

  // Armazenar em cache
  if (colorCache.size >= CACHE_SIZE_LIMIT) {
    const firstKey = colorCache.keys().next().value;
    colorCache.delete(firstKey);
  }
  colorCache.set(cacheKey, result);

  return result;
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

    if (station.criadoEmTimestamp) {
      date = station.criadoEmTimestamp.toDate ? station.criadoEmTimestamp.toDate() : new Date(station.criadoEmTimestamp);
      label = 'Criada';
    } else {
      date = new Date(station.idEstacao || station.id || '');
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
  return hash;
}

const totalStations = computed(() => {
  const inepTotal = filteredInepStations.value.length;
  const revalidaFacilTotal = [
    filteredStationsRevalidaFacilClinicaMedica.value.length,
    filteredStationsRevalidaFacilCirurgia.value.length,
    filteredStationsRevalidaFacilPediatria.value.length,
    filteredStationsRevalidaFacilGO.value.length,
    filteredStationsRevalidaFacilPreventiva.value.length,
    filteredStationsRevalidaFacilProcedimentos.value.length
  ].reduce((a, b) => a + b, 0);
  return inepTotal + revalidaFacilTotal;
});

async function fetchStations() {
  isLoadingStations.value = true;
  errorMessage.value = '';

  try {
    // 🚀 OTIMIZAÇÃO: Carregar apenas metadados (id, título, especialidade, numeroDaEstacao)
    const stationsColRef = collection(db, 'estacoes_clinicas');
    const querySnapshot = await getDocs(stationsColRef);
    const stationsList = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const modifiedData = {
        id: doc.id,
        idEstacao: data.idEstacao,  // ✅ CRITICAL: Required for filtering INEP/RevalidaFacil stations
        tituloEstacao: data.tituloEstacao,
        especialidade: data.especialidade,
        area: data.area,
        numeroDaEstacao: data.numeroDaEstacao,  // ✅ Required for sorting stations
        inepPeriod: data.inepPeriod,
        hmAttributeOrgQualifications: data.hmAttributeOrgQualifications,
        criadoEmTimestamp: data.criadoEmTimestamp
      };
      stationsList.push(modifiedData);
    });

    stationsList.sort((a, b) => {
      const numA = a.numeroDaEstacao || 0;
      const numB = b.numeroDaEstacao || 0;
      return numA - numB;
    });

    stations.value = stationsList;

    if (currentUser.value) {
      await fetchUserScores();
    }

    if (stations.value.length === 0) {
      errorMessage.value = "Nenhuma estação encontrada no Firestore na coleção 'estacoes_clinicas'";
    }

  } catch (error) {
    console.error('ERRO ao buscar lista de estações:', error);
    errorMessage.value = `Falha ao buscar estações: ${error.message}`;
    if (error.code === 'permission-denied') {
      errorMessage.value += " (Erro de permissão! Verifique as Regras de Segurança do Firestore)";
    } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
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
    console.error('ERRO ao buscar pontuações do usuário:', error);
  }
}

// ✅ Removidas duplicatas - agora vêm do composable useStationFiltering

// ✅ NOTA: getCleanStationTitle, getStationArea, getSpecialtyColor e getBackgroundOpacity
// são definidos localmente pois usam caches locais
// getStationBackgroundColor vem do composable useStationCategorization

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
    const fullStation = await loadFullStation(stationId);
    if (!fullStation) {
      throw new Error('Não foi possível carregar os dados da estação');
    }

    // Encontrar a estação selecionada para expandir a seção correta
    const station = stations.value.find(s => s.id === stationId);
    if (station) {
      expandCorrectSection(station);
    }

    const routeData = router.resolve({
      path: `/app/simulation/${stationId}`,
      query: {
        role: 'actor'
      }
    });

    // Limpar os campos de busca quando abre a simulação
    selectedStation.value = null;
    globalSearchQuery.value = '';

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
    // Expandir todas as subseções baseadas nas especialidades da estação
    const especialidades = getRevalidaFacilSpecialty(station);
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

// ✅ Funções de modo sequencial - wrappers para composables
const sequentialMode = sequentialModeFromComposable;
const selectedStationsSequence = selectedStationsSequenceFromComposable;
const currentSequenceIndex = currentSequenceIndexFromComposable;
const isSequentialModeConfiguring = isSequentialModeConfiguringFromComposable;
const sequentialSessionId = sequentialSessionIdFromComposable;
const showSequentialConfig = showSequentialConfigFromComposable;

const toggleSequentialConfig = toggleSequentialConfigFromComposable;
const resetSequentialConfig = resetSequentialConfigFromComposable;
const isStationInSequence = isStationInSequenceFromComposable;
const addToSequence = addToSequenceFromComposable;
const removeFromSequence = removeFromSequenceFromComposable;
const moveStationInSequence = moveStationInSequenceFromComposable;
const startSequentialSimulation = startSequentialSimulationFromComposable;
const startCurrentSequentialStation = startCurrentSequentialStationFromComposable;
const nextSequentialStation = nextSequentialStationFromComposable;

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
                    <v-list-item-subtitle class="text-caption">{{ station.area.fullName }}</v-list-item-subtitle>
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
                  <p class="mt-2 font-weight-medium text-primary">
                    A simulação abrirá cada estação sequencialmente em novas abas
                  </p>
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
                    <v-img
                      v-if="selectedCandidate.photoURL"
                      :src="selectedCandidate.photoURL"
                    />
                    <v-icon v-else>ri-user-line</v-icon>
                  </v-avatar>
                  <div>
                    <div class="font-weight-bold">{{ selectedCandidate.nome }}</div>
                  </div>
                </div>
              </template>
              <div class="text-body-2">
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
                        <v-img
                          v-if="candidate.photoURL"
                          :src="candidate.photoURL"
                        />
                        <v-icon v-else>ri-user-line</v-icon>
                      </v-avatar>
                    </template>
                    <v-list-item-title>{{ candidate.nome }}</v-list-item-title>
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
            >
              <template #item="{ props, item }">
                <v-list-item
                  v-bind="props"
                  @click="startSimulationAsActor(item.raw.id)"
                >
                  <template #prepend>
                    <div :style="{
                      width: item.raw.isINEP ? '60px' : '48px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: '12px'
                    }">
                      <v-img
                        :src="item.raw.iconImage"
                        :max-width="item.raw.isINEP ? '60px' : '48px'"
                        :max-height="'32px'"
                        contain
                      />
                    </div>
                  </template>

                  <template #append v-if="item.raw.subsectionChips && item.raw.subsectionChips.length > 0">
                    <div class="d-flex gap-2">
                      <v-chip
                        v-for="(chip, index) in item.raw.subsectionChips"
                        :key="index"
                        size="small"
                        :color="item.raw.color"
                        variant="tonal"
                      >
                        {{ chip }}
                      </v-chip>
                    </div>
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
                          <v-col>INEP {{ period }}</v-col>
                          <v-col cols="auto">
                            <v-badge :content="filteredStationsByInepPeriod[period].length" color="info" inline />
                          </v-col>
                        </v-row>
                      </template>
                    </v-expansion-panel-title>
                    <v-expansion-panel-text>
                      <!-- 🚀 OTIMIZAÇÃO: Virtualização de lista - renderiza apenas itens visíveis -->
                      <v-virtual-scroll
                        :items="filteredStationsByInepPeriod[period]"
                        :item-height="140"
                        height="600"
                        style="overflow-y: auto;"
                      >
                        <template #default="{ item: station }">
                          <StationListItem
                            :station="station"
                            :user-score="getUserStationScore(station.id)"
                            :background-color="getStationBackgroundColor(station)"
                            :show-sequential-config="showSequentialConfig"
                            :is-admin="isAdmin"
                            :is-in-sequence="isStationInSequence(station.id)"
                            :is-creating-session="creatingSessionForStationId === station.id"
                            @click="startSimulationAsActor"
                            @add-to-sequence="addToSequence"
                            @remove-from-sequence="removeFromSequence"
                            @edit-station="goToEditStation"
                            @start-ai-training="startAITraining"
                          />
                        </template>
                      </v-virtual-scroll>
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
                    <v-img src="/botaosemfundo.png" style="height: 80px; width: 80px; margin-right: 24px;" />
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
                <!-- PROVEDOR DE DADOS DENTRO DO DIV -->
                <v-expansion-panel v-if="filteredStationsRevalidaFacilClinicaMedica.length > 0">
                  <v-expansion-panel-title class="text-subtitle-1 font-weight-medium">
                    <template #default="{ expanded }">
                      <v-row no-gutters align="center">
                        <v-col cols="auto">
                          <v-icon class="me-2" color="info">ri-stethoscope-line</v-icon>
                        </v-col>
                        <v-col>Clínica Médica</v-col>
                        <v-col cols="auto">
                          <v-badge
                            :content="filteredStationsRevalidaFacilClinicaMedica.length"
                            color="info"
                            inline
                          />
                        </v-col>
                      </v-row>
                    </template>
                  </v-expansion-panel-title>
                  <v-expansion-panel-text>
                    <!-- 🚀 OTIMIZAÇÃO: Componente reutilizável - elimina duplicação -->
                    <v-virtual-scroll
                      :items="filteredStationsRevalidaFacilClinicaMedica"
                      :item-height="160"
                      height="600"
                      style="overflow-y: auto;"
                    >
                      <template #default="{ item: station }">
                        <StationListItem
                          :station="station"
                          :user-score="getUserStationScore(station.id)"
                          :specialty="'clinica-medica'"
                          :background-color="getStationBackgroundColor(station)"
                          :show-sequential-config="showSequentialConfig"
                          :is-admin="isAdmin"
                          :is-in-sequence="isStationInSequence(station.id)"
                          :is-creating-session="creatingSessionForStationId === station.id"
                          :show-detailed-dates="true"
                          @click="startSimulationAsActor"
                          @add-to-sequence="addToSequence"
                          @remove-from-sequence="removeFromSequence"
                          @edit-station="goToEditStation"
                          @start-ai-training="startAITraining"
                        />
                      </template>
                    </v-virtual-scroll>
                  </v-expansion-panel-text>
                </v-expansion-panel>

                <v-expansion-panel v-if="filteredStationsRevalidaFacilCirurgia.length > 0">
                  <v-expansion-panel-title class="text-subtitle-1 font-weight-medium">
                    <template #default="{ expanded }">
                      <v-row no-gutters align="center">
                        <v-col cols="auto">
                          <v-icon class="me-2" color="primary">ri-knife-line</v-icon>
                        </v-col>
                        <v-col>Cirurgia</v-col>
                        <v-col cols="auto">
                          <v-badge
                            :content="filteredStationsRevalidaFacilCirurgia.length"
                            color="primary"
                            inline
                          />
                        </v-col>
                      </v-row>
                    </template>
                  </v-expansion-panel-title>
                  <v-expansion-panel-text>
                    <!-- 🚀 OTIMIZAÇÃO: Componente reutilizável - elimina duplicação -->
                    <v-virtual-scroll
                      :items="filteredStationsRevalidaFacilCirurgia"
                      :item-height="160"
                      height="600"
                      style="overflow-y: auto;"
                    >
                      <template #default="{ item: station }">
                        <StationListItem
                          :station="station"
                          :user-score="getUserStationScore(station.id)"
                          :specialty="'cirurgia'"
                          :background-color="getStationBackgroundColor(station)"
                          :show-sequential-config="showSequentialConfig"
                          :is-admin="isAdmin"
                          :is-in-sequence="isStationInSequence(station.id)"
                          :is-creating-session="creatingSessionForStationId === station.id"
                          :show-detailed-dates="true"
                          @click="startSimulationAsActor"
                          @add-to-sequence="addToSequence"
                          @remove-from-sequence="removeFromSequence"
                          @edit-station="goToEditStation"
                          @start-ai-training="startAITraining"
                        />
                      </template>
                    </v-virtual-scroll>
                  </v-expansion-panel-text>
                </v-expansion-panel>

                <v-expansion-panel v-if="filteredStationsRevalidaFacilPediatria.length > 0">
                  <v-expansion-panel-title class="text-subtitle-1 font-weight-medium">
                    <template #default="{ expanded }">
                      <v-row no-gutters align="center">
                        <v-col cols="auto">
                          <v-icon class="me-2" color="success">ri-bear-smile-line</v-icon>
                        </v-col>
                        <v-col>Pediatria</v-col>
                        <v-col cols="auto">
                          <v-badge
                            :content="filteredStationsRevalidaFacilPediatria.length"
                            color="success"
                            inline
                          />
                        </v-col>
                      </v-row>
                    </template>
                  </v-expansion-panel-title>
                  <v-expansion-panel-text>
                    <!-- 🚀 OTIMIZAÇÃO: Componente reutilizável - elimina duplicação -->
                    <v-virtual-scroll
                      :items="filteredStationsRevalidaFacilPediatria"
                      :item-height="160"
                      height="600"
                      style="overflow-y: auto;"
                    >
                      <template #default="{ item: station }">
                        <StationListItem
                          :station="station"
                          :user-score="getUserStationScore(station.id)"
                          :specialty="'pediatria'"
                          :background-color="getStationBackgroundColor(station)"
                          :show-sequential-config="showSequentialConfig"
                          :is-admin="isAdmin"
                          :is-in-sequence="isStationInSequence(station.id)"
                          :is-creating-session="creatingSessionForStationId === station.id"
                          :show-detailed-dates="true"
                          @click="startSimulationAsActor"
                          @add-to-sequence="addToSequence"
                          @remove-from-sequence="removeFromSequence"
                          @edit-station="goToEditStation"
                          @start-ai-training="startAITraining"
                        />
                      </template>
                    </v-virtual-scroll>
                  </v-expansion-panel-text>
                </v-expansion-panel>

                <v-expansion-panel v-if="filteredStationsRevalidaFacilGO.length > 0">
                  <v-expansion-panel-title class="text-subtitle-1 font-weight-medium">
                    <template #default="{ expanded }">
                      <v-row no-gutters align="center">
                        <v-col cols="auto">
                          <v-icon class="me-2" color="error">ri-women-line</v-icon>
                        </v-col>
                        <v-col>Ginecologia e Obstetrícia</v-col>
                        <v-col cols="auto">
                          <v-badge
                            :content="filteredStationsRevalidaFacilGO.length"
                            color="error"
                            inline
                          />
                        </v-col>
                      </v-row>
                    </template>
                  </v-expansion-panel-title>
                  <v-expansion-panel-text>
                    <!-- 🚀 OTIMIZAÇÃO: Componente reutilizável - elimina duplicação -->
                    <v-virtual-scroll
                      :items="filteredStationsRevalidaFacilGO"
                      :item-height="160"
                      height="600"
                      style="overflow-y: auto;"
                    >
                      <template #default="{ item: station }">
                        <StationListItem
                          :station="station"
                          :user-score="getUserStationScore(station.id)"
                          :specialty="'ginecologia'"
                          :background-color="getStationBackgroundColor(station)"
                          :show-sequential-config="showSequentialConfig"
                          :is-admin="isAdmin"
                          :is-in-sequence="isStationInSequence(station.id)"
                          :is-creating-session="creatingSessionForStationId === station.id"
                          :show-detailed-dates="true"
                          @click="startSimulationAsActor"
                          @add-to-sequence="addToSequence"
                          @remove-from-sequence="removeFromSequence"
                          @edit-station="goToEditStation"
                          @start-ai-training="startAITraining"
                        />
                      </template>
                    </v-virtual-scroll>
                  </v-expansion-panel-text>
                </v-expansion-panel>

                <v-expansion-panel v-if="filteredStationsRevalidaFacilPreventiva.length > 0">
                  <v-expansion-panel-title class="text-subtitle-1 font-weight-medium">
                    <template #default="{ expanded }">
                      <v-row no-gutters align="center">
                        <v-col cols="auto">
                          <v-icon class="me-2" color="warning">ri-shield-cross-line</v-icon>
                        </v-col>
                        <v-col>Preventiva</v-col>
                        <v-col cols="auto">
                          <v-badge
                            :content="filteredStationsRevalidaFacilPreventiva.length"
                            color="warning"
                            inline
                          />
                        </v-col>
                      </v-row>
                    </template>
                  </v-expansion-panel-title>
                  <v-expansion-panel-text>
                    <!-- 🚀 OTIMIZAÇÃO: Componente reutilizável - elimina duplicação -->
                    <v-virtual-scroll
                      :items="filteredStationsRevalidaFacilPreventiva"
                      :item-height="160"
                      height="600"
                      style="overflow-y: auto;"
                    >
                      <template #default="{ item: station }">
                        <StationListItem
                          :station="station"
                          :user-score="getUserStationScore(station.id)"
                          :specialty="'preventiva'"
                          :background-color="getStationBackgroundColor(station)"
                          :show-sequential-config="showSequentialConfig"
                          :is-admin="isAdmin"
                          :is-in-sequence="isStationInSequence(station.id)"
                          :is-creating-session="creatingSessionForStationId === station.id"
                          :show-detailed-dates="true"
                          @click="startSimulationAsActor"
                          @add-to-sequence="addToSequence"
                          @remove-from-sequence="removeFromSequence"
                          @edit-station="goToEditStation"
                          @start-ai-training="startAITraining"
                        />
                      </template>
                    </v-virtual-scroll>
                  </v-expansion-panel-text>
                </v-expansion-panel>

                <v-expansion-panel v-if="filteredStationsRevalidaFacilProcedimentos.length > 0">
                  <v-expansion-panel-title class="text-subtitle-1 font-weight-medium">
                    <template #default="{ expanded }">
                      <v-row no-gutters align="center">
                        <v-col cols="auto">
                          <v-icon class="me-2" color="#A52A2A">ri-syringe-line</v-icon>
                        </v-col>
                        <v-col>Procedimentos</v-col>
                        <v-col cols="auto">
                          <v-badge
                            :content="filteredStationsRevalidaFacilProcedimentos.length"
                            color="#A52A2A"
                            inline
                          />
                        </v-col>
                      </v-row>
                    </template>
                  </v-expansion-panel-title>
                  <v-expansion-panel-text>
                    <!-- 🚀 OTIMIZAÇÃO: Componente reutilizável - elimina duplicação -->
                    <v-virtual-scroll
                      :items="filteredStationsRevalidaFacilProcedimentos"
                      :item-height="160"
                      height="600"
                      style="overflow-y: auto;"
                    >
                      <template #default="{ item: station }">
                        <StationListItem
                          :station="station"
                          :user-score="getUserStationScore(station.id)"
                          :specialty="'procedimentos'"
                          :background-color="getStationBackgroundColor(station)"
                          :show-sequential-config="showSequentialConfig"
                          :is-admin="isAdmin"
                          :is-in-sequence="isStationInSequence(station.id)"
                          :is-creating-session="creatingSessionForStationId === station.id"
                          :show-detailed-dates="true"
                          @click="startSimulationAsActor"
                          @add-to-sequence="addToSequence"
                          @remove-from-sequence="removeFromSequence"
                          @edit-station="goToEditStation"
                          @start-ai-training="startAITraining"
                        />
                      </template>
                    </v-virtual-scroll>
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
  font-weight: 600 !important;
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
}

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
</style>
