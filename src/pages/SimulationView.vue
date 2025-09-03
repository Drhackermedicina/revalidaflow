<script setup>
// Aceitar props para evitar warnings do Vue Router
defineProps({
  id: String
})

// Imports
/* AgentAssistant legacy component import removed during agent cleanup */
import { useSimulationSocket } from '@/composables/useSimulationSocket.ts';
import { useSimulationInvites } from '@/composables/useSimulationInvites.js';
import { currentUser } from '@/plugins/auth.js';
import { db } from '@/plugins/firebase.js';
import { registrarConclusaoEstacao } from '@/services/stationEvaluationService.js';
import { backendUrl } from '@/utils/backendUrl.js';
import {
  formatActorText,
  formatIdentificacaoPaciente,
  formatItemDescriptionForDisplay,
  formatTime,
  getEvaluationColor,
  getEvaluationLabel,
  getInfrastructureColor,
  getInfrastructureIcon,
  processInfrastructureItems,
  splitIntoParagraphs
} from '@/utils/simulationUtils.ts';
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { io } from 'socket.io-client';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTheme } from 'vuetify';

// Configuração do tema
const theme = useTheme();
const isDarkTheme = computed(() => theme.global.name.value === 'dark');

// Configuração do editor removida - TinyMCE não essencial

// Função para processar linhas do roteiro
const processRoteiro = computed(() => {
  return (text) => {
    if (!text) return '';
    return formatActorText(text);
  }
});

// Função para processar roteiro especificamente para ator (removendo aspas simples)
const processRoteiroActor = computed(() => {
  return (text) => {
    if (!text) return '';
    if (isActorOrEvaluator.value) {
      return formatActorText(text);
    }
    return formatActorText(text);
  }
});

// Função para formatar texto do roteiro do ator

// Função específica para formatar identificação do paciente

// Adiciona função para edição
function editStationData(field, value) {
  if (stationData.value) {
    stationData.value[field] = value;  // Atualiza o campo
    // Reaplica formatação se necessário
    if (field === 'descricaoCasoCompleta' || field.includes('informacoesVerbaisSimulado')) {
      stationData.value[field] = formatActorText(value);  // Mantém formatação
    }
  }
}

// Refs para dados da estação e checklist
const stationData = ref(null);
const checklistData = ref(null);
// Refs para controle de UI e estado
const isLoading = ref(true);
const errorMessage = ref('');
// Socket removido - dependência não essencial
let socket = ref(null);
let connectionStatus = ref('');
let connect = () => {};
let disconnect = () => {};

// Refs para dados da simulação
const releasedData = ref({});
const evaluationScores = ref({});
const isChecklistVisibleForCandidate = ref(false);
const pepReleasedToCandidate = ref(false);

const actorVisibleImpressoContent = ref({});
const candidateReceivedScores = ref({});
const candidateReceivedTotalScore = ref(0);
const actorReleasedImpressoIds = ref({});

// Refs para controlar carregamento de imagens
const imageLoadAttempts = ref({});
const imageLoadSources = ref({});
const imagesPreloadStatus = ref({}); // NOVO: Track do status de cada imagem
const allImagesPreloaded = ref(false); // NOVO: Flag global de pré-carregamento completo

// Refs para controle de zoom de imagens
const imageZoomDialog = ref(false);
const selectedImageForZoom = ref('');
const selectedImageAlt = ref('');

// Refs para controlar itens marcados do roteiro
const markedScriptContexts = ref({});
const markedScriptSentences = ref({});

// Refs para armazenar marcações
const markedParagraphs = ref({});

// Variável para controlar o debounce dos cliques
const lastClickTime = ref({});

// Função para separar texto em sentenças

// Refs para informações do parceiro e da sessão
const partner = ref(null);
const route = useRoute();
const router = useRouter();

const stationId = ref(null);
const sessionId = ref(null);
const userRole = ref(null);

// Propriedades computadas para papéis
const isActorOrEvaluator = computed(() => userRole.value === 'actor' || userRole.value === 'evaluator');
const isCandidate = computed(() => userRole.value === 'candidate');

const inviteLinkToShow = ref('');
const copySuccess = ref(false);

// Candidato selecionado para simulação
const selectedCandidateForSimulation = ref(null);

// Chat integration refs
const sendingChat = ref(false);
const chatSentSuccess = ref(false);

const isAdmin = computed(() => {
  return currentUser.value && (
    currentUser.value.uid === 'KiSITAxXMAY5uU3bOPW5JMQPent2' ||
    currentUser.value.uid === 'RtfNENOqMUdw7pvgeeaBVSuin662' ||
    currentUser.value.uid === 'UD7S8aiyR8TJXHyxdw29BHNfjEf1' ||
    currentUser.value.uid === 'lNwhdYgMwLhS1ZyufRzw9xLD10y1'
  );
});

// Função para abrir a página de edição em uma nova aba
function openEditPage() {
  if (stationId.value) {
    const routeData = router.resolve({
      path: `/app/edit-station/${stationId.value}`,
    });
    window.open(routeData.href, '_blank');
  }
}

// Refs para estado de prontidão e controle da simulação
const myReadyState = ref(false);
const partnerReadyState = ref(false);
const simulationStarted = ref(false);
const simulationEnded = ref(false);
const simulationWasManuallyEndedEarly = ref(false);
// Ref para controlar delay do botão "Estou pronto" do candidato
const candidateReadyButtonEnabled = ref(false);
// Refs para o timer e seleção de duração
const simulationTimeSeconds = ref(10 * 60);
const timerDisplay = ref(formatTime(simulationTimeSeconds.value));
const selectedDurationMinutes = ref(10);

// --- Função Helper para Formatar Tempo ---

// --- Função para Tocar Som (Início/Fim) ---
function playSoundEffect() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (!audioContext) { console.warn("Web Audio API não suportada."); return; }
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(1200, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.25, audioContext.currentTime);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
    setTimeout(() => { if (audioContext.state !== 'closed') { audioContext.close(); } }, 700);
  } catch (e) { console.warn("Não foi possível tocar o som:", e);
  }
}



// --- NOVO: Função para Formatar a Descrição do Item do PEP para Exibição ---

// REMOVIDO: A computed property `parsedDescriptions` e a função `parseItemDescription` original
// foram removidas pois não são mais necessárias para o formato de exibição desejado.


// --- Função para Buscar Dados da Estação e Checklist ---
async function fetchSimulationData(currentStationId) {
  if (!currentStationId) { errorMessage.value = 'ID da estação inválido.';
    isLoading.value = false; return; }
  isLoading.value = true; errorMessage.value = '';
  try {
    const stationDocRef = doc(db, 'estacoes_clinicas', currentStationId);
    const stationSnap = await getDoc(stationDocRef);
    if (!stationSnap.exists()) { throw new Error(`Estação ${currentStationId} não encontrada.`); }
    stationData.value = { id: stationSnap.id, ...stationSnap.data() };

    const durationFromQuery = route.query.duration ? parseInt(route.query.duration) : null;
    const validOptions = [5, 6, 7, 8, 9, 10];

    if (!durationFromQuery || !validOptions.includes(durationFromQuery)) {
      const stationDefaultMinutes = stationData.value?.tempoDuracaoMinutos;
      if (stationDefaultMinutes && validOptions.includes(stationDefaultMinutes)) {
        selectedDurationMinutes.value = stationDefaultMinutes;
      } else {
        if (!validOptions.includes(selectedDurationMinutes.value)) {
          selectedDurationMinutes.value = 10;
        }
      }
    }
    simulationTimeSeconds.value = selectedDurationMinutes.value * 60;
    timerDisplay.value = formatTime(simulationTimeSeconds.value);

    if (stationData.value?.padraoEsperadoProcedimento) {
      checklistData.value = stationData.value.padraoEsperadoProcedimento;
      
      // Verifica feedbackEstacao em diferentes locais (estação raiz ou dentro do PEP)
      if (stationData.value.feedbackEstacao && !checklistData.value.feedbackEstacao) {
        checklistData.value.feedbackEstacao = stationData.value.feedbackEstacao;
      }
      
      if (!checklistData.value.itensAvaliacao || !Array.isArray(checklistData.value.itensAvaliacao) || checklistData.value.itensAvaliacao.length === 0) {
        console.warn("FETCH: PEP não contém 'itensAvaliacao' válidos.");
      }
    } else {
      console.warn(`FETCH: 'padraoEsperadoProcedimento' não encontrado na estação. PEP (checklistData) será nulo.`);
      checklistData.value = null;
    }
    
    // Pré-carrega imagens dos impressos após carregar dados com sucesso
    // SILENCIOSO: Removido logs de fetch - apenas executa
    // // console.log('[FETCH] ✅ CORREÇÃO - Dados carregados, iniciando pré-carregamento para eliminação de delay');
    // Adiciona um pequeno delay para garantir que os dados estão totalmente processados
    setTimeout(() => {
      // // console.log('[FETCH] ✅ CORREÇÃO - Executando preloadImpressoImages após delay');
      preloadImpressoImages();
    }, 100);
    
  } catch (error) { console.error("FETCH: Erro ao buscar dados:", error);
    errorMessage.value = `Falha ao carregar dados da estação: ${error.message}`; stationData.value = null;
    checklistData.value = null;}
  finally {
    isLoading.value = false; // console.log("FETCH: Finalizado. isLoading:", isLoading.value, "stationData:", !!stationData.value, "checklistData:", !!checklistData.value);
    if (stationData.value && !errorMessage.value && sessionId.value && userRole.value && stationId.value && currentUser.value?.uid) {
      if (!socket.value || !socket.value.connected) { connectWebSocket();
      }
    } else { console.warn("FETCH: Dados faltando para conectar ao WebSocket ou erro no fetch.");
    }
  }
}

// --- Função para limpar candidato selecionado ---
function clearSelectedCandidate() {
  try {
    sessionStorage.removeItem('selectedCandidate');
  } catch (error) {
    console.warn('Erro ao limpar candidato selecionado:', error);
  }
}

// --- Função para enviar link via chat privado ---
async function sendLinkViaPrivateChat() {
  if (!selectedCandidateForSimulation.value || !inviteLinkToShow.value) {
    loadSelectedCandidate();
    
    if (!selectedCandidateForSimulation.value) {
      alert('❌ ERRO: Nenhum candidato selecionado! Por favor, volte à lista de estações e selecione um candidato antes de iniciar a simulação.');
      return;
    }
    
    if (!inviteLinkToShow.value) {
      alert('❌ ERRO: Link de convite não gerado! Clique em "Gerar Link" primeiro.');
      return;
    }
  }

  sendingChat.value = true;
  chatSentSuccess.value = false;

  try {
    const { sendSimulationInvite } = useSimulationInvites();
    
    const result = await sendSimulationInvite({
      candidateUid: selectedCandidateForSimulation.value.uid,
      candidateName: selectedCandidateForSimulation.value.name,
      inviteLink: inviteLinkToShow.value,
      stationTitle: stationData.value?.tituloEstacao || 'Estação',
      duration: selectedDurationMinutes.value || 10,
      meetLink: communicationMethod.value === 'meet' ? meetLink.value?.trim() : null,
      senderName: currentUser.value?.displayName || 'Avaliador',
      senderUid: currentUser.value?.uid
    });
    
    if (result.success) {
      chatSentSuccess.value = true;
      setTimeout(() => {
        chatSentSuccess.value = false;
      }, 3000);
    } else {
      throw new Error(result.error?.message || 'Falha ao enviar convite');
    }
    
  } catch (error) {
    console.error('Erro ao enviar convite:', error);
  } finally {
    sendingChat.value = false;
  }
}

// --- Lógica do WebSocket ---
function connectWebSocket() {
  if (!sessionId.value || !userRole.value || !stationId.value || !currentUser.value?.uid) { console.error("SOCKET: Dados essenciais faltando para conexão.");
    return; }
  // const backendUrl = 'http://localhost:3000'; // Removido, agora usa import
  // console.log('SimulationView: backendUrl sendo usada para Socket.IO:', backendUrl); // NOVO LOG
  connectionStatus.value = 'Conectando';
  if (socket.value && socket.value.connected) { socket.value.disconnect(); }
  socket.value = io(backendUrl, {
    transports: ['websocket'],
    query: {
      sessionId: sessionId.value,
      userId: currentUser.value?.uid,
      role: userRole.value,
      stationId: stationId.value,
      displayName: currentUser.value?.displayName
    }
  });
  socket.value.on('connect', () => {
    connectionStatus.value = 'Conectado';
    
    // Delay de 1 segundo para habilitar o botão "Estou pronto" do candidato
    if (userRole.value === 'candidate') {
      candidateReadyButtonEnabled.value = false;
      setTimeout(() => {
        candidateReadyButtonEnabled.value = true;
      }, 1000);
    }
  });
  socket.value.on('disconnect', (reason) => {
    connectionStatus.value = 'Desconectado';
    
    // Desabilitar o botão do candidato na desconexão
    if (userRole.value === 'candidate') {
      candidateReadyButtonEnabled.value = false;
    }
    
    const wasPartnerConnected = !!partner.value;
    partner.value = null;

    const isCandidateReviewing = userRole.value === 'candidate' && stationData.value && simulationStarted.value;

    if (!isCandidateReviewing) {
      myReadyState.value = false;
      partnerReadyState.value = false;
      if (!simulationStarted.value) {
        timerDisplay.value = formatTime(selectedDurationMinutes.value * 60);
      }
    }

    if (isCandidateReviewing) {
      if (!errorMessage.value && reason !== 'io client disconnect' && reason !== 'io client disconnect forced close by client') {
        errorMessage.value = "Conexão perdida. Você pode continuar revisando os dados da estação.";
      }
    } else {
      if (!errorMessage.value && reason !== 'io client disconnect' && reason !== 'io client disconnect forced close by client') {
        errorMessage.value = "Conexão com o servidor de simulação perdida.";
      }
    }
  });
  socket.value.on('connect_error', (err) => { connectionStatus.value = 'Erro de Conexão'; if(!errorMessage.value) errorMessage.value = `Falha ao conectar: ${err.message}`; console.error('SOCKET: Erro de conexão', err);});
  socket.value.on('SERVER_ERROR', (data) => { console.error('SOCKET: Erro do Servidor:', data.message); errorMessage.value = `Erro do servidor: ${data.message}`; });
  socket.value.on('SERVER_JOIN_CONFIRMED', (data) => { });
  socket.value.on('SERVER_PARTNER_JOINED', (participantInfo) => { if (participantInfo && participantInfo.userId !== currentUser.value?.uid) { partner.value = participantInfo; partnerReadyState.value = participantInfo.isReady || false; errorMessage.value = ''; } });
  socket.value.on('SERVER_EXISTING_PARTNERS', (participantsList) => { updatePartnerInfo(participantsList); });
  function updatePartnerInfo(participants) { const currentUserId = currentUser.value?.uid;
  if (participants && Array.isArray(participants) && currentUserId) { const otherParticipant = participants.find(p => p.userId !== currentUserId); if(otherParticipant) { partner.value = otherParticipant;
  partnerReadyState.value = partner.value.isReady || false; errorMessage.value = ''; } else { partner.value = null;
  partnerReadyState.value = false;} } else { partner.value = null; partnerReadyState.value = false;} }

  socket.value.on('SERVER_PARTNER_LEFT', (data) => {
    if (partner.value && partner.value.userId === data.userId) {
      partner.value = null;
      partnerReadyState.value = false;

      const isCandidateReviewing = userRole.value === 'candidate' && stationData.value && simulationStarted.value;

      if (!isCandidateReviewing) {
        myReadyState.value = false;
      }

      if (isCandidateReviewing) {
        if (!errorMessage.value) {
            errorMessage.value = "O parceiro desconectou. Você pode continuar revisando os dados da estação.";
        }
      } else {
        if (!errorMessage.value) {
          errorMessage.value = "Simulação interrompida: o parceiro desconectou.";
        }
      }
    }
  });
  socket.value.on('CANDIDATE_RECEIVE_DATA', (payload) => { const { dataItemId } = payload; if (userRole.value === 'candidate' && stationData.value?.materiaisDisponiveis?.impressos) { const impressoParaLiberar = stationData.value.materiaisDisponiveis.impressos.find(item => item.idImpresso === dataItemId); if (impressoParaLiberar) { releasedData.value[dataItemId] = { ...impressoParaLiberar }; releasedData.value = {...releasedData.value}; } } });
  socket.value.on('SERVER_PARTNER_READY', (data) => { if (data && data.userId !== currentUser.value?.uid) { if (partner.value && partner.value.userId === data.userId) { partner.value.isReady = data.isReady; } partnerReadyState.value = data.isReady; } });
  socket.value.on('SERVER_START_SIMULATION', (data) => {
    if (data && typeof data.durationSeconds === 'number') {
        simulationTimeSeconds.value = data.durationSeconds;
        timerDisplay.value = formatTime(data.durationSeconds);
    } else {
        console.warn('[CLIENT] SERVER_START_SIMULATION não continha durationSeconds. Timer pode estar dessincronizado com o cliente inicial.');
        timerDisplay.value = formatTime(simulationTimeSeconds.value);
    }
    simulationStarted.value = true;
    simulationEnded.value = false;
    simulationWasManuallyEndedEarly.value = false;
    errorMessage.value = '';
    playSoundEffect();
  });
  socket.value.on('TIMER_UPDATE', (data) => {
    if (typeof data.remainingSeconds === 'number') {
      timerDisplay.value = formatTime(data.remainingSeconds);
      if (data.remainingSeconds <= 0 && !simulationEnded.value) {
        simulationEnded.value = true;
      }
    }
  });
  socket.value.on('TIMER_END', () => {
    timerDisplay.value = "00:00";
    if (!simulationEnded.value) {
      playSoundEffect(); // Som do final da estação
      simulationEnded.value = true; // Marca como encerrada ANTES para evitar som duplicado
    }
    simulationWasManuallyEndedEarly.value = false; // Garante que é false se terminou por tempo
    
    // Limpar candidato selecionado quando simulação termina
    clearSelectedCandidate();
    
    // Notificação para o candidato
    if (userRole.value === 'candidate') {
      showNotification('Tempo finalizado! Aguardando avaliação do examinador...', 'info');
    }
  });
  socket.value.on('TIMER_STOPPED', (data) => {
    const previousTimerDisplay = timerDisplay.value;

    if (!simulationEnded.value) {
        playSoundEffect(); // Som do final da estação
        simulationEnded.value = true; // Marca como encerrada ANTES para evitar som duplicado
    }

    // Limpar candidato selecionado quando simulação para
    clearSelectedCandidate();

    // A lógica para `simulationWasManuallyEndedEarly` permanece aqui,
    // pois ela é usada para desabilitar a 'Submissão de Avaliação'.
    if (data?.reason === 'manual_end') { // Verificando se a razão é 'manual_end'
      simulationWasManuallyEndedEarly.value = true;
    } else {
      simulationWasManuallyEndedEarly.value = false; // Garante que é false para outras razões
    }


    if (data?.reason === 'participante desconectou' && !errorMessage.value) {
      errorMessage.value = "Simulação interrompida: parceiro desconectou.";
    } else if (data?.reason === 'manual_end' && !errorMessage.value && simulationWasManuallyEndedEarly.value) { // Esta condição será TRUE se for 'manual_end'
      errorMessage.value = "Simulação encerrada manually pelo ator/avaliador antes do tempo.";
    } else if (data?.reason === 'tempo esgotado' && !errorMessage.value) { // Adicionado para clarity
      errorMessage.value = "Simulação encerrada: tempo esgotado.";
    } else if (!errorMessage.value) {
      errorMessage.value = "Simulação encerrada.";
    // Fallback para outras razões ou manual_end que já não era antes
    }
  });
  socket.value.on('CANDIDATE_RECEIVE_PEP_VISIBILITY', (payload) => {
    if (userRole.value === 'candidate' && payload && typeof payload.shouldBeVisible === 'boolean') {
      isChecklistVisibleForCandidate.value = payload.shouldBeVisible;
      
      // Notificar o candidato quando o PEP é liberado
      if (payload.shouldBeVisible) {
        showNotification('O PEP (checklist de avaliação) foi liberado pelo examinador!', 'success');
      }
    }
  });
  socket.value.on('CANDIDATE_RECEIVE_UPDATED_SCORES', (data) => {
    if (userRole.value === 'candidate' && data && data.scores) {
      // Converte para number e atualiza scores do candidato
      const numericScores = {};
      Object.keys(data.scores).forEach(key => {
        numericScores[key] = typeof data.scores[key] === 'string'
          ? parseFloat(data.scores[key])
          : data.scores[key];
      });
      
      // Atualiza os scores recebidos pelo candidato
      candidateReceivedScores.value = { ...numericScores };
      
      // Também atualiza os scores principais para sincronização
      Object.keys(numericScores).forEach(key => {
        if (evaluationScores.value.hasOwnProperty(key)) {
          evaluationScores.value[key] = numericScores[key];
        }
      });
      
      if (typeof data.totalScore === 'number') {
        candidateReceivedTotalScore.value = data.totalScore;
        totalScore.value = data.totalScore;
      }
    }
  });
  socket.value.on('SERVER_BOTH_PARTICIPANTS_READY', () => {
    myReadyState.value = true;
    partnerReadyState.value = true;
    // Se partner.value estiver vazio, tenta preencher com papel oposto
    if (!partner.value) {
      partner.value = { role: userRole.value === 'actor' ? 'candidate' : 'actor', isReady: true };
    } else {
      partner.value.isReady = true;
    }
    errorMessage.value = '';
  });

  // Listener específico para sincronização de scores para candidatos
  socket.value.on('EVALUATOR_SCORES_UPDATED_FOR_CANDIDATE', (data) => {
    if (userRole.value === 'candidate' && data.sessionId === sessionId.value) {
      
      // Atualiza os scores locais do candidato
      Object.keys(data.scores).forEach(key => {
        if (evaluationScores.value.hasOwnProperty(key)) {
          evaluationScores.value[key] = data.scores[key];
        }
      });
      
      // Força atualização da interface se necessário
      if (data.forceSync) {
        // Força reatividade
        evaluationScores.value = { ...evaluationScores.value };
        
        nextTick(() => {
          // Força reatividade dos scores
          const newScores = { ...evaluationScores.value };
          evaluationScores.value = newScores;
        });
      }
    }
  });

  // Listener para convites internos de simulação
  socket.value.on('INTERNAL_INVITE_RECEIVED', handleInternalInviteReceived);
}

