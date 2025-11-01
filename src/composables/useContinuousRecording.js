import { ref, onUnmounted } from 'vue'

export function useContinuousRecording() {
  const isRecording = ref(false)
  const recordingTime = ref(0)
  const audioBlob = ref(null)
  const mediaRecorder = ref(null)
  const stream = ref(null)
  const timer = ref(null)
  const hasPermission = ref(false)
  const error = ref('')
  const isContinuous = ref(false)
  const recordingChunks = ref([])
  const recordingStartTime = ref(null)

  // Cleanup on unmount
  onUnmounted(() => {
    cleanup()
  })

  const requestMicrophonePermission = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.value = mediaStream
      hasPermission.value = true
      console.log('[CONTINUOUS_RECORDING] ✅ Microfone autorizado')
      return true
    } catch (err) {
      console.error('[CONTINUOUS_RECORDING] ❌ Erro ao solicitar permissão do microfone:', err)
      error.value = 'Permissão para microfone negada. Verifique as configurações do navegador.'
      hasPermission.value = false
      return false
    }
  }

  const startContinuousRecording = async () => {
    console.log('[CONTINUOUS_RECORDING] 🎤 Iniciando gravação contínua...')

    if (!stream.value) {
      const permissionGranted = await requestMicrophonePermission()
      if (!permissionGranted) return false
    }

    try {
      mediaRecorder.value = new MediaRecorder(stream.value)
      recordingChunks.value = []
      recordingStartTime.value = Date.now()

      mediaRecorder.value.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunks.value.push(event.data)
        }
      }

      mediaRecorder.value.onstop = () => {
        console.log('[CONTINUOUS_RECORDING] ⏹️ Gravação contínua finalizada')
        const blob = new Blob(recordingChunks.value, { type: 'audio/webm' })
        audioBlob.value = blob
      }

      mediaRecorder.value.start(1000) // Coleta dados a cada segundo para melhor performance
      isRecording.value = true
      isContinuous.value = true
      recordingTime.value = 0

      // Start timer
      timer.value = setInterval(() => {
        recordingTime.value++
      }, 1000)

      console.log('[CONTINUOUS_RECORDING] ✅ Gravação contínua iniciada com sucesso')
      return true

    } catch (err) {
      console.error('[CONTINUOUS_RECORDING] ❌ Erro ao iniciar gravação contínua:', err)
      error.value = 'Erro ao iniciar gravação contínua. Tente novamente.'
      return false
    }
  }

  const stopContinuousRecording = () => {
    console.log('[CONTINUOUS_RECORDING] 🛑 Parando gravação contínua...')

    if (mediaRecorder.value && isRecording.value) {
      mediaRecorder.value.stop()
      isRecording.value = false
      isContinuous.value = false
      clearInterval(timer.value)

      const recordingDuration = Date.now() - recordingStartTime.value
      console.log('[CONTINUOUS_RECORDING] ⏱️ Duração total da gravação:', recordingDuration + 'ms')

      return true
    }
    return false
  }

  const getRecordingBlob = () => {
    if (recordingChunks.value.length === 0) return null

    const blob = new Blob(recordingChunks.value, { type: 'audio/webm' })
    return blob
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const cleanup = () => {
    console.log('[CONTINUOUS_RECORDING] 🧹 Limpando recursos...')

    if (timer.value) {
      clearInterval(timer.value)
    }

    if (mediaRecorder.value && isRecording.value) {
      mediaRecorder.value.stop()
    }

    if (stream.value) {
      stream.value.getTracks().forEach(track => track.stop())
    }

    // Reset state
    isRecording.value = false
    isContinuous.value = false
    recordingChunks.value = []
    audioBlob.value = null
  }

  return {
    // State
    isRecording,
    isContinuous,
    recordingTime,
    audioBlob,
    hasPermission,
    error,

    // Methods
    requestMicrophonePermission,
    startContinuousRecording,
    stopContinuousRecording,
    getRecordingBlob,
    formatTime,
    cleanup
  }
}
