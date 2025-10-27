/**
 * useTrainingInvites.js
 *
 * Composable para gerenciar o sistema de convites automáticos para treino via chat
 *
 * Funcionalidades:
 * - Enviar convites de treino
 * - Processar respostas (aceite/rejeite)
 * - Gerenciar estados de convites no Firebase
 * - Integrar com StationList para convites aceitos
 */

import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { collection, addDoc, doc, updateDoc, onSnapshot, query, orderBy, where, limit, serverTimestamp, deleteDoc } from 'firebase/firestore'
import { db } from '@/plugins/firebase.js'
import { currentUser } from '@/plugins/auth.js'

export function useTrainingInvites() {
  const router = useRouter()

  // Estados reativos
  const invites = ref([])
  const currentInvite = ref(null)
  const isLoading = ref(false)
  const error = ref(null)

  // Listener para snapshots
  let invitesUnsubscribe = null

  /**
   * Envia um convite de treino para um usuário
   * @param {Object} toUser - Usuário que receberá o convite
   * @returns {Promise<Object>} - Resultado da operação
   */
  const sendTrainingInvite = async (toUser) => {
    if (!currentUser.value?.uid || !toUser?.uid) {
      throw new Error('Usuários não identificados')
    }

    if (currentUser.value.uid === toUser.uid) {
      throw new Error('Não pode enviar convite para si mesmo')
    }

    isLoading.value = true
    error.value = null

    try {
      // Verificar se já existe um convite pendente
      const existingInvite = invites.value.find(invite =>
        invite.fromUserId === currentUser.value.uid &&
        invite.toUserId === toUser.uid &&
        invite.status === 'pending'
      )

      if (existingInvite) {
        throw new Error('Já existe um convite pendente para este usuário')
      }

      // Criar novo convite
      const inviteData = {
        fromUserId: currentUser.value.uid,
        toUserId: toUser.uid,
        fromUserName: currentUser.value.displayName || 'Usuário',
        toUserName: toUser.displayName || toUser.nome || 'Usuário',
        status: 'pending',
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutos
        type: 'training_invite'
      }

      const docRef = await addDoc(collection(db, 'trainingInvites'), inviteData)

      const newInvite = {
        id: docRef.id,
        ...inviteData,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
      }

      return {
        success: true,
        invite: newInvite,
        message: 'Convite enviado com sucesso!'
      }

    } catch (err) {
      error.value = err.message
      return {
        success: false,
        error: err.message
      }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Processa a resposta a um convite (aceitar ou rejeitar)
   * @param {string} inviteId - ID do convite
   * @param {boolean} accepted - true para aceitar, false para rejeitar
   * @returns {Promise<Object>} - Resultado da operação
   */
  const respondToInvite = async (inviteId, accepted) => {
    if (!currentUser.value?.uid) {
      throw new Error('Usuário não autenticado')
    }

    isLoading.value = true
    error.value = null

    try {
      const inviteRef = doc(db, 'trainingInvites', inviteId)

      const updateData = {
        status: accepted ? 'accepted' : 'rejected',
        respondedAt: serverTimestamp(),
        respondedBy: currentUser.value.uid
      }

      await updateDoc(inviteRef, updateData)

      // Se aceitou, gerar dados para redirecionamento
      let redirectData = null
      if (accepted) {
        const invite = invites.value.find(inv => inv.id === inviteId)
        if (invite) {
          redirectData = {
            fromUserId: invite.fromUserId,
            fromUserName: invite.fromUserName,
            toUserId: invite.toUserId,
            toUserName: invite.toUserName
          }
        }
      }

      return {
        success: true,
        accepted,
        redirectData,
        message: accepted ? 'Convite aceito!' : 'Convite rejeitado'
      }

    } catch (err) {
      error.value = err.message
      return {
        success: false,
        error: err.message
      }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Formata a mensagem de convite para o chat
   * @param {Object} invite - Dados do convite
   * @returns {Object} - Mensagem formatada para o chat
   */
  const formatInviteMessage = (invite) => {
    const isFromMe = invite.fromUserId === currentUser.value?.uid

    if (isFromMe) {
      return {
        id: `invite_${invite.id}`,
        type: 'training_invite_sent',
        text: `Oi ${invite.toUserName}! Quer treinar comigo?`,
        senderId: invite.fromUserId,
        senderName: invite.fromUserName,
        timestamp: invite.createdAt,
        inviteData: invite,
        isInvite: true,
        inviteStatus: invite.status
      }
    } else {
      return {
        id: `invite_${invite.id}`,
        type: 'training_invite_received',
        text: `Oi ${invite.toUserName}! Quer treinar comigo?`,
        senderId: invite.fromUserId,
        senderName: invite.fromUserName,
        timestamp: invite.createdAt,
        inviteData: invite,
        isInvite: true,
        inviteStatus: invite.status,
        showButtons: invite.status === 'pending'
      }
    }
  }

  /**
   * Formata a mensagem de resposta para o chat
   * @param {Object} invite - Dados do convite
   * @param {boolean} accepted - Resposta do convite
   * @returns {Object} - Mensagem formatada para o chat
   */
  const formatResponseMessage = (invite, accepted) => {
    const isFromMe = invite.toUserId === currentUser.value?.uid
    const senderId = isFromMe ? invite.toUserId : invite.fromUserId
    const senderName = isFromMe ? invite.toUserName : invite.fromUserName

    return {
      id: `response_${invite.id}`,
      type: 'training_response',
      text: accepted
        ? `✅ ${senderName} aceitou o convite! [Selecionar Estação para Treinar]`
        : `❌ ${senderName} rejeitou o convite.`,
      senderId: senderId,
      senderName: senderName,
      timestamp: invite.respondedAt || new Date(),
      inviteData: invite,
      isResponse: true,
      accepted: accepted,
      linkToStationList: accepted // Link para StationList se aceito
    }
  }

  /**
   * Gera URL para StationList com dados do convite aceito
   * @param {Object} inviteData - Dados do convite aceito
   * @returns {string} - URL formatada
   */
  const generateStationListUrl = (inviteData) => {
    const baseUrl = '/app/station-list'
    const params = new URLSearchParams()

    params.append('inviteAccepted', 'true')
    params.append('invitedBy', inviteData.fromUserId)
    params.append('invitedByName', inviteData.fromUserName)
    params.append('inviteId', inviteData.id || '')

    return `${baseUrl}?${params.toString()}`
  }

  /**
   * Inicializa listeners de convites em tempo real
   * @param {string} userId - ID do usuário para buscar convites
   */
  const initializeInviteListeners = (userId) => {
    if (!userId) return

    // Limpar listener anterior
    if (invitesUnsubscribe) {
      invitesUnsubscribe()
    }

    // Buscar convites onde o usuário é remetente ou destinatário
    const q = query(
      collection(db, 'trainingInvites'),
      where('fromUserId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(20)
    )

    invitesUnsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedInvites = []

      snapshot.forEach((doc) => {
        fetchedInvites.push({
          id: doc.id,
          ...doc.data()
        })
      })

      // Também buscar convites onde o usuário é destinatário
      const q2 = query(
        collection(db, 'trainingInvites'),
        where('toUserId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(20)
      )

      onSnapshot(q2, (snapshot2) => {
        snapshot2.forEach((doc) => {
          const invite = {
            id: doc.id,
            ...doc.data()
          }

          // Evitar duplicados
          if (!fetchedInvites.find(inv => inv.id === invite.id)) {
            fetchedInvites.push(invite)
          }
        })

        // Ordenar por data
        fetchedInvites.sort((a, b) => {
          const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0
          const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0
          return dateB - dateA
        })

        invites.value = fetchedInvites
      })
    })
  }

  /**
   * Limpa convites expirados
   */
  const cleanupExpiredInvites = async () => {
    try {
      const now = new Date()
      const expiredInvites = invites.value.filter(invite =>
        invite.status === 'pending' &&
        invite.expiresAt &&
        invite.expiresAt.toDate ?
          invite.expiresAt.toDate() < now :
          new Date(invite.expiresAt) < now
      )

      for (const invite of expiredInvites) {
        const inviteRef = doc(db, 'trainingInvites', invite.id)
        await updateDoc(inviteRef, {
          status: 'expired',
          expiredAt: serverTimestamp()
        })
      }
    } catch (err) {
      console.error('Erro ao limpar convites expirados:', err)
    }
  }

  /**
   * Navega para StationList com dados do convite aceito
   * @param {Object} inviteData - Dados do convite
   */
  const navigateToStationList = (inviteData) => {
    const url = generateStationListUrl(inviteData)
    router.push(url)
  }

  /**
   * Obtém convites pendentes para o usuário atual
   */
  const pendingInvites = computed(() => {
    return invites.value.filter(invite =>
      invite.status === 'pending' &&
      invite.toUserId === currentUser.value?.uid
    )
  })

  /**
   * Obtém convites enviados pelo usuário atual
   */
  const sentInvites = computed(() => {
    return invites.value.filter(invite =>
      invite.fromUserId === currentUser.value?.uid
    )
  })

  /**
   * Verifica se usuário tem convites pendentes
   */
  const hasPendingInvites = computed(() => {
    return pendingInvites.value.length > 0
  })

  // Cleanup quando o composable for desmontado
  const cleanup = () => {
    if (invitesUnsubscribe) {
      invitesUnsubscribe()
      invitesUnsubscribe = null
    }
  }

  // Auto-limpeza de convites expirados a cada minuto
  const cleanupInterval = setInterval(cleanupExpiredInvites, 60000)

  return {
    // Estados
    invites,
    currentInvite,
    isLoading,
    error,
    pendingInvites,
    sentInvites,
    hasPendingInvites,

    // Métodos
    sendTrainingInvite,
    respondToInvite,
    formatInviteMessage,
    formatResponseMessage,
    generateStationListUrl,
    initializeInviteListeners,
    navigateToStationList,
    cleanupExpiredInvites,
    cleanup
  }
}