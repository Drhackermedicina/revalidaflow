const { GoogleGenerativeAI } = require('@google/generative-ai')

/**
 * Serviço de transcrição de áudio usando Gemini 2.0 Flash
 * Suporta áudio de até 8,4 horas de duração
 */
class GeminiAudioTranscription {
  constructor() {
    const keys = this._loadApiKeys()

    if (keys.length === 0) {
      throw new Error('Nenhuma chave da API Gemini configurada. Configure GEMINI_API_KEY (ou GOOGLE_API_KEY_X) no .env')
    }

    this.keyPool = keys.map(key => ({
      key,
      client: new GoogleGenerativeAI(key),
      active: true,
      failures: 0
    }))

    console.log(`✅ [GEMINI_AUDIO] ${this.keyPool.length} chave(s) API carregada(s)`)

    this.currentKeyIndex = 0
  }

  _loadApiKeys() {
    const keys = new Set()

    // Chaves dedicadas ao serviço de áudio
    if (process.env.GEMINI_API_KEY) keys.add(process.env.GEMINI_API_KEY)
    if (process.env.GEMINI_API_KEY_2) keys.add(process.env.GEMINI_API_KEY_2)
    if (process.env.GEMINI_API_KEY_3) keys.add(process.env.GEMINI_API_KEY_3)
    if (process.env.GEMINI_API_KEY_4) keys.add(process.env.GEMINI_API_KEY_4)
    if (process.env.GEMINI_API_KEY_5) keys.add(process.env.GEMINI_API_KEY_5)

    const collectKeys = prefix => Object.keys(process.env)
      .filter(name => name.startsWith(prefix) && process.env[name])
      .map(name => ({
        index: Number.parseInt(name.replace(prefix, ''), 10) || 0,
        value: process.env[name]
      }))
      .filter(item => !Number.isNaN(item.index) && item.index > 0)
      .sort((a, b) => a.index - b.index)
      .map(item => item.value)

    // Chaves globais utilizadas em outros serviços
    for (const key of collectKeys('GOOGLE_API_KEY_')) {
      keys.add(key)
    }

    // Em ambiente de desenvolvimento podemos aproveitar as chaves expostas no Vite
    for (const key of collectKeys('VITE_GOOGLE_API_KEY_')) {
      keys.add(key)
    }

    return Array.from(keys).filter(Boolean)
  }

  _getNextActiveKeyEntry() {
    const total = this.keyPool.length

    for (let attempt = 0; attempt < total; attempt++) {
      const index = (this.currentKeyIndex + attempt) % total
      const entry = this.keyPool[index]

      if (entry.active) {
        this.currentKeyIndex = (index + 1) % total
        return { entry, index }
      }
    }

    throw new Error('Nenhuma chave ativa disponível para transcrição')
  }

  _deactivateKey(index, reason) {
    if (!this.keyPool[index]) return

    this.keyPool[index].active = false
    console.warn(`🚫 [GEMINI_AUDIO] Chave #${index} desativada: ${reason}`)

    const activeCount = this.keyPool.filter(item => item.active).length
    if (activeCount === 0) {
      console.error('❌ [GEMINI_AUDIO] Todas as chaves foram desativadas. Atualize o arquivo .env com credenciais válidas.')
    }
  }

  _isInvalidApiKeyError(error) {
    if (!error) return false

    const message = (error.message || '').toLowerCase()
    if (message.includes('api key expired') || message.includes('api_key_invalid')) {
      return true
    }

    const details = error.errorDetails || error.details || []
    return details.some(detail => (detail.reason || '').toLowerCase() === 'api_key_invalid')
  }

  _isQuotaError(error) {
    if (!error) return false
    const message = (error.message || '').toLowerCase()
    return message.includes('quota') || message.includes('resource_exhausted') || message.includes('rate exceeded')
  }

  _prepareAudioData(audioBuffer) {
    if (Buffer.isBuffer(audioBuffer)) {
      return audioBuffer.toString('base64')
    }
    if (typeof audioBuffer === 'string') {
      return audioBuffer
    }
    throw new Error('Formato de áudio inválido. Esperado Buffer ou string base64')
  }

  _detectMimeType(audioBuffer) {
    if (!Buffer.isBuffer(audioBuffer)) {
      return 'audio/webm'
    }

    const header = audioBuffer.slice(0, 12)

    if (header.slice(0, 4).toString('hex') === '1a45dfa3') return 'audio/webm'
    if (header.slice(0, 2).toString('hex') === 'fffb' || header.slice(0, 3).toString() === 'ID3') return 'audio/mp3'
    if (header.slice(0, 4).toString() === 'RIFF' && header.slice(8, 12).toString() === 'WAVE') return 'audio/wav'
    if (header.slice(0, 4).toString() === 'OggS') return 'audio/ogg'
    if (header.slice(0, 4).toString() === 'fLaC') return 'audio/flac'
    if (header.slice(4, 8).toString() === 'ftyp') return 'audio/mp4'

    console.warn('⚠️ [GEMINI_AUDIO] Tipo MIME não detectado, assumindo audio/webm')
    return 'audio/webm'
  }

