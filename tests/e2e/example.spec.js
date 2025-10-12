
import { test, expect } from '@playwright/test';

test('homepage has title', async ({ page }) => {
    await page.goto('https://revalidafacilapp.com.br');
    await expect(page).toHaveTitle(/RevalidaFacil/);
});
