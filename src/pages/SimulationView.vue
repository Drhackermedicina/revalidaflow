<script setup>
// Aceitar props para evitar warnings do Vue Router
defineProps({
  id: String
})

// Imports
/* AgentAssistant legacy component import removed during agent cleanup */
import { useSimulationSession } from '@/composables/useSimulationSession.ts';
import { useSimulationSocket } from '@/composables/useSimulationSocket.ts';
import { useSimulationInvites } from '@/composables/useSimulationInvites.js';
import { useSequentialNavigation } from '@/composables/useSequentialNavigation.ts';
import { useEvaluation } from '@/composables/useEvaluation.ts';
import { useImagePreloading } from '@/composables/useImagePreloading.ts';
import { useScriptMarking } from '@/composables/useScriptMarking.ts';
import { useSimulationMeet } from '@/composables/useSimulationMeet.ts';
import { useSimulationData } from '@/composables/useSimulationData.ts';
import { useSimulationPEP } from '@/composables/useSimulationPEP.ts';
import { useInternalInvites } from '@/composables/useInternalInvites.ts';
import { useSimulationWorkflow } from '@/composables/useSimulationWorkflow.ts';
import { usePrivateChatNotification } from '@/plugins/privateChatListener.js';
import { currentUser } from '@/plugins/auth.js';
import { db } from '@/plugins/firebase.js';
import { backendUrl } from '@/utils/backendUrl.js';
import { loadAudioFile, playAudioSegment } from '@/utils/audioService.js'; // Importar as novas funções de áudio
import SimulationHeader from '@/components/SimulationHeader.vue';
import SimulationControls from '@/components/SimulationControls.vue';
import SimulationSidebar from '@/components/SimulationSidebar.vue';
import CandidateChecklist from '@/components/CandidateChecklist.vue';
import ActorScriptPanel from '@/components/ActorScriptPanel.vue';
import CandidateContentPanel from '@/components/CandidateContentPanel.vue';
import ImageZoomModal from '@/components/ImageZoomModal.vue';
import ImpressosModal from '@/components/ImpressosModal.vue';
import { formatActorText, formatIdentificacaoPaciente, formatItemDescriptionForDisplay, splitIntoParagraphs, formatTime, getEvaluationColor, getEvaluationLabel, getInfrastructureColor, getInfrastructureIcon, processInfrastructureItems } from '@/utils/simulationUtils.ts';
import { parseEnumeratedItems } from '@/utils/simulationUtils.ts';
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { io } from 'socket.io-client';
import { captureSimulationError, captureWebSocketError, captureFirebaseError } from '@/plugins/sentry';
import { computed, onMounted, onUnmounted, ref, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTheme } from 'vuetify';
import PepSideView from '@/components/PepSideView.vue';
import CandidateImpressosPanel from '@/components/CandidateImpressosPanel.vue';
import { memoize } from '@/utils/memoization.js';

// Handlers para imagem de zoom (evitam warnings Vue)
function handleZoomImageError(err) {
  console.error('Erro ao carregar imagem de zoom:', err);
}
function handleZoomImageLoad(event) {
  // Carregamento de imagem completo
}

// Funções de formatação memoizadas
const memoizedFormatActorText = memoize(formatActorText);
const memoizedFormatIdentificacaoPaciente = memoize(formatIdentificacaoPaciente);
const memoizedFormatItemDescriptionForDisplay = memoize(formatItemDescriptionForDisplay);

// Configuração do tema
const theme = useTheme();
const isDarkTheme = computed(() => theme.global.name.value === 'dark');

// Configuração do chat privado
const { reloadListeners } = usePrivateChatNotification();

// Configuração do editor removida - TinyMCE não essencial

// Função para processar linhas do roteiro
const processRoteiro = computed(() => {
  return (text) => {
    if (!text) return '';
    return formatActorText(text, isActorOrEvaluator.value);
  }
});

// Função para processar roteiro especificamente para ator (removendo aspas simples)
const processRoteiroActor = computed(() => {
  return (text) => {
    if (!text) return '';
    return formatActorText(text, isActorOrEvaluator.value);
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
      stationData.value[field] = formatActorText(value, isActorOrEvaluator.value);  // Mantém formatação
    }
  }
}

// Inicializa o composable de sessão
const {
  stationId,
  sessionId,
  userRole,
  localSessionId,
  stationData,
  checklistData,
  isLoading,
  errorMessage,
  isSettingUpSession,
  isSequentialMode,
  sequenceId,
  sequenceIndex,
  totalSequentialStations,
  sequentialData,
  simulationTimeSeconds,
  timerDisplay,
  selectedDurationMinutes,
  isActorOrEvaluator,
  isCandidate,
  fetchSimulationData,
  setupSequentialMode,
  setupDuration,
  validateSessionParams,
  clearSession,
  updateDuration
} = useSimulationSession();

// Inicializa composable de navegação sequencial
const {
  setupSequentialNavigation,
  goToNextSequentialStation,
  goToPreviousSequentialStation,
  exitSequentialMode,
  canGoToPrevious,
  canGoToNext,
  sequentialProgress,
  currentSequentialStation,
  setupDebugFunction
} = useSequentialNavigation({
  isSequentialMode,
  sequenceId,
  sequenceIndex,
  totalSequentialStations,
  sequentialData
});

// Socket - declarado antes para uso nos composables
const socketRef = ref(null);
let connectionStatus = ref('');
let connect = () => {};
let disconnect = () => {};

// Refs para notificações
// NOTA: simulationEnded agora vem do useSimulationWorkflow (linha 176)
const showNotificationSnackbar = ref(false);
const notificationMessage = ref('');
const notificationColor = ref('info');

const showNotification = (message, color = 'info') => {
  notificationMessage.value = message;
  notificationColor.value = color;
  showNotificationSnackbar.value = true;
};

