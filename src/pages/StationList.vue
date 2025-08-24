<script setup>
import { currentUser } from '@/plugins/auth.js'
import { db, firebaseAuth } from '@/plugins/firebase.js'
import { backendUrl } from '@/utils/backendUrl'
import { signOut } from 'firebase/auth'
import { collection, doc, getDoc, getDocs } from 'firebase/firestore'
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useTheme } from 'vuetify'
const router = useRouter()
const theme = useTheme()

// --- Refs do Estado ---
const isDevelopment = ref(false); // Adiciona variável de ambiente
const stations = ref([]);
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

// --- Refs para busca de candidatos ---
const selectedCandidate = ref(null); // Candidato selecionado para visualizar estatísticas
const candidateSearchQuery = ref(''); // Query de busca por candidato
const candidateSearchSuggestions = ref([]); // Sugestões de candidatos
const showCandidateSuggestions = ref(false); // Controle de exibição das sugestões
const selectedCandidateScores = ref({}); // Pontuações do candidato selecionado
const isLoadingCandidateSearch = ref(false); // Loading para busca de candidatos

// --- Refs para filtros e pesquisa ---
const searchQuery = ref('');
const selectedArea = ref('');
const selectedCategory = ref(''); // INEP REVALIDA - PROVAS ANTERIORES ou REVALIDA FÁCIL
const showSuggestions = ref(false);
const searchSuggestions = ref([]);

// --- Refs para controle dos accordions ---
const showPreviousExamsSection = ref(false);
const show2024_2Stations = ref(false);
const showRevalidaFacilStations = ref(false); // RECOLHIDO POR PADRÃO
const showRevalidaFacilClinicaMedica = ref(false); // RECOLHIDO POR PADRÃO
const showRevalidaFacilGO = ref(false); // RECOLHIDO POR PADRÃO  
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
  return idEstacao.startsWith('INEP');
}

function isRevalidaFacilStation(station) {
  const idEstacao = station.idEstacao || '';
  return idEstacao.startsWith('REVALIDA_FACIL');
}

function getINEPPeriod(station) {
  const idEstacao = station.idEstacao || '';
  if (!isINEPStation(station)) return null;
  
  // Extrair período do idEstacao (INEP_2025_1, INEP_2024_2, etc.)
  const match = idEstacao.match(/INEP_(\d{4})(?:_(\d))?/);
  if (match) {
    const year = match[1];
    const period = match[2];
    return period ? `${year}.${period}` : year;
  }
  return null;
}

