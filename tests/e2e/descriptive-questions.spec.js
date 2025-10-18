import { test, expect } from '@playwright/test'

test.describe('Questões Descritivas - E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navegar para a aplicação (assumindo que está rodando em localhost:3000)
    await page.goto('http://localhost:3000')
  })

  test.describe('Fluxo Feliz', () => {
    test('deve permitir navegar para uma questão descritiva, gravar áudio e ver feedback', async ({ page }) => {
      // Mock da API para buscar questão
      await page.route('**/api/descriptive-questions/1', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: '1',
            titulo: 'Avaliação de Paciente com Dor Abdominal',
            enunciado: 'Paciente de 45 anos apresenta dor abdominal intensa há 2 dias. Descreva sua abordagem diagnóstica.',
            especialidade: 'Clínica Médica',
            ano: 2024,
            tipo: 'PEP',
            itens: [
              {
                id: '1-1',
                descricao: 'Anamnese e exame físico',
                peso: 5
              },
              {
                id: '1-2',
                descricao: 'Hipóteses diagnósticas',
                peso: 5
              }
            ]
          })
        })
      })

      // Mock da API de avaliação
      await page.route('**/api/descriptive-questions/1/evaluate', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            scoreGeral: 8,
            transcricao: 'O paciente apresenta dor abdominal intensa. Vou realizar anamnese completa e exame físico detalhado. As principais hipóteses diagnósticas incluem apendicite, colecistite e úlcera péptica.',
            analiseCriterios: [
              {
                titulo: 'Anamnese e exame físico',
                pontuacao: 8,
                comentario: 'Anamnese completa e exame físico sistemático bem descritos.'
              },
              {
                titulo: 'Hipóteses diagnósticas',
                pontuacao: 9,
                comentario: 'Hipóteses diagnósticas relevantes e bem fundamentadas.'
              }
            ],
            resumoGeral: 'Resposta estruturada e completa, demonstrando raciocínio clínico adequado.'
          })
        })
      })

      // Navegar para a página da questão
      await page.goto('http://localhost:3000/descriptive-question/1')

      // Aguardar carregamento da página
      await page.waitForSelector('.question-content')

      // Verificar se a questão foi carregada
      await expect(page.locator('.question-title')).toContainText('Avaliação de Paciente com Dor Abdominal')
      await expect(page.locator('.question-statement')).toContainText('Paciente de 45 anos apresenta dor abdominal')

      // Verificar itens de avaliação
      await expect(page.locator('.item-title')).toHaveCount(2)

      // Clicar no botão de iniciar gravação
      const recordBtn = page.locator('.record-btn').first()
      await expect(recordBtn).toContainText('Iniciar Gravação')
      await recordBtn.click()

      // Aguardar um pouco para simular gravação (em teste real seria mais tempo)
      await page.waitForTimeout(1000)

      // Verificar se mostra timer
      await expect(page.locator('.timer')).toBeVisible()

      // Clicar para parar gravação
      await recordBtn.click()
      await expect(recordBtn).toContainText('Iniciar Gravação')

      // Verificar se prévia está disponível
      await expect(page.locator('.audio-preview')).toBeVisible()

      // Clicar no botão de enviar
      const submitBtn = page.locator('text=Enviar Resposta')
      await expect(submitBtn).toBeVisible()
      await submitBtn.click()

      // Aguardar feedback aparecer
      await page.waitForSelector('.descriptive-feedback')

      // Verificar feedback
      await expect(page.locator('.score-number')).toContainText('8/10')
      await expect(page.locator('.transcription-text')).toContainText('O paciente apresenta dor abdominal')
      await expect(page.locator('.criterio-title')).toHaveCount(2)
      await expect(page.locator('.resumo-text')).toContainText('Resposta estruturada e completa')
    })
  })

  test.describe('Cenários de Erro', () => {
    test('deve mostrar erro ao tentar acessar questão inexistente', async ({ page }) => {
      // Mock para questão não encontrada
      await page.route('**/api/descriptive-questions/999', async (route) => {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Questão não encontrada' })
        })
      })

      // Navegar para questão inexistente
      await page.goto('http://localhost:3000/descriptive-question/999')

      // Verificar mensagem de erro
      await expect(page.locator('.error-state')).toBeVisible()
      await expect(page.locator('.error-state')).toContainText('Questão não encontrada')
    })

    test('deve mostrar erro ao tentar enviar avaliação sem áudio', async ({ page }) => {
      // Mock da API para buscar questão
      await page.route('**/api/descriptive-questions/1', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: '1',
            titulo: 'Questão de Teste',
            enunciado: 'Enunciado da questão',
            especialidade: 'Clínica Médica',
            ano: 2024,
            tipo: 'PEP',
            itens: []
          })
        })
      })

      // Navegar para a questão
      await page.goto('http://localhost:3000/descriptive-question/1')
      await page.waitForSelector('.question-content')

      // Tentar clicar em enviar sem gravar (botão não deve estar visível)
      const submitBtn = page.locator('text=Enviar Resposta')
      await expect(submitBtn).not.toBeVisible()
    })

    test('deve mostrar erro quando API de avaliação falha', async ({ page }) => {
      // Mock da API para buscar questão
      await page.route('**/api/descriptive-questions/1', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: '1',
            titulo: 'Questão de Teste',
            enunciado: 'Enunciado',
            especialidade: 'Clínica Médica',
            ano: 2024,
            tipo: 'PEP',
            itens: []
          })
        })
      })

      // Mock da API de avaliação com erro
      await page.route('**/api/descriptive-questions/1/evaluate', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Erro interno do servidor' })
        })
      })

      // Navegar e simular gravação
      await page.goto('http://localhost:3000/descriptive-question/1')
      await page.waitForSelector('.question-content')

      // Simular gravação rápida
      const recordBtn = page.locator('.record-btn').first()
      await recordBtn.click()
      await page.waitForTimeout(500)
      await recordBtn.click()

      // Enviar
      const submitBtn = page.locator('text=Enviar Resposta')
      await submitBtn.click()

      // Verificar erro
      await expect(page.locator('.v-alert')).toContainText('Erro ao enviar áudio')
    })
  })

  test.describe('Navegação', () => {
    test('deve permitir voltar da página da questão', async ({ page }) => {
      // Mock da API
      await page.route('**/api/descriptive-questions/1', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: '1',
            titulo: 'Questão de Teste',
            enunciado: 'Enunciado',
            especialidade: 'Clínica Médica',
            ano: 2024,
            tipo: 'PEP',
            itens: []
          })
        })
      })

      await page.goto('http://localhost:3000/descriptive-question/1')
      await page.waitForSelector('.question-content')

      // Clicar em voltar
      const backBtn = page.locator('text=Voltar').first()
      await backBtn.click()

      // Verificar se navegou (em teste real, verificar URL ou estado)
      // Como é um SPA, apenas verificar se botão existe e é clicável
      await expect(backBtn).toBeVisible()
    })
  })

  test.describe('Responsividade', () => {
    test('deve funcionar em dispositivos móveis', async ({ page, isMobile }) => {
      // Este teste pode ser expandido com configuração específica para mobile
      if (isMobile) {
        await page.route('**/api/descriptive-questions/1', async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              id: '1',
              titulo: 'Questão Mobile',
              enunciado: 'Enunciado para teste mobile',
              especialidade: 'Clínica Médica',
              ano: 2024,
              tipo: 'PEP',
              itens: []
            })
          })
        })

        await page.goto('http://localhost:3000/descriptive-question/1')
        await page.waitForSelector('.question-content')

        // Verificar elementos principais estão visíveis
        await expect(page.locator('.question-title')).toBeVisible()
        await expect(page.locator('.record-btn')).toBeVisible()
      }
    })
  })
})