// Simulation workflow management (ready/start/end)
// IMPORTANTE: Deve vir ANTES de useEvaluation pois exporta simulationEnded
const partner = ref(null);
const inviteLinkToShow = ref('');

const {
  myReadyState,
  partnerReadyState,
  candidateReadyButtonEnabled,
  simulationStarted,
  simulationEnded, // ✅ Gerenciado pelo composable - usado por useEvaluation
  simulationWasManuallyEndedEarly,
  backendActivated,
  bothParticipantsReady,
  sendReady,
  activateBackend,
  handleStartSimulationClick,
  manuallyEndSimulation,
  updateTimerDisplayFromSelection,
  resetWorkflowState,
  handlePartnerReady,
  handleSimulationStart,
  handleTimerUpdate,
  handleTimerEnd,
  handleTimerStopped,
  handlePartnerDisconnect,
  handleSocketConnect,
  handleSocketDisconnect
} = useSimulationWorkflow({
  socketRef,
  sessionId,
  userRole,
  partner,
  stationData,
  simulationTimeSeconds,
  timerDisplay,
  selectedDurationMinutes,
  inviteLinkToShow,
  backendUrl
});

// Inicializa composable de avaliação
const {
  evaluationScores,
  candidateReceivedScores,
  candidateReceivedTotalScore,
  evaluationSubmittedByCandidate,
  pepReleasedToCandidate,
  totalScore,
  allEvaluationsCompleted,
  submitEvaluation,
  releasePepToCandidate,
  updateEvaluationScore,
  clearEvaluationScores,
  updateCandidateReceivedScores
} = useEvaluation({
  socket: socketRef,
  sessionId,
  stationId,
  userRole,
  currentUser,
  stationData,
  checklistData,
  simulationEnded,
  showNotification
});

// Inicializa composable de preload de imagens
const {
  imageLoadAttempts,
  imageLoadSources,
  imagesPreloadStatus,
  allImagesPreloaded,
  zoomedImageSrc,
  zoomedImageAlt,
  imageZoomDialog,
  getImageId,
  getImageSource,
  handleImageLoad,
  handleImageError,
  clearImageCache,
  preloadSingleImage,
  preloadSingleImageAdvanced,
  preloadImpressoImages,
  isImagePreloaded,
  ensureImageIsPreloaded,
  openImageZoom,
  closeImageZoom
} = useImagePreloading({ stationData });

// Inicializa composable de marcação de roteiro
const {
  markedScriptContexts,
  markedScriptSentences,
  markedParagraphs,
  markedMainItems,
  markedSubItems,
  toggleScriptContext,
  toggleScriptSentence,
  isParagraphMarked,
  toggleParagraphMark,
  toggleMainItem,
  toggleSubItem,
  getItemClasses,
  handleClick,
  clearAllMarkings
} = useScriptMarking({ userRole });

// Aliases para manter compatibilidade com template (funções já têm debounce interno)
const debouncedToggleParagraphMark = toggleParagraphMark;
const debouncedToggleScriptContext = toggleScriptContext;

// Função handler para atualização de scores de avaliação
function handleEvaluationScoreUpdate({ itemId, score }) {
  updateEvaluationScore(itemId, score);
}

// Router e Route (necessários para alguns composables)
const route = useRoute();
const router = useRouter();

// Google Meet integration
const {
  communicationMethod,
  meetLink,
  meetLinkCopied,
  candidateMeetLink,
  candidateOpenedMeet,
  openGoogleMeet,
  copyMeetLink,
  checkCandidateMeetLink,
  openCandidateMeet,
  validateMeetLink,
  isMeetMode,
  getMeetLinkForInvite
} = useSimulationMeet({ userRole, route });

// Simulation data management
const {
  releasedData,
  isChecklistVisibleForCandidate,
  actorVisibleImpressoContent,
  actorReleasedImpressoIds,
  impressosModalOpen,
  toggleActorImpressoVisibility,
  releaseData,
  handleCandidateReceiveData,
  resetSimulationData
} = useSimulationData({ socket: socketRef, sessionId, userRole, stationData });

// PEP management
const {
  pepViewState,
  markedPepItems,
  togglePepItemMark,
  initializePepItems
} = useSimulationPEP({ userRole, checklistData });

// Internal invites management
const {
  onlineCandidates,
  isSendingInternalInvite,
  internalInviteSentTo,
  internalInviteDialog,
  internalInviteData,
  handleOnlineUsersList,
  sendInternalInvite,
  handleInternalInviteReceived,
  acceptInternalInvite,
  declineInternalInvite,
  requestOnlineUsers
} = useInternalInvites({
  socket: socketRef,
  sessionId,
  stationId,
  selectedDurationMinutes,
  currentUser,
  getMeetLinkForInvite
});

// Variável lastClickTime movida para useScriptMarking composable

// Função para separar texto em sentenças

const copySuccess = ref(false);

// Candidato selecionado para simulação
const selectedCandidateForSimulation = ref(null);

// Chat integration refs
const sendingChat = ref(false);
const chatSentSuccess = ref(false);

