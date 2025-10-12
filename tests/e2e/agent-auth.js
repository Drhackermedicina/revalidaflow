/**
 * Utilitários para autenticação com usuário especial (agente) no Playwright
 * Este arquivo contém funções auxiliares para facilitar os testes automatizados
 * usando o usuário especial agent@revalidafacil.com
 */

const AGENT_EMAIL = 'agent@revalidafacil.com';
const AGENT_PASSWORD = process.env.AGENT_PASSWORD || 'Pererec@140290';

/**
 * Faz login com o usuário especial (agente) no aplicativo
 * @param {import('@playwright/test').Page} page - Instância da página do Playwright
 * @param {string} baseURL - URL base do aplicativo (opcional)
 */
async function loginAsAgent(page, baseURL = 'http://localhost:5173') {
  console.log('🔐 Fazendo login como usuário agente...');

  // Navegar para a página de login
  await page.goto(`${baseURL}/login`);

  // Aguardar os campos de login carregarem
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.waitForSelector('input[type="password"]', { timeout: 10000 });

  // Preencher credenciais do usuário agente
  await page.fill('input[type="email"]', AGENT_EMAIL);
  await page.fill('input[type="password"]', AGENT_PASSWORD);

  // Clicar no botão de login
  await page.click('button[type="submit"], button:has-text("Entrar"), button:has-text("Login")');

  // Aguardar redirecionamento ou confirmação de login
  await page.waitForURL('**/dashboard', { timeout: 15000 });

  console.log('✅ Login como agente realizado com sucesso!');
}

/**
 * Verifica se o usuário está logado como agente
 * @param {import('@playwright/test').Page} page - Instância da página do Playwright
 * @returns {Promise<boolean>} - True se estiver logado como agente
 */
async function isLoggedInAsAgent(page) {
  try {
    // Verificar se existe algum indicador de usuário logado
    const userInfo = await page.locator('[data-testid="user-info"], .user-info, .navbar-user').first();
    if (await userInfo.isVisible()) {
      const userText = await userInfo.textContent();
      return userText.includes('agent@revalidafacil.com') || userText.includes('Agente');
    }

    // Verificar se estamos em uma página protegida (não redirecionados para login)
    const currentURL = page.url();
    return !currentURL.includes('/login') && !currentURL.includes('/register');
  } catch (error) {
    console.log('❌ Erro ao verificar login do agente:', error.message);
    return false;
  }
}

/**
 * Logout do usuário agente
 * @param {import('@playwright/test').Page} page - Instância da página do Playwright
 */
async function logoutAgent(page) {
  console.log('🚪 Fazendo logout do usuário agente...');

  try {
    // Procurar botão de logout
    const logoutButton = await page.locator(
      'button:has-text("Sair"), button:has-text("Logout"), [data-testid="logout-button"]'
    ).first();

    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      await page.waitForURL('**/login', { timeout: 5000 });
      console.log('✅ Logout realizado com sucesso!');
    } else {
      console.log('⚠️  Botão de logout não encontrado');
    }
  } catch (error) {
    console.log('❌ Erro ao fazer logout:', error.message);
  }
}

/**
 * Configuração global para testes com usuário agente
 * Use esta função no setup dos testes que precisam do usuário agente
 * @param {import('@playwright/test').Page} page - Instância da página do Playwright
 * @param {string} baseURL - URL base do aplicativo
 */
async function setupAgentSession(page, baseURL = 'http://localhost:3000') {
  // Verificar se já está logado como agente
  if (!(await isLoggedInAsAgent(page))) {
    await loginAsAgent(page, baseURL);
  }

  // Verificar permissões do agente
  await page.waitForSelector('[data-testid="admin-panel"], .admin-panel, .admin-menu', { timeout: 5000 });

  console.log('🎯 Sessão do agente configurada com sucesso!');
}

/**
 * Testa acesso a uma página específica como agente
 * @param {import('@playwright/test').Page} page - Instância da página do Playwright
 * @param {string} pagePath - Caminho da página a testar
 * @param {string} baseURL - URL base do aplicativo
 */
async function testAgentPageAccess(page, pagePath, baseURL = 'http://localhost:3000') {
  await setupAgentSession(page, baseURL);

  console.log(`🔍 Testando acesso à página: ${pagePath}`);
  await page.goto(`${baseURL}${pagePath}`);

  // Verificar se a página carregou sem erros
  const hasError = await page.locator('.error, [data-testid="error"]').isVisible();
  const isOnCorrectPage = page.url().includes(pagePath);

  if (hasError) {
    throw new Error(`❌ Erro ao acessar página ${pagePath}`);
  }

  if (!isOnCorrectPage) {
    throw new Error(`❌ Redirecionamento inesperado de ${pagePath}`);
  }

  console.log(`✅ Acesso à página ${pagePath} confirmado!`);
}

module.exports = {
  AGENT_EMAIL,
  AGENT_PASSWORD,
  loginAsAgent,
  isLoggedInAsAgent,
  logoutAgent,
  setupAgentSession,
  testAgentPageAccess
};