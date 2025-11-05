import { ref, onMounted, onUnmounted } from 'vue'

/**
 * @typedef {import('vue').Ref<any>} Ref
 */

/**
 * Composable para gerenciar reconhecimento e síntese de voz.
 * @param {{stationData: Ref<object>, onTranscript: (text: string) => void, onTranscriptEnd: (text: string) => void, onListeningEnd: () => void}} options
 * @returns {{isListening: Ref<boolean>, isSpeaking: Ref<boolean>, autoRecordMode: Ref<boolean>, start: () => void, stop: () => void, speak: (text: string) => void, stopSpeaking: () => void, toggleAutoRecordMode: () => void}}
 */
const LISTENING_TIMEOUT_MS = 100000

const FEMALE_NAME_HINTS = new Set([
  'ana', 'maria', 'mariana', 'marina', 'amanda', 'beatriz', 'bianca', 'bruna', 'camila', 'carla', 'carolina',
  'catarina', 'clarice', 'clara', 'fernanda', 'gabriela', 'helena', 'isabela', 'isabella', 'jessica', 'jéssica',
  'julia', 'júlia', 'lais', 'laís', 'lara', 'laura', 'leticia', 'letícia', 'luana', 'luiza', 'luísa', 'manuela',
  'marcela', 'monica', 'mônica', 'natália', 'patricia', 'patrícia', 'rafaela', 'raquel', 'renata', 'sabrina',
  'sandra', 'simone', 'sofia', 'sophia', 'thais', 'thaís', 'valentina', 'vanessa', 'victoria', 'vitória'
])

const MALE_NAME_HINTS = new Set([
  'adriano', 'alexandre', 'anderson', 'andre', 'andré', 'antonio', 'antônio', 'arthur', 'artur', 'augusto', 'bernardo',
  'bruno', 'caio', 'carlos', 'césar', 'daniel', 'diego', 'eduardo', 'enrico', 'enzo', 'erick', 'felipe', 'fernando',
  'gabriel', 'gustavo', 'henrique', 'igor', 'joao', 'joão', 'jorge', 'josé', 'julio', 'júlio', 'leandro', 'leo',
  'leonardo', 'luan', 'lucas', 'luiz', 'manuel', 'marcelo', 'marcos', 'mateus', 'matheus', 'miguel', 'otavio',
  'otávio', 'paulo', 'pedro', 'rafael', 'ricardo', 'roberto', 'rodrigo', 'samuel', 'sergio', 'thiago',
  'tiago', 'vicente', 'vinicius', 'vinícius', 'vitor', 'vítor', 'william'
])

function normalizeForComparison(value) {
  return value
    ? value
      .toString()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .trim()
    : ''
}

function detectGenderFromName(name) {
  const normalized = normalizeForComparison(name)
  if (!normalized) return null
  if (FEMALE_NAME_HINTS.has(normalized)) return 'female'
  if (MALE_NAME_HINTS.has(normalized)) return 'male'

  if (normalized.endsWith('a')) return 'female'
  if (normalized.endsWith('o') || normalized.endsWith('r') || normalized.endsWith('u') || normalized.endsWith('s')) {
    return 'male'
  }
  return null
}