const isAdmin = computed(() => {
  return currentUser.value && (
    currentUser.value.uid === 'KiSITAxXMAY5uU3bOPW5JMQPent2' ||
    currentUser.value.uid === 'anmxavJdQdgZ16bDsKKEKuaM4FW2' ||
    currentUser.value.uid === 'RtfNENOqMUdw7pvgeeaBVSuin662' ||
    currentUser.value.uid === 'gb8MEg8UMmOOUhiBu1A2EY6GkX52' ||
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
// MOVIDOS PARA useSimulationWorkflow composable (linhas 166-205):
// - myReadyState, partnerReadyState, simulationStarted, simulationEnded
// - simulationWasManuallyEndedEarly, candidateReadyButtonEnabled, backendActivated
// Todos os estados de workflow agora são gerenciados pelo composable

async function playSoundEffect() {
  try {
    const audioBuffer = await loadAudioFile('/src/assets/myinstants.mp3');
    playAudioSegment(audioBuffer, 1, 1); // Reproduz do segundo 1 ao segundo 2 (duração de 1 segundo)
  } catch (e) {
    console.warn("Não foi possível tocar o som:", e);
  }
}









// fetchSimulationData agora está no composable useSimulationSession


function clearSelectedCandidate() {
  try {
    sessionStorage.removeItem('selectedCandidate');
  } catch (error) {
    console.warn('Erro ao limpar candidato selecionado:', error);
  }
}


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
    const { sendSimulationInvite } = useSimulationInvites(reloadListeners);

    const result = await sendSimulationInvite({
      candidateUid: selectedCandidateForSimulation.value.uid,
      candidateName: selectedCandidateForSimulation.value.name,
      inviteLink: inviteLinkToShow.value,
      stationTitle: stationData.value?.tituloEstacao || 'Estação',
      duration: selectedDurationMinutes.value || 10,
      meetLink: getMeetLinkForInvite(),
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


function connectWebSocket() {
  if (!sessionId.value || !userRole.value || !stationId.value || !currentUser.value?.uid) { console.error("SOCKET: Dados essenciais faltando para conexão.");
    return; }
  // const backendUrl = 'http://localhost:3000'; // Removido, agora usa import
  // console.log('SimulationView: backendUrl sendo usada para Socket.IO:', backendUrl); // NOVO LOG
  connectionStatus.value = 'Conectando';
  if (socketRef.value && socketRef.value.connected) { socketRef.value.disconnect(); }
  
  const socket = io(backendUrl, {
    transports: ['websocket'],
    query: {
      sessionId: sessionId.value,
      userId: currentUser.value?.uid,
      role: userRole.value,
      stationId: stationId.value,
      displayName: currentUser.value?.displayName
    }
  });
  
  socket.on('connect', () => {
    connectionStatus.value = 'Conectado';
    
    // ATUALIZAR O REF DO SOCKET APÓS CONEXÃO
    socketRef.value = socket;

    console.log('SOCKET: Conectado.');

    // Workflow: habilitar botão "Estou pronto" para candidato
    handleSocketConnect();
  });
  
  socket.on('disconnect', (reason) => {
    connectionStatus.value = 'Desconectado';

    // Workflow: desabilitar botão e resetar estados
    handleSocketDisconnect();
    handlePartnerDisconnect();

    const isCandidateReviewing = userRole.value === 'candidate' && stationData.value && simulationStarted.value;

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
  socket.on('connect_error', (err) => {
    connectionStatus.value = 'Erro de Conexão';
    if(!errorMessage.value) errorMessage.value = `Falha ao conectar: ${err.message}`;
    console.error('SOCKET: Erro de conexão', err);

    // Captura erro no Sentry
    captureWebSocketError(err, {
      socketId: socket?.id,
      sessionId: sessionId.value,
      connectionState: 'failed',
      lastEvent: 'connect_error'
    });
  });
  socket.on('SERVER_ERROR', (data) => {
    console.error('SOCKET: Erro do Servidor:', data.message);
    errorMessage.value = `Erro do servidor: ${data.message}`;

    // Captura erro no Sentry
    captureSimulationError(new Error(data.message), {
      sessionId: sessionId.value,
      userRole: userRole.value,
      stationId: stationId.value,
      simulationState: simulationStarted.value ? 'started' : 'preparing'
    });
  });
  socket.on('SERVER_JOIN_CONFIRMED', (data) => { });
  socket.on('SERVER_PARTNER_JOINED', (participantInfo) => {
    if (participantInfo && participantInfo.userId !== currentUser.value?.uid) {
      partner.value = participantInfo;
      partnerReadyState.value = participantInfo.isReady || false;
      errorMessage.value = '';
    }
  });
  socket.on('SERVER_PARTNER_UPDATE', (data) => {
    updatePartnerInfo(data.participants);
  });
  function updatePartnerInfo(participants) {
    const currentUserId = currentUser.value?.uid;
    if (participants && Array.isArray(participants) && currentUserId) {
      const otherParticipant = participants.find(p => p.userId !== currentUserId);
      if(otherParticipant) {
        partner.value = otherParticipant;
        partnerReadyState.value = partner.value.isReady || false;
        errorMessage.value = '';
      } else {
        partner.value = null;
        partnerReadyState.value = false;
      }
    } else {
      partner.value = null;
      partnerReadyState.value = false;
    }
  }

  socket.on('SERVER_PARTNER_LEFT', (data) => {
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
  socket.on('CANDIDATE_RECEIVE_DATA', (payload) => {
    const { dataItemId } = payload;
    handleCandidateReceiveData(dataItemId);
  });
  socket.on('SERVER_PARTNER_READY', (data) => {
    if (data && data.userId !== currentUser.value?.uid) {
      if (partner.value && partner.value.userId === data.userId) {
        partner.value.isReady = data.isReady;
      }
      // Workflow: atualizar estado de prontidão do parceiro
      handlePartnerReady(data);
    }
  });
  socket.on('SERVER_START_SIMULATION', (data) => {
    // Workflow: atualizar estados e timer
    handleSimulationStart(data);

    errorMessage.value = '';
    playSoundEffect();
  });
  socket.on('TIMER_UPDATE', (data) => {
    // Workflow: atualizar timer display
    handleTimerUpdate(data);
    // NOTA: simulationEnded é gerenciado pelo handleTimerUpdate do composable
  });
  socket.on('TIMER_END', () => {
    // Workflow: atualizar timer e estado
    handleTimerEnd();
    // NOTA: simulationEnded é gerenciado pelo handleTimerEnd do composable

    playSoundEffect(); // Som do final da estação

    // Limpar candidato selecionado quando simulação termina
    clearSelectedCandidate();

    // Notificação para o candidato
    if (userRole.value === 'candidate') {
      showNotification('Tempo finalizado! Aguardando avaliação do examinador...', 'info');
    }
  });
  socket.on('TIMER_STOPPED', (data) => {
    // Workflow: atualizar estados
    handleTimerStopped(data);

    if (!simulationEnded.value) {
        playSoundEffect(); // Som do final da estação
        simulationEnded.value = true; // Marca como encerrada ANTES para evitar som duplicado
    }

    // Limpar candidato selecionado quando simulação para
    clearSelectedCandidate();

    // Atualizar simulationWasManuallyEndedEarly baseado na razão
    if (data?.reason === 'manual_end') {
      simulationWasManuallyEndedEarly.value = true;
    } else {
      simulationWasManuallyEndedEarly.value = false;
    }

    if (data?.reason === 'participante desconectou' && !errorMessage.value) {
      errorMessage.value = "Simulação interrompida: parceiro desconectou.";
    } else if (data?.reason === 'manual_end' && !errorMessage.value && simulationWasManuallyEndedEarly.value) {
      errorMessage.value = "Simulação encerrada manually pelo ator/avaliador antes do tempo.";
    } else if (data?.reason === 'tempo esgotado' && !errorMessage.value) {
      errorMessage.value = "Simulação encerrada: tempo esgotado.";
    } else if (!errorMessage.value) {
      errorMessage.value = "Simulação encerrada.";
    }
  });
  socket.on('CANDIDATE_RECEIVE_PEP_VISIBILITY', (payload) => {
    if (userRole.value === 'candidate' && payload && typeof payload.shouldBeVisible === 'boolean') {
      isChecklistVisibleForCandidate.value = payload.shouldBeVisible;
      
      // Notificar o candidato quando o PEP é liberado
      if (payload.shouldBeVisible) {
        showNotification('O PEP (checklist de avaliação) foi liberado pelo examinador!', 'success');
      }
    }
  });
  socket.on('CANDIDATE_RECEIVE_UPDATED_SCORES', (data) => {
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
        // totalScore é computed, não pode ser modificado diretamente
        // totalScore.value = data.totalScore; // REMOVIDO
      }
    }
  });
  socket.on('SERVER_BOTH_PARTICIPANTS_READY', () => {
    myReadyState.value = true;
    partnerReadyState.value = true;
    
    // Se partner.value estiver vazio, tenta preencher com papel oposto
    if (!partner.value) {
      partner.value = { role: userRole.value === 'actor' ? 'candidate' : 'actor', isReady: true };
    } else {
      // Atualiza o estado de isReady do partner se ele já existir
      partner.value.isReady = true;
    }
    
    // CRUCIAL: Chama handlePartnerReady para garantir que partnerReadyState seja atualizado
    // Isso garante que bothParticipantsReady (computed) se torne true
    handlePartnerReady({ isReady: true });
    
    errorMessage.value = '';
  });

  // Listener específico para sincronização de scores para candidatos
  socket.on('EVALUATOR_SCORES_UPDATED_FOR_CANDIDATE', (data) => {
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
  socket.on('INTERNAL_INVITE_RECEIVED', handleInternalInviteReceived);
  
  // Listener para confirmação de submissão de avaliação
  socket.on('SUBMISSION_CONFIRMED', (data) => {
    if (data.success) {
      console.log('[SUBMIT] Confirmação recebida do servidor:', data);
      // Marcar como submetido se ainda não estiver
      if (!evaluationSubmittedByCandidate.value) {
        evaluationSubmittedByCandidate.value = true;
        showNotification('Avaliação confirmada pelo servidor!', 'success');
      }
    }
  });
  
  // Listener para notificar o avaliador sobre submissão do candidato
  socket.on('CANDIDATE_SUBMITTED_EVALUATION', (data) => {
    if (userRole.value === 'actor' || userRole.value === 'evaluator') {
      console.log('[SUBMIT] Candidato submeteu avaliação:', data);
      showNotification(`Candidato submeteu avaliação final. Nota: ${data.totalScore?.toFixed(2) || 'N/A'}`, 'info');
    }
  });
}


function loadSelectedCandidate() {
  const candidateData = sessionStorage.getItem('selectedCandidate');

  if (candidateData) {
    try {
      const candidate = JSON.parse(candidateData);
      selectedCandidateForSimulation.value = candidate;
    } catch (error) {
      console.error('loadSelectedCandidate: Erro ao parsear candidato:', error);
    }
  } else {
  }
}


function setupSession() {
  if (isSettingUpSession.value) {
    return;
  }

  isSettingUpSession.value = true;

  // Reset de estado
  errorMessage.value = '';
  isLoading.value = true;
  if (socketRef.value && socketRef.value.connected) { socketRef.value.disconnect(); }
  socketRef.value = null;

  // Configura IDs e papel do usuário
  stationId.value = route.params.id;
  sessionId.value = route.query.sessionId;
  userRole.value = route.query.role || 'evaluator';

  // Configuração do modo sequencial
  setupSequentialMode(route.query);

  // Auto-ready para navegação sequencial
  const shouldAutoReady = route.query.autoReady === 'true';

  inviteLinkToShow.value = '';

  // Reset de estados da simulação
  myReadyState.value = false;
  partnerReadyState.value = false;
  simulationStarted.value = false;
  simulationEnded.value = false;
  simulationWasManuallyEndedEarly.value = false;
  partner.value = null;

  // Reset simulation data via composable
  resetSimulationData();

  evaluationScores.value = {};
  pepReleasedToCandidate.value = false;
  candidateReceivedScores.value = {};
  candidateReceivedTotalScore.value = 0;

  // Limpa cache de imagens ao reiniciar sessão
  clearImageCache();

  // Carregar candidato selecionado se for ator/avaliador
  if (isActorOrEvaluator.value) {
    loadSelectedCandidate();
  }

  // Configuração de duração
  setupDuration(route.query);

  // Validação de parâmetros
  const validation = validateSessionParams();
  if (!validation.valid) {
    errorMessage.value = validation.error;
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
  connectionStatus = socketApi.connectionStatus;
  connect = socketApi.connect;
  disconnect = socketApi.disconnect;

  // Busca dados da estação e configura pós-carregamento
  fetchSimulationData(stationId.value).then(() => {
    // Inicializa markedPepItems para cada item do checklist
    initializePepItems();

    // Pré-carrega imagens dos impressos
    setTimeout(() => {
      preloadImpressoImages();
    }, 100);
  }).finally(() => {
    isSettingUpSession.value = false;

    // Se já temos um sessionId, conecta o WebSocket usando o composable
    if (sessionId.value) {
      // Usa o método connect() do composable ao invés de connectWebSocket()
      connect();

      // Configura os event listeners após a conexão
      connectWebSocket();

      // Auto-ready para navegação sequencial
      if (shouldAutoReady && isActorOrEvaluator.value) {
        console.log('[SEQUENTIAL] Auto-ready ativado para navegação sequencial');
        setTimeout(() => {
          if (!myReadyState.value && socketRef.value?.connected) {
            sendReady();
          }
        }, 1000);
      }
    }
  });
}

// totalScore e allEvaluationsCompleted movidos para useEvaluation composable

// bothParticipantsReady computed e watch movidos para useSimulationWorkflow composable


onMounted(() => {
  console.log('[DEBUG] SimulationView mounted - checking template structure');
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

// toggleActorImpressoVisibility movido para useSimulationData composable

// updateTimerDisplayFromSelection movido para useSimulationWorkflow composable

async function generateInviteLinkWithDuration() {
  if (isLoading.value) {
    errorMessage.value = "Aguarde o carregamento dos dados da estação.";
    return;
  }
  if (!stationData.value) {
    errorMessage.value = "Dados da estação ainda não carregados. Tente novamente em instantes.";
    return;
  }

  // Se não houver sessionId, ativamos o backend para criar um
  if (!sessionId.value) {
    try {
      
      const response = await fetch(`${backendUrl}/api/create-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stationId: stationId.value,
          durationMinutes: selectedDurationMinutes.value,
          localSessionId: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` // Gerar um localSessionId temporário
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const sessionData = await response.json();
      sessionId.value = sessionData.sessionId; // Define o sessionId real
      // Conectar WebSocket imediatamente após obter o sessionId e aguardar a conexão
      connectWebSocket(); // Inicia a tentativa de conexão

      let connectionAttempts = 0;
      const maxAttempts = 10; // Tentar por até 5 segundos (10 * 500ms)
      while (!socketRef.value?.connected && connectionAttempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 500));
        connectionAttempts++;
      }
      if (!socketRef.value?.connected) {
        throw new Error("WebSocket connection failed after multiple attempts during invite link generation.");
      }

    } catch (error) {
      errorMessage.value = `Não foi possível gerar link de convite: ${error.message}`;
      return;
    }
  }

  if ((userRole.value === 'actor' || userRole.value === 'evaluator') && stationId.value && sessionId.value) {
    if (isMeetMode()) {
      const validation = validateMeetLink(meetLink.value);
      if (!validation.valid) {
        errorMessage.value = validation.error;
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

        const meetLinkForInvite = getMeetLinkForInvite();
        if (meetLinkForInvite) {
          inviteQuery.meet = meetLinkForInvite;
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
    errorMessage.value = "Não foi possível gerar link de convite neste momento. Verifique se todos os dados necessários estão disponíveis.";
  }
}

// candidateMeetLink, candidateOpenedMeet, checkCandidateMeetLink e openCandidateMeet
// movidos para useSimulationMeet composable

watch(() => route.fullPath, (newPath, oldPath) => {
  if (newPath !== oldPath && route.name === 'SimulationView') {
    // console.log("MUDANÇA DE ROTA (SimulationView fullPath):", newPath, "Reconfigurando sessão...");
    setupSession();
    checkCandidateMeetLink();
  }
});
// --- Funções de Interação ---
// releaseData movido para useSimulationData composable

async function copyInviteLink() { if(!inviteLinkToShow.value) return; try {await navigator.clipboard.writeText(inviteLinkToShow.value); copySuccess.value=true; setTimeout(()=>copySuccess.value=false,2000);
  } catch(e){alert('Falha ao copiar.')} }
// sendReady movido para useSimulationWorkflow composable

// activateBackend movido para useSimulationWorkflow composable
// NOTA: A versão abaixo está comentada mas pode ter lógica adicional necessária
async function activateBackend_OLD_BACKUP() {
  if (backendActivated.value) {
    return;
  }

  try {

    // Se o sessionId já foi definido (ex: pela geração do link de convite), não recriar
    if (!sessionId.value) {
      const response = await fetch(`${backendUrl}/api/create-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stationId: stationId.value,
          durationMinutes: selectedDurationMinutes.value,
          localSessionId: localSessionId.value
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const sessionData = await response.json();
      sessionId.value = sessionData.sessionId; // Define o sessionId real
    } else {
    }

    // Conectar WebSocket com o sessionId real (se ainda não estiver conectado)
    if (!socketRef.value?.connected) {
      connectWebSocket();
      // Esperar pela conexão do socket
      let connectionAttempts = 0;
      const maxAttempts = 10;
      while (!socketRef.value?.connected && connectionAttempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 500));
        connectionAttempts++;
      }
      if (!socketRef.value?.connected) {
        throw new Error("WebSocket connection failed after multiple attempts");
      }
    } else {
    }

    // Mark backend as activated
    backendActivated.value = true;

    // A emissão de CLIENT_START_SIMULATION será feita pelo watch(bothParticipantsReady)
    // ou pelo clique no botão "Iniciar Simulação" se for ator/avaliador.

  } catch (error) {
    errorMessage.value = `Erro ao ativar backend: ${error.message}`;

    // Captura erro no Sentry
    captureSimulationError(error, {
      sessionId: sessionId.value,
      userRole: userRole.value,
      stationId: stationId.value,
      simulationState: 'backend_activation_failed'
    });

    // Reset states on error
    myReadyState.value = false;
    partnerReadyState.value = false;
    backendActivated.value = false;
  }
}

// handleStartSimulationClick movido para useSimulationWorkflow composable

// submitEvaluation(), releasePepToCandidate() e funções de imagens movidas para composables



// Função para manter os callbacks de avaliação
function sendEvaluationScores() {
  // Envia os scores iniciais ao liberar o PEP (se já houver algum)
  if (socketRef.value?.connected) {
      socketRef.value.emit('EVALUATOR_SCORES_UPDATED_FOR_CANDIDATE', {
        sessionId: sessionId.value,
        scores: evaluationScores.value,
        totalScore: totalScore.value
      });
  }
}
// manuallyEndSimulation movido para useSimulationWorkflow composable

watch(evaluationScores, (newScores) => {
  if (
    socketRef.value?.connected &&
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

    socketRef.value.emit('EVALUATOR_SCORES_UPDATED_FOR_CANDIDATE', {
      sessionId: sessionId.value,
      scores: numericScores,
      totalScore: Object.values(numericScores).reduce((sum, v) => sum + (isNaN(v) ? 0 : v), 0)
    });
  }
}, { deep: true });

// Watcher para liberar PEP automaticamente ao final da simulação
watch(simulationEnded, (newValue) => {
  if (
    newValue && // Simulação terminou
    (userRole.value === 'actor' || userRole.value === 'evaluator') && // É ator/avaliador
    !pepReleasedToCandidate.value && // PEP ainda não foi liberado
    socketRef.value?.connected && // Socket conectado
    sessionId.value // Tem sessionId
  ) {
    console.log('[AUTO_RELEASE] Liberando PEP automaticamente ao final da simulação');
    releasePepToCandidate();
  }
});

// Funções de marcação movidas para useScriptMarking composable

onUnmounted(() => {
  document.removeEventListener('toggleMark', (e) => toggleMark(e.detail));
});

// --- FUNÇÕES PARA SIMULAÇÃO SEQUENCIAL ---
// setupSequentialNavigation(), goToNextSequentialStation() movidos para useSequentialNavigation composable

// Função de debug para diagnóstico - agora usa composable
setupDebugFunction({
  isActorOrEvaluator,
  simulationEnded,
  allEvaluationsCompleted,
  evaluationScores,
  checklistData
});

// --- NOVO: Comunicação Google Meet ---
// communicationMethod, meetLink, meetLinkCopied movidos para useSimulationMeet composable

// Watcher para debugging de variáveis sequenciais (movido para após definições)
watch([isSequentialMode, simulationEnded, allEvaluationsCompleted, canGoToNext],
  ([sequential, ended, completed, canNext]) => {
    if (sequential) {
      console.log('[SEQUENTIAL] State change:');
      console.log('  simulationEnded:', ended);
      console.log('  allEvaluationsCompleted:', completed);
      console.log('  canGoToNext:', canNext);
      console.log('  isActorOrEvaluator:', isActorOrEvaluator.value);

      if (ended && completed && canNext && isActorOrEvaluator.value) {
        console.log('[SEQUENTIAL] ✅ All conditions met for navigation button!');
      } else {
        console.log('[SEQUENTIAL] ❌ Navigation button conditions not met');
      }
    }
  },
  { immediate: true }
);

// openGoogleMeet e copyMeetLink movidos para useSimulationMeet composable

// --- CONTROLE DE USUÁRIOS ONLINE E CONVITE INTERNO ---
// onlineCandidates, sendInternalInvite, handleOnlineUsersList movidos para useInternalInvites

// Atualiza lista de usuários online ao receber do backend
if (socketRef.value) {
  socketRef.value.on('SERVER_ONLINE_USERS', handleOnlineUsersList);
}

// Solicita lista de usuários online ao conectar
watch(connectionStatus, (status) => {
  if (status === 'Conectado' && socketRef.value?.connected) {
    requestOnlineUsers('candidate');
  }
});

// --- CONTROLE DE CONVITE INTERNO (CANDIDATO ONLINE) ---
// internalInviteDialog, internalInviteData, handleInternalInviteReceived, acceptInternalInvite, declineInternalInvite
// movidos para useInternalInvites

onUnmounted(() => {
  // ...existing code...
  if (socketRef.value) {
    socketRef.value.off('INTERNAL_INVITE_RECEIVED', handleInternalInviteReceived);
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

// Notificações movidas para linha 141-149 (antes da inicialização dos composables)

// Funções de marcação de parágrafos movidas para useScriptMarking composable

// --- NOVO: Função para processar e padronizar os itens de infraestrutura ---
</script>

<template>
  <!-- SimulationHeader Component -->
  <SimulationHeader
    :is-sequential-mode="isSequentialMode"
    :sequential-progress="sequentialProgress"
    :can-go-to-previous="canGoToPrevious"
    :can-go-to-next="canGoToNext"
    :station-data="stationData"
    :simulation-started="simulationStarted"
    :simulation-ended="simulationEnded"
    :selected-candidate-for-simulation="selectedCandidateForSimulation"
    :timer-display="timerDisplay"
    :selected-duration-minutes="selectedDurationMinutes"
    :is-actor-or-evaluator="isActorOrEvaluator"
    :is-candidate="isCandidate"
    :is-admin="isAdmin"
    :station-id="stationId"
    :error-message="errorMessage"
    @go-to-previous-sequential-station="goToPreviousSequentialStation"
    @go-to-next-sequential-station="goToNextSequentialStation"
    @exit-sequential-mode="exitSequentialMode"
    @clear-selected-candidate="clearSelectedCandidate"
    @open-edit-page="openEditPage"
    @update-timer-display-from-selection="updateTimerDisplayFromSelection"
    @manually-end-simulation="manuallyEndSimulation"
    @toggle-collapse="toggleCollapse"
    @update:selected-duration-minutes="selectedDurationMinutes = $event"
  />

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
    <div v-else-if="stationData">

      <!-- CONTROLES DA SIMULAÇÃO -->
      <SimulationControls
        :simulation-started="simulationStarted"
        :simulation-ended="simulationEnded"
        :my-ready-state="myReadyState"
        :both-participants-ready="bothParticipantsReady"
        :backend-activated="backendActivated"
        :candidate-ready-button-enabled="candidateReadyButtonEnabled"
        :communication-method="communicationMethod"
        :meet-link="meetLink"
        :invite-link-to-show="inviteLinkToShow"
        :copy-success="copySuccess"
        :chat-sent-success="chatSentSuccess"
        :sending-chat="sendingChat"
        :selected-candidate-for-simulation="selectedCandidateForSimulation"
        :is-actor-or-evaluator="isActorOrEvaluator"
        :is-candidate="isCandidate"
        @update:communication-method="communicationMethod = $event"
        @update:meet-link="meetLink = $event"
        @open-google-meet="openGoogleMeet"
        @generate-invite-link-with-duration="generateInviteLinkWithDuration"
        @copy-invite-link="copyInviteLink"
        @send-link-via-private-chat="sendLinkViaPrivateChat"
        @send-ready="sendReady"
        @handle-start-simulation-click="handleStartSimulationClick"
      />

      <!-- LAYOUT PRINCIPAL: CONTEÚDO + SIDEBAR (CANDIDATO) OU CONTEÚDO (ATOR) -->
      <VRow>
        <!-- Coluna Principal de Conteúdo -->
        <VCol :cols="isCandidate ? 12 : 12" :md="isCandidate ? 8 : 12">
          <!-- VISÃO DO ATOR/AVALIADOR -->
          <div v-if="isActorOrEvaluator">
            <!-- ACTOR SCRIPT PANEL COMPONENT -->
            <ActorScriptPanel
              :station-data="stationData"
              :is-dark-theme="isDarkTheme"
              :is-actor-or-evaluator="isActorOrEvaluator"
              :checklist-data="checklistData"
              :pep-view-state="pepViewState"
              :marked-pep-items="markedPepItems"
              :marked-script-contexts="markedScriptContexts"
              :marked-paragraphs="markedParagraphs"
              :actor-visible-impresso-content="actorVisibleImpressoContent"
              :actor-released-impresso-ids="actorReleasedImpressoIds"
              :get-image-source="getImageSource"
              :get-image-id="getImageId"
              :handle-image-error="handleImageError"
              :handle-image-load="handleImageLoad"
              :is-paragraph-marked="isParagraphMarked"
              @toggle-script-context="debouncedToggleScriptContext"
              @toggle-paragraph-mark="debouncedToggleParagraphMark"
              @toggle-pep-view="pepViewState.isVisible = !pepViewState.isVisible"
              @toggle-pep-item-mark="togglePepItemMark"
              @toggle-actor-impresso-visibility="toggleActorImpressoVisibility"
              @release-data="releaseData"
              @open-image-zoom="openImageZoom"
            />

             <!-- CANDIDATE CHECKLIST COMPONENT -->
             <CandidateChecklist
               :checklist-data="checklistData"
               :simulation-started="simulationStarted"
               :simulation-ended="simulationEnded"
               :simulation-was-manually-ended-early="simulationWasManuallyEndedEarly"
               :is-checklist-visible-for-candidate="isChecklistVisibleForCandidate"
               :pep-released-to-candidate="pepReleasedToCandidate"
               :marked-pep-items="markedPepItems"
               :evaluation-scores="evaluationScores"
               :candidate-received-scores="candidateReceivedScores"
               :candidate-received-total-score="candidateReceivedTotalScore"
               :total-score="totalScore"
               :evaluation-submitted-by-candidate="evaluationSubmittedByCandidate"
               :is-actor-or-evaluator="isActorOrEvaluator"
               :is-candidate="isCandidate"
               @release-pep-to-candidate="releasePepToCandidate"
               @toggle-pep-item-mark="togglePepItemMark"
               @update:evaluation-scores="handleEvaluationScoreUpdate"
               @submit-evaluation="submitEvaluation"
             />
           </div>

           <!-- NAVEGAÇÃO SEQUENCIAL - Botão Próxima Estação -->
           <VCard
             v-if="isSequentialMode && isActorOrEvaluator && simulationEnded"
             class="mt-6 sequential-next-card"
             :class="isDarkTheme ? 'sequential-next-card--dark' : 'sequential-next-card--light'"
           >
             <VCardText class="text-center pa-6">
               <!-- DEBUG: Mostrar estado das variáveis -->
               <VAlert type="warning" variant="outlined" class="mb-4">
                 <div class="text-left">
                   <div><strong>DEBUG SEQUENCIAL:</strong></div>
                   <div>isSequentialMode: {{ isSequentialMode }}</div>
                   <div>isActorOrEvaluator: {{ isActorOrEvaluator }}</div>
                   <div>simulationEnded: {{ simulationEnded }}</div>
                   <div>allEvaluationsCompleted: {{ allEvaluationsCompleted }}</div>
                   <div>canGoToNext: {{ canGoToNext }}</div>
                   <div>sequenceIndex: {{ sequenceIndex }}</div>
                   <div>totalSequentialStations: {{ totalSequentialStations }}</div>
                   <div>sequentialData existe: {{ !!sequentialData }}</div>
                 </div>
               </VAlert>

               <VAlert
                 v-if="!allEvaluationsCompleted"
                 type="info"
                 variant="tonal"
                 class="mb-4"
               >
                 <VIcon icon="ri-information-line" class="me-2" />
                 Complete todas as avaliações do PEP para prosseguir
               </VAlert>

               <VBtn
                 v-if="canGoToNext && allEvaluationsCompleted"
                 color="primary"
                 size="x-large"
                 prepend-icon="ri-arrow-right-line"
                 @click="goToNextSequentialStation"
                 class="mb-3 px-8"
                 variant="elevated"
               >
                 Próxima Estação ({{ sequenceIndex + 2 }}/{{ totalSequentialStations }})
               </VBtn>

               <VBtn
                 v-else-if="!canGoToNext && allEvaluationsCompleted"
                 color="success"
                 size="x-large"
                 prepend-icon="ri-check-line"
                 @click="$router.push('/app/stations')"
                 class="px-8"
                 variant="elevated"
               >
                 Finalizar Sequência Completa
               </VBtn>

               <!-- Botão de debug sempre visível durante desenvolvimento -->
               <VBtn
                 color="warning"
                 size="small"
                 variant="outlined"
                 @click="debugSequentialNavigation"
                 class="mt-4"
               >
                 Debug Console
               </VBtn>
             </VCardText>
           </VCard>

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
                                 :disabled="!!candidateMeetLink && !candidateOpenedMeet"
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
 
             <!-- CONTEÚDO DO CANDIDATO -->
             <CandidateContentPanel
               :station-data="stationData"
               :simulation-started="simulationStarted"
               :is-dark-theme="isDarkTheme"
             />

             <!-- Inserir Impressos do candidato como componente -->
             <CandidateImpressosPanel
               v-if="simulationStarted"
               :released-data="releasedData"
               :is-dark-theme="isDarkTheme"
               :get-image-source="getImageSource"
               :get-image-id="getImageId"
               :open-image-zoom="openImageZoom"
               :handle-image-error="handleImageError"
               :handle-image-load="handleImageLoad"
             />

           </div>
         </VCol
 
         <!-- Card de Navegação Sequencial (para ator/avaliador após submissão) -->
         <VCol v-if="isSequentialMode && isActorOrEvaluator && simulationEnded && evaluationSubmittedByCandidate" cols="12">
           <VCard
             :class="[
               'mb-6 sequential-navigation-card',
               isDarkTheme ? 'sequential-navigation-card--dark' : 'sequential-navigation-card--light'
             ]"
           >
             <VCardItem>
               <VCardTitle class="d-flex align-center">
                 <VIcon color="primary" icon="ri-route-line" size="large" class="me-2" />
                 Navegação Sequencial
               </VCardTitle>
             </VCardItem>
             <VCardText>
               <VAlert variant="tonal" color="success" class="mb-4">
                 <div class="d-flex align-center">
                   <VIcon icon="ri-checkbox-circle-line" class="me-2" />
                   <div>
                     <div class="font-weight-bold">Estação Concluída</div>
                     <div class="text-body-2">O candidato submeteu a avaliação. Você pode prosseguir para a próxima estação.</div>
                   </div>
                 </div>
               </VAlert>

               <div class="text-center">
                 <VBtn
                   v-if="canGoToNext"
                   color="primary"
                   size="large"
                   prepend-icon="ri-arrow-right-line"
                   @click="goToNextSequentialStation"
                   class="mb-3"
                 >
                   Próxima Estação ({{ sequenceIndex + 2 }}/{{ totalSequentialStations }})
                 </VBtn>

                 <VBtn
                   v-else
                   color="success"
                   size="large"
                   prepend-icon="ri-check-line"
                   @click="$router.push('/app/stations')"
                 >
                   Finalizar Sequência
                 </VBtn>
               </div>
             </VCardText>
           </VCard>
         </VCol>

         <!-- SIDEBAR DO CANDIDATO -->
         <SimulationSidebar
           :simulation-started="simulationStarted"
           :simulation-ended="simulationEnded"
           :timer-display="timerDisplay"
           :station-data="stationData"
           :is-candidate="isCandidate"
         />
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

     <!-- Botão flutuante lateral para gerenciar impressos -->
     <VBtn
       v-if="isActorOrEvaluator && stationData?.materiaisDisponiveis?.impressos?.length > 0"
       class="impressos-floating-button-compact"
       icon
       color="info"
       variant="tonal"
       @click="impressosModalOpen = true"
       title="Gerenciar Impressos"
     >
       <VIcon icon="ri-file-text-line" />
     </VBtn>
 
     <!-- Snackbar de Notificação -->
     <VSnackbar v-model="showNotificationSnackbar" :color="notificationColor" timeout="5000">
       {{ notificationMessage }}
     </VSnackbar>
 
    <!-- Modal de Zoom para Imagens -->
    <ImageZoomModal
      v-model:is-open="imageZoomDialog"
      :image-url="zoomedImageSrc"
      :image-alt="zoomedImageAlt"
      @close="closeImageZoom"
      @image-error="handleZoomImageError"
      @image-load="handleZoomImageLoad"
    />
  </div>     <!-- Modal de Impressos -->
    <ImpressosModal
      v-model:is-open="impressosModalOpen"
      :station-data="stationData"
      :actor-released-impresso-ids="actorReleasedImpressoIds"
      @release-impresso="releaseData"
    />

   <!-- AgentAssistant component removed (legacy agent) -->
 </template>

<style scoped lang="scss">
@import '@/assets/styles/simulation-view.scss';
</style>
