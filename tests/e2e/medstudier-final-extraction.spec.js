import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.use({ 
  headless: false, // Executar em modo não headless
});

test('extração final das estações médicas', async ({}) => {
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
    path: 'tests/test-results/medstudier-final-initial.png',
    fullPage: true
  });
  
  // Lista de estações médicas conhecidas (baseado no screenshot visual)
  const knownMedicalStations = [
    'Anatomy', 'Physiology', 'Biochemistry', 'Pharmacology', 
    'Pathology', 'Microbiology', 'Immunology', 'Genetics',
    'Histology', 'Embryology', 'Neuroanatomy', 'Clinical Skills',
    'Internal Medicine', 'Surgery', 'Pediatrics', 'Obstetrics & Gynecology',
    'Psychiatry', 'Dermatology', 'Ophthalmology', 'ENT',
    'Orthopedics', 'Anesthesiology', 'Radiology', 'Emergency Medicine',
    'Cardiology', 'Pulmonology', 'Gastroenterology', 'Nephrology',
    'Endocrinology', 'Hematology', 'Rheumatology', 'Infectious Diseases',
    'Oncology', 'Nephrology', 'Urology', 'Vascular Surgery'
  ];
  
  console.log('Procurando estações médicas específicas...');
  
  // Usar evaluate para extração direta do DOM
  const stations = await page.evaluate((knownStations) => {
    const foundStations = [];
    
    // Procurar em todos os elementos da página
    const allElements = document.querySelectorAll('*');
    
    for (const element of allElements) {
      const text = element.textContent?.trim();
      
      if (text && text.length > 2 && text.length < 50) {
        // Verificar se o texto corresponde a alguma estação médica conhecida
        for (const station of knownStations) {
          if (
            text.toLowerCase() === station.toLowerCase() ||
            text.toLowerCase().includes(station.toLowerCase()) ||
            station.toLowerCase().includes(text.toLowerCase())
          ) {
            foundStations.push(station); // Usar o nome padrão em inglês
            break; // Parar de verificar esta estação
          }
        }
      }
    }
    
    // Remover duplicatas
    return [...new Set(foundStations)];
  }, knownMedicalStations);
  
  console.log(`Estações médicas encontradas: ${stations.length}`);
  console.log('Estações:', stations);
  
  // Se não encontrou com método conhecido, tentar abordagem mais ampla
  if (stations.length === 0) {
    console.log('Tentando abordagem ampla para encontrar estações...');
    
    const broadStations = await page.evaluate(() => {
      const results = [];
      
      // Procurar por cards ou containers típicos
      const cards = document.querySelectorAll('[class*="card"], [class*="Card"], [class*="MuiCard"], div[class*="MuiPaper"]');
      
      for (const card of cards) {
        // Procurar títulos dentro dos cards
        const titles = card.querySelectorAll('h1, h2, h3, h4, h5, h6, [class*="title"], [class*="Title"]');
        
        for (const title of titles) {
          const text = title.textContent?.trim();
          if (text && text.length > 2 && text.length < 50) {
            // Verificar se parece ser nome de estação médica (palavras em inglês)
            const words = text.split(/\s+/);
            const hasEnglishWords = words.some(word => 
              word.length > 3 && 
              !word.match(/[àáâãéêíóõúç]/) && // Sem acentos
              !word.toLowerCase().includes('medicina') &&
              !word.toLowerCase().includes('consulta') &&
              !word.toLowerCase().includes('acidente') &&
              !word.toLowerCase().includes('procedimento')
            );
            
            if (hasEnglishWords) {
              results.push(text);
            }
          }
        }
      }
      
      // Remover duplicatas
      return [...new Set(results)];
    });
    
    stations.push(...broadStations);
  }
  
  // Remover duplicatas finais
  const uniqueStations = [...new Set(stations)];
  
  console.log(`Total de estações únicas: ${uniqueStations.length}`);
  console.log('Estações finais:', uniqueStations);
  
  // Salvar resultado em JSON
  const result = {
    url: page.url(),
    timestamp: new Date().toISOString(),
    method: 'final-medical-stations',
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
    path: 'tests/test-results/medstudier-final-final.png',
    fullPage: true
  });
  
  // Fechar conexão
  await browser.close();
  
  // Verificar se encontramos estações
  expect(uniqueStations.length).toBeGreaterThan(0);
  
  console.log('Extração final concluída com sucesso!');
});