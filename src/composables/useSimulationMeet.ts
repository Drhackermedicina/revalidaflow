/**
 * useSimulationMeet.ts
 *
 * Composable para gerenciar integração com Google Meet nas simulações
 * Extrai lógica de Google Meet do SimulationView.vue
 *
 * Responsabilidades:
 * - Gerenciar método de comunicação (voice, meet, none)
 * - Criar e copiar links do Google Meet
 * - Validar links do Meet
 * - Controlar abertura do Meet para candidatos
 * - Integração com query params da rota
 */

import { ref, type Ref } from 'vue'
import type { RouteLocationNormalizedLoaded } from 'vue-router'

interface SimulationMeetParams {
  userRole: Ref<string | null>
  route: RouteLocationNormalizedLoaded
}

export function useSimulationMeet({ userRole, route }: SimulationMeetParams) {

  // --- Estado do Google Meet ---

  /**
   * Método de comunicação escolhido
   * 'voice' - Comunicação por voz (beta)
   * 'meet' - Google Meet
   * 'none' - Sem comunicação
   */
  const communicationMethod = ref<string>('')

  /**
   * Link do Google Meet (ator/avaliador)
   */
  const meetLink = ref<string>('')

  /**
   * Feedback visual de que o link foi copiado
   */
  const meetLinkCopied = ref<boolean>(false)

  /**
   * Link do Meet recebido pelo candidato via query params
   */
  const candidateMeetLink = ref<string>('')

  /**
   * Controle se o candidato já abriu o Meet
   */
  const candidateOpenedMeet = ref<boolean>(false)

  // --- Métodos ---

  /**
   * Abre uma nova sala do Google Meet
   */
  function openGoogleMeet() {
    window.open('https://meet.google.com/new', '_blank')
  }

  /**
   * Copia o link do Meet para o clipboard
   */
  function copyMeetLink() {
    if (meetLink.value) {
      navigator.clipboard.writeText(meetLink.value)
      meetLinkCopied.value = true
      setTimeout(() => {
        meetLinkCopied.value = false
      }, 2000)
    }
  }

  /**
   * Verifica se o candidato recebeu um link do Meet via query params
   * Deve ser chamado no onMounted e em mudanças de rota
   */
  function checkCandidateMeetLink() {
    if (userRole.value === 'candidate' && route.query.meet && typeof route.query.meet === 'string') {
      candidateMeetLink.value = route.query.meet
    } else {
      candidateMeetLink.value = ''
    }
    candidateOpenedMeet.value = false // Sempre reinicia ao entrar
  }

  /**
   * Abre o Meet para o candidato
   */
  function openCandidateMeet() {
    if (candidateMeetLink.value) {
      window.open(candidateMeetLink.value, '_blank')
      candidateOpenedMeet.value = true
    }
  }

  /**
   * Valida o link do Google Meet
   * @param link - Link a ser validado
   * @returns Objeto com status de validação e mensagem de erro
   */
  function validateMeetLink(link: string): { valid: boolean; error?: string } {
    if (!link || !link.trim()) {
      return {
        valid: false,
        error: "Cole o link da sala do Google Meet antes de gerar o convite."
      }
    }

    const trimmedLink = link.trim()
    if (!/^https:\/\/meet\.google\.com\//.test(trimmedLink)) {
      return {
        valid: false,
        error: "O link do Meet deve começar com https://meet.google.com/"
      }
    }

    return { valid: true }
  }

  /**
   * Verifica se o método de comunicação escolhido é Google Meet
   */
  function isMeetMode(): boolean {
    return communicationMethod.value === 'meet'
  }

  /**
   * Obtém o link do Meet formatado para ser incluído em convites
   * @returns Link do Meet trimmed ou null se não for modo meet
   */
  function getMeetLinkForInvite(): string | null {
    if (isMeetMode() && meetLink.value) {
      return meetLink.value.trim()
    }
    return null
  }

  /**
   * Reseta todos os estados relacionados ao Meet
   */
  function resetMeetState() {
    communicationMethod.value = ''
    meetLink.value = ''
    meetLinkCopied.value = false
    candidateMeetLink.value = ''
    candidateOpenedMeet.value = false
  }

  return {
    // Estado
    communicationMethod,
    meetLink,
    meetLinkCopied,
    candidateMeetLink,
    candidateOpenedMeet,

    // Métodos
    openGoogleMeet,
    copyMeetLink,
    checkCandidateMeetLink,
    openCandidateMeet,
    validateMeetLink,
    isMeetMode,
    getMeetLinkForInvite,
    resetMeetState
  }
}