// --- Função para carregar candidato selecionado ---
function loadSelectedCandidate() {
  try {
    const storedData = sessionStorage.getItem('selectedCandidate');
    const candidateData = JSON.parse(storedData || '{}');
    
    if (candidateData.uid) {
      selectedCandidateForSimulation.value = candidateData;
    } else {
      selectedCandidateForSimulation.value = null;
    }
  } catch (error) {
    console.error('Erro ao carregar candidato selecionado:', error);
    selectedCandidateForSimulation.value = null;
  }
}

// Refs para controlar execução múltipla
const isSettingUpSession = ref(false);

// --- Função Setup Session ---
function setupSession() {
  // CORREÇÃO: Previne execuções múltiplas simultâneas
  if (isSettingUpSession.value) {
    // console.log("SETUP_SESSION: ⚠️ Já está em execução, ignorando chamada duplicada");
    return;
  }
  
  isSettingUpSession.value = true;
  
  errorMessage.value = '';
  isLoading.value = true;
  if (socket.value && socket.value.connected) { socket.value.disconnect(); }
  socket.value = null;
  stationData.value = null;
  checklistData.value = null;
  stationId.value = route.params.id;
  sessionId.value = route.query.sessionId; // CORREÇÃO: de route.query.session para route.query.sessionId
  userRole.value = route.query.role;

  inviteLinkToShow.value = '';

  myReadyState.value = false;
  partnerReadyState.value = false;
  simulationStarted.value = false;
  simulationEnded.value = false;
  simulationWasManuallyEndedEarly.value = false;
  partner.value = null;
  releasedData.value = {};
  evaluationScores.value = {};
  isChecklistVisibleForCandidate.value = false;
  pepReleasedToCandidate.value = false;
  actorVisibleImpressoContent.value = {};
  candidateReceivedScores.value = {};
  candidateReceivedTotalScore.value = 0;
  actorReleasedImpressoIds.value = {};

  // Limpa cache de imagens ao reiniciar sessão
  clearImageCache();

  // Carregar candidato selecionado se for ator/avaliador
  if (userRole.value === 'actor' || userRole.value === 'evaluator') {
    loadSelectedCandidate();
  }

  const durationFromQuery = route.query.duration ? parseInt(route.query.duration) : null;
  const validOptions = [5, 6, 7, 8, 9, 10];
  if (durationFromQuery && validOptions.includes(durationFromQuery)) {
      selectedDurationMinutes.value = durationFromQuery;
  } else {
      selectedDurationMinutes.value = 10;
      if(durationFromQuery) console.warn(`Duração inválida (${durationFromQuery}) na URL, usando padrão ${selectedDurationMinutes.value} min.`);
  }
  timerDisplay.value = formatTime(simulationTimeSeconds.value * 60);
  if (!sessionId.value) {
    errorMessage.value = "Link inválido: ID Sessão não encontrado.";
    isLoading.value = false;
    isSettingUpSession.value = false;
    return;
  }
  if (!stationId.value) {
    errorMessage.value = "Link inválido: ID Estação não encontrado.";
    isLoading.value = false;
    isSettingUpSession.value = false;
    return;
  }
  if (!userRole.value || !['actor', 'candidate', 'evaluator'].includes(userRole.value)) {
    errorMessage.value = "Link inválido: Papel não definido/incorreto.";
    isLoading.value = false;
    isSettingUpSession.value = false;
    return;
  }

  // Inicializa o composable de socket APÓS os refs estarem definidos
  const socketApi = useSimulationSocket({
    backendUrl,
    sessionId: sessionId.value ?? '',
    userId: currentUser.value?.uid ?? '',
    role: userRole.value ?? '',
    stationId: stationId.value ?? '',
    displayName: currentUser.value?.displayName ?? '',
  });
  socket = socketApi.socket;
  connectionStatus = socketApi.connectionStatus;
  connect = socketApi.connect;
  disconnect = socketApi.disconnect;

  // Chama fetchSimulationData e libera o lock ao finalizar
  fetchSimulationData(stationId.value).finally(() => {
    isSettingUpSession.value = false;
  });
}

// --- Computed Property para Soma Automática das Notas ---
const totalScore = computed(() => {
  return Object.values(evaluationScores.value).reduce((sum, score) => {
    const numScore = parseFloat(score);
    return sum + (isNaN(numScore) ? 0 : numScore);
  }, 0);
});
// --- Computed Property e Watch para 'bothParticipantsReady' ---
const bothParticipantsReady = computed(() => myReadyState.value && partnerReadyState.value && !!partner.value);
watch(bothParticipantsReady, (newValue) => {
  if (newValue &&
      (userRole.value === 'actor' || userRole.value === 'evaluator') &&
      socket.value?.connected &&
      !simulationStarted.value &&
      !simulationEnded.value &&
      inviteLinkToShow.value // Garante que o link já foi gerado (simulando que a sessão foi iniciada no backend)
      ) {
    const durationToSend = selectedDurationMinutes.value;
    socket.value.emit('CLIENT_START_SIMULATION', {
      sessionId: sessionId.value,
      durationMinutes: durationToSend // Usando a variável durationToSend
    });
  } else if (newValue && userRole.value === 'candidate' && !simulationStarted.value) {
    // Logs removidos
  }
});
// --- Hooks Ciclo de Vida ---
// CORREÇÃO: Consolidando todos os onMounted em um único para evitar execução múltipla
onMounted(() => { 

  setupSession(); 
  
  // Verifica link do Meet para candidato
  checkCandidateMeetLink();
  
  // Inicializa o sidebar como fechado por padrão
  setTimeout(() => {
    const wrapper = document.querySelector('.layout-wrapper');
    if (wrapper && !wrapper.classList.contains('layout-vertical-nav-collapsed')) {
      wrapper.classList.add('layout-vertical-nav-collapsed');
    }
  }, 100);
  
  // Event listener para tecla ESC fechar modal de zoom
  const handleEscKey = (event) => {
    if (event.key === 'Escape' && imageZoomDialog.value) {
      closeImageZoom();
    }
  };
  document.addEventListener('keydown', handleEscKey);
  
  // Setup do listener de eventos para marcação
  const toggleMarkHandler = (e) => toggleMark(e.detail);
  document.addEventListener('toggleMark', toggleMarkHandler);
  
  // Cleanup no onUnmounted
  onUnmounted(() => {
    document.removeEventListener('keydown', handleEscKey);
    document.removeEventListener('toggleMark', toggleMarkHandler);
  });
});

watch(() => route.fullPath, (newPath, oldPath) => { if (newPath !== oldPath && route.name === 'SimulationView') { setupSession(); }});
onUnmounted(() => {
  disconnect();
  // Limpar candidato selecionado ao sair da simulação
  try {
    sessionStorage.removeItem('selectedCandidate');
  } catch (error) {
    console.warn('Erro ao limpar candidato selecionado:', error);
  }
});
function toggleActorImpressoVisibility(impressoId) {
  actorVisibleImpressoContent.value[impressoId] = !actorVisibleImpressoContent.value[impressoId];
  actorVisibleImpressoContent.value = {...actorVisibleImpressoContent.value};
}

function updateTimerDisplayFromSelection() {
  if (selectedDurationMinutes.value) {
    const newTimeInSeconds = parseInt(selectedDurationMinutes.value) * 60;
    if (!simulationStarted.value && !inviteLinkToShow.value) {
          if (simulationTimeSeconds.value !== newTimeInSeconds) {
            simulationTimeSeconds.value = newTimeInSeconds;
            timerDisplay.value = formatTime(simulationTimeSeconds.value);
          }
    } else if (simulationStarted.value) {
          console.warn("Não é possível alterar a duração após o início da simulação.");
    } else if (inviteLinkToShow.value) {
      // Se o link já foi gerado, a duração está "travada" com a duração do link.
      // Resetar o dropdown para o valor correto caso o usuário mude e tente iniciar de novo.
      // O `selectedDurationMinutes` deve ser o que foi usado para gerar o link (que é o que está no timerDisplay)
      const currentDurationInMinutes = Math.round(simulationTimeSeconds.value / 60);
      const validOptions = [5,6,7,8,9,10];
      if (selectedDurationMinutes.value !== currentDurationInMinutes && validOptions.includes(currentDurationInMinutes) ) {
          selectedDurationMinutes.value = currentDurationInMinutes;
      }
      console.warn("Duração travada após geração do link. Use o valor previamente selecionado.");
    }
  }
}

function generateInviteLinkWithDuration() {
  if (isLoading.value) {
    errorMessage.value = "Aguarde o carregamento dos dados da estação.";
    return;
  }
  if (!stationData.value) {
    errorMessage.value = "Dados da estação ainda não carregados. Tente novamente em instantes.";
    return;
  }
  if ((userRole.value === 'actor' || userRole.value === 'evaluator') && stationId.value && sessionId.value) {
    if (communicationMethod.value === 'meet') {
      if (!meetLink.value) {
        errorMessage.value = "Cole o link da sala do Google Meet antes de gerar o convite.";
        return;
      }
      // Validação simples do link do Meet
      const trimmedLink = meetLink.value.trim();
      if (!/^https:\/\/meet\.google\.com\//.test(trimmedLink)) {
        errorMessage.value = "O link do Meet deve começar com https://meet.google.com/";
        return;
      }
    }
    const partnerRoleToInvite = userRole.value === 'actor' ?
      'candidate' : (userRole.value === 'evaluator' ? 'actor' : null);
    if (partnerRoleToInvite) {
      try {
        const inviteQuery = {
          sessionId: sessionId.value,
          role: partnerRoleToInvite,
          duration: selectedDurationMinutes.value
        };
        
        // Adicionar dados do candidato selecionado se disponível
        const selectedCandidate = JSON.parse(sessionStorage.getItem('selectedCandidate') || '{}');
        if (selectedCandidate.uid) {
          inviteQuery.candidateUid = selectedCandidate.uid;
          inviteQuery.candidateName = selectedCandidate.name;
        }
        
        if (communicationMethod.value === 'meet') {
          inviteQuery.meet = meetLink.value.trim();
        }
        // Busca recursiva da rota protegida
        const routeDef = findRouteByName(router.options.routes, 'station-simulation');
        if (!routeDef) {
          errorMessage.value = "Rota 'station-simulation' não encontrada. Verifique a configuração do roteador.";
          return;
        }
        const inviteRoute = router.resolve({
          name: 'station-simulation',
          params: { id: stationId.value },
          query: inviteQuery
        });
        if (!inviteRoute || !inviteRoute.href) {
          errorMessage.value = "Falha ao resolver a rota de convite. Verifique as configurações.";
          return;
        }
        inviteLinkToShow.value = window.location.origin + inviteRoute.href;
        errorMessage.value = '';
      } catch (e) {
        errorMessage.value = `Erro ao gerar link de convite: ${e.message}`;
      }
    }
  } else {
    errorMessage.value = "Não foi possível gerar link de convite neste momento.";
  }
}

// --- CONTROLE DE LINK DO MEET PARA O CANDIDATO ---
const candidateMeetLink = ref('');
const candidateOpenedMeet = ref(false);

function checkCandidateMeetLink() {
  if (userRole.value === 'candidate' && route.query.meet && typeof route.query.meet === 'string') {
    candidateMeetLink.value = route.query.meet;
  } else {
    candidateMeetLink.value = '';
  }
  candidateOpenedMeet.value = false; // Sempre reinicia ao entrar
}

function openCandidateMeet() {
  if (candidateMeetLink.value) {
    window.open(candidateMeetLink.value, '_blank');
    candidateOpenedMeet.value = true;
  }
}

// CORREÇÃO: Removendo onMounted duplicado - já consolidado acima
// Atualiza ao montar e ao mudar rota - MOVIDO PARA O onMounted PRINCIPAL
// onMounted(() => {
//   // console.log("SimulationView Montado. Configurando sessão inicial...");
//   setupSession();
//   checkCandidateMeetLink();
//   
//   // Inicializa o sidebar como fechado por padrão
//   setTimeout(() => {
//     const wrapper = document.querySelector('.layout-wrapper');
//     if (wrapper && !wrapper.classList.contains('layout-vertical-nav-collapsed')) {
//       wrapper.classList.add('layout-vertical-nav-collapsed');
//     }
//   }, 100); // Pequeno delay para garantir que o DOM foi renderizado
// });
watch(() => route.fullPath, (newPath, oldPath) => {
  if (newPath !== oldPath && route.name === 'SimulationView') {
    // console.log("MUDANÇA DE ROTA (SimulationView fullPath):", newPath, "Reconfigurando sessão...");
    setupSession();
    checkCandidateMeetLink();
  }
});
// --- Funções de Interação ---
function releaseData(dataItemId) {
  // Lógica no frontend para verificar se o item já foi liberado, ou se a simulação terminou/começou
  // A validação final de estado (ativa/encerrada) é feita no backend
  if (!socket.value?.connected) { alert("Erro: Não conectado.");
    return; }
  if (userRole.value !== 'actor') { alert("Apenas o ator pode liberar dados."); return; }
  if (!sessionId.value) return;
  // A validação de `simulationStarted` ou `simulationEnded` será feita no backend.
  // No frontend, apenas verificamos se já foi liberado para evitar spam de botão.
  if (actorReleasedImpressoIds.value[dataItemId]) {
    return;
  }

  socket.value.emit('ACTOR_RELEASE_DATA', { sessionId: sessionId.value, dataItemId });
  actorReleasedImpressoIds.value = {...actorReleasedImpressoIds.value, [dataItemId]: true}; // Atualiza localmente
}

