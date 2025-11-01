import { describe, it, expect } from 'vitest'
import { useChatInput } from '@/composables/useChatInput.js'

describe('useChatInput - sanitize', () => {
  it('remove scripts e iframes e converte links', () => {
    const { formatMessageText } = useChatInput()
    const input = 'Olá <script>alert(1)</script> veja https://exemplo.com e <iframe src="x"></iframe> fim'
    const out = formatMessageText(input)
    expect(out).not.toContain('<script')
    expect(out).not.toContain('<iframe')
    expect(out).toContain('<a href="https://exemplo.com"')
  })

  it('mantém tags permitidas básicas', () => {
    const { formatMessageText } = useChatInput()
    const input = 'Texto com <strong>negrito</strong> e <em>ênfase</em>'
    const out = formatMessageText(input)
    expect(out).toContain('<strong>negrito</strong>')
    expect(out).toContain('<em>ênfase</em>')
  })
})
