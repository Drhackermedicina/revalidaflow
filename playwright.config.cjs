const fs = require('fs');
const path = require('path');

// Função para ler o wsEndpoint dinamicamente
function getWsEndpoint() {
  try {
    const endpointPath = path.join(__dirname, 'chrome-debug-endpoint.json');
    if (fs.existsSync(endpointPath)) {
      // Ler o arquivo e remover BOM se presente
      let content = fs.readFileSync(endpointPath, 'utf8');
      // Remover BOM (Byte Order Mark) se estiver presente
      if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
      }
      const endpointData = JSON.parse(content);
      console.log(`WebSocket endpoint lido: ${endpointData.wsEndpoint}`);
      return endpointData.wsEndpoint;
    }
  } catch (error) {
    console.error('Erro ao ler o endpoint WebSocket:', error.message);
  }
  
  // Fallback para o endpoint hardcoded se o arquivo não existir
  console.log('AVISO: Usando endpoint WebSocket fallback. Execute o script start-chrome-debug.ps1 primeiro.');
  return 'ws://localhost:9223/devtools/page/EE03C758263833FF854D94F08C40BE1D';
}

module.exports = {
  testDir: 'tests/e2e',
  testMatch: '**/*.spec.js',
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    port: 5173,
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...require('@playwright/test').devices['Desktop Chrome'] },
    },
    {
      name: 'Google Chrome',
      use: {
        ...require('@playwright/test').devices['Desktop Chrome'],
        launchOptions: {
          executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe'
        },
        connectOptions: {
          wsEndpoint: getWsEndpoint()
        }
      },
    },
    {
      name: 'Opera GX',
      use: {
        ...require('@playwright/test').devices['Desktop Chrome'],
        launchOptions: {
          executablePath: 'C:/Users/helli/AppData/Local/Programs/Opera GX/opera.exe',
          args: [
            '--disable-features=VizDisplayCompositor',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-web-security',
            '--disable-extensions',
            '--no-first-run',
            '--disable-default-apps'
          ]
        }
      },
    },
    {
      name: 'Chrome with Profile',
      use: {
        ...require('@playwright/test').devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--disable-dev-shm-usage',
            '--disable-extensions',
            '--no-first-run',
            '--disable-default-apps',
            '--disable-infobars'
          ]
        }
      },
    },
    {
      name: 'firefox',
      use: { ...require('@playwright/test').devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...require('@playwright/test').devices['Desktop Safari'] },
    },
  ],
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 30000,
  expect: {
    timeout: 10000,
  },
};
