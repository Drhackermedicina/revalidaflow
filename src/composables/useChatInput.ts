import { ref } from 'vue'

// Função básica de sanitização (pode ser substituída por DOMPurify)
const sanitizeHtml = (html: string): string => {
    // Remove tags HTML potencialmente perigosas
    const allowedTags = ['a', 'br', 'strong', 'em', 'u']
    const allowedAttrs = ['href', 'target', 'rel']

    // Regex simples para remover tags não permitidas
    let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    sanitized = sanitized.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')

    // Permitir apenas tags específicas
    const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g
    sanitized = sanitized.replace(tagRegex, (match, tagName) => {
        if (allowedTags.includes(tagName.toLowerCase())) {
            return match
        }
        return '' // Remove tag não permitida
    })

    return sanitized
}

export const useChatInput = () => {
    const newMessage = ref('')

    // Função para detectar e formatar links no texto
    const formatMessageText = (text?: string) => {
        if (!text) return ''

        // Sanitizar primeiro
        const sanitized = sanitizeHtml(text)

        // Regex para detectar URLs (http/https)
        const urlRegex = /(https?:\/\/[^\s]+)/g

        return sanitized.replace(urlRegex, (url) => {
            return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="message-link">${url}</a>`
        }).replace(/\n/g, '<br>')
    }    // Função para verificar se a mensagem contém links
    const hasLinks = (text?: string) => {
        if (!text) return false
        const urlRegex = /(https?:\/\/[^\s]+)/g
        return urlRegex.test(text)
    }

    // Função para copiar links da mensagem
    const copyMessageLinks = async (text?: string) => {
        if (!text) return

        const urlRegex = /(https?:\/\/[^\s]+)/g
        const links = text.match(urlRegex)

        if (links && links.length > 0) {
            try {
                // Usa a Clipboard API moderna
                const textToCopy = links.length === 1 ? links[0] : links.join('\n')
                await navigator.clipboard.writeText(textToCopy)
            } catch (error) {
                console.error('Erro ao copiar link:', error)
                // Fallback para navegadores mais antigos (ainda que deprecated)
                try {
                    const textArea = document.createElement('textarea')
                    textArea.value = links.length === 1 ? links[0] : links.join('\n')
                    document.body.appendChild(textArea)
                    textArea.select()
                    document.execCommand('copy')
                    document.body.removeChild(textArea)
                } catch (fallbackError) {
                    console.error('Fallback copy também falhou:', fallbackError)
                }
            }
        }
    }

    // Função para limpar input após envio
    const clearMessage = () => {
        newMessage.value = ''
    }

    // Validação básica da mensagem
    const validateMessage = (text: string): { valid: boolean; error?: string } => {
        const trimmed = text.trim()
        if (!trimmed) {
            return { valid: false, error: 'Mensagem não pode estar vazia' }
        }
        if (trimmed.length > 1000) {
            return { valid: false, error: 'Mensagem muito longa (máx. 1000 caracteres)' }
        }
        // Verificar se contém apenas caracteres válidos (evitar caracteres de controle)
        if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(trimmed)) {
            return { valid: false, error: 'Mensagem contém caracteres inválidos' }
        }
        // Verificar se não é apenas espaços ou quebras de linha
        if (!trimmed.replace(/\s/g, '')) {
            return { valid: false, error: 'Mensagem não pode conter apenas espaços' }
        }
        return { valid: true }
    }

    // Função para sanitizar entrada do usuário
    const sanitizeInput = (text: string): string => {
        return text
            .replace(/[<>'"&]/g, '') // Remove caracteres HTML perigosos
            .trim()
    }

    return {
        newMessage,
        formatMessageText,
        hasLinks,
        copyMessageLinks,
        clearMessage,
        validateMessage,
        sanitizeInput
    }
}
