import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { initUserPresence, cleanupUserPresence } from '../../src/composables/useUserPresence'

const createEventTarget = listenersMap => ({
  addEventListener: vi.fn((type, handler) => {
    if (!listenersMap.has(type)) {
      listenersMap.set(type, new Set())
    }
    listenersMap.get(type).add(handler)
  }),
  removeEventListener: vi.fn((type, handler) => {
    if (!listenersMap.has(type)) return
    listenersMap.get(type).delete(handler)
    if (listenersMap.get(type)?.size === 0) {
      listenersMap.delete(type)
    }
  }),
  dispatchEvent: vi.fn(event => {
    const handlers = listenersMap.get(event.type)
    if (!handlers) return true
    handlers.forEach(handler => handler(event))
    return true
  })
})

let originalWindow
let originalDocument
let originalEvent
let windowListeners
let documentListeners
let mockWindowTarget
let mockDocumentTarget

const mockUpdateDocumentWithRetry = vi.fn(() => Promise.resolve(true))
const mockCheckFirestoreConnectivity = vi.fn(() => ({ available: true }))
const mockDoc = vi.fn(() => 'doc-ref')
const mockUpdateDoc = vi.fn(() => Promise.resolve(true))
const mockServerTimestamp = vi.fn(() => 'server-ts')

vi.mock('@/utils/logger', () => ({
  default: class {
    debug() {}
    error() {}
    warn() {}
  }
}))

const { currentUserMock } = vi.hoisted(() => ({
  currentUserMock: { value: null }
}))

vi.mock('@/plugins/auth', () => ({
  currentUser: currentUserMock
}))

vi.mock('@/plugins/firebase', () => ({
  db: {}
}))

vi.mock('firebase/firestore', () => ({
  doc: (...args) => mockDoc(...args),
  updateDoc: (...args) => mockUpdateDoc(...args),
  serverTimestamp: () => mockServerTimestamp()
}))

vi.mock('@/services/firestoreService', () => ({
  updateDocumentWithRetry: (...args) => mockUpdateDocumentWithRetry(...args),
  checkFirestoreConnectivity: () => mockCheckFirestoreConnectivity()
}))

beforeEach(() => {
  originalWindow = global.window
  originalDocument = global.document
  originalEvent = global.Event

  windowListeners = new Map()
  documentListeners = new Map()

  class MockEvent {
    constructor(type) {
      this.type = type
    }
  }

  global.Event = MockEvent

  mockDocumentTarget = createEventTarget(documentListeners)
  Object.defineProperty(mockDocumentTarget, 'hidden', {
    configurable: true,
    enumerable: true,
    writable: true,
    value: false
  })
  mockDocumentTarget.visibilityState = 'visible'
  global.document = mockDocumentTarget

  mockWindowTarget = createEventTarget(windowListeners)
  mockWindowTarget.matchMedia = vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
  mockWindowTarget.localStorage = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
  }
  mockWindowTarget.document = mockDocumentTarget
  global.window = mockWindowTarget

  currentUserMock.value = { uid: 'user-1' }
  mockUpdateDocumentWithRetry.mockClear()
  mockCheckFirestoreConnectivity.mockClear()
  mockDoc.mockClear()
  mockUpdateDoc.mockClear()
  mockServerTimestamp.mockClear()
  vi.useFakeTimers()
})

afterEach(() => {
  cleanupUserPresence()
  vi.useRealTimers()

  if (originalWindow === undefined) {
    delete global.window
  } else {
    global.window = originalWindow
  }

  if (originalDocument === undefined) {
    delete global.document
  } else {
    global.document = originalDocument
  }

  if (originalEvent === undefined) {
    delete global.Event
  } else {
    global.Event = originalEvent
  }

  windowListeners?.clear()
  documentListeners?.clear()
  vi.clearAllMocks()
})

describe('useUserPresence', () => {
  it('atualiza presença como disponível ao iniciar e marca offline no beforeunload', async () => {
    initUserPresence()
    await Promise.resolve()

    const payloads = mockUpdateDocumentWithRetry.mock.calls.map(call => call[1])
    expect(payloads).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          status: 'disponivel',
          lastActive: 'server-ts',
          isOnline: true
        })
      ])
    )

    window.dispatchEvent(new Event('beforeunload'))
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      'doc-ref',
      expect.objectContaining({
        status: 'offline',
        lastActive: 'server-ts',
        isOnline: false
      })
    )
  })

  it('marca usuário como ausente após período de inatividade', async () => {
    initUserPresence()
    await Promise.resolve()

    mockUpdateDocumentWithRetry.mockClear()

    vi.advanceTimersByTime(10 * 60 * 1000 + 100)
    await Promise.resolve()

    expect(mockUpdateDocumentWithRetry).toHaveBeenCalledWith(
      'doc-ref',
      expect.objectContaining({
        status: 'ausente',
        lastActive: 'server-ts',
        isOnline: true
      }),
      'atualização de presença do usuário'
    )
  })

  it('redefine status como offline em eventos de pagehide e offline', async () => {
    initUserPresence()
    await Promise.resolve()

    mockUpdateDocumentWithRetry.mockClear()

    window.dispatchEvent(new Event('pagehide'))
    await Promise.resolve()

    expect(mockUpdateDocumentWithRetry).toHaveBeenCalledWith(
      'doc-ref',
      expect.objectContaining({
        status: 'offline',
        isOnline: false
      }),
      'atualização de presença do usuário'
    )

    mockUpdateDocumentWithRetry.mockClear()

    window.dispatchEvent(new Event('offline'))
    await Promise.resolve()

    expect(mockUpdateDocumentWithRetry).toHaveBeenCalledWith(
      'doc-ref',
      expect.objectContaining({
        status: 'offline',
        isOnline: false
      }),
      'atualização de presença do usuário'
    )
  })

  it('envia ping periódico para manter usuário disponível enquanto ativo', async () => {
    initUserPresence()
    await Promise.resolve()

    mockUpdateDocumentWithRetry.mockClear()

    await vi.advanceTimersByTimeAsync(61 * 1000)

    expect(mockUpdateDocumentWithRetry).toHaveBeenCalledWith(
      'doc-ref',
      expect.objectContaining({
        status: 'disponivel',
        isOnline: true
      }),
      'atualização de presença do usuário'
    )
  })
})
