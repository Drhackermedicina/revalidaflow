import { currentUser } from '@/plugins/auth'
import { db } from '@/plugins/firebase'
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore'
import { getRecentPrivateChats } from '@/utils/cacheManager'
import { onUnmounted, watch } from 'vue' // Adicionado 'watch'
import { useRoute } from 'vue-router'

let unsubscribeList = []
let listenersInitialized = false // Novo flag para controlar a inicialização
let cleanupInterval = null // Timer para limpeza automática

export function usePrivateChatNotification() {
  const route = useRoute()

  function stopListener() {
    unsubscribeList.forEach(unsub => unsub())
    unsubscribeList = []
    listenersInitialized = false // Resetar o flag ao parar os listeners

    // 🗑️ Parar timer de limpeza automática
    if (cleanupInterval) {
      clearInterval(cleanupInterval)
      cleanupInterval = null
    }
  }

  // Função para recarregar listeners (usada quando cache de chats recentes muda)
  function reloadListeners() {
    if (!currentUser.value?.uid) return

    // Parar listeners atuais
    stopListener()

    // Reinicializar
    initializeListeners()
  }

  // Função para iniciar os listeners, agora chamada apenas uma vez por sessão
  async function initializeListeners() {
    if (!currentUser.value?.uid || listenersInitialized) return // Não inicializar se já estiverem ativos ou sem UID

    listenersInitialized = true // Marcar como inicializado

    // Limpar listeners anteriores (garantia, embora não deva ser necessário se o flag funcionar)
    unsubscribeList.forEach(unsub => unsub())
    unsubscribeList = []

    const userUid = currentUser.value.uid

    try {
      // ✅ SOLUÇÃO: Escutar coleção de convites diretamente
      const invitesCol = collection(db, 'simulationInvites');
      const invitesQuery = query(invitesCol, orderBy('createdAt', 'desc'), limit(10));
      
      let processedInvites = new Set(); // Track de convites já processados
      let isFirstInviteLoad = true; // Flag para ignorar convites existentes no primeiro load
      
      const unsubscribeInvites = onSnapshot(invitesQuery, (snap) => {
        snap.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const invite = change.doc.data();
            const inviteId = change.doc.id;
            
            // Só processar convites para este usuário
            if (invite.candidateUid === userUid && invite.status === 'pending') {
              
              // ✅ IGNORAR convites antigos no primeiro carregamento
              if (isFirstInviteLoad) {
                processedInvites.add(inviteId);
                return;
              }
              
              // ✅ IGNORAR convites já processados
              if (processedInvites.has(inviteId)) {
                return;
              }
              
              // Marcar como processado
              processedInvites.add(inviteId);
              
                // Disparar notificação de convite (inclui recipientUid para segurança)
                window.dispatchEvent(new CustomEvent('privateChatNotification', {
                  detail: {
                    senderId: invite.senderUid,
                    senderName: invite.senderName || 'Usuário',
                    senderPhotoURL: null,
                    text: `🎯 CONVITE PARA SIMULAÇÃO\n\n‍⚕️ Convidado por: ${invite.senderName}\n\n✨ Clique em "Iniciar Simulação" para participar!`,
                    timestamp: invite.createdAt,
                    otherUserId: invite.senderUid,
                    recipientUid: userUid,
                    isInvite: true,
                    inviteData: {
                      candidateUid: invite.candidateUid,
                      stationTitle: invite.stationTitle,
                      inviteLink: invite.inviteLink,
                      meetLink: invite.meetLink,
                      duration: invite.duration,
                      senderName: invite.senderName
                    }
                  }
                }));
            }
          }
        });
        
        // Após o primeiro carregamento, permitir processar novos convites
        if (isFirstInviteLoad) {
          isFirstInviteLoad = false;
        }
      });
      
      unsubscribeList.push(unsubscribeInvites);
      
      // 🗑️ Limpeza automática desabilitada para evitar necessidade de índices
      // cleanupInterval = setInterval(cleanupExpiredInvites, 5 * 60 * 1000);
      // await cleanupExpiredInvites();

      // Obter a lista de UIDs de chats privados recentes do cache
      const recentChatUids = getRecentPrivateChats();

      // Para cada UID de chat recente, criar um listener
      recentChatUids.forEach(otherUid => {
        if (otherUid !== userUid) {
          const chatId = [userUid, otherUid].sort().join('_');
          const col = collection(db, `chatPrivado_${chatId}`);
          const q = query(col, orderBy('timestamp', 'desc'), limit(1));

          let lastMessageId = null;
          let isFirstLoad = true;

          const unsubscribe = onSnapshot(q, (snap) => {
            const messages = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            if (messages.length === 0) return;

            const lastMsg = messages[0];
            if (isFirstLoad) {
              lastMessageId = lastMsg.id;
              isFirstLoad = false;
              return;
            }

            if (lastMessageId && lastMessageId !== lastMsg.id && lastMsg.senderId !== userUid) {
              // Normalizar comparação de params para evitar discrepâncias de tipo
              const inChatView = route.name === 'ChatPrivateView' && String(route.params.uid) === String(otherUid)
              if (!inChatView) {
                // ✅ VERIFICAR SE USUÁRIO ESTÁ EM SIMULAÇÃO - NÃO INCOMODAR
                if (route.name === 'SimulationView') {
                  return; // Não disparar notificação durante simulação
                }

                // ✅ SEMPRE disparar evento único para qualquer mensagem
                window.dispatchEvent(new CustomEvent('privateChatNotification', {
                  detail: {
                    senderId: lastMsg.senderId,
                    senderName: lastMsg.senderName || 'Usuário',
                    senderPhotoURL: lastMsg.senderPhotoURL || null,
                    text: lastMsg.text,
                    timestamp: lastMsg.timestamp,
                    otherUserId: otherUid,
                    recipientUid: userUid,
                    // ✅ INCLUIR se é convite especial
                    isInvite: lastMsg.type === 'simulation_invite',
                    inviteData: lastMsg.metadata || null
                  }
                }));
              }
            }

            if (messages.length > 0) {
              lastMessageId = messages[0].id;
            }
          }, () => {
            // Silencioso
          });

          unsubscribeList.push(unsubscribe);
        }
      });
    } catch (error) {
      console.error('Erro ao inicializar listeners de chat privado:', error);
    }
  }

  // Observar mudanças em currentUser para iniciar os listeners
  watch(currentUser, (newValue) => {
    if (newValue?.uid && !listenersInitialized) {
      initializeListeners()
    } else if (!newValue?.uid) {
      // Se o usuário deslogar, parar os listeners
      // stopListener() // Comentado para evitar loop infinito
    }
  }, { immediate: true }) // Executar imediatamente se currentUser já tiver um valor

  onUnmounted(() => {
    // Não parar os listeners aqui, pois eles devem persistir pela sessão.
    // A parada será gerenciada pelo watch de currentUser.
    // stopListener() // Comentado
  })

  return {
    // startListener, // Não é mais necessário expor publicamente
    stopListener, // Manter para casos de uso específicos, como logout manual
    reloadListeners // Para recarregar listeners quando cache muda
  }
}
