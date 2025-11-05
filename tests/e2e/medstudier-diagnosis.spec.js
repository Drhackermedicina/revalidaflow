import { test } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.use({ headless: false }); // Executar em modo não headless para permitir login

test('diagnosticar estrutura da página MedStudier', async ({ page }) => {
  // Configurar o navegador para aceitar cookies e permitir login
  await page.context().clearCookies();
  
  // Navegar para a página inicial do MedStudier
  console.log('Navegando para https://medstudier.com/app...');
  await page.goto('https://medstudier.com/app');
  
  // Esperar um pouco para a página carregar
  await page.waitForTimeout(5000);
  
  // Tirar screenshot inicial para ver o estado da página
  await page.screenshot({
    path: 'tests/test-results/medstudier-diagnosis-initial.png',
    fullPage: true
  });
  
  // Verificar se o usuário precisa fazer login
  const needsLogin = await page.locator('input[type="email"], input[type="password"], .login-form, [data-testid="login"], button:has-text("Sign in"), button:has-text("Login"), button:has-text("Fazer login")').count() > 0;
  
  if (needsLogin) {
    console.log('Usuário precisa fazer login. Pulando etapa de login e indo direto para a página de checklist...');
    // Tentar acessar diretamente a página de checklist para ver o que acontece
  } else {
    console.log('Usuário já está logado ou página carregou.');
  }
  
  // Navegar para a página de checklist-bank
  console.log('Navegando para a página de checklist-bank...');
  await page.goto('https://medstudier.com/app/checklist-bank');
  
  // Esperar mais tempo para a página carregar completamente
  console.log('Aguardando carregamento da página...');
  await page.waitForTimeout(15000); // Aumentado para 15 segundos
  
  // Verificar se a página carregou corretamente
  const pageTitle = await page.title();
  console.log(`Título da página: ${pageTitle}`);
  
  // Adicionar logs para diagnóstico
  console.log('Verificando estrutura da página...');
  
  // Verificar se há redirecionamento para página de login
  const currentUrl = page.url();
  console.log(`URL atual: ${currentUrl}`);
  
  // Verificar se a página contém elementos esperados
  const bodyText = await page.locator('body').textContent();
  console.log(`Conteúdo da página (primeiros 200 caracteres): ${bodyText ? bodyText.substring(0, 200) : 'Nenhum conteúdo'}`);
  
  // Tirar screenshot da página completa
  await page.screenshot({
    path: 'tests/test-results/medstudier-diagnosis-checklist-bank.png',
    fullPage: true
  });
  
  // Adicionar mais logs para diagnóstico da estrutura HTML
  console.log('Analisando estrutura HTML...');
  
  // Verificar se há elementos comuns na página
  const commonElements = ['div', 'h1', 'h2', 'h3', 'h4', 'span', 'p', 'a', 'button'];
  for (const tag of commonElements) {
    const count = await page.locator(tag).count();
    console.log(`Elementos <${tag}> encontrados: ${count}`);
  }
  
  // Verificar classes CSS comuns
  const commonClasses = ['card', 'station', 'checklist', 'item', 'list', 'grid', 'flex'];
  for (const className of commonClasses) {
    const count = await page.locator(`[class*="${className}"]`).count();
    console.log(`Elementos com classe contendo "${className}": ${count}`);
  }
  
  // Tentar encontrar todos os textos visíveis na página
  console.log('Extraindo todos os textos visíveis...');
  const allTexts = await page.locator('*:visible').allInnerTexts();
  const filteredTexts = allTexts.filter(text => text && text.trim && text.trim().length > 3);
  console.log(`Total de textos visíveis encontrados: ${filteredTexts.length}`);
  console.log('Primeiros 20 textos visíveis:');
  filteredTexts.slice(0, 20).forEach((text, index) => {
    console.log(`${index + 1}. ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`);
  });
  
  // Salvar diagnóstico em formato JSON
  const diagnosisData = {
    timestamp: new Date().toISOString(),
    url: currentUrl,
    pageTitle: pageTitle,
    needsLogin: needsLogin,
    elementCounts: {},
    visibleTexts: filteredTexts.slice(0, 50), // Salvar os primeiros 50 textos
    totalVisibleTexts: filteredTexts.length
  };
  
  // Contar elementos para diagnóstico
  for (const tag of commonElements) {
    const count = await page.locator(tag).count();
    diagnosisData.elementCounts[tag] = count;
  }
  
  for (const className of commonClasses) {
    const count = await page.locator(`[class*="${className}"]`).count();
    diagnosisData.elementCounts[`class-${className}`] = count;
  }
  
  // Garantir que o diretório de resultados existe
  const resultsDir = path.dirname('tests/test-results/medstudier-diagnosis.json');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  
  fs.writeFileSync(
    'tests/test-results/medstudier-diagnosis.json',
    JSON.stringify(diagnosisData, null, 2)
  );
  
  console.log('Diagnóstico salvo em tests/test-results/medstudier-diagnosis.json');
  console.log('Screenshot salvo em tests/test-results/medstudier-diagnosis-checklist-bank.png');
  
  console.log('=== RESUMO DO DIAGNÓSTICO ===');
  console.log(`URL atual: ${currentUrl}`);
  console.log(`Título da página: ${pageTitle}`);
  console.log(`Precisa de login: ${needsLogin}`);
  console.log(`Total de textos visíveis: ${filteredTexts.length}`);
  console.log(`Elementos <div>: ${diagnosisData.elementCounts.div}`);
  console.log(`Elementos <h1>: ${diagnosisData.elementCounts.h1}`);
  console.log(`Elementos <h2>: ${diagnosisData.elementCounts.h2}`);
  console.log(`Elementos <h3>: ${diagnosisData.elementCounts.h3}`);
  console.log(`Elementos com classe "card": ${diagnosisData.elementCounts['class-card']}`);
  console.log(`Elementos com classe "station": ${diagnosisData.elementCounts['class-station']}`);
  console.log(`Elementos com classe "checklist": ${diagnosisData.elementCounts['class-checklist']}`);
});
