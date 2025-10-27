import { ref, onMounted, onUnmounted } from 'vue'

/**
 * @typedef {import('vue').Ref<any>} Ref
 */

/**
 * Composable para gerenciar reconhecimento e síntese de voz.
 * @param {{stationData: Ref<object>, onTranscript: (text: string) => void, onTranscriptEnd: (text: string) => void, onListeningEnd: () => void}} options
 * @returns {{isListening: Ref<boolean>, isSpeaking: Ref<boolean>, autoRecordMode: Ref<boolean>, start: () => void, stop: () => void, speak: (text: string) => void, stopSpeaking: () => void, toggleAutoRecordMode: () => void}}
 */
export function useSpeechInteraction({ stationData, onTranscript, onTranscriptEnd, onListeningEnd }) {
  const isListening = ref(false)
  const isSpeaking = ref(false)
  const autoRecordMode = ref(true)

  let recognition = null
  let speechTimeout = null
  let silenceTimeout = null
  let selectedVoice = null

  // --- Funções de Síntese de Voz (Text-to-Speech) ---

  function extractPatientDemographics() {
    if (!stationData.value) return { gender: null, age: null }
    const patientScript = stationData.value.materiaisDisponiveis?.informacoesVerbaisSimulado || []
    let allText = ''
    patientScript.forEach(item => {
      if (item.informacao) allText += item.informacao + '\n'
    })

    const demographics = { gender: null, age: null }
    const ageMatch = allText.match(/(\d+)\s*anos?/i)
    if (ageMatch) demographics.age = parseInt(ageMatch[1])

    const text = allText.toLowerCase()
    const feminineIndicators = [ /\b(mulher|feminino|senhora|sra|dona|gestante|grávida|menstruação|menopausa)\b/i, /\b(casada|solteira|divorciada|viúva|separada)\b/i, /\b(ela|dela)\b/i ]
    const masculineIndicators = [ /\b(homem|masculino|senhor|sr|rapaz)\b/i, /\b(casado|solteiro|divorciado|viúvo|separado)\b/i, /\b(ele|dele)\b/i ]
    let femaleScore = 0
    let maleScore = 0
    feminineIndicators.forEach(pattern => { if (pattern.test(text)) femaleScore++ })
    masculineIndicators.forEach(pattern => { if (pattern.test(text)) maleScore++ })

    if (femaleScore > maleScore) demographics.gender = 'female'
    else if (maleScore > femaleScore) demographics.gender = 'male'

    return demographics
  }

  function selectVoiceForPatient() {
    if (!('speechSynthesis' in window)) return null
    const { gender } = extractPatientDemographics()
    const voices = window.speechSynthesis.getVoices().filter(v => v.lang.includes('pt-BR') || v.lang.includes('pt_BR'))
    if (voices.length === 0) return null

    let voice = null
    if (gender === 'female') {
      voice = voices.find(v => v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('maria') || v.name.toLowerCase().includes('luciana') || v.name.toLowerCase().includes('francisca'))
    } else if (gender === 'male') {
      voice = voices.find(v => v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('masculino') || v.name.toLowerCase().includes('ricardo') || v.name.toLowerCase().includes('felipe'))
    }
    return voice || voices[0]
  }

  function getVoiceParametersForAge(age) {
    if (!age) return { rate: 0.9, pitch: 1.0 }
    if (age < 12) return { rate: 1.1, pitch: 1.4 }
    if (age < 18) return { rate: 1.0, pitch: 1.2 }
    if (age < 40) return { rate: 0.95, pitch: 1.0 }
    if (age < 60) return { rate: 0.85, pitch: 0.95 }
    return { rate: 0.75, pitch: 0.85 }
  }

  function speak(text) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'pt-BR'

      if (!selectedVoice) selectedVoice = selectVoiceForPatient()
      if (selectedVoice) utterance.voice = selectedVoice

      const { age } = extractPatientDemographics()
      const { rate, pitch } = getVoiceParametersForAge(age)
      utterance.rate = Math.min(rate * 1.2, 2)
      utterance.pitch = pitch

      utterance.onstart = () => { isSpeaking.value = true }
      utterance.onend = () => {
        isSpeaking.value = false
        if (autoRecordMode.value && !isListening.value) {
          setTimeout(() => { if (autoRecordMode.value && !isListening.value) start() }, 500)
        }
      }
      utterance.onerror = () => {
        isSpeaking.value = false
        if (autoRecordMode.value && !isListening.value) {
          setTimeout(() => { if (autoRecordMode.value && !isListening.value) start() }, 500)
        }
      }
      window.speechSynthesis.speak(utterance)
    }
  }

  function stopSpeaking() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      isSpeaking.value = false
    }
  }

  // --- Funções de Reconhecimento de Voz (Speech-to-Text) ---

  function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      recognition = new SpeechRecognition()
      recognition.lang = 'pt-BR'
      recognition.continuous = true
      recognition.interimResults = true
      recognition.maxAlternatives = 1

      recognition.onresult = (event) => {
        let finalTranscript = ''
        let interimTranscript = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) finalTranscript += transcript
          else interimTranscript += transcript
        }
        onTranscript(finalTranscript + interimTranscript)
        if (finalTranscript) onTranscriptEnd(finalTranscript.trim())

        if (autoRecordMode.value && (finalTranscript || interimTranscript)) {
          if (silenceTimeout) clearTimeout(silenceTimeout)
          silenceTimeout = setTimeout(() => {
            if (isListening.value && autoRecordMode.value) {
              stop()
              onListeningEnd()
            }
          }, 2000)
        }
      }

      recognition.onerror = (event) => {
        console.error('Erro no reconhecimento de voz:', event.error)
        isListening.value = false
      }

      recognition.onend = () => {
        if (speechTimeout) clearTimeout(speechTimeout)
        if (silenceTimeout) clearTimeout(silenceTimeout)
        if (autoRecordMode.value && isListening.value) {
          try {
            setTimeout(() => { if (autoRecordMode.value && isListening.value) recognition.start() }, 100)
          } catch (error) {
            isListening.value = false
          }
        } else {
          isListening.value = false
        }
      }
    } else {
      console.warn('Reconhecimento de voz não suportado.')
    }
  }

  function start() {
    if (!recognition) return
    if (!isListening.value) {
      try {
        isListening.value = true
        recognition.start()
        speechTimeout = setTimeout(() => { if (isListening.value) stop() }, 30000)
      } catch (error) {
        isListening.value = false
      }
    }
  }

  function stop() {
    if (recognition && isListening.value) {
      recognition.stop()
      isListening.value = false
      if (speechTimeout) clearTimeout(speechTimeout)
      if (silenceTimeout) clearTimeout(silenceTimeout)
    }
  }

  function toggleAutoRecordMode() {
    autoRecordMode.value = !autoRecordMode.value
    if (autoRecordMode.value && !isListening.value) start()
    else if (!autoRecordMode.value && isListening.value) stop()
  }

  onMounted(() => {
    initSpeechRecognition()
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => { selectedVoice = null }
    }
  })

  onUnmounted(() => {
    stop()
    stopSpeaking()
  })

  return {
    isListening,
    isSpeaking,
    autoRecordMode,
    start,
    stop,
    speak,
    stopSpeaking,
    toggleAutoRecordMode,
  }
}
