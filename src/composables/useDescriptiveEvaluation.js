import { ref } from 'vue'
import axios from 'axios'

export const useDescriptiveEvaluation = () => {
  const loading = ref(false)
  const error = ref('')
  const feedback = ref(null)

  const evaluateAnswer = async (questionId, audioBlob) => {
    if (!questionId) {
      error.value = 'ID da questão é obrigatório'
      return null
    }

    if (!audioBlob) {
      error.value = 'Arquivo de áudio é obrigatório'
      return null
    }

    loading.value = true
    error.value = ''
    feedback.value = null

    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')

      const response = await axios.post(`/api/descriptive-questions/${questionId}/evaluate`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      feedback.value = response.data
      return response.data
    } catch (err) {
      console.error('Erro ao avaliar resposta descritiva:', err)
      if (err.response?.status === 400) {
        error.value = 'Arquivo de áudio inválido'
      } else if (err.response?.status === 404) {
        error.value = 'Questão não encontrada'
      } else if (err.response?.status === 500) {
        error.value = 'Erro interno do servidor. Tente novamente.'
      } else {
        error.value = 'Erro ao enviar áudio para avaliação. Tente novamente.'
      }
      return null
    } finally {
      loading.value = false
    }
  }

  const reset = () => {
    loading.value = false
    error.value = ''
    feedback.value = null
  }

  return {
    loading,
    error,
    feedback,
    evaluateAnswer,
    reset
  }
}