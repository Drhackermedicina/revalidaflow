import { ref } from 'vue'
import { db } from '@/plugins/firebase.js'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { useNotificationStore } from '@/stores/notificationStore'
import { addRecentPrivateChat } from '@/utils/cacheManager'

export function useSimulationInvites(reloadListeners) {
  const isProcessingInvite = ref(false)
  const { notify } = useNotificationStore()

  // Enviar convite via múltiplos canais
  async function sendSimulationInvite({
    candidateUid,
    candidateName,
    inviteLink,
    stationTitle,
    duration = 10,
    meetLink = null,
    senderName,
    senderUid
  }) {
    isProcessingInvite.value = true

    try {
      // 1. Enviar via chat privado (Firebase) - formato especial para convites
      await sendChatInvite({
        candidateUid,
        candidateName,
        inviteLink,
        stationTitle,
        duration,
        senderName,
        senderUid,
        meetLink
      })

      // 2. Salvar convite persistente (Firebase)
      await saveInviteToFirebase({
        candidateUid,
        inviteLink,
        stationTitle,
        duration,
        meetLink,
        senderName,
        senderUid
      })

      // 3. Adicionar ao cache de chats recentes para ativar listener em tempo real
      addRecentPrivateChat(candidateUid)

      // 4. Recarregar listeners para incluir o novo chat
      reloadListeners()

      notify({
        text: `Convite enviado para ${candidateName}`,
        color: 'success'
      })

      return { success: true }
    } catch (error) {
      console.error('Erro ao enviar convite:', error)
      notify({
        text: 'Erro ao enviar convite. Tente novamente.',
        color: 'error'
      })
      return { success: false, error }
    } finally {
      isProcessingInvite.value = false
    }
  }

  // Enviar mensagem especial no chat privado
  async function sendChatInvite({
    candidateUid,
    candidateName: _candidateName,
    inviteLink,
    stationTitle,
    duration,
    senderName,
    senderUid,
    meetLink
  }) {
    const chatId = [senderUid, candidateUid].sort().join('_')

    let messageText = `🎯 CONVITE PARA SIMULAÇÃO\n\n`
    messageText += `‍⚕️ Convidado por: ${senderName}\n\n`

    if (meetLink) {
      messageText += `📹 Google Meet: ${meetLink}\n\n`
    }

    messageText += `✨ Aguarde o link da simulação que será enviado em breve!`

    const messageData = {
      senderId: senderUid,
      senderName: senderName,
      senderPhotoURL: '',
      text: messageText,
      timestamp: serverTimestamp(),
      type: 'simulation_invite',
      metadata: {
        candidateUid, // ✅ IMPORTANTE: incluir candidateUid para verificação
        stationTitle,
        inviteLink,
        meetLink,
        duration,
        isInvite: true
      }
    }

    const chatRef = collection(db, `chatPrivado_${chatId}`)
    await addDoc(chatRef, messageData)
  }

  // Salvar convite no Firebase para persistência
  async function saveInviteToFirebase({
    candidateUid,
    inviteLink,
    stationTitle,
    duration,
    meetLink,
    senderName,
    senderUid
  }) {
    const inviteData = {
      candidateUid,
      senderUid,
      senderName,
      stationTitle,
      inviteLink,
      meetLink,
      duration,
      status: 'pending',
      createdAt: serverTimestamp(),
      expiresAt: new Date(Date.now() + (2 * 60 * 60 * 1000)) // Expira em 2 horas
    }

    const invitesRef = collection(db, 'simulationInvites')
    await addDoc(invitesRef, inviteData)
  }

  return {
    sendSimulationInvite,
    isProcessingInvite
  }
}
