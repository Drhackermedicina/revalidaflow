import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.use({ headless: false }); // Executar em modo não headless para permitir login manual

test('extrair lista de estações de checklist do MedStudier (simples)', async ({ page }) => {
  // Navegar diretamente para a página de checklist-bank
  console.log('Navegando para https://medstudier.com/app/checklist-bank...');
  await page.goto('https://medstudier.com/app/checklist-bank');
  
  // Esperar mais tempo para a página carregar completamente
  console.log('Aguardando carregamento da página...');
  await page.waitForTimeout(15000);
  
  // Verificar se a página carregou corretamente
  const pageTitle = await page.title();
  console.log(`Título da página: ${pageTitle}`);
  
  // Tirar screenshot da página completa
  await page.screenshot({
    path: 'tests/test-results/medstudier-checklist-simple.png',
    fullPage: true
  });
  
  // Tentar diferentes seletores para encontrar as estações
  const possibleSelectors = [
    '.station-name',
    '.station-title',
    '.checklist-station',
    '.station-item',
    'h3',
    '.card-title',
    '.list-item',
    '[data-testid="station-name"]',
    '.station-card h3',
    '.checklist-item h3',
    '.station-list-item',
    '.title',
    '.name',
    '.label',
    '.text',
    'div[class*="station"]',
    'div[class*="checklist"]',
    'div[class*="item"]'
  ];
  
  let stationNames = [];
  let successfulSelector = null;
  
  // Tentar cada seletor até encontrar elementos
  for (const selector of possibleSelectors) {
    try {
      const elements = await page.locator(selector).all();
      if (elements.length > 0) {
        console.log(`Usando seletor: ${selector}`);
        console.log(`Encontrados ${elements.length} elementos potenciais`);
        
        // Extrair o texto de cada elemento
        const texts = await Promise.all(elements.map(async element => {
          const text = await element.textContent();
          return text ? text.trim() : '';
        }));
        
        // Filtrar textos vazios e muito curtos (provavelmente não são nomes de estações)
        const filteredTexts = texts.filter(text => text.length > 3);
        
        if (filteredTexts.length > 0) {
          stationNames = filteredTexts;
          successfulSelector = selector;
          console.log(`Extraídos ${stationNames.length} nomes de estações usando o seletor: ${selector}`);
          break;
        }
      }
    } catch (error) {
      console.log(`Erro ao usar seletor ${selector}: ${error.message}`);
    }
  }
  
  // Se não encontrou com os seletores específicos, tentar uma abordagem mais ampla
  if (stationNames.length === 0) {
    console.log('Tentando abordagem mais ampla para encontrar estações...');
    
    // Procurar por elementos que contenham palavras-chave relacionadas a estações
    const keywords = ['station', 'checklist', 'estaç', 'post', 'posto', 'abdom', 'cardio', 'respir', 'neuro', 'musculo'];
    const allElements = await page.locator('*').all();
    
    for (const element of allElements) {
      try {
        const text = await element.textContent();
        if (text && text.trim().length > 3) {
          const lowerText = text.toLowerCase();
          if (keywords.some(keyword => lowerText.includes(keyword))) {
            stationNames.push(text.trim());
          }
        }
      } catch (error) {
        // Ignorar erros ao acessar elementos
      }
    }
    
    // Remover duplicatas
    stationNames = [...new Set(stationNames)];
    console.log(`Abordagem ampla encontrou ${stationNames.length} potenciais estações`);
  }
  
  // Salvar os dados em formato JSON
  const resultData = {
    timestamp: new Date().toISOString(),
    url: 'https://medstudier.com/app/checklist-bank',
    selector: successfulSelector,
    stationCount: stationNames.length,
    stations: stationNames
  };
  
  // Garantir que o diretório de resultados existe
  const resultsDir = path.dirname('tests/test-results/medstudier-stations-simple.json');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  
  fs.writeFileSync(
    'tests/test-results/medstudier-stations-simple.json',
    JSON.stringify(resultData, null, 2)
  );
  
  console.log(`Dados salvos em tests/test-results/medstudier-stations-simple.json`);
  console.log(`Screenshot salvo em tests/test-results/medstudier-checklist-simple.png`);
  console.log(`Total de estações encontradas: ${stationNames.length}`);
  
  // Exibir as primeiras 10 estações encontradas
  if (stationNames.length > 0) {
    console.log('Primeiras 10 estações encontradas:');
    stationNames.slice(0, 10).forEach((station, index) => {
      console.log(`${index + 1}. ${station}`);
    });
    
    if (stationNames.length > 10) {
      console.log(`... e mais ${stationNames.length - 10} estações`);
    }
  } else {
    console.log('Nenhuma estação foi encontrada. Verifique o screenshot para análise.');
  }
  
  console.log('=== RESUMO DA EXTRAÇÃO ===');
  console.log(`Total de estações encontradas: ${stationNames.length}`);
  if (stationNames.length > 0) {
    console.log('Lista de estações:');
    stationNames.forEach((station, index) => {
      console.log(`${index + 1}. ${station}`);
    });
  } else {
    console.log('Nenhuma estação encontrada. Verifique os screenshots para análise.');
  }
});