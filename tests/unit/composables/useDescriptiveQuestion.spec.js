import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios from 'axios'
import { useDescriptiveQuestion } from '@/composables/useDescriptiveQuestion'

// Mock axios
vi.mock('axios')

describe('useDescriptiveQuestion', () => {
  let composable

  beforeEach(() => {
    vi.clearAllMocks()
    composable = useDescriptiveQuestion()
  })

  describe('fetchQuestion', () => {
    it('deve buscar uma questão com sucesso', async () => {
      const mockQuestion = {
        id: '1',
        titulo: 'Questão de Teste',
        enunciado: 'Enunciado da questão',
        especialidade: 'Clínica Médica',
        ano: 2024,
        tipo: 'PEP',
        itens: [
          {
            id: '1-1',
            descricao: 'Descrição do item',
            peso: 5
          }
        ]
      }

      axios.get.mockResolvedValue({ data: mockQuestion })

      await composable.fetchQuestion('1')

      expect(axios.get).toHaveBeenCalledWith('/api/descriptive-questions/1')
      expect(composable.question.value).toEqual(mockQuestion)
      expect(composable.loading.value).toBe(false)
      expect(composable.error.value).toBe('')
    })

    it('deve definir erro quando ID não é fornecido', async () => {
      await composable.fetchQuestion('')

      expect(composable.error.value).toBe('ID da questão é obrigatório')
      expect(composable.question.value).toBe(null)
      expect(axios.get).not.toHaveBeenCalled()
    })

    it('deve tratar erro 404 como questão não encontrada', async () => {
      const error = { response: { status: 404 } }
      axios.get.mockRejectedValue(error)

      await composable.fetchQuestion('999')

      expect(composable.error.value).toBe('Questão não encontrada')
      expect(composable.question.value).toBe(null)
      expect(composable.loading.value).toBe(false)
    })

    it('deve tratar erro genérico', async () => {
      const error = { response: { status: 500 } }
      axios.get.mockRejectedValue(error)

      await composable.fetchQuestion('1')

      expect(composable.error.value).toBe('Erro ao carregar a questão. Tente novamente.')
      expect(composable.question.value).toBe(null)
      expect(composable.loading.value).toBe(false)
    })

    it('deve definir loading corretamente durante a requisição', async () => {
      const mockQuestion = { id: '1', titulo: 'Teste' }
      axios.get.mockResolvedValue({ data: mockQuestion })

      const promise = composable.fetchQuestion('1')

      expect(composable.loading.value).toBe(true)
      expect(composable.error.value).toBe('')

      await promise

      expect(composable.loading.value).toBe(false)
    })
  })

  describe('estado inicial', () => {
    it('deve ter estado inicial correto', () => {
      expect(composable.loading.value).toBe(false)
      expect(composable.error.value).toBe('')
      expect(composable.question.value).toBe(null)
    })
  })
})