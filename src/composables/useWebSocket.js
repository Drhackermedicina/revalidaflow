// src/composables/useWebSocket.js
import { backendUrl } from '@/utils/backendUrl.js';
import { io } from 'socket.io-client';
import { onUnmounted, ref } from 'vue';

export function useWebSocket(
  stationId,
  sessionId,
  userRole,
  currentUser,
  {
    onConnect,
    onDisconnect,
    onPartnerJoined,
    onPartnerLeft,
    onExistingPartners,
    onSimulationStart,
    onTimerUpdate,
    onTimerEnd,
    onTimerStopped,
    onCandidateReceiveData,
    onPartnerReady,
    onPepVisibilityChange,
    onScoresUpdate,
    onBothParticipantsReady,
    onServerError,
    onJoinConfirmed,
  }
) {
  const socket = ref(null);
  const connectionStatus = ref('Desconectado');
  const partner = ref(null);

  function connect() {
    if (!sessionId.value || !userRole.value || !stationId.value || !currentUser.value?.uid) {
      console.error("SOCKET: Dados essenciais faltando para conexão.");
      return;
    }

    console.log(`SOCKET: Conectando a ${backendUrl} para Sessão: ${sessionId.value}, Usuário: ${currentUser.value.uid}, Papel: ${userRole.value}`);
    connectionStatus.value = 'Conectando';

    if (socket.value && socket.value.connected) {
      socket.value.disconnect();
    }

    socket.value = io(backendUrl, {
      transports: ['websocket'],
      query: {
        sessionId: sessionId.value,
        userId: currentUser.value?.uid,
        role: userRole.value,
        stationId: stationId.value,
        displayName: currentUser.value?.displayName,
      },
    });

    socket.value.on('connect', () => {
      connectionStatus.value = 'Conectado';
      console.log('SOCKET: Conectado! ID do Socket:', socket.value.id);
      if (onConnect) onConnect();
    });

    socket.value.on('disconnect', (reason) => {
      connectionStatus.value = 'Desconectado';
      const wasPartnerConnected = !!partner.value;
      partner.value = null;
      console.log(`SOCKET: Desconectado. Razão: ${reason}`);
      if (onDisconnect) onDisconnect(reason, wasPartnerConnected);
    });

    socket.value.on('connect_error', (err) => {
      connectionStatus.value = 'Erro de Conexão';
      console.error('SOCKET: Erro de conexão', err);
    });
    
    socket.value.on('SERVER_ERROR', (data) => {
        console.error('SOCKET: Erro do Servidor:', data.message);
        if(onServerError) onServerError(data);
    });

    socket.value.on('SERVER_JOIN_CONFIRMED', (data) => {
        console.log('>>> EVENTO RECEBIDO: SERVER_JOIN_CONFIRMED <<<', data);
        if(onJoinConfirmed) onJoinConfirmed(data);
    });

    socket.value.on('SERVER_PARTNER_JOINED', (participantInfo) => {
      console.log('>>> EVENTO RECEBIDO: SERVER_PARTNER_JOINED <<<', participantInfo);
      if (participantInfo && participantInfo.userId !== currentUser.value?.uid) {
        partner.value = participantInfo;
        if (onPartnerJoined) onPartnerJoined(participantInfo);
      }
    });
    
    socket.value.on('SERVER_EXISTING_PARTNERS', (participantsList) => {
        console.log('>>> EVENTO RECEBIDO: SERVER_EXISTING_PARTNERS <<<', participantsList);
        const currentUserId = currentUser.value?.uid;
        if (participantsList && Array.isArray(participantsList) && currentUserId) {
            const otherParticipant = participantsList.find(p => p.userId !== currentUserId);
            if(otherParticipant) {
                partner.value = otherParticipant;
                if (onExistingPartners) onExistingPartners(otherParticipant);
            } else {
                partner.value = null;
            }
        }
    });

    socket.value.on('SERVER_PARTNER_LEFT', (data) => {
      console.log('>>> EVENTO RECEBIDO: SERVER_PARTNER_LEFT <<<', data);
      if (partner.value && partner.value.userId === data.userId) {
        const oldPartner = { ...partner.value };
        partner.value = null;
        if (onPartnerLeft) onPartnerLeft(data, oldPartner);
      }
    });

    socket.value.on('CANDIDATE_RECEIVE_DATA', (payload) => {
        console.log('>>> EVENTO RECEBIDO: CANDIDATE_RECEIVE_DATA <<<', payload);
        if(onCandidateReceiveData) onCandidateReceiveData(payload);
    });

    socket.value.on('SERVER_PARTNER_READY', (data) => {
        console.log('>>> EVENTO RECEBIDO: SERVER_PARTNER_READY <<<', data);
        if (data && data.userId !== currentUser.value?.uid) {
            if (partner.value && partner.value.userId === data.userId) {
                partner.value.isReady = data.isReady;
            }
            if(onPartnerReady) onPartnerReady(data);
        }
    });

    socket.value.on('SERVER_START_SIMULATION', (data) => {
        console.log('>>> EVENTO RECEBIDO: SERVER_START_SIMULATION <<<', data);
        if(onSimulationStart) onSimulationStart(data);
    });

    socket.value.on('TIMER_UPDATE', (data) => {
        if(onTimerUpdate) onTimerUpdate(data);
    });

    socket.value.on('TIMER_END', () => {
        console.log('>>> EVENTO RECEBIDO: TIMER_END <<<');
        if(onTimerEnd) onTimerEnd();
    });

    socket.value.on('TIMER_STOPPED', (data) => {
        console.log('>>> EVENTO RECEBIDO: TIMER_STOPPED <<<', data);
        if(onTimerStopped) onTimerStopped(data);
    });

    socket.value.on('CANDIDATE_RECEIVE_PEP_VISIBILITY', (payload) => {
        console.log('>>> EVENTO RECEBIDO: CANDIDATE_RECEIVE_PEP_VISIBILITY <<<', payload);
        if(onPepVisibilityChange) onPepVisibilityChange(payload);
    });

    socket.value.on('CANDIDATE_RECEIVE_UPDATED_SCORES', (data) => {
        console.log('CANDIDATO: Recebeu atualização de scores:', data);
        if(onScoresUpdate) onScoresUpdate(data);
    });

    socket.value.on('SERVER_BOTH_PARTICIPANTS_READY', () => {
        if(onBothParticipantsReady) onBothParticipantsReady();
    });
  }

  function disconnect() {
    if (socket.value && socket.value.connected) {
      console.log("SOCKET: Desconectando manualmente.");
      socket.value.disconnect();
    }
  }

  onUnmounted(() => {
    disconnect();
  });

  return {
    socket,
    connectionStatus,
    partner,
    connect,
    disconnect,
  };
}
""
