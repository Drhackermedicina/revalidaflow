<script setup>
// Aceitar props para evitar warnings do Vue Router
defineProps({
  id: String
})

// ============================================================================
// IMPORTS ORGANIZADOS POR CATEGORIA
// ============================================================================

// Vue Core
import { computed, onMounted, onUnmounted, ref, watch, nextTick, triggerRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'

// Vuetify
import { useTheme } from 'vuetify'

// Firebase
import { currentUser } from '@/plugins/auth.js'
import { useUserStore } from '@/stores/userStore'

// Plugins & Utils
import { backendUrl } from '@/utils/backendUrl.js'
import { playSoundEffect } from '@/utils/audioService.js'
import { captureSimulationError, captureWebSocketError } from '@/plugins/sentry'
import { usePrivateChatNotification } from '@/plugins/privateChatListener.js'
import Logger from '@/utils/logger.js'

const logger = new Logger('SimulationView');

// Componentes
import SimulationHeader from '@/components/SimulationHeader.vue'
import SimulationControls from '@/components/SimulationControls.vue'
import SimulationSidebar from '@/components/SimulationSidebar.vue'
import CandidateChecklist from '@/components/CandidateChecklist.vue'
import ActorScriptPanel from '@/components/ActorScriptPanel.vue'
import CandidateContentPanel from '@/components/CandidateContentPanel.vue'
import ImageZoomModal from '@/components/ImageZoomModal.vue'
import ImpressosModal from '@/components/ImpressosModal.vue'
import CandidateImpressosPanel from '@/components/CandidateImpressosPanel.vue'
import SimulationAiFeedbackCard from '@/components/SimulationAiFeedbackCard.vue'

// Composables Principais
import { useSimulationSession } from '@/composables/useSimulationSession.js'
import { useSimulationInvites } from '@/composables/useSimulationInvites.js'
import { useSequentialNavigation } from '@/composables/useSequentialNavigation.js'
import { useEvaluation } from '@/composables/useEvaluation.js'
import { useImagePreloading } from '@/composables/useImagePreloading.js'
import { useScriptMarking } from '@/composables/useScriptMarking.js'
import { useSimulationMeet } from '@/composables/useSimulationMeet.js'
import { useSimulationData } from '@/composables/useSimulationData.js'
import { useSimulationPEP } from '@/composables/useSimulationPEP.js'
import { useInternalInvites } from '@/composables/useInternalInvites.js'
import { useSimulationWorkflow } from '@/composables/useSimulationWorkflow.js'
import { useInviteLinkGeneration } from '@/composables/useInviteLinkGeneration.js'
import { deleteInviteFromFirestore } from '@/utils/simulationInviteCleanup.js'

// Composables de IA
import { useAiEvaluation } from '@/composables/useAiEvaluation.js'
import { useAiChat } from '@/composables/useAiChat.js'
import { useCandidateAudioTranscription } from '@/composables/useCandidateAudioTranscription.js'

// Composables de Gravação
import { useContinuousRecording } from '@/composables/useContinuousRecording.js'

// Utils de Formatação

// Bibliotecas Externas
import { io } from 'socket.io-client'

// Handlers para imagem de zoom (evitam warnings Vue)
function handleZoomImageError(_err) {
  // Silently handle zoom image errors
}
function handleZoomImageLoad(_event) {
  // Carregamento de imagem completo
}

// Funções de formatação memoizadas
// Inicializa o composable de sessão
const {
  stationId,
  sessionId,
  userRole,  stationData,
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
  validateSessionParams,} = useSimulationSession();

// Socket - declarado ANTES para uso nos composables
const socketRef = ref(null);
const connectionStatus = ref('Desconectado');
const disconnect = () => {
  if (socketRef.value) {
    socketRef.value.disconnect();
    socketRef.value = null;
  }
  connectionStatus.value = 'Desconectado';
};

// Inicializa composable de navegação sequencial
const {  goToNextSequentialStation,
  goToPreviousSequentialStation,
  exitSequentialMode,
  canGoToPrevious,
  canGoToNext,
  sequentialProgress,  setupDebugFunction
} = useSequentialNavigation({
  isSequentialMode,
  sequenceId,
  sequenceIndex,
  totalSequentialStations,
  sequentialData,
  userRole,  // ✅ FIX: Passar userRole para o composable
  socketRef,  // ? NOVO: Passar socket para sincronização
  sessionId   // ✅ NOVO: Passar sessionId para eventos Socket
});

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

// Refs para IA
const conversationHistory = ref([]);
const currentMessage = ref('');

// Simulation workflow management (ready/start/end)
// IMPORTANTE: Deve vir ANTES de useEvaluation pois exporta simulationEnded
const partner = ref(null);
const inviteLinkToShow = ref('');
const { reloadListeners } = usePrivateChatNotification();

const theme = useTheme();
const isDarkTheme = computed(() => theme.global.name.value === 'dark');

// Inicializa composable de convites de simulação (usado em sendLinkViaPrivateChat)
const { sendSimulationInvite } = useSimulationInvites(reloadListeners);

const {
  myReadyState,
  partnerReadyState,
  candidateReadyButtonEnabled,
  actorReadyButtonEnabled,
  simulationStarted,
  simulationEnded, // ✅ Gerenciado pelo composable - usado por useEvaluation
  simulationWasManuallyEndedEarly,
  backendActivated,
  bothParticipantsReady,
  // Timer local (frontend-only)
  isLocallyPaused,
  // Métodos
  sendReady,
  handleStartSimulationClick,
  manuallyEndSimulation,
  updateTimerDisplayFromSelection,
  handlePartnerReady,
  handleSimulationStart,
  handleTimerUpdate,
  handleTimerEnd,
  handleTimerStopped,
  handlePartnerDisconnect,
  handleSocketConnect,
  handleSocketDisconnect,
  toggleLocalPause,
  clearLocalTimer
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

// Router e Route (necessários para alguns composables)
const route = useRoute();
const router = useRouter();

// Candidato selecionado para simulação
const selectedCandidateForSimulation = ref(null);

watch(simulationStarted, async started => {
  if (!started) {
    if (isCandidateTranscribing.value) {
      stopCandidateTranscription();
    }
    return;
  }

  if (isCandidate.value) {
    await startCandidateTranscription();
  }

  // Iniciar gravação contínua para todos os participantes
  try {
    const recordingStarted = await startContinuousRecording();
    if (recordingStarted) {
      logger.info('[CONTINUOUS_RECORDING] 🎤 Gravação contínua iniciada com o começo da simulação');
    } else {
      logger.warn('[CONTINUOUS_RECORDING] ⚠️ Não foi possível iniciar gravação contínua');
    }
  } catch (error) {
    logger.error('[CONTINUOUS_RECORDING] ❌ Erro ao iniciar gravação contínua:', error);
  }

  if (!isActorOrEvaluator.value) {
    return;
  }

  if (!selectedCandidateForSimulation.value?.uid || !currentUser.value?.uid) {
    return;
  }

  try {
    await deleteInviteFromFirestore({
      candidateUid: selectedCandidateForSimulation.value.uid,
      senderUid: currentUser.value.uid,
      stationTitle: stationData.value?.tituloEstacao || null,
      inviteLink: inviteLinkToShow.value || null
    });
  } catch (error) {
    console.error('[SimulationView] Erro ao remover convite pendente após início da simulação:', error);
  }
});

// Google Meet integration
const {
  communicationMethod,
  meetLink,  candidateMeetLink,
  candidateOpenedMeet,
  openGoogleMeet,  checkCandidateMeetLink,
  openCandidateMeet,
  validateMeetLink,
  isMeetMode,
  getMeetLinkForInvite
} = useSimulationMeet({ userRole, route });

// Inicializa composable de geração de links de convite
const {
  generateInviteLinkWithDuration
} = useInviteLinkGeneration({
  sessionId,
  stationId,
  userRole,
  selectedDurationMinutes,
  isLoading,
  stationData,
  errorMessage,
  inviteLinkToShow,
  socket: socketRef,
  isMeetMode,
  validateMeetLink,
  getMeetLinkForInvite,
  meetLink,
  connectWebSocket,
  router,
  // ? FIX: Passar parâmetros de modo sequencial para geração de link
  isSequentialMode,
  sequenceId,
  sequenceIndex,
  totalSequentialStations
});

// Estado para copiar link de convite
const copySuccess = ref(false);

// Função para copiar link de convite para clipboard
async function copyInviteLink() {
  if (!inviteLinkToShow.value) {
    return;
  }

  try {
    await navigator.clipboard.writeText(inviteLinkToShow.value);
    copySuccess.value = true;

    // Reset após 3 segundos
    setTimeout(() => {
      copySuccess.value = false;
    }, 3000);
  } catch (error) {
    errorMessage.value = 'Erro ao copiar link. Tente novamente.';
  }
}

const autoSubmitTriggered = ref(false);

// PEP management (deve vir ANTES do useEvaluation pois exporta markedPepItems)
const {
  pepViewState,
  markedPepItems,
  togglePepItemMark,
  initializePepItems
} = useSimulationPEP({ userRole, checklistData });

// Inicializa composable de avaliação (marcadoPepItems deve estar disponível)
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
  updateEvaluationScore,} = useEvaluation({
  socket: socketRef,
  sessionId,
  stationId,
  userRole,
  currentUser,
  stationData,
  checklistData,
  simulationEnded,
  markedPepItems,
  showNotification
});

// Inicializa composable de preload de imagens
const {  zoomedImageSrc,
  zoomedImageAlt,
  imageZoomDialog,
  getImageId,
  getImageSource,
  handleImageLoad,
  handleImageError,
  clearImageCache,  preloadImpressoImages,  openImageZoom,
  closeImageZoom
} = useImagePreloading({ stationData });

// Inicializa composable de marcação de roteiro
const {
  markedScriptContexts,
  markedParagraphs,
  toggleScriptContext,
  isParagraphMarked,
  toggleParagraphMark,
  handleClick
} = useScriptMarking({ userRole });

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

// Convert releasedData object to array for CandidateImpressosPanel
const releasedDataArray = computed(() => {
  return Object.values(releasedData.value);
});

// Inicializa composable de avaliação por IA
const {
  isEvaluating: submittingEvaluation,
  evaluationCompleted: aiEvaluationSubmitted,
  runAiEvaluation
} = useAiEvaluation({
  checklistData,
  stationData,
  conversationHistory,
  sessionId,
  releasedData
});

// Inicializa composable de gravação contínua
const {
  isRecording: isContinuouslyRecording,
  isContinuous: recordingIsContinuous,
  recordingTime: continuousRecordingTime,
  audioBlob: continuousRecordingBlob,
  hasPermission: recordingHasPermission,
  error: recordingError,
  startContinuousRecording,
  stopContinuousRecording,
  getRecordingBlob,
  cleanup: cleanupRecording
} = useContinuousRecording();

// Resultado da avaliação por IA
const aiEvaluationResult = ref(null)

// Transcrição automática da fala do candidato para alimentar o histórico da IA
const candidateUserId = computed(() => currentUser.value?.uid || currentUser.value?.userId || '')
const {
  requestMicrophonePermission: requestCandidateMicPermission,
  startCapture: startCandidateTranscription,
  stopCapture: stopCandidateTranscription,
  isCapturing: isCandidateTranscribing
} = useCandidateAudioTranscription({
  sessionId,
  userId: candidateUserId,
  socketRef
})

// Controle da avaliação opcional por IA
const enableAIEvaluation = ref(false)
const showAIEvaluationDialog = ref(false)
const aiEvaluationDialogShown = ref(false)

// Função para lidar com aceite da avaliação por IA
const handleAIEvaluationAccept = async () => {
  showAIEvaluationDialog.value = false
  enableAIEvaluation.value = true

  logger.info('[IA_EVALUATION] 🤖 Candidato aceitou avaliação por IA, iniciando...');

  try {
    // ✅ NOVO: Sincronizar histórico de conversa com backend antes de avaliar
    logger.info('[IA_EVALUATION] 🔄 Sincronizando histórico de conversa antes da avaliação...');
    
    const syncedHistory = await syncConversationHistory();
    
    if (syncedHistory.length === 0) {
      logger.warn('[IA_EVALUATION] ⚠️ Histórico de conversa vazio após sincronização');
      showNotification(
        'Não há histórico de conversa para avaliar. A avaliação pode ser imprecisa.',
        'warning'
      );
    } else {
      logger.info('[IA_EVALUATION] ✅ Histórico sincronizado', {
        entries: syncedHistory.length
      });
    }

    // Executar avaliação com histórico sincronizado
    const result = await runAiEvaluation();
    
    if (result) {
      // Armazenar resultado da avaliação por IA
      aiEvaluationResult.value = result
      logger.info('[IA_EVALUATION] ✅ Avaliação por IA concluída com sucesso', {
        scoresCount: Object.keys(result.scores || {}).length,
        totalScore: result.total,
        conversationEntries: syncedHistory.length
      });
      showNotification('Avaliação por IA concluída! Verifique os resultados.', 'success');
    } else {
      logger.warn('[IA_EVALUATION] ⚠️ Avaliação por IA retornou resultado vazio');
      showNotification('Avaliação por IA não foi possível', 'warning');
    }
  } catch (error) {
    logger.error('[IA_EVALUATION] ❌ Erro na avaliação por IA', error);
    showNotification('Erro na avaliação por IA', 'error');
  }
}

// Função para recusar avaliação por IA
const handleAIEvaluationDecline = () => {
  showAIEvaluationDialog.value = false
  enableAIEvaluation.value = false
  logger.info('[IA_EVALUATION] ?? Candidato recusou avaliação por IA');
}

// ✅ NOVO: Função para sincronizar histórico de conversa com backend
const syncConversationHistory = () => {
  return new Promise((resolve, reject) => {
    if (!socketRef.value?.connected) {
      logger.warn('[CONVERSATION_HISTORY] ⚠️ Socket não conectado, impossível sincronizar');
      resolve([]); // Retorna array vazio mas não rejeita
      return;
    }
    
    if (!sessionId.value) {
      logger.warn('[CONVERSATION_HISTORY] ⚠️ SessionId não disponível, impossível sincronizar');
      resolve([]);
      return;
    }
    
    logger.info('[CONVERSATION_HISTORY] 📡 Solicitando sincronização de histórico...');
    
    // Timeout de 5 segundos para evitar travamento
    const timeout = setTimeout(() => {
      logger.warn('[CONVERSATION_HISTORY] ⏱️ Timeout ao aguardar sincronização');
      resolve(conversationHistory.value); // Retorna o que temos
    }, 5000);
    
    // Listener temporário para receber a sincronização
    const syncHandler = (data) => {
      clearTimeout(timeout);
      
      if (data && Array.isArray(data.conversationHistory)) {
        logger.info('[CONVERSATION_HISTORY] ✅ Sincronização bem-sucedida', {
          entries: data.conversationHistory.length
        });
        
        // Mapear para formato esperado
        const mappedHistory = data.conversationHistory.map(entry => ({
          role: entry.role,
          content: entry.text || entry.content,
          timestamp: entry.timestamp,
          speakerId: entry.speakerId,
          speakerName: entry.speakerName
        }));
        
        conversationHistory.value = mappedHistory;
        resolve(mappedHistory);
      } else {
        logger.warn('[CONVERSATION_HISTORY] ⚠️ Sincronização retornou dados inválidos');
        resolve(conversationHistory.value);
      }
      
      // Remover listener após uso
      socketRef.value.off('SERVER_AI_TRANSCRIPT_SYNC', syncHandler);
    };
    
    // Registrar listener
    socketRef.value.once('SERVER_AI_TRANSCRIPT_SYNC', syncHandler);
    
    // Solicitar sincronização
    socketRef.value.emit('CLIENT_REQUEST_AI_TRANSCRIPT_SYNC');
  });
}

// Aliases para manter compatibilidade com template (funções já têm debounce interno)
const debouncedToggleParagraphMark = toggleParagraphMark;
const debouncedToggleScriptContext = toggleScriptContext;

const tryAutoSubmitEvaluation = async () => {
  if (
    autoSubmitTriggered.value ||
    userRole.value !== 'candidate' ||
    !simulationEnded.value ||
    simulationWasManuallyEndedEarly.value ||
    evaluationSubmittedByCandidate.value
  ) {
    return;
  }

  if (!socketRef.value?.connected || !sessionId.value) {
    return;
  }

  const candidateScores = candidateReceivedScores.value || {};
  const evaluatorScores = evaluationScores.value || {};

  const hasScores =
    (candidateScores && Object.keys(candidateScores).length > 0) ||
    (evaluatorScores && Object.keys(evaluatorScores).length > 0);

  if (!hasScores) {
    return;
  }

  autoSubmitTriggered.value = true;

  try {
    await submitEvaluation();
  } catch (error) {
    autoSubmitTriggered.value = false;
    console.error('[AUTO_SUBMIT] Falha ao submeter avaliação automaticamente:', error);
  }
};

// Função handler para atualização de scores de avaliação
function handleEvaluationScoreUpdate({ itemId, score }) {
  updateEvaluationScore(itemId, score);
}

// Internal invites management
const {  internalInviteDialog,
  internalInviteData,
  handleOnlineUsersList,  handleInternalInviteReceived,
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

// Chat integration refs
const sendingChat = ref(false);
const chatSentSuccess = ref(false);

// Importar userStore para verificação de permissões
const { canEditStations } = useUserStore();

const isAdmin = computed(() => {
  return canEditStations.value;
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
// Todos os estados de workflow agora são gerenciados pelo composable

// fetchSimulationData agora está no composable useSimulationSession

function clearSelectedCandidate() {
  try {
    sessionStorage.removeItem('selectedCandidate');
  } catch (error) {
    // Silently handle error
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
    console.error('Erro ao enviar link via chat privado:', error);
    errorMessage.value = 'Erro ao enviar convite. Tente novamente.';
  } finally {
    sendingChat.value = false;
  }
}


function connectWebSocket() {
  if (!sessionId.value || !userRole.value || !stationId.value || !currentUser.value?.uid) {
    console.error('[WebSocket] ❌ Parâmetros faltando');
    return;
  }
  connectionStatus.value = 'Conectando';
  if (socketRef.value && socketRef.value.connected) { 
    socketRef.value.disconnect(); 
  }
  
  // ✅ FIX: Incluir parâmetros de modo sequencial na conexão Socket
  const socketQuery = {
    sessionId: sessionId.value,
    userId: currentUser.value?.uid,
    role: userRole.value,
    stationId: stationId.value,
    displayName: currentUser.value?.displayName
  };

  // Se está em modo sequencial, adiciona os parâmetros à query
  if (isSequentialMode.value) {
    socketQuery.isSequential = 'true';
    socketQuery.sequenceId = sequenceId.value;
    socketQuery.sequenceIndex = sequenceIndex.value?.toString();
    socketQuery.totalStations = totalSequentialStations.value?.toString();
  }
  const socket = io(backendUrl, {
    transports: ['websocket'],
    query: socketQuery
  });
  
  // Registrar listener ANTES da conexão para capturar evento imediato
  socket.on('SERVER_SEQUENTIAL_MODE_INFO', (data) => {
    if (data.isSequential) {
      isSequentialMode.value = true;
      sequenceId.value = data.sequenceId;
      sequenceIndex.value = parseInt(data.sequenceIndex) || 0;
      totalSequentialStations.value = parseInt(data.totalStations) || 0;
      
      // Persiste no sessionStorage para sobreviver a reloads
      const sequentialSession = {
        sequenceId: data.sequenceId,
        currentIndex: data.sequenceIndex,
        totalStations: data.totalStations,
        sequence: sequentialData.value?.sequence || []
      };
      sessionStorage.setItem('sequentialSession', JSON.stringify(sequentialSession));
    }
  });
  
  socket.on('connect', () => {
    connectionStatus.value = 'Conectado';
    
    // ATUALIZAR O REF DO SOCKET APÓS CONEXÃO
    socketRef.value = socket;

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
    
    // Captura erro no Sentry
    captureWebSocketError(err, {
      socketId: socket?.id,
      sessionId: sessionId.value,
      connectionState: 'failed',
      lastEvent: 'connect_error'
    });
  });
  socket.on('SERVER_ERROR', (data) => {
        errorMessage.value = `Erro do servidor: ${data.message}`;

    // Captura erro no Sentry
    captureSimulationError(new Error(data.message), {
      sessionId: sessionId.value,
      userRole: userRole.value,
      stationId: stationId.value,
      simulationState: simulationStarted.value ? 'started' : 'preparing'
    });
  });
  socket.on('SERVER_JOIN_CONFIRMED', (_data) => { });
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
      // REMOVIDO: Notifica00e700e3o indesejada sobre finaliza00e700e3o manual
    } else if (data?.reason === 'tempo esgotado' && !errorMessage.value) {
      errorMessage.value = "Simulação encerrada: tempo esgotado.";
    } else if (!errorMessage.value) {
      errorMessage.value = "Simulação encerrada.";
    }
  });
  socket.on('CANDIDATE_RECEIVE_PEP_VISIBILITY', (payload) => {
    // Log apenas para candidatos (outros roles podem receber o evento mas não devem processar)
    if (userRole.value === 'candidate') {
      console.log('[PEP_VISIBILITY] 📥 Evento CANDIDATE_RECEIVE_PEP_VISIBILITY recebido');
      console.log('[PEP_VISIBILITY]    - sessionId atual:', sessionId.value);
      console.log('[PEP_VISIBILITY]    - payload:', payload);
      console.log('[PEP_VISIBILITY]    - isChecklistVisibleForCandidate (antes):', isChecklistVisibleForCandidate.value);
    }

    if (userRole.value === 'candidate' && payload && typeof payload.shouldBeVisible === 'boolean') {
      console.log('[PEP_VISIBILITY] ✅ Validações iniciais passaram - processando...');

      // Validar sessionId se disponível no payload (segurança extra)
      if (payload.sessionId && payload.sessionId !== sessionId.value) {
        console.warn('[PEP_VISIBILITY] ⚠️ SessionId não corresponde!', {
          payloadSessionId: payload.sessionId,
          currentSessionId: sessionId.value
        });
        return;
      }

      console.log('[PEP_VISIBILITY] ✅ SessionId validado - atualizando visibilidade');
      isChecklistVisibleForCandidate.value = payload.shouldBeVisible;
      console.log('[PEP_VISIBILITY]    - isChecklistVisibleForCandidate (depois):', isChecklistVisibleForCandidate.value);

      // FORÇAR REATIVIDADE: Usar nextTick() para garantir que Vue processa a mudança
      nextTick(() => {
        // Forçar Vue a notificar watchers sobre a mudança
        triggerRef(isChecklistVisibleForCandidate);
        console.log('[PEP_VISIBILITY] 🔄 Reatividade forçada com triggerRef()');

        // Notificar o candidato quando o PEP é liberado
        if (payload.shouldBeVisible) {
          console.log('[PEP_VISIBILITY] 🔔 Exibindo notificação para candidato');
          showNotification('O PEP (checklist de avaliação) foi liberado pelo examinador!', 'success');
        }
      });
    }
    // Remove os warnings desnecessários quando ator recebe evento destinado ao candidato
    // (isso é comportamento esperado já que o backend envia para todos na sessão)
  });
  
  // ✅ NOVO: Listener para transcrições de IA (populando conversationHistory)
  socket.on('SERVER_AI_TRANSCRIPT_UPDATE', (entry) => {
    if (!entry || !entry.text) return;
    
    logger.info('[CONVERSATION_HISTORY] 📝 Nova transcrição recebida', {
      role: entry.role,
      speakerId: entry.speakerId,
      textLength: entry.text.length
    });
    
    // Adicionar ao histórico de conversa
    conversationHistory.value.push({
      role: entry.role,
      content: entry.text,
      timestamp: entry.timestamp || new Date().toISOString(),
      speakerId: entry.speakerId,
      speakerName: entry.speakerName
    });
    
    // Limite de segurança para evitar crescimento infinito
    if (conversationHistory.value.length > 500) {
      conversationHistory.value.shift();
      logger.warn('[CONVERSATION_HISTORY] ⚠️ Histórico atingiu limite, removendo entrada mais antiga');
    }
  });
  
  // ✅ NOVO: Listener para sincronização de histórico completo
  socket.on('SERVER_AI_TRANSCRIPT_SYNC', (data) => {
    if (data && Array.isArray(data.conversationHistory)) {
      logger.info('[CONVERSATION_HISTORY] 🔄 Sincronização de histórico recebida', {
        entries: data.conversationHistory.length
      });
      
      // Mapear para formato esperado pelo frontend
      conversationHistory.value = data.conversationHistory.map(entry => ({
        role: entry.role,
        content: entry.text || entry.content,
        timestamp: entry.timestamp,
        speakerId: entry.speakerId,
        speakerName: entry.speakerName
      }));
      
      logger.info('[CONVERSATION_HISTORY] ✅ Histórico sincronizado com sucesso', {
        totalEntries: conversationHistory.value.length
      });
    }
  });
  
  // Listener para quando o ator avança, todos os participantes navegam juntos
  socket.on('SERVER_SEQUENTIAL_ADVANCE', (data) => {
    if (!isSequentialMode.value) {
      return;
    }

    const {
      nextStationId,
      sequenceIndex: nextIndex,
      sequenceId: seqId,
      sessionId: nextSessionId
    } = data;

    // Persistir progresso e sessionId compartilhado
    const updatedData = { ...(sequentialData.value || {}) };
    updatedData.currentIndex = nextIndex;
    if (nextSessionId) {
      updatedData.sharedSessionId = nextSessionId;
      sessionId.value = nextSessionId;
    }
    sequentialData.value = updatedData;
    sessionStorage.setItem('sequentialSession', JSON.stringify(updatedData));

    const navigationTarget = {
      path: `/app/simulation/${nextStationId}`,
      query: {
        sessionId: nextSessionId || sessionId.value,
        role: userRole.value,
        sequential: 'true',
        sequenceId: seqId || sequenceId.value,
        sequenceIndex: nextIndex,
        totalStations: totalSequentialStations.value,
        autoReady: 'false'
      }
    };

    // Delay curto para garantir que stores atualizem antes da navegação
    setTimeout(() => {
      router.push(navigationTarget).then(() => {
        setupSession();
      }).catch(err => {
        if (err && err.name !== 'NavigationDuplicated') {
          console.error('Falha ao navegar para próxima estação:', err);
        }
      });
    }, 300);
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
      
      // Atualizar markedPepItems se fornecido pelo servidor
      if (data.markedPepItems) {
        markedPepItems.value = { ...data.markedPepItems };
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
        showNotification(`Candidato submeteu avaliação final. Nota: ${data.totalScore?.toFixed(2) || 'N/A'}`, 'info');
    }

    // Garantir que o usuário volte ao topo da página ao iniciar próxima estação
  });
}


function loadSelectedCandidate() {
  const candidateData = sessionStorage.getItem('selectedCandidate');

  if (candidateData) {
    try {
      const candidate = JSON.parse(candidateData);
      selectedCandidateForSimulation.value = candidate;
    } catch (error) {
      console.error('Erro ao carregar candidato selecionado:', error);
    }
  } else {
    // Nenhum candidato salvo no sessionStorage
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
  if (socketRef.value && socketRef.value.connected) {
    disconnect();
  } else {
    socketRef.value = null;
  }

  // Configura IDs e papel do usuário
  stationId.value = route.params.id;
  sessionId.value = route.query.sessionId;
  userRole.value = route.query.role || 'evaluator';
  
  // Configuração do modo sequencial
  setupSequentialMode(route.query);
  
  if (isSequentialMode.value) {
    if (sessionId.value && sequentialData.value) {
      const updatedSequential = { ...sequentialData.value };
      if (!updatedSequential.sharedSessionId) {
        updatedSequential.sharedSessionId = sessionId.value;
        sequentialData.value = updatedSequential;
        sessionStorage.setItem('sequentialSession', JSON.stringify(updatedSequential));
      }
    }
  }

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
  evaluationSubmittedByCandidate.value = false;
  autoSubmitTriggered.value = false;

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

    // Se já temos um sessionId, conecta o WebSocket
    if (sessionId.value) {
      // Configura o WebSocket com todos os event listeners
      connectWebSocket();

      // Auto-ready apenas para ATOR/AVALIADOR em navegação sequencial
      // ❌ CANDIDATO NUNCA TEM AUTO-READY - deve clicar manualmente
      if (shouldAutoReady && isActorOrEvaluator.value) {
        setTimeout(() => {
          if (!myReadyState.value && socketRef.value?.connected) {
            console.log('[AUTO-READY] ✅ Ator/Avaliador marcando-se como pronto automaticamente');
            sendReady();
          }
        }, 1000);
      }
    }
  });
}

