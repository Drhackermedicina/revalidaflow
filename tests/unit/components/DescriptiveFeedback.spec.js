import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DescriptiveFeedback from '@/components/DescriptiveFeedback.vue'

describe('DescriptiveFeedback', () => {
  describe('renderização com dados estruturados', () => {
    const mockFeedback = {
      scoreGeral: 8,
      transcricao: 'Esta é a transcrição da resposta do usuário.',
      analiseCriterios: [
        {
          titulo: 'Clareza',
          pontuacao: 8,
          comentario: 'A resposta foi clara e objetiva.'
        },
        {
          titulo: 'Precisão',
          pontuacao: 7,
          comentario: 'Conteúdo preciso, mas poderia ser mais detalhado.'
        }
      ],
      resumoGeral: 'Resposta adequada com pontos positivos e áreas de melhoria.'
    }

    it('deve renderizar score geral corretamente', () => {
      const wrapper = mount(DescriptiveFeedback, {
        props: {
          feedback: mockFeedback
        }
      })

      const scoreElement = wrapper.find('.score-number')
      expect(scoreElement.text()).toBe('8/10')
    })

    it('deve renderizar transcrição', () => {
      const wrapper = mount(DescriptiveFeedback, {
        props: {
          feedback: mockFeedback
        }
      })

      const transcriptionElement = wrapper.find('.transcription-text')
      expect(transcriptionElement.exists()).toBe(true)
      expect(transcriptionElement.html()).toContain('Esta é a transcrição da resposta do usuário.')
    })

    it('deve renderizar análise por critérios', () => {
      const wrapper = mount(DescriptiveFeedback, {
        props: {
          feedback: mockFeedback
        }
      })

      const criterioCards = wrapper.findAll('.criterio-card')
      expect(criterioCards.length).toBe(2)

      const firstCriterio = criterioCards[0]
      expect(firstCriterio.text()).toContain('Clareza')
      expect(firstCriterio.text()).toContain('8/10')
      expect(firstCriterio.text()).toContain('A resposta foi clara e objetiva.')
    })

    it('deve renderizar resumo geral', () => {
      const wrapper = mount(DescriptiveFeedback, {
        props: {
          feedback: mockFeedback
        }
      })

      const resumoElement = wrapper.find('.resumo-text')
      expect(resumoElement.exists()).toBe(true)
      expect(resumoElement.html()).toContain('Resposta adequada com pontos positivos e áreas de melhoria.')
    })

    it('deve aplicar cores corretas baseadas na pontuação', () => {
      const wrapper = mount(DescriptiveFeedback, {
        props: {
          feedback: mockFeedback
        }
      })

      const chips = wrapper.findAllComponents({ name: 'VChip' })
      const scoreChips = chips.filter(chip => chip.text().includes('/10'))

      expect(scoreChips[0].props('color')).toBe('success') // 8 = success
      expect(scoreChips[1].props('color')).toBe('warning') // 7 = warning
    })
  })

  describe('renderização com dados não estruturados (string)', () => {
    const stringFeedback = `
      Score Geral: 7/10

      Pontos Fortes:
      - Resposta bem estruturada
      - Demonstrou conhecimento adequado

      Pontos a Melhorar:
      - Faltou profundidade em alguns aspectos
      - Poderia ser mais específico

      Desafio de Feynman: Adequado
    `

    it('deve parsear e renderizar string de feedback', () => {
      const wrapper = mount(DescriptiveFeedback, {
        props: {
          feedback: stringFeedback
        }
      })

      const scoreElement = wrapper.find('.score-number')
      expect(scoreElement.text()).toBe('7/10')

      const resumoElement = wrapper.find('.resumo-text')
      expect(resumoElement.exists()).toBe(true)
      expect(resumoElement.html()).toContain('Pontos Fortes')
      expect(resumoElement.html()).toContain('Pontos a Melhorar')
    })
  })

  describe('renderização com dados vazios ou inválidos', () => {
    it('deve renderizar score padrão quando não fornecido', () => {
      const wrapper = mount(DescriptiveFeedback, {
        props: {
          feedback: {}
        }
      })

      const scoreElement = wrapper.find('.score-number')
      expect(scoreElement.text()).toBe('0/10')
    })

    it('deve mostrar mensagem quando análise de critérios não disponível', () => {
      const wrapper = mount(DescriptiveFeedback, {
        props: {
          feedback: {
            scoreGeral: 5,
            analiseCriterios: []
          }
        }
      })

      const emptyMessage = wrapper.find('.text-medium-emphasis')
      expect(emptyMessage.text()).toContain('Análise detalhada não disponível')
    })

    it('deve lidar com feedback null', () => {
      const wrapper = mount(DescriptiveFeedback, {
        props: {
          feedback: null
        }
      })

      const scoreElement = wrapper.find('.score-number')
      expect(scoreElement.text()).toBe('0/10')
    })
  })

  describe('formatText', () => {
    it('deve converter quebras de linha em <br>', () => {
      const wrapper = mount(DescriptiveFeedback, {
        props: {
          feedback: {
            transcricao: 'Linha 1\nLinha 2\nLinha 3'
          }
        }
      })

      const transcriptionElement = wrapper.find('.transcription-text')
      expect(transcriptionElement.html()).toContain('Linha 1<br>Linha 2<br>Linha 3')
    })

    it('deve retornar string vazia para texto null', () => {
      const wrapper = mount(DescriptiveFeedback, {
        props: {
          feedback: {
            transcricao: null
          }
        }
      })

      const transcriptionElement = wrapper.find('.transcription-text')
      expect(transcriptionElement.html()).toContain('')
    })
  })

  describe('getScoreColor', () => {
    it('deve retornar success para pontuação >= 8', () => {
      const wrapper = mount(DescriptiveFeedback, {
        props: {
          feedback: {
            analiseCriterios: [{ pontuacao: 9 }]
          }
        }
      })

      // Acessar método diretamente
      expect(wrapper.vm.getScoreColor(9)).toBe('success')
      expect(wrapper.vm.getScoreColor(8)).toBe('success')
    })

    it('deve retornar warning para pontuação >= 6', () => {
      const wrapper = mount(DescriptiveFeedback, {
        props: {
          feedback: {}
        }
      })

      expect(wrapper.vm.getScoreColor(7)).toBe('warning')
      expect(wrapper.vm.getScoreColor(6)).toBe('warning')
    })

    it('deve retornar error para pontuação < 6', () => {
      const wrapper = mount(DescriptiveFeedback, {
        props: {
          feedback: {}
        }
      })

      expect(wrapper.vm.getScoreColor(5)).toBe('error')
      expect(wrapper.vm.getScoreColor(0)).toBe('error')
    })
  })

  describe('parsedFeedback computed', () => {
    it('deve retornar objeto diretamente se feedback for objeto', () => {
      const feedbackObj = { scoreGeral: 8 }
      const wrapper = mount(DescriptiveFeedback, {
        props: {
          feedback: feedbackObj
        }
      })

      expect(wrapper.vm.parsedFeedback).toEqual(feedbackObj)
    })

    it('deve parsear JSON string válido', () => {
      const feedbackJson = '{"scoreGeral": 7, "transcricao": "Teste"}'
      const wrapper = mount(DescriptiveFeedback, {
        props: {
          feedback: feedbackJson
        }
      })

      expect(wrapper.vm.parsedFeedback).toEqual({
        scoreGeral: 7,
        transcricao: 'Teste'
      })
    })

    it('deve usar parser customizado para string não-JSON', () => {
      const feedbackString = 'Score Geral: 6/10\nAlgum comentário'
      const wrapper = mount(DescriptiveFeedback, {
        props: {
          feedback: feedbackString
        }
      })

      expect(wrapper.vm.parsedFeedback.scoreGeral).toBe(6)
      expect(wrapper.vm.parsedFeedback.resumoGeral).toContain('Algum comentário')
    })
  })

  describe('parseFeedbackString', () => {
    it('deve extrair score de string estruturada', () => {
      const wrapper = mount(DescriptiveFeedback, {
        props: {
          feedback: {}
        }
      })

      const result = wrapper.vm.parseFeedbackString('Score Geral: 8/10\nOutro texto')

      expect(result.scoreGeral).toBe(8)
      expect(result.resumoGeral).toContain('Outro texto')
    })

    it('deve retornar objeto vazio para string vazia', () => {
      const wrapper = mount(DescriptiveFeedback, {
        props: {
          feedback: {}
        }
      })

      const result = wrapper.vm.parseFeedbackString('')

      expect(result.scoreGeral).toBe(null)
      expect(result.transcricao).toBe('')
      expect(result.analiseCriterios).toEqual([])
      expect(result.resumoGeral).toBe('')
    })
  })
})
