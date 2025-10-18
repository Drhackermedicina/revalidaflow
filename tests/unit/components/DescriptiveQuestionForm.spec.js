import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import DescriptiveQuestionForm from '@/views/admin/DescriptiveQuestionForm.vue'

// Mock Vue Router
const router = createRouter({
  history: createWebHistory(),
  routes: []
})

vi.mock('vue-router', () => ({
  useRouter: () => router
}))

describe('DescriptiveQuestionForm', () => {
  let wrapper

  beforeEach(() => {
    wrapper = mount(DescriptiveQuestionForm, {
      global: {
        plugins: [router]
      }
    })
  })

  describe('estado inicial', () => {
    it('deve ter formulário vazio inicialmente', () => {
      expect(wrapper.vm.form.title).toBe('')
      expect(wrapper.vm.form.specialty).toBe('')
      expect(wrapper.vm.form.year).toBe(new Date().getFullYear())
      expect(wrapper.vm.form.type).toBe('')
      expect(wrapper.vm.form.statement).toBe('')
      expect(wrapper.vm.form.items).toEqual([])
    })

    it('deve adicionar um item vazio ao montar', () => {
      expect(wrapper.vm.form.items).toHaveLength(1)
      expect(wrapper.vm.form.items[0]).toEqual({
        description: '',
        expectedAnswer: '',
        weight: 0
      })
    })
  })

  describe('validação', () => {
    it('deve validar campos obrigatórios', () => {
      const rules = wrapper.vm.rules

      expect(rules.required('')).toBe('Este campo é obrigatório')
      expect(rules.required('test')).toBe(true)
    })

    it('deve validar ano dentro do range', () => {
      const rules = wrapper.vm.rules

      expect(rules.year(2020)).toBe(true)
      expect(rules.year(1999)).toBe('Ano deve estar entre 2000 e 2030')
      expect(rules.year(2031)).toBe('Ano deve estar entre 2000 e 2030')
    })

    it('deve determinar se formulário é válido', () => {
      // Formulário vazio - inválido
      expect(wrapper.vm.isFormValid).toBe(false)

      // Preencher campos obrigatórios
      wrapper.vm.form.title = 'Título da Questão'
      wrapper.vm.form.specialty = 'Clínica Médica'
      wrapper.vm.form.year = 2024
      wrapper.vm.form.type = 'PEP'
      wrapper.vm.form.statement = 'Enunciado da questão'
      wrapper.vm.form.items[0].description = 'Descrição do item'
      wrapper.vm.form.items[0].expectedAnswer = 'Resposta esperada'

      expect(wrapper.vm.isFormValid).toBe(true)
    })
  })

  describe('gerenciamento de itens', () => {
    it('deve adicionar novo item', () => {
      const initialLength = wrapper.vm.form.items.length

      wrapper.vm.addItem()

      expect(wrapper.vm.form.items).toHaveLength(initialLength + 1)
      expect(wrapper.vm.form.items[wrapper.vm.form.items.length - 1]).toEqual({
        description: '',
        expectedAnswer: '',
        weight: 0
      })
    })

    it('deve remover item', () => {
      wrapper.vm.addItem() // Agora tem 2 itens
      expect(wrapper.vm.form.items).toHaveLength(2)

      wrapper.vm.removeItem(0)

      expect(wrapper.vm.form.items).toHaveLength(1)
    })

    it('não deve remover o último item', () => {
      wrapper.vm.form.items = [{
        description: 'Único item',
        expectedAnswer: 'Resposta',
        weight: 5
      }]

      wrapper.vm.removeItem(0)

      expect(wrapper.vm.form.items).toHaveLength(1)
    })
  })

  describe('resetForm', () => {
    it('deve limpar formulário', () => {
      // Preencher formulário
      wrapper.vm.form.title = 'Título'
      wrapper.vm.form.specialty = 'Cardiologia'
      wrapper.vm.form.items.push({
        description: 'Item extra',
        expectedAnswer: 'Resposta extra',
        weight: 10
      })

      wrapper.vm.resetForm()

      expect(wrapper.vm.form.title).toBe('')
      expect(wrapper.vm.form.specialty).toBe('')
      expect(wrapper.vm.form.items).toHaveLength(1) // Um item vazio
      expect(wrapper.vm.form.items[0]).toEqual({
        description: '',
        expectedAnswer: '',
        weight: 0
      })
    })
  })

  describe('handleSubmit', () => {
    let createQuestionMock

    beforeEach(() => {
      createQuestionMock = vi.fn().mockResolvedValue({ id: '123' })
      wrapper.vm.createQuestion = createQuestionMock
    })

    it('deve submeter formulário válido com sucesso', async () => {
      // Preencher formulário
      wrapper.vm.form.title = 'Questão de Teste'
      wrapper.vm.form.specialty = 'Clínica Médica'
      wrapper.vm.form.year = 2024
      wrapper.vm.form.type = 'PEP'
      wrapper.vm.form.statement = 'Enunciado completo'
      wrapper.vm.form.items[0] = {
        description: 'Descrição do critério',
        expectedAnswer: 'Resposta esperada detalhada',
        weight: 5
      }

      // Mock form validation
      wrapper.vm.formRef = { validate: vi.fn().mockReturnValue(true) }

      await wrapper.vm.handleSubmit()

      expect(createQuestionMock).toHaveBeenCalledWith({
        title: 'Questão de Teste',
        specialty: 'Clínica Médica',
        year: 2024,
        type: 'PEP',
        statement: 'Enunciado completo',
        items: [{
          description: 'Descrição do critério',
          expectedAnswer: 'Resposta esperada detalhada',
          weight: 5
        }]
      })

      expect(wrapper.vm.success).toBe('Questão criada com sucesso!')
    })

    it('não deve submeter formulário inválido', async () => {
      wrapper.vm.form.title = '' // Campo obrigatório vazio
      wrapper.vm.formRef = { validate: vi.fn().mockReturnValue(false) }

      await wrapper.vm.handleSubmit()

      expect(createQuestionMock).not.toHaveBeenCalled()
    })

    it('deve resetar formulário após sucesso', async () => {
      wrapper.vm.form.title = 'Título'
      wrapper.vm.form.specialty = 'Cardiologia'
      wrapper.vm.form.statement = 'Enunciado'
      wrapper.vm.form.items[0].description = 'Descrição'
      wrapper.vm.form.items[0].expectedAnswer = 'Resposta'

      wrapper.vm.formRef = { validate: vi.fn().mockReturnValue(true) }

      await wrapper.vm.handleSubmit()

      expect(wrapper.vm.form.title).toBe('')
      expect(wrapper.vm.form.specialty).toBe('')
    })

    it('deve definir erro quando submissão falha', async () => {
      const error = new Error('Submission failed')
      createQuestionMock.mockRejectedValue(error)

      wrapper.vm.form.title = 'Título'
      wrapper.vm.form.specialty = 'Cardiologia'
      wrapper.vm.form.statement = 'Enunciado'
      wrapper.vm.form.items[0].description = 'Descrição'
      wrapper.vm.form.items[0].expectedAnswer = 'Resposta'

      wrapper.vm.formRef = { validate: vi.fn().mockReturnValue(true) }

      await wrapper.vm.handleSubmit()

      expect(wrapper.vm.error).toBe('Erro ao criar questão. Tente novamente.')
    })
  })

  describe('goBack', () => {
    it('deve navegar para trás', () => {
      const goSpy = vi.spyOn(router, 'go')

      wrapper.vm.goBack()

      expect(goSpy).toHaveBeenCalledWith(-1)
    })
  })

  describe('opções de formulário', () => {
    it('deve ter opções de especialidade corretas', () => {
      expect(wrapper.vm.specialtyOptions).toContain('Clínica Médica')
      expect(wrapper.vm.specialtyOptions).toContain('Cardiologia')
      expect(wrapper.vm.specialtyOptions).toContain('Pediatria')
    })

    it('deve ter opções de tipo corretas', () => {
      expect(wrapper.vm.typeOptions).toEqual(['PEP', 'TEP', 'MAP', 'Outros'])
    })
  })

  describe('renderização', () => {
    it('deve renderizar título da página', () => {
      const title = wrapper.find('h1')
      expect(title.text()).toBe('Criar Nova Questão Descritiva')
    })

    it('deve renderizar botão de voltar', () => {
      const backBtn = wrapper.findAllComponents({ name: 'VBtn' }).find(btn =>
        btn.text().includes('Voltar')
      )
      expect(backBtn).toBeDefined()
    })

    it('deve renderizar campos do formulário', () => {
      expect(wrapper.findComponent({ name: 'VForm' })).toBeDefined()
      expect(wrapper.findAllComponents({ name: 'VTextField' })).toBeDefined()
      expect(wrapper.findAllComponents({ name: 'VSelect' })).toBeDefined()
      expect(wrapper.findComponent({ name: 'VTextarea' })).toBeDefined()
    })

    it('deve mostrar mensagem de sucesso quando houver', async () => {
      wrapper.vm.success = 'Questão criada com sucesso!'

      await wrapper.vm.$nextTick()

      const alert = wrapper.findComponent({ name: 'VAlert' }).filter(alert =>
        alert.classes().includes('success')
      )
      expect(alert.exists()).toBe(true)
      expect(alert.text()).toContain('Questão criada com sucesso!')
    })

    it('deve mostrar mensagem de erro quando houver', async () => {
      wrapper.vm.error = 'Erro ao criar questão'

      await wrapper.vm.$nextTick()

      const alert = wrapper.findComponent({ name: 'VAlert' }).filter(alert =>
        alert.classes().includes('error')
      )
      expect(alert.exists()).toBe(true)
      expect(alert.text()).toContain('Erro ao criar questão')
    })

    it('deve renderizar seção de itens de avaliação', () => {
      const sectionTitle = wrapper.findAll('h6').find(h6 =>
        h6.text().includes('Itens de Avaliação')
      )
      expect(sectionTitle).toBeDefined()
    })

    it('deve mostrar botão adicionar item', () => {
      const addBtn = wrapper.findAllComponents({ name: 'VBtn' }).find(btn =>
        btn.text().includes('Adicionar Item')
      )
      expect(addBtn).toBeDefined()
    })

    it('deve renderizar botões de ação', () => {
      const submitBtn = wrapper.findAllComponents({ name: 'VBtn' }).find(btn =>
        btn.text().includes('Criar Questão')
      )
      expect(submitBtn).toBeDefined()

      const clearBtn = wrapper.findAllComponents({ name: 'VBtn' }).find(btn =>
        btn.text().includes('Limpar Formulário')
      )
      expect(clearBtn).toBeDefined()
    })

    it('deve mostrar mensagem quando não há itens', () => {
      wrapper.vm.form.items = []

      expect(wrapper.text()).toContain('Nenhum item adicionado ainda')
    })

    it('deve renderizar cartões de item quando houver itens', () => {
      expect(wrapper.findAll('.item-card')).toBeDefined()
    })
  })
})