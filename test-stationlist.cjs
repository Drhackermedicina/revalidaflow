const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
      console.log(`[ERROR] ${msg.text()}`);
    }
  });

  page.on('pageerror', err => {
    errors.push(err.message);
    console.error(`[PAGE ERROR] ${err.message}`);
  });

  console.log('Navegando para http://localhost:5173...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 30000 });

  console.log('Aguardando 5 segundos para a página carregar completamente...');
  await page.waitForTimeout(5000);

  console.log('\n=== RESULTADO ===');
  if (errors.length === 0) {
    console.log('✅ SUCESSO: Nenhum erro encontrado no console!');
  } else {
    console.log(`❌ ERROS ENCONTRADOS: ${errors.length}`);
    errors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
  }

  await browser.close();
})();
