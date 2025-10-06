/**
 * useInternalInvites.ts
 *
 * Composable para gerenciar sistema de convites internos
 * Permite que atores/avaliadores convidem candidatos online diretamente
 *
 * Responsabilidades:
 * - Gerenciar lista de usuários/candidatos online
 * - Enviar convites internos via socket
 * - Receber e processar convites internos
 * - Controlar dialog de aceitação de convites
 */

import { ref, type Ref } from 'vue'

interface InternalInvitesParams {
  socket: Ref<any>
  sessionId: Ref<string | null>
  stationId: Ref<string | null>
  selectedDurationMinutes: Ref<number>
  currentUser: Ref<any>
  getMeetLinkForInvite: () => string | null
}

export function useInternalInvites({
  socket,
  sessionId,
  stationId,
  selectedDurationMinutes,
  currentUser,
  getMeetLinkForInvite
}: InternalInvitesParams) {

  // --- Estado ---

  /**
   * Lista de candidatos online disponíveis para convite
   */
  const onlineCandidates = ref<any[]>([])

  /**
   * Controla se está enviando convite
   */
  const isSendingInternalInvite = ref<boolean>(false)

  /**
   * ID do usuário para quem foi enviado o convite
   */
  const internalInviteSentTo = ref<string | null>(null)

  /**
   * Controla visibilidade do dialog de convite recebido
   */
  const internalInviteDialog = ref<boolean>(false)

  /**
   * Dados do convite recebido
   */
  const internalInviteData = ref<{
    from: string
    link: string
    stationId: string
    sessionId: string
    stationTitle?: string
    role: string
    meet: string
  }>({
    from: '',
    link: '',
    stationId: '',
    sessionId: '',
    role: '',
    meet: ''
  })

  // --- Métodos ---

  /**
   * Processa lista de usuários online recebida do backend
   * @param users - Array de usuários online
   */
  function handleOnlineUsersList(users: any[]) {
    // Filtra apenas candidatos (excluindo o usuário atual)
    onlineCandidates.value = Array.isArray(users)
      ? users.filter((u: any) => u.role === 'candidate' && u.userId !== currentUser.value?.uid)
      : []
  }

  /**
   * Envia convite interno para um candidato online
   * @param candidate - Objeto do candidato
   */
  function sendInternalInvite(candidate: any) {
    if (!socket.value?.connected || !candidate?.userId) {
      return
    }

    isSendingInternalInvite.value = true
    internalInviteSentTo.value = candidate.userId

    socket.value.emit('SERVER_SEND_INTERNAL_INVITE', {
      toUserId: candidate.userId,
      sessionId: sessionId.value,
      stationId: stationId.value,
      meetLink: getMeetLinkForInvite() || '',
      duration: selectedDurationMinutes.value
    })

    // Reset após um tempo
    setTimeout(() => {
      isSendingInternalInvite.value = false
      internalInviteSentTo.value = null
    }, 3000)
  }

  /**
   * Processa convite interno recebido via socket
   * @param payload - Dados do convite
   */
  function handleInternalInviteReceived(payload: any) {
    if (!payload || !payload.link) {
      return
    }

    internalInviteData.value = { ...payload }
    internalInviteDialog.value = true
  }

  /**
   * Aceita convite interno e redireciona para a simulação
   */
  function acceptInternalInvite() {
    if (internalInviteData.value.link) {
      // Redireciona para o link da estação (abre na mesma aba)
      window.location.href = internalInviteData.value.link
      internalInviteDialog.value = false
    }
  }

  /**
   * Recusa convite interno
   */
  function declineInternalInvite() {
    internalInviteDialog.value = false
    // Limpa dados do convite
    internalInviteData.value = {
      from: '',
      link: '',
      stationId: '',
      sessionId: '',
      role: '',
      meet: ''
    }
  }

  /**
   * Solicita lista de usuários online do backend
   * Deve ser chamado quando conectar ao socket
   * @param role - Filtrar por role específico (opcional)
   */
  function requestOnlineUsers(role?: string) {
    if (!socket.value?.connected) {
      return
    }

    socket.value.emit('CLIENT_REQUEST_ONLINE_USERS', {
      role: role || 'candidate'
    })
  }

  /**
   * Verifica se um candidato foi convidado
   * @param userId - ID do usuário
   * @returns true se foi o último convidado
   */
  function wasInvited(userId: string): boolean {
    return internalInviteSentTo.value === userId
  }

  /**
   * Reseta estado de convites
   */
  function resetInviteState() {
    isSendingInternalInvite.value = false
    internalInviteSentTo.value = null
    internalInviteDialog.value = false
    onlineCandidates.value = []
  }

  return {
    // Estado
    onlineCandidates,
    isSendingInternalInvite,
    internalInviteSentTo,
    internalInviteDialog,
    internalInviteData,

    // Métodos
    handleOnlineUsersList,
    sendInternalInvite,
    handleInternalInviteReceived,
    acceptInternalInvite,
    declineInternalInvite,
    requestOnlineUsers,
    wasInvited,
    resetInviteState
  }
}
