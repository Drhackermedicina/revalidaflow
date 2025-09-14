import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // Navegar para a página de estações
    await page.goto('http://localhost:3000/app/stations');

    // Aguardar a página carregar
    await page.waitForLoadState('networkidle');

    console.log('Página carregada');

    // Digitar no campo de busca de candidatos para acionar a busca
    const searchInput = page.locator('input[placeholder*="Digite o nome do candidato"]').first();
    await searchInput.fill('João');
    await searchInput.press('Enter');

    console.log('Busca por candidatos acionada');

    // Aguardar sugestões carregarem
    await page.waitForTimeout(2000);

    // Verificar se há sugestões de candidatos
    const candidateSuggestions = await page.locator('.candidate-suggestion-item').count();
    console.log(`Encontradas ${candidateSuggestions} sugestões de candidatos`);

    if (candidateSuggestions > 0) {
      // Selecionar o primeiro candidato
      await page.locator('.candidate-suggestion-item').first().click();
      console.log('Candidato selecionado');

      // Aguardar seleção
      await page.waitForTimeout(1000);

      // Clicar em uma estação para iniciar simulação
      const stationButton = page.locator('.station-list-item').first();
      if (await stationButton.isVisible()) {
        await stationButton.click();
        console.log('Estação clicada, simulação iniciada');

        // Aguardar nova aba ou navegação
        const newPage = await browser.waitForEvent('page');
        await newPage.waitForLoadState('networkidle');

        console.log('Nova página de simulação carregada');

        // Verificar se o botão de chat está presente
        const chatButton = newPage.locator('text=Enviar via Chat');
        const isVisible = await chatButton.isVisible();
        const isDisabled = await chatButton.isDisabled();

        console.log(`Botão de chat visível: ${isVisible}`);
        console.log(`Botão de chat desabilitado: ${isDisabled}`);

        if (isVisible && !isDisabled) {
          console.log('✅ SUCESSO: Botão de chat habilitado');
        } else {
          console.log('❌ FALHA: Botão de chat não habilitado');
        }
      } else {
        console.log('Nenhuma estação encontrada');
      }
    } else {
      console.log('Nenhum candidato encontrado na busca');
    }

  } catch (error) {
    console.error('Erro durante o teste:', error);
  } finally {
    await browser.close();
  }
})();