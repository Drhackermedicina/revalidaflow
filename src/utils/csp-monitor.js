// Utilitário para detectar e resolver problemas de CSP (Content Security Policy)
// Especialmente útil para situações onde o usuário fica inativo e há cache de CSP

import { backendUrl } from '@/utils/backendUrl.js'

/**
 * Verifica se há violações de CSP relacionadas ao backend
 */
export function detectCSPViolations() {
  const violations = []
  
  // Observer para violações de CSP
  if (typeof document !== 'undefined') {
    document.addEventListener('securitypolicyviolation', (event) => {
      if (event.blockedURI && event.blockedURI.includes('revalida-backend')) {
        console.error('🚫 CSP Violation detectada:', {
          blockedURI: event.blockedURI,
          violatedDirective: event.violatedDirective,
          originalPolicy: event.originalPolicy,
          timestamp: new Date().toISOString()
        })
        
        violations.push({
          type: 'csp-violation',
          uri: event.blockedURI,
          directive: event.violatedDirective,
          timestamp: new Date()
        })
        
        // Tenta resolver automaticamente
        handleCSPViolation(event)
      }
    })
  }
  
  return violations
}

/**
 * Tenta resolver violações de CSP automaticamente
 */
function handleCSPViolation(event) {
  console.warn('🔧 Tentando resolver violação de CSP...')
  
  // Se for uma violação relacionada ao nosso backend
  if (event.blockedURI && event.blockedURI.includes('revalida-backend')) {
    console.warn('💡 Dica: Atualize a página para recarregar as políticas de segurança')
    
    // Mostra notificação para o usuário
    showCSPWarning()
  }
}

/**
 * Mostra aviso para o usuário sobre problemas de CSP
 */
function showCSPWarning() {
  // Cria notificação discreta
  const notification = document.createElement('div')
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #ff9800;
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    max-width: 300px;
    font-family: Arial, sans-serif;
    font-size: 14px;
    cursor: pointer;
  `
  
  notification.innerHTML = `
    <strong>⚠️ Problema de Conexão</strong><br>
    <small>Clique aqui para atualizar a página</small>
  `
  
  notification.addEventListener('click', () => {
    window.location.reload()
  })
  
  document.body.appendChild(notification)
  
  // Remove automaticamente após 10 segundos
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification)
    }
  }, 10000)
}

/**
 * Testa se o backend está acessível considerando CSP
 */
export async function testBackendAccessibility() {
  try {
    console.log('🧪 Testando acessibilidade do backend...')
    
    // Teste básico de conectividade
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    
    const response = await fetch(`${backendUrl}/health`, {
      signal: controller.signal,
      mode: 'cors',
      credentials: 'omit'
    })
    
    clearTimeout(timeoutId)
    
    if (response.ok) {
      console.log('✅ Backend acessível')
      return { success: true, status: response.status }
    } else {
      console.warn('⚠️ Backend respondeu com erro:', response.status)
      return { success: false, status: response.status, error: 'HTTP Error' }
    }
    
  } catch (error) {
    console.error('❌ Erro ao acessar backend:', error.message)
    
    // Verifica se é erro de CSP
    if (error.message.includes('Content Security Policy') || 
        error.message.includes('Refused to connect')) {
      console.error('🚫 Erro confirmado como violação de CSP')
      showCSPWarning()
      return { success: false, error: 'CSP_VIOLATION', details: error.message }
    }
    
    return { success: false, error: error.message }
  }
}

/**
 * Monitora problemas de inatividade e CSP
 */
export function startCSPMonitoring() {
  console.log('🔍 Iniciando monitoramento de CSP...')
  
  // Detecta violações
  detectCSPViolations()
  
  // Monitora tempo de inatividade
  let lastActivity = Date.now()
  let warningShown = false
  
  // Eventos que indicam atividade do usuário
  const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
  
  const updateActivity = () => {
    lastActivity = Date.now()
    warningShown = false
  }
  
  activityEvents.forEach(event => {
    document.addEventListener(event, updateActivity, true)
  })
  
  // Verifica inatividade a cada minuto
  setInterval(async () => {
    const inactiveTime = Date.now() - lastActivity
    const tenMinutes = 10 * 60 * 1000
    
    if (inactiveTime > tenMinutes && !warningShown) {
      console.warn('⏰ Usuário inativo por mais de 10 minutos, testando conectividade...')
      
      const result = await testBackendAccessibility()
      if (!result.success && result.error === 'CSP_VIOLATION') {
        warningShown = true
        console.warn('🚫 CSP violation detectada após inatividade')
      }
    }
  }, 60000) // Verifica a cada minuto
  
  console.log('✅ Monitoramento de CSP ativo')
}

// Auto-inicia o monitoramento quando o módulo é carregado
if (typeof window !== 'undefined') {
  // Aguarda DOM estar pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startCSPMonitoring)
  } else {
    startCSPMonitoring()
  }
}

export default {
  detectCSPViolations,
  testBackendAccessibility,
  startCSPMonitoring
}
