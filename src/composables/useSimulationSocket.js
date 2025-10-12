// src/composables/useSimulationSocket.ts
import { io } from 'socket.io-client';
import { ref, onBeforeUnmount } from 'vue';
import { backendUrl } from '@/utils/backendUrl.js';
import { captureWebSocketError, captureSimulationError } from '@/plugins/sentry';
import Logger from '@/utils/logger';
const logger = new Logger('useSimulationSocket');


/**
 * @typedef {Object} SimulationSocketOptions
 * @property {import('vue').Ref<string>} sessionId
 * @property {import('vue').Ref<string>} userRole
 * @property {import('vue').Ref<string>} stationId
 * @property {import('vue').Ref<any>} currentUser
 * @property {import('vue').Ref<any>} stationData
 * @property {import('vue').Ref<boolean>} simulationStarted
 * @property {import('vue').Ref<string>} errorMessage
 * @property {import('vue').Ref<any>} partner
 * @property {import('vue').Ref<boolean>} partnerReadyState
 * @property {import('vue').Ref<boolean>} myReadyState - 🔧 NOVO: Estado ready do usuário atual
 * @property {import('vue').Ref<boolean>} backendActivated - 🔧 NOVO: Estado de ativação do backend
 * @property {() => void} handleSocketConnect
 * @property {() => void} handleSocketDisconnect
 * @property {() => void} handlePartnerDisconnect
 * @property {(message: string, color?: string) => void} showNotification
 * @property {import('vue').Ref<any>} [socketRef] - 🔧 NOVO: Referência externa para sincronização
 */

/**
 * @param {SimulationSocketOptions} options
 */
