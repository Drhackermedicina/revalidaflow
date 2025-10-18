import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios from 'axios'
import { useDescriptiveEvaluation } from '@/composables/useDescriptiveEvaluation'

// Mock axios
vi.mock('axios')

describe('useDescriptiveEvaluation', () => {
  let composable

  beforeEach(() => {
    vi.clearAllMocks()
    composable = useDescriptiveEvaluation()
  })

  describe('evaluateAnswer', () => {
    it('deve enviar áudio e receber feedback com sucesso', async () => {
      const mockFeedback = {
        scoreGeral: 8,
        transcricao: 'Transcrição da resposta',
        analiseCriterios: [
          {
            titulo: 'Critério 1',
            pontuacao: 8,
            comentario: 'Comentário do critério'
          }
        ],
        resumoGeral: 'Resumo do feedback'
      }

      const audioBlob = new Blob(['audio data'], { type: 'audio/webm' })
      axios.post.mockResolvedValue({ data: mockFeedback })

      const result = await composable.evaluateAnswer('1', audioBlob)

      expect(axios.post).toHaveBeenCalledWith(
        '/api/descriptive-questions/1/evaluate',
        expect.any(FormData),
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      )

      expect(composable.feedback.value).toEqual(mockFeedback)
      expect(result).toEqual(mockFeedback)
      expect(composable.loading.value).toBe(false)
      expect(composable.error.value).toBe('')
    })

    it('deve definir erro quando ID da questão não é fornecido', async () => {
      const audioBlob = new Blob(['audio'], { type: 'audio/webm' })

      const result = await composable.evaluateAnswer('', audioBlob)

      expect(result).toBe(null)
      expect(composable.error.value).toBe('ID da questão é obrigatório')
      expect(axios.post).not.toHaveBeenCalled()
    })

    it('deve definir erro quando áudio não é fornecido', async () => {
      const result = await composable.evaluateAnswer('1', null)

      expect(result).toBe(null)
      expect(composable.error.value).toBe('Arquivo de áudio é obrigatório')
      expect(axios.post).not.toHaveBeenCalled()
    })

    it('deve tratar erro 400 como arquivo inválido', async () => {
      const audioBlob = new Blob(['invalid'], { type: 'audio/webm' })
      const error = { response: { status: 400 } }
      axios.post.mockRejectedValue(error)

      const result = await composable.evaluateAnswer('1', audioBlob)

      expect(result).toBe(null)
      expect(composable.error.value).toBe('Arquivo de áudio inválido')
      expect(composable.loading.value).toBe(false)
    })

    it('deve tratar erro 404 como questão não encontrada', async () => {
      const audioBlob = new Blob(['audio'], { type: 'audio/webm' })
      const error = { response: { status: 404 } }
      axios.post.mockRejectedValue(error)

      const result = await composable.evaluateAnswer('999', audioBlob)

      expect(result).toBe(null)
      expect(composable.error.value).toBe('Questão não encontrada')
    })

    it('deve tratar erro 500 como erro interno', async () => {
      const audioBlob = new Blob(['audio'], { type: 'audio/webm' })
      const error = { response: { status: 500 } }
      axios.post.mockRejectedValue(error)

      const result = await composable.evaluateAnswer('1', audioBlob)

      expect(result).toBe(null)
      expect(composable.error.value).toBe('Erro interno do servidor. Tente novamente.')
    })

    it('deve tratar erro genérico', async () => {
      const audioBlob = new Blob(['audio'], { type: 'audio/webm' })
      const error = new Error('Network error')
      axios.post.mockRejectedValue(error)

      const result = await composable.evaluateAnswer('1', audioBlob)

      expect(result).toBe(null)
      expect(composable.error.value).toBe('Erro ao enviar áudio para avaliação. Tente novamente.')
    })

    it('deve definir loading corretamente durante a requisição', async () => {
      const audioBlob = new Blob(['audio'], { type: 'audio/webm' })
      const mockFeedback = { scoreGeral: 7 }
      axios.post.mockResolvedValue({ data: mockFeedback })

      const promise = composable.evaluateAnswer('1', audioBlob)

      expect(composable.loading.value).toBe(true)
      expect(composable.error.value).toBe('')
      expect(composable.feedback.value).toBe(null)

      await promise

      expect(composable.loading.value).toBe(false)
    })

    it('deve criar FormData corretamente com o áudio', async () => {
      const audioBlob = new Blob(['test audio'], { type: 'audio/webm' })
      const mockFeedback = { scoreGeral: 9 }
      axios.post.mockResolvedValue({ data: mockFeedback })

      await composable.evaluateAnswer('1', audioBlob)

      expect(axios.post).toHaveBeenCalledWith(
        '/api/descriptive-questions/1/evaluate',
        expect.any(FormData),
        expect.any(Object)
      )

      // Verificar se FormData foi criado corretamente
      const formDataCall = axios.post.mock.calls[0][1]
      expect(formDataCall).toBeInstanceOf(FormData)
    })
  })

  describe('reset', () => {
    it('deve resetar o estado', () => {
      composable.loading.value = true
      composable.error.value = 'Erro'
      composable.feedback.value = { scoreGeral: 5 }

      composable.reset()

      expect(composable.loading.value).toBe(false)
      expect(composable.error.value).toBe('')
      expect(composable.feedback.value).toBe(null)
    })
  })

  describe('estado inicial', () => {
    it('deve ter estado inicial correto', () => {
      expect(composable.loading.value).toBe(false)
      expect(composable.error.value).toBe('')
      expect(composable.feedback.value).toBe(null)
    })
  })
})