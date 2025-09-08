import { describe, it, expect } from 'vitest'

describe('Exemplo de Teste Básico', () => {
  it('deve passar um teste simples', () => {
    expect(1 + 1).toBe(2)
  })

  it('deve testar uma função simples', () => {
    const soma = (a, b) => a + b
    expect(soma(2, 3)).toBe(5)
  })
})