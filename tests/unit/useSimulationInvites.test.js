import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useSimulationInvites } from '../../src/composables/useSimulationInvites'

// Mock do Firebase
const mockAddDoc = vi.fn()
const mockCollection = vi.fn()
const mockServerTimestamp = vi.fn()

vi.mock('@/plugins/firebase.js', () => ({
  db: {}
}))

vi.mock('firebase/firestore', () => ({
  addDoc: (...args) => mockAddDoc(...args),
  collection: (...args) => mockCollection(...args),
  serverTimestamp: () => mockServerTimestamp()
}))

// Mock do notificationStore
const mockNotify = vi.fn()
vi.mock('@/stores/notificationStore', () => ({
  useNotificationStore: () => ({
    notify: mockNotify
  })
}))

describe('useSimulationInvites', () => {
  beforeEach(() => {
    // Resetar os mocks antes de cada teste
    mockAddDoc.mockReset()
    mockCollection.mockReset()
    mockServerTimestamp.mockReset()
    mockNotify.mockReset()
  })

  it('deve enviar convite com sucesso', async () => {
    // Arrange
    const { sendSimulationInvite } = useSimulationInvites()
    
    // Mock das funções do Firebase
    mockAddDoc.mockResolvedValue({})
    mockCollection.mockReturnValue({})
    mockServerTimestamp.mockReturnValue(new Date())
    
    const inviteData = {
      candidateUid: 'candidate-123',
      candidateName: 'Candidato Teste',
      inviteLink: 'https://test.com/invite',
      stationTitle: 'Estação Teste',
      duration: 10,
      meetLink: 'https://meet.google.com/test',
      senderName: 'Avaliador Teste',
      senderUid: 'sender-456'
    }

    // Act
    const result = await sendSimulationInvite(inviteData)

    // Assert
    expect(result.success).toBe(true)
    // Verifica se addDoc foi chamado duas vezes (uma para chat, uma para convite)
    expect(mockAddDoc).toHaveBeenCalledTimes(2)
    expect(mockNotify).toHaveBeenCalledWith({
      text: 'Convite enviado para Candidato Teste',
      color: 'success'
    })
  })

  it('deve lidar com erro ao enviar convite', async () => {
    // Arrange
    const { sendSimulationInvite } = useSimulationInvites()
    
    // Mock para simular erro
    mockAddDoc.mockRejectedValue(new Error('Erro de teste'))
    mockCollection.mockReturnValue({})
    mockServerTimestamp.mockReturnValue(new Date())
    
    const inviteData = {
      candidateUid: 'candidate-123',
      candidateName: 'Candidato Teste',
      inviteLink: 'https://test.com/invite',
      stationTitle: 'Estação Teste',
      duration: 10,
      meetLink: 'https://meet.google.com/test',
      senderName: 'Avaliador Teste',
      senderUid: 'sender-456'
    }

    // Act
    const result = await sendSimulationInvite(inviteData)

    // Assert
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
    expect(mockNotify).toHaveBeenCalledWith({
      text: 'Erro ao enviar convite. Tente novamente.',
      color: 'error'
    })
  })

  it('deve definir isProcessingInvite como true durante o processamento', async () => {
    // Arrange
    const { sendSimulationInvite, isProcessingInvite } = useSimulationInvites()
    
    // Mock para simular delay
    mockAddDoc.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({}), 10)))
    mockCollection.mockReturnValue({})
    mockServerTimestamp.mockReturnValue(new Date())
    
    const inviteData = {
      candidateUid: 'candidate-123',
      candidateName: 'Candidato Teste',
      inviteLink: 'https://test.com/invite',
      stationTitle: 'Estação Teste',
      duration: 10,
      meetLink: 'https://meet.google.com/test',
      senderName: 'Avaliador Teste',
      senderUid: 'sender-456'
    }

    // Act
    const promise = sendSimulationInvite(inviteData)
    
    // Assert
    // Verificar se isProcessingInvite é true imediatamente
    expect(isProcessingInvite.value).toBe(true)
    
    // Esperar a conclusão
    await promise
    
    // Verificar se isProcessingInvite é false após conclusão
    expect(isProcessingInvite.value).toBe(false)
  })

  it('deve enviar mensagem de chat com dados corretos', async () => {
    // Arrange
    const { sendSimulationInvite } = useSimulationInvites()
    
    mockAddDoc.mockResolvedValue({})
    mockCollection.mockReturnValue({})
    mockServerTimestamp.mockReturnValue(new Date())
    
    const inviteData = {
      candidateUid: 'candidate-123',
      candidateName: 'Candidato Teste',
      inviteLink: 'https://test.com/invite',
      stationTitle: 'Estação Teste',
      duration: 10,
      meetLink: 'https://meet.google.com/test',
      senderName: 'Avaliador Teste',
      senderUid: 'sender-456'
    }

    // Act
    await sendSimulationInvite(inviteData)

    // Assert
    // Verificar se a primeira chamada (chat) tem os dados corretos
    expect(mockAddDoc).toHaveBeenNthCalledWith(1, {}, expect.objectContaining({
      senderId: 'sender-456',
      senderName: 'Avaliador Teste',
      text: expect.stringContaining('CONVITE PARA SIMULAÇÃO'),
      type: 'simulation_invite',
      metadata: expect.objectContaining({
        candidateUid: 'candidate-123',
        stationTitle: 'Estação Teste',
        inviteLink: 'https://test.com/invite',
        meetLink: 'https://meet.google.com/test',
        duration: 10,
        isInvite: true
      })
    }))
  })

  it('deve salvar convite no Firebase com dados corretos', async () => {
    // Arrange
    const { sendSimulationInvite } = useSimulationInvites()
    
    mockAddDoc.mockResolvedValue({})
    mockCollection.mockReturnValue({})
    mockServerTimestamp.mockReturnValue(new Date('2023-01-01T00:00:00Z'))
    
    const inviteData = {
      candidateUid: 'candidate-123',
      candidateName: 'Candidato Teste',
      inviteLink: 'https://test.com/invite',
      stationTitle: 'Estação Teste',
      duration: 10,
      meetLink: 'https://meet.google.com/test',
      senderName: 'Avaliador Teste',
      senderUid: 'sender-456'
    }

    // Act
    await sendSimulationInvite(inviteData)

    // Assert
    // Verificar se a segunda chamada (convite) tem os dados corretos
    expect(mockAddDoc).toHaveBeenNthCalledWith(2, {}, expect.objectContaining({
      candidateUid: 'candidate-123',
      senderUid: 'sender-456',
      senderName: 'Avaliador Teste',
      stationTitle: 'Estação Teste',
      inviteLink: 'https://test.com/invite',
      meetLink: 'https://meet.google.com/test',
      duration: 10,
      status: 'pending'
    }))
  })

  it('deve incluir link do Meet na mensagem quando fornecido', async () => {
    // Arrange
    const { sendSimulationInvite } = useSimulationInvites()
    
    mockAddDoc.mockResolvedValue({})
    mockCollection.mockReturnValue({})
    mockServerTimestamp.mockReturnValue(new Date())
    
    const inviteData = {
      candidateUid: 'candidate-123',
      candidateName: 'Candidato Teste',
      inviteLink: 'https://test.com/invite',
      stationTitle: 'Estação Teste',
      duration: 10,
      meetLink: 'https://meet.google.com/test',
      senderName: 'Avaliador Teste',
      senderUid: 'sender-456'
    }

    // Act
    await sendSimulationInvite(inviteData)

    // Assert
    // Verificar se a mensagem de chat inclui o link do Meet
    const chatMessageCall = mockAddDoc.mock.calls[0][1]
    expect(chatMessageCall.text).toContain('https://meet.google.com/test')
  })

  it('deve funcionar sem link do Meet', async () => {
    // Arrange
    const { sendSimulationInvite } = useSimulationInvites()
    
    mockAddDoc.mockResolvedValue({})
    mockCollection.mockReturnValue({})
    mockServerTimestamp.mockReturnValue(new Date())
    
    const inviteData = {
      candidateUid: 'candidate-123',
      candidateName: 'Candidato Teste',
      inviteLink: 'https://test.com/invite',
      stationTitle: 'Estação Teste',
      duration: 10,
      meetLink: null,
      senderName: 'Avaliador Teste',
      senderUid: 'sender-456'
    }

    // Act
    const result = await sendSimulationInvite(inviteData)

    // Assert
    expect(result.success).toBe(true)
    // Verificar que a mensagem de chat não inclui o link do Meet
    const chatMessageCall = mockAddDoc.mock.calls[0][1]
    expect(chatMessageCall.text).not.toContain('Google Meet')
  })
})