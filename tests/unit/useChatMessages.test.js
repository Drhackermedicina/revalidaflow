import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ref, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { useChatMessages } from '../../src/composables/useChatMessages'

const describeIfDom = typeof document === 'undefined' ? describe.skip : describe

const snapshotCallbacks = []
const unsubscribeSpies = []
const mockCollection = vi.fn(() => ({}))
const mockAddDoc = vi.fn()
const mockStartAfter = vi.fn()
const mockGetDocs = vi.fn()
const mockServerTimestamp = vi.fn(() => 'server-ts')

vi.mock('@/utils/logger', () => ({
  default: class {
    debug() {}
    error() {}
    warn() {}
  }
}))

vi.mock('@/plugins/firebase', () => ({
  db: {}
}))

vi.mock('firebase/firestore', () => ({
  collection: (...args) => mockCollection(...args),
  onSnapshot: (...args) => {
    const callback = args[1]
    snapshotCallbacks.push(callback)
    const unsubscribe = vi.fn()
    unsubscribeSpies.push(unsubscribe)
    return unsubscribe
  },
  query: (...args) => ({ __query: args }),
  orderBy: (...args) => ({ __orderBy: args }),
  limit: (...args) => ({ __limit: args }),
  addDoc: (...args) => mockAddDoc(...args),
  startAfter: (...args) => mockStartAfter(...args),
  getDocs: (...args) => mockGetDocs(...args),
  serverTimestamp: () => mockServerTimestamp()
}))

const createDoc = (id, payload) => ({
  id,
  data: () => payload
})

const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0))

beforeEach(() => {
  snapshotCallbacks.length = 0
  unsubscribeSpies.length = 0
  mockCollection.mockClear()
  mockAddDoc.mockReset()
  mockStartAfter.mockReset()
  mockGetDocs.mockReset()
  mockServerTimestamp.mockReset()
})

afterEach(() => {
  vi.clearAllMocks()
})

describeIfDom('useChatMessages', () => {
  it('mantém listener ativo ao paginar e mescla mensagens antigas e novas', async () => {
    const currentUser = ref({
      uid: 'user-1',
      displayName: 'Test User',
      photoURL: 'https://example.com/avatar.png'
    })

    let composable
    const wrapper = mount({
      template: '<div />',
      setup() {
        composable = useChatMessages(currentUser)
        return {}
      }
    })

    try {
      expect(snapshotCallbacks.length).toBe(1)
      const triggerSnapshot = snapshotCallbacks[0]

      const ts1 = { toDate: () => new Date('2024-01-01T10:00:00Z') }
      const ts2 = { toDate: () => new Date('2024-01-01T10:05:00Z') }

      triggerSnapshot({
        docs: [
          createDoc('m2', { senderId: 'user-1', senderName: 'Test User', text: 'Resposta', timestamp: ts2 }),
          createDoc('m1', { senderId: 'user-2', senderName: 'Outro', text: 'Primeira', timestamp: ts1 })
        ],
        empty: false
      })

      await nextTick()
      expect(composable.messages.value.map(message => message.id)).toEqual(['m1', 'm2'])

      const ts0 = { toDate: () => new Date('2024-01-01T09:50:00Z') }
      mockGetDocs.mockResolvedValueOnce({
        docs: [
          createDoc('old-1', { senderId: 'user-3', senderName: 'Histórico', text: 'Mensagem antiga', timestamp: ts0 })
        ],
        empty: false
      })

      composable.hasMoreMessages.value = true
      await composable.loadMoreMessages()
      await flushPromises()
      await nextTick()

      expect(mockStartAfter).toHaveBeenCalledWith(expect.objectContaining({ id: 'm1' }))
      expect(composable.messages.value.map(message => message.id)).toEqual(['old-1', 'm1', 'm2'])

      const ts3 = { toDate: () => new Date('2024-01-01T10:10:00Z') }
      triggerSnapshot({
        docs: [
          createDoc('m3', { senderId: 'user-4', senderName: 'Nova', text: 'Nova mensagem', timestamp: ts3 }),
          createDoc('m2', { senderId: 'user-1', senderName: 'Test User', text: 'Resposta', timestamp: ts2 })
        ],
        empty: false
      })

      await nextTick()
      expect(composable.messages.value.map(message => message.id)).toEqual(['old-1', 'm1', 'm2', 'm3'])
    } finally {
      wrapper.unmount()
    }

    expect(unsubscribeSpies[0]).toHaveBeenCalledTimes(1)
  })

  it('envia mensagem utilizando serverTimestamp e dados do usuário atual', async () => {
    const currentUser = ref({
      uid: 'user-1',
      displayName: 'Test User',
      photoURL: 'https://example.com/avatar.png'
    })

    let composable
    const wrapper = mount({
      template: '<div />',
      setup() {
        composable = useChatMessages(currentUser)
        return {}
      }
    })

    try {
      mockAddDoc.mockResolvedValueOnce({})

      const result = await composable.sendMessage('   Nova mensagem   ')
      expect(result).toBe(true)
      expect(mockCollection).toHaveBeenCalledWith({}, 'chatMessages')
      expect(mockAddDoc).toHaveBeenCalledTimes(1)

      const payload = mockAddDoc.mock.calls[0][1]
      expect(payload).toMatchObject({
        senderId: 'user-1',
        senderName: 'Test User',
        senderPhotoURL: 'https://example.com/avatar.png',
        text: 'Nova mensagem',
        timestamp: 'server-ts'
      })
      expect(mockServerTimestamp).toHaveBeenCalledTimes(1)
    } finally {
      wrapper.unmount()
    }

    expect(unsubscribeSpies[0]).toHaveBeenCalledTimes(1)
  })
})
