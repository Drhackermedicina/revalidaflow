import { test, expect } from '@playwright/test';

test.describe('Undo System Tests', () => {
  test('should properly undo changes without losing loaded data', async ({ page }) => {
    // Navegar para a aplicação local (porta do Vite detectada)
    await page.goto('http://localhost:5174');

    // Fazer login (assumindo que há um fluxo de login)
    // TODO: Implementar login se necessário

    // Navegar para uma estação específica para editar
    // Usando um ID de estação que sabemos que existe
    await page.goto('http://localhost:5173/app/edit-station/test-station-id');

    // Aguardar a página carregar completamente
    await page.waitForLoadState('networkidle');

    // Verificar se a página de edição carregou
    await expect(page).toHaveURL(/edit-station/);

    // Aguardar o carregamento dos dados da estação
    await page.waitForTimeout(2000); // Tempo para loadStationIntoForm executar

    // Encontrar um campo editável (exemplo: título da estação)
    const titleField = page.locator('input[name="titulo"]').or(page.locator('[data-testid="station-title"]')).first();

    // Verificar se o campo tem algum valor carregado (não vazio)
    const initialValue = await titleField.inputValue();
    expect(initialValue).not.toBe('');

    // Fazer uma alteração no campo
    const newValue = initialValue + ' - Edited';
    await titleField.fill(newValue);

    // Aguardar o snapshot ser salvo
    await page.waitForTimeout(500);

    // Verificar se o botão undo está disponível
    const undoButton = page.locator('[data-testid="undo-btn"]').or(page.locator('button:has-text("Undo")')).first();
    await expect(undoButton).toBeVisible();

    // Clicar no botão undo
    await undoButton.click();

    // Aguardar a operação de undo
    await page.waitForTimeout(500);

    // Verificar se o valor voltou ao original (não vazio)
    const revertedValue = await titleField.inputValue();
    expect(revertedValue).toBe(initialValue);
    expect(revertedValue).not.toBe(''); // Importante: não deve estar vazio
  });

  test('should maintain undo stack after save', async ({ page }) => {
    await page.goto('http://localhost:5174/app/edit-station/test-station-id');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Fazer uma alteração
    const titleField = page.locator('input[name="titulo"]').first();
    const initialValue = await titleField.inputValue();
    await titleField.fill(initialValue + ' - Test');

    // Salvar as alterações
    const saveButton = page.locator('[data-testid="save-btn"]').or(page.locator('button:has-text("Salvar")')).first();
    await saveButton.click();

    // Aguardar o salvamento
    await page.waitForTimeout(1000);

    // Verificar se o undo stack foi resetado (botão undo deve estar desabilitado ou não existir)
    const undoButton = page.locator('[data-testid="undo-btn"]').or(page.locator('button:has-text("Undo")')).first();
    const isUndoDisabled = await undoButton.isDisabled().catch(() => true); // Se não existir, catch retorna true
    expect(isUndoDisabled).toBe(true);
  });
});