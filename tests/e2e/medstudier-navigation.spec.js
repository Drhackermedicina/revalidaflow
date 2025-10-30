import { test, expect } from '@playwright/test';

test('navegar para MedStudier chat e verificar autenticação', async ({ page }) => {
  // URL específica fornecida
  const url = 'https://medstudier.com/app/checklist/ai/chat/9d3241da-abbe-4fd6-a738-a9a295bd33ae/conversations/a0398ec6-5839-429e-8f7f-18cdd382e086/schedules/1aef03cb-4f3f-4a03-834a-5036866d2dae';
  
  // Navegar para a URL
  await page.goto(url);
  
  // Esperar um pouco para a página carregar completamente
  await page.waitForTimeout(3000);
  
  // Tirar screenshot da página
  await page.screenshot({ 
    path: 'tests/test-results/medstudier-page.png',
    fullPage: true 
  });
  
  // Verificar se há elementos que indicam tela de login
  const loginElements = [
    'input[type="email"]',
    'input[type="password"]',
    'button[type="submit"]',
    '[data-testid="login"]',
    '.login-form',
    '#login'
  ];
  
  let hasLoginForm = false;
  for (const selector of loginElements) {
    try {
      const element = await page.$(selector);
      if (element) {
        hasLoginForm = true;
        console.log(`Elemento de login encontrado: ${selector}`);
        break;
      }
    } catch (error) {
      // Continuar para o próximo seletor
    }
  }
  
  // Verificar se há elementos de chat
  const chatElements = [
    '.chat-container',
    '[data-testid="chat"]',
    '.message-container',
    '.conversation',
    '#chat'
  ];
  
  let hasChatElements = false;
  for (const selector of chatElements) {
    try {
      const element = await page.$(selector);
      if (element) {
        hasChatElements = true;
        console.log(`Elemento de chat encontrado: ${selector}`);
        break;
      }
    } catch (error) {
      // Continuar para o próximo seletor
    }
  }
  
  // Log do resultado
  console.log(`URL acessada: ${url}`);
  console.log(`Título da página: ${await page.title()}`);
  console.log(`Formulário de login encontrado: ${hasLoginForm}`);
  console.log(`Elementos de chat encontrados: ${hasChatElements}`);
  
  // Tirar um print do conteúdo da página para análise
  const pageContent = await page.content();
  console.log('Conteúdo da página (primeiros 500 caracteres):');
  console.log(pageContent.substring(0, 500));
});