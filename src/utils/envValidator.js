/**
 * Utilitário de validação de variáveis de ambiente
 * Previne expor dados sensíveis e valida configurações críticas
 */

class EnvironmentValidator {
  constructor() {
    this.errors = []
    this.warnings = []
    this.requiredVars = new Map()
    this.sensitiveVars = new Set()

    this.setupValidation()
  }

  setupValidation() {
    // Variáveis obrigatórias para funcionamento mínimo
    this.requiredVars.set('VITE_FIREBASE_PROJECT_ID', {
      required: true,
      description: 'ID do projeto Firebase'
    })

    this.requiredVars.set('VITE_BACKEND_URL', {
      required: true,
      description: 'URL do backend para conexão API'
    })

    // Marcar variáveis sensíveis que não devem ser expostas
    this.sensitiveVars.add('FIREBASE_PRIVATE_KEY')
    this.sensitiveVars.add('FIREBASE_CLIENT_EMAIL')
    this.sensitiveVars.add('GEMINI_API_KEY')
    this.sensitiveVars.add('GOOGLE_API_KEY_1')
    this.sensitiveVars.add('GOOGLE_API_KEY_2')
    this.sensitiveVars.add('GOOGLE_API_KEY_3')
    this.sensitiveVars.add('GOOGLE_DRIVE_CREDENTIALS')
    this.sensitiveVars.add('VITE_SENTRY_DSN')
  }

  validateEnvironment() {
    this.errors = []
    this.warnings = []

    // Verificar variáveis obrigatórias
    for (const [varName, config] of this.requiredVars) {
      const value = import.meta.env[varName]

      if (!value && config.required) {
        this.errors.push(
          `❌ Variável obrigatória ausente: ${varName} - ${config.description}`
        )
      } else if (value && this.isValidValue(value, varName)) {
        this.warnings.push(
          `⚠️ Valor inválido para ${varName}: ${value}`
        )
      }
    }

    // Verificar exposição de variáveis sensíveis no frontend
    this.checkSensitiveExposure()

    // Verificar configurações de CORS
    this.checkCorsConfiguration()

    return {
      isValid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings
    }
  }

  isValidValue(value, varName) {
    if (!value) return true

    // Validações específicas por variável
    if (varName.includes('URL') && !this.isValidUrl(value)) {
      return false
    }

    if (varName.includes('KEY') && value.length < 10) {
      return false
    }

    return true
  }

  isValidUrl(url) {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  checkSensitiveExposure() {
    const frontendVars = Object.keys(import.meta.env).filter(key => key.startsWith('VITE_'))

    for (const varName of frontendVars) {
      if (this.sensitiveVars.has(varName.replace('VITE_', ''))) {
        this.warnings.push(
          `⚠️ Variável sensível exposta no frontend: ${varName}`
        )
      }
    }
  }

  checkCorsConfiguration() {
    const backendUrl = import.meta.env.VITE_BACKEND_URL

    if (backendUrl) {
      // Verificar se está usando localhost em produção
      if (import.meta.env.PROD && backendUrl.includes('localhost')) {
        this.warnings.push(
          '⚠️ Usando localhost em produção. Verifique configuração CORS.'
        )
      }

      // Verificar HTTPS em produção
      if (import.meta.env.PROD && !backendUrl.startsWith('https://')) {
        this.warnings.push(
          '⚠️ Backend sem HTTPS em produção. Recomendado usar HTTPS.'
        )
      }
    }
  }

  // Método para mascarar valores sensíveis em logs
  maskSensitiveValue(value, varName) {
    if (!value) return '[NÃO DEFINIDO]'

    if (this.sensitiveVars.has(varName) || varName.includes('KEY')) {
      return value.substring(0, 4) + '***' + value.substring(value.length - 4)
    }

    return value
  }

  // Gerar relatório de validação
  generateReport() {
    const validation = this.validateEnvironment()

    let report = '\n🔍 RELATÓRIO DE VALIDAÇÃO DE AMBIENTE\n'
    report += '=' .repeat(50) + '\n\n'

    if (validation.errors.length > 0) {
      report += '❌ ERROS CRÍTICOS:\n'
      validation.errors.forEach(error => {
        report += `   ${error}\n`
      })
      report += '\n'
    }

    if (validation.warnings.length > 0) {
      report += '⚠️ AVISOS:\n'
      validation.warnings.forEach(warning => {
        report += `   ${warning}\n`
      })
      report += '\n'
    }

    if (validation.isValid) {
      report += '✅ Ambiente validado com sucesso!\n'
    } else {
      report += '❌ Ambiente com erros críticos. Corrija antes de continuar.\n'
    }

    report += '\n📊 Variáveis de Ambiente:\n'
    this.requiredVars.forEach((config, varName) => {
      const value = import.meta.env[varName]
      const maskedValue = this.maskSensitiveValue(value, varName)
      const status = value ? '✅' : '❌'
      report += `   ${status} ${varName}: ${maskedValue}\n`
    })

    return report
  }
}

// Exportar instância única e classe
export const envValidator = new EnvironmentValidator()
export default EnvironmentValidator