onMounted(() => {
  setupSession();

  if (isCandidate.value) {
    requestCandidateMicPermission().catch(error => {
      logger.warn('[IA_EVALUATION] ⚠️ Permissão de microfone para transcrição automática negada ou falhou', error);
    });
  }

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
  const toggleMarkHandler = (e) => handleClick(e.detail);
  document.addEventListener('toggleMark', toggleMarkHandler);

  // Cleanup no onUnmounted
  onUnmounted(() => {
    document.removeEventListener('keydown', handleEscKey);
    document.removeEventListener('toggleMark', toggleMarkHandler);
  });
});

onUnmounted(() => {
  disconnect();
  // Limpar candidato selecionado ao sair da simulação
  try {
    sessionStorage.removeItem('selectedCandidate');
  } catch (error) {
    // Silently handle error
  }
});

watch(() => route.fullPath, (newPath, oldPath) => {
  if (newPath !== oldPath) {
    setupSession();
    checkCandidateMeetLink();
    requestAnimationFrame(() => {
      try {
  
        window.scrollTo({ top: 0, behavior: 'auto' });
      } catch (error) {
        window.scrollTo(0, 0);
      }
    });
  }
});

// --- Funções de Interação ---

// Função para manter os callbacks de avaliação
watch([evaluationScores, markedPepItems], ([newScores, newMarks]) => {
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
  console.log('[PEP_DEBUG] 📊 Watcher de avaliação ativado');
  console.log('[PEP_DEBUG]   - Novo scores:', newScores);
  console.log('[PEP_DEBUG]   - Novo markedPepItems:', newMarks);
  console.log('[PEP_DEBUG]   - Socket conectado:', socketRef.value?.connected);
  console.log('[PEP_DEBUG]   - UserRole:', userRole.value);
  console.log('[PEP_DEBUG]   - PEP liberado:', pepReleasedToCandidate.value);

  if (
    socketRef.value?.connected &&
    (userRole.value === 'actor' || userRole.value === 'evaluator') &&
    pepReleasedToCandidate.value
  ) {
    console.log('[PEP_DEBUG] ✅ Condições atendidas - emitindo evento EVALUATOR_SCORES_UPDATED_FOR_CANDIDATE');
  } else {
    console.log('[PEP_DEBUG] 📤 Payload preparado:', {
      sessionId: sessionId.value,
      scores: numericScores,
      markedPepItems: newMarks,
      totalScore: Object.values(numericScores).reduce((sum, v) => sum + (isNaN(v) ? 0 : v), 0)
    });
    
    socketRef.value.emit('EVALUATOR_SCORES_UPDATED_FOR_CANDIDATE', {
      sessionId: sessionId.value,
      scores: numericScores,
      markedPepItems: newMarks,
      totalScore: Object.values(numericScores).reduce((sum, v) => sum + (isNaN(v) ? 0 : v), 0)
    });
    
    console.log('[PEP_DEBUG] ✅ Evento EVALUATOR_SCORES_UPDATED_FOR_CANDIDATE emitido');
    console.log('[PEP_DEBUG] ❌ Condições NÃO atendidas para emitir evento');
    console.log('[PEP_DEBUG]   - Socket conectado:', socketRef.value?.connected);
    console.log('[PEP_DEBUG]   - É ator/avaliador:', (userRole.value === 'actor' || userRole.value === 'evaluator'));
    console.log('[PEP_DEBUG]   - PEP liberado:', pepReleasedToCandidate.value);
  }
    });

    socketRef.value.emit('EVALUATOR_SCORES_UPDATED_FOR_CANDIDATE', {
      sessionId: sessionId.value,
      scores: numericScores,
      markedPepItems: newMarks,
      totalScore: Object.values(numericScores).reduce((sum, v) => sum + (isNaN(v) ? 0 : v), 0)
    });
  }
}, { deep: true });