async function copyInviteLink() { if(!inviteLinkToShow.value) return; try {await navigator.clipboard.writeText(inviteLinkToShow.value); copySuccess.value=true; setTimeout(()=>copySuccess.value=false,2000);
  } catch(e){alert('Falha ao copiar.')} }
function sendReady() { if (socket.value?.connected && sessionId.value && !myReadyState.value) {
  socket.value.emit('CLIENT_IM_READY', { sessionId: sessionId.value }); myReadyState.value = true; } else { let rsn=""; if(myReadyState.value) rsn="Já pronto."; else if(!socket.value?.connected) rsn="Não conectado.";
  else rsn="Erro."; alert(rsn); } }

// MODIFICAÇÃO 2: Nova função para lidar com o clique do botão "Iniciar Simulação"
function handleStartSimulationClick() {
  if (socket.value?.connected && sessionId.value && (userRole.value === 'actor' || userRole.value === 'evaluator') && bothParticipantsReady.value && !simulationStarted.value) {
    const durationToSend = selectedDurationMinutes.value;
    socket.value.emit('CLIENT_START_SIMULATION', {
      sessionId: sessionId.value,
      durationMinutes: durationToSend
    });
  } else {
    console.error("[CLIENT - BUTTON CLICK] Não foi possível emitir CLIENT_START_SIMULATION. Condições não atendidas:", {
      connected: socket.value?.connected,
      sessionId: sessionId.value,
      userRole: userRole.value,
      bothReady: bothParticipantsReady.value,
      simStarted: simulationStarted.value
    });
    alert("Não é possível iniciar a simulação neste momento. Verifique se todos estão prontos e a conexão está ativa.");
  }
}

async function submitEvaluation() {
  if (userRole.value !== 'actor' && userRole.value !== 'evaluator') {
    alert("Apenas o Ator/Avaliador pode submeter avaliação.");
    return;
  }
  if (!socket.value?.connected || !sessionId.value) {
    alert("Não conectado a uma sessão válida.");
    return;
  }
  if (Object.keys(evaluationScores.value).length === 0) {
    alert("Nenhuma pontuação foi registrada.");
    return;
  }

  socket.value.emit('EVALUATOR_SUBMIT_EVALUATION', { 
    sessionId: sessionId.value, 
    stationId: stationId.value, 
    evaluatorId: currentUser.value?.uid, 
    scores: evaluationScores.value, 
    totalScore: totalScore.value 
  });
  
  if (pepReleasedToCandidate.value && socket.value?.connected) {
    socket.value.emit('EVALUATOR_SCORES_UPDATED_FOR_CANDIDATE', {
      sessionId: sessionId.value,
      scores: evaluationScores.value,
      totalScore: totalScore.value
    });
  }

  // --- Integração Firestore: registrar avaliação NO CANDIDATO ---
  // Estratégia: tentar todas as fontes possíveis para garantir o UID do candidato
  let candidateUid = null;
  // 1. partner (websocket)
  if (partner.value?.userId) candidateUid = partner.value.userId;
  // 2. sessionStorage
  if (!candidateUid) {
    try {
      const selectedCandidate = JSON.parse(sessionStorage.getItem('selectedCandidate') || '{}');
      if (selectedCandidate && selectedCandidate.uid) {
        candidateUid = selectedCandidate.uid;
      }
    } catch (err) {
      console.warn('[AVALIAÇÃO] Erro ao ler candidato do sessionStorage:', err);
    }
  }
  // 3. selectedCandidateForSimulation ref
  if (!candidateUid && selectedCandidateForSimulation.value?.uid) {
    candidateUid = selectedCandidateForSimulation.value.uid;
  }
  // 4. route.query (caso venha por URL)
  if (!candidateUid && route.query.candidateUid) {
    candidateUid = route.query.candidateUid;
  }

  // Validação final
  if (!candidateUid) {
    alert('Não foi possível identificar o candidato para registrar a avaliação. Por favor, selecione o candidato corretamente antes de iniciar a simulação.');
    console.error('[AVALIAÇÃO] Falha crítica: UID do candidato não encontrado!');
    return;
  }

  // Registro da avaliação
  if (stationId.value && typeof totalScore.value === 'number') {
    try {
      const avaliacaoData = {
        uid: candidateUid,
        idEstacao: stationId.value,
        nota: totalScore.value,
        data: new Date(),
        nomeEstacao: stationData.value?.tituloEstacao || 'Estação Clínica',
        especialidade: stationData.value?.especialidade || 'Geral',
        origem: stationData.value?.origem || 'SIMULACAO'
      };
      await registrarConclusaoEstacao(avaliacaoData);
    } catch (err) {
      alert('Erro ao registrar avaliação do candidato. Veja o console para detalhes.');
      console.error('[AVALIAÇÃO] Erro ao registrar avaliação no Firestore:', err);
    }
  } else {
    alert('Dados insuficientes para registrar avaliação.');
    console.warn('[AVALIAÇÃO] Dados insuficientes para registrar avaliação:', {
      candidateUid,
      stationId: stationId.value,
      totalScore: totalScore.value
    });
  }
}

function releasePepToCandidate() {
  if (!socket.value?.connected || !sessionId.value) { alert("Erro: Não conectado."); return; }
  if (pepReleasedToCandidate.value) { return; }
  if(userRole.value !== 'actor' && userRole.value !== 'evaluator') {alert("Não autorizado."); return;}
  
  // NOVA VERIFICAÇÃO: Só permite liberar o PEP após o fim da estação
  if (!simulationEnded.value) {
    alert("O PEP só pode ser liberado após o encerramento da estação.");
    return;
  }

  // SINCRONIZAÇÃO: Envia avaliações atuais junto com a liberação do PEP
  const currentScores = {};
  Object.keys(evaluationScores.value).forEach(key => {
    const score = evaluationScores.value[key];
    currentScores[key] = typeof score === 'string' ? parseFloat(score) : score;
  });

  const currentTotal = Object.values(currentScores).reduce((sum, v) => sum + (isNaN(v) ? 0 : v), 0);

  // Libera o PEP após verificar todas as condições
  const payload = { sessionId: sessionId.value };
  socket.value.emit('ACTOR_RELEASE_PEP', payload);
  
  // SINCRONIZAÇÃO: Força envio das avaliações atuais imediatamente após liberação
  setTimeout(() => {
    if (Object.keys(currentScores).length > 0) {
      socket.value.emit('EVALUATOR_SCORES_UPDATED_FOR_CANDIDATE', {
        sessionId: sessionId.value,
        scores: currentScores,
        totalScore: currentTotal,
        forceSync: true // Flag especial para sincronização forçada
      });
    }
  }, 100); // Pequeno delay para garantir que o PEP foi liberado primeiro
  
  pepReleasedToCandidate.value = true;
}

// --- Funções para controle de carregamento de imagens ---
function getImageId(impressoId, context) {
  return `${impressoId}-${context}`;
}

function getImageSource(imagePath, imageId) {
  // SILENCIOSO: Cache lookup sem logs - operação muito frequente
  
  // Se a imagem foi pré-carregada, retorna a URL original do cache (SEM LOG)
  if (imageLoadSources.value[imageId]) {
    return imageLoadSources.value[imageId];
  }
  
  // Se não foi pré-carregada, registra a URL original (SEM LOG INICIAL)
  // // console.log(`[CACHE] ⚠️ PRIMEIRA VEZ - Imagem não pré-carregada: ${imageId}`);
  
  // Registra imediatamente no cache para evitar múltiplas tentativas
  imageLoadSources.value = {
    ...imageLoadSources.value,
    [imageId]: imagePath
  };
  
  // Força o pré-carregamento em background para próximas vezes (SEM LOG EXCESSIVO)
  ensureImageIsPreloaded(imagePath, imageId, 'Imagem do impresso');
  
  // Retorna a URL original (primeira vez pode ser lenta, próximas serão instantâneas)
  return imagePath;
}

function handleImageError(imagePath, imageId) {
  // Incrementa tentativas
  const attempts = (imageLoadAttempts.value[imageId] || 0) + 1;
  imageLoadAttempts.value = {
    ...imageLoadAttempts.value,
    [imageId]: attempts
  };
  
  // Máximo de 3 tentativas
  if (attempts <= 3) {
    // Força recarregamento adicionando timestamp
    const separator = imagePath.includes('?') ? '&' : '?';
    const newUrl = `${imagePath}${separator}reload=${Date.now()}&attempt=${attempts}`;
    
    // Atualiza a fonte da imagem
    imageLoadSources.value = {
      ...imageLoadSources.value,
      [imageId]: newUrl
    };
    
    // Tenta novamente após um delay
    setTimeout(() => {
      preloadSingleImage(newUrl, imageId, 'Imagem do impresso');
    }, 1000 * attempts); // Delay progressivo
    
  } else {
    console.error(`[DEBUG] ❌ DIAGNÓSTICO - Falha definitiva ao carregar imagem após 3 tentativas: ${imagePath}`);
    
    // Remove do cache para permitir tentativa manual posterior
    if (imageLoadSources.value[imageId]) {
      delete imageLoadSources.value[imageId];
      imageLoadSources.value = { ...imageLoadSources.value };
    }
  }
}

// --- Função para limpar cache de imagens ---
function clearImageCache() {
  // SILENCIOSO: Removido logs de cache - operação interna
  imageLoadSources.value = {};
  imageLoadAttempts.value = {};
  imagesPreloadStatus.value = {}; // NOVO: Limpa status de pré-carregamento
  allImagesPreloaded.value = false; // NOVO: Reset flag global
}

function handleImageLoad(imageId) {
  // SILENCIOSO: Removido log de primeira carga - sistema deve ser silencioso
  // const isFirstLoad = !imageLoadSources.value[imageId + '_loaded'];
  
  // if (isFirstLoad) {
  //   // console.log(`[DEBUG] ✅ PRIMEIRA CARGA - Imagem carregada: ${imageId}`);
  //   // console.log(`[DEBUG] ✅ PRIMEIRA CARGA - Timestamp: ${new Date().toISOString()}`);
  //   
  //   // Marca como carregada para evitar logs futuros
  //   imageLoadSources.value[imageId + '_loaded'] = true;
  // }
  
  // Reset tentativas quando carrega com sucesso
  if (imageLoadAttempts.value[imageId]) {
    delete imageLoadAttempts.value[imageId];
  }
}

// Função para abrir zoom da imagem
function openImageZoom(imageSrc, imageAlt) {
  if (!imageSrc || imageSrc.trim() === '') {
    console.error(`[ZOOM] ❌ Erro: URL da imagem está vazia ou inválida: "${imageSrc}"`);
    return;
  }

  // Verifica se a imagem está 100% pré-carregada
  const imageId = Object.keys(imageLoadSources.value).find(id => 
    imageLoadSources.value[id] === imageSrc
  );
  
  if (imageId && imagesPreloadStatus.value[imageId] === 'loaded') {
    // ABERTURA INSTANTÂNEA: Imagem está garantidamente carregada
  } else if (allImagesPreloaded.value) {
    // Todas foram pré-carregadas, mas talvez seja um ID diferente
  } else {
    // Fallback: força carregamento imediato
    const img = new Image();
    img.src = imageSrc;
  }

  selectedImageForZoom.value = imageSrc;
  selectedImageAlt.value = imageAlt || 'Imagem do impresso';
  imageZoomDialog.value = true;
}

// Função para fechar zoom da imagem
function closeImageZoom() {
  // SILENCIOSO: Removido log de fechamento
  // // console.log(`[ZOOM] 🔍 Fechando modal de zoom`);
  imageZoomDialog.value = false;
  selectedImageForZoom.value = '';
  selectedImageAlt.value = '';
}

// Função para tratar erro na imagem do modal de zoom
function handleZoomImageError() {
  console.error(`[DEBUG] ❌ DIAGNÓSTICO - Erro ao carregar imagem no modal de zoom:`);
  console.error(`[DEBUG] ❌ DIAGNÓSTICO - URL que falhou: ${selectedImageForZoom.value}`);
  console.error(`[DEBUG] ❌ DIAGNÓSTICO - Cache de imagens:`, imageLoadSources.value);
  console.error(`[DEBUG] ❌ DIAGNÓSTICO - Timestamp do erro: ${new Date().toISOString()}`);
  
  // Verificar se o evento está sendo disparado
  console.error(`[DEBUG] ❌ DIAGNÓSTICO - handleZoomImageError DISPARADO - Modal com problema!`);
}

// Função para confirmar carregamento da imagem no modal de zoom
function handleZoomImageLoad() {
  // Logs removidos
}

// --- Função para pré-carregar imagens dos impressos ---
function preloadImpressoImages() {
  if (!stationData.value?.materiaisDisponiveis?.impressos) {
    return;
  }

  const impressosComImagem = stationData.value.materiaisDisponiveis.impressos.filter(
    impresso => impresso.tipoConteudo === 'imagem_com_texto' && 
               impresso.conteudo?.caminhoImagem
  );

  if (impressosComImagem.length === 0) {
    allImagesPreloaded.value = true; // Marca como completo se não há imagens
    return;
  }

  // Reset status de pré-carregamento
  allImagesPreloaded.value = false;
  imagesPreloadStatus.value = {};

  const imagesToPreload = [];
  
  impressosComImagem.forEach(impresso => {
    const imagePath = impresso.conteudo.caminhoImagem;
    
    // IDs para ator e candidato
    const actorImageId = getImageId(impresso.idImpresso, 'actor-img-texto');
    const candidateImageId = getImageId(impresso.idImpresso, 'candidate-img-texto');
    
    imagesToPreload.push({ path: imagePath, id: actorImageId, title: impresso.tituloImpresso });
    imagesToPreload.push({ path: imagePath, id: candidateImageId, title: impresso.tituloImpresso });
  });

  // Inicializa status de todas as imagens
  imagesToPreload.forEach(img => {
    imagesPreloadStatus.value[img.id] = 'loading';
  });

  // Pré-carrega todas as imagens e monitora conclusão
  let loadedCount = 0;
  const totalImages = imagesToPreload.length;

  imagesToPreload.forEach(img => {
    preloadSingleImageAdvanced(img.path, img.id, img.title, () => {
      loadedCount++;
      imagesPreloadStatus.value[img.id] = 'loaded';
      
      // Verifica se todas as imagens foram carregadas
      if (loadedCount === totalImages) {
        allImagesPreloaded.value = true;
      }
    }, () => {
      loadedCount++;
      imagesPreloadStatus.value[img.id] = 'error';
      
      // Mesmo com erro, verifica se é a última
      if (loadedCount === totalImages) {
        allImagesPreloaded.value = true;
        // console.log(`[PRELOAD] ⚠️ Pré-carregamento finalizado com algumas falhas. Total: ${totalImages}`);
      }
    });
  });
}

// --- Função para verificar se uma imagem está pré-carregada ---
function isImagePreloaded(imageId) {
  const isInCache = !!imageLoadSources.value[imageId];
  // CORREÇÃO: Removendo log excessivo que aparecia constantemente
  // // console.log(`[PRELOAD-CHECK] ✅ CORREÇÃO - Verificando ${imageId}: ${isInCache ? 'DISPONÍVEL' : 'NÃO DISPONÍVEL'}`);
  return isInCache;
}

// --- Função para forçar pré-carregamento se necessário ---
function ensureImageIsPreloaded(imagePath, imageId, altText) {
  if (!isImagePreloaded(imageId)) {
    preloadSingleImage(imagePath, imageId, altText);
  } else {
    // CORREÇÃO: Removendo log excessivo
    // // console.log(`[PRELOAD-ENSURE] ✅ CORREÇÃO - Imagem ${imageId} já disponível para uso instantâneo`);
  }
}

// --- Função avançada para pré-carregamento garantido ---
function preloadSingleImageAdvanced(imagePath, imageId, altText, onSuccess, onError) {
  // Verifica se já está carregada
  if (imageLoadSources.value[imageId]) {
    onSuccess();
    return;
  }

  // Cria múltiplas instâncias para garantir carregamento
  const img1 = new Image();
  const img2 = new Image(); // Backup para maior garantia
  
  let loadingComplete = false;
  
  const handleSuccess = () => {
    if (loadingComplete) return;
    loadingComplete = true;
    
    // Registra no cache
    imageLoadSources.value = {
      ...imageLoadSources.value,
      [imageId]: imagePath
    };
    
    handleImageLoad(imageId);
    onSuccess();
  };
  
  const handleFailure = (error) => {
    if (loadingComplete) return;
    loadingComplete = true;
    
    handleImageError(imagePath, imageId);
    onError();
  };
  
  // Configura primeira imagem
  img1.onload = handleSuccess;
  img1.onerror = () => {
    // Se primeira falha, tenta a segunda
    img2.onload = handleSuccess;
    img2.onerror = handleFailure;
    img2.src = imagePath + '?retry=1'; // URL ligeiramente diferente
  };
  
  // Inicia carregamento
  img1.src = imagePath;
  img1.alt = altText || 'Imagem do impresso';
}

