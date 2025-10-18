import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import AudioRecorder from '@/components/AudioRecorder.vue'

// Mock navigator.mediaDevices
Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: vi.fn()
  },
  writable: true
})

// Mock MediaRecorder
global.MediaRecorder = vi.fn().mockImplementation(() => ({
  start: vi.fn(),
  stop: vi.fn(),
  ondataavailable: null,
  onstop: null,
  state: 'inactive'
}))

describe('AudioRecorder', () => {
  let wrapper
  let mockStream
  let mockGetUserMedia

  beforeEach(() => {
    // Setup mocks
    mockStream = {
      getTracks: vi.fn().mockReturnValue([
        { stop: vi.fn() }
      ])
    }

    mockGetUserMedia = vi.fn().mockResolvedValue(mockStream)
    navigator.mediaDevices.getUserMedia = mockGetUserMedia

    // Mock URL.createObjectURL and revokeObjectURL
    global.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url')
    global.URL.revokeObjectURL = vi.fn()

    // Mock Audio constructor
    global.Audio = vi.fn().mockImplementation(() => ({
      play: vi.fn().mockResolvedValue(),
      pause: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      currentTime: 0,
      duration: 10,
      src: ''
    }))

    const onSubmit = vi.fn()
    wrapper = mount(AudioRecorder, {
      props: {
        onSubmit
      }
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    wrapper?.unmount()
  })

  describe('montagem inicial', () => {
    it('deve solicitar permissão do microfone ao montar', async () => {
      await wrapper.vm.$nextTick()

      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true })
      expect(wrapper.vm.hasPermission).toBe(true)
    })

    it('deve definir erro se permissão for negada', async () => {
      mockGetUserMedia.mockRejectedValue(new Error('Permission denied'))

      const onSubmit = vi.fn()
      wrapper = mount(AudioRecorder, {
        props: { onSubmit }
      })

      await wrapper.vm.$nextTick()

      expect(wrapper.vm.error).toBe('Permissão para microfone negada. Verifique as configurações do navegador.')
      expect(wrapper.vm.hasPermission).toBe(false)
    })
  })

  describe('toggleRecording', () => {
    it('deve iniciar gravação quando não está gravando', async () => {
      await wrapper.vm.$nextTick() // Aguardar permissão

      await wrapper.vm.toggleRecording()

      expect(wrapper.vm.isRecording).toBe(true)
      expect(MediaRecorder).toHaveBeenCalledWith(mockStream)
    })

    it('deve parar gravação quando está gravando', async () => {
      await wrapper.vm.$nextTick()
      wrapper.vm.isRecording = true

      const mockMediaRecorder = {
        stop: vi.fn(),
        state: 'recording'
      }
      wrapper.vm.mediaRecorder = mockMediaRecorder

      await wrapper.vm.toggleRecording()

      expect(mockMediaRecorder.stop).toHaveBeenCalled()
    })

    it('deve solicitar permissão se stream não existir', async () => {
      wrapper.vm.stream = null
      mockGetUserMedia.mockResolvedValue(mockStream)

      await wrapper.vm.toggleRecording()

      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true })
    })
  })

  describe('gravação', () => {
    it('deve criar blob de áudio quando gravação para', async () => {
      await wrapper.vm.$nextTick()

      const mockMediaRecorder = {
        start: vi.fn(),
        stop: vi.fn(),
        ondataavailable: null,
        onstop: null,
        state: 'recording'
      }

      MediaRecorder.mockImplementation(() => mockMediaRecorder)

      await wrapper.vm.startRecording()

      // Simular dados disponíveis
      const mockEvent = {
        data: { size: 100 }
      }
      const chunks = []
      mockMediaRecorder.ondataavailable = (event) => chunks.push(event.data)

      // Simular parada
      mockMediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' })
        wrapper.vm.audioBlob = blob
        wrapper.vm.createAudioElement(blob)
      }

      mockMediaRecorder.ondataavailable(mockEvent)
      mockMediaRecorder.onstop()

      expect(wrapper.vm.audioBlob).toBeInstanceOf(Blob)
      expect(wrapper.vm.audioBlob.type).toBe('audio/webm')
    })

    it('deve atualizar timer durante gravação', async () => {
      await wrapper.vm.$nextTick()

      vi.useFakeTimers()

      await wrapper.vm.startRecording()

      expect(wrapper.vm.recordingTime).toBe(0)

      vi.advanceTimersByTime(1000)
      expect(wrapper.vm.recordingTime).toBe(1)

      vi.advanceTimersByTime(2000)
      expect(wrapper.vm.recordingTime).toBe(3)

      vi.useRealTimers()
    })
  })

  describe('prévia de áudio', () => {
    beforeEach(async () => {
      await wrapper.vm.$nextTick()
      wrapper.vm.audioBlob = new Blob(['audio'], { type: 'audio/webm' })
      wrapper.vm.createAudioElement(wrapper.vm.audioBlob)
    })

    it('deve reproduzir prévia', () => {
      wrapper.vm.playPreview()

      expect(wrapper.vm.isPlayingPreview).toBe(true)
      expect(wrapper.vm.audioElement.play).toHaveBeenCalled()
    })

    it('deve pausar prévia', () => {
      wrapper.vm.isPlayingPreview = true

      wrapper.vm.pausePreview()

      expect(wrapper.vm.isPlayingPreview).toBe(false)
      expect(wrapper.vm.audioElement.pause).toHaveBeenCalled()
    })

    it('deve parar prévia', () => {
      wrapper.vm.isPlayingPreview = true
      wrapper.vm.currentTime = 5

      wrapper.vm.stopPreview()

      expect(wrapper.vm.isPlayingPreview).toBe(false)
      expect(wrapper.vm.currentTime).toBe(0)
      expect(wrapper.vm.previewProgress).toBe(0)
      expect(wrapper.vm.audioElement.pause).toHaveBeenCalled()
      expect(wrapper.vm.audioElement.currentTime).toBe(0)
    })

    it('deve atualizar progresso durante reprodução', () => {
      wrapper.vm.audioElement.addEventListener.mockImplementation((event, callback) => {
        if (event === 'timeupdate') {
          wrapper.vm.audioElement.currentTime = 5
          callback()
        }
      })

      wrapper.vm.createAudioElement(wrapper.vm.audioBlob)

      expect(wrapper.vm.currentTime).toBe(5)
      expect(wrapper.vm.previewProgress).toBe(50) // 5/10 * 100
    })
  })

  describe('seekPreview', () => {
    it('deve alterar posição da prévia ao clicar na barra de progresso', async () => {
      await wrapper.vm.$nextTick()
      wrapper.vm.audioBlob = new Blob(['audio'], { type: 'audio/webm' })
      wrapper.vm.createAudioElement(wrapper.vm.audioBlob)

      const mockEvent = {
        target: {
          getBoundingClientRect: () => ({ left: 0, width: 100 })
        },
        clientX: 50
      }

      wrapper.vm.seekPreview(mockEvent)

      expect(wrapper.vm.audioElement.currentTime).toBe(5) // 50% de 10 segundos
    })
  })

  describe('submitRecording', () => {
    it('deve enviar áudio quando disponível', async () => {
      const onSubmit = vi.fn()
      wrapper = mount(AudioRecorder, {
        props: { onSubmit }
      })

      await wrapper.vm.$nextTick()

      wrapper.vm.audioBlob = new Blob(['audio'], { type: 'audio/webm' })
      wrapper.vm.isSubmitting = false

      await wrapper.vm.submitRecording()

      expect(onSubmit).toHaveBeenCalledWith(wrapper.vm.audioBlob)
      expect(wrapper.vm.isSubmitting).toBe(false)
    })

    it('deve definir erro se envio falhar', async () => {
      const onSubmit = vi.fn().mockRejectedValue(new Error('Submit failed'))
      wrapper = mount(AudioRecorder, {
        props: { onSubmit }
      })

      await wrapper.vm.$nextTick()

      wrapper.vm.audioBlob = new Blob(['audio'], { type: 'audio/webm' })

      await wrapper.vm.submitRecording()

      expect(wrapper.vm.error).toBe('Erro ao enviar gravação. Tente novamente.')
      expect(wrapper.vm.isSubmitting).toBe(false)
    })
  })

  describe('formatTime', () => {
    it('deve formatar tempo corretamente', () => {
      expect(wrapper.vm.formatTime(0)).toBe('0:00')
      expect(wrapper.vm.formatTime(59)).toBe('0:59')
      expect(wrapper.vm.formatTime(60)).toBe('1:00')
      expect(wrapper.vm.formatTime(125)).toBe('2:05')
    })
  })

  describe('cleanup', () => {
    it('deve limpar recursos ao desmontar', async () => {
      await wrapper.vm.$nextTick()

      wrapper.vm.timer = setInterval(() => {}, 1000)
      wrapper.vm.stream = mockStream
      wrapper.vm.audioElement = { pause: vi.fn(), src: 'test' }

      wrapper.vm.cleanup()

      expect(mockStream.getTracks()[0].stop).toHaveBeenCalled()
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('test')
    })
  })

  describe('renderização', () => {
    it('deve renderizar botão de gravação', () => {
      const button = wrapper.find('.record-btn')
      expect(button.exists()).toBe(true)
      expect(button.text()).toContain('Iniciar Gravação')
    })

    it('deve mostrar timer quando gravando', async () => {
      wrapper.vm.isRecording = true
      wrapper.vm.recordingTime = 5

      await wrapper.vm.$nextTick()

      const timer = wrapper.find('.timer')
      expect(timer.exists()).toBe(true)
      expect(timer.text()).toContain('0:05')
    })

    it('deve mostrar prévia quando áudio disponível', async () => {
      wrapper.vm.audioBlob = new Blob(['audio'], { type: 'audio/webm' })

      await wrapper.vm.$nextTick()

      const preview = wrapper.find('.audio-preview')
      expect(preview.exists()).toBe(true)
    })

    it('deve mostrar botão de envio quando áudio disponível', async () => {
      wrapper.vm.audioBlob = new Blob(['audio'], { type: 'audio/webm' })

      await wrapper.vm.$nextTick()

      const submitBtn = wrapper.findComponent({ name: 'VBtn' }).filter(btn =>
        btn.text().includes('Enviar Resposta')
      )
      expect(submitBtn.exists()).toBe(true)
    })

    it('deve mostrar aviso de permissão quando não autorizado', async () => {
      wrapper.vm.hasPermission = false
      wrapper.vm.error = ''

      await wrapper.vm.$nextTick()

      const alert = wrapper.find('.v-alert')
      expect(alert.exists()).toBe(true)
      expect(alert.text()).toContain('Permita o acesso ao microfone')
    })

    it('deve mostrar erro quando houver', async () => {
      wrapper.vm.error = 'Erro de teste'

      await wrapper.vm.$nextTick()

      const alert = wrapper.find('.v-alert')
      expect(alert.exists()).toBe(true)
      expect(alert.text()).toContain('Erro de teste')
    })
  })
})