// Watcher para liberar PEP automaticamente ao final da simulação
watch(simulationEnded, (newValue) => {
  if (newValue) {
    // Parar gravação contínua quando a simulação termina (para todos os participantes)
    try {
      const recordingStopped = stopContinuousRecording();
      if (recordingStopped) {
        logger.info('[CONTINUOUS_RECORDING] ⏹️ Gravação contínua finalizada com o término da simulação');

        // Salvar blob da gravação para uso posterior
        const recordingBlob = getRecordingBlob();
        if (recordingBlob) {
          logger.info('[CONTINUOUS_RECORDING] 💾 Gravação contínua salva para avaliação', {
            size: recordingBlob.size,
            type: recordingBlob.type
          });
        }
      } else {
      logger.warn('[CONTINUOUS_RECORDING] ⚠️ Nenhuma gravação contínua estava em andamento');
    }
  } catch (error) {
    logger.error('[CONTINUOUS_RECORDING] ❌ Erro ao finalizar gravação contínua:', error);
  }

    if (isCandidateTranscribing.value) {
      stopCandidateTranscription();
      logger.info('[CONVERSATION_HISTORY] ⏹️ Transcrição automática do candidato finalizada com o término da simulação');
    }
}

  if (
    newValue && // Simulação terminou
    (userRole.value === 'actor' || userRole.value === 'evaluator') && // É ator/avaliador
    !pepReleasedToCandidate.value && // PEP ainda não foi liberado
    socketRef.value?.connected && // Socket conectado
    sessionId.value // Tem sessionId
  ) {
    releasePepToCandidate();
  }
});

