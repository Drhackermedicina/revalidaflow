import { describe, it, expect } from 'vitest'

// Simulando uma função que filtra estações por especialidade
function filtrarPorEspecialidade(estacoes, especialidade) {
  return estacoes.filter(e => e.especialidade === especialidade)
}

describe('Filtro de Estações', () => {
  it('deve filtrar estações de Cardiologia', () => {
    // 1. PREPARAR - criar dados de teste (estações fake)
    const estacoes = [
      { id: 1, titulo: 'IAM', especialidade: 'Cardiologia' },
      { id: 2, titulo: 'Pneumonia', especialidade: 'Pneumologia' },
      { id: 3, titulo: 'Arritmia', especialidade: 'Cardiologia' },
    ]

    // 2. EXECUTAR - rodar a função
    const resultado = filtrarPorEspecialidade(estacoes, 'Cardiologia')

    // 3. VERIFICAR - checar se está correto
    expect(resultado).toHaveLength(2)  // Deve ter 2 estações
    expect(resultado[0].titulo).toBe('IAM')  // Primeira é IAM
    expect(resultado[1].titulo).toBe('Arritmia')  // Segunda é Arritmia
  })

  it('deve retornar array vazio se não encontrar nada', () => {
    const estacoes = [
      { id: 1, titulo: 'IAM', especialidade: 'Cardiologia' },
    ]

    const resultado = filtrarPorEspecialidade(estacoes, 'Dermatologia')

    expect(resultado).toHaveLength(0)  // Não achou nada
  })
})
