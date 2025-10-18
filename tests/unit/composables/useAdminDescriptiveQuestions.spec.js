import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios from 'axios'
import { useAdminDescriptiveQuestions } from '@/composables/useAdminDescriptiveQuestions'

// Mock axios
vi.mock('axios')

describe('useAdminDescriptiveQuestions', () => {
  let composable

  beforeEach(() => {
    vi.clearAllMocks()
    composable = useAdminDescriptiveQuestions()
  })

  describe('createQuestion', () => {
    it('deve criar uma questão com sucesso', async () => {
      const questionData = {
        title: 'Nova Questão',
        specialty: 'Clínica Médica',
        year: 2024,
        type: 'PEP',
        statement: 'Enunciado da questão',
        items: [
          {
            description: 'Descrição do item',
            expectedAnswer: 'Resposta esperada',
            weight: 5
          }
        ]
      }

      const mockResponse = { id: '123', ...questionData }
      axios.post.mockResolvedValue({ data: mockResponse })

      const result = await composable.createQuestion(questionData)

      expect(axios.post).toHaveBeenCalledWith('/api/admin/descriptive-questions', questionData)
      expect(result).toEqual(mockResponse)
      expect(composable.success.value).toBe('Questão criada com sucesso!')
      expect(composable.loading.value).toBe(false)
      expect(composable.error.value).toBe('')
    })

    it('deve tratar erro 400 como dados inválidos', async () => {
      const questionData = { title: '' }
      const error = {
        response: {
          status: 400,
          data: { message: 'Título é obrigatório' }
        }
      }
      axios.post.mockRejectedValue(error)

      try {
        await composable.createQuestion(questionData)
      } catch (err) {
        // Expected
      }

      expect(composable.error.value).toBe('Título é obrigatório')
      expect(composable.success.value).toBe('')
      expect(composable.loading.value).toBe(false)
    })

    it('deve tratar erro 403 como acesso negado', async () => {
      const questionData = { title: 'Teste' }
      const error = { response: { status: 403 } }
      axios.post.mockRejectedValue(error)

      try {
        await composable.createQuestion(questionData)
      } catch (err) {
        // Expected
      }

      expect(composable.error.value).toBe('Acesso negado. Apenas administradores podem criar questões.')
    })

    it('deve tratar erro 401 como não logado', async () => {
      const questionData = { title: 'Teste' }
      const error = { response: { status: 401 } }
      axios.post.mockRejectedValue(error)

      try {
        await composable.createQuestion(questionData)
      } catch (err) {
        // Expected
      }

      expect(composable.error.value).toBe('Você precisa estar logado para criar questões.')
    })

    it('deve tratar erro genérico', async () => {
      const questionData = { title: 'Teste' }
      const error = { response: { status: 500 } }
      axios.post.mockRejectedValue(error)

      try {
        await composable.createQuestion(questionData)
      } catch (err) {
        // Expected
      }

      expect(composable.error.value).toBe('Erro ao criar questão. Tente novamente.')
    })

    it('deve definir loading corretamente durante a requisição', async () => {
      const questionData = { title: 'Teste' }
      const mockResponse = { id: '123' }
      axios.post.mockResolvedValue({ data: mockResponse })

      const promise = composable.createQuestion(questionData)

      expect(composable.loading.value).toBe(true)
      expect(composable.error.value).toBe('')
      expect(composable.success.value).toBe('')

      await promise

      expect(composable.loading.value).toBe(false)
    })

    it('deve lançar erro quando falha', async () => {
      const questionData = { title: 'Teste' }
      const error = new Error('Network error')
      axios.post.mockRejectedValue(error)

      await expect(composable.createQuestion(questionData)).rejects.toThrow('Network error')
    })
  })

  describe('clearMessages', () => {
    it('deve limpar mensagens de erro e sucesso', () => {
      composable.error.value = 'Erro'
      composable.success.value = 'Sucesso'

      composable.clearMessages()

      expect(composable.error.value).toBe('')
      expect(composable.success.value).toBe('')
    })
  })

  describe('estado inicial', () => {
    it('deve ter estado inicial correto', () => {
      expect(composable.loading.value).toBe(false)
      expect(composable.error.value).toBe('')
      expect(composable.success.value).toBe('')
    })
  })
})