  async transcribeAudio(audioBuffer, options = {}) {
    const startTime = Date.now()
    const errors = []
    const audioData = this._prepareAudioData(audioBuffer)
    const mimeType = options.mimeType || this._detectMimeType(audioBuffer)

    for (let attempt = 0; attempt < this.keyPool.length; attempt++) {
      let keyIndex
      let keyEntry

      try {
        const pick = this._getNextActiveKeyEntry()
        keyEntry = pick.entry
        keyIndex = pick.index

        console.log(`🎤 [GEMINI_AUDIO] Transcrevendo com Gemini 2.0 Flash (chave #${keyIndex})`)
        console.log('📊 [GEMINI_AUDIO] Informações do áudio:', {
          mimeType,
          sizeBytes: Buffer.isBuffer(audioBuffer) ? audioBuffer.length : audioData.length,
          estimatedDuration: options.estimatedDuration || 'desconhecido'
        })

        const model = keyEntry.client.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

        const prompt = options.customPrompt || `
Transcreva EXATAMENTE o que foi dito no áudio, palavra por palavra.

INSTRUÇÕES CRÍTICAS:
- Transcreva APENAS a fala do candidato médico
- Use português brasileiro correto
- Mantenha a pontuação natural
- Preserve termos médicos e técnicos
- NÃO adicione interpretações ou comentários
- NÃO corrija erros do falante
- Mantenha hesitações naturais (ex: "uhm", "então")
- Separe diferentes falas com quebras de linha

FORMATO DE RESPOSTA:
Retorne APENAS o texto transcrito, sem prefixos como "Transcrição:" ou explicações.

Exemplo de formato esperado:
Bom dia, doutor. Vim aqui porque estou com uma dor no peito há três dias. A dor é do tipo aperto, principalmente quando subo escadas.
`

        const result = await model.generateContent([
          {
            inlineData: {
              mimeType,
              data: audioData
            }
          },
          prompt
        ])

        const response = await result.response
        const transcription = response.text()
        const duration = Date.now() - startTime

        console.log('✅ [GEMINI_AUDIO] Transcrição concluída!', {
          durationMs: duration,
          transcriptionLength: transcription.length,
          wordsEstimate: transcription.split(/\s+/).length
        })

        return {
          success: true,
          transcription: transcription.trim(),
          metadata: {
            model: 'gemini-2.0-flash-exp',
            mimeType,
            durationMs: duration,
            audioSizeBytes: Buffer.isBuffer(audioBuffer) ? audioBuffer.length : audioData.length,
            wordCount: transcription.split(/\s+/).length,
            timestamp: new Date().toISOString(),
            apiKeyIndex: keyIndex
          }
        }
      } catch (error) {
        console.error(`❌ [GEMINI_AUDIO] Erro na transcrição (chave #${keyIndex}):`, error.message)
        errors.push({
          keyIndex,
          message: error.message
        })

        if (this._isInvalidApiKeyError(error)) {
          this._deactivateKey(keyIndex, 'API_KEY_INVALID')
          continue
        }

        if (this._isQuotaError(error)) {
          keyEntry.failures += 1
          console.warn('⚠️ [GEMINI_AUDIO] Quota excedida, tentando próxima chave...')
          continue
        }

        // Erro não recuperável
        break
      }
    }

    return {
      success: false,
      error: 'Todas as chaves falharam ou estão expiradas',
      errors,
      transcription: null,
      metadata: {
        durationMs: Date.now() - startTime,
        timestamp: new Date().toISOString()
      }
    }
  }

  async transcribeAudioChunks(audioChunks, options = {}) {
    console.log(`🎤 [GEMINI_AUDIO] Transcrevendo ${audioChunks.length} chunks...`)

    const transcriptions = []

    for (let i = 0; i < audioChunks.length; i++) {
      const chunk = audioChunks[i]
      console.log(`📝 [GEMINI_AUDIO] Processando chunk ${i + 1}/${audioChunks.length}...`)

      const result = await this.transcribeAudio(chunk, {
        ...options,
        customPrompt: `
Transcreva a continuação da conversa do candidato médico.
${i > 0 ? 'Esta é a continuação de uma conversa anterior.' : 'Este é o início da conversa.'}

Transcreva EXATAMENTE o que foi dito, mantendo termos médicos e contexto clínico.
`
      })

      if (result.success) {
        transcriptions.push(result.transcription)
      } else {
        console.error(`❌ [GEMINI_AUDIO] Erro no chunk ${i + 1}:`, result.error)
        break
      }
    }

    return {
      success: transcriptions.length > 0,
      transcription: transcriptions.join('\n\n'),
      metadata: {
        totalChunks: audioChunks.length,
        successfulChunks: transcriptions.length,
        timestamp: new Date().toISOString()
      }
    }
  }

  async testTranscription() {
    console.log('🧪 [GEMINI_AUDIO] Iniciando teste de transcrição...')

    const testAudio = Buffer.from('TESTE_AUDIO_BUFFER')

    try {
      const result = await this.transcribeAudio(testAudio, {
        mimeType: 'audio/webm'
      })

      console.log('✅ [GEMINI_AUDIO] Teste concluído:', {
        success: result.success,
        hasTranscription: !!result.transcription
      })

      return result
    } catch (error) {
      console.error('❌ [GEMINI_AUDIO] Teste falhou:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }
}

let instance = null

function getGeminiAudioTranscription() {
  if (!instance) {
    instance = new GeminiAudioTranscription()
  }
  return instance
}

module.exports = {
  GeminiAudioTranscription,
  getGeminiAudioTranscription
}
