// src/composables/useSimulationHelpers.ts

import { ref } from 'vue'
import { useSimulationInvites } from '@/composables/useSimulationInvites.js'
import Logger from '@/utils/logger';
const logger = new Logger('useSimulationHelpers');


/**
 * Opções para o composable de helpers de simulação
 */
/**
 * @typedef {Object} SimulationHelpersOptions
 * @property {import('vue').Ref<any>} selectedCandidateForSimulation
 * @property {import('vue').Ref<string>} inviteLinkToShow
 * @property {import('vue').Ref<number>} selectedDurationMinutes
 * @property {import('vue').Ref<any>} stationData
 * @property {import('vue').Ref<any>} currentUser
 * @property {() => string | null} getMeetLinkForInvite
 * @property {() => void} reloadListeners
 */

/**
 * Composable para funções auxiliares de simulação
 * Gerencia operações simples como limpeza de candidato e envio de chat
 */
/**
 * @param {SimulationHelpersOptions} options
 */
export function useSimulationHelpers(options) {
  const {
    selectedCandidateForSimulation,
    inviteLinkToShow,
    selectedDurationMinutes,
    stationData,
    currentUser,
    getMeetLinkForInvite,
    reloadListeners
  } = options

  const sendingChat = ref(false)
  const chatSentSuccess = ref(false)
  const copySuccess = ref(false)

  /**
   * Limpa o candidato selecionado do sessionStorage
   */
  function clearSelectedCandidate() {
    try {
      sessionStorage.removeItem('selectedCandidate')
    } catch (error) {
      logger.warn('Erro ao limpar candidato selecionado:', error)
    }
  }

  /**
   * Carrega candidato selecionado do sessionStorage
   */
  function loadSelectedCandidate() {
    try {
      const storedCandidate = sessionStorage.getItem('selectedCandidate')
      if (storedCandidate) {
        selectedCandidateForSimulation.value = JSON.parse(storedCandidate)
      }
    } catch (error) {
      logger.warn('Erro ao carregar candidato selecionado:', error)
    }
  }

  /**
   * Envia link de convite via chat privado para o candidato selecionado
   */
  async function sendLinkViaPrivateChat() {
    if (!selectedCandidateForSimulation.value || !inviteLinkToShow.value) {
      loadSelectedCandidate()

      if (!selectedCandidateForSimulation.value) {
        alert('❌ ERRO: Nenhum candidato selecionado! Por favor, volte à lista de estações e selecione um candidato antes de iniciar a simulação.')
        return
      }

      if (!inviteLinkToShow.value) {
        alert('❌ ERRO: Link de convite não gerado! Clique em "Gerar Link" primeiro.')
        return
      }
    }

    sendingChat.value = true
    chatSentSuccess.value = false

    try {
      const { sendSimulationInvite } = useSimulationInvites(reloadListeners)

      const result = await sendSimulationInvite({
        candidateUid: selectedCandidateForSimulation.value.uid,
        candidateName: selectedCandidateForSimulation.value.name,
        inviteLink: inviteLinkToShow.value,
        stationTitle: stationData.value?.tituloEstacao || 'Estação',
        duration: selectedDurationMinutes.value || 10,
        meetLink: getMeetLinkForInvite(),
        senderName: currentUser.value?.displayName || 'Avaliador',
        senderUid: currentUser.value?.uid
      })

      if (result.success) {
        chatSentSuccess.value = true
        setTimeout(() => {
          chatSentSuccess.value = false
        }, 3000)
      } else {
        throw new Error(result.error?.message || 'Falha ao enviar convite')
      }

    } catch (error) {
      logger.error('Erro ao enviar convite:', error)
    } finally {
      sendingChat.value = false
    }
  }

  /**
   * Copia link de convite para clipboard
   */
  async function copyInviteLink() {
    if (!inviteLinkToShow.value) return

    try {
      await navigator.clipboard.writeText(inviteLinkToShow.value)
      copySuccess.value = true
      setTimeout(() => copySuccess.value = false, 2000)
    } catch (e) {
      alert('Falha ao copiar.')
    }
  }

  return {
    sendingChat,
    chatSentSuccess,
    copySuccess,
    clearSelectedCandidate,
    loadSelectedCandidate,
    sendLinkViaPrivateChat,
    copyInviteLink
  }
}
