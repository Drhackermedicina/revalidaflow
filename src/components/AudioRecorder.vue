<template>
  <div class="audio-recorder">
    <!-- Recording Controls -->
    <div class="recording-controls mb-4">
      <VBtn
        :color="isRecording ? 'error' : 'primary'"
        :variant="isRecording ? 'tonal' : 'flat'"
        size="large"
        @click="toggleRecording"
        :disabled="isPlayingPreview"
        class="record-btn"
      >
        <VIcon
          :icon="isRecording ? 'ri-stop-circle-line' : 'ri-mic-line'"
          size="24"
          class="me-2"
          :class="{ 'pulse': isRecording }"
        />
        {{ isRecording ? 'Parar Gravação' : 'Iniciar Gravação' }}
      </VBtn>

      <!-- Timer -->
      <div v-if="isRecording" class="timer mt-2">
        <VChip color="error" variant="tonal" size="small">
          <VIcon icon="ri-time-line" class="me-1" />
          {{ formatTime(recordingTime) }}
        </VChip>
      </div>
    </div>

    <!-- Audio Preview -->
    <div v-if="audioBlob && !isRecording" class="audio-preview mb-4">
      <VCard variant="outlined" class="pa-4">
        <VCardTitle class="pa-0 mb-3">
          <VIcon icon="ri-play-circle-line" class="me-2" />
          Prévia da Gravação
        </VCardTitle>

        <div class="preview-controls d-flex align-center gap-3">
          <VBtn
            icon="ri-play-line"
            size="small"
            variant="outlined"
            @click="playPreview"
            :disabled="isPlayingPreview"
          />
          <VBtn
            icon="ri-pause-line"
            size="small"
            variant="outlined"
            @click="pausePreview"
            :disabled="!isPlayingPreview"
          />
          <VBtn
            icon="ri-stop-line"
            size="small"
            variant="outlined"
            @click="stopPreview"
            :disabled="!audioElement"
          />

          <div class="progress-container flex-grow-1">
            <VProgressLinear
              v-model="previewProgress"
              color="primary"
              height="8"
              rounded
              @click="seekPreview"
            />
          </div>

          <span class="text-caption">{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</span>
        </div>
      </VCard>
    </div>

    <!-- Submit Button -->
    <div v-if="audioBlob && !isRecording" class="submit-section">
      <VBtn
        color="success"
        size="large"
        @click="submitRecording"
        :loading="isSubmitting"
        :disabled="isPlayingPreview"
      >
        <VIcon icon="ri-send-plane-line" class="me-2" />
        Enviar Resposta
      </VBtn>
    </div>

    <!-- Error Message -->
    <VAlert
      v-if="error"
      type="error"
      variant="tonal"
      class="mt-4"
      closable
      @click:close="error = ''"
    >
      {{ error }}
    </VAlert>

    <!-- Permission Notice -->
    <VAlert
      v-if="!hasPermission && !error"
      type="info"
      variant="tonal"
      class="mt-4"
    >
      <VIcon icon="ri-information-line" class="me-2" />
      Permita o acesso ao microfone para gravar sua resposta.
    </VAlert>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  onSubmit: {
    type: Function,
    required: true
  }
})

const emit = defineEmits(['submit'])

const isRecording = ref(false)
const recordingTime = ref(0)
const audioBlob = ref(null)
const mediaRecorder = ref(null)
const stream = ref(null)
const timer = ref(null)
const hasPermission = ref(false)
const error = ref('')
const isSubmitting = ref(false)

// Preview controls
const audioElement = ref(null)
const isPlayingPreview = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const previewProgress = ref(0)

onMounted(() => {
  requestMicrophonePermission()
})

onUnmounted(() => {
  cleanup()
})

const requestMicrophonePermission = async () => {
  try {
    const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    stream.value = mediaStream
    hasPermission.value = true
  } catch (err) {
    console.error('Erro ao solicitar permissão do microfone:', err)
    error.value = 'Permissão para microfone negada. Verifique as configurações do navegador.'
    hasPermission.value = false
  }
}