// Watcher para acionar avaliação por IA ao final da simulação (apenas para candidatos)
watch(simulationEnded, async (newValue) => {
  if (newValue && checklistData.value?.itensAvaliacao?.length > 0 && userRole.value === 'candidate') {
    // Aguardar um pouco para garantir que todos os dados estejam prontos
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mostrar diálogo de avaliação opcional (apenas para candidatos)
    if (!aiEvaluationDialogShown.value) {
      showAIEvaluationDialog.value = true;
      aiEvaluationDialogShown.value = true;
      logger.info('[IA_EVALUATION] ?? Diálogo de avaliação por IA disponibilizado para o candidato');
    }
  }
});

watch(
  [simulationEnded, simulationWasManuallyEndedEarly, evaluationSubmittedByCandidate],
  () => {
    tryAutoSubmitEvaluation();
  }
);

watch(
  [candidateReceivedScores, evaluationScores],
  () => {
    if (simulationEnded.value) {
      tryAutoSubmitEvaluation();
    }
  },
  { deep: true }
);

onUnmounted(() => {
  document.removeEventListener('toggleMark', (e) => handleClick(e.detail));
});

// --- FUNÇÕES PARA SIMULAÇÃO SEQUENCIAL ---

// Função de debug para diagnóstico
setupDebugFunction({
  isActorOrEvaluator,
  simulationEnded,
  allEvaluationsCompleted,
  evaluationScores,
  checklistData
});

