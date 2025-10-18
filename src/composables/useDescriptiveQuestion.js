import { ref } from 'vue'
import axios from 'axios'

export const useDescriptiveQuestion = () => {
  const loading = ref(false)
  const error = ref('')
  const question = ref(null)

  const fetchQuestion = async (id) => {
    if (!id) {
      error.value = 'ID da questão é obrigatório'
      return
    }

    loading.value = true
    error.value = ''

    try {
      const response = await axios.get(`/api/descriptive-questions/${id}`)
      question.value = response.data
    } catch (err) {
      console.error('Erro ao buscar questão descritiva:', err)
      if (err.response?.status === 404) {
        error.value = 'Questão não encontrada'
      } else {
        error.value = 'Erro ao carregar a questão. Tente novamente.'
      }
      question.value = null
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    question,
    fetchQuestion
  }
}