const toggleRecording = async () => {
  if (isRecording.value) {
    stopRecording()
  } else {
    await startRecording()
  }
}

const startRecording = async () => {
  if (!stream.value) {
    await requestMicrophonePermission()
    if (!stream.value) return
  }

  try {
    mediaRecorder.value = new MediaRecorder(stream.value)
    const chunks = []

    mediaRecorder.value.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data)
      }
    }

    mediaRecorder.value.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/webm' })
      audioBlob.value = blob
      createAudioElement(blob)
    }

    mediaRecorder.value.start()
    isRecording.value = true
    recordingTime.value = 0

    // Start timer
    timer.value = setInterval(() => {
      recordingTime.value++
    }, 1000)

  } catch (err) {
    console.error('Erro ao iniciar gravação:', err)
    error.value = 'Erro ao iniciar gravação. Tente novamente.'
  }
}

const stopRecording = () => {
  if (mediaRecorder.value && isRecording.value) {
    mediaRecorder.value.stop()
    isRecording.value = false
    clearInterval(timer.value)
  }
}

const createAudioElement = (blob) => {
  if (audioElement.value) {
    audioElement.value.pause()
    URL.revokeObjectURL(audioElement.value.src)
  }

  const url = URL.createObjectURL(blob)
  audioElement.value = new Audio(url)

  audioElement.value.addEventListener('loadedmetadata', () => {
    duration.value = audioElement.value.duration
  })

  audioElement.value.addEventListener('timeupdate', () => {
    currentTime.value = audioElement.value.currentTime
    previewProgress.value = (currentTime.value / duration.value) * 100
  })

  audioElement.value.addEventListener('ended', () => {
    isPlayingPreview.value = false
    currentTime.value = 0
    previewProgress.value = 0
  })
}

const playPreview = () => {
  if (audioElement.value) {
    audioElement.value.play()
    isPlayingPreview.value = true
  }
}

const pausePreview = () => {
  if (audioElement.value) {
    audioElement.value.pause()
    isPlayingPreview.value = false
  }
}

const stopPreview = () => {
  if (audioElement.value) {
    audioElement.value.pause()
    audioElement.value.currentTime = 0
    isPlayingPreview.value = false
    currentTime.value = 0
    previewProgress.value = 0
  }
}

const seekPreview = (event) => {
  if (audioElement.value && duration.value) {
    const rect = event.target.getBoundingClientRect()
    const clickX = event.clientX - rect.left
    const percentage = clickX / rect.width
    const newTime = percentage * duration.value

    audioElement.value.currentTime = newTime
    currentTime.value = newTime
    previewProgress.value = percentage * 100
  }
}

const submitRecording = async () => {
  if (!audioBlob.value) return

  isSubmitting.value = true
  try {
    await props.onSubmit(audioBlob.value)
    emit('submit', audioBlob.value)
  } catch (err) {
    console.error('Erro ao enviar gravação:', err)
    error.value = 'Erro ao enviar gravação. Tente novamente.'
  } finally {
    isSubmitting.value = false
  }
}

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const cleanup = () => {
  if (timer.value) {
    clearInterval(timer.value)
  }

  if (mediaRecorder.value && isRecording.value) {
    mediaRecorder.value.stop()
  }

  if (stream.value) {
    stream.value.getTracks().forEach(track => track.stop())
  }

  if (audioElement.value) {
    audioElement.value.pause()
    URL.revokeObjectURL(audioElement.value.src)
  }
}
</script>

<style scoped>
.audio-recorder {
  max-width: 600px;
}

.record-btn {
  min-width: 200px;
}

.pulse {
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.timer {
  display: flex;
  justify-content: center;
}

.audio-preview {
  border-radius: 8px;
}

.preview-controls {
  align-items: center;
}

.progress-container {
  cursor: pointer;
}
</style>