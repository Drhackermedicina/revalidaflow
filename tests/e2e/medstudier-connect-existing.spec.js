import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.use({ 
  headless: false, // Executar em modo não headless
  // Conectar a um navegador Chrome existente em vez de criar um novo
});

test('conectar ao Chrome existente e extrair estações', async ({}) => {
  // Conectar a um navegador Chrome existente com debugging
  const browser = await test.chromium.connectOverCDP('http://localhost:9223');
  
  // Obter o contexto e a página existentes
  const contexts = browser.contexts();
  let page;
  
  if (contexts.length > 0) {
    const context = contexts[0];
    const pages = context.pages();
    if (pages.length > 0) {
      page = pages[0];
    } else {
      page = await context.newPage();
    }
  } else {
    const context = await browser.newContext();
    page = await context.newPage();
  }
  
  console.log('Conectado ao navegador existente');
  
  // Verificar se já está na página do MedStudier
  const currentUrl = page.url();
  console.log('URL atual:', currentUrl);
  
  if (!currentUrl.includes('medstudier.com')) {
    console.log('Navegando para https://medstudier.com/app...');
    await page.goto('https://medstudier.com/app');
    await page.waitForTimeout(5000);
  }
  
  // Tirar screenshot para ver o estado atual
  await page.screenshot({
    path: 'tests/test-results/medstudier-connected-state.png',
    fullPage: true
  });
  
  // Verificar se está logado
  const isLoggedIn = await page.locator('text=Checklist Bank, text=Dashboard, text=Profile, text=Logout').count() > 0;
  
  if (!isLoggedIn) {
    console.log('Usuário não está logado. Por favor, faça login manualmente no navegador existente.');
    console.log('Use: hellitoncechinel90@gmail.com / perereca140290');
    console.log('Após fazer o login, pressione Enter no terminal para continuar...');
    
    // Aguardar input do usuário
    await new Promise(resolve => {
      process.stdin.once('data', () => {
        resolve();
      });
    });
  }
  
  console.log('Verificando se está na página de checklist...');
  
  // Tentar navegar para a página de checklist
  const hasChecklistLink = await page.locator('text=Checklist Bank, a:has-text("checklist"), [href*="checklist"]').count() > 0;
  
  if (hasChecklistLink) {
    await page.click('text=Checklist Bank, a:has-text("checklist"), [href*="checklist"]');
    await page.waitForTimeout(3000);
  } else {
    // Tentar URLs diretas
    const possibleUrls = [
      'https://medstudier.com/app/checklist-bank',
      'https://medstudier.com/checklist-bank',
      'https://medstudier.com/app/checklists'
    ];
    
    for (const url of possibleUrls) {
      console.log(`Tentando acessar: ${url}`);
      await page.goto(url);
      await page.waitForTimeout(3000);
      
      // Verificar se funcionou
      const hasContent = await page.locator('body').count() > 0;
      if (hasContent) {
        break;
      }
    }
  }
  
  // Tirar screenshot da página de checklist
  await page.screenshot({
    path: 'tests/test-results/medstudier-checklist-page.png',
    fullPage: true
  });
  
  // Lista de possíveis seletores para encontrar as estações
  const possibleSelectors = [
    // Seletores baseados nos screenshots anteriores
    '.card-title',
    '.station-name',
    '.checklist-title',
    '[data-testid*="station"]',
    '[data-testid*="checklist"]',
    'h3',
    'h4',
    '.title',
    '.name',
    'a[href*="station"]',
    'a[href*="checklist"]',
    // Seletores mais genéricos
    '.MuiCardHeader-title',
    '.MuiTypography-h6',
    '.MuiTypography-h5',
    '.MuiListItemText-primary',
    // XPath alternativos
    'xpath=//h3',
    'xpath=//h4',
    'xpath=//div[contains(@class, "title")]',
    'xpath=//div[contains(@class, "name")]',
    'xpath=//a[contains(@href, "station")]',
    'xpath=//a[contains(@href, "checklist")]',
  ];
  
  console.log('Procurando estações com múltiplos seletores...');
  
  let stations = [];
  let workingSelector = null;
  
  for (const selector of possibleSelectors) {
    try {
      console.log(`Tentando seletor: ${selector}`);
      
      let elements;
      if (selector.startsWith('xpath=')) {
        elements = await page.locator(selector).all();
      } else {
        elements = await page.locator(selector).all();
      }
      
      console.log(`Encontrados ${elements.length} elementos com ${selector}`);
      
      if (elements.length > 0) {
        const texts = [];
        for (const element of elements) {
          const text = await element.textContent();
          if (text && text.trim().length > 0) {
            texts.push(text.trim());
          }
        }
        
        console.log(`Textos encontrados: ${texts.slice(0, 5).join(', ')}${texts.length > 5 ? '...' : ''}`);
        
        if (texts.length > 0) {
          // Filtrar textos que parecem ser nomes de estações
          const filteredTexts = texts.filter(text => 
            text.length > 3 && 
            !text.toLowerCase().includes('login') &&
            !text.toLowerCase().includes('sign') &&
            !text.toLowerCase().includes('register') &&
            !text.toLowerCase().includes('home') &&
            !text.toLowerCase().includes('dashboard') &&
            !text.toLowerCase().includes('profile') &&
            !text.toLowerCase().includes('settings') &&
            !text.toLowerCase().includes('help') &&
            !text.toLowerCase().includes('about') &&
            !text.toLowerCase().includes('contact') &&
            !text.toLowerCase().includes('privacy') &&
            !text.toLowerCase().includes('terms') &&
            !text.toLowerCase().includes('copyright') &&
            !text.toLowerCase().includes('all rights') &&
            !text.match(/^\d+$/) && // Apenas números
            !text.match(/^[a-zA-Z]$/) // Apenas uma letra
          );
          
          if (filteredTexts.length > 0) {
            stations = filteredTexts;
            workingSelector = selector;
            console.log(`Seletor funcionando: ${selector} - ${filteredTexts.length} estações encontradas`);
            break;
          }
        }
      }
    } catch (error) {
      console.log(`Erro com seletor ${selector}: ${error.message}`);
    }
  }
  
  // Remover duplicatas
  const uniqueStations = [...new Set(stations)];
  
  console.log(`Total de estações únicas encontradas: ${uniqueStations.length}`);
  console.log('Estações:', uniqueStations.slice(0, 10));
  
  // Salvar resultado em JSON
  const result = {
    url: page.url(),
    timestamp: new Date().toISOString(),
    workingSelector,
    stationCount: uniqueStations.length,
    stations: uniqueStations
  };
  
  // Criar diretório se não existir
  const resultsDir = path.dirname('tests/test-results/medstudier-stations.json');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  
  fs.writeFileSync('tests/test-results/medstudier-stations.json', JSON.stringify(result, null, 2));
  
  console.log(`Resultado salvo em tests/test-results/medstudier-stations.json`);
  console.log(`Total de estações: ${uniqueStations.length}`);
  
  // Tirar screenshot final
  await page.screenshot({
    path: 'tests/test-results/medstudier-final-state.png',
    fullPage: true
  });
  
  // Fechar conexão
  await browser.close();
  
  // Verificar se encontramos estações
  expect(uniqueStations.length).toBeGreaterThan(0);
});