function getRevalidaFacilSpecialty(station) {
  if (!isRevalidaFacilStation(station)) return null;
  
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
      // Se não encontrou, criar entrada cache com dados padrão
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

// 🔄 FUNÇÃO SIMPLIFICADA - REMOVIDA CARGA DESNECESSÁRIA
// A função carregarUsuariosAdmin foi removida pois o mapeamento já é feito diretamente

// --- Computed Properties ---
// Computeds para tema
const isDarkTheme = computed(() => theme.global.current.value.dark)

const isAdmin = computed(() => {
  const adminStatus = currentUser.value && (
    currentUser.value.uid === 'RtfNENOqMUdw7pvgeeaBVSuin662' || 
    currentUser.value.uid === 'KiSITAxXMAY5uU3bOPW5JMQPent2' ||
    currentUser.value.uid === 'UD7S8aiyR8TJXHyxdw29BHNfjEf1' || // Novo admin adicionado
    currentUser.value.uid === 'lNwhdYgMwLhS1ZyufRzw9xLD10y1' // Novo admin adicionado
  );
  return adminStatus;
});

const stations2025_1 = computed(() => {
  const filtered = stations.value.filter(station => {
    return isINEPStation(station) && getINEPPeriod(station) === '2025.1';
  });
  
  return filtered.sort((a, b) => 
    getCleanStationTitle(a.tituloEstacao).localeCompare(getCleanStationTitle(b.tituloEstacao), 'pt-BR', { numeric: true })
  );
});

const stations2024_2 = computed(() => {
  const filtered = stations.value.filter(station => {
    return isINEPStation(station) && getINEPPeriod(station) === '2024.2';
  });
  
  return filtered.sort((a, b) => 
    getCleanStationTitle(a.tituloEstacao).localeCompare(getCleanStationTitle(b.tituloEstacao), 'pt-BR', { numeric: true })
  );
});

const stations2024_1 = computed(() => {
  const filtered = stations.value.filter(station => {
    return isINEPStation(station) && getINEPPeriod(station) === '2024.1';
  });
  
  return filtered.sort((a, b) => 
    getCleanStationTitle(a.tituloEstacao).localeCompare(getCleanStationTitle(b.tituloEstacao), 'pt-BR', { numeric: true })
  );
});

const stations2023_2 = computed(() => {
  const filtered = stations.value.filter(station => {
    return isINEPStation(station) && getINEPPeriod(station) === '2023.2';
  });
  
  return filtered.sort((a, b) => 
    getCleanStationTitle(a.tituloEstacao).localeCompare(getCleanStationTitle(b.tituloEstacao), 'pt-BR', { numeric: true })
  );
});

const stations2023_1 = computed(() => {
  const filtered = stations.value.filter(station => {
    return isINEPStation(station) && getINEPPeriod(station) === '2023.1';
  });
  
  return filtered.sort((a, b) => 
    getCleanStationTitle(a.tituloEstacao).localeCompare(getCleanStationTitle(b.tituloEstacao), 'pt-BR', { numeric: true })
  );
});

const stations2022_2 = computed(() => {
  const filtered = stations.value.filter(station => {
    return isINEPStation(station) && getINEPPeriod(station) === '2022.2';
  });
  
  return filtered.sort((a, b) => 
    getCleanStationTitle(a.tituloEstacao).localeCompare(getCleanStationTitle(b.tituloEstacao), 'pt-BR', { numeric: true })
  );
});

const stations2022_1 = computed(() => {
  const filtered = stations.value.filter(station => {
    return isINEPStation(station) && getINEPPeriod(station) === '2022.1';
  });
  
  return filtered.sort((a, b) => 
    getCleanStationTitle(a.tituloEstacao).localeCompare(getCleanStationTitle(b.tituloEstacao), 'pt-BR', { numeric: true })
  );
});

const stations2021 = computed(() => {
  const filtered = stations.value.filter(station => {
    return isINEPStation(station) && getINEPPeriod(station) === '2021';
  });
  
  return filtered.sort((a, b) => 
    getCleanStationTitle(a.tituloEstacao).localeCompare(getCleanStationTitle(b.tituloEstacao), 'pt-BR', { numeric: true })
  );
});

const stations2020 = computed(() => {
  const filtered = stations.value.filter(station => {
    return isINEPStation(station) && getINEPPeriod(station) === '2020';
  });
  
  return filtered.sort((a, b) => 
    getCleanStationTitle(a.tituloEstacao).localeCompare(getCleanStationTitle(b.tituloEstacao), 'pt-BR', { numeric: true })
  );
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
  return stationsRevalidaFacil.value
    .filter(station => getRevalidaFacilSpecialty(station) === 'clinica-medica')
    .sort((a, b) => getCleanStationTitle(a.tituloEstacao).localeCompare(getCleanStationTitle(b.tituloEstacao), 'pt-BR', { numeric: true }));
});

const filteredStationsRevalidaFacilCirurgia = computed(() => {
  return stationsRevalidaFacil.value
    .filter(station => getRevalidaFacilSpecialty(station) === 'cirurgia')
    .sort((a, b) => getCleanStationTitle(a.tituloEstacao).localeCompare(getCleanStationTitle(b.tituloEstacao), 'pt-BR', { numeric: true }));
});

const filteredStationsRevalidaFacilPreventiva = computed(() => {
  return stationsRevalidaFacil.value
    .filter(station => getRevalidaFacilSpecialty(station) === 'preventiva')
    .sort((a, b) => getCleanStationTitle(a.tituloEstacao).localeCompare(getCleanStationTitle(b.tituloEstacao), 'pt-BR', { numeric: true }));
});

const filteredStationsRevalidaFacilPediatria = computed(() => {
  return stationsRevalidaFacil.value
    .filter(station => getRevalidaFacilSpecialty(station) === 'pediatria')
    .sort((a, b) => getCleanStationTitle(a.tituloEstacao).localeCompare(getCleanStationTitle(b.tituloEstacao), 'pt-BR', { numeric: true }));
});

const filteredStationsRevalidaFacilGO = computed(() => {
  return stationsRevalidaFacil.value
    .filter(station => getRevalidaFacilSpecialty(station) === 'ginecologia')
    .sort((a, b) => getCleanStationTitle(a.tituloEstacao).localeCompare(getCleanStationTitle(b.tituloEstacao), 'pt-BR', { numeric: true }));
});

// 🔄 FUNÇÃO DE VERIFICAÇÃO HÍBRIDA DE EDIÇÃO COM CACHE E VALIDAÇÃO
const editStatusCache = new Map();

// Função para limpar cache (útil após atualizações)
function clearEditStatusCache() {
  editStatusCache.clear();
  console.log('🧹 Cache de status de edição limpo');
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
    
    // Verificar se é uma data válida
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
  // Usar cache para evitar recálculos desnecessários
  const cacheKey = `${station.id}_${station.hasBeenEdited}_${station.atualizadoEmTimestamp}_${station.criadoEmTimestamp}`;
  
  if (editStatusCache.has(cacheKey)) {
    return editStatusCache.get(cacheKey);
  }
  
  console.log('🔍 Verificando edição para estação:', station.id);
  
  let result;
  
  // 0. PRIORIDADE MÁXIMA: Campo hasBeenEdited do banco (após recálculo)
  if (typeof station.hasBeenEdited === 'boolean') {
    const lastEdit = station.editHistory && station.editHistory.length > 0 
      ? station.editHistory[station.editHistory.length - 1] 
      : null;
    
    console.log('🎯 Campo hasBeenEdited encontrado no banco:', station.hasBeenEdited);
    
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
  
  // 1. Verificação moderna (prioritária) - só se não tiver campo do banco
  else if (station.editHistory && Array.isArray(station.editHistory)) {
    const hasModernEdit = station.editHistory.length > 0;
    const lastEdit = hasModernEdit ? station.editHistory[station.editHistory.length - 1] : null;
    
    console.log('✅ Sistema moderno detectado:', { hasEdit: hasModernEdit, totalEdits: station.editHistory.length });
    
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
  
  // 2. Verificação legacy (múltiplos formatos de campos)
  else {
    const criadoEm = station.criadoEmTimestamp || station.dataCadastro;
    const atualizadoEm = station.atualizadoEmTimestamp || station.dataUltimaAtualizacao;
    const editadoPor = station.atualizadoPor || station.editadoPor || station.criadoPor || null;
    
    if (isValidTimestamp(criadoEm) && isValidTimestamp(atualizadoEm)) {
      // Converter timestamps para Date de forma segura
      const cadastro = criadoEm.toDate ? criadoEm.toDate() : new Date(criadoEm);
      const ultimaAtualizacao = atualizadoEm.toDate ? atualizadoEm.toDate() : new Date(atualizadoEm);
      
      // Se datas são diferentes, houve edição
      const hasLegacyEdit = ultimaAtualizacao.getTime() !== cadastro.getTime();
      
      console.log('🔧 Sistema legacy detectado:', { 
        hasEdit: hasLegacyEdit, 
        cadastro: safeToISOString(criadoEm), 
        ultimaAtualizacao: safeToISOString(atualizadoEm),
        editadoPor: editadoPor
      });
      
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
      // Caso só tenha data de atualização, considera como editada
      const ultimaAtualizacao = atualizadoEm.toDate ? atualizadoEm.toDate() : new Date(atualizadoEm);
      console.log('🔧 Sistema legacy (só atualização) detectado');
      
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
    
    // 3. Verificação por campo hasBeenEdited isolado
    else if (station.hasBeenEdited !== undefined) {
      console.log('📝 Campo hasBeenEdited detectado:', station.hasBeenEdited);
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
    
    // 4. Padrão: não editada
    else {
      console.log('ℹ️ Sem dados de edição válidos encontrados para:', station.id);
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
  
  // Armazenar no cache
  editStatusCache.set(cacheKey, result);
  return result;
}

// 📅 FUNÇÃO PARA FORMATAÇÃO DE DATAS
const formatarDataBrasil = (date) => {
  if (!date) return 'Data não disponível';
  
  try {
    const dateObj = date instanceof Date ? date : (date.toDate ? date.toDate() : new Date(date));
    
    if (isNaN(dateObj.getTime())) {
      return 'Data inválida';
    }
    
    // Formatar como "18/08/2025 às 23:53:39" removendo UTC-3
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

// 📅 FUNÇÃO MODIFICADA PARA INCLUIR INFORMAÇÃO DO USUÁRIO
const formatarDataBrasilComUsuario = (station) => {
  const info = verificarEdicaoHibrida(station);
  if (!info.lastEditDate) return 'Data não disponível';
  
  try {
    const dateObj = info.lastEditDate instanceof Date ? info.lastEditDate : 
                   (info.lastEditDate.toDate ? info.lastEditDate.toDate() : new Date(info.lastEditDate));
    
    if (isNaN(dateObj.getTime())) {
      return 'Data inválida';
    }
    
    // Formatar como "18/08/2025 às 23:53:39" removendo UTC-3
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

// 📅 FUNÇÃO PARA FORMATAÇÃO COMPLETA DE INFORMAÇÃO DE EDIÇÃO
const formatarInfoEdicao = (station) => {
  const info = verificarEdicaoHibrida(station);
  if (!info.hasBeenEdited || !info.lastEditDate) return '';
  
  const dataFormatada = formatarDataBrasil(info.lastEditDate);
  const usuario = info.lastEditBy ? ` por ${info.lastEditBy}` : '';
  
  return `${dataFormatada}${usuario}`;
};



// --- Função para limpar títulos das estações ---
function getCleanStationTitle(originalTitle) {
  if (!originalTitle) return 'ESTAÇÃO SEM TÍTULO';
  let cleanTitle = originalTitle;

  // Remover completamente prefixos INEP ou REVALIDA
  cleanTitle = cleanTitle.replace(/^INEP\s*2024\.2[\s\:\-]*/gi, '');
  cleanTitle = cleanTitle.replace(/INEP\s*2024\.2[\s\:\-]*/gi, '');
  cleanTitle = cleanTitle.replace(/^REVALIDA[\s\:\-]*/gi, '');
  
  // Remove o prefixo REVALIDA FACIL (com variações de conectores)
  cleanTitle = cleanTitle.replace(/^REVALIDA\s*F[AÁ]CIL\s*[\-\:\s]+/i, '');
  cleanTitle = cleanTitle.replace(/^REVALIDAFACIL\s*[\-\:\s]+/i, '');
  
  // Remove outros prefixos comuns e especialidades do início (mais específico)
  cleanTitle = cleanTitle.replace(/^(ESTAÇÃO\s+|CLINICA\s*MEDICA\s+|CLÍNICA\s*MÉDICA\s+|CIRURGIA\s+|PEDIATRIA\s+|PREVENTIVA\s+|GINECOLOGIA\s+|OBSTETRICIA\s+|G\.O\s+|GO\s+|\d{4}\.\d\s+|\d{4}\s+|\d+\s*[\-\|\:]\s*)/gi, '');

  // Remove abreviações de especialidades apenas quando estão isoladas ou entre delimitadores
  cleanTitle = cleanTitle.replace(/\s*[\(\[\-]\s*(CM|CR|PED|G\.O|GO|PREV|GERAL)\s*[\)\]\-]\s*/gi, ' ');
  cleanTitle = cleanTitle.replace(/\s+\-\s+(CM|CR|PED|G\.O|GO|PREV|GERAL)\s*/gi, ' ');
  // Remove abreviações apenas quando isoladas com delimitadores (não dentro de palavras)
  cleanTitle = cleanTitle.replace(/\s+(CM|CR|PED|G\.O|GO|PREV|GERAL)(?=\s|$|[\-\:\.])/gi, ' ');
  cleanTitle = cleanTitle.replace(/^(CM|CR|PED|G\.O|GO|PREV|GERAL)(?=\s|$|[\-\:\.])/gi, '');
  
  // Remover qualquer sequência de traços, pontos ou símbolos antes da primeira palavra
  cleanTitle = cleanTitle.replace(/^[\s\-\:\|\.\_]*/, '');
  
  // Remove tudo até encontrar a primeira palavra relevante (diagnóstico) - mais cuidadoso
  cleanTitle = cleanTitle.replace(/^[^a-zA-ZÀ-ÿ]*([a-zA-ZÀ-ÿ].*)$/, '$1');

  // Remove espaços extras
  cleanTitle = cleanTitle.trim();
  
  // Se ficou vazio, retorna fallback mas sem os prefixos
  if (!cleanTitle || cleanTitle.length < 2) {
    // Aplicar todas as substituições ao título original para ter um fallback melhor
    let fallback = originalTitle
      .replace(/INEP\s*2024\.2[\s\:\-]*/gi, '')
      .replace(/Clínica Médica|Clinica Medica/gi, '')
      .replace(/Cirurgia Geral|Cirurgia/gi, '')
      .replace(/Pediatria/gi, '')
      .replace(/Ginecologia e Obstetrícia|Ginecologia E Obstetricia/gi, '')
      .replace(/Medicina da Família|Medicina De Familia/gi, '')
      .replace(/(CM|CR|PED|G\.O|GO|PREV|GERAL)(?=\s|$|[\s\:\-]+)/gi, '') // Corrigido para não remover de dentro de palavras
      .replace(/[\s\-\:]{2,}/g, ' ')  // Substitui múltiplos espaços ou símbolos por um único espaço
      .trim();
    
    return fallback || originalTitle;
  }

  // Capitaliza primeira letra de cada palavra (Title Case)
  cleanTitle = cleanTitle.toLowerCase().split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');

  return cleanTitle;
}

// --- Função para identificar áreas médicas (atualizada para nova lógica) ---
function getStationArea(station) {
  // Se for estação INEP, não aplicar classificação por área especializada
  if (isINEPStation(station)) {
    return { key: 'inep', name: 'INEP', fullName: 'INEP', icon: '📋' };
  }
  
  // Se for REVALIDA FÁCIL, usar a especialidade
  if (isRevalidaFacilStation(station)) {
    const specialty = getRevalidaFacilSpecialty(station);
    
    const areas = {
      'clinica-medica': { name: 'CM', fullName: 'Clínica Médica', icon: '🩺' },
      'cirurgia': { name: 'CR', fullName: 'Cirurgia', icon: '🔪' },
      'pediatria': { name: 'PED', fullName: 'Pediatria', icon: '👶' },
      'ginecologia': { name: 'G.O', fullName: 'Ginecologia e Obstetrícia', icon: '👩‍⚕️' },
      'preventiva': { name: 'PREV', fullName: 'Preventiva', icon: '🛡️' },
      'geral': { name: 'GERAL', fullName: 'Medicina Geral', icon: '🏥' }
    };
    
    return { key: specialty, ...areas[specialty] };
  }
  
  // Fallback para estações não classificadas - usar lógica antiga
  const especialidadeRaw = (station.especialidade || '').toLowerCase();
  const titulo = (station.tituloEstacao || '').toLowerCase();

  // Normaliza e separa o campo especialidade e título em partes para análise
  const especialidades = especialidadeRaw
    .split(/[\\/,;\-\s]+/)
    .map(e => e.trim())
    .filter(e => e.length > 0)
    .map(e => e.normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
  
  const tituloNormalizado = titulo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Arrays de palavras-chave mais abrangentes e específicas
  const keywords = {
    'clinica-medica': [
      // Especifico
      'clinica medica', 'medicina interna', 'cm', 'clinica', 'medicina clinica',
      // Condições médicas comuns
      'avc', 'acidente vascular cerebral', 'infarto', 'iam', 'miocardio', 'diabetes', 'hipertensao', 'hipertensao arterial',
      'ulcera peptica', 'hemorragia digestiva', 'dengue', 'malaria', 'tuberculose', 'tbc',
      'pneumonia', 'bronquite', 'asma', 'dpoc', 'insuficiencia cardiaca', 'icc',
      'arritmia', 'fibrilacao', 'angina', 'embolia', 'trombose', 'neurologia', 'emergencia clinica',
      'enfarte', 'cardiopatia', 'nefropatia', 'hepatopatia', 'gastrite', 'artrite', 'artrose',
      'lupus', 'hipotireoidismo', 'hipertireoidismo', 'anemia', 'leucemia', 'linfoma',
      // Termos gerais
      'internacao', 'enfermaria', 'ambulatorio', 'consulta', 'isquemico', 'cronico'
    ],
    'cirurgia': [
      // Específico
      'cirurgia', 'cirurgica', 'cr', 'trauma', 'operatoria', 'procedimento cirurgico', 'cirurgia geral',
      // Tipos de cirurgia/trauma
      'trauma abdominal', 'trauma fechado', 'trauma craniano', 'ulcera peptica perfurada', 'ruptura esplenica',
      'oclusao arterial', 'laparotomia', 'apendicectomia', 'colecistectomia', 'herniorrafia', 
      'drenagem', 'sutura', 'urologia', 'ortopedia', 'neurocirurgia',
      // Emergências cirúrgicas
      'abdome agudo', 'hemorragia interna', 'perfuracao', 'obstrucao intestinal', 'perfurada',
      'politraumatismo', 'fraturas', 'luxacao', 'ferimento', 'corte', 'queimadura',
      'apendicite', 'colecistite', 'pancreatite', 'peritonite', 'hernia'
    ],
    'pediatria': [
      // Específico
      'pediatria', 'pediatrica', 'infantil', 'crianca', 'ped', 'neonatal', 'lactente', 'neonato',
      'puericultura', 'adolescente', 'escolar', 'pre escolar', 'meses', 'anos', 'recem nascido',
      // Condições pediátricas específicas
      'criptorquidia', 'fimose', 'pressao arterial crianca', 'vacinacao infantil', 'imunizacao',
      'crescimento', 'desenvolvimento', 'aleitamento', 'diarreia infantil', 'gastroenterite',
      'desidratacao', 'febre crianca', 'convulsao febril', 'aferição pediatrica', 'consulta pediatrica',
      'bronquiolite', 'asma infantil', 'pneumonia pediatrica', 'otite', 'faringite',
      // Termos relacionados à idade
      'lactante', 'escolar', 'adolescencia', 'puberdade', 'menor', 'criancas'
    ],
    'ginecologia': [
      // Específico
      'ginecologia', 'ginecologica', 'obstetricia', 'obstetrica', 'go', 'g.o', 'ginecoobstetricia',
      'mulher', 'gestante', 'gravida', 'gravidez', 'gestacao', 'obstetrico',
      // Obstetrícia
      'pre natal', 'prenatal', 'pielonefrite gestante', 'emergencia obstetrica', 'eclampsia', 'pre eclampsia',
      'sangramento gestacao', 'parto', 'puerpera', 'puerperio', 'amamentacao', 'lactacao',
      'trabalho de parto', 'cesariana', 'cesarea', 'forceps', 'episiotomia',
      // Ginecologia
      'violencia sexual', 'doenca inflamatoria pelvica', 'dip', 'dst', 'corrimento vaginal',
      'cancer colo', 'cancer cervical', 'papanicolaou', 'mama', 'contraceptivo', 'menopausa',
      'ciclo menstrual', 'menstruacao', 'amenorreia', 'dismenorreia', 'endometriose',
      'ovario', 'utero', 'cervix', 'vagina', 'vulva', 'pelvica', 'ginecologico'
    ],
    'preventiva': [
      // Específico
      'preventiva', 'medicina preventiva', 'medicina da familia', 'medicina de familia', 'mfc',
      'familia', 'coletiva', 'saude publica', 'saude coletiva', 'epidemiologia', 'prevencao', 'promocao',
      'medicina comunitaria', 'atencao basica', 'atencao primaria', 'aps', 'sus',
      // Saúde pública e coletiva
      'tuberculose', 'tbc', 'hiv', 'aids', 'coinfeccao', 'lagarta', 'erucismo', 'infectologia',
      'vacinacao', 'imunizacao', 'vigilancia epidemiologica', 'notificacao compulsoria',
      'saneamento', 'agua', 'esgoto', 'zoonose', 'endemias', 'comunidade', 'populacional',
      'educacao em saude', 'promocao da saude', 'prevencao primaria', 'prevencao secundaria',
      'rastreamento', 'screening', 'deteccao precoce', 'programa de saude',
      // Condições relacionadas à saúde pública
      'hanseniase', 'chagas', 'esquistossomose', 'malaria', 'dengue', 'zika', 'chikungunya',
      'hepatite', 'sifilis', 'gonorreia', 'clamydia'
    ]
  };

  // Função helper para checar keywords (busca exata e parcial)
  const matchesKeywords = (text, keywordList) => {
    if (!text) return false;
    
    return keywordList.some(keyword => {
      // Match exato
      if (text.includes(keyword)) {
        return true;
      }
      
      // Match parcial (palavras individuais) - apenas para keywords com múltiplas palavras
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

  // Checa primeiro a especialidade, depois o título
  let key = 'geral';
  let matchInfo = '';
  
  // Prioridade de checagem: primeiro especialidade, depois título
  for (const [areaKey, keywordList] of Object.entries(keywords)) {
    // Checa especialidade primeiro (mais confiável)
    const especialidadeMatch = especialidades.some(esp => matchesKeywords(esp, keywordList));
    
    if (especialidadeMatch) {
      key = areaKey;
      matchInfo = 'especialidade';
      break;
    }
  }
  
  // Se não encontrou match na especialidade, checa o título
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

  // Fallback baseado em padrões específicos no título (casos especiais)
  if (key === 'geral') {
    const tituloOriginal = (station.tituloEstacao || '').toLowerCase();
    
    // Padrões específicos que podem ter sido perdidos
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

// --- Função para obter cores por especialidade ---
function getSpecialtyColor(station) {
  const area = getStationArea(station);
  
  // Cores para modo claro (diurno)
  const lightColors = {
    'clinica-medica': '#87CEEB', // azul claro
    'cirurgia': '#1E3A8A', // azul escuro
    'pediatria': '#22C55E', // verde
    'ginecologia': '#EC4899', // rosa
    'preventiva': '#F97316', // laranjado
    'geral': '#6B7280' // cinza padrão
  };
  
  // Cores para modo escuro (noturno) - mais vibrantes e com melhor contraste
  const darkColors = {
    'clinica-medica': '#5DADE2', // azul mais vibrante
    'cirurgia': '#3498DB', // azul médio mais claro
    'pediatria': '#58D68D', // verde mais claro
    'ginecologia': '#F48FB1', // rosa mais suave
    'preventiva': '#FFB74D', // laranja mais suave
    'geral': '#90A4AE' // cinza mais claro
  };
  
  const colors = isDarkTheme.value ? darkColors : lightColors;
  return colors[area.key] || colors.geral;
}

// --- Função para obter a transparência baseada no tema ---
function getBackgroundOpacity() {
  // No modo escuro, usar menos transparência para melhor visibilidade
  return isDarkTheme.value ? '60' : '40';
}

// --- Função para formatar data da estação (criação ou última edição) ---
function formatStationDate(station) {
  try {
    let date = null;
    let label = '';
    
    // Se foi editada, mostrar data da última edição
    if (station.hasBeenEdited && station.atualizadoEmTimestamp) {
      date = station.atualizadoEmTimestamp.toDate ? station.atualizadoEmTimestamp.toDate() : new Date(station.atualizadoEmTimestamp);
      label = 'Editada';
    } 
    // Senão, mostrar data de criação
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

// --- Função para calcular dificuldade baseada na nota média ---
function getStationDifficulty(stationId, averageScore = null) {
  // Se não tiver nota média, simula uma baseada no hash do ID
  let avgScore = averageScore;
  if (avgScore === null) {
    const hash = stationId?.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0) || 0;
    avgScore = (Math.abs(hash) % 61) + 40; // Entre 40 e 100
  }
  
  // Converte a nota para escala de 0 a 10
  const normalizedScore = avgScore / 10;
  
  // Classifica dificuldade baseada na nota média geral
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

// --- Função para simular nota do usuário ---
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
  
  // Retorna a nota normalizada de 0-10
  return (finalScore / 10).toFixed(1);
}

// --- Computed properties para filtros ---
const filteredStations = computed(() => {
  let filtered = stations.value;
  
  // Filtro por categoria principal
  if (selectedCategory.value === 'inep') {
    // Filtra por estações INEP (provas anteriores)
    filtered = filtered.filter(station => {
      const titulo = station.tituloEstacao?.toUpperCase() || '';
      return titulo.includes("INEP") && titulo.includes("2024.2");
    });
  } else if (selectedCategory.value === 'revalida-facil') {
    // Filtra por estações REVALIDA FÁCIL com base na origem
    filtered = filtered.filter(station => {
      const origem = station.origem?.toUpperCase() || '';
      return origem === 'REVALIDA_FACIL';
    });
  }
  
  // Filtro por área de especialidade
  if (selectedArea.value && selectedCategory.value) {
    filtered = filtered.filter(station => {
      const area = getStationArea(station);
      return area.key === selectedArea.value;
    });
  }
  
  // Filtro por pesquisa
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(station => {
      const title = station.tituloEstacao?.toLowerCase() || '';
      const cleanTitle = getCleanStationTitle(station.tituloEstacao).toLowerCase();
      const area = getStationArea(station).name.toLowerCase();
      return title.includes(query) || cleanTitle.includes(query) || area.includes(query);
    });
  }
  
  return filtered;
});

// --- Computed para sugestões de pesquisa ---
const allStationTitles = computed(() => {
  const titles = [];
  
  if (selectedCategory.value === 'inep') {
    // Títulos das estações INEP
    stations2024_2.value.forEach(station => {
      const cleanTitle = getCleanStationTitle(station.tituloEstacao);
      if (cleanTitle && !titles.includes(cleanTitle)) {
        titles.push(cleanTitle);
      }
    });
  } else if (selectedCategory.value === 'revalida-facil') {
    // Títulos das estações REVALIDA FÁCIL
    stationsRevalidaFacil.value.forEach(station => {
      const cleanTitle = getCleanStationTitle(station.tituloEstacao);
      if (cleanTitle && !titles.includes(cleanTitle)) {
        titles.push(cleanTitle);
      }
    });
  } else {
    // Todos os títulos se nenhuma categoria selecionada
    stations.value.forEach(station => {
      const cleanTitle = getCleanStationTitle(station.tituloEstacao);
      if (cleanTitle && !titles.includes(cleanTitle)) {
        titles.push(cleanTitle);
      }
    });
  }
  
  return titles.sort();
});

// --- Função para atualizar sugestões ---
function updateSuggestions() {
  if (!searchQuery.value.trim()) {
    searchSuggestions.value = [];
    showSuggestions.value = false;
    return;
  }
  
  const query = searchQuery.value.toLowerCase();
  searchSuggestions.value = allStationTitles.value
    .filter(title => title.toLowerCase().includes(query))
    .slice(0, 5); // Máximo 5 sugestões
    
  showSuggestions.value = searchSuggestions.value.length > 0;
}

// --- Função para selecionar sugestão ---
function selectSuggestion(suggestion) {
  searchQuery.value = suggestion;
  showSuggestions.value = false;
}

// --- Função para esconder sugestões ---
function hideSuggestions() {
  setTimeout(() => {
    showSuggestions.value = false;
  }, 150);
}

const filteredStations2024_2 = computed(() => {
  return filteredStations.value
    .filter(station => {
      const titulo = station.tituloEstacao?.toUpperCase() || '';
      return titulo.includes("INEP") && titulo.includes("2024.2");
    })
    .sort((a, b) => getCleanStationTitle(a.tituloEstacao).localeCompare(getCleanStationTitle(b.tituloEstacao), 'pt-BR', { numeric: true }));
});

// --- Função para Buscar Estações ---
async function fetchStations() {
  isLoadingStations.value = true;
  errorMessage.value = '';
  stations.value = [];
  
  // Limpar cache ao buscar estações
  clearEditStatusCache();

  try {
    const stationsColRef = collection(db, 'estacoes_clinicas');
    const querySnapshot = await getDocs(stationsColRef);

    const stationsList = [];
    querySnapshot.forEach((doc) => {
      stationsList.push({ id: doc.id, ...doc.data() });
    });
    
    // Ordenando manualmente no cliente
    stationsList.sort((a, b) => {
      const numA = a.numeroDaEstacao || 0;
      const numB = b.numeroDaEstacao || 0;
      return numA - numB;
    });
    
    stations.value = stationsList;
    
    // Buscar pontuações do usuário após carregar estações
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
    }
  } finally {
    isLoadingStations.value = false;
  }
}

// --- Função para buscar pontuações do usuário ---
async function fetchUserScores() {
  if (!currentUser.value) return;
  
  try {
    // Buscar dados do usuário na coleção usuarios onde estão salvos os historicos
    const userDocRef = doc(db, 'usuarios', currentUser.value.uid);
    const userDocSnap = await getDoc(userDocRef);
    
    const scores = {};
    
    if (userDocSnap.exists()) {
      const userData = userDocSnap.data();
      const estacoesConcluidas = userData.estacoesConcluidas || [];
      
      // Processar cada estação concluída
      estacoesConcluidas.forEach((estacao) => {
        if (estacao.idEstacao && estacao.nota !== undefined) {
          // Se já existe uma pontuação para esta estação, manter a maior
          if (!scores[estacao.idEstacao] || estacao.nota > scores[estacao.idEstacao].score) {
            scores[estacao.idEstacao] = {
              score: estacao.nota,
              maxScore: 100, // Assumindo que a nota máxima é 100
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

// --- Funções para busca de candidatos ---
async function searchCandidates() {
  if (!candidateSearchQuery.value?.trim()) {
    candidateSearchSuggestions.value = [];
    showCandidateSuggestions.value = false;
    return;
  }

  isLoadingCandidateSearch.value = true;
  try {
    const searchTerm = candidateSearchQuery.value.trim().toLowerCase();
    
    // Verificar se o usuário atual tem permissão
    if (!currentUser.value?.uid) {
      throw new Error('Usuário não autenticado');
    }
    
    const usuariosRef = collection(db, 'usuarios');
    
    // Buscar por nome (case insensitive)
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
    
    candidateSearchSuggestions.value = candidates.slice(0, 10); // Limitar a 10 resultados
    showCandidateSuggestions.value = candidates.length > 0;
    
  } catch (error) {
    console.error('Erro ao buscar candidatos:', error);
    candidateSearchSuggestions.value = [];
    showCandidateSuggestions.value = false;
    
    // Tratamento específico para erros de permissão
    if (error.code === 'permission-denied') {
      console.warn('Permissão negada para buscar usuários. Verifique as regras do Firestore.');
    }
  } finally {
    isLoadingCandidateSearch.value = false;
  }
}

async function selectCandidate(candidate) {
  selectedCandidate.value = candidate;
  candidateSearchQuery.value = `${candidate.nome} ${candidate.sobrenome}`.trim();
  showCandidateSuggestions.value = false;
  
  // Carregar pontuações do candidato selecionado
  await fetchCandidateScores(candidate.uid);
}

async function fetchCandidateScores(candidateUid) {
  try {
    if (!candidateUid) {
      throw new Error('UID do candidato não fornecido');
    }
    
    const scores = {};
    
    // Buscar dados do candidato na coleção usuarios
    const userDocRef = doc(db, 'usuarios', candidateUid);
    const userDocSnap = await getDoc(userDocRef);
    
    if (userDocSnap.exists()) {
      const userData = userDocSnap.data();
      const estacoesConcluidas = userData.estacoesConcluidas || [];
      
      // Processar cada estação concluída
      estacoesConcluidas.forEach((estacao) => {
        try {
          if (estacao.idEstacao && estacao.nota !== undefined) {
            // Se já existe uma pontuação para esta estação, manter a maior
            if (!scores[estacao.idEstacao] || estacao.nota > scores[estacao.idEstacao].score) {
              scores[estacao.idEstacao] = {
                score: estacao.nota,
                maxScore: 100, // Assumindo que a nota máxima é 100
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
    console.log('Pontuações do candidato carregadas:', scores);
    
  } catch (error) {
    console.error('Erro ao buscar pontuações do candidato:', error);
    selectedCandidateScores.value = {};
    
    // Tratamento específico para erros de permissão
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

// --- Função para obter pontuação do usuário para uma estação específica ---
function getUserStationScore(stationId) {
  // Se um candidato está selecionado, usar suas pontuações
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
    
    // Salvar candidato selecionado no sessionStorage se houver um
    if (selectedCandidate.value) {
      const candidateData = {
        uid: selectedCandidate.value.uid,
        name: `${selectedCandidate.value.nome} ${selectedCandidate.value.sobrenome}`.trim(),
        email: selectedCandidate.value.email,
        photoURL: selectedCandidate.value.photoURL,
        selectedAt: Date.now(),
        sessionId: null // será preenchido após criar a sessão
      };
      
      sessionStorage.setItem('selectedCandidate', JSON.stringify(candidateData));
      console.log('Candidato selecionado salvo para a simulação:', candidateData);
    }
    
    // O backend espera apenas stationId, não checklistId
    const response = await fetch(`${backendUrl}/api/create-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        stationId: stationId
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Erro HTTP ${response.status}:`, errorText);
      throw new Error(`Erro na resposta: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    if (result.sessionId) {
      // Atualizar o sessionId no candidato selecionado
      if (selectedCandidate.value) {
        const candidateData = JSON.parse(sessionStorage.getItem('selectedCandidate'));
        if (candidateData) {
          candidateData.sessionId = result.sessionId;
          sessionStorage.setItem('selectedCandidate', JSON.stringify(candidateData));
        }
      }
      
      const navigationUrl = `/app/simulation/${stationId}?sessionId=${result.sessionId}&role=actor`;
      
      // Navegar para a simulação com os parâmetros corretos
      router.push({
        path: `/app/simulation/${stationId}`,
        query: {
          sessionId: result.sessionId,
          role: 'actor'
        }
      });
    } else {
      console.error('sessionId não encontrado na resposta:', result);
      throw new Error('Sessão criada mas sessionId não retornado');
    }

  } catch (error) {
    console.error('Erro completo ao criar sessão:', error);
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

function goToAdminUpload() {
  router.push('/app/admin-upload');
}

function copyLink() {
  try {
    navigator.clipboard.writeText(generatedCandidateLink.value);
    console.log('Link copiado!');
  } catch (error) {
    console.error('Falha ao copiar link:', error);
  }
}

onMounted(() => {
  fetchStations();
});

// --- Watch para limpar área quando categoria mudar ---
watch(selectedCategory, () => {
  selectedArea.value = '';
  searchQuery.value = '';
  showSuggestions.value = false;
});

watch(searchQuery, () => {
  updateSuggestions();
});

// Watch para busca de candidatos com debounce
watch(candidateSearchQuery, () => {
  if (candidateSearchQuery.value.trim()) {
    searchCandidates();
  } else {
    candidateSearchSuggestions.value = [];
    showCandidateSuggestions.value = false;
  }
});

// Watch para carregar pontuações quando o usuário mudar
watch(currentUser, (newUser) => {
  if (newUser && stations.value.length > 0) {
    fetchUserScores();
  }
}, { immediate: true });

// Colapso automático do sidebar
function toggleCollapse() {
  const wrapper = document.querySelector('.layout-wrapper')
  wrapper?.classList.toggle('layout-vertical-nav-collapsed')
}
onMounted(() => {
  // Sidebar permanece aberto por padrão - não adicionar classe collapsed
  // const wrapper = document.querySelector('.layout-wrapper')
  // wrapper?.classList.add('layout-vertical-nav-collapsed')
})
onUnmounted(() => {
  const wrapper = document.querySelector('.layout-wrapper')
  wrapper?.classList.remove('layout-vertical-nav-collapsed')
})

// Layout global (header/sidebar)
function toggleUserMenu() { showUserMenu.value = !showUserMenu.value; }
function logout() { signOut(firebaseAuth); }
function toggleSidebar() { sidebarOpen.value = !sidebarOpen.value; }
function goToHome() { router.push('/'); }
function openGoogleMeet() { window.open('https://meet.google.com', '_blank'); }
function openGemini() { window.open('https://gemini.google.com', '_blank'); }
function openWhatsApp() { window.open('https://wa.me/', '_blank'); }
function getStatusText(status) { return status; }

// Modo de depuração
const isDebugMode = ref(false);
const selectedElement = ref(null);
const debugStyles = reactive({});

// Ativar/Desativar modo de depuração
function toggleDebugMode() {
  isDebugMode.value = !isDebugMode.value;
  if (!isDebugMode.value) {
    selectedElement.value = null;
    debugStyles.value = {};
  }
}

// Selecionar elemento no clique
function selectElement(event) {
  if (!isDebugMode.value) return;
  event.preventDefault();
  selectedElement.value = event.target;
  // Access reactive object directly without .value
  debugStyles.backgroundColor = event.target.style.backgroundColor || '';
  debugStyles.color = event.target.style.color || '';
}

// Aplicar estilos ao elemento selecionado
function applyStyles() {
  if (selectedElement.value) {
    Object.assign(selectedElement.value.style, debugStyles);
  }
}

// Corrigindo possíveis erros de declaração ou instrução esperada
// Certifique-se de que todas as declarações estão completas e válidas
const exampleVariable = ref(null); // Exemplo de declaração válida
</script>

<template>
  <v-container fluid class="pa-0">
    <!-- Botão de toggle para expandir/recolher sidebar -->
    <v-tooltip location="right">
      <template #activator="{ props }">
        <v-btn icon fixed top left @click="toggleCollapse" class="ma-3 z-index-5" v-bind="props">
          <v-icon>ri-menu-line</v-icon>
        </v-btn>
      </template>
      Abrir/Fechar menu lateral
    </v-tooltip>
     <v-row>
      <v-col cols="12" md="12" class="mx-auto">
        <!-- Botão Admin Upload (visível apenas para administradores) -->
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

        <!-- Candidato Selecionado - Visível apenas quando um candidato está selecionado -->
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

        <!-- Campo de Busca de Candidato - Visível apenas quando nenhum candidato está selecionado -->
        <v-card v-if="!selectedCandidate" class="mb-4" elevation="2" rounded>
          <v-card-title class="d-flex align-center">
            <v-icon class="me-2" color="primary">ri-search-line</v-icon>
            <span class="text-h6">Buscar Candidato</span>
          </v-card-title>
          <v-card-text>
            <!-- Campo de busca -->
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
                />
              </template>
              
              <!-- Lista de sugestões -->
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

        <!-- Expansion Panels para Seções Principais -->
        <v-expansion-panels variant="accordion" class="mb-6">
          
          <!-- INEP Revalida -->
          <v-expansion-panel>
            <v-expansion-panel-title class="text-h6 font-weight-bold">
              <template #default="{ expanded }">
                <v-row no-gutters align="center">
                  <v-col cols="auto">
                    <v-icon class="me-2" color="primary">ri-archive-drawer-line</v-icon>
                  </v-col>
                  <v-col>
                    INEP Revalida – Provas Anteriores
                  </v-col>
                  <v-col cols="auto">
                    <v-badge :content="stations2025_1.length + stations2024_2.length + stations2024_1.length + stations2023_2.length + stations2023_1.length + stations2022_2.length + stations2022_1.length + stations2021.length + stations2020.length" color="primary" inline />
                  </v-col>
                </v-row>
              </template>
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <!-- Sub-accordions para as provas -->
              <v-expansion-panels variant="accordion" class="mt-4">
                
                <!-- INEP 2025.1 -->
                <v-expansion-panel>
                  <v-expansion-panel-title class="text-subtitle-1 font-weight-medium">
                    <template #default="{ expanded }">
                      <v-row no-gutters align="center">
                        <v-col cols="auto">
                          <v-icon class="me-2" color="info">ri-calendar-event-line</v-icon>
                        </v-col>
                        <v-col>
                          INEP 2025.1
                        </v-col>
                        <v-col cols="auto">
                          <v-badge :content="stations2025_1.length" color="info" inline />
                        </v-col>
                      </v-row>
                    </template>
                  </v-expansion-panel-title>
                  <v-expansion-panel-text v-if="stations2025_1.length > 0">
                    <v-list density="comfortable">
                      <v-list-item
                        v-for="station in stations2025_1"
                        :key="station.id"
                        class="mb-2 rounded-lg elevation-1 station-list-item clickable-card"
                        :style="{ backgroundColor: getSpecialtyColor(station) + getBackgroundOpacity() }"
                        @click="startSimulationAsActor(station.id)"
                      >
                        <template #prepend>
                          <v-icon color="info">ri-file-list-3-line</v-icon>
                        </template>
                        <v-list-item-title class="font-weight-bold text-body-1">{{ getCleanStationTitle(station.tituloEstacao) }}</v-list-item-title>
                        <v-list-item-subtitle class="text-caption text-secondary">{{ station.especialidade }}</v-list-item-subtitle>
                        
                        <!-- Indicadores de Status de Edição -->
                        <div class="d-flex align-center gap-2 mt-1">
                          <!-- Badge de Status de Edição -->
                          <v-chip 
                            v-if="station.hasBeenEdited === false" 
                            color="warning" 
                            variant="flat" 
                            size="x-small"
                            class="edit-status-chip"
                          >
                            <v-icon start size="12">ri-alert-line</v-icon>
                            NÃO EDITADA
                          </v-chip>
                          <v-chip 
                            v-else-if="station.hasBeenEdited === true" 
                            color="success" 
                            variant="flat" 
                            size="x-small"
                            class="edit-status-chip"
                          >
                            <v-icon start size="12">ri-check-line</v-icon>
                            EDITADA ({{ station.totalEdits || 0 }}x)
                          </v-chip>
                          
                          <!-- Data de Criação/Última Edição -->
                          <v-chip 
                            v-if="station.criadoEmTimestamp || station.atualizadoEmTimestamp"
                            color="info" 
                            variant="outlined" 
                            size="x-small"
                            class="date-chip"
                          >
                            <v-icon start size="10">ri-time-line</v-icon>
                            {{ formatStationDate(station) }}
                          </v-chip>
                        </div>
                        
                        <!-- Pontuação do usuário -->
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
                              class="me-2"
                            />
                            <v-btn
                              v-if="isAdmin"
                              color="secondary"
                              variant="text"
                              size="small"
                              icon="ri-pencil-line"
                              @click.stop="goToEditStation(station.id)"
                              class="me-2"
                              aria-label="Editar Estação"
                            />
                          </div>
                        </template>
                      </v-list-item>
                    </v-list>
                  </v-expansion-panel-text>
                </v-expansion-panel>
                
                <!-- INEP 2024.2 -->
                <v-expansion-panel v-if="stations2024_2.length > 0">
                  <v-expansion-panel-title class="text-subtitle-1 font-weight-medium">
                    <template #default="{ expanded }">
                      <v-row no-gutters align="center">
                        <v-col cols="auto">
                          <v-icon class="me-2" color="info">ri-calendar-event-line</v-icon>
                        </v-col>
                        <v-col>
                          INEP 2024.2
                        </v-col>
                        <v-col cols="auto">
                          <v-badge :content="stations2024_2.length" color="info" inline />
                        </v-col>
                      </v-row>
                    </template>
                  </v-expansion-panel-title>
                  <v-expansion-panel-text>
                    <v-list density="comfortable">
                      <v-list-item
                        v-for="station in stations2024_2"
                        :key="station.id"
                        class="mb-2 rounded-lg elevation-1 station-list-item clickable-card"
                        :style="{ backgroundColor: getSpecialtyColor(station) + getBackgroundOpacity() }"
                        @click="startSimulationAsActor(station.id)"
                      >
                        <template #prepend>
                          <v-icon color="info">ri-file-list-3-line</v-icon>
                        </template>
                        <v-list-item-title class="font-weight-bold text-body-1">{{ getCleanStationTitle(station.tituloEstacao) }}</v-list-item-title>
                        <v-list-item-subtitle class="text-caption text-secondary">{{ station.especialidade }}</v-list-item-subtitle>
                        
                        <!-- Pontuação do usuário -->
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
                              class="me-2"
                            />
                            <v-btn
                              v-if="isAdmin"
                              color="secondary"
                              variant="text"
                              size="small"
                              icon="ri-pencil-line"
                              @click.stop="goToEditStation(station.id)"
                              class="me-2"
                              aria-label="Editar Estação"
                            />
                          </div>
                        </template>
                      </v-list-item>
                    </v-list>
                  </v-expansion-panel-text>
                </v-expansion-panel>
                
                <!-- INEP 2024.1 -->
                <v-expansion-panel>
                  <v-expansion-panel-title class="text-subtitle-1 font-weight-medium">
                    <template #default="{ expanded }">
                      <v-row no-gutters align="center">
                        <v-col cols="auto">
                          <v-icon class="me-2" color="info">ri-calendar-event-line</v-icon>
                        </v-col>
                        <v-col>
                          INEP 2024.1
                        </v-col>
                        <v-col cols="auto">
                          <v-badge :content="stations2024_1.length" color="info" inline />
                        </v-col>
                      </v-row>
                    </template>
                  </v-expansion-panel-title>
                  <v-expansion-panel-text v-if="stations2024_1.length > 0">
                    <v-list density="comfortable">
                      <v-list-item
                        v-for="station in stations2024_1"
                        :key="station.id"
                        class="mb-2 rounded-lg elevation-1 station-list-item clickable-card"
                        :style="{ backgroundColor: getSpecialtyColor(station) + getBackgroundOpacity() }"
                        @click="startSimulationAsActor(station.id)"
                      >
                        <template #prepend>
                          <v-icon color="info">ri-file-list-3-line</v-icon>
                        </template>
                        <v-list-item-title class="font-weight-bold text-body-1">{{ getCleanStationTitle(station.tituloEstacao) }}</v-list-item-title>
                        <v-list-item-subtitle class="text-caption text-secondary">{{ station.especialidade }}</v-list-item-subtitle>
                        
                        <!-- Pontuação do usuário -->
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
                              class="me-2"
                            />
                            <v-btn
                              v-if="isAdmin"
                              color="secondary"
                              variant="text"
                              size="small"
                              icon="ri-pencil-line"
                              @click.stop="goToEditStation(station.id)"
                              class="me-2"
                              aria-label="Editar Estação"
                            />
                          </div>
                        </template>
                      </v-list-item>
                    </v-list>
                  </v-expansion-panel-text>
                </v-expansion-panel>
                
                <!-- INEP 2023.2 -->
                <v-expansion-panel>
                  <v-expansion-panel-title class="text-subtitle-1 font-weight-medium">
                    <template #default="{ expanded }">
                      <v-row no-gutters align="center">
                        <v-col cols="auto">
                          <v-icon class="me-2" color="info">ri-calendar-event-line</v-icon>
                        </v-col>
                        <v-col>
                          INEP 2023.2
                        </v-col>
                        <v-col cols="auto">
                          <v-badge :content="stations2023_2.length" color="info" inline />
                        </v-col>
                      </v-row>
                    </template>
                  </v-expansion-panel-title>
                  <v-expansion-panel-text v-if="stations2023_2.length > 0">
                    <v-list density="comfortable">
                      <v-list-item
                        v-for="station in stations2023_2"
                        :key="station.id"
                        class="mb-2 rounded-lg elevation-1 station-list-item clickable-card"
                        :style="{ backgroundColor: getSpecialtyColor(station) + getBackgroundOpacity() }"
                        @click="startSimulationAsActor(station.id)"
                      >
                        <template #prepend>
                          <v-icon color="info">ri-file-list-3-line</v-icon>
                        </template>
                        <v-list-item-title class="font-weight-bold text-body-1">{{ getCleanStationTitle(station.tituloEstacao) }}</v-list-item-title>
                        <v-list-item-subtitle class="text-caption text-secondary">{{ station.especialidade }}</v-list-item-subtitle>
                        
                        <!-- Pontuação do usuário -->
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
                              class="me-2"
                            />
                            <v-btn
                              v-if="isAdmin"
                              color="secondary"
                              variant="text"
                              size="small"
                              icon="ri-pencil-line"
                              @click.stop="goToEditStation(station.id)"
                              class="me-2"
                              aria-label="Editar Estação"
                            />
                          </div>
                        </template>
                      </v-list-item>
                    </v-list>
                  </v-expansion-panel-text>
                </v-expansion-panel>
                
                <!-- INEP 2023.1 -->
                <v-expansion-panel>
                  <v-expansion-panel-title class="text-subtitle-1 font-weight-medium">
                    <template #default="{ expanded }">
                      <v-row no-gutters align="center">
                        <v-col cols="auto">
                          <v-icon class="me-2" color="info">ri-calendar-event-line</v-icon>
                        </v-col>
                        <v-col>
                          INEP 2023.1
                        </v-col>
                        <v-col cols="auto">
                          <v-badge :content="stations2023_1.length" color="info" inline />
                        </v-col>
                      </v-row>
                    </template>
                  </v-expansion-panel-title>
                  <v-expansion-panel-text v-if="stations2023_1.length > 0">
                    <v-list density="comfortable">
                      <v-list-item
                        v-for="station in stations2023_1"
                        :key="station.id"
                        class="mb-2 rounded-lg elevation-1 station-list-item clickable-card"
                        :style="{ backgroundColor: getSpecialtyColor(station) + getBackgroundOpacity() }"
                        @click="startSimulationAsActor(station.id)"
                      >
                        <template #prepend>
                          <v-icon color="info">ri-file-list-3-line</v-icon>
                        </template>
                        <v-list-item-title class="font-weight-bold text-body-1">{{ getCleanStationTitle(station.tituloEstacao) }}</v-list-item-title>
                        <v-list-item-subtitle class="text-caption text-secondary">{{ station.especialidade }}</v-list-item-subtitle>
                        
                        <!-- Pontuação do usuário -->
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
                              class="me-2"
                            />
                            <v-btn
                              v-if="isAdmin"
                              color="secondary"
                              variant="text"
                              size="small"
                              icon="ri-pencil-line"
                              @click.stop="goToEditStation(station.id)"
                              class="me-2"
                              aria-label="Editar Estação"
                            />
                          </div>
                        </template>
                      </v-list-item>
                    </v-list>
                  </v-expansion-panel-text>
                </v-expansion-panel>
                
                <!-- INEP 2022.2 -->
                <v-expansion-panel>
                  <v-expansion-panel-title class="text-subtitle-1 font-weight-medium">
                    <template #default="{ expanded }">
                      <v-row no-gutters align="center">
                        <v-col cols="auto">
                          <v-icon class="me-2" color="info">ri-calendar-event-line</v-icon>
                        </v-col>
                        <v-col>
                          INEP 2022.2
                        </v-col>
                        <v-col cols="auto">
                          <v-badge :content="stations2022_2.length" color="info" inline />
                        </v-col>
                      </v-row>
                    </template>
                  </v-expansion-panel-title>
                  <v-expansion-panel-text v-if="stations2022_2.length > 0">
                    <v-list density="comfortable">
                      <v-list-item
                        v-for="station in stations2022_2"
                        :key="station.id"
                        class="mb-2 rounded-lg elevation-1 station-list-item clickable-card"
                        :style="{ backgroundColor: getSpecialtyColor(station) + getBackgroundOpacity() }"
                        @click="startSimulationAsActor(station.id)"
                      >
                        <template #prepend>
                          <v-icon color="info">ri-file-list-3-line</v-icon>
                        </template>
                        <v-list-item-title class="font-weight-bold text-body-1">{{ getCleanStationTitle(station.tituloEstacao) }}</v-list-item-title>
                        <v-list-item-subtitle class="text-caption text-secondary">{{ station.especialidade }}</v-list-item-subtitle>
                        
                        <!-- Pontuação do usuário -->
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
                              class="me-2"
                            />
                            <v-btn
                              v-if="isAdmin"
                              color="secondary"
                              variant="text"
                              size="small"
                              icon="ri-pencil-line"
                              @click.stop="goToEditStation(station.id)"
                              class="me-2"
                              aria-label="Editar Estação"
                            />
                          </div>
                        </template>
                      </v-list-item>
                    </v-list>
                  </v-expansion-panel-text>
                </v-expansion-panel>

                <!-- INEP 2022.1 -->
                <v-expansion-panel>
                  <v-expansion-panel-title class="text-subtitle-1 font-weight-medium">
                    <template #default="{ expanded }">
                      <v-row no-gutters align="center">
                        <v-col cols="auto">
                          <v-icon class="me-2" color="info">ri-calendar-event-line</v-icon>
                        </v-col>
                        <v-col>
                          INEP 2022.1
                        </v-col>
                        <v-col cols="auto">
                          <v-badge :content="stations2022_1.length" color="info" inline />
                        </v-col>
                      </v-row>
                    </template>
                  </v-expansion-panel-title>
                  <v-expansion-panel-text v-if="stations2022_1.length > 0">
                    <v-list density="comfortable">
                      <v-list-item
                        v-for="station in stations2022_1"
                        :key="station.id"
                        class="mb-2 rounded-lg elevation-1 station-list-item clickable-card"
                        :style="{ backgroundColor: getSpecialtyColor(station) + getBackgroundOpacity() }"
                        @click="startSimulationAsActor(station.id)"
                      >
                        <template #prepend>
                          <v-icon color="info">ri-file-list-3-line</v-icon>
                        </template>
                        <v-list-item-title class="font-weight-bold text-body-1">{{ getCleanStationTitle(station.tituloEstacao) }}</v-list-item-title>
                        <v-list-item-subtitle class="text-caption text-secondary">{{ station.especialidade }}</v-list-item-subtitle>
                        
                        <!-- Pontuação do usuário -->
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
                              class="me-2"
                            />
                            <v-btn
                              v-if="isAdmin"
                              color="secondary"
                              variant="text"
                              size="small"
                              icon="ri-pencil-line"
                              @click.stop="goToEditStation(station.id)"
                              class="me-2"
                              aria-label="Editar Estação"
                            />
                          </div>
                        </template>
                      </v-list-item>
                    </v-list>
                  </v-expansion-panel-text>
                </v-expansion-panel>
                
                <!-- INEP 2021 -->
                <v-expansion-panel>
                  <v-expansion-panel-title class="text-subtitle-1 font-weight-medium">
                    <template #default="{ expanded }">
                      <v-row no-gutters align="center">
                        <v-col cols="auto">
                          <v-icon class="me-2" color="info">ri-calendar-event-line</v-icon>
                        </v-col>
                        <v-col>
                          INEP 2021
                        </v-col>
                        <v-col cols="auto">
                          <v-badge :content="stations2021.length" color="info" inline />
                        </v-col>
                      </v-row>
                    </template>
                  </v-expansion-panel-title>
                  <v-expansion-panel-text v-if="stations2021.length > 0">
                    <v-list density="comfortable">
                      <v-list-item
                        v-for="station in stations2021"
                        :key="station.id"
                        class="mb-2 rounded-lg elevation-1 station-list-item clickable-card"
                        :style="{ backgroundColor: getSpecialtyColor(station) + getBackgroundOpacity() }"
                        @click="startSimulationAsActor(station.id)"
                      >
                        <template #prepend>
                          <v-icon color="info">ri-file-list-3-line</v-icon>
                        </template>
                        <v-list-item-title class="font-weight-bold text-body-1">{{ getCleanStationTitle(station.tituloEstacao) }}</v-list-item-title>
                        <v-list-item-subtitle class="text-caption text-secondary">{{ station.especialidade }}</v-list-item-subtitle>
                        
                        <!-- Pontuação do usuário -->
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
                              class="me-2"
                            />
                            <v-btn
                              v-if="isAdmin"
                              color="secondary"
                              variant="text"
                              size="small"
                              icon="ri-pencil-line"
                              @click.stop="goToEditStation(station.id)"
                              class="me-2"
                              aria-label="Editar Estação"
                            />
                          </div>
                        </template>
                      </v-list-item>
                    </v-list>
                  </v-expansion-panel-text>
                </v-expansion-panel>

                <!-- INEP 2020 -->
                <v-expansion-panel>
                  <v-expansion-panel-title class="text-subtitle-1 font-weight-medium">
                    <template #default="{ expanded }">
                      <v-row no-gutters align="center">
                        <v-col cols="auto">
                          <v-icon class="me-2" color="info">ri-calendar-event-line</v-icon>
                        </v-col>
                        <v-col>
                          INEP 2020
                        </v-col>
                        <v-col cols="auto">
                          <v-badge :content="stations2020.length" color="info" inline />
                        </v-col>
                      </v-row>
                    </template>
                  </v-expansion-panel-title>
                  <v-expansion-panel-text v-if="stations2020.length > 0">
                    <v-list density="comfortable">
                      <v-list-item
                        v-for="station in stations2020"
                        :key="station.id"
                        class="mb-2 rounded-lg elevation-1 station-list-item clickable-card"
                        :style="{ backgroundColor: getSpecialtyColor(station) + getBackgroundOpacity() }"
                        @click="startSimulationAsActor(station.id)"
                      >
                        <template #prepend>
                          <v-icon color="info">ri-file-list-3-line</v-icon>
                        </template>
                        <v-list-item-title class="font-weight-bold text-body-1">{{ getCleanStationTitle(station.tituloEstacao) }}</v-list-item-title>
                        <v-list-item-subtitle class="text-caption text-secondary">{{ station.especialidade }}</v-list-item-subtitle>
                        
                        <!-- Pontuação do usuário -->
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
                              class="me-2"
                            />
                            <v-btn
                              v-if="isAdmin"
                              color="secondary"
                              variant="text"
                              size="small"
                              icon="ri-pencil-line"
                              @click.stop="goToEditStation(station.id)"
                              class="me-2"
                              aria-label="Editar Estação"
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

          <!-- REVALIDA FÁCIL -->
          <v-expansion-panel>
            <v-expansion-panel-title class="text-h6 font-weight-bold">
              <template #default="{ expanded }">
                <v-row no-gutters align="center">
                  <v-col cols="auto">
                    <v-icon class="me-2" color="primary">ri-star-smile-line</v-icon>
                  </v-col>
                  <v-col>
                    REVALIDA FÁCIL
                  </v-col>
                  <v-col cols="auto">
                    <v-badge :content="stationsRevalidaFacil.length" color="primary" inline />
                  </v-col>
                </v-row>
              </template>
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <!-- Sub-accordions para especialidades -->
              <v-expansion-panels variant="accordion" class="mt-4">
                
                <!-- Clínica Médica -->
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
                        :style="{ backgroundColor: getSpecialtyColor(station) + getBackgroundOpacity() }"
                        @click="startSimulationAsActor(station.id)"
                      >
                        <template #prepend>
                          <v-icon color="info">ri-file-list-3-line</v-icon>
                        </template>
                        <v-list-item-title class="font-weight-bold text-body-1">{{ getCleanStationTitle(station.tituloEstacao) }}</v-list-item-title>
                        <!-- Especialidade oculta nas subseções do REVALIDA FÁCIL -->
                        <!-- <v-list-item-subtitle class="text-caption text-secondary">{{ station.especialidade }}</v-list-item-subtitle> -->
                        
                        <!-- Indicadores de Status de Edição DETALHADOS -->
                        <div class="d-flex flex-column gap-1 mt-2">
                          <!-- Status principal -->
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
                          
                          <!-- Informações detalhadas - Data de criação -->
                          <div v-if="verificarEdicaoHibrida(station).createdDate" class="text-caption text-secondary">
                            <v-icon size="12" class="me-1">ri-calendar-line</v-icon>
                            Criada: {{ formatarDataBrasil(verificarEdicaoHibrida(station).createdDate) }}

                          </div>
                          
                          <!-- Informações detalhadas - Última edição -->
                          <div v-if="verificarEdicaoHibrida(station).lastEditDate && verificarEdicaoHibrida(station).hasBeenEdited" class="text-caption text-secondary">
                            <v-icon size="12" class="me-1">ri-edit-line</v-icon>
                            Editada: {{ formatarDataBrasil(verificarEdicaoHibrida(station).lastEditDate) }}

                          </div>
                        </div>
                        
                        <!-- Pontuação do usuário -->
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
                              class="me-2"
                            />
                            <v-btn
                              v-if="isAdmin"
                              color="secondary"
                              variant="text"
                              size="small"
                              icon="ri-pencil-line"
                              @click.stop="goToEditStation(station.id)"
                              class="me-2"
                              aria-label="Editar Estação"
                            />
                          </div>
                        </template>
                      </v-list-item>
                    </v-list>
                  </v-expansion-panel-text>
                </v-expansion-panel>

                <!-- Cirurgia -->
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
                        :style="{ backgroundColor: getSpecialtyColor(station) + getBackgroundOpacity() }"
                        @click="startSimulationAsActor(station.id)"
                      >
                        <template #prepend>
                          <v-icon color="info">ri-file-list-3-line</v-icon>
                        </template>
                        <v-list-item-title class="font-weight-bold text-body-1">{{ getCleanStationTitle(station.tituloEstacao) }}</v-list-item-title>
                        <!-- Especialidade oculta nas subseções do REVALIDA FÁCIL -->
                        <!-- <v-list-item-subtitle class="text-caption text-secondary">{{ station.especialidade }}</v-list-item-subtitle> -->
                        
                        <!-- Indicadores de Status de Edição DETALHADOS -->
                        <div class="d-flex flex-column gap-1 mt-2">
                          <!-- Status principal -->
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
                          
                          <!-- Informações detalhadas - Data de criação -->
                          <div v-if="verificarEdicaoHibrida(station).createdDate" class="text-caption text-secondary">
                            <v-icon size="12" class="me-1">ri-calendar-line</v-icon>
                            Criada: {{ formatarDataBrasil(verificarEdicaoHibrida(station).createdDate) }}

                          </div>
                          
                          <!-- Informações detalhadas - Última edição -->
                          <div v-if="verificarEdicaoHibrida(station).lastEditDate && verificarEdicaoHibrida(station).hasBeenEdited" class="text-caption text-secondary">
                            <v-icon size="12" class="me-1">ri-edit-line</v-icon>
                            Editada: {{ formatarDataBrasil(verificarEdicaoHibrida(station).lastEditDate) }}

                          </div>
                        </div>
                        
                        <!-- Pontuação do usuário -->
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
                              class="me-2"
                            />
                            <v-btn
                              v-if="isAdmin"
                              color="secondary"
                              variant="text"
                              size="small"
                              icon="ri-pencil-line"
                              @click.stop="goToEditStation(station.id)"
                              class="me-2"
                              aria-label="Editar Estação"
                            />
                          </div>
                        </template>
                      </v-list-item>
                    </v-list>
                  </v-expansion-panel-text>
                </v-expansion-panel>

                <!-- Ginecologia e Obstetrícia -->
                <v-expansion-panel v-if="filteredStationsRevalidaFacilGO.length > 0">
                  <v-expansion-panel-title class="text-subtitle-1 font-weight-medium">
                    <template #default="{ expanded }">
                      <v-row no-gutters align="center">
                        <v-col cols="auto">
                          <v-icon class="me-2" color="error">ri-women-line</v-icon>
                        </v-col>
                        <v-col>
                          G.O
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
                        :style="{ backgroundColor: getSpecialtyColor(station) + getBackgroundOpacity() }"
                        @click="startSimulationAsActor(station.id)"
                      >
                        <template #prepend>
                          <v-icon color="info">ri-file-list-3-line</v-icon>
                        </template>
                        <v-list-item-title class="font-weight-bold text-body-1">{{ getCleanStationTitle(station.tituloEstacao) }}</v-list-item-title>
                        <!-- Especialidade oculta nas subseções do REVALIDA FÁCIL -->
                        <!-- <v-list-item-subtitle class="text-caption text-secondary">{{ station.especialidade }}</v-list-item-subtitle> -->
                        
                        <!-- Indicadores de Status de Edição DETALHADOS -->
                        <div class="d-flex flex-column gap-1 mt-2">
                          <!-- Status principal -->
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
                          
                          <!-- Informações detalhadas - Data de criação -->
                          <div v-if="verificarEdicaoHibrida(station).createdDate" class="text-caption text-secondary">
                            <v-icon size="12" class="me-1">ri-calendar-line</v-icon>
                            Criada: {{ formatarDataBrasil(verificarEdicaoHibrida(station).createdDate) }}

                          </div>
                          
                          <!-- Informações detalhadas - Última edição -->
                          <div v-if="verificarEdicaoHibrida(station).lastEditDate && verificarEdicaoHibrida(station).hasBeenEdited" class="text-caption text-secondary">
                            <v-icon size="12" class="me-1">ri-edit-line</v-icon>
                            Editada: {{ formatarDataBrasil(verificarEdicaoHibrida(station).lastEditDate) }}

                          </div>
                        </div>
                        
                        <!-- Pontuação do usuário -->
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
                              class="me-2"
                            />
                            <v-btn
                              v-if="isAdmin"
                              color="secondary"
                              variant="text"
                              size="small"
                              icon="ri-pencil-line"
                              @click.stop="goToEditStation(station.id)"
                              class="me-2"
                              aria-label="Editar Estação"
                            />
                          </div>
                        </template>
                      </v-list-item>
                    </v-list>
                  </v-expansion-panel-text>
                </v-expansion-panel>

                <!-- Pediatria -->
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
                        :style="{ backgroundColor: getSpecialtyColor(station) + getBackgroundOpacity() }"
                        @click="startSimulationAsActor(station.id)"
                      >
                        <template #prepend>
                          <v-icon color="info">ri-file-list-3-line</v-icon>
                        </template>
                        <v-list-item-title class="font-weight-bold text-body-1">{{ getCleanStationTitle(station.tituloEstacao) }}</v-list-item-title>
                        <!-- Especialidade oculta nas subseções do REVALIDA FÁCIL -->
                        <!-- <v-list-item-subtitle class="text-caption text-secondary">{{ station.especialidade }}</v-list-item-subtitle> -->
                        
                        <!-- Indicadores de Status de Edição DETALHADOS -->
                        <div class="d-flex flex-column gap-1 mt-2">
                          <!-- Status principal -->
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
                          
                          <!-- Informações detalhadas - Data de criação -->
                          <div v-if="verificarEdicaoHibrida(station).createdDate" class="text-caption text-secondary">
                            <v-icon size="12" class="me-1">ri-calendar-line</v-icon>
                            Criada: {{ formatarDataBrasil(verificarEdicaoHibrida(station).createdDate) }}

                          </div>
                          
                          <!-- Informações detalhadas - Última edição -->
                          <div v-if="verificarEdicaoHibrida(station).lastEditDate && verificarEdicaoHibrida(station).hasBeenEdited" class="text-caption text-secondary">
                            <v-icon size="12" class="me-1">ri-edit-line</v-icon>
                            Editada: {{ formatarDataBrasil(verificarEdicaoHibrida(station).lastEditDate) }}

                          </div>
                        </div>
                        
                        <!-- Pontuação do usuário -->
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
                              class="me-2"
                            />
                            <v-btn
                              v-if="isAdmin"
                              color="secondary"
                              variant="text"
                              size="small"
                              icon="ri-pencil-line"
                              @click.stop="goToEditStation(station.id)"
                              class="me-2"
                              aria-label="Editar Estação"
                            />
                          </div>
                        </template>
                      </v-list-item>
                    </v-list>
                  </v-expansion-panel-text>
                </v-expansion-panel>

                <!-- Medicina Preventiva -->
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
                        :style="{ backgroundColor: getSpecialtyColor(station) + getBackgroundOpacity() }"
                        @click="startSimulationAsActor(station.id)"
                      >
                        <template #prepend>
                          <v-icon color="info">ri-file-list-3-line</v-icon>
                        </template>
                        <v-list-item-title class="font-weight-bold text-body-1">{{ getCleanStationTitle(station.tituloEstacao) }}</v-list-item-title>
                        <!-- Especialidade oculta nas subseções do REVALIDA FÁCIL -->
                        <!-- <v-list-item-subtitle class="text-caption text-secondary">{{ station.especialidade }}</v-list-item-subtitle> -->
                        
                        <!-- Indicadores de Status de Edição DETALHADOS -->
                        <div class="d-flex flex-column gap-1 mt-2">
                          <!-- Status principal -->
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
                          
                          <!-- Informações detalhadas - Data de criação -->
                          <div v-if="verificarEdicaoHibrida(station).createdDate" class="text-caption text-secondary">
                            <v-icon size="12" class="me-1">ri-calendar-line</v-icon>
                            Criada: {{ formatarDataBrasil(verificarEdicaoHibrida(station).createdDate) }}

                          </div>
                          
                          <!-- Informações detalhadas - Última edição -->
                          <div v-if="verificarEdicaoHibrida(station).lastEditDate && verificarEdicaoHibrida(station).hasBeenEdited" class="text-caption text-secondary">
                            <v-icon size="12" class="me-1">ri-edit-line</v-icon>
                            Editada: {{ formatarDataBrasil(verificarEdicaoHibrida(station).lastEditDate) }}

                          </div>
                        </div>
                        
                        <!-- Pontuação do usuário -->
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
                              class="me-2"
                            />
                            <v-btn
                              v-if="isAdmin"
                              color="secondary"
                              variant="text"
                              size="small"
                              icon="ri-pencil-line"
                              @click.stop="goToEditStation(station.id)"
                              class="me-2"
                              aria-label="Editar Estação"
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
.station-list-item {
  transition: background-color 0.2s ease-in-out;
}

.station-list-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.clickable-card {
  cursor: pointer;
}

/* Chip de aviso de edição */
.edit-warning-chip {
  margin-top: 4px;
  font-size: 0.7rem !important;
  height: 20px !important;
}

/* Estilos para os Expansion Panels */
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

/* Sub-accordions (especialidades) */
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

/* Transições suaves */
.v-expansion-panel-title,
.v-expansion-panel-text {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Cards responsivos */
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

/* Badge customizations */
.v-badge {
  font-weight: 600;
}

/* Lista de estações */
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

/* Temas dark/light compatibility */
.v-theme--dark .v-expansion-panels {
  background: rgba(var(--v-theme-surface), 0.9);
}

.v-theme--light .v-expansion-panels {
  background: rgba(var(--v-theme-surface), 1);
}

/* Admin Upload Card */
.v-card.v-theme--light[variant="tonal"] {
  background: rgba(var(--v-theme-error), 0.08) !important;
}

.v-card.v-theme--dark[variant="tonal"] {
  background: rgba(var(--v-theme-error), 0.12) !important;
}

/* Admin button hover effect */
.v-btn[color="error"]:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(var(--v-theme-error), 0.3);
}

.station-item:hover .station-title,
.station-item:hover .station-specialty {
  color: #4a4a4a !important; /* Garante que o texto fique escuro no hover */
}

/* Admin button hover effect */
.admin-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(var(--v-theme-error), 0.3);
}

/* Estilos para indicadores de status de edição */
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

/* Chips responsivos */
@media (max-width: 768px) {
  .edit-status-chip,
  .date-chip {
    display: none;
  }
}

/* User score chip */
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

/* Candidate search suggestions */
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
</style>
