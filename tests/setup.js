// Setup para testes com Vitest
import { vi } from 'vitest'

// Mock global do Firebase
vi.mock('@/plugins/firebase', () => ({
  db: {},
  auth: {}
}))

// Mock global do currentUser
vi.mock('@/plugins/auth', () => ({
  currentUser: {
    value: null
  }
}))

// Mock do window e document para testes DOM
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock do localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  writable: true,
})