// Função para manter os callbacks de avaliação
function sendEvaluationScores() {
  // Envia os scores iniciais ao liberar o PEP (se já houver algum)
  if (socket.value?.connected) {
      socket.value.emit('EVALUATOR_SCORES_UPDATED_FOR_CANDIDATE', {
        sessionId: sessionId.value,
        scores: evaluationScores.value,
        totalScore: totalScore.value
      });
  }
}
function manuallyEndSimulation() {
    if (!simulationStarted.value || simulationEnded.value) { return;
    }
    if (!socket.value?.connected || !sessionId.value) { alert("Erro: Não conectado para encerrar."); return;
    }
    if (userRole.value !== 'actor' && userRole.value !== 'evaluator') { alert("Não autorizado."); return;
    }
    socket.value.emit('CLIENT_MANUAL_END_SIMULATION', { sessionId: sessionId.value });
}

watch(evaluationScores, (newScores) => {
  if (
    socket.value?.connected &&
    (userRole.value === 'actor' || userRole.value === 'evaluator') &&
    pepReleasedToCandidate.value
  ) {
    // Converta todos os valores para number
    const numericScores = {};
    Object.keys(newScores).forEach(key => {
      numericScores[key] = typeof newScores[key] === 'string'
        ? parseFloat(newScores[key])
        : newScores[key];
    });

    socket.value.emit('EVALUATOR_SCORES_UPDATED_FOR_CANDIDATE', {
      sessionId: sessionId.value,
      scores: numericScores,
      totalScore: Object.values(numericScores).reduce((sum, v) => sum + (isNaN(v) ? 0 : v), 0)
    });
  }
}, { deep: true });

// Funções para marcar/desmarcar partes do roteiro
function toggleScriptContext(idx, event) {
  // Impedir a propagação do evento para evitar múltiplos cliques
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  
  if (userRole.value === 'actor' || userRole.value === 'evaluator') {
    const clickKey = `c-${idx}`;
    
    // Verificar se houve um clique recente para evitar duplicação
    const now = Date.now();
    if (lastClickTime.value[clickKey] && now - lastClickTime.value[clickKey] < 500) {
      return;
    }
    
    // Registrar o tempo do clique
    lastClickTime.value[clickKey] = now;
    
    // Use um timeout mínimo para evitar problemas de renderização
    setTimeout(() => {
      // Toggle o valor (invertendo o estado atual)
      markedScriptContexts.value[idx] = !markedScriptContexts.value[idx];
      
      // Criar uma cópia do objeto ref para garantir que a atualização da UI seja acionada
      markedScriptContexts.value = { ...markedScriptContexts.value };
      
      // Força a atualização do DOM após a alteração
      nextTick(() => {
        // Atualiza o atributo data-marked explicitamente
        const elements = document.querySelectorAll(`[data-marked]`);
        elements.forEach(el => {
          // Garante que a classe CSS permaneça aplicada
          if (el.getAttribute('data-marked') === 'true') {
            if (el.classList.contains('marked-context-primary') || el.classList.contains('marked-context-warning')) {
              el.style.backgroundColor = el.classList.contains('marked-context-primary') 
                ? 'rgba(var(--v-theme-primary), 0.15)' 
                : 'rgba(var(--v-theme-warning), 0.2)';
            }
          }
        });
      });
    }, 10);
  }
}

function toggleScriptSentence(idx, sentenceIdx) {
  if (userRole.value === 'actor' || userRole.value === 'evaluator') {
    const key = `${idx}-${sentenceIdx}`;
    markedScriptSentences.value[key] = !markedScriptSentences.value[key];
    // Criar uma cópia do objeto ref para garantir que a atualização da UI seja acionada
    markedScriptSentences.value = { ...markedScriptSentences.value };
  }
}

// --- Adiciona os refs ausentes para marcação de itens do roteiro ---
const markedMainItems = ref({});
const markedSubItems = ref({});

// Funções para marcar/desmarcar itens do roteiro
function toggleMainItem(itemId) {
  markedMainItems.value[itemId] = !markedMainItems.value[itemId];
}

function toggleSubItem(itemId) {
  markedSubItems.value[itemId] = !markedSubItems.value[itemId];
}

// Função que retorna a classe CSS baseada no estado do item
function getItemClasses(itemType, itemId) {
  if (itemType === 'main') {
    return {
      'marked': markedMainItems.value[itemId]
    };
  } else if (itemType === 'sub') {
    return {
      'marked': markedSubItems.value[itemId]
    };
  }
  return {};
}

// Função para lidar com cliques nos itens do roteiro
function handleClick(event) {
  // Identifica qual elemento foi clicado
  const mainItem = event.target.closest('.main-item');
  const subItem = event.target.closest('.subitem');
  
  if (mainItem) {
    // Se clicou em um item principal
    const itemId = mainItem.getAttribute('data-main-item-id');
    if (itemId) {
      toggleMainItem(itemId);
      event.stopPropagation(); // Evita a propagação do evento
    }
  } else if (subItem) {
    // Se clicou em um subitem
    const itemId = subItem.getAttribute('data-subitem-id');
    if (itemId) {
      toggleSubItem(itemId);
      event.stopPropagation(); // Evita a propagação do evento
    }
  }
}

// CORREÇÃO: Removendo onMounted duplicado - já consolidado no principal
// Setup do listener de eventos para marcação - MOVIDO PARA O onMounted PRINCIPAL
// onMounted(() => {
//   document.addEventListener('toggleMark', (e) => toggleMark(e.detail));
// });

onUnmounted(() => {
  document.removeEventListener('toggleMark', (e) => toggleMark(e.detail));
});

// --- NOVO: Comunicação Google Meet ---
const communicationMethod = ref(''); // 'voice' ou 'meet'
const meetLink = ref('');
const meetLinkCopied = ref(false);

function openGoogleMeet() {
  // Abre uma nova sala do Meet
  window.open('https://meet.google.com/new', '_blank');
}

function copyMeetLink() {
  if (meetLink.value) {
    navigator.clipboard.writeText(meetLink.value);
    meetLinkCopied.value = true;
    setTimeout(() => { meetLinkCopied.value = false; }, 2000);
  }
}

// --- CONTROLE DE USUÁRIOS ONLINE E CONVITE INTERNO ---
const onlineCandidates = ref([]); // Lista de candidatos online
const isSendingInternalInvite = ref(false);
const internalInviteSentTo = ref(null);

// Recebe lista de usuários online do backend
function handleOnlineUsersList(users) {
  // Filtra apenas candidatos
  onlineCandidates.value = Array.isArray(users)
    ? users.filter(u => u.role === 'candidate' && u.userId !== currentUser.value?.uid)
    : [];
}

// Envia convite interno para um candidato online
function sendInternalInvite(candidate) {
  if (!socket.value?.connected || !candidate?.userId) return;
  isSendingInternalInvite.value = true;
  internalInviteSentTo.value = candidate.userId;
  socket.value.emit('SERVER_SEND_INTERNAL_INVITE', {
    toUserId: candidate.userId,
    sessionId: sessionId.value,
    stationId: stationId.value,
    meetLink: communicationMethod.value === 'meet' ? meetLink.value.trim() : '',
    duration: selectedDurationMinutes.value
  });
}

// Atualiza lista de usuários online ao receber do backend
if (socket.value) {
  socket.value.on('SERVER_ONLINE_USERS', handleOnlineUsersList);
}

// Solicita lista de usuários online ao conectar
watch(connectionStatus, (status) => {
  if (status === 'Conectado' && socket.value?.connected) {
    socket.value.emit('CLIENT_REQUEST_ONLINE_USERS', { role: 'candidate' });
  }
});

// --- CONTROLE DE CONVITE INTERNO (CANDIDATO ONLINE) ---
const internalInviteDialog = ref(false);
const internalInviteData = ref({ from: '', link: '', stationId: '', sessionId: '', role: '', meet: '' });

// Recebe convite interno via socket
function handleInternalInviteReceived(payload) {
  // payload: { from, link, stationTitle, sessionId, role, meet }
  if (!payload || !payload.link) return;
  internalInviteData.value = { ...payload };
  internalInviteDialog.value = true;
}

function acceptInternalInvite() {
  if (internalInviteData.value.link) {
    // Redireciona para o link da estação (abre na mesma aba)
    window.location.href = internalInviteData.value.link;
    internalInviteDialog.value = false;
  }
}

function declineInternalInvite() {
  internalInviteDialog.value = false;
}

// CORREÇÃO: Removendo onMounted duplicado - já consolidado no principal
// Adiciona listener do socket para convite interno - MOVIDO PARA O onMounted PRINCIPAL
// onMounted(() => {
//   // ...existing code...
//   if (socket.value) {
//     socket.value.on('INTERNAL_INVITE_RECEIVED', handleInternalInviteReceived);
//   }
// });
onUnmounted(() => {
  // ...existing code...
  if (socket.value) {
    socket.value.off('INTERNAL_INVITE_RECEIVED', handleInternalInviteReceived);
  }
});

// Função utilitária para buscar rota aninhada por nome
function findRouteByName(routes, name) {
  for (const route of routes) {
    if (route.name === name) return route;
    if (route.children) {
      const found = findRouteByName(route.children, name);
      if (found) return found;
    }
  }
  return null;
}

// Função para colapsar/expandir sidebar
function toggleCollapse() {
  const wrapper = document.querySelector('.layout-wrapper');
  if (wrapper) {
      wrapper.classList.toggle('layout-vertical-nav-collapsed');
  }
}

// Função para determinar o rótulo da avaliação com base na pontuação

// Função para determinar a cor da avaliação com base na pontuação


// Função para determinar a cor do ícone com base no item

// Função Adicionada: divide o texto em parágrafos para exibição

// Variáveis para o snackbar de notificação
const showNotificationSnackbar = ref(false);
const notificationMessage = ref('');
const notificationColor = ref('info');

// Função para mostrar uma notificação temporária
function showNotification(message, color = 'info') {
  notificationMessage.value = message;
  notificationColor.value = color;
  showNotificationSnackbar.value = true;
  setTimeout(() => {
    showNotificationSnackbar.value = false;
  }, 5000); // Fechará automaticamente após 5 segundos
}

// Funções para verificar e alternar marcações de parágrafos
function isParagraphMarked(contextIdx, paragraphIdx) {
  if (!markedParagraphs.value) return false;
  const key = `${contextIdx}-${paragraphIdx}`;
  return markedParagraphs.value[key] === true;
}

function toggleParagraphMark(contextIdx, paragraphIdx, event) {
  // Impedir a propagação do evento para evitar múltiplos cliques
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  
  if (userRole.value === 'actor' || userRole.value === 'evaluator') {
    const key = `${contextIdx}-${paragraphIdx}`;
    const clickKey = `p-${key}`;
    
    // Verificar se houve um clique recente para evitar duplicação
    const now = Date.now();
    if (lastClickTime.value[clickKey] && now - lastClickTime.value[clickKey] < 500) {
      return;
    }
    
    // Registrar o tempo do clique
    lastClickTime.value[clickKey] = now;
    
    // Use um timeout mínimo para evitar problemas de renderização
    setTimeout(() => {
      // Toggle o estado de marcação
      markedParagraphs.value[key] = !markedParagraphs.value[key];
      
      // Forçar reatividade criando um novo objeto
      markedParagraphs.value = { ...markedParagraphs.value };
    }, 10);
  }
}

// --- NOVO: Função para processar e padronizar os itens de infraestrutura ---
</script>

