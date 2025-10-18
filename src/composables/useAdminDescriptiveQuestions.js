import { ref } from 'vue'
import axios from 'axios'

export const useAdminDescriptiveQuestions = () => {
  const loading = ref(false)
  const error = ref('')
  const success = ref('')

  const createQuestion = async (questionData) => {
    loading.value = true
    error.value = ''
    success.value = ''

    try {
      const response = await axios.post('/api/admin/descriptive-questions', questionData)
      success.value = 'Questão criada com sucesso!'
      return response.data
    } catch (err) {
      console.error('Erro ao criar questão descritiva:', err)
      if (err.response?.status === 400) {
        error.value = err.response.data.message || 'Dados inválidos'
      } else if (err.response?.status === 403) {
        error.value = 'Acesso negado. Apenas administradores podem criar questões.'
      } else if (err.response?.status === 401) {
        error.value = 'Você precisa estar logado para criar questões.'
      } else {
        error.value = 'Erro ao criar questão. Tente novamente.'
      }
      throw err
    } finally {
      loading.value = false
    }
  }

  const clearMessages = () => {
    error.value = ''
    success.value = ''
  }

  return {
    loading,
    error,
    success,
    createQuestion,
    clearMessages
  }
}