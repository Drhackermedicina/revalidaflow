import { test, expect } from '@playwright/test';

test.describe('Login Test', () => {
  test('should test login page and Google login button', async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:5178/login');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Take screenshot before interaction
    await page.screenshot({ path: 'test-results/login-before.png' });

    // Check if login page loaded
    await expect(page).toHaveTitle(/REVALIDA/);

    // Look for Google login button
    const googleButton = page.locator('button:has-text("Google")').or(
      page.locator('button:has-text("Entrar com Google")').or(
        page.locator('.v-btn:has-text("Google")').or(
          page.locator('[data-testid="google-login"]')
        )
      )
    );

    // Check if Google login button exists
    const buttonExists = await googleButton.count() > 0;
    console.log('Google button found:', buttonExists);

    if (buttonExists) {
      // Take screenshot of button
      await googleButton.first().screenshot({ path: 'test-results/google-button.png' });

      // Try to click the button
      console.log('Clicking Google login button...');
      await googleButton.first().click();

      // Wait a bit to see what happens
      await page.waitForTimeout(3000);

      // Take screenshot after click
      await page.screenshot({ path: 'test-results/login-after-click.png' });

      // Check for any error messages
      const errorElements = await page.locator('.error, .v-alert--type-error, [role="alert"]').all();
      if (errorElements.length > 0) {
        console.log('Errors found:', errorElements.length);
        for (const error of errorElements) {
          const text = await error.textContent();
          console.log('Error text:', text);
        }
      }

      // Check console for errors
      page.on('console', msg => {
        if (msg.type() === 'error') {
          console.log('Console error:', msg.text());
        }
      });

    } else {
      console.log('Google login button not found');

      // Let's see what buttons are available
      const allButtons = await page.locator('button').all();
      console.log('Found buttons:', allButtons.length);

      for (const button of allButtons) {
        const text = await button.textContent();
        console.log('Button text:', text?.trim());
      }
    }

    // Final screenshot
    await page.screenshot({ path: 'test-results/login-final.png' });
  });
});