import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.use({ 
  headless: false, // Executar em modo não headless
});

test('extrair estações da página já aberta', async ({}) => {
  // Conectar ao navegador Chrome existente
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
  console.log('URL atual:', page.url());
  
  // Tirar screenshot inicial
  await page.screenshot({
    path: 'tests/test-results/medstudier-extract-now-initial.png',
    fullPage: true
  });
  
  // Seletores específicos baseados na análise visual do screenshot
  const selectors = [
    // Seletores para cards de estações
    '.MuiCardHeader-title',
    '.MuiTypography-h6',
    '.MuiTypography-h5',
    'h3',
    'h4',
    '.card-title',
    '.station-name',
    '.checklist-title',
    '[data-testid*="station"]',
    '[data-testid*="checklist"]',
    // Seletores mais específicos para o layout do MedStudier
    'div[class*="MuiCardHeader"] > div[class*="MuiTypography"]',
    'div[class*="MuiCardContent"] > h3',
    'div[class*="MuiCardContent"] > h4',
    'a[href*="station"]',
    'a[href*="checklist"]',
    // XPath alternativos
    'xpath=//div[contains(@class, "MuiCardHeader")]//div[contains(@class, "MuiTypography")]',
    'xpath=//h3',
    'xpath=//h4',
    'xpath=//div[contains(@class, "title")]',
    'xpath=//div[contains(@class, "name")]',
  ];
  
  console.log('Procurando estações com seletores específicos...');
  
  let stations = [];
  let workingSelector = null;
  
  for (const selector of selectors) {
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
            text.length > 2 && 
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
            !text.match(/^[a-zA-Z]$/) && // Apenas uma letra
            !text.toLowerCase().includes('checklist bank') &&
            !text.toLowerCase().includes('search') &&
            !text.toLowerCase().includes('filter')
          );
          
          if (filteredTexts.length > 0) {
            stations = filteredTexts;
            workingSelector = selector;
            console.log(`Seletor funcionando: ${selector} - ${filteredTexts.length} estações encontradas`);
            console.log('Estações:', filteredTexts);
            break;
          }
        }
      }
    } catch (error) {
      console.log(`Erro com seletor ${selector}: ${error.message}`);
    }
  }
  
  // Se ainda não encontrou, tentar abordagem mais ampla
  if (stations.length === 0) {
    console.log('Tentando abordagem mais ampla...');
    
    // Procurar todos os textos na página
    const allTexts = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      const texts = [];
      
      for (const element of elements) {
        const text = element.textContent?.trim();
        if (text && 
            text.length > 2 && 
            text.length < 50 &&
            !text.includes('\n') &&
            element.children.length === 0) { // Elementos folga
          texts.push(text);
        }
      }
      
      return [...new Set(texts)]; // Remover duplicatas
    });
    
    console.log(`Total de textos encontrados: ${allTexts.length}`);
    
    // Filtrar manualmente baseado nos nomes conhecidos
    const knownStations = [
      'Anatomy', 'Physiology', 'Biochemistry', 'Pharmacology', 
      'Pathology', 'Microbiology', 'Immunology', 'Genetics',
      'Histology', 'Embryology', 'Neuroanatomy', 'Clinical Skills'
    ];
    
    stations = allTexts.filter(text => 
      knownStations.some(station => 
        text.toLowerCase().includes(station.toLowerCase()) ||
        station.toLowerCase().includes(text.toLowerCase())
      )
    );
    
    if (stations.length > 0) {
      workingSelector = 'manual-filter';
      console.log(`Estações encontradas por filtro manual: ${stations.length}`);
    }
  }
  
  // Remover duplicatas
  const uniqueStations = [...new Set(stations)];
  
  console.log(`Total de estações únicas encontradas: ${uniqueStations.length}`);
  console.log('Estações finais:', uniqueStations);
  
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
    path: 'tests/test-results/medstudier-extract-now-final.png',
    fullPage: true
  });
  
  // Fechar conexão
  await browser.close();
  
  // Verificar se encontramos estações
  expect(uniqueStations.length).toBeGreaterThan(0);
  
  console.log('Extração concluída com sucesso!');
});