// --- NOVO: Comunicação Google Meet ---

// Watcher para navegação automática em modo sequencial
// Quando simulação termina E está em modo sequencial, habilitar navegação
watch([isSequentialMode, simulationEnded, allEvaluationsCompleted, canGoToNext],
  ([sequential, ended, _, canNext]) => {
    if (sequential && ended && userRole.value === 'candidate' && canNext) {
      showNotification('Aguardando o examinador avançar para a próxima estação.', 'info');
    }
  },
  { immediate: true }
);

// --- CONTROLE DE USUÁRIOS ONLINE E CONVITE INTERNO ---

// Atualiza lista de usuários online ao receber do backend
if (socketRef.value) {
  socketRef.value.on('SERVER_ONLINE_USERS', handleOnlineUsersList);
}

// Solicita lista de usuários online ao conectar
watch(connectionStatus, (status) => {
  if (status === 'Conectado' && socketRef.value?.connected) {
    requestOnlineUsers('candidate');
    tryAutoSubmitEvaluation();
  }
});

// --- CONTROLE DE CONVITE INTERNO (CANDIDATO ONLINE) ---

onUnmounted(() => {
  // ...existing code...
  if (socketRef.value) {
    socketRef.value.off('INTERNAL_INVITE_RECEIVED', handleInternalInviteReceived);
    
    // ✅ NOVO: Limpar listeners de transcrição de conversa
    socketRef.value.off('SERVER_AI_TRANSCRIPT_UPDATE');
    socketRef.value.off('SERVER_AI_TRANSCRIPT_SYNC');
    logger.info('[CONVERSATION_HISTORY] 🧹 Listeners de transcrição removidos no unmount');
  }

  // Limpar gravação contínua
  try {
    cleanupRecording();
    logger.info('[CONTINUOUS_RECORDING] 🧹 Recursos de gravação limpos no unmount');
  } catch (error) {
    logger.error('[CONTINUOUS_RECORDING] ❌ Erro ao limpar recursos de gravação:', error);
  }

  if (isCandidateTranscribing.value) {
    stopCandidateTranscription();
    logger.info('[CONVERSATION_HISTORY] 🧹 Transcrição automática do candidato finalizada no unmount');
  }
});

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
    :socket-ref="socketRef"
    :session-id="sessionId"
    :user-role="userRole"
    :is-locally-paused="isLocallyPaused"
    :toggle-local-pause="toggleLocalPause"
    :clear-local-timer="clearLocalTimer"
    :is-recording="isContinuouslyRecording"
    :recording-time="continuousRecordingTime"
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
        :actor-ready-button-enabled="actorReadyButtonEnabled"
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

            <!-- IMPRESSOS DO ATOR/AVALIADOR -->
            <template v-if="releasedDataArray.length > 0">
              <CandidateImpressosPanel
                :released-data="releasedDataArray"
                :is-dark-theme="isDarkTheme"
                :get-image-source="getImageSource"
                :get-image-id="getImageId"
                :open-image-zoom="openImageZoom"
                :handle-image-error="handleImageError"
                :handle-image-load="handleImageLoad"
              />
            </template>

  
            <!-- PEP CHECKLIST PARA ATOR/AVALIADOR -->
            <template v-if="checklistData?.itensAvaliacao?.length > 0">
              <CandidateChecklist
                :checklist-data="checklistData"
                :simulation-started="simulationStarted"
                :simulation-ended="simulationEnded"
                :simulation-was-manually-ended-early="simulationWasManuallyEndedEarly"
                :is-checklist-visible-for-candidate="true"
                :marked-pep-items="markedPepItems"
                :evaluation-scores="evaluationScores"
                :candidate-received-scores="candidateReceivedScores"
                :candidate-received-total-score="candidateReceivedTotalScore"
                :total-score="totalScore"
                :evaluation-submitted-by-candidate="evaluationSubmittedByCandidate"
                :is-actor-or-evaluator="isActorOrEvaluator"
                :is-candidate="isCandidate"
                @toggle-pep-item-mark="togglePepItemMark"
                @update:evaluation-scores="handleEvaluationScoreUpdate"
                @submit-evaluation="submitEvaluation"
              />
            </template>

            <!-- FEEDBACK DA AVALIAÇÃO POR IA -->
            <SimulationAiFeedbackCard
              v-if="aiEvaluationResult && simulationEnded"
              :feedback="aiEvaluationResult.performance"
              :scores="aiEvaluationResult.scores"
              :total-score="aiEvaluationResult.total"
              :details="aiEvaluationResult.details"
              :loading="submittingEvaluation"
              :error="aiEvaluationResult.error"
              :is-dark-theme="isDarkTheme"
              :metadata="aiEvaluationResult.metadata"
            />
           </div>

           <!-- NAVEGAÇÃO SEQUENCIAL - Botão Próxima Estação -->
           <VCard
             v-if="isSequentialMode && isActorOrEvaluator && simulationEnded"
             class="mt-6 sequential-next-card"
             :class="isDarkTheme ? 'sequential-next-card--dark' : 'sequential-next-card--light'"
           >
             <VCardText class="text-center pa-6">
         
               <VAlert
                 v-if="!allEvaluationsCompleted"
                 type="info"
                 variant="tonal"
                 class="mb-4"
               >
                 <VIcon icon="ri-information-line" class="me-2" :tabindex="undefined" />
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
                 @click="$router.push('/app/station-list')"
                 class="px-8"
                 variant="elevated"
               >
                 Finalizar Sequência Completa
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
                                 <VIcon :icon="myReadyState ? 'ri-checkbox-circle-line' : 'ri-checkbox-blank-circle-line'" class="me-2" :tabindex="undefined"/>
                                 {{ myReadyState ? 'Pronto!' : 'Estou Pronto!' }}
                             </VBtn>
                             <VChip v-else color="success" size="large">
                                 <VIcon icon="ri-checkbox-circle-line" class="me-2" :tabindex="undefined"/>
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
               :released-data="releasedDataArray"
               :is-dark-theme="isDarkTheme"
               :get-image-source="getImageSource"
               :get-image-id="getImageId"
               :open-image-zoom="openImageZoom"
               :handle-image-error="handleImageError"
               :handle-image-load="handleImageLoad"
             />

             <!-- PEP CHECKLIST PARA CANDIDATO -->
             <template v-if="checklistData?.itensAvaliacao?.length > 0">
               <CandidateChecklist
                 :checklist-data="checklistData"
                 :simulation-started="simulationStarted"
                 :simulation-ended="simulationEnded"
                 :simulation-was-manually-ended-early="simulationWasManuallyEndedEarly"
                 :is-checklist-visible-for-candidate="isChecklistVisibleForCandidate"
                 :marked-pep-items="markedPepItems"
                 :evaluation-scores="evaluationScores"
                 :candidate-received-scores="candidateReceivedScores"
                 :candidate-received-total-score="candidateReceivedTotalScore"
                 :total-score="totalScore"
                 :evaluation-submitted-by-candidate="evaluationSubmittedByCandidate"
                 :is-actor-or-evaluator="false"
                 :is-candidate="true"
                 @toggle-pep-item-mark="togglePepItemMark"
                 @update:evaluation-scores="handleEvaluationScoreUpdate"
                 @submit-evaluation="submitEvaluation"
               />
             </template>

             <!-- FEEDBACK DA AVALIAÇÃO POR IA PARA CANDIDATO -->
             <SimulationAiFeedbackCard
               v-if="aiEvaluationResult && simulationEnded"
               :feedback="aiEvaluationResult.performance"
               :scores="aiEvaluationResult.scores"
               :total-score="aiEvaluationResult.total"
               :details="aiEvaluationResult.details"
               :loading="submittingEvaluation"
               :error="aiEvaluationResult.error"
               :is-dark-theme="isDarkTheme"
               :metadata="aiEvaluationResult.metadata"
             />
             
             <!-- Card de Navegação Sequencial para CANDIDATO (aguardando ator avançar) -->
             <VCard
               v-if="isSequentialMode && isCandidate && simulationEnded && canGoToNext"
               :class="[
                 'mb-6 sequential-navigation-card',
                 isDarkTheme ? 'sequential-navigation-card--dark' : 'sequential-navigation-card--light'
               ]"
             >
               <VCardItem>
                 <VCardTitle class="d-flex align-center">
                   <VIcon color="info" icon="ri-route-line" size="large" class="me-2" :tabindex="undefined" />
                   Navegação Sequencial
                 </VCardTitle>
               </VCardItem>
               <VCardText>
                 <VAlert variant="tonal" color="info" class="mb-4">
                   <div class="d-flex align-center">
                     <VIcon icon="ri-time-line" class="me-2" :tabindex="undefined" />
                     <div>
                       <div class="font-weight-bold">Aguardando Avaliador</div>
                       <div class="text-body-2">
                         O avaliador irá avançar para a próxima estação quando estiver pronto. 
                         Você será redirecionado automaticamente.
                       </div>
                     </div>
                   </div>
                 </VAlert>

                 <div class="text-center">
                   <VProgressCircular
                     indeterminate
                     color="info"
                     :size="40"
                     :width="4"
                   />
                   <div class="text-caption text-medium-emphasis mt-2">
                     Estação {{ sequenceIndex + 1 }}/{{ totalSequentialStations }} concluída
                   </div>
                 </div>
               </VCardText>
             </VCard>
           </div>
         </VCol>
 
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
                 <VIcon color="primary" icon="ri-route-line" size="large" class="me-2" :tabindex="undefined" />
                 Navegação Sequencial
               </VCardTitle>
             </VCardItem>
             <VCardText>
               <VAlert variant="tonal" color="success" class="mb-4">
                 <div class="d-flex align-center">
                   <VIcon icon="ri-checkbox-circle-line" class="me-2" :tabindex="undefined" />
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
                   @click="$router.push('/app/station-list')"
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

     <!-- Diálogo de Avaliação por IA (apenas para candidatos) -->
     <VDialog v-model="showAIEvaluationDialog" max-width="500" persistent>
       <VCard>
         <VCardTitle class="text-h5">
           <VIcon color="primary" class="mr-2">mdi-robot</VIcon>
           Avaliação por Inteligência Artificial
         </VCardTitle>
         <VCardText>
           <p class="text-body-1 mb-4">
             A simulação foi finalizada! Deseja receber uma avaliação automática por IA da sua performance nesta estação?
           </p>
           <p class="text-caption text-medium-emphasis mb-2">
             <VIcon size="small" class="mr-1">mdi-information</VIcon>
             A IA analisará sua conversa e os critérios do PEP para fornecer feedback detalhado.
           </p>
           <VAlert type="info" variant="tonal" class="mt-3">
             <template #prepend>
               <VIcon>mdi-lightbulb</VIcon>
             </template>
             Esta avaliação é opcional e pode ajudar a identificar pontos fortes e áreas de melhoria.
           </VAlert>
         </VCardText>
         <VCardActions>
           <VSpacer />
           <VBtn
             text
             @click="handleAIEvaluationDecline"
             :disabled="submittingEvaluation"
           >
             Não, obrigado
           </VBtn>
           <VBtn
             color="primary"
             @click="handleAIEvaluationAccept"
             :loading="submittingEvaluation"
           >
             <VIcon class="mr-1">mdi-robot</VIcon>
             Avaliar minha performance
           </VBtn>
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
       <VIcon icon="ri-file-text-line" :tabindex="undefined" />
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