export function useSimulationSocket(options) {
  const {
    sessionId,
    userRole,
    stationId,
    currentUser,
    stationData,
    simulationStarted,
    errorMessage,
    partner,
    partnerReadyState,
    myReadyState, // 🔧 NOVO: Estado ready do usuário atual
    backendActivated, // 🔧 NOVO: Estado de ativação do backend
    handleSocketConnect,
    handleSocketDisconnect,
    handlePartnerDisconnect,
    showNotification,
    socketRef // 🔧 NOVO: Referência externa opcional
  } = options;

  const socket = ref(null)
  const connectionStatus = ref('Desconectado')

  function connectWebSocket() {
    if (!sessionId.value || !userRole.value || !stationId.value || !currentUser.value?.uid) {
      return;
    }

    connectionStatus.value = 'Conectando';
    if (socket.value && socket.value.connected) {
      socket.value.disconnect();
    }

    const socketInstance = io(backendUrl, {
      transports: ['websocket'],
      query: {
        sessionId: sessionId.value,
        userId: currentUser.value?.uid,
        role: userRole.value,
        stationId: stationId.value,
        displayName: currentUser.value?.displayName
      }
    });

    socketInstance.on('connect', () => {
      connectionStatus.value = 'Conectado';
      socket.value = socketInstance;

      // 🔧 NOVO: Sincronizar referência externa se fornecida
      if (socketRef) {
        socketRef.value = socketInstance;
        logger.debug('[SOCKET] ✅ Referência externa sincronizada:', socketInstance.id);
      }

      handleSocketConnect();
      logger.debug('[SOCKET] 🟢 Conectado com sucesso - ID:', socketInstance.id);
    });

    socketInstance.on('disconnect', (reason) => {
      connectionStatus.value = 'Desconectado';
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

    socketInstance.on('connect_error', (err) => {
      connectionStatus.value = 'Erro de Conexão';
      if (!errorMessage.value) errorMessage.value = `Falha ao conectar: ${err.message}`;

      captureWebSocketError(err, {
        socketId: socketInstance?.id,
        sessionId: sessionId.value,
        connectionState: 'failed',
        lastEvent: 'connect_error'
      });
    });

    socketInstance.on('SERVER_ERROR', (data) => {
      errorMessage.value = `Erro do servidor: ${data.message}`;

      captureSimulationError(new Error(data.message), {
        sessionId: sessionId.value,
        userRole: userRole.value,
        stationId: stationId.value,
        simulationState: simulationStarted.value ? 'started' : 'preparing'
      });
    });

    socketInstance.on('SERVER_JOIN_CONFIRMED', (_data) => { });

    socketInstance.on('SERVER_PARTNER_JOINED', (participantInfo) => {
      logger.debug('[SOCKET] 📥 SERVER_PARTNER_JOINED recebido:', participantInfo);
      if (participantInfo && participantInfo.userId !== currentUser.value?.uid) {
        partner.value = participantInfo;
        partnerReadyState.value = participantInfo.isReady || false;
        errorMessage.value = '';
        logger.debug('[SOCKET] ✅ Partner atualizado - Ready:', partnerReadyState.value);
      }
    });

    socketInstance.on('SERVER_PARTNER_UPDATE', (data) => {
      logger.debug('[SOCKET] 📥 SERVER_PARTNER_UPDATE recebido:', data);
      updatePartnerInfo(data.participants);

      // 🔧 FIX: Verificar se ambos estão prontos após atualização do parceiro
      logger.debug('[SOCKET] 🔍 Verificando estado após SERVER_PARTNER_UPDATE:', {
        myReadyState: myReadyState.value,
        partnerReadyState: partnerReadyState.value,
        backendActivated: backendActivated.value,
        bothReady: (myReadyState.value && partnerReadyState.value),
        partner: partner.value
      });

      // 🚀 ATIVAÇÃO DO BACKEND BASEADA EM SERVER_PARTNER_UPDATE
      if (myReadyState.value && partnerReadyState.value && partner.value && !backendActivated.value) {
        logger.debug('[SOCKET] 🎯 Ambos prontos detectado via SERVER_PARTNER_UPDATE! Ativando backend...')
        logger.debug('[SOCKET] 🔍 Estado antes da ativação:', {
          myReadyState: myReadyState.value,
          partnerReadyState: partnerReadyState.value,
          partner: partner.value,
          backendActivated: backendActivated.value,
          timestamp: new Date().toISOString()
        });

        backendActivated.value = true

        logger.debug('[SOCKET] ✅ Backend ativado via SERVER_PARTNER_UPDATE - Botão "Iniciar Simulação" deve aparecer agora!')
        logger.debug('[SOCKET] 🔍 Estado após ativação:', {
          backendActivated: backendActivated.value,
          timestamp: new Date().toISOString()
        });

        // 🔧 DIAGNÓSTICO: Verificar se a mudança foi aplicada imediatamente
        setTimeout(() => {
          logger.debug('[SOCKET] 🔍 Verificação pós-ativação (100ms):', {
            backendActivated: backendActivated.value,
            aindaIgual: backendActivated.value === true
          });
        }, 100);
      } else {
        logger.debug('[SOCKET] ⏳ Condições não satisfeitas para ativação:', {
          myReadyState: myReadyState.value,
          partnerReadyState: partnerReadyState.value,
          partnerExists: !!partner.value,
          backendAlreadyActivated: backendActivated.value,
          timestamp: new Date().toISOString()
        });
      }

      // 🔧 DIAGNÓSTICO: Log específico para partnerReadyState
      logger.debug('[SOCKET] 📊 DIAGNÓSTICO - partnerReadyState após SERVER_PARTNER_UPDATE:', {
        partnerReadyState: partnerReadyState.value,
        tipo: 'tempPartnerReadyState (passado como parâmetro)',
        fonte: 'SERVER_PARTNER_UPDATE',
        timestamp: new Date().toISOString()
      });
    });

    function updatePartnerInfo(participants) {
      logger.debug('[SOCKET] 🔧 updatePartnerInfo chamado com:', participants);
      const currentUserId = currentUser.value?.uid;
      if (participants && Array.isArray(participants) && currentUserId) {
        const otherParticipant = participants.find(p => p.userId !== currentUserId);
        if (otherParticipant) {
          logger.debug('[SOCKET] 🔄 Partner encontrado:', otherParticipant);
          const oldPartnerReadyState = partnerReadyState.value;
          partner.value = otherParticipant;
          partnerReadyState.value = partner.value.isReady || false;
          errorMessage.value = '';
          logger.debug('[SOCKET] ✅ Partner atualizado - Ready:', partnerReadyState.value);
          logger.debug('[SOCKET] 📊 DIAGNÓSTICO - partnerReadyState em updatePartnerInfo:', {
            partnerReadyState: partnerReadyState.value,
            oldPartnerReadyState: oldPartnerReadyState,
            mudou: oldPartnerReadyState !== partnerReadyState.value,
            partnerIsReady: partner.value?.isReady,
            tipo: 'tempPartnerReadyState (passado como parâmetro)',
            fonte: 'updatePartnerInfo',
            timestamp: new Date().toISOString()
          });
        } else {
          logger.debug('[SOCKET] ⚠️ Nenhum partner encontrado');
          const oldPartnerReadyState = partnerReadyState.value;
          partner.value = null;
          partnerReadyState.value = false;
          logger.debug('[SOCKET] 📊 DIAGNÓSTICO - partnerReadyState resetado em updatePartnerInfo:', {
            partnerReadyState: partnerReadyState.value,
            oldPartnerReadyState: oldPartnerReadyState,
            mudou: oldPartnerReadyState !== partnerReadyState.value,
            tipo: 'tempPartnerReadyState (passado como parâmetro)',
            fonte: 'updatePartnerInfo (reset)',
            timestamp: new Date().toISOString()
          });
        }
      }
    }

    // 🔧 DEBUG: Listener para SERVER_PARTNER_READY (evento específico quando parceiro fica pronto)
    socketInstance.on('SERVER_PARTNER_READY', (data) => {
      logger.debug('[SOCKET] 📥 SERVER_PARTNER_READY recebido:', data);
      if (data && data.userId !== currentUser.value?.uid) {
        const oldPartnerReadyState = partnerReadyState.value;
        partnerReadyState.value = data.isReady || false;
        logger.debug('[SOCKET] ✅ Partner ready state atualizado:', partnerReadyState.value);
        logger.debug('[SOCKET] 📊 DIAGNÓSTICO - partnerReadyState após SERVER_PARTNER_READY:', {
          partnerReadyState: partnerReadyState.value,
          oldPartnerReadyState: oldPartnerReadyState,
          mudou: oldPartnerReadyState !== partnerReadyState.value,
          tipo: 'tempPartnerReadyState (passado como parâmetro)',
          fonte: 'SERVER_PARTNER_READY',
          timestamp: new Date().toISOString()
        });
      }
    });

    socketInstance.on('SIMULATION_TIMER_UPDATE', (_data) => {
      // Timer updates handled by workflow composable
    });

    socketInstance.on('SIMULATION_TIMER_END', () => {
      showNotification('Tempo esgotado!', 'warning');
    });

    socketInstance.on('SIMULATION_FORCE_STOP', () => {
      showNotification('Simulação finalizada pelo avaliador.', 'info');
    });

    socketInstance.on('EVALUATION_SCORES', (_data) => {
      // Evaluation scores handled by evaluation composable
    });

    socketInstance.on('PEP_RELEASED_TO_CANDIDATE', () => {
      showNotification('PEP liberado para você estudar!', 'success');
    });

    socketInstance.on('CANDIDATE_SUBMITTED_EVALUATION', (data) => {
      if (userRole.value === 'actor' || userRole.value === 'evaluator') {
        showNotification(`Candidato submeteu avaliação final. Nota: ${data.totalScore?.toFixed(2) || 'N/A'}`, 'info');
      }
    });
  }

  function disconnect() {
    if (socket.value) {
      logger.debug('[SOCKET] 🔴 Desconectando socket:', socket.value.id);
      socket.value.disconnect();
      socket.value = null;
      connectionStatus.value = 'Desconectado';

      // 🔧 NOVO: Limpar referência externa se fornecida
      if (socketRef) {
        socketRef.value = null;
        logger.debug('[SOCKET] ✅ Referência externa limpa');
      }
    }
  }

  // Cleanup automático quando componente é desmontado
  onBeforeUnmount(() => {
    disconnect();
  });

  return {
    socket,
    connectionStatus,
    connectWebSocket,
    disconnect,
  }
}