<template>
  <div 
    :class="[
      'simulation-page-container',
      isDarkTheme ? 'simulation-page-container--dark' : 'simulation-page-container--light'
    ]"
  >
    <!-- Snackbar para notificações -->
    <VSnackbar
      v-model="showNotificationSnackbar"
      :color="notificationColor"
      :timeout="5000"
      location="top"
    >
      {{ notificationMessage }}
      <template v-slot:actions>
        <VBtn
          variant="text"
          @click="showNotificationSnackbar = false"
        >
          Fechar
        </VBtn>
      </template>
    </VSnackbar>
    
    <!-- Conteúdo principal -->
    <div v-if="isLoading" class="d-flex justify-center align-center" style="height: 80vh;">
      <VProgressCircular indeterminate size="64" />
    </div>

    <VAlert v-else-if="errorMessage && !stationData" type="error" prominent class="mb-4">
      {{ errorMessage }}
    </VAlert>

    <div v-else-if="!stationData" class="text-center">
      <VAlert type="error" prominent class="mb-4">
        Falha ao carregar os dados da estação. Verifique o ID e tente novamente.
      </VAlert>
    </div>

    <!-- Conteúdo Principal da Simulação -->
    <div v-else-if="stationData && sessionId">
      <!-- CABEÇALHO E CONTROLES PRINCIPAIS -->
      <VCard 
        :class="[
          'mb-6 main-header-card',
          isDarkTheme ? 'main-header-card--dark' : 'main-header-card--light'
        ]"
      >
        <VCardText>
          <!-- Selected Candidate Info -->
          <div v-if="selectedCandidateForSimulation" class="mb-4">
            <VCard 
              color="primary" 
              variant="tonal"
              :class="[
                'candidate-card',
                isDarkTheme ? 'candidate-card--dark' : 'candidate-card--light'
              ]"
            >
              <VCardText>
                <div class="d-flex align-center">
                  <VAvatar size="40" class="me-3">
                    <VImg 
                      :src="selectedCandidateForSimulation.photoURL || '/images/avatars/avatar-1.png'"
                      :alt="selectedCandidateForSimulation.name"
                    />
                  </VAvatar>
                  <div class="flex-grow-1">
                    <div class="text-subtitle-1 font-weight-medium">
                      Candidato Selecionado: {{ selectedCandidateForSimulation.name }}
                    </div>
                    <div class="text-caption text-medium-emphasis">
                      {{ selectedCandidateForSimulation.email }}
                    </div>
                  </div>
                  <VBtn
                    size="small"
                    variant="text"
                    color="error"
                    @click="clearSelectedCandidate"
                    prepend-icon="mdi-close"
                  >
                    Limpar Seleção
                  </VBtn>
                </div>
              </VCardText>
            </VCard>
          </div>

          <div class="d-flex flex-wrap justify-space-between align-center gap-4">
            <!-- Título -->
            <div class="d-flex align-center gap-3">
                <VBtn icon variant="text" @click="toggleCollapse">
                    <VIcon icon="ri-menu-line" />
                </VBtn>
                <div>
                    <h2 class="text-h5">{{
                      isCandidate
                        ? stationData.especialidade
                        : `${stationData.especialidade} - ${stationData.tituloEstacao}`
                    }}</h2>
                </div>
            </div>

            <!-- Timer -->
            <div class="d-flex align-center gap-3">
              <!-- Botão de Edição para Admins -->
              <VBtn
                v-if="isAdmin && stationId"
                icon
                variant="text"
                size="small"
                color="warning"
                title="Editar Estação (abrir em nova aba)"
                @click="openEditPage"
                style="background-color: yellow !important; color: black !important;"
              >
                <VIcon icon="ri-pencil-line" style="color: black !important;" />
              </VBtn>
              <div v-if="isActorOrEvaluator && !simulationStarted && !simulationEnded" style="width: 150px;">
                <VSelect
                  v-model="selectedDurationMinutes"
                  label="Duração"
                  :items="[5, 6, 7, 8, 9, 10].map(n => ({ title: `${n} min`, value: n }))"
                  :disabled="!!inviteLinkToShow"
                  density="compact"
                  hide-details
                  @update:model-value="updateTimerDisplayFromSelection"
                />
              </div>
              <div class="timer-display" :class="{ 'ended': simulationEnded }">
                <VIcon icon="ri-time-line" class="me-1" />
                {{ timerDisplay }}
              </div>
              <VBtn
                v-if="isActorOrEvaluator && simulationStarted && !simulationEnded"
                color="error"
                variant="tonal"
                @click="manuallyEndSimulation"
              >
                Encerrar
              </VBtn>
            </div>
          </div>

           <VAlert v-if="errorMessage && stationData" type="warning" density="compact" class="mt-4">
              {{ errorMessage }}
            </VAlert>
        </VCardText>
      </VCard>

      <!-- SEÇÃO DE PREPARAÇÃO (ANTES DE INICIAR) -->
      <VCard 
        v-if="isActorOrEvaluator && !simulationStarted && !simulationEnded" 
        :class="[
          'mb-6 preparation-card',
          isDarkTheme ? 'preparation-card--dark' : 'preparation-card--light'
        ]"
      >
        <VCardTitle>Preparação da Simulação</VCardTitle>
        <VCardText>
            <VRadioGroup v-model="communicationMethod" inline label="Método de Comunicação:">
              <VRadio label="Voz (Beta)" value="voice" />
              <VRadio label="Google Meet" value="meet" />
              <VRadio label="Nenhum" value="none" />
            </VRadioGroup>

            <div v-if="communicationMethod === 'meet'" class="d-flex flex-column gap-3 mb-4">
              <VBtn prepend-icon="ri-vidicon-line" @click="openGoogleMeet">Criar Sala no Google Meet</VBtn>
              <VTextField v-model="meetLink" label="Cole o link do Meet aqui" density="compact" />
            </div>

            <VBtn v-if="!inviteLinkToShow" block @click="generateInviteLinkWithDuration">
              Gerar Link de Convite
            </VBtn>

            <div v-if="inviteLinkToShow" class="mt-4 text-center">
                <p class="font-weight-bold text-body-2 mb-2">Link de Convite Gerado!</p>
                <div class="d-flex gap-2 justify-center">
                  <VBtn
                      prepend-icon="ri-clipboard-line"
                      @click="copyInviteLink"
                      :color="copySuccess ? 'success' : 'primary'"
                  >
                      {{ copySuccess ? 'Copiado!' : 'Copiar Link' }}
                  </VBtn>
                  <VBtn
                      v-if="selectedCandidateForSimulation"
                      prepend-icon="ri-chat-3-line"
                      @click="sendLinkViaPrivateChat"
                      color="secondary"
                      :loading="sendingChat"
                  >
                      {{ chatSentSuccess ? 'Enviado!' : 'Enviar via Chat' }}
                  </VBtn>
                </div>
            </div>

          <div v-if="inviteLinkToShow || isCandidate" class="text-center mt-4 pt-4 border-t">
            <VBtn
              v-if="!myReadyState"
              size="large"
              :color="myReadyState ? 'default' : 'success'"
              :disabled="isCandidate && !candidateReadyButtonEnabled"
              @click="sendReady"
            >
              <VIcon :icon="myReadyState ? 'ri-checkbox-circle-line' : 'ri-checkbox-blank-circle-line'" class="me-2"/>
              {{ myReadyState ? 'Pronto!' : 'Estou Pronto!' }}
            </VBtn>
            <VChip v-else color="success" size="large">
              <VIcon icon="ri-checkbox-circle-line" class="me-2"/>
              Pronto! Aguardando parceiro...
            </VChip>
            <p v-if="bothParticipantsReady" class="text-success font-weight-bold mt-3">
              Ambos prontos! Você pode iniciar a simulação.
            </p>
          </div>

          <VBtn
            v-if="isActorOrEvaluator && bothParticipantsReady && !simulationStarted"
            block size="large" color="success" prepend-icon="ri-play-line" class="mt-4"
            @click="handleStartSimulationClick"
          >
            Iniciar Simulação
          </VBtn>
        </VCardText>
      </VCard>

      <!-- Banners de Status da Simulação -->
      <VAlert v-if="simulationStarted && !simulationEnded" type="success" variant="tonal" class="mb-6" prominent>
        <VIcon icon="ri-play-circle-line" class="me-2" /> Simulação em progresso!
      </VAlert>
      <VAlert v-if="simulationEnded" type="info" variant="tonal" class="mb-6" prominent>
        <VIcon icon="ri-stop-circle-line" class="me-2" /> Simulação encerrada.
      </VAlert>

      <!-- LAYOUT PRINCIPAL: CONTEÚDO + SIDEBAR (CANDIDATO) OU CONTEÚDO (ATOR) -->
      <VRow>
        <!-- Coluna Principal de Conteúdo -->
        <VCol :cols="isCandidate ? 12 : 12" :md="isCandidate ? 8 : 12">
          <!-- VISÃO DO ATOR/AVALIADOR -->
          <div v-if="isActorOrEvaluator">
            <!-- Card para Cenário -->
            <VCard 
              :class="[
                'mb-6 scenario-card',
                isDarkTheme ? 'scenario-card--dark' : 'scenario-card--light'
              ]" 
              v-if="stationData.instrucoesParticipante?.cenarioAtendimento"
            >
                <VCardItem>
                    <template #prepend>
                        <VIcon icon="ri-hospital-line" color="info" />
                    </template>
                    <VCardTitle>Cenário do Atendimento</VCardTitle>
                </VCardItem>
                <VCardText v-if="stationData.instrucoesParticipante" class="text-body-1">
                    <p><strong>Nível de Atenção:</strong> {{ stationData.instrucoesParticipante.cenarioAtendimento?.nivelAtencao }}</p>
                    <p><strong>Tipo de Atendimento:</strong> {{ stationData.instrucoesParticipante.cenarioAtendimento?.tipoAtendimento }}</p>
                    <div v-if="stationData.instrucoesParticipante.cenarioAtendimento?.infraestruturaUnidade?.length">
                        <p class="font-weight-bold text-h6 mb-2 d-flex align-center">
                            <VIcon icon="ri-building-2-line" color="primary" class="me-2" size="24" />
                            Infraestrutura:
                        </p>
                        <VCard 
                          flat 
                          :class="[
                            'pa-2 mb-4 infrastructure-card',
                            isDarkTheme ? 'infrastructure-card--dark' : 'infrastructure-card--light'
                          ]"
                        >
                            <ul class="tasks-list infra-icons-list pl-2">
                                <li v-for="(item, index) in processInfrastructureItems(stationData.instrucoesParticipante.cenarioAtendimento.infraestruturaUnidade)" 
                                    :key="`infra-actor-${index}`"
                                    :class="{'sub-item': item.startsWith('- ')}">
                                    <VIcon 
                                      :icon="getInfrastructureIcon(item)" 
                                      :color="getInfrastructureColor(item)" 
                                      class="me-2" 
                                      size="20"
                                      :title="item.startsWith('- ') ? item.substring(2) : item"
                                    />
                                    <span :data-sub-item="item.startsWith('- ') ? 'true' : 'false'">
                                      {{ item.startsWith('- ') ? item.substring(2) : item }}
                                    </span>
                                </li>
                            </ul>
                        </VCard>
                    </div>
                </VCardText>
            </VCard>

            <!-- Card para Descrição do Caso -->
            <VCard 
              :class="[
                'mb-6 case-description-card',
                isDarkTheme ? 'case-description-card--dark' : 'case-description-card--light'
              ]" 
              v-if="stationData.instrucoesParticipante?.descricaoCasoCompleta"
            >
                <VCardItem>
                    <template #prepend>
                        <VIcon icon="ri-file-text-line" color="primary" />
                    </template>
                    <VCardTitle>Descrição do Caso</VCardTitle>
                </VCardItem>
                <VCardText class="text-body-1" v-html="stationData.instrucoesParticipante.descricaoCasoCompleta" />
            </VCard>

            <!-- Card para Tarefas -->
            <VCard 
              :class="[
                'mb-6 tasks-card',
                isDarkTheme ? 'tasks-card--dark' : 'tasks-card--light'
              ]" 
              v-if="stationData.instrucoesParticipante?.tarefasPrincipais?.length"
            >
                <VCardItem>
                    <template #prepend>
                        <VIcon icon="ri-task-line" color="success" />
                    </template>
                    <VCardTitle>Tarefas do Candidato</VCardTitle>
                </VCardItem>
                <VCardText class="text-body-1">
                    <ul class="tasks-list pl-5">
                        <li v-for="(tarefa, i) in stationData.instrucoesParticipante.tarefasPrincipais" :key="`actor-task-${i}`" v-html="tarefa"></li>
                    </ul>
                </VCardText>
            </VCard>

            <!-- Card para Roteiro / Informações Verbais do Ator -->
            <VCard 
              :class="[
                'mb-6 script-card',
                isDarkTheme ? 'script-card--dark' : 'script-card--light'
              ]" 
              v-if="stationData?.materiaisDisponiveis?.informacoesVerbaisSimulado && stationData.materiaisDisponiveis.informacoesVerbaisSimulado.length > 0"
            >
                <VCardItem>
                    <template #prepend>
                        <VIcon icon="ri-chat-quote-line" color="warning" />
                    </template>
                    <VCardTitle class="d-flex align-center">
                        Roteiro / Informações a Fornecer
                        <VChip size="small" color="warning" variant="outlined" class="ms-2">
                            Se perguntado pelo candidato
                        </VChip>
                    </VCardTitle>
                </VCardItem>
                <VCardText class="text-body-1">
                    <ul class="roteiro-list pa-0" style="list-style: none;">
                        <li v-for="(info, idx) in stationData.materiaisDisponiveis.informacoesVerbaisSimulado" 
                            :key="'script-' + idx" 
                            class="mb-2 pa-1">
                          <!-- Título/Contexto (com marcação para todo o bloco) -->
                          <div class="font-weight-bold pa-1 rounded cursor-pointer">
                            <span
                              :data-marked="markedScriptContexts[idx] ? 'true' : 'false'"
                              :class="{ 
                                'marked-context-primary': markedScriptContexts[idx],
                                'uppercase-title': !markedScriptContexts[idx]
                              }"
                              @click="(e) => toggleScriptContext(idx, e)"
                              v-html="processRoteiroActor(info.contextoOuPerguntaChave)">
                            </span>
                          </div>
                          
                          <!-- Cada parágrafo do conteúdo com marcação independente -->
                          <div class="mt-2 pa-1 border-s-2" style="border-left: 3px solid rgba(var(--v-theme-outline), 0.3);">
                                 <!-- Tratamento especial para IDENTIFICAÇÃO DO PACIENTE -->
                                 <div v-if="info.contextoOuPerguntaChave.toUpperCase().includes('IDENTIFICAÇÃO DO PACIENTE')" 
                                      class="paragraph-item cursor-pointer">
                                   <span
                                     :class="{ 
                                       'marked-warning': isParagraphMarked(idx, 0)
                                     }"
                                     @click="(e) => toggleParagraphMark(idx, 0, e)"
                                     v-html="formatIdentificacaoPaciente(info.informacao, info.contextoOuPerguntaChave)">
                                   </span>
                                 </div>
                                 
                                 <!-- Tratamento padrão para outras informações verbais -->
                                 <div v-else 
                                      v-for="(paragraph, pIdx) in splitIntoParagraphs(info.informacao)" 
                                      :key="`paragraph-${idx}-${pIdx}`"
                                      class="paragraph-item cursor-pointer">
                                   <span
                                     :class="{ 
                                       'marked-warning': isParagraphMarked(idx, pIdx)
                                     }"
                                     @click="(e) => toggleParagraphMark(idx, pIdx, e)"
                                     v-html="processRoteiroActor(paragraph)">
                                   </span>
                                 </div>
                          </div>
                        </li>
                    </ul>
                </VCardText>
            </VCard>

            <VCard 
              :class="[
                'mb-6 impressos-actor-card',
                isDarkTheme ? 'impressos-actor-card--dark' : 'impressos-actor-card--light'
              ]" 
              v-if="isActorOrEvaluator && stationData?.materiaisDisponiveis?.impressos?.length > 0"
            >
              <VCardTitle>IMPRESSOS</VCardTitle>
              <VCardText>
                <div v-for="impresso in stationData.materiaisDisponiveis.impressos" :key="impresso.idImpresso" class="impresso-control-item">
                  <div class="d-flex align-center gap-2 flex-wrap">
                    <VBtn
                      @click="toggleActorImpressoVisibility(impresso.idImpresso)"
                      :color="actorVisibleImpressoContent[impresso.idImpresso] ? 'primary' : 'info'"
                      :prepend-icon="actorVisibleImpressoContent[impresso.idImpresso] ? 'ri-eye-off-line' : 'ri-eye-line'"
                      class="impresso-btn"
                    >
                      {{ impresso.tituloImpresso }}
                    </VBtn>
                    <VBtn icon variant="tonal" size="small" @click="releaseData(impresso.idImpresso)" :disabled="!!actorReleasedImpressoIds[impresso.idImpresso]">
                      <VIcon :icon="!!actorReleasedImpressoIds[impresso.idImpresso] ? 'ri-lock-unlock-line' : 'ri-lock-line'" />
                    </VBtn>
                  </div>
                  <VExpandTransition>
                    <div v-if="actorVisibleImpressoContent[impresso.idImpresso]" class="mt-2 pa-3 border rounded bg-grey-lighten-4">
                      <h5 class="text-h6 mb-2">{{ impresso.tituloImpresso }}</h5>
                      <div v-if="impresso.tipoConteudo === 'texto_simples'" v-html="impresso.conteudo.texto" />
                      <div v-else-if="impresso.tipoConteudo === 'imagem_com_texto'">
                        <p v-if="impresso.conteudo.textoDescritivo" v-html="impresso.conteudo.textoDescritivo"></p>
                        <img 
                          v-if="impresso.conteudo.caminhoImagem" 
                          :src="getImageSource(impresso.conteudo.caminhoImagem, getImageId(impresso.idImpresso, 'actor-img-texto'))" 
                          :alt="impresso.tituloImpresso" 
                          class="impresso-imagem impresso-imagem-clickable"
                          @click="openImageZoom(getImageSource(impresso.conteudo.caminhoImagem, getImageId(impresso.idImpresso, 'actor-img-texto')), impresso.tituloImpresso)"
                          @error="handleImageError(impresso.conteudo.caminhoImagem, getImageId(impresso.idImpresso, 'actor-img-texto'))"
                          @load="handleImageLoad(getImageId(impresso.idImpresso, 'actor-img-texto'))"
                        />
                        <p v-if="impresso.conteudo.legendaImagem"><em>{{ impresso.conteudo.legendaImagem }}</em></p>
                        <div v-if="impresso.conteudo.laudo" class="laudo-impresso"><pre>{{ impresso.conteudo.laudo }}</pre></div>
                      </div>
                      <div v-else-if="impresso.tipoConteudo === 'lista_chave_valor_secoes'" class="mt-4">
                          <div v-for="(secao, idxS) in impresso.conteudo.secoes" :key="`actor-prev-sec-${impresso.idImpresso}-${idxS}`">
                            <h6 class="text-subtitle-1 font-weight-bold mt-2" v-if="secao.tituloSecao">{{ secao.tituloSecao }}</h6>
                            <div class="chave-valor-list">
                                <div v-for="(itemSec, idxI) in secao.itens" :key="`actor-prev-item-${impresso.idImpresso}-${idxS}-${idxI}`" class="chave-valor-item">
                                    <strong>{{ itemSec.chave }}:</strong> <span v-html="itemSec.valor"></span>
                                </div>
                            </div>
                          </div>
                      </div>
                      <div v-else-if="impresso.tipoConteudo === 'tabela_objetos'">
                          <VTable>
                              <thead>
                                  <tr><th v-for="cab in impresso.conteudo.cabecalhos" :key="`actor-prev-th-${cab.key}`">{{ cab.label }}</th></tr>
                              </thead>
                              <tbody>
                                  <tr v-for="(linha, idxL) in impresso.conteudo.linhas" :key="`actor-prev-lin-${impresso.idImpresso}-${idxL}`">
                                      <td v-for="cab in impresso.conteudo.cabecalhos" :key="`actor-prev-cel-${impresso.idImpresso}-${idxL}-${cab.key}`" v-html="linha[cab.key]"></td>
                                  </tr>
                              </tbody>
                          </VTable>
                      </div>
                      <div v-else-if="impresso.tipoConteudo === 'imagem_descritiva'">
                          <p v-if="impresso.conteudo.descricao" v-html="impresso.conteudo.descricao"></p>
                          <img 
                            v-if="impresso.conteudo.caminhoImagem" 
                            :src="getImageSource(impresso.conteudo.caminhoImagem, getImageId(impresso.idImpresso, 'actor-img-desc'))" 
                            :alt="impresso.tituloImpresso" 
                            class="impresso-imagem"
                            @error="handleImageError(impresso.conteudo.caminhoImagem, getImageId(impresso.idImpresso, 'actor-img-desc'))"
                            @load="handleImageLoad(getImageId(impresso.idImpresso, 'actor-img-desc'))"
                          />
                      </div>
                      <pre v-else>{{ impresso.conteudo }}</pre>
                    </div>
                  </VExpandTransition>
                </div>
              </VCardText>
            </VCard>

            <!-- Card do Checklist de Avaliação (PEP) - ATOR/AVALIADOR -->
            <VCard 
              :class="[
                'checklist-evaluator-card',
                isDarkTheme ? 'checklist-evaluator-card--dark' : 'checklist-evaluator-card--light'
              ]"
              v-if="checklistData?.itensAvaliacao?.length > 0"
            >
              <VCardItem>
                <VCardTitle class="d-flex align-center">
                  <VIcon color="black" icon="ri-file-list-3-fill" size="large" class="me-2" />
                  Checklist de Avaliação (PEP)
                </VCardTitle>
                <!-- Botão centralizado e grande -->
                <div class="pep-liberado-btn-wrapper">
                  <VBtn
                    color="info"
                    @click="releasePepToCandidate"
                    :disabled="pepReleasedToCandidate || !simulationEnded"
                    variant="tonal"
                    size="large"
                    class="pep-liberado-btn"
                  >
                    {{ pepReleasedToCandidate ? 'PEP Liberado' : 'Liberar PEP' }}
                  </VBtn>
                  <!-- Indicador visual quando o botão está desabilitado -->
                  <div v-if="!simulationEnded && !pepReleasedToCandidate" class="mt-2">
                    <VChip color="warning" size="small" variant="outlined">
                      ⏳ Disponível após encerrar a estação
                    </VChip>
                  </div>
                </div>
              </VCardItem>
              <VTable class="pep-table">
                <thead>
                  <tr>
                    <th class="text-left">Item</th>
                    <th class="text-center" style="width: 20%;">Avaliação</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, index) in checklistData.itensAvaliacao" :key="item.idItem || `pep-item-${index}`">
                    <td>
                      <!-- Conteúdo do Item -->
                      <p class="font-weight-bold">
                        <span v-if="item.itemNumeroOficial">{{ item.itemNumeroOficial }}. </span>
                        {{ item.descricaoItem ? item.descricaoItem.split(':')[0].trim() : 'Item' }}
                      </p>
                      <!-- Apenas a descrição formatada, sem duplicar o título -->
                      <div class="text-body-2" v-if="item.descricaoItem && item.descricaoItem.includes(':')" v-html="formatItemDescriptionForDisplay(item.descricaoItem, item.descricaoItem.split(':')[0].trim())" />
                      
                      <!-- Critérios de Avaliação Integrados -->
                      <div class="criterios-integrados mt-2">
                        <div v-if="item.pontuacoes?.adequado" class="criterio-item success--text mb-2">
                          <div class="d-flex align-start">
                            <VIcon icon="ri-checkbox-circle-fill" color="success" size="small" class="me-2 mt-1" />
                            <div>
                              <div class="font-weight-medium">Adequado ({{ item.pontuacoes.adequado.pontos.toFixed(2) }} pts)</div>
                              <div class="text-caption">{{ item.pontuacoes.adequado.criterio }}</div>
                            </div>
                          </div>
                        </div>
                        
                        <div v-if="item.pontuacoes?.parcialmenteAdequado && item.pontuacoes.parcialmenteAdequado.criterio && item.pontuacoes.parcialmenteAdequado.criterio.trim() !== '' && item.pontuacoes.parcialmenteAdequado.pontos > 0" class="criterio-item warning--text mb-2">
                          <div class="d-flex align-start">
                            <VIcon icon="ri-checkbox-indeterminate-fill" color="warning" size="small" class="me-2 mt-1" />
                            <div>
                              <div class="font-weight-medium">Parcialmente Adequado ({{ item.pontuacoes.parcialmenteAdequado.pontos.toFixed(2) }} pts)</div>
                              <div class="text-caption">{{ item.pontuacoes.parcialmenteAdequado.criterio }}</div>
                            </div>
                          </div>
                        </div>
                        
                        <div v-if="item.pontuacoes?.inadequado" class="criterio-item error--text">
                          <div class="d-flex align-start">
                            <VIcon icon="ri-close-circle-fill" color="error" size="small" class="me-2 mt-1" />
                            <div>
                              <div class="font-weight-medium">Inadequado ({{ item.pontuacoes.inadequado.pontos.toFixed(2) }} pts)</div>
                              <div class="text-caption">{{ item.pontuacoes.inadequado.criterio }}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td class="text-center">
                      <VRadioGroup v-model="evaluationScores[item.idItem]" :disabled="!simulationStarted" :inline="false">
                        <VRadio v-if="item.pontuacoes?.adequado" :label="`Adequado`" :value="item.pontuacoes.adequado.pontos" density="compact" color="success" />
                        <VRadio v-if="item.pontuacoes?.parcialmenteAdequado && item.pontuacoes.parcialmenteAdequado.criterio && item.pontuacoes.parcialmenteAdequado.criterio.trim() !== '' && item.pontuacoes.parcialmenteAdequado.pontos > 0" :label="`Parc. Adequado`" :value="item.pontuacoes.parcialmenteAdequado.pontos" density="compact" color="warning" />
                        <VRadio v-if="item.pontuacoes?.inadequado" :label="`Inadequado`" :value="item.pontuacoes.inadequado.pontos" density="compact" color="error" />
                      </VRadioGroup>
                    </td>
                  </tr>
                </tbody>
              </VTable>
              <VCardActions class="pa-4">
                <VSpacer />
                <VChip color="primary" size="large" label class="me-2">
                  <strong>Nota Total: {{ totalScore.toFixed(2) }}</strong>
                </VChip>
                <VBtn
                  v-if="simulationEnded"
                  color="primary"
                  @click="submitEvaluation"
                  :disabled="simulationWasManuallyEndedEarly"
                >
                  Submeter Avaliação Final
                </VBtn>
              </VCardActions>
              <VAlert v-if="simulationEnded && simulationWasManuallyEndedEarly" type="warning" density="compact" class="ma-2">
                A estação foi encerrada manualmente. A submissão de nota ainda é permitida, mas o ato fica registrado.
              </VAlert>
              
              <!-- Feedback da Estação (para ator/avaliador - sempre visível) -->
              <VCardText v-if="checklistData?.feedbackEstacao">
                <VExpansionPanels variant="accordion" class="mt-2">
                  <VExpansionPanel>
                    <VExpansionPanelTitle>
                      <div class="d-flex align-center">
                        <VIcon icon="ri-information-line" color="info" class="me-2" />
                        Feedback Técnico da Estação
                      </div>
                    </VExpansionPanelTitle>
                    <VExpansionPanelText>
                      <div v-if="checklistData.feedbackEstacao.resumoTecnico" class="mb-4">
                        <h5 class="text-subtitle-1 font-weight-bold mb-2">Resumo Técnico:</h5>
                        <p class="text-body-2" v-html="checklistData.feedbackEstacao.resumoTecnico"></p>
                      </div>
                      <div v-if="checklistData.feedbackEstacao.fontes">
                        <h5 class="text-subtitle-1 font-weight-bold mb-2">Fontes:</h5>
                        <ul v-if="Array.isArray(checklistData.feedbackEstacao.fontes)" class="text-caption">
                          <li v-for="(fonte, index) in checklistData.feedbackEstacao.fontes" :key="index" class="mb-1">
                            {{ fonte }}
                          </li>
                        </ul>
                        <p v-else class="text-caption" v-html="checklistData.feedbackEstacao.fontes"></p>
                      </div>
                    </VExpansionPanelText>
                  </VExpansionPanel>
                </VExpansionPanels>
              </VCardText>
            </VCard>
          </div>

          <!-- VISÃO DO CANDIDATO -->
          <div v-if="isCandidate">
             <div v-if="!simulationStarted && !simulationEnded">
                <VCard class="mb-6">
                    <VCardTitle>Preparação da Simulação</VCardTitle>
                    <VCardText class="text-center">
                        <div v-if="candidateMeetLink" class="d-flex flex-column gap-3">
                            <VAlert type="info" variant="tonal" title="Comunicação via Google Meet">
                                O avaliador iniciou uma chamada. Por favor, abra o link para participar.
                            </VAlert>
                            <VBtn
                                prepend-icon="ri-vidicon-line"
                                color="primary"
                                @click="openCandidateMeet"
                                :disabled="candidateOpenedMeet"
                            >
                                {{ candidateOpenedMeet ? 'Meet Aberto' : 'Abrir Google Meet' }}
                            </VBtn>
                        </div>

                        <div class="mt-4 pt-4 border-t">
                            <VBtn
                                v-if="!myReadyState"
                                size="large"
                                :color="myReadyState ? 'default' : 'success'"
                                @click="sendReady"
                                :disabled="(!!candidateMeetLink && !candidateOpenedMeet) || !candidateReadyButtonEnabled"
                                >
                                <VIcon :icon="myReadyState ? 'ri-checkbox-circle-line' : 'ri-checkbox-blank-circle-line'" class="me-2"/>
                                {{ myReadyState ? 'Pronto!' : 'Estou Pronto!' }}
                            </VBtn>
                            <VChip v-else color="success" size="large">
                                <VIcon icon="ri-checkbox-circle-line" class="me-2"/>
                                Pronto! Aguardando início...
                            </VChip>
                            <p v-if="!!candidateMeetLink && !candidateOpenedMeet" class="text-caption text-error mt-2">
                                Você precisa abrir o Google Meet antes de ficar pronto.
                            </p>
                        </div>
                    </VCardText>
                </VCard>
            </div>

            <div v-if="simulationStarted">
                <!-- Card para Cenário (CANDIDATO) -->
                <VCard class="mb-6" v-if="stationData.instrucoesParticipante?.cenarioAtendimento">
                    <VCardItem>
                        <template #prepend>
                            <VIcon icon="ri-hospital-line" color="info" />
                        </template>
                        <VCardTitle>Cenário do Atendimento</VCardTitle>
                    </VCardItem>
                    <VCardText class="text-body-1">
                        <p><strong>Nível de Atenção:</strong> {{ stationData.instrucoesParticipante.cenarioAtendimento?.nivelAtencao }}</p>
                        <p><strong>Tipo de Atendimento:</strong> {{ stationData.instrucoesParticipante.cenarioAtendimento?.tipoAtendimento }}</p>
                        <div v-if="stationData.instrucoesParticipante.cenarioAtendimento?.infraestruturaUnidade?.length">
                            <p class="font-weight-bold text-h6 mb-2 d-flex align-center">
                                <VIcon icon="ri-building-2-line" color="primary" class="me-2" size="24" />
                                Infraestrutura:
                            </p>
                            <VCard flat class="bg-primary-lighten-5 pa-2 mb-4">
                                <ul class="tasks-list infra-icons-list pl-2">
                                    <li v-for="(item, index) in processInfrastructureItems(stationData.instrucoesParticipante.cenarioAtendimento.infraestruturaUnidade)" 
                                        :key="`infra-cand-${index}`"
                                        :class="{'sub-item': item.startsWith('- ')}">
                                        <VIcon 
                                          :icon="getInfrastructureIcon(item)" 
                                          :color="getInfrastructureColor(item)" 
                                          class="me-2" 
                                          size="20"
                                          :title="item.startsWith('- ') ? item.substring(2) : item"
                                        />
                                        <span :data-sub-item="item.startsWith('- ') ? 'true' : 'false'">
                                          {{ item.startsWith('- ') ? item.substring(2) : item }}
                                        </span>
                                    </li>
                                </ul>
                            </VCard>
                        </div>
                    </VCardText>
                </VCard>

                <!-- Card para Descrição do Caso (CANDIDATO) -->
                <VCard class="mb-6" v-if="stationData.instrucoesParticipante?.descricaoCasoCompleta">
                    <VCardItem>
                        <template #prepend>
                            <VIcon icon="ri-file-text-line" color="primary" />
                        </template>
                        <VCardTitle>Descrição do Caso</VCardTitle>
                    </VCardItem>
                    <VCardText class="text-body-1" v-if="stationData.instrucoesParticipante" v-html="stationData.instrucoesParticipante.descricaoCasoCompleta" />
                </VCard>

                <!-- Card para Tarefas (CANDIDATO - CORPO PRINCIPAL) -->
                <VCard class="mb-6" v-if="simulationStarted && stationData.instrucoesParticipante?.tarefasPrincipais?.length">
                    <VCardItem>
                        <template #prepend>
                            <VIcon icon="ri-task-line" color="success" />
                        </template>
                        <VCardTitle>Suas Tarefas</VCardTitle>
                    </VCardItem>
                    <VCardText class="text-body-1">
                        <ul class="tasks-list pl-5">
                            <li v-for="(tarefa, i) in stationData.instrucoesParticipante.tarefasPrincipais" :key="`cand-task-main-${i}`" v-html="tarefa"></li>
                        </ul>
                    </VCardText>
                </VCard>

                <VCard 
                  :class="[
                    'mb-6 impressos-candidate-card',
                    isDarkTheme ? 'impressos-candidate-card--dark' : 'impressos-candidate-card--light'
                  ]"
                >
                    <VCardTitle>IMPRESSOS RECEBIDOS</VCardTitle>
                    <VCardText>
                        <VAlert v-if="Object.keys(releasedData).length === 0" type="info" variant="tonal">
                        Nenhum "impresso" recebido ainda.
                        </VAlert>
                        <VExpansionPanels v-else variant="inset" class="mt-4">
                        <VExpansionPanel v-for="impresso in releasedData" :key="'released-'+impresso.idImpresso">
                            <VExpansionPanelTitle>{{ impresso.tituloImpresso }}</VExpansionPanelTitle>
                            <VExpansionPanelText class="text-body-1">
                            <div v-if="impresso.tipoConteudo === 'texto_simples'" v-html="impresso.conteudo.texto" />
                            <div v-else-if="impresso.tipoConteudo === 'imagem_com_texto'">
                                <p v-if="impresso.conteudo.textoDescritivo" v-html="impresso.conteudo.textoDescritivo"></p>
                                <img 
                                  v-if="impresso.conteudo.caminhoImagem" 
                                  :src="getImageSource(impresso.conteudo.caminhoImagem, getImageId(impresso.idImpresso, 'candidate-img-texto'))" 
                                  :alt="impresso.tituloImpresso" 
                                  class="impresso-imagem impresso-imagem-clickable"
                                  @click="openImageZoom(getImageSource(impresso.conteudo.caminhoImagem, getImageId(impresso.idImpresso, 'candidate-img-texto')), impresso.tituloImpresso)"
                                  @error="handleImageError(impresso.conteudo.caminhoImagem, getImageId(impresso.idImpresso, 'candidate-img-texto'))"
                                  @load="handleImageLoad(getImageId(impresso.idImpresso, 'candidate-img-texto'))"
                                />
                                <p v-if="impresso.conteudo.legendaImagem"><em>{{ impresso.conteudo.legendaImagem }}</em></p>
                                <div v-if="impresso.conteudo.laudo" class="laudo-impresso"><pre>{{ impresso.conteudo.laudo }}</pre></div>
                            </div>
                            <div v-else-if="impresso.tipoConteudo === 'lista_chave_valor_secoes'" class="mt-4">
                                <div v-for="(secao, idxS) in impresso.conteudo.secoes" :key="`cand-sec-${impresso.idImpresso}-${idxS}`">
                                    <h6 class="text-subtitle-1 font-weight-bold mt-2" v-if="secao.tituloSecao">{{ secao.tituloSecao }}</h6>
                                    <div class="chave-valor-list">
                                        <div v-for="(itemSec, idxI) in secao.itens" :key="`cand-item-${impresso.idImpresso}-${idxS}-${idxI}`" class="chave-valor-item">
                                            <strong>{{ itemSec.chave }}:</strong> <span v-html="itemSec.valor"></span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div v-else-if="impresso.tipoConteudo === 'tabela_objetos'">
                                <VTable>
                                    <thead>
                                        <tr><th v-for="cab in impresso.conteudo.cabecalhos" :key="`cand-th-${cab.key}`">{{ cab.label }}</th></tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="(linha, idxL) in impresso.conteudo.linhas" :key="`cand-lin-${impresso.idImpresso}-${idxL}`">
                                            <td v-for="cab in impresso.conteudo.cabecalhos" :key="`cand-cel-${impresso.idImpresso}-${idxL}-${cab.key}`" v-html="linha[cab.key]"></td>
                                        </tr>
                                    </tbody>
                                </VTable>
                            </div>
                            <div v-else-if="impresso.tipoConteudo === 'imagem_descritiva'">
                                <p v-if="impresso.conteudo.descricao" v-html="impresso.conteudo.descricao"></p>
                                <img 
                                  v-if="impresso.conteudo.caminhoImagem" 
                                  :src="getImageSource(impresso.conteudo.caminhoImagem, getImageId(impresso.idImpresso, 'candidate-img-desc'))" 
                                  :alt="impresso.tituloImpresso" 
                                  class="impresso-imagem"
                                  @error="handleImageError(impresso.conteudo.caminhoImagem, getImageId(impresso.idImpresso, 'candidate-img-desc'))"
                                  @load="handleImageLoad(getImageId(impresso.idImpresso, 'candidate-img-desc'))"
                                />
                            </div>
                            <pre v-else>{{ impresso.conteudo }}</pre>
                            </VExpansionPanelText>
                        </VExpansionPanel>
                        </VExpansionPanels>
                    </VCardText>
                </VCard>

                <!-- Card do Checklist de Avaliação (PEP) -->
                <VCard 
                  :class="[
                    'mb-6 checklist-candidate-card',
                    isDarkTheme ? 'checklist-candidate-card--dark' : 'checklist-candidate-card--light'
                  ]"
                  v-if="checklistData?.itensAvaliacao?.length > 0 && isChecklistVisibleForCandidate"
                >
                  <VCardItem>
                    <VCardTitle class="d-flex align-center">
                      <!-- Mesmo ícone colorido para o PEP na visão do candidato -->
                      <VIcon color="black" icon="ri-file-list-3-fill" size="large" class="me-2" />
                      Checklist de Avaliação (PEP)
                    </VCardTitle>
                  </VCardItem>
                  
                  <VTable class="pep-table">
                      <thead>
                          <tr>
                              <th class="text-left">Item</th>
                              <th class="text-center" style="width: 20%;">Sua Pontuação</th>
                          </tr>
                      </thead>
                      <tbody>
                          <tr v-for="(item, index) in checklistData.itensAvaliacao" :key="'cand-chk-' + item.idItem">
                              <td>
                                <!-- Conteúdo do Item -->
                                <p class="font-weight-bold">
                                  <span v-if="item.itemNumeroOficial">{{ item.itemNumeroOficial }}. </span>
                                  {{ item.descricaoItem ? item.descricaoItem.split(':')[0].trim() : 'Item' }}
                                </p>
                                <!-- Apenas a descrição formatada, sem duplicar o título -->
                                <div class="text-body-2" v-if="item.descricaoItem && item.descricaoItem.includes(':')" v-html="formatItemDescriptionForDisplay(item.descricaoItem, item.descricaoItem.split(':')[0].trim())" />
                                
                                <!-- Critérios de Avaliação Integrados para o Candidato -->
                                <div class="criterios-integrados mt-2">
                                  <div v-if="item.pontuacoes?.adequado" 
                                    :class="{'criterio-item': true, 'criterio-selecionado': candidateReceivedScores[item.idItem] === item.pontuacoes.adequado.pontos, 'mb-2': true}">
                                    <div class="d-flex align-start">
                                      <VIcon 
                                        :icon="candidateReceivedScores[item.idItem] === item.pontuacoes.adequado.pontos ? 'ri-checkbox-circle-fill' : 'ri-checkbox-blank-circle-line'" 
                                        color="success" 
                                        size="small" 
                                        class="me-2 mt-1"
                                      />
                                      <div>
                                        <div class="font-weight-medium">Adequado ({{ item.pontuacoes.adequado.pontos.toFixed(2) }} pts)</div>
                                        <div class="text-caption">{{ item.pontuacoes.adequado.criterio }}</div>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div v-if="item.pontuacoes?.parcialmenteAdequado && item.pontuacoes.parcialmenteAdequado.criterio && item.pontuacoes.parcialmenteAdequado.criterio.trim() !== '' && item.pontuacoes.parcialmenteAdequado.pontos > 0" 
                                    :class="{'criterio-item': true, 'criterio-selecionado': candidateReceivedScores[item.idItem] === item.pontuacoes.parcialmenteAdequado.pontos, 'mb-2': true}">
                                    <div class="d-flex align-start">
                                      <VIcon 
                                        :icon="candidateReceivedScores[item.idItem] === item.pontuacoes.parcialmenteAdequado.pontos ? 'ri-checkbox-indeterminate-fill' : 'ri-checkbox-blank-circle-line'" 
                                        color="warning" 
                                        size="small" 
                                        class="me-2 mt-1"
                                      />
                                      <div>
                                        <div class="font-weight-medium">Parcialmente Adequado ({{ item.pontuacoes.parcialmenteAdequado.pontos.toFixed(2) }} pts)</div>
                                        <div class="text-caption">{{ item.pontuacoes.parcialmenteAdequado.criterio }}</div>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div v-if="item.pontuacoes?.inadequado" 
                                    :class="{'criterio-item': true, 'criterio-selecionado': candidateReceivedScores[item.idItem] === item.pontuacoes.inadequado.pontos}">
                                    <div class="d-flex align-start">
                                      <VIcon 
                                        :icon="candidateReceivedScores[item.idItem] === item.pontuacoes.inadequado.pontos ? 'ri-close-circle-fill' : 'ri-checkbox-blank-circle-line'" 
                                        color="error" 
                                        size="small" 
                                        class="me-2 mt-1"
                                      />
                                      <div>
                                        <div class="font-weight-medium">Inadequado ({{ item.pontuacoes.inadequado.pontos.toFixed(2) }} pts)</div>
                                        <div class="text-caption">{{ item.pontuacoes.inadequado.criterio }}</div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td class="text-center">
                                <!-- Visualização da pontuação do candidato -->
                                <div v-if="candidateReceivedScores[item.idItem] !== undefined">
                                  <VChip 
                                    :color="getEvaluationColor(item, candidateReceivedScores[item.idItem])" 
                                    variant="tonal"
                                    class="mb-1"
                                  >
                                    {{ getEvaluationLabel(item, candidateReceivedScores[item.idItem]) }}
                                  </VChip>
                                  <div class="text-caption mt-1">{{ parseFloat(candidateReceivedScores[item.idItem]).toFixed(2) }} pts</div>
                                </div>
                                <VChip v-else color="grey-lighten-1" variant="tonal">Não avaliado</VChip>
                              </td>
                          </tr>
                      </tbody>
                  </VTable>
                  
                  <!-- Resumo da nota total - movido para o final -->
                  <VCardText v-if="candidateReceivedTotalScore > 0" class="pt-4">
                    <VAlert
                      variant="tonal"
                      :color="candidateReceivedTotalScore >= 7 ? 'success' : candidateReceivedTotalScore >= 5 ? 'warning' : 'error'"
                      class="mb-4"
                    >
                      <div class="d-flex justify-space-between align-center">
                        <div>
                          <div class="text-h6 mb-1">Sua nota final</div>
                          <div class="text-body-2">
                            {{ candidateReceivedTotalScore >= 7 ? 'Parabéns!' : candidateReceivedTotalScore >= 5 ? 'Satisfatório' : 'Precisa melhorar' }}
                          </div>
                        </div>
                        <div class="text-h4 font-weight-bold">
                          {{ candidateReceivedTotalScore.toFixed(2) }}
                        </div>
                      </div>
                    </VAlert>
                  </VCardText>
                  
                  <!-- Feedback da Estação (para o candidato - só após término) -->
                  <VCardText v-if="checklistData?.feedbackEstacao && simulationEnded">
                    <VExpansionPanels variant="accordion" class="mt-2">
                      <VExpansionPanel>
                        <VExpansionPanelTitle>
                          <div class="d-flex align-center">
                            <VIcon icon="ri-information-line" color="info" class="me-2" />
                            Feedback Técnico da Estação
                          </div>
                        </VExpansionPanelTitle>
                        <VExpansionPanelText>
                          <div v-if="checklistData.feedbackEstacao.resumoTecnico" class="mb-4">
                            <h5 class="text-subtitle-1 font-weight-bold mb-2">Resumo Técnico:</h5>
                            <p class="text-body-2" v-html="checklistData.feedbackEstacao.resumoTecnico"></p>
                          </div>
                          <div v-if="checklistData.feedbackEstacao.fontes">
                            <h5 class="text-subtitle-1 font-weight-bold mb-2">Fontes:</h5>
                            <ul v-if="Array.isArray(checklistData.feedbackEstacao.fontes)" class="text-caption">
                              <li v-for="(fonte, index) in checklistData.feedbackEstacao.fontes" :key="index" class="mb-1">
                                {{ fonte }}
                              </li>
                            </ul>
                            <p v-else class="text-caption" v-html="checklistData.feedbackEstacao.fontes"></p>
                          </div>
                        </VExpansionPanelText>
                      </VExpansionPanel>
                    </VExpansionPanels>
                  </VCardText>
                </VCard>

                <!-- Card separado para mostrar a nota mesmo sem o checklist visível -->
                <VCard 
                  :class="[
                    'mb-6 score-card',
                    isDarkTheme ? 'score-card--dark' : 'score-card--light'
                  ]"
                  v-if="simulationEnded && candidateReceivedTotalScore > 0 && !isChecklistVisibleForCandidate"
                >
                  <VCardItem>
                    <VCardTitle class="d-flex align-center">
                      <VIcon color="primary" icon="ri-star-fill" size="large" class="me-2" />
                      Resultado da Avaliação
                    </VCardTitle>
                  </VCardItem>
                  <VCardText>
                    <VAlert
                      variant="tonal"
                      :color="candidateReceivedTotalScore >= 7 ? 'success' : candidateReceivedTotalScore >= 5 ? 'warning' : 'error'"
                      class="mb-2"
                    >
                      <div class="d-flex justify-space-between align-center">
                        <div>
                          <div class="text-h6 mb-1">Sua nota final</div>
                          <div class="text-body-2">
                            {{ candidateReceivedTotalScore >= 7 ? 'Parabéns!' : candidateReceivedTotalScore >= 5 ? 'Satisfatório' : 'Precisa melhorar' }}
                          </div>
                        </div>
                        <div class="text-h4 font-weight-bold">
                          {{ candidateReceivedTotalScore.toFixed(2) }}
                        </div>
                      </div>
                    </VAlert>
                    <p class="text-body-2 mt-2">
                      O avaliador ainda não liberou o PEP detalhado da sua avaliação. Você receberá mais detalhes em breve.
                    </p>
                  </VCardText>
                </VCard>
            </div>
          </div>
        </VCol>

        <!-- Coluna Direita Fixa (Sidebar do Candidato) -->
        <VCol v-if="isCandidate" cols="12" md="4">
            <div class="candidate-sidebar">
                <VCard class="mb-6">
                    <VCardTitle class="text-center">Tempo Restante</VCardTitle>
                    <VCardText>
                        <div class="timer-display-candidate" :class="{ 'ended': simulationEnded }">
                            <VIcon icon="ri-time-line" class="me-1" />
                            {{ timerDisplay }}
                        </div>
                    </VCardText>
                </VCard>
                <VCard v-if="simulationStarted && stationData?.instrucoesParticipante?.tarefasPrincipais?.length">
                    <VCardItem>
                        <template #prepend>
                            <VIcon icon="ri-task-line" color="success" />
                        </template>
                        <VCardTitle>Suas Tarefas</VCardTitle>
                    </VCardItem>
                    <VCardText class="text-body-1">
                        <ul class="tasks-list pl-5">
                            <li v-for="(tarefa, i) in stationData.instrucoesParticipante.tarefasPrincipais" :key="`cand-task-sidebar-${i}`" v-html="tarefa"></li>
                        </ul>
                    </VCardText>
                </VCard>

                <!-- Orientações do Candidato na Sidebar -->
                <VCard v-if="stationData?.roteiroCandidato || stationData?.orientacoesCandidato" class="mb-6">
                    <VCardItem>
                        <template #prepend>
                            <VIcon icon="ri-user-line" color="primary" />
                        </template>
                        <VCardTitle>Orientações</VCardTitle>
                    </VCardItem>
                    <VCardText class="text-body-1">
                        <div v-if="stationData.roteiroCandidato" class="mb-4">
                            <h6 class="text-subtitle-1 font-weight-bold mb-2">Instruções:</h6>
                            <div v-html="processRoteiro(stationData.roteiroCandidato)"></div>
                        </div>
                        <div v-if="stationData.orientacoesCandidato">
                            <h6 class="text-subtitle-1 font-weight-bold mb-2">Orientações Adicionais:</h6>
                            <div v-html="stationData.orientacoesCandidato"></div>
                        </div>
                    </VCardText>
                </VCard>
            </div>
        </VCol>
      </VRow>
    </div>

    <!-- Diálogo de Convite Interno -->
    <VDialog v-model="internalInviteDialog" max-width="500">
      <VCard>
        <VCardTitle>Convite para Simulação</VCardTitle>
        <VCardText>
          <p><strong>De:</strong> {{ internalInviteData.from }}</p>
          <p><strong>Estação:</strong> {{ internalInviteData.stationTitle }}</p>
          <p><strong>Duração:</strong> {{ selectedDurationMinutes }} min</p>
          <a v-if="internalInviteData.meet" :href="internalInviteData.meet" target="_blank">Link do Google Meet</a>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn text @click="declineInternalInvite">Recusar</VBtn>
          <VBtn color="primary" @click="acceptInternalInvite">Aceitar</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Snackbar de Notificação -->
    <VSnackbar v-model="showNotificationSnackbar" :color="notificationColor" timeout="5000">
      {{ notificationMessage }}
    </VSnackbar>

    <!-- Modal de Zoom para Imagens -->
    <VDialog v-model="imageZoomDialog" max-width="95vw" max-height="95vh" persistent>
      <VCard class="image-zoom-card">
        <VCardTitle class="pa-2 d-flex justify-space-between align-center">
          <span class="text-h6">{{ selectedImageAlt }}</span>
          <VBtn icon variant="text" @click="closeImageZoom">
            <VIcon>mdi-close</VIcon>
          </VBtn>
        </VCardTitle>
        <VCardText class="pa-0 zoom-container-simple">
          <VImg 
            :src="selectedImageForZoom" 
            :alt="selectedImageAlt"
            :height="600"
            :max-height="80 + 'vh'"
            class="zoom-image-simple"
            @click="closeImageZoom"
            @error="handleZoomImageError"
            @load="handleZoomImageLoad"
          />
        </VCardText>
        <VCardActions class="pa-2 justify-center">
          <VBtn color="primary" variant="outlined" @click="closeImageZoom">
            <VIcon start>mdi-close</VIcon>
            Fechar
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>

  <!-- AgentAssistant component removed (legacy agent) -->
