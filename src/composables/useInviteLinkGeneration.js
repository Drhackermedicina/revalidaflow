// src/composables/useInviteLinkGeneration.ts

// import { ref } from 'vue'
import { backendUrl } from '@/utils/backendUrl.js'
import Logger from '@/utils/logger';
const logger = new Logger('useInviteLinkGeneration');


/**
 * Interface para opções do composable de geração de link de convite
 */
/**
 * @typedef {Object} InviteLinkGenerationOptions
 * @property {import('vue').Ref<string>} sessionId
 * @property {import('vue').Ref<string>} stationId
 * @property {import('vue').Ref<string>} userRole
 * @property {import('vue').Ref<number>} selectedDurationMinutes
 * @property {import('vue').Ref<boolean>} isLoading
 * @property {import('vue').Ref<any>} stationData
 * @property {import('vue').Ref<string>} errorMessage
 * @property {import('vue').Ref<string>} inviteLinkToShow
 * @property {import('vue').Ref<any>} socket
 * @property {() => boolean} isMeetMode
 * @property {(link: string) => { valid: boolean; error?: string }} validateMeetLink
 * @property {() => string | null} getMeetLinkForInvite
 * @property {import('vue').Ref<string>} meetLink
 * @property {() => void} connectWebSocket
 * @property {import('vue-router').Router} router
 * @property {import('vue').Ref<boolean>} isSequentialMode
 * @property {import('vue').Ref<string>} sequenceId
 * @property {import('vue').Ref<number>} sequenceIndex
 * @property {import('vue').Ref<number>} totalSequentialStations
 */

/**
 * Composable para geração de links de convite para simulações
 * Gerencia criação de sessão no backend e construção da URL de convite
 */
/**
 * @param {InviteLinkGenerationOptions} options
 */
