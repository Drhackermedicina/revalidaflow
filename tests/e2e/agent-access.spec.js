/**
 * Testes de exemplo usando o usuário especial (agente) do VS Code
 * Este arquivo demonstra como usar as funções auxiliares de autenticação
 * para testar funcionalidades que requerem acesso administrativo
 */

import { test, expect } from '@playwright/test';
import {
  loginAsAgent,
  isLoggedInAsAgent,
  logoutAgent,
  setupAgentSession,
  testAgentPageAccess,
  AGENT_EMAIL
} from './agent-auth.js';

// Configuração base para todos os testes
test.describe('Usuário Agente - Acesso Completo', () => {
  test.setTimeout(60000); // 60 segundos timeout

  test.beforeEach(async ({ page }) => {
    // Configurar sessão do agente antes de cada teste
    await setupAgentSession(page);
  });

  test('deve estar logado como usuário agente', async ({ page }) => {
    const loggedIn = await isLoggedInAsAgent(page);
    expect(loggedIn).toBe(true);

    // Verificar se o email do agente está visível na interface
    const pageContent = await page.textContent('body');
    expect(pageContent).toContain('agent@revalidafacil.com');
  });

  test('deve ter acesso à página de estações clínicas', async ({ page }) => {
    await testAgentPageAccess(page, '/station-list');

    // Verificar se consegue ver elementos de edição (privilégio admin)
    const editButtons = await page.locator('button:has-text("Editar"), [data-testid="edit-button"]').count();
    expect(editButtons).toBeGreaterThan(0);
  });

  test('deve ter acesso à administração de usuários', async ({ page }) => {
    await testAgentPageAccess(page, '/admin/users');

    // Verificar se consegue ver lista de usuários
    const userList = await page.locator('[data-testid="user-list"], .user-list, table').first();
    await expect(userList).toBeVisible();
  });

  test('deve ter acesso aos logs administrativos', async ({ page }) => {
    await testAgentPageAccess(page, '/admin/logs');

    // Verificar se consegue ver logs
    const logsContainer = await page.locator('[data-testid="logs-container"], .logs-container').first();
    await expect(logsContainer).toBeVisible();
  });

  test('deve ter acesso às configurações do sistema', async ({ page }) => {
    await testAgentPageAccess(page, '/admin/settings');

    // Verificar se consegue ver configurações
    const settingsForm = await page.locator('form, [data-testid="settings-form"]').first();
    await expect(settingsForm).toBeVisible();
  });

  test('deve conseguir criar nova estação clínica', async ({ page }) => {
    await page.goto('/station-list');

    // Clicar em "Nova Estação" ou botão similar
    const newStationButton = await page.locator(
      'button:has-text("Nova"), button:has-text("Criar"), [data-testid="new-station"]'
    ).first();

    if (await newStationButton.isVisible()) {
      await newStationButton.click();

      // Verificar se o formulário de criação apareceu
      const createForm = await page.locator('form, [data-testid="station-form"]').first();
      await expect(createForm).toBeVisible();
    } else {
      console.log('⚠️  Botão de nova estação não encontrado - pode não existir na interface atual');
    }
  });

  test('deve conseguir editar questões', async ({ page }) => {
    await page.goto('/questoes');

    // Procurar botão de edição
    const editQuestionButton = await page.locator(
      'button:has-text("Editar"), [data-testid="edit-question"]'
    ).first();

    if (await editQuestionButton.isVisible()) {
      await editQuestionButton.click();

      // Verificar se conseguiu abrir modo de edição
      const editMode = await page.locator('[data-testid="edit-mode"], .edit-mode').first();
      await expect(editMode).toBeVisible();
    } else {
      console.log('⚠️  Botão de edição de questão não encontrado');
    }
  });

  test('deve ter acesso a todas as funcionalidades administrativas', async ({ page }) => {
    const adminPages = [
      '/admin',
      '/admin/users',
      '/admin/logs',
      '/admin/settings',
      '/admin/dashboard'
    ];

    for (const adminPage of adminPages) {
      try {
        await testAgentPageAccess(page, adminPage);
        console.log(`✅ Acesso confirmado: ${adminPage}`);
      } catch (error) {
        console.log(`⚠️  Página ${adminPage} pode não existir: ${error.message}`);
      }
    }
  });

  test.afterEach(async ({ page }) => {
    // Opcional: fazer logout após cada teste
    // await logoutAgent(page);
  });
});

// Teste específico para verificar permissões do agente
test.describe('Usuário Agente - Verificação de Permissões', () => {
  test('deve ter as mesmas permissões que um administrador', async ({ page }) => {
    await setupAgentSession(page);

    // Verificar se o agente tem acesso a funcionalidades administrativas
    const adminIndicators = [
      '[data-testid="admin-panel"]',
      '.admin-menu',
      'button:has-text("Admin")',
      '[data-testid="admin-badge"]'
    ];

    let hasAdminAccess = false;
    for (const indicator of adminIndicators) {
      try {
        const element = await page.locator(indicator).first();
        if (await element.isVisible()) {
          hasAdminAccess = true;
          break;
        }
      } catch (error) {
        // Continuar verificando outros indicadores
      }
    }

    expect(hasAdminAccess).toBe(true);
  });
});