</template>

<style scoped>
.simulation-page-container {
    font-size: 1.1rem; /* Aumenta a fonte base */
}

.text-body-1, .text-body-2, .text-caption, .v-list-item-title, .v-list-item-subtitle {
    font-size: inherit !important; /* Garante que os componentes filhos herdem a fonte aumentada */
}

.timer-display {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 1.25rem;
  font-weight: 500;
  background-color: rgba(var(--v-theme-on-surface), 0.04);
  display: inline-flex;
  align-items: center;
}

.timer-display.ended {
  border-color: rgb(var(--v-theme-error));
  background-color: rgba(var(--v-theme-error), 0.1);
  color: rgb(var(--v-theme-error));
}

.timer-display-candidate {
    border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
    border-radius: 8px;
    padding: 16px;
    font-size: 2rem; /* Fonte maior para o timer do candidato */
    font-weight: 500;
    text-align: center;
    background-color: rgba(var(--v-theme-on-surface), 0.04);
    display: inline-flex;
    align-items: center;
}

.timer-display-candidate.ended {
    border-color: rgb(var(--v-theme-error));
    background-color: rgba(var(--v-theme-error), 0.1);
    color: rgb(var(--v-theme-error));
}

.cursor-pointer {
  cursor: pointer;
}

.impresso-imagem {
  width: 650px;
  height: 480px;
  max-width: 100%;
  object-fit: contain;
  border: 1px solid rgba(var(--v-theme-outline), 0.3);
  margin: 10px 0;
  background-color: rgba(var(--v-theme-surface-variant), 0.5);
}

/* Estilo para imagens clicáveis */
.impresso-imagem-clickable {
  cursor: pointer;
  transition: all 0.3s ease;
}

.impresso-imagem-clickable:hover {
  transform: scale(1.02);
  border-color: rgba(var(--v-theme-primary), 0.6);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

/* Responsividade para telas menores */
@media (max-width: 768px) {
  .impresso-imagem {
    width: 100%;
    height: auto;
    max-width: 650px;
    max-height: 480px;
  }
}

/* Para tablets */
@media (max-width: 1024px) and (min-width: 769px) {
  .impresso-imagem {
    width: 100%;
    height: auto;
    max-width: 650px;
    max-height: 480px;
  }
}

.laudo-impresso pre {
  white-space: pre-wrap;
  font-family: monospace;
  font-size: 0.9rem;
  background-color: rgba(var(--v-theme-surface-variant), 0.5);
  padding: 10px;
  border-radius: 4px;
}

/* Ajuste para modo escuro - remove sombras e melhora legibilidade */
.v-theme--dark .laudo-impresso pre {
  background-color: rgba(var(--v-theme-surface), 0.2);
  color: rgb(var(--v-theme-on-surface));
  text-shadow: none !important;
  box-shadow: none !important;
}

/* Removido o hover que causava sombra 
/* Remova completamente qualquer efeito de hover nos itens da lista */
.roteiro-list li:hover {
  background-color: transparent !important;
}

/* Estilização da sidebar do candidato */
.candidate-sidebar {
    position: sticky;
    top: 80px; /* Ajuste conforme a altura do seu header/app-bar */
}

/* NOVO: Estilização específica para o texto das tarefas na sidebar */
.candidate-sidebar .tasks-list {
    padding-left: 20px;
    line-height: 1.6;
    font-size: 0.85rem; /* Reduzido 1-2 números menores */
    color: rgba(var(--v-theme-error), 0.8); /* Vermelho para destaque do candidato */
    font-weight: 600; /* Bold para melhor legibilidade com fonte menor */
}

/* Estilos melhorados para marcação de parágrafos */
.paragraph-item {
  transition: background-color 0.2s ease;
  margin-bottom: 0;
  border-radius: 4px;
}

/* Removido o hover que causava sombra 
.paragraph-item:hover {
  background-color: rgba(var(--v-theme-warning), 0.08);
}
*/

/* Novos estilos de marcação - aplicados apenas ao texto */
span.marked-warning {
  display: inline-block;
  background-color: rgba(var(--v-theme-warning), 0.2);
  border-radius: 3px;
  padding: 0 2px;
  pointer-events: auto;
}

span.marked-warning p {
  background-color: rgba(var(--v-theme-warning), 0.2);
  pointer-events: auto;
}

.paragraph-item.marked-warning div * {
  background-color: transparent;
}

.paragraph-item.marked-primary div {
  display: inline-block;
  background-color: rgba(var(--v-theme-primary), 0.15);
  border-radius: 3px;
  color: rgb(var(--v-theme-primary));
  padding: 0 2px;
}

span.marked-primary {
  display: inline-block;
  background-color: rgba(var(--v-theme-primary), 0.15);
  border-radius: 3px;
  color: rgb(var(--v-theme-primary));
  padding: 0 2px;
  pointer-events: auto;
}

span.marked-primary p {
  background-color: rgba(var(--v-theme-primary), 0.15);
  color: rgb(var(--v-theme-primary));
  pointer-events: auto;
}

.paragraph-item.marked-primary div * {
  background-color: transparent;
  color: rgb(var(--v-theme-primary));
}

/* Novos estilos para marcação de contexto - aplicados apenas ao texto */
/* Estilos de marcação para contextos com !important para máxima prioridade */
.marked-context-warning {
  display: inline-block !important;
  background-color: rgba(var(--v-theme-warning), 0.2) !important;
  padding: 0 2px !important;
  border-radius: 3px !important;
  box-shadow: none !important;
  position: relative !important;
  z-index: 10 !important; /* Valor alto para garantir que fique acima de outros elementos */
  cursor: pointer !important;
}

.marked-context-warning * {
  background-color: transparent !important;
}

.marked-context-warning:hover,
.marked-context-warning:active,
.marked-context-warning:focus {
  background-color: rgba(var(--v-theme-warning), 0.2) !important;
}

.marked-context-warning * {
  background-color: transparent !important;
}

.marked-context-primary {
  display: inline-block !important;
  background-color: rgba(var(--v-theme-primary), 0.15) !important;
  color: rgb(var(--v-theme-primary)) !important;
  padding: 0 2px !important;
  border-radius: 3px !important;
  box-shadow: none !important;
  position: relative !important;
  z-index: 10 !important; /* Valor alto para garantir que fique acima de outros elementos */
  cursor: pointer !important;
}

.marked-context-primary * {
  background-color: transparent !important;
  color: rgb(var(--v-theme-primary)) !important;
}

.marked-context-primary:hover,
.marked-context-primary:active,
.marked-context-primary:focus {
  background-color: rgba(var(--v-theme-primary), 0.15) !important;
  color: rgb(var(--v-theme-primary)) !important;
}

.marked-context-primary * {
  background-color: transparent !important;
  color: rgb(var(--v-theme-primary)) !important;
}

/* Garante que não haverá sombra ou hover em nenhum elemento */
.roteiro-list li,
.roteiro-list .font-weight-bold,
.roteiro-list .paragraph-item,
.roteiro-list span,
.marked-context-warning,
.marked-context-primary,
.marked-warning,
.marked-primary {
  box-shadow: none !important;
  outline: none !important;
  text-shadow: none !important;
}

/* Desativa qualquer efeito de hover, mas preserva as marcações */
.roteiro-list *:hover {
  box-shadow: none !important;
}

/* Regra específica para garantir que o hover não afete elementos marcados */
.roteiro-list li:hover span[data-marked="true"].marked-context-warning {
  background-color: rgba(var(--v-theme-warning), 0.2) !important;
}

.roteiro-list li:hover span[data-marked="true"].marked-context-primary {
  background-color: rgba(var(--v-theme-primary), 0.15) !important;
}

/* Garante que a área clicável seja suficiente */
.roteiro-list li .font-weight-bold {
  margin-bottom: 0 !important; 
  padding: 2px 4px !important;
  border-radius: 4px;
}

.roteiro-list li .mt-2 {
  margin-top: 2px !important;
}

/* Redução ainda mais agressiva do espaçamento entre linhas */
.roteiro-list p {
  margin-bottom: 0 !important;
  margin-top: 0 !important;
  line-height: 1.1 !important;
}

/* Ajuste específico para o conteúdo da informação */
.roteiro-list .border-s-2 {
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  margin-top: 1px !important;
  margin-bottom: 0 !important;
}

/* Melhoria nos botões de impressos */
.impresso-btn {
  margin-bottom: 4px;
  border-radius: 6px;
  font-weight: 500;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  transition: transform 0.1s ease, box-shadow 0.1s ease;
}

.impresso-btn:hover {
  background-color: rgb(var(--v-theme-success)) !important;
  transform: translateY(-1px);
  box-shadow: 0 2px 5px rgba(0,0,0,0.15);
}

.impresso-btn:active {
  transform: translateY(0);
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}

.impresso-control-item {
  margin-bottom: 8px;
}

/* Estilos para textos em maiúsculo */
.uppercase-title {
  color: rgb(var(--v-theme-primary));
}

.uppercase-content {
  color: rgb(var(--v-theme-primary));
}

.bg-primary-lighten-4 {
  background-color: rgba(var(--v-theme-primary), 0.15) !important;
}

/* Aplicar a marcação de cores apenas no texto, não em áreas vazias - Estilos não utilizados removidos */

/* Estilo para itens em maiúsculo detectados no processamento do roteiro */
.uppercase-item strong {
  color: rgb(var(--v-theme-primary));
}

.uppercase-item {
  color: rgb(var(--v-theme-primary));
}

/* Melhorias na manipulação de eventos para evitar problemas de reatividade */
.roteiro-list .paragraph-item,
.roteiro-list .font-weight-bold {
  isolation: isolate;
  position: relative;
  z-index: 1;
}

/* Garante que o evento click seja corretamente capturado */
.roteiro-list span {
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
}

/* Estilos para a lista de infraestrutura */
.infra-icons-list {
  list-style-type: none;
  padding-left: 0.5rem;
}

.infra-icons-list li {
  margin-bottom: 8px;
  padding: 4px 8px;
  border-radius: 4px;
  display: flex;
  align-items: center;
}

/* Estilo para sub-itens de infraestrutura */
.infra-icons-list li:has(span:first-child:contains('- ')) {
  margin-left: 1.5rem;
  margin-top: -4px;
  margin-bottom: 4px;
  padding-left: 0;
  color: rgba(var(--v-theme-on-surface), 0.85);
  font-size: 0.95rem;
}

/* Aplica estilo quando o item começa com '- ' */
.infra-icons-list li span[data-sub-item="true"] {
  opacity: 0.85;
}

/* Estilos para o PEP (Checklist de Avaliação) */
.criterios-list {
  background-color: transparent !important;
  padding: 0 !important;
}

.criterios-list .v-list-item {
  min-height: auto !important;
  padding: 4px 8px !important;
  margin-bottom: 4px !important;
  border-radius: 4px;
}

.criterios-list .v-list-item-title {
  font-size: 0.85rem !important;
  line-height: 1.2 !important;
}

.criterios-list .v-list-item-subtitle {
  font-size: 0.75rem !important;
  line-height: 1.3 !important;
  opacity: 0.85;
  white-space: normal !important;
}

.criterio-selecionado {
  background-color: rgba(var(--v-theme-surface-variant), 0.5) !important;
  margin-top: -4px;
  margin-bottom: 4px;
  padding-left: 0;
  color: rgba(var(--v-theme-on-surface), 0.85);
  font-size: 0.95rem;
}

/* === TEMA ESCURO E CLARO - CARDS DO SIMULADOR === */

/* Card do container principal */
.simulation-page-container--light {
  background-color: rgba(var(--v-theme-surface)) !important;
  color: rgba(var(--v-theme-on-surface)) !important;
}

.simulation-page-container--dark {
  background-color: rgba(var(--v-theme-surface)) !important;
  color: rgba(var(--v-theme-on-surface)) !important;
}

/* Card principal do header */
.main-header-card--light {
  background-color: rgba(var(--v-theme-surface)) !important;
  border: 1px solid rgba(var(--v-theme-outline), 0.2) !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
}

.main-header-card--dark {
  background-color: rgba(var(--v-theme-surface)) !important;
  border: 1px solid rgba(var(--v-theme-outline), 0.3) !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
}

.main-header-card--light .v-card-title,
.main-header-card--light .v-card-text {
  color: rgba(var(--v-theme-on-surface)) !important;
}

.main-header-card--dark .v-card-title,
.main-header-card--dark .v-card-text {
  color: rgba(var(--v-theme-on-surface)) !important;
}

/* Card do candidato */
.candidate-card--light {
  background-color: rgba(var(--v-theme-surface)) !important;
  border: 1px solid rgba(var(--v-theme-primary), 0.2) !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
}

.candidate-card--dark {
  background-color: rgba(var(--v-theme-surface)) !important;
  border: 1px solid rgba(var(--v-theme-primary), 0.3) !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
}

.candidate-card--light .v-card-title,
.candidate-card--light .v-card-text {
  color: rgba(var(--v-theme-on-surface)) !important;
}

.candidate-card--dark .v-card-title,
.candidate-card--dark .v-card-text {
  color: rgba(var(--v-theme-on-surface)) !important;
}

/* Card de preparação */
.preparation-card--light {
  background-color: rgba(var(--v-theme-surface)) !important;
  border: 1px solid rgba(var(--v-theme-outline), 0.2) !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
}

.preparation-card--dark {
  background-color: rgba(var(--v-theme-surface)) !important;
  border: 1px solid rgba(var(--v-theme-outline), 0.3) !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
}

.preparation-card--light .v-card-title,
.preparation-card--light .v-card-text {
  color: rgba(var(--v-theme-on-surface)) !important;
}

.preparation-card--dark .v-card-title,
.preparation-card--dark .v-card-text {
  color: rgba(var(--v-theme-on-surface)) !important;
}

/* Card do cenário */
.scenario-card--light {
  background-color: rgba(var(--v-theme-surface)) !important;
  border: 1px solid rgba(var(--v-theme-outline), 0.2) !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
}

.scenario-card--dark {
  background-color: rgba(var(--v-theme-surface)) !important;
  border: 1px solid rgba(var(--v-theme-outline), 0.3) !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
}

.scenario-card--light .v-card-title,
.scenario-card--light .v-card-text {
  color: rgba(var(--v-theme-on-surface)) !important;
}

.scenario-card--dark .v-card-title,
.scenario-card--dark .v-card-text {
  color: rgba(var(--v-theme-on-surface)) !important;
}

/* Card de infraestrutura */
.infrastructure-card--light {
  background-color: rgba(var(--v-theme-surface)) !important;
  border: 1px solid rgba(var(--v-theme-outline), 0.2) !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
}

.infrastructure-card--dark {
  background-color: rgba(var(--v-theme-surface)) !important;
  border: 1px solid rgba(var(--v-theme-outline), 0.3) !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
}

.infrastructure-card--light .v-card-title,
.infrastructure-card--light .v-card-text {
  color: rgba(var(--v-theme-on-surface)) !important;
}

.infrastructure-card--dark .v-card-title,
.infrastructure-card--dark .v-card-text {
  color: rgba(var(--v-theme-on-surface)) !important;
}

/* Card de descrição do caso */
.case-description-card--light {
  background-color: rgba(var(--v-theme-surface)) !important;
  border: 1px solid rgba(var(--v-theme-outline), 0.2) !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
}

.case-description-card--dark {
  background-color: rgba(var(--v-theme-surface)) !important;
  border: 1px solid rgba(var(--v-theme-outline), 0.3) !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
}

.case-description-card--light .v-card-title,
.case-description-card--light .v-card-text {
  color: rgba(var(--v-theme-on-surface)) !important;
}

.case-description-card--dark .v-card-title,
.case-description-card--dark .v-card-text {
  color: rgba(var(--v-theme-on-surface)) !important;
}

/* Card de tarefas */
.tasks-card--light {
  background-color: rgba(var(--v-theme-surface)) !important;
  border: 1px solid rgba(var(--v-theme-outline), 0.2) !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
}

.tasks-card--dark {
  background-color: rgba(var(--v-theme-surface)) !important;
  border: 1px solid rgba(var(--v-theme-outline), 0.3) !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
}

.tasks-card--light .v-card-title,
.tasks-card--light .v-card-text {
  color: rgba(var(--v-theme-on-surface)) !important;
}

.tasks-card--dark .v-card-title,
.tasks-card--dark .v-card-text {
  color: rgba(var(--v-theme-on-surface)) !important;
}

/* Card de script */
.script-card--light {
  background-color: rgba(var(--v-theme-surface)) !important;
  border: 1px solid rgba(var(--v-theme-outline), 0.2) !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
}

.script-card--dark {
  background-color: rgba(var(--v-theme-surface)) !important;
  border: 1px solid rgba(var(--v-theme-outline), 0.3) !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
}

.script-card--light .v-card-title,
.script-card--light .v-card-text {
  color: rgba(var(--v-theme-on-surface)) !important;
}

.script-card--dark .v-card-title,
.script-card--dark .v-card-text {
  color: rgba(var(--v-theme-on-surface)) !important;
}

/* Cards de impressos */
.impressos-actor-card--light,
.impressos-candidate-card--light {
  background-color: rgba(var(--v-theme-surface)) !important;
  border: 1px solid rgba(var(--v-theme-outline), 0.2) !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
}

.impressos-actor-card--dark,
.impressos-candidate-card--dark {
  background-color: rgba(var(--v-theme-surface)) !important;
  border: 1px solid rgba(var(--v-theme-outline), 0.3) !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
}

.impressos-actor-card--light .v-card-title,
.impressos-actor-card--light .v-card-text,
.impressos-candidate-card--light .v-card-title,
.impressos-candidate-card--light .v-card-text {
  color: rgba(var(--v-theme-on-surface)) !important;
}

.impressos-actor-card--dark .v-card-title,
.impressos-actor-card--dark .v-card-text,
.impressos-candidate-card--dark .v-card-title,
.impressos-candidate-card--dark .v-card-text {
  color: rgba(var(--v-theme-on-surface)) !important;
}

/* Cards de checklist */
.checklist-evaluator-card--light,
.checklist-candidate-card--light {
  background-color: rgba(var(--v-theme-surface)) !important;
  border: 1px solid rgba(var(--v-theme-outline), 0.2) !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
}

.checklist-evaluator-card--dark,
.checklist-candidate-card--dark {
  background-color: rgba(var(--v-theme-surface)) !important;
  border: 1px solid rgba(var(--v-theme-outline), 0.3) !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
}

.checklist-evaluator-card--light .v-card-title,
.checklist-evaluator-card--light .v-card-text,
.checklist-candidate-card--light .v-card-title,
.checklist-candidate-card--light .v-card-text {
  color: rgba(var(--v-theme-on-surface)) !important;
}

.checklist-evaluator-card--dark .v-card-title,
.checklist-evaluator-card--dark .v-card-text,
.checklist-candidate-card--dark .v-card-title,
.checklist-candidate-card--dark .v-card-text {
  color: rgba(var(--v-theme-on-surface)) !important;
}

/* Card de score */
.score-card--light {
  background-color: rgba(var(--v-theme-surface)) !important;
  border: 1px solid rgba(var(--v-theme-primary), 0.2) !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
}

.score-card--dark {
  background-color: rgba(var(--v-theme-surface)) !important;
  border: 1px solid rgba(var(--v-theme-primary), 0.3) !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
}

.score-card--light .v-card-title,
.score-card--light .v-card-text {
  color: rgba(var(--v-theme-on-surface)) !important;
}

.score-card--dark .v-card-title,
.score-card--dark .v-card-text {
  color: rgba(var(--v-theme-on-surface)) !important;
}

/* Aplica estilo quando o item começa com '- ' */
.infra-icons-list li span[data-sub-item="true"] {
  opacity: 0.85;
}

/* Estilos para lista chave-valor dos impressos */
.chave-valor-list {
  padding: 8px 0;
}

.chave-valor-item {
  margin-bottom: 6px;
  line-height: 1.4;
  padding: 2px 0;
}

.chave-valor-item:last-child {
  margin-bottom: 0;
}

.chave-valor-item strong {
  color: #1976d2;
  margin-right: 4px;
}

/* Tema escuro para lista chave-valor */
.theme--dark .chave-valor-item strong {
  color: #90caf9;
}

/* Estilos para o modal de zoom */
.image-zoom-card {
  max-height: 95vh !important;
  overflow: hidden;
}

/* Container SIMPLES para zoom - solução para caixa branca */
.zoom-container-simple {
  overflow: auto;
  max-height: 80vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.02);
  padding: 8px;
}