function extractNameFromIdentification(section) {
  if (!section) return null
  const info = typeof section.informacao === 'string' ? section.informacao : ''
  if (!info) return null
  const firstSegment = info.split(/\n|,/)[0]?.trim()
  if (!firstSegment) return null
  const candidate = firstSegment.split(/\s+/)[0]?.replace(/[^A-Za-zÁÉÍÓÚÃÕÂÊÎÔÛÇçãõâêîôû'-]/g, '')
  return candidate && candidate.length > 1 ? candidate : null
}

export function useSpeechInteraction({ stationData, onTranscript, onTranscriptEnd, onListeningEnd }) {
  const isListening = ref(false)
  const isSpeaking = ref(false)
  const autoRecordMode = ref(false)

  let recognition = null
  let speechTimeout = null
  let silenceTimeout = null
  let selectedVoice = null

  // --- Funções de Síntese de Voz (Text-to-Speech) ---

  function extractPatientDemographics() {
    if (!stationData.value) return { gender: null, age: null, name: null }

    const patientScript = stationData.value.materiaisDisponiveis?.informacoesVerbaisSimulado || []
    let combinedText = ''

    patientScript.forEach(item => {
      if (item?.informacao) combinedText += `${item.informacao}\n`
    })

    const participante = stationData.value.instrucoesParticipante || {}
    if (participante.descricaoCasoCompleta) combinedText += `${participante.descricaoCasoCompleta}\n`
    if (participante.identificacaoPaciente) combinedText += `${participante.identificacaoPaciente}\n`
    if (Array.isArray(participante.tarefasPrincipais)) {
      participante.tarefasPrincipais.forEach(text => {
        if (typeof text === 'string') combinedText += `${text}\n`
      })
    }
    if (Array.isArray(participante.avisosImportantes)) {
      participante.avisosImportantes.forEach(text => {
        if (typeof text === 'string') combinedText += `${text}\n`
      })
    }

    if (stationData.value.tituloEstacao) combinedText += `${stationData.value.tituloEstacao}\n`
    if (stationData.value.informacoesEssenciais) combinedText += `${stationData.value.informacoesEssenciais}\n`
    if (stationData.value.titulo) combinedText += `${stationData.value.titulo}\n`

    const demographics = { gender: null, age: null, name: null }
    const ageMatch = combinedText.match(/(\d+)\s*anos?/i)
    if (ageMatch) demographics.age = parseInt(ageMatch[1])

    const text = combinedText.toLowerCase()
    const feminineIndicators = [
      /\b(mulher|feminino|senhora|sra|dona|gestante|grávida|menstruação|menopausa|menina|garota)\b/i,
      /\b(casada|solteira|divorciada|viúva|separada)\b/i,
      /\b(ela|dela|feminina)\b/i,
      /\bsexo\s*feminino\b/i,
      /\bpaciente\s+do\s+sexo\s*feminino\b/i
    ]
    const masculineIndicators = [
      /\b(homem|masculino|senhor|sr|rapaz|menino|garoto)\b/i,
      /\b(casado|solteiro|divorciado|viúvo|separado)\b/i,
      /\b(ele|dele|masculino)\b/i,
      /\bsexo\s*masculino\b/i,
      /\bpaciente\s+do\s+sexo\s*masculino\b/i
    ]
    let femaleScore = 0
    let maleScore = 0
    feminineIndicators.forEach(pattern => { if (pattern.test(text)) femaleScore++ })
    masculineIndicators.forEach(pattern => { if (pattern.test(text)) maleScore++ })

    const identificationSection = patientScript.find(section =>
      normalizeForComparison(section?.contextoOuPerguntaChave || '').includes('identificacao do paciente')
    )
    const nameFromIdentification = extractNameFromIdentification(identificationSection)
    let detectedName = nameFromIdentification

    if (!detectedName) {
      const nameRegex = /\b(?:paciente|sr\.?|senhor|sra\.?|senhora|srta\.?)\s+([A-ZÁÉÍÓÚÃÕÂÊÎÔÛÇ][A-Za-zÁÉÍÓÚÃÕÂÊÎÔÛÇçãõâêîôû'-]+)/g
      const allMatches = []
      let match
      while ((match = nameRegex.exec(combinedText)) !== null) {
        const candidate = match[1]?.replace(/[^A-Za-zÁÉÍÓÚÃÕÂÊÎÔÛÇçãõâêîôû'-]/g, '')
        if (candidate && candidate.length > 1) {
          allMatches.push(candidate)
          break
        }
      }
      if (allMatches.length > 0) {
        detectedName = allMatches[0]
      }
    }

    if (!detectedName && stationData.value?.tituloEstacao) {
      const tokens = stationData.value.tituloEstacao.split(/[\s-]+/)
      const candidate = tokens.length ? tokens[0].replace(/[^A-Za-zÁÉÍÓÚÃÕÂÊÎÔÛÇçãõâêîôû'-]/g, '') : ''
      if (candidate && candidate.length > 1) detectedName = candidate
    }

    if (detectedName) {
      demographics.name = detectedName
      const genderFromName = detectGenderFromName(detectedName)
      if (genderFromName === 'female') femaleScore += 2
      else if (genderFromName === 'male') maleScore += 2
    }

    const explicitGenderFields = [
      stationData.value?.sexoPaciente,
      stationData.value?.generoPaciente,
      participante?.sexo,
      participante?.sexoPaciente
    ]

    explicitGenderFields.forEach(value => {
      const normalized = normalizeForComparison(value)
      if (!normalized) return
      if (normalized.includes('fem')) femaleScore += 3
      if (normalized.includes('masc')) maleScore += 3
    })

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
        const payload = {
          interim: interimTranscript,
          final: finalTranscript
        }
        if (typeof onTranscript === 'function') {
          onTranscript(payload)
        }
        const finalTrimmed = finalTranscript.trim()
        if (finalTrimmed && typeof onTranscriptEnd === 'function') {
          onTranscriptEnd(finalTrimmed)
        }

        if (autoRecordMode.value && (finalTranscript || interimTranscript)) {
          if (silenceTimeout) clearTimeout(silenceTimeout)
          silenceTimeout = setTimeout(() => {
            if (isListening.value && autoRecordMode.value) {
              stop()
              onListeningEnd()
            }
          }, LISTENING_TIMEOUT_MS)
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
        speechTimeout = setTimeout(() => { if (isListening.value) stop() }, LISTENING_TIMEOUT_MS)
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
