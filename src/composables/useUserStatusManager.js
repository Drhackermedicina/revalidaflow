/**
 * useUserStatusManager.js
 * 
 * Composable para gerenciar status de usuários com base na página atual
 * Adiciona suporte aos status "Treinando" e "Treinando com IA"
 * 
 * @author REVALIDAFLOW Team
 */

import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { usePageVisibility } from '@/composables/usePageVisibility.js'
import { userRepository } from '@/repositories/userRepository.js'
import { logger } from '@/utils/logger.js'
import { currentUser } from '@/plugins/auth.js'

// 🔍 DEBUG: Log de inicialização
logger.debug('[DEBUG] useUserStatusManager.js - Módulo carregado')

export function useUserStatusManager() {
  const route = useRoute()
  const { isVisible, isHidden } = usePageVisibility()

  // Estado local do status
  const currentStatus = ref('disponivel')
  const isStatusUpdating = ref(false)

  // Status baseado na página atual
  const pageBasedStatus = computed(() => {
    const routeName = route.name

    // Se estiver na página de simulação normal
    if (routeName === 'SimulationView') {
      return 'treinando'
    }

    // Se estiver na página de simulação com IA
    if (routeName === 'SimulationViewAI') {
      return 'treinando_com_ia'
    }

    // Status padrão para outras páginas
    return 'disponivel'
  })

  // Função para atualizar o status do usuário
  const updateUserStatus = async (status = null) => {
    if (!currentUser.value?.uid) {
      // Silenciar warning em desenvolvimento - é comportamento esperado durante carregamento
      if (import.meta.env.DEV) {
        logger.debug('[STATUS] Usuário não autenticado - aguardando carregamento...')
      } else {
        logger.warn('[STATUS] Usuário não autenticado para atualizar status')
      }
      return
    }

    const statusToSet = status || pageBasedStatus.value

    // 🔍 DEBUG: Log de tentativa de atualização
    logger.debug('[DEBUG] useUserStatusManager - Tentando atualizar status:', {
      currentStatus: currentStatus.value,
      newStatus: statusToSet,
      page: route.name,
      triggeredBy: status ? 'manual' : 'automatic',
      isStatusUpdating: isStatusUpdating.value
    })

    // Evita atualizações desnecessárias
    if (currentStatus.value === statusToSet) {
      logger.debug('[DEBUG] useUserStatusManager - Status igual, ignorando atualização')
      return
    }

    isStatusUpdating.value = true

    try {
      await userRepository.updatePresence(currentUser.value.uid, statusToSet)
      currentStatus.value = statusToSet

      logger.debug('[STATUS] Status atualizado', {
        userId: currentUser.value.uid,
        status: statusToSet,
        page: route.name,
        triggeredBy: status ? 'manual' : 'automatic'
      })

      // 🔍 DEBUG: Log de sucesso
      logger.debug('[DEBUG] useUserStatusManager - Status atualizado com SUCESSO:', statusToSet)
    } catch (error) {
      logger.error('[STATUS] Erro ao atualizar status:', error)
      // 🔍 DEBUG: Log de erro
      logger.debug('[DEBUG] useUserStatusManager - ERRO ao atualizar status:', error.message)
      // Mantém o status atual em caso de erro
    } finally {
      isStatusUpdating.value = false
    }
  }

  // Função para verificar se o usuário está em uma página de simulação
  const isInSimulationPage = computed(() => {
    return ['SimulationView', 'SimulationViewAI'].includes(route.name)
  })

  // Função para obter o status formatado para exibição
  const getDisplayStatus = (status = null) => {
    const statusToFormat = status || currentStatus.value

    switch (statusToFormat) {
      case 'disponivel':
        return 'Disponível'
      case 'ausente':
        return 'Ausente'
      case 'treinando':
        return 'Treinando'
      case 'treinando_com_ia':
        return 'Treinando com IA'
      default:
        return 'Disponível'
    }
  }

  // Observador para mudanças de rota
  watch(() => route.name, () => {
    // Atualiza status baseado na nova página
    if (isInSimulationPage.value) {
      updateUserStatus()
    } else {
      // Se sair de uma página de simulação, volta para disponível
      updateUserStatus('disponivel')
    }
  })

  // Observador para visibilidade da página
  watch(isVisible, (visible) => {
    if (!visible) {
      // Página ficou oculta (usuário minimizou ou mudou de aba)
      return
    }

    // Se estiver em página de simulação e voltou a ser visível
    if (isInSimulationPage.value) {
      updateUserStatus()
    }
  })

  // Observer para conexão do usuário
  watch(() => currentUser.value?.uid, (userId, prevUserId) => {
    if (!userId) return

    // Se mudou de usuário, limpa estado anterior
    if (prevUserId && prevUserId !== userId) {
      currentStatus.value = 'disponivel'
    }

    // Define status inicial baseado na página atual
    updateUserStatus()
  }, { immediate: true })

  // Inicialização
  onMounted(() => {
    // Define status inicial
    updateUserStatus()
  })

  // Cleanup
  onUnmounted(() => {
    // Volta para status disponível ao sair
    if (currentUser.value?.uid && isInSimulationPage.value) {
      userRepository.updatePresence(currentUser.value.uid, 'disponivel').catch(error => {
        logger.error('[STATUS] Erro ao resetar status:', error)
      })
    }
  })

  return {
    // Estado
    currentStatus: computed(() => currentStatus.value),
    isStatusUpdating: computed(() => isStatusUpdating.value),
    isInSimulationPage,

    // Métodos
    updateUserStatus,
    getDisplayStatus
  }
}