/* Imagem SIMPLES para zoom - corrige problema de renderização */
.zoom-image-simple {
  max-width: 100% !important;
  height: auto !important;
  cursor: pointer;
  transition: transform 0.2s ease;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.zoom-image-simple:hover {
  transform: scale(1.02);
}

.zoom-image-simple:active {
  transform: scale(0.98);
}

/* Container com scroll para imagens ampliadas - VERSÃO ORIGINAL */
.zoom-container {
  overflow: auto;
  max-height: 85vh;
  display: flex;
  justify-content: center;
  align-items: center;
  scrollbar-width: thin;
  scrollbar-color: rgba(var(--v-theme-on-surface), 0.3) transparent;
}

.zoom-container::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.zoom-container::-webkit-scrollbar-track {
  background: transparent;
}

.zoom-container::-webkit-scrollbar-thumb {
  background-color: rgba(var(--v-theme-on-surface), 0.3);
  border-radius: 4px;
}

.zoom-image {
  cursor: zoom-out;
  transition: all 0.3s ease;
  position: relative;
}

/* Imagem com resolução aumentada (30% maior) */
.zoom-image-enhanced {
  transform: scale(1.3);
  transform-origin: center;
  min-width: 100%;
  min-height: 100%;
}

.zoom-image:hover {
  filter: brightness(1.1);
}

.zoom-image:active {
  transform: scale(0.98);
}

/* Hover específico para imagem ampliada */
.zoom-image-enhanced:hover {
  filter: brightness(1.1);
  transform: scale(1.32); /* Leve aumento adicional no hover */
}

.zoom-image-enhanced:active {
  transform: scale(1.28); /* Feedback tátil no clique */
}

/* Responsividade para o modal de zoom */
@media (max-width: 768px) {
  .image-zoom-card {
    margin: 0;
    max-height: 100vh !important;
    border-radius: 0 !important;
  }
  
  .zoom-container {
    max-height: 80vh;
  }
  
  /* Responsividade para versão simplificada - MOBILE */
  .zoom-container-simple {
    max-height: 70vh;
    padding: 4px;
  }
  
  .zoom-image-simple {
    width: 100% !important;
    height: auto !important;
  }
  
  .zoom-image-enhanced {
    transform: scale(1.2); /* Menor aumento em mobile para melhor usabilidade */
  }
  
  .zoom-image-enhanced:hover {
    transform: scale(1.22);
  }
  
  .zoom-image-enhanced:active {
    transform: scale(1.18);
  }
}

/* Responsividade para tablets */
@media (min-width: 769px) and (max-width: 1024px) {
  /* Responsividade para versão simplificada - TABLET */
  .zoom-container-simple {
    max-height: 75vh;
  }
  
  .zoom-image-enhanced {
    transform: scale(1.25); /* Escala intermediária para tablets */
  }
  
  .zoom-image-enhanced:hover {
    transform: scale(1.27);
  }
  
  .zoom-image-enhanced:active {
    transform: scale(1.23);
  }
}

/* Tecla ESC para fechar modal */
.image-zoom-card .v-card-title {
  background-color: rgba(var(--v-theme-surface), 0.95);
  backdrop-filter: blur(10px);
}
</style>
