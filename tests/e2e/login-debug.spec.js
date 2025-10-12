import { test, expect } from '@playwright/test';

test.describe('Login Debug Test', () => {
  test('should capture login errors and detailed behavior', async ({ page }) => {
    const consoleMessages = [];
    const errors = [];

    // Capture console messages
    page.on('console', msg => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
        timestamp: new Date().toISOString()
      });
      if (msg.type() === 'error') {
        console.log('🔴 Console Error:', msg.text());
      }
    });

    // Capture page errors
    page.on('pageerror', err => {
      errors.push({
        message: err.message,
        stack: err.stack,
        timestamp: new Date().toISOString()
      });
      console.log('🔴 Page Error:', err.message);
    });

    // Navigate to login page
    console.log('🌐 Navigating to login page...');
    await page.goto('http://localhost:5179/login');

    // Wait for page to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Take screenshot before interaction
    await page.screenshot({ path: 'test-results/debug-before.png' });

    // Check if login page loaded
    console.log('🔍 Checking page title...');
    await expect(page).toHaveTitle(/REVALIDA/);

    // Look for Google login button
    console.log('🔍 Looking for Google login button...');
    const googleButton = page.locator('button:has-text("Google")').or(
      page.locator('button:has-text("Entrar com Google")').or(
        page.locator('.v-btn:has-text("Google")').or(
          page.locator('[data-testid="google-login"]')
        )
      )
    );

    const buttonExists = await googleButton.count() > 0;
    console.log('✅ Google button found:', buttonExists);

    if (buttonExists) {
      // Check button state before click
      const isEnabled = await googleButton.first().isEnabled();
      const isVisible = await googleButton.first().isVisible();
      console.log('📊 Button state - Enabled:', isEnabled, 'Visible:', isVisible);

      // Take screenshot of button
      await googleButton.first().screenshot({ path: 'test-results/debug-button.png' });

      console.log('🖱️  Clicking Google login button...');
      await googleButton.first().click();

      // Wait and observe what happens
      console.log('⏳ Waiting for response...');
      await page.waitForTimeout(5000);

      // Take screenshot after click
      await page.screenshot({ path: 'test-results/debug-after-click.png' });

      // Check for popup windows
      const popupPromise = page.waitForEvent('popup', { timeout: 3000 }).catch(() => null);
      const popup = await popupPromise;

      if (popup) {
        console.log('🪟 Popup window detected!');
        await popup.screenshot({ path: 'test-results/debug-popup.png' });
        await popup.close();
      } else {
        console.log('❌ No popup window detected');
      }

      // Check for navigation
      const currentUrl = page.url();
      console.log('🔗 Current URL:', currentUrl);

      // Check for loading states
      const loadingElements = await page.locator('.loading, .v-progress-linear, .v-progress-circular, [role="progressbar"]').count();
      console.log('⏳ Loading elements found:', loadingElements);

      // Check for error messages
      const errorElements = await page.locator('.error, .v-alert--type-error, [role="alert"], .v-messages__message').all();
      if (errorElements.length > 0) {
        console.log('🔴 Error elements found:', errorElements.length);
        for (let i = 0; i < errorElements.length; i++) {
          const text = await errorElements[i].textContent();
          console.log(`🔴 Error ${i + 1}:`, text?.trim());
        }
      } else {
        console.log('✅ No visible error messages');
      }

      // Final wait to see if anything happens
      console.log('⏳ Final wait...');
      await page.waitForTimeout(3000);

    } else {
      console.log('❌ Google login button not found');
    }

    // Final screenshot
    await page.screenshot({ path: 'test-results/debug-final.png' });

    // Log summary
    console.log('📋 SUMMARY:');
    console.log('📋 Console messages:', consoleMessages.length);
    console.log('📋 Page errors:', errors.length);

    // Output console errors
    const consoleErrors = consoleMessages.filter(msg => msg.type === 'error');
    if (consoleErrors.length > 0) {
      console.log('🔴 CONSOLE ERRORS:');
      consoleErrors.forEach((error, index) => {
        console.log(`🔴 ${index + 1}. ${error.text}`);
      });
    }

    // Output page errors
    if (errors.length > 0) {
      console.log('🔴 PAGE ERRORS:');
      errors.forEach((error, index) => {
        console.log(`🔴 ${index + 1}. ${error.message}`);
      });
    }
  });
});