export function useInviteLinkGeneration(options) {
  const {
    sessionId,
    stationId,
    userRole,
    selectedDurationMinutes,
    isLoading,
    stationData,
    errorMessage,
    inviteLinkToShow,
    socket,
    isMeetMode,
    validateMeetLink,
    getMeetLinkForInvite,
    meetLink,
    connectWebSocket,
    router,
    isSequentialMode,
    sequenceId,
    sequenceIndex,
    totalSequentialStations
  } = options

  /**
   * Busca recursivamente uma rota por nome nas rotas do router
   */
  function findRouteByName(routes, name) {
    for (const route of routes) {
      if (route.name === name) {
        return route
      }
      if (route.children) {
        const found = findRouteByName(route.children, name)
        if (found) return found
      }
    }
    return null
  }

  /**
   * Gera link de convite com duração especificada
   * Cria sessão no backend se necessário e constrói URL de convite
   */
  async function generateInviteLinkWithDuration() {
    logger.debug('[INVITE-LINK] 🚀 Iniciando geração de link de convite...');
    logger.debug('[INVITE-LINK] 📋 Estado inicial:');
    logger.debug('  - isLoading:', isLoading.value);
    logger.debug('  - stationData:', stationData.value ? 'carregado' : 'nulo');
    logger.debug('  - sessionId:', sessionId.value || 'não definido');
    logger.debug('  - socket:', socket.value ? `existe (${socket.value.id})` : 'nulo');
    logger.debug('  - socket.connected:', socket.value?.connected || 'falso');

    // Validações iniciais
    if (isLoading.value) {
      logger.debug('[INVITE-LINK] ⏳ Ainda carregando dados da estação...');
      errorMessage.value = "Aguarde o carregamento dos dados da estação."
      return
    }

    if (!stationData.value) {
      logger.debug('[INVITE-LINK] ❌ Dados da estação não carregados');
      errorMessage.value = "Dados da estação ainda não carregados. Tente novamente em instantes."
      return
    }

    // Se não houver sessionId, criar sessão no backend
    if (!sessionId.value) {
      logger.debug('[INVITE-LINK] 🆕 Criando nova sessão no backend...');
      try {
        const response = await fetch(`${backendUrl}/api/create-session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            stationId: stationId.value,
            durationMinutes: selectedDurationMinutes.value,
            localSessionId: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          })
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const sessionData = await response.json()
        sessionId.value = sessionData.sessionId
        logger.debug('[INVITE-LINK] ✅ Sessão criada com sucesso:', sessionData.sessionId);

        // Conectar WebSocket e aguardar conexão
        logger.debug('[INVITE-LINK] 🔌 Iniciando conexão WebSocket para geração de link...')
        connectWebSocket()

        let connectionAttempts = 0
        const maxAttempts = 20 // 10 segundos (20 * 500ms)

        logger.debug('[INVITE-LINK] ⏳ Aguardando conexão WebSocket... socket:', socket.value?.id || 'nulo')

        while (!socket.value?.connected && connectionAttempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 500))
          connectionAttempts++

          // 🔧 NOVO: Log a cada 2 segundos para debug
          if (connectionAttempts % 4 === 0) {
            logger.debug(`[INVITE-LINK] ⏳ Aguardando conexão... (${connectionAttempts}/${maxAttempts}) - Status: ${socket.value?.connected ? 'conectado' : 'desconectado'}`)
          }
        }

        if (!socket.value?.connected) {
          logger.error('[INVITE-LINK] ❌ Falha na conexão WebSocket após', maxAttempts, 'tentativas')
          throw new Error(`WebSocket connection failed after ${maxAttempts} attempts during invite link generation. Socket status: ${socket.value ? 'exists' : 'null'}, Connected: ${socket.value?.connected}`)
        }

        logger.debug('[INVITE-LINK] ✅ WebSocket conectado com sucesso - ID:', socket.value.id)

      } catch (error) {
        errorMessage.value = `Não foi possível gerar link de convite: ${error.message}`
        return
      }
    }

    // Gerar link de convite
    if ((userRole.value === 'actor' || userRole.value === 'evaluator') && stationId.value && sessionId.value) {
      logger.debug('[INVITE-LINK] 🔗 Gerando link de convite...');
      logger.debug('  - userRole:', userRole.value);
      logger.debug('  - stationId:', stationId.value);
      logger.debug('  - sessionId:', sessionId.value);

      // Validar Meet se estiver em modo Meet
      if (isMeetMode()) {
        logger.debug('[INVITE-LINK] 📺 Validando link do Meet...');
        const validation = validateMeetLink(meetLink.value)
        if (!validation.valid) {
          logger.debug('[INVITE-LINK] ❌ Link do Meet inválido:', validation.error);
          errorMessage.value = validation.error || 'Link do Meet inválido'
          return
        }
      }

      // Determinar role do parceiro
      const partnerRoleToInvite = userRole.value === 'actor'
        ? 'candidate'
        : (userRole.value === 'evaluator' ? 'actor' : null)

      if (partnerRoleToInvite) {
        try {
          const inviteQuery = {
            sessionId: sessionId.value,
            role: partnerRoleToInvite,
            duration: selectedDurationMinutes.value
          }

          // ✅ FIX: Adicionar parâmetros de modo sequencial ao link de convite
          if (isSequentialMode.value) {
            inviteQuery.sequential = 'true'
            inviteQuery.sequenceId = sequenceId.value
            inviteQuery.sequenceIndex = sequenceIndex.value?.toString()
            inviteQuery.totalStations = totalSequentialStations.value?.toString()
            logger.debug('[INVITE-LINK] 🔗 Modo sequencial detectado - adicionando parâmetros:');
            logger.debug('  - sequenceId:', sequenceId.value);
            logger.debug('  - sequenceIndex:', sequenceIndex.value);
            logger.debug('  - totalStations:', totalSequentialStations.value);
          }

          // Adicionar dados do candidato selecionado se disponível
          const selectedCandidate = JSON.parse(sessionStorage.getItem('selectedCandidate') || '{}')
          if (selectedCandidate.uid) {
            inviteQuery.candidateUid = selectedCandidate.uid
            inviteQuery.candidateName = selectedCandidate.name
          }

          // Adicionar Meet link se disponível
          const meetLinkForInvite = getMeetLinkForInvite()
          if (meetLinkForInvite) {
            inviteQuery.meet = meetLinkForInvite
          }

          // Buscar rota protegida
          const routeDef = findRouteByName(router.options.routes, 'station-simulation')
          if (!routeDef) {
            errorMessage.value = "Rota 'station-simulation' não encontrada. Verifique a configuração do roteador."
            return
          }

          // Resolver rota de convite
          const inviteRoute = router.resolve({
            name: 'station-simulation',
            params: { id: stationId.value },
            query: inviteQuery
          })

          if (!inviteRoute || !inviteRoute.href) {
            errorMessage.value = "Falha ao resolver a rota de convite. Verifique as configurações."
            return
          }

          // Gerar URL completa
          inviteLinkToShow.value = window.location.origin + inviteRoute.href
          logger.debug('[INVITE-LINK] ✅ Link de convite gerado com sucesso:', inviteLinkToShow.value);
          errorMessage.value = ''

        } catch (e) {
          errorMessage.value = `Erro ao gerar link de convite: ${e.message}`
        }
      }
    } else {
      errorMessage.value = "Não foi possível gerar link de convite neste momento. Verifique se todos os dados necessários estão disponíveis."
    }
  }

  return {
    generateInviteLinkWithDuration,
    findRouteByName
  }
}
