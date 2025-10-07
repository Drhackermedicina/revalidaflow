import { ref } from 'vue'

export interface NotificationMessage {
  id: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  timeout?: number
  persistent?: boolean
  timestamp: Date
}

export function useSimulationNotifications() {
  const showNotificationSnackbar = ref(false)
  const notificationMessage = ref('')
  const notificationColor = ref('info')
  const notificationTimeout = ref(5000)

  // Histórico de notificações
  const notificationHistory = ref<NotificationMessage[]>([])
  const activeNotifications = ref<NotificationMessage[]>([])

  /**
   * Mostra notificação simples
   */
  function showNotification(message: string, color = 'info', timeout = 5000) {
    notificationMessage.value = message
    notificationColor.value = color
    notificationTimeout.value = timeout
    showNotificationSnackbar.value = true

    // Adicionar ao histórico
    const notification: NotificationMessage = {
      id: generateNotificationId(),
      message,
      type: color as any,
      timeout,
      timestamp: new Date()
    }
    notificationHistory.value.unshift(notification)

    // Limitar histórico a 50 notificações
    if (notificationHistory.value.length > 50) {
      notificationHistory.value = notificationHistory.value.slice(0, 50)
    }
  }

  /**
   * Mostra notificação de sucesso
   */
  function showSuccess(message: string, timeout = 3000) {
    showNotification(message, 'success', timeout)
  }

  /**
   * Mostra notificação de erro
   */
  function showError(message: string, timeout = 0) {
    showNotification(message, 'error', timeout || 10000)
  }

  /**
   * Mostra notificação de alerta
   */
  function showWarning(message: string, timeout = 5000) {
    showNotification(message, 'warning', timeout)
  }

  /**
   * Mostra notificação informativa
   */
  function showInfo(message: string, timeout = 5000) {
    showNotification(message, 'info', timeout)
  }

  /**
   * Mostra notificação persistente (não fecha automaticamente)
   */
  function showPersistentNotification(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
    showNotification(message, type, 0)
  }

  /**
   * Fecha notificação ativa
   */
  function closeNotification() {
    showNotificationSnackbar.value = false
  }

  /**
   * Limpa todas as notificações
   */
  function clearAllNotifications() {
    showNotificationSnackbar.value = false
    notificationMessage.value = ''
    notificationColor.value = 'info'
    activeNotifications.value = []
  }

  /**
   * Gera ID único para notificação
   */
  function generateNotificationId(): string {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Adiciona notificação ativa
   */
  function addActiveNotification(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', options: { persistent?: boolean, timeout?: number } = {}) {
    const notification: NotificationMessage = {
      id: generateNotificationId(),
      message,
      type,
      timeout: options.timeout || 5000,
      persistent: options.persistent || false,
      timestamp: new Date()
    }

    activeNotifications.value.push(notification)

    // Auto-remove se não for persistente
    if (!notification.persistent && notification.timeout && notification.timeout > 0) {
      setTimeout(() => {
        removeActiveNotification(notification.id)
      }, notification.timeout)
    }

    return notification.id
  }

  /**
   * Remove notificação ativa por ID
   */
  function removeActiveNotification(notificationId: string) {
    const index = activeNotifications.value.findIndex(n => n.id === notificationId)
    if (index > -1) {
      activeNotifications.value.splice(index, 1)
    }
  }

  /**
   * Remove notificação ativa por mensagem
   */
  function removeNotificationByMessage(message: string) {
    const index = activeNotifications.value.findIndex(n => n.message === message)
    if (index > -1) {
      activeNotifications.value.splice(index, 1)
    }
  }

  /**
   * Verifica se notificação existe
   */
  function hasNotification(message: string): boolean {
    return activeNotifications.value.some(n => n.message === message)
  }

  /**
   * Conta notificações por tipo
   */
  function countNotificationsByType(type: 'info' | 'success' | 'warning' | 'error'): number {
    return activeNotifications.value.filter(n => n.type === type).length
  }

  /**
   * Obtém notificações não lidas
   */
  function getUnreadNotifications(): NotificationMessage[] {
    return activeNotifications.value.filter(n => !n.persistent)
  }

  /**
   * Marca notificação como lida
   */
  function markAsRead(notificationId: string) {
    const notification = activeNotifications.value.find(n => n.id === notificationId)
    if (notification) {
      notification.persistent = true
    }
  }

  /**
   * Notificações específicas para simulação
   */
  const simulationNotifications = {
    partnerConnected: () => showSuccess('Parceiro conectado com sucesso!'),
    partnerDisconnected: () => showWarning('O parceiro desconectou da simulação.'),
    simulationStarted: () => showInfo('Simulação iniciada! Boa sorte!'),
    simulationEnded: () => showInfo('Simulação finalizada. Aguardando avaliação.'),
    evaluationSubmitted: () => showSuccess('Avaliação submetida com sucesso!'),
    pepReleased: () => showSuccess('PEP liberado para visualização!'),
    timeRunningOut: () => showWarning('Atenção: tempo está acabando!', 10000),
    error: (message: string) => showError(`Erro na simulação: ${message}`),
    candidateReady: () => showInfo('Candidato está pronto!'),
    evaluatorReady: () => showInfo('Avaliador está pronto!'),
    invitationSent: () => showSuccess('Convite enviado com sucesso!'),
    invitationReceived: () => showInfo('Você recebeu um convite de simulação!'),
    meetLinkGenerated: () => showSuccess('Link do Google Meet gerado!'),
    dataReleased: (itemName: string) => showInfo(`${itemName} liberado para o candidato.`),
    scoringUpdated: () => showInfo('Pontuação atualizada.'),
    sessionCreated: () => showSuccess('Sessão criada com sucesso!'),
    backendConnected: () => showSuccess('Conectado ao servidor de simulação!'),
    backendDisconnected: () => showError('Conexão com o servidor perdida.'),
    autoSaveComplete: () => showInfo('Progresso salvo automaticamente.'),
    validationError: (field: string) => showWarning(`Por favor, verifique o campo: ${field}`),
    networkError: () => showError('Erro de conexão. Verifique sua internet.'),
    permissionDenied: () => showError('Você não tem permissão para realizar esta ação.'),
    resourceNotFound: () => showError('Recurso não encontrado.'),
    operationComplete: () => showSuccess('Operação concluída com sucesso!'),
    operationCancelled: () => showInfo('Operação cancelada.'),
    pleaseWait: () => showInfo('Por favor, aguarde...'),
    clipboardCopied: () => showSuccess('Copiado para a área de transferência!'),
    clipboardError: () => showError('Falha ao copiar para a área de transferência.'),
    imageLoadError: () => showError('Erro ao carregar imagem.'),
    fileUploadSuccess: (fileName: string) => showSuccess(`Arquivo ${fileName} enviado com sucesso!`),
    fileUploadError: (fileName: string) => showError(`Erro ao enviar arquivo ${fileName}.`),
    navigationError: () => showError('Erro na navegação. Tente novamente.'),
    dataSyncComplete: () => showSuccess('Sincronização de dados concluída!'),
    dataSyncError: () => showError('Erro na sincronização de dados.'),
    featureNotAvailable: () => showWarning('Esta funcionalidade não está disponível no momento.'),
    maintenanceMode: () => showWarning('Sistema em manutenção. Tente novamente mais tarde.'),
    newUpdateAvailable: () => showInfo('Nova atualização disponível!'),
    storageQuotaExceeded: () => showError('Cota de armazenamento excedida.'),
    invalidInput: (field: string) => showWarning(`Valor inválido para ${field}.`),
    sessionTimeout: () => showError('Sessão expirada. Por favor, faça login novamente.'),
    concurrentSession: () => showWarning('Detectamos outra sessão ativa.'),
    securityAlert: () => showError('Alerta de segurança detectado.'),
    backupComplete: () => showSuccess('Backup concluído com sucesso!'),
    restoreComplete: () => showSuccess('Restauração concluída com sucesso!')
  }

  return {
    // Estado
    showNotificationSnackbar,
    notificationMessage,
    notificationColor,
    notificationTimeout,
    notificationHistory,
    activeNotifications,

    // Métodos básicos
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showPersistentNotification,
    closeNotification,
    clearAllNotifications,

    // Métodos avançados
    addActiveNotification,
    removeActiveNotification,
    removeNotificationByMessage,
    hasNotification,
    countNotificationsByType,
    getUnreadNotifications,
    markAsRead,

    // Notificações específicas
    simulationNotifications
  }
}