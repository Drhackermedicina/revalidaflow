import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ref, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { useChatMessages } from '../../src/composables/useChatMessages'
import { useChatUsers } from '../../src/composables/useChatUsers'

const describeIfDom = typeof document === 'undefined' ? describe.skip : describe

const mockCollection = vi.fn((_, name) => ({ __collection: name }))
const mockQuery = vi.fn((...args) => ({ __queryArgs: args }))
const mockOrderBy = vi.fn(() => ({}))
const mockLimit = vi.fn(() => ({}))
const mockWhere = vi.fn(() => ({}))
const mockStartAfter = vi.fn(() => ({}))

const chatSnapshotHandlers = []
const usersSnapshotHandlers = []

const mockOnSnapshot = vi.fn((query, callback) => {
  if (query?.__queryArgs) {
    const firstArg = query.__queryArgs[0]
    const target =
      firstArg?.__collection === 'chatMessages'
        ? chatSnapshotHandlers
        : usersSnapshotHandlers
    target.push(callback)
  } else if (query?.__collection === 'chatMessages') {
    chatSnapshotHandlers.push(callback)
  } else {
    usersSnapshotHandlers.push(callback)
  }
  return vi.fn()
})

const mockAddDoc = vi.fn()
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
  query: (...args) => mockQuery(...args),
  orderBy: (...args) => mockOrderBy(...args),
  where: (...args) => mockWhere(...args),
  limit: (...args) => mockLimit(...args),
  startAfter: (...args) => mockStartAfter(...args),
  onSnapshot: (...args) => mockOnSnapshot(...args),
  addDoc: (...args) => mockAddDoc(...args),
  getDocs: (...args) => mockGetDocs(...args),
  serverTimestamp: () => mockServerTimestamp()
}))

const createDoc = (id, payload) => ({
  id,
  data: () => payload
})

describeIfDom('Chat Group integration', () => {
  beforeEach(() => {
    chatSnapshotHandlers.length = 0
    usersSnapshotHandlers.length = 0
    mockCollection.mockClear()
    mockQuery.mockClear()
    mockOrderBy.mockClear()
    mockLimit.mockClear()
    mockWhere.mockClear()
    mockStartAfter.mockClear()
    mockAddDoc.mockClear()
    mockGetDocs.mockClear()
    mockServerTimestamp.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('sincroniza presença e mensagens entre composables', async () => {
    const currentUser = ref({
      uid: 'user-1',
      displayName: 'Participante',
      photoURL: 'https://example.com/user1.png'
    })

    let chatComposable
    let usersComposable

    const wrapper = mount({
      template: '<div/>',
      setup() {
        chatComposable = useChatMessages(currentUser)
        usersComposable = useChatUsers()
        return {}
      }
    })

    try {
      expect(chatSnapshotHandlers.length).toBe(1)
      expect(usersSnapshotHandlers.length).toBe(1)

      const now = Date.now()
      const activeTimestamp = {
        toDate: () => new Date(now - 30 * 1000)
      }
      const idleTimestamp = {
        toDate: () => new Date(now - 11 * 60 * 1000)
      }

      usersSnapshotHandlers[0]({
        docs: [
          createDoc('user-1', {
            status: 'disponivel',
            lastActive: activeTimestamp,
            displayName: 'Participante'
          }),
          createDoc('user-2', {
            status: 'disponivel',
            lastActive: idleTimestamp,
            displayName: 'Colega'
          })
        ]
      })

      await nextTick()
      expect(usersComposable.users.value).toHaveLength(2)
      const [current, colleague] = usersComposable.users.value
      expect(current.status).toBe('disponivel')
      expect(colleague.status).toBe('ausente')

      const ts1 = { toDate: () => new Date(now - 20 * 1000) }
      chatSnapshotHandlers[0]({
        docs: [
          createDoc('msg-1', {
            senderId: 'user-2',
            senderName: 'Colega',
            text: 'Olá pessoal!',
            timestamp: ts1
          })
        ],
        empty: false
      })

      await nextTick()
      expect(chatComposable.messages.value).toHaveLength(1)
      expect(chatComposable.messages.value[0]).toMatchObject({
        id: 'msg-1',
        senderId: 'user-2',
        text: 'Olá pessoal!'
      })
    } finally {
      wrapper.unmount()
    }
  })
})
