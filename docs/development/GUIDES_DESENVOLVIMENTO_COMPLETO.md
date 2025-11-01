# 🛠️ GUIA COMPLETO DE DESENVOLVIMENTO - REVALIDAFLOW

> **Documento atualizado em 2025-10-26** - Guia completo para desenvolvedores
>
 Este documento fornece um guia completo para desenvolvimento, setup, debugging e deploy do REVALIDAFLOW.

## 📋 Índice

- [🎯 Visão Geral](#-visão-geral)
- [🚀 Setup do Ambiente](#-setup-do-ambiente)
- [⚙️ Configuração do Projeto](#️-configuração-do-projeto)
- [🛠️ Scripts de Desenvolvimento](#️-scripts-de-desenvolvimento)
- [🔧 Arquitetura e Estrutura](#-arquitetura-e-estrutura)
- [🧪 Testes e Qualidade](#-testes-e-qualidade)
- [🐛 Debugging e Troubleshooting](#-debugging-e-troubleshooting)
- [📱 Ambiente Local](#-ambiente-local)
- [🌐 Integrações Externas](#-integrações-externas)
- [🚀 Build e Deploy](#-build-e-deploy)
- [📊 Performance e Otimização](#-performance-e-otimização)
- [🔐 Segurança e Boas Práticas](#-segurança-e-boas-práticas)
- [📚 Recursos e Referências](#-recursos-e-referências)

---

## 🎯 Visão Geral

O REVALIDAFLOW é uma plataforma de simulações clínicas médicas construída com Vue.js 3 + Node.js, utilizando as tecnologias mais modernas do ecossistema JavaScript.

### **Stack Tecnológico Principal**

#### **Frontend (Vue.js 3)**
- **Framework**: Vue 3 com Composition API
- **UI Framework**: Vuetify 3.7.5 (Material Design)
- **Build Tool**: Vite 5.4.19
- **State Management**: Pinia
- **Routing**: Vue Router 4
- **Auth**: Firebase Authentication 11.10.0
- **Database**: Firestore
- **Real-time**: Socket.IO Client
- **AI Integration**: Google Gemini API

#### **Backend (Node.js)**
- **Runtime**: Node.js 18+
- **Framework**: Express 4.18.2
- **Real-time**: Socket.IO 4.7.5
- **Auth**: Firebase Admin SDK
- **AI**: Google Generative AI (12 API keys)
- **Cache**: Redis + Memory
- **Testing**: Jest

---

## 🚀 Setup do Ambiente

### **Pré-requisitos**

#### **Software Necessário**
```bash
# Node.js (versão 18 ou superior)
node --version  # v18.0.0+

# npm (versão 9 ou superior)
npm --version  # v9.0.0+

# Git (para controle de versão)
git --version  # 2.30.0+

# Visual Studio Code (recomendado)
code --version
```

#### **Contas e Serviços**
1. **Firebase Account** - Para auth, Firestore, Storage
2. **Google Cloud Platform** - Para Cloud Run deployment
3. **Google AI Studio** - Para Gemini API keys
4. **GitHub** - Para controle de versão (se aplicável)

### **Instalação do Projeto**

#### **1. Clonar o Repositório**
```bash
git clone <repository-url>
cd "REVALIDAFLOW\FRONTEND E BACKEND"
```

#### **2. Instalar Dependências**
```bash
# Instalar dependências do frontend
npm install

# Instalar dependências do backend
cd backend
npm install

# Voltar para raiz
cd ..
```

#### **3. Configurar Variáveis de Ambiente**

##### **Frontend (.env)**
```bash
# Copiar template de ambiente
cp .env.example .env

# Editar arquivo .env
VITE_FIREBASE_API_KEY=sua-api-key
VITE_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu-projeto-id
VITE_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=seu-sender-id
VITE_FIREBASE_APP_ID=sua-app-id
VITE_FIREBASE_MEASUREMENT_ID=sua-measurement-id

# Backend URL
VITE_BACKEND_URL=http://localhost:3000

# Gemini API Keys (múltiplas para load balancing)
VITE_GEMINI_API_KEY_1=sua-key-1
VITE_GEMINI_API_KEY_2=sua-key-2
# ... até VITE_GEMINI_API_KEY_12

# Google Cloud
VITE_GOOGLE_CLOUD_PROJECT=seu-projeto
VITE_GOOGLE_CLOUD_LOCATION=us-central1

# Sentry (opcional)
VITE_SENTRY_DSN=seu-sentry-dsn

# Configurações de Feature Flags
VITE_ENABLE_AI_FEATURES=true
VITE_ENABLE_ANALYTICS=false
VITE_DEBUG_MODE=false
```

##### **Backend (.env.local)**
```bash
# Copiar template de ambiente
cp backend/.env.example backend/.env.local

# Editar arquivo backend/.env.local
NODE_ENV=development
PORT=3000

# Firebase Admin
FIREBASE_PROJECT_ID=seu-projeto-id
FIREBASE_PRIVATE_KEY_ID=sua-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@seu-projeto.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=seu-client-id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token

# Google AI API Keys
GOOGLE_API_KEY_1=sua-key-1
GOOGLE_API_KEY_2=sua-key-2
GOOGLE_API_KEY_3=sua-key-3
GOOGLE_API_KEY_6=sua-key-6
GOOGLE_API_KEY_7=sua-key-7
GOOGLE_API_KEY_8=sua-key-8

# Redis (se disponível)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=optional-password

# Sentry
SENTRY_DSN=seu-sentry-dsn

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=debug
LOG_TIMESTAMPS=true
LOG_NAMESPACE=api

# Cloud Run (produção)
CLOUD_RUN_SERVICE_NAME=revalidaflow-backend
CLOUD_RUN_REGION=us-central1
```

---

## ⚙️ Configuração do Projeto

### **Configuração do VS Code**

#### **.vscode/settings.json**
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "editor.tabSize": 2,
  "editor.insertSpaces": true,
  "editor.detectIndentation": false,
  "files.associations": {
    "*.vue": "vue"
  },
  "emmet.includeLanguages": {
    "vue": "html"
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "vue.codeActions.enabled": true,
  "vue.inlayHints.missingProps": true,
  "vue.inlayHints.optionsWrapper": true
}
```

#### **.vscode/extensions.json**
```json
{
  "recommendations": [
    "vue.volar",
    "vue.vscode-typescript-vue-plugin",
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-json",
    "redhat.vscode-yaml",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

### **Configuração do Vite**

#### **config/vite.config.js**
```javascript
import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig(({ mode }) => {
  // Carregar variáveis de ambiente
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      vue(),
      // PWA configuration (opcional)
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
        manifest: {
          name: 'RevalidaFlow',
          short_name: 'RevalidaFlow',
          theme_color: '#1976d2',
          background_color: '#ffffff'
        }
      })
    ],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@core': path.resolve(__dirname, 'src/@core'),
        '@layouts': path.resolve(__dirname, 'src/@layouts'),
        '@images': path.resolve(__dirname, 'src/assets/images'),
        '@styles': path.resolve(__dirname, 'src/assets/styles'),
        '@components': path.resolve(__dirname, 'src/components'),
        '@composables': path.resolve(__dirname, 'src/composables'),
        '@stores': path.resolve(__dirname, 'src/stores'),
        '@services': path.resolve(__dirname, 'src/services'),
        '@utils': path.resolve(__dirname, 'src/utils'),
        '@pages': path.resolve(__dirname, 'src/pages')
      }
    },

    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@import "@/assets/styles/variables.scss";`
        }
      }
    },

    build: {
      sourcemap: mode === 'development',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['vue', 'vue-router', 'pinia'],
            ui: ['vuetify', '@mdi/font'],
            firebase: ['firebase/app', 'firebase/firestore', 'firebase/auth'],
            editor: ['@tiptap/vue-3', '@tiptap/starter-kit'],
            charts: ['apexcharts'],
            utils: ['lodash-es', 'date-fns']
          }
        }
      },
      chunkSizeWarningLimit: 5000
    },

    server: {
      port: 5173,
      host: true,
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true
        }
      }
    },

    preview: {
      port: 4173
    },

    optimizeDeps: {
      include: [
        'vue',
        'vue-router',
        'pinia',
        'vuetify',
        'firebase/app'
      ]
    }
  };
});
```

### **Configuração do ESLint**

#### **.eslintrc.js**
```javascript
module.exports = {
  root: true,
  env: {
    node: true,
    browser: true,
    es2021: true
  },
  extends: [
    'eslint:recommended',
    '@vue/eslint-config-typescript',
    '@vue/eslint-config-prettier',
    'plugin:vue/vue3-recommended'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  plugins: ['vue'],
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'vue/multi-word-component-names': 'off',
    'vue/component-definition-name-casing': ['error', 'PascalCase'],
    'vue/component-name-in-template-casing': ['error', 'PascalCase'],
    'vue/prop-name-casing': ['error', 'camelCase'],
    'vue/attribute-hyphenation': ['error', 'never'],
    'vue/v-bind-style': ['error', 'shorthand'],
    'vue/no-unused-vars': 'error',
    'vue/padding-line-between-blocks': ['error', 'always'],
    'vue/order-in-components': 'error',
    'vue/require-default-prop': 'error',
    'vue/require-prop-types': 'error'
  }
};
```

---

## 🛠️ Scripts de Desenvolvimento

### **Scripts Principais (package.json)**

#### **Frontend**
```json
{
  "scripts": {
    "dev": "vite --host",
    "build": "vite build",
    "build:local": "vite build --mode local",
    "build:prod": "vite build --mode production",
    "build:revalida-companion": "vite build --mode companion",
    "build:revalidaflowapp": "vite build --mode flowapp",
    "build:webapp": "vite build --mode webapp",
    "preview": "vite preview",
    "lint": "eslint . --ext .vue,.js,.jsx,.cjs,.mjs,.ts,.tsx,.cts,.mts --fix",
    "lint:check": "eslint . --ext .vue,.js,.jsx,.cjs,.mjs,.ts,.tsx,.cts,.mts",
    "format": "prettier --write src/",
    "format:check": "prettier --check src/",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "type-check": "vue-tsc --noEmit",
    "backend:local": "cd backend && npm start",
    "backend:build": "cd backend && npm run build",
    "backend:deploy": "cd backend && npm run deploy",
    "firebase:deploy": "firebase deploy --only hosting",
    "firebase:deploy:staging": "firebase deploy --only hosting:staging",
    "update-prd": "node scripts/update-prd.js",
    "analyze": "vite-bundle-analyzer dist"
  }
}
```

#### **Backend (backend/package.json)**
```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:integration": "node scripts/run-integration-tests.js",
    "test:unit": "jest --testPathPattern=tests/unit",
    "lint": "eslint . --fix",
    "lint:check": "eslint .",
    "build": "echo 'Backend is serverless, no build needed'",
    "deploy": "gcloud builds submit --tag gcr.io/$GOOGLE_CLOUD_PROJECT/revalidaflow-backend && gcloud run deploy revalidaflow-backend --image gcr.io/$GOOGLE_CLOUD_PROJECT/revalidaflow-backend --platform managed",
    "logs": "gcloud logs tail revalidaflow-backend"
  }
}
```

### **Scripts de Automação**

#### **scripts/iniciar-dev.bat** (Windows)
```batch
@echo off
echo Iniciando ambiente de desenvolvimento REVALIDAFLOW...
echo.

echo [1/3] Verificando Node.js...
node --version
if %errorlevel% neq 0 (
    echo ERRO: Node.js nao encontrado. Por favor instale Node.js 18+
    pause
    exit /b 1
)

echo [2/3] Verificando se o backend esta rodando...
curl -s http://localhost:3000/api/health >nul 2>&1
if %errorlevel% neq 0 (
    echo Iniciando backend em nova janela...
    start "Backend" cmd /c "cd backend && npm start"
    timeout /t 5 /nobreak >nul
) else (
    echo Backend ja esta rodando!
)

echo [3/3] Iniciando frontend...
echo.
echo Frontend sera iniciado em: http://localhost:5173
echo Backend esta rodando em: http://localhost:3000
echo.
echo Pressione Ctrl+C para parar o servidor.
echo.

npm run dev

pause
```

#### **scripts/rodar-testes.bat** (Windows)
```batch
@echo off
echo REVALIDAFLOW - Executor de Testes
echo =================================
echo.
echo Escolha o tipo de teste:
echo [1] Testes Unitarios (Vitest)
echo [2] Testes E2E (Playwright)
echo [3] Testes de Integracao (Backend)
echo [4] Todos os testes
echo [5] Testes com Coverage
echo [Q] Sair
echo.

set /p choice="Digite sua escolha: "

if "%choice%"=="1" (
    echo Rodando testes unitarios...
    npm test
) else if "%choice%"=="2" (
    echo Rodando testes E2E...
    npx playwright test
) else if "%choice%"=="3" (
    echo Rodando testes de integracao...
    cd backend && npm run test:integration
) else if "%choice%"=="4" (
    echo Rodando todos os testes...
    npm test && npx playwright test && cd backend && npm run test:integration
) else if "%choice%"=="5" (
    echo Rodando testes com coverage...
    npm run test:coverage && npx playwright test --reporter=html && cd backend && npm run test:coverage
) else if /i "%choice%"=="q" (
    echo Saindo...
    exit /b 0
) else (
    echo Escolha invalida!
)

echo.
echo Testes concluidos!
pause
```

---

## 🔧 Arquitetura e Estrutura

### **Estrutura de Diretórios**

```
REVALIDAFLOW/
├── 📁 src/                           # Frontend source
│   ├── 📁 @core/                      # Template core components
│   ├── 📁 @layouts/                   # Layout components
│   ├── 📁 assets/                     # Static assets
│   ├── 📁 components/                 # Reusable components (150+)
│   ├── 📁 composables/                # Vue composables (38)
│   ├── 📁 pages/                      # Page components (42)
│   ├── 📁 plugins/                    # Vue plugins
│   ├── 📁 services/                   # API services (9)
│   ├── 📁 stores/                     # Pinia stores (3)
│   ├── 📁 utils/                      # Utility functions (25+)
│   ├── 📁 types/                      # TypeScript types
│   └── 📁 config/                     # Configuration files
├── 📁 backend/                        # Backend source
│   ├── 📁 config/                     # Backend config
│   ├── 📁 middleware/                 # Express middleware
│   ├── 📁 routes/                     # API routes (3)
│   ├── 📁 services/                   # Backend services (7)
│   ├── 📁 utils/                      # Backend utils
│   ├── 📁 tests/                      # Backend tests
│   ├── 📁 src/                        # Additional source
│   └── 📄 server.js                   # Main server file
├── 📁 docs/                           # Documentation (62 files)
├── 📁 scripts/                        # Automation scripts
├── 📁 public/                         # Public assets
├── 📁 tests/                          # Frontend tests
└── 📁 config/                         # Build and deployment config
```

### **Padrões de Arquitetura**

#### **1. Component Pattern**
```vue
<template>
  <!-- Template sempre com kebab-case para atributos -->
  <div class="component-name">
    <slot name="header" />
    <main class="component-content">
      <!-- Conteúdo principal -->
    </main>
    <slot name="actions" />
  </div>
</template>

<script setup>
// Imports no topo
import { ref, computed, onMounted } from 'vue';
import { useComposable } from '@/composables/useComposable';

// Props com TypeScript
interface Props {
  title: string
  items?: Item[]
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  items: () => [],
  disabled: false
});

// Emits
interface Emits {
  click: [event: MouseEvent]
  change: [value: string]
}

const emit = defineEmits<Emits>();

// Estado
const internalState = ref(null);

// Computed
const computedValue = computed(() => {
  return transformData(props.items);
});

// Métodos
const handleClick = (event) => {
  emit('click', event);
};

// Lifecycle
onMounted(() => {
  // Inicialização
});
</script>

<style scoped>
/* Estilos com SCSS */
.component-name {
  /* Estilos base */

  &--disabled {
    opacity: 0.6;
  }
}
</style>
```

#### **2. Composable Pattern**
```javascript
// src/composables/useFeature.js
import { ref, computed, watch } from 'vue';

export function useFeature(initialState = {}) {
  // Estado
  const state = ref(initialState);
  const loading = ref(false);
  const error = ref(null);

  // Computed
  const computedValue = computed(() => {
    return processData(state.value);
  });

  // Métodos
  const fetchData = async (params) => {
    loading.value = true;
    error.value = null;

    try {
      const result = await apiCall(params);
      state.value = result;
      return result;
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Watchers
  watch(state, (newValue) => {
    if (newValue.someCondition) {
      // Reagir a mudanças
    }
  });

  // Retorno API (readonly para estado)
  return {
    state: readonly(state),
    loading: readonly(loading),
    error: readonly(error),
    computedValue: readonly(computedValue),
    fetchData
  };
}
```

#### **3. Service Pattern**
```javascript
// src/services/featureService.js
class FeatureService {
  constructor() {
    this.cache = new Map();
    this.baseURL = import.meta.env.VITE_BACKEND_URL;
  }

  async getItems(params = {}) {
    const cacheKey = JSON.stringify(params);

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const response = await fetch(`${this.baseURL}/api/features`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`
        },
        body: JSON.stringify(params)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Error fetching items:', error);
      throw error;
    }
  }

  clearCache() {
    this.cache.clear();
  }
}

export const featureService = new FeatureService();
```

---

## 🧪 Testes e Qualidade

### **Framework de Testes Frontend (Vitest)**

#### **Configuração**
```javascript
// vitest.config.js
import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js']
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@composables': path.resolve(__dirname, 'src/composables'),
      '@stores': path.resolve(__dirname, 'src/stores'),
      '@utils': path.resolve(__dirname, 'src/utils')
    }
  }
});
```

#### **Setup de Testes**
```javascript
// tests/setup.js
import { vi } from 'vitest';
import { config } from '@vue/test-utils';

// Mock Firebase
vi.mock('firebase/app', () => ({
  default: {
    auth: () => ({
      signInWithEmailAndPassword: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChanged: vi.fn()
    }),
    firestore: () => ({
      collection: () => ({
        doc: () => ({
          get: vi.fn(),
          set: vi.fn(),
          update: vi.fn()
        })
      })
    })
  }
}));

// Mock Vuetify
config.global.stubs = {
  'v-btn': true,
  'v-card': true,
  'v-dialog': true,
  'v-text-field': true,
  'v-select': true
};
```

#### **Exemplo de Teste de Componente**
```javascript
// tests/unit/components/StationCard.test.js
import { mount } from '@vue/test-utils';
import { describe, it, expect, vi } from 'vitest';
import StationCard from '@/components/StationCard.vue';

describe('StationCard', () => {
  const mockStation = {
    id: 'test-1',
    titulo: 'Estação Teste',
    especialidade: 'clínica_médica',
    periodo_inep: '2024-2026'
  };

  it('deve renderizar informações corretas', () => {
    const wrapper = mount(StationCard, {
      props: { station: mockStation }
    });

    expect(wrapper.text()).toContain('Estação Teste');
    expect(wrapper.text()).toContain('clínica_médica');
    expect(wrapper.text()).toContain('2024-2026');
  });

  it('deve emitir evento de clique', async () => {
    const wrapper = mount(StationCard, {
      props: { station: mockStation }
    });

    await wrapper.trigger('click');
    expect(wrapper.emitted('click')).toBeTruthy();
    expect(wrapper.emitted('click')[0]).toEqual([mockStation]);
  });

  it('deve mostrar badge de especialidade correta', () => {
    const wrapper = mount(StationCard, {
      props: { station: mockStation }
    });

    const specialtyBadge = wrapper.find('[data-test="specialty-badge"]');
    expect(specialtyBadge.exists()).toBe(true);
    expect(specialtyBadge.text()).toBe('clínica_médica');
  });

  it('deve aplicar estilos de disabled quando prop for true', () => {
    const wrapper = mount(StationCard, {
      props: {
        station: mockStation,
        disabled: true
      }
    });

    expect(wrapper.classes()).toContain('station-card--disabled');
  });
});
```

#### **Exemplo de Teste de Composable**
```javascript
// tests/unit/composables/useStationFilter.test.js
import { useStationFilter } from '@/composables/useStationFilter';
import { describe, it, expect } from 'vitest';

describe('useStationFilter', () => {
  const mockStations = [
    { id: '1', especialidade: 'clínica_médica', titulo: 'Estação 1' },
    { id: '2', especialidade: 'pediatria', titulo: 'Estação 2' },
    { id: '3', especialidade: 'clínica_médica', titulo: 'Estação 3' }
  ];

  it('deve filtrar por especialidade', () => {
    const { filters, filteredStations } = useStationFilter(mockStations);

    filters.value.especialidade = 'clínica_médica';

    expect(filteredStations.value).toHaveLength(2);
    expect(filteredStations.value.map(s => s.id)).toEqual(['1', '3']);
  });

  it('deve buscar por título', () => {
    const { filters, filteredStations } = useStationFilter(mockStations);

    filters.value.search = 'Estação 2';

    expect(filteredStations.value).toHaveLength(1);
    expect(filteredStations.value[0].id).toBe('2');
  });

  it('deve resetar filtros', () => {
    const { filters, filteredStations, resetFilters } = useStationFilter(mockStations);

    filters.value.especialidade = 'clínica_médica';
    filters.value.search = 'test';

    resetFilters();

    expect(filters.value.especialidade).toBe('');
    expect(filters.value.search).toBe('');
  });
});
```

### **Framework de Testes Backend (Jest)**

#### **Configuração**
```javascript
// backend/jest.config.js
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  collectCoverageFrom: [
    'services/**/*.js',
    'routes/**/*.js',
    'middleware/**/*.js',
    'utils/**/*.js',
    '!**/node_modules/**',
    '!**/tests/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js']
};
```

#### **Setup de Testes**
```javascript
// backend/tests/setup.js
const { initializeTestApp } = require('@firebase/testing');

// Mock Firebase Admin
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(() => ({
    firestore: () => ({
      collection: () => ({
        doc: () => ({
          get: jest.fn(),
          set: jest.fn(),
          update: jest.fn(),
          delete: jest.fn()
        }),
        get: jest.fn(),
        add: jest.fn()
      })
    })
  })),
  credential: {
    cert: jest.fn()
  }
}));

// Global test utilities
global.createMockRequest = (overrides = {}) => ({
  body: {},
  headers: {},
  user: null,
  ...overrides
});

global.createMockResponse = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis()
  };
  return res;
};
```

#### **Exemplo de Teste de Rota**
```javascript
// backend/tests/integration/routes/descriptiveQuestions.test.js
const request = require('supertest');
const app = require('../../../server');

describe('Descriptive Questions API', () => {
  describe('GET /api/descriptive-questions', () => {
    it('deve retornar lista de questões', async () => {
      const response = await request(app)
        .get('/api/descriptive-questions')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('deve aplicar filtros corretamente', async () => {
      const response = await request(app)
        .get('/api/descriptive-questions')
        .query({ especialidade: 'clínica_médica' })
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.every(q => q.especialidade === 'clínica_médica')).toBe(true);
    });
  });

  describe('POST /api/descriptive-questions', () => {
    it('deve criar nova questão com permissão admin', async () => {
      const questionData = {
        titulo: 'Nova Questão',
        especialidade: 'clínica_médica',
        enunciado: 'Pergunta teste'
      };

      const response = await request(app)
        .post('/api/descriptive-questions')
        .send(questionData)
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(201);
      expect(response.body.titulo).toBe(questionData.titulo);
    });

    it('deve negar criação sem permissão', async () => {
      const response = await request(app)
        .post('/api/descriptive-questions')
        .send({ titulo: 'Teste' })
        .set('Authorization', 'Bearer user-token');

      expect(response.status).toBe(403);
    });
  });
});
```

### **Testes E2E (Playwright)**

#### **Configuração**
```javascript
// playwright.config.js
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['junit', { outputFile: 'test-results/junit.xml' }]
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] }
    }
  ],
  webServer: {
    command: 'npm run dev',
    port: 5173
  }
});
```

#### **Exemplo de Teste E2E**
```javascript
// tests/e2e/simulation.spec.js
const { test, expect } = require('@playwright/test');

test.describe('Fluxo de Simulação', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid=email]', 'test@example.com');
    await page.fill('[data-testid=password]', 'password123');
    await page.click('[data-testid=login-button]');

    // Esperar dashboard carregar
    await page.waitForURL('/app/dashboard');
  });

  test('fluxo completo de simulação', async ({ page }) => {
    // Navegar para lista de estações
    await page.click('[data-testid=station-list-nav]');
    await page.waitForURL('/app/station-list');

    // Selecionar primeira estação
    await page.click('[data-testid=station-item-0]');

    // Verificar página de detalhes
    await expect(page.locator('.station-detail')).toBeVisible();

    // Iniciar simulação
    await page.click('[data-testid=start-simulation]');

    // Verificar interface de simulação
    await expect(page.locator('.simulation-header')).toBeVisible();
    await expect(page.locator('.candidate-content')).toBeVisible();
    await expect(page.locator('.actor-script')).toBeVisible();

    // Testar timer
    const timer = page.locator('.timer-display');
    await expect(timer).toBeVisible();

    // Esperar 1 segundo e verificar timer incrementou
    const initialTime = await timer.textContent();
    await page.waitForTimeout(1100);
    const newTime = await timer.textContent();
    expect(newTime).not.toBe(initialTime);

    // Finalizar simulação
    await page.click('[data-testid=end-simulation]');

    // Confirmar diálogo
    await page.click('[data-testid=confirm-end]');

    // Verificar redirecionamento para feedback
    await expect(page).toHaveURL(/\/app\/feedback\/.+/);
  });

  test('simulação em modo sequencial', async ({ page }) => {
    // Navegar para lista de estações
    await page.goto('/app/station-list');

    // Ativar modo sequencial
    await page.click('[data-testid=sequential-mode-toggle]');

    // Adicionar 3 estações à sequência
    for (let i = 0; i < 3; i++) {
      await page.click(`[data-testid=add-to-sequence-${i}]`);
    }

    // Iniciar sequência
    await page.click('[data-testid=start-sequence]');

    // Verificar primeira estação
    await expect(page.locator('.simulation-header')).toContainText('Estação 1 de 3');

    // Avançar para próxima estação
    await page.click('[data-testid=next-station]');

    // Verificar segunda estação
    await expect(page.locator('.simulation-header')).toContainText('Estação 2 de 3');

    // Completar sequência
    await page.click('[data-testid=next-station]');
    await page.click('[data-testid=next-station]'); // Última

    // Verificar conclusão
    await expect(page.locator('.sequence-complete')).toBeVisible();
  });
});
```

### **Execução de Testes**

#### **Comandos de Teste**
```bash
# Frontend
npm run test                    # Rodar todos os testes
npm run test:ui                # Interface visual de testes
npm run test:coverage          # Testes com coverage
npm run test:watch             # Modo watch

# Backend
npm test                       # Rodar testes do backend
npm run test:watch             # Modo watch
npm run test:coverage          # Testes com coverage
npm run test:integration       # Testes de integração

# E2E
npx playwright test            # Rodar todos os testes E2E
npx playwright test --ui       # Interface visual
npx playwright test --project=chromium # Browser específico
npx playwright test --debug    # Modo debug
```

---

## 🐛 Debugging e Troubleshooting

### **Ferramentas de Debugging**

#### **1. Vue DevTools**
```bash
# Instalar extensão Vue DevTools no Chrome/Firefox
# Conectar ao app em desenvolvimento (http://localhost:5173)
```

#### **2. Console Debugging**
```javascript
// Em qualquer componente Vue
const { $logger } = useNuxtApp(); // ou similar

// Debug reativo
watch(myReactiveData, (newVal, oldVal) => {
  console.log('Data changed:', { old: oldVal, new: newVal });
});

// Debug de performance
const startTime = performance.now();
// ... código
const endTime = performance.now();
console.log(`Operation took ${endTime - startTime} ms`);

// Debug de components
const app = getCurrentInstance();
console.log('Component instance:', app);

// Debug de props
console.log('Component props:', getCurrentInstance().props);
```

#### **3. Backend Debugging**
```javascript
// Middleware de debugging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, {
    headers: req.headers,
    body: req.body,
    user: req.user
  });
  next();
});

// Debug de Socket.IO
io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  socket.onAny((event, ...args) => {
    console.log(`Socket event ${event}:`, args);
  });

  socket.on('disconnect', (reason) => {
    console.log(`Socket ${socket.id} disconnected:`, reason);
  });
});
```

### **Problemas Comuns e Soluções**

#### **1. Firebase Authentication Issues**
```javascript
// Debug de auth
import { getAuth } from 'firebase/auth';

const auth = getAuth();
auth.onAuthStateChanged((user) => {
  console.log('Auth state changed:', {
    user: user?.uid,
    email: user?.email,
    emailVerified: user?.emailVerified,
    isAnonymous: user?.isAnonymous,
    providerData: user?.providerData
  });
});

// Debug de token
const getIdToken = async () => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken(true); // Force refresh
    console.log('ID Token:', token);
    return token;
  }
};
```

#### **2. Firestore Connection Issues**
```javascript
// Debug de Firestore
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

if (process.env.NODE_ENV === 'development') {
  const db = getFirestore();
  try {
    connectFirestoreEmulator(db, 'localhost', 8080);
    console.log('Connected to Firestore emulator');
  } catch (error) {
    console.log('Firestore emulator already connected');
  }
}
```

#### **3. Socket.IO Connection Issues**
```javascript
// Debug de Socket.IO
import io from 'socket.io-client';

const socket = io(backendUrl, {
  auth: {
    token: await getAuthToken()
  },
  timeout: 10000,
  retries: 3
});

socket.on('connect', () => {
  console.log('Socket connected with ID:', socket.id);
});

socket.on('connect_error', (error) => {
  console.error('Socket connection error:', error);

  if (error.message === 'Authentication error') {
    // Token inválido ou expirado
    console.log('Please re-authenticate');
  }
});

socket.io.on('reconnect', (attemptNumber) => {
  console.log(`Socket reconnected after ${attemptNumber} attempts`);
});
```

#### **4. Vite Build Issues**
```javascript
// vite.config.js debug
export default defineConfig({
  build: {
    // Aumentar limite de warning para debug
    chunkSizeWarningLimit: 10000,

    // Sourcemaps para debug de produção
    sourcemap: true,

    // Log detalhado
    rollupOptions: {
      onwarn(warning, warn) {
        console.warn('Rollup warning:', warning);
        warn(warning);
      }
    }
  }
});
```

#### **5. Memory Leaks**
```javascript
// Detectar memory leaks
const observers = new Set();

// Criar observer
const observer = new IntersectionObserver(callback, options);
observers.add(observer);

// Cleanup em componente
onUnmounted(() => {
  observers.forEach(observer => observer.disconnect());
  observers.clear();
});

// Monitorar memory usage
setInterval(() => {
  if (performance.memory) {
    console.log('Memory usage:', {
      used: `${Math.round(performance.memory.usedJSHeapSize / 1048576)}MB`,
      total: `${Math.round(performance.memory.totalJSHeapSize / 1048576)}MB`,
      limit: `${Math.round(performance.memory.jsHeapSizeLimit / 1048576)}MB`
    });
  }
}, 30000);
```

---

## 📱 Ambiente Local

### **Desenvolvimento em Máquina Local**

#### **Requisitos Mínimos**
- **RAM**: 8GB (recomendado 16GB)
- **Processador**: Intel i5 ou superior
- **Armazenamento**: 5GB livres
- **Sistema**: Windows 10+, macOS 10.15+, Ubuntu 18.04+

#### **Setup Rápido (Windows)**
```batch
@echo off
echo Setup rápido do REVALIDAFLOW para Windows
echo ========================================

echo [1/5] Verificando Node.js...
node --version
if %errorlevel% neq 0 (
    echo Node.js não encontrado. Por favor instale em https://nodejs.org
    pause
    exit /b 1
)

echo [2/5] Verificando Git...
git --version
if %errorlevel% neq 0 (
    echo Git não encontrado. Por favor instale em https://git-scm.com
    pause
    exit /b 1
)

echo [3/5] Instalando dependências...
npm install
cd backend
npm install
cd ..

echo [4/5] Criando arquivos de ambiente...
if not exist .env (
    copy .env.example .env
    echo Por favor configure as variáveis de ambiente em .env
)
if not exist backend\.env.local (
    copy backend\.env.example backend\.env.local
    echo Por favor configure as variáveis do backend em backend\.env.local
)

echo [5/5] Setup concluído!
echo.
echo Para iniciar o desenvolvimento:
echo 1. Configure as variáveis de ambiente
echo 2. Execute scripts\iniciar-dev.bat
echo.
pause
```

#### **Docker Compose (Opcional)**
```yaml
# docker-compose.yml
version: '3.8'

services:
  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "5173:5173"
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
    depends_on:
      - backend
      - redis

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - REDIS_URL=redis://redis:6379
    volumes:
      - ./backend:/app
      - /app/node_modules

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

### **Database Local (Firestore Emulator)**

#### **Setup do Emulador**
```bash
# Instalar Firebase CLI
npm install -g firebase-tools

# Login no Firebase
firebase login

# Inicializar projeto
firebase init emulators

# Iniciar emuladores
firebase emulators:start --only firestore
```

#### **Configuração no Frontend**
```javascript
// src/plugins/firebase.js
import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

const firebaseConfig = {
  // Configuração do Firebase
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Conectar ao emulador em desenvolvimento
if (process.env.NODE_ENV === 'development' && import.meta.env.VITE_USE_EMULATOR === 'true') {
  connectFirestoreEmulator(db, 'localhost', 8080);
}

export { db };
```

---

## 🌐 Integrações Externas

### **Google Gemini AI Integration**

#### **Setup das API Keys**
```javascript
// src/services/geminiService.js
class GeminiService {
  constructor() {
    this.apiKeys = [
      import.meta.env.VITE_GEMINI_API_KEY_1,
      import.meta.env.VITE_GEMINI_API_KEY_2,
      // ... até VITE_GEMINI_API_KEY_12
    ].filter(Boolean);

    this.currentKeyIndex = 0;
    this.usageCount = new Map();
    this.maxRequestsPerKey = 1000;
  }

  async makeRequest(prompt, options = {}) {
    const apiKey = await this.getAvailableKey();

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: prompt }]
            }],
            generationConfig: {
              temperature: options.temperature || 0.7,
              maxOutputTokens: options.maxTokens || 1000,
              topK: 40,
              topP: 0.95
            }
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      this.trackUsage(apiKey);

      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('Gemini service error:', error);
      throw error;
    }
  }

  async getAvailableKey() {
    // Implementar lógica de load balancing
    const key = this.apiKeys[this.currentKeyIndex];
    const usage = this.usageCount.get(key) || 0;

    if (usage >= this.maxRequestsPerKey) {
      this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
    }

    return this.apiKeys[this.currentKeyIndex];
  }

  trackUsage(apiKey) {
    const current = this.usageCount.get(apiKey) || 0;
    this.usageCount.set(apiKey, current + 1);
  }
}

export const geminiService = new GeminiService();
```

#### **Rate Limiting e Caching**
```javascript
// Cache de respostas
const responseCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

const getCachedResponse = (prompt) => {
  const key = prompt.trim().toLowerCase();
  const cached = responseCache.get(key);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.response;
  }

  return null;
};

const setCachedResponse = (prompt, response) => {
  const key = prompt.trim().toLowerCase();
  responseCache.set(key, {
    response,
    timestamp: Date.now()
  });
};

// Rate limiting
const requestQueue = [];
let isProcessing = false;

const processQueue = async () => {
  if (isProcessing || requestQueue.length === 0) return;

  isProcessing = true;

  while (requestQueue.length > 0) {
    const { resolve, reject, args } = requestQueue.shift();
    try {
      const result = await geminiService.makeRequest(...args);
      resolve(result);
    } catch (error) {
      reject(error);
    }

    // Aguardar entre requisições para respeitar rate limits
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  isProcessing = false;
};

export const queuedGeminiRequest = (...args) => {
  return new Promise((resolve, reject) => {
    requestQueue.push({ resolve, reject, args });
    processQueue();
  });
};
```

### **Firebase Integration**

#### **Authentication Service**
```javascript
// src/services/authService.js
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export class AuthService {
  constructor() {
    this.auth = getAuth();
    this.user = null;
  }

  async signIn(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(
        this.auth,
        email,
        password
      );
      return userCredential.user;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async signUp(email, password, displayName) {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        this.auth,
        email,
        password
      );

      // Atualizar profile
      await updateProfile(userCredential.user, { displayName });

      // Criar documento no Firestore
      await setDoc(doc(db, 'usuarios', userCredential.user.uid), {
        uid: userCredential.user.uid,
        email,
        displayName,
        role: 'user',
        especialidade: '',
        createdAt: new Date(),
        dados_simulacoes: {
          total_simulacoes: 0,
          pontuacao_media: 0,
          especialidades: {},
          historico: []
        }
      });

      return userCredential.user;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async signOut() {
    try {
      await signOut(this.auth);
      this.user = null;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  onAuthStateChanged(callback) {
    return onAuthStateChanged(this.auth, async (user) => {
      if (user) {
        // Carregar dados completos do usuário
        const userDoc = await getDoc(doc(db, 'usuarios', user.uid));
        const userData = userDoc.data();

        this.user = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          emailVerified: user.emailVerified,
          ...userData
        };
      } else {
        this.user = null;
      }

      callback(this.user);
    });
  }

  handleError(error) {
    let message = 'Ocorreu um erro na autenticação';

    switch (error.code) {
      case 'auth/user-not-found':
        message = 'Usuário não encontrado';
        break;
      case 'auth/wrong-password':
        message = 'Senha incorreta';
        break;
      case 'auth/email-already-in-use':
        message = 'Email já está em uso';
        break;
      case 'auth/weak-password':
        message = 'Senha muito fraca';
        break;
      case 'auth/invalid-email':
        message = 'Email inválido';
        break;
      case 'auth/user-disabled':
        message = 'Usuário desativado';
        break;
      case 'auth/too-many-requests':
        message = 'Muitas tentativas. Tente novamente mais tarde';
        break;
    }

    return new Error(message);
  }
}

export const authService = new AuthService();
```

### **Socket.IO Integration**

#### **Client Service**
```javascript
// src/services/socketService.js
import io from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  async connect() {
    try {
      const token = await this.getAuthToken();

      this.socket = io(import.meta.env.VITE_BACKEND_URL, {
        auth: { token },
        timeout: 10000,
        transports: ['websocket', 'polling']
      });

      this.setupEventListeners();
      return new Promise((resolve, reject) => {
        this.socket.on('connect', () => {
          this.connected = true;
          this.reconnectAttempts = 0;
          console.log('Socket connected');
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          this.connected = false;
          console.error('Socket connection error:', error);
          reject(error);
        });
      });
    } catch (error) {
      console.error('Socket service connection failed:', error);
      throw error;
    }
  }

  setupEventListeners() {
    this.socket.on('disconnect', (reason) => {
      this.connected = false;
      console.log('Socket disconnected:', reason);

      if (reason === 'io server disconnect') {
        // Server initiated disconnect, reconnect manually
        this.reconnect();
      }
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`Socket reconnected after ${attemptNumber} attempts`);
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`Socket reconnection attempt ${attemptNumber}`);
    });
  }

  async reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.pow(2, this.reconnectAttempts) * 1000;

      console.log(`Attempting to reconnect in ${delay}ms...`);
      setTimeout(() => this.connect(), delay);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  joinSimulation(sessionId) {
    if (this.connected) {
      this.socket.emit('joinSimulation', { sessionId });
    }
  }

  leaveSimulation(sessionId) {
    if (this.connected) {
      this.socket.emit('leaveSimulation', { sessionId });
    }
  }

  sendSimulationMessage(sessionId, message) {
    if (this.connected) {
      this.socket.emit('simulationMessage', { sessionId, message });
    }
  }

  onSimulationMessage(callback) {
    this.socket?.on('simulationMessage', callback);
  }

  onTimerUpdate(callback) {
    this.socket?.on('timerUpdate', callback);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  async getAuthToken() {
    // Implementar lógica para obter token Firebase
    const user = getCurrentUser();
    return user ? await user.getIdToken() : null;
  }
}

export const socketService = new SocketService();
```

---

## 🚀 Build e Deploy

### **Build Configuration**

#### **Environment-Specific Builds**
```javascript
// vite.config.js
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    build: {
      mode: env.NODE_ENV || 'development',
      sourcemap: mode !== 'production',
      minify: mode === 'production' ? 'terser' : false,
      terserOptions: mode === 'production' ? {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
      } : undefined,
    }
  };
});
```

#### **Build Scripts**
```json
{
  "scripts": {
    "build": "vite build",
    "build:local": "vite build --mode local",
    "build:staging": "vite build --mode staging",
    "build:prod": "vite build --mode production",
    "build:analyze": "vite build --mode production && npx vite-bundle-analyzer dist"
  }
}
```

### **Deployment - Firebase Hosting**

#### **firebase.json Configuration**
```json
{
  "hosting": [
    {
      "target": "default",
      "public": "dist",
      "ignore": [
        "firebase.json",
        "**/.*",
        "**/node_modules/**"
      ],
      "rewrites": [
        {
          "source": "**",
          "destination": "/index.html"
        }
      ],
      "headers": [
        {
          "source": "**/*.@(js|css)",
          "headers": [
            {
              "key": "Cache-Control",
              "value": "max-age=31536000"
            }
          ]
        },
        {
          "source": "**/*.@(jpg|jpeg|gif|png|svg|webp)",
          "headers": [
            {
              "key": "Cache-Control",
              "value": "max-age=31536000"
            }
          ]
        },
        {
          "source": "**",
          "headers": [
            {
              "key": "X-Content-Type-Options",
              "value": "nosniff"
            },
            {
              "key": "X-Frame-Options",
              "value": "DENY"
            },
            {
              "key": "X-XSS-Protection",
              "value": "1; mode=block"
            }
          ]
        }
      ]
    },
    {
      "target": "staging",
      "public": "dist",
      "ignore": [
        "firebase.json",
        "**/.*",
        "**/node_modules/**"
      ]
    }
  ],
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "storage": {
    "rules": "storage.rules"
  }
}
```

#### **Deploy Scripts**
```json
{
  "scripts": {
    "deploy:prod": "npm run build:prod && firebase deploy --only hosting:default",
    "deploy:staging": "npm run build:staging && firebase deploy --only hosting:staging",
    "deploy:all": "npm run build:prod && firebase deploy"
  }
}
```

### **Deployment - Backend (Cloud Run)**

#### **Dockerfile**
```dockerfile
# backend/Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build || echo "Build step completed (backend)"

# Production image, copy all the files and run the app
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app ./

USER nodejs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["npm", "start"]
```

#### **.dockerignore**
```
node_modules
npm-debug.log
.env
.env.local
coverage
.nyc_output
.git
.gitignore
README.md
.eslintrc.js
__tests__
tests
```

#### **Deploy Commands**
```bash
# Build Docker image
docker build -t gcr.io/PROJECT_ID/revalidaflow-backend ./backend

# Push to Google Container Registry
docker push gcr.io/PROJECT_ID/revalidaflow-backend

# Deploy to Cloud Run
gcloud run deploy revalidaflow-backend \
  --image gcr.io/PROJECT_ID/revalidaflow-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 100 \
  --min-instances 0 \
  --set-env-vars NODE_ENV=production \
  --set-secrets FIREBASE_PRIVATE_KEY=FIREBASE_PRIVATE_KEY:latest
```

### **CI/CD Pipeline (GitHub Actions)**

#### **.github/workflows/deploy.yml**
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '18'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: |
          npm ci
          cd backend && npm ci

      - name: Run frontend tests
        run: npm run test:coverage

      - name: Run backend tests
        run: cd backend && npm run test:coverage

      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info,./backend/coverage/lcov.info

  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: |
          npm ci
          cd backend && npm ci

      - name: Build frontend
        run: npm run build:prod
        env:
          VITE_FIREBASE_API_KEY: ${{ secrets.FIREBASE_API_KEY }}
          VITE_BACKEND_URL: ${{ secrets.BACKEND_URL }}

      - name: Deploy to Firebase Hosting
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          channelId: live
          projectId: revalidaflow

      - name: Setup Google Cloud
        uses: google-github-actions/setup-gcloud@v1
        with:
          version: 'latest'
          service_account_key: ${{ secrets.GCLOUD_SERVICE_ACCOUNT }}

      - name: Build and deploy backend
        run: |
          cd backend
          gcloud builds submit --tag gcr.io/$PROJECT_ID/revalidaflow-backend
          gcloud run deploy revalidaflow-backend \
            --image gcr.io/$PROJECT_ID/revalidaflow-backend \
            --platform managed \
            --region us-central1 \
            --allow-unauthenticated
```

---

## 📊 Performance e Otimização

### **Frontend Performance**

#### **Bundle Analysis**
```bash
# Analisar tamanho do bundle
npm run build:analyze

# Análise manual
npx vite-bundle-analyzer dist
```

#### **Lazy Loading Implementation**
```javascript
// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/app/dashboard',
      name: 'dashboard',
      component: () => import('@/pages/dashboard.vue'), // 95KB
      meta: { preload: true }
    },
    {
      path: '/app/simulation/:id',
      name: 'simulation',
      component: () => import('@/pages/SimulationView.vue'), // 180KB
      meta: { preload: true }
    },
    {
      path: '/app/edit-station/:id',
      name: 'edit-station',
      component: () => import('@/pages/EditStationView.vue'), // 250KB
      meta: { requiresAuth: true, requiresRole: ['admin', 'moderator'] }
    }
  ]
});

// Preloading estratégico
router.beforeEach(async (to, from, next) => {
  if (to.meta?.preload) {
    const component = await to.matched[0].components.default();
    // Componente pré-carregado
  }
  next();
});
```

#### **Image Optimization**
```javascript
// src/composables/useImageOptimization.js
export function useImageOptimization() {
  const optimizeImage = (src, options = {}) => {
    const {
      width,
      height,
      quality = 80,
      format = 'webp'
    } = options;

    // Implementar otimização de imagens
    if (src.includes('firebasestorage.googleapis.com')) {
      // Firebase Storage optimization
      const url = new URL(src);
      url.searchParams.set('w', width);
      url.searchParams.set('h', height);
      url.searchParams.set('q', quality);
      return url.toString();
    }

    return src;
  };

  const generateSrcSet = (src, sizes) => {
    return sizes.map(size => {
      const optimized = optimizeImage(src, { width: size });
      return `${optimized} ${size}w`;
    }).join(', ');
  };

  return { optimizeImage, generateSrcSet };
}
```

#### **Virtual Scrolling**
```vue
<template>
  <!-- Para listas longas de estações -->
  <RecycleScroller
    :items="stations"
    :item-size="120"
    key-field="id"
    v-slot="{ item }"
    class="station-list"
  >
    <StationListItem
      :station="item"
      :key="item.id"
      @click="handleStationClick"
    />
  </RecycleScroller>
</template>
```

### **Backend Performance**

#### **Caching Strategy**
```javascript
// backend/cache.js
const Redis = require('ioredis');

class CacheService {
  constructor() {
    this.redis = process.env.REDIS_URL
      ? new Redis(process.env.REDIS_URL)
      : null;

    this.localCache = new Map();
  }

  async get(key) {
    if (this.redis) {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    }

    const cached = this.localCache.get(key);
    if (cached && Date.now() < cached.expiry) {
      return cached.value;
    }

    return null;
  }

  async set(key, value, ttl = 3600) {
    if (this.redis) {
      await this.redis.setex(key, ttl, JSON.stringify(value));
    } else {
      this.localCache.set(key, {
        value,
        expiry: Date.now() + (ttl * 1000)
      });
    }
  }

  async del(key) {
    if (this.redis) {
      await this.redis.del(key);
    } else {
      this.localCache.delete(key);
    }
  }
}

module.exports = new CacheService();
```

#### **Database Query Optimization**
```javascript
// backend/services/stationService.js
class StationService {
  // Query otimizada com índices
  async getStationsWithFilters(filters = {}) {
    let query = db.collection('estacoes_clinicas');

    // Aplicar filtros usando índices compostos
    if (filters.especialidade) {
      query = query.where('especialidade', '==', filters.especialidade);
    }

    if (filters.periodo_inep) {
      query = query.where('periodo_inep', '==', filters.periodo_inep);
    }

    // Ordenar por campo indexado
    query = query.orderBy('metadata.criado_em', 'desc');

    // Limitar resultados para performance
    query = query.limit(filters.limit || 50);

    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  // Batch operations para performance
  async updateMultipleStations(updates) {
    const batch = db.batch();

    updates.forEach(({ id, data }) => {
      const docRef = db.collection('estacoes_clinicas').doc(id);
      batch.update(docRef, data);
    });

    await batch.commit();
  }
}
```

---

## 🔐 Segurança e Boas Práticas

### **Security Best Practices**

#### **Environment Variables Security**
```javascript
// src/config/environment.js
const validateEnvironment = () => {
  const required = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_BACKEND_URL'
  ];

  const missing = required.filter(key => !import.meta.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
};

// Validar em desenvolvimento
if (import.meta.env.DEV) {
  validateEnvironment();
}

export const config = {
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN
  },
  backend: {
    url: import.meta.env.VITE_BACKEND_URL
  },
  features: {
    ai: import.meta.env.VITE_ENABLE_AI_FEATURES === 'true',
    analytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true'
  }
};
```

#### **Content Security Policy (CSP)**
```javascript
// src/utils/csp.js
export const cspConfig = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'", // Apenas para desenvolvimento
    'https://www.googletagmanager.com'
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'",
    'https://fonts.googleapis.com'
  ],
  'font-src': [
    "'self'",
    'https://fonts.gstatic.com'
  ],
  'img-src': [
    "'self'",
    'data:',
    'https:',
    'firebasestorage.googleapis.com'
  ],
  'connect-src': [
    "'self'",
    'https://*.firebaseio.com',
    'https://firestore.googleapis.com',
    'https://generativelanguage.googleapis.com'
  ],
  'frame-src': ["'none'"],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"]
};
```

#### **Input Sanitization**
```javascript
// src/utils/sanitization.js
import DOMPurify from 'dompurify';

export const sanitizeHTML = (html) => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'i', 'b',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'a', 'span'
    ],
    ALLOWED_ATTR: ['href', 'target', 'class', 'id'],
    ALLOW_DATA_ATTR: false
  });
};

export const sanitizeText = (text) => {
  return text
    .replace(/[<>]/g, '') // Remover caracteres HTML perigosos
    .trim()
    .substring(0, 1000); // Limitar tamanho
};
```

---

## 📚 Recursos e Referências

### **Documentação Oficial**
- [Vue.js 3 Documentation](https://vuejs.org/guide/)
- [Vuetify 3 Documentation](https://vuetifyjs.com/)
- [Vite Documentation](https://vitejs.dev/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Socket.IO Documentation](https://socket.io/docs/)
- [Google Gemini API Documentation](https://ai.google.dev/docs)

### **Ferramentas Recomendadas**
- **VS Code Extensions**: Vue, Volar, ESLint, Prettier
- **Browser Extensions**: Vue DevTools, Redux DevTools
- **Performance**: Lighthouse, PageSpeed Insights
- **Debugging**: Chrome DevTools, Firefox Developer Tools

### **Comunidade e Suporte**
- [Vue.js Discord](https://discord.com/invite/vue)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/vue.js)
- [GitHub Issues](https://github.com/vuejs/core/issues)

### **Tutoriais e Cursos**
- [Vue Mastery](https://www.vuemastery.com/)
- [Vue School](https://vueschool.io/)
- [Firebase YouTube Channel](https://www.youtube.com/c/Firebase)

---

## 📝 Conclusão

Este guia completo fornece todas as informações necessárias para desenvolver, testar, fazer debug e deploy do REVALIDAFLOW. A arquitetura moderna e bem estruturada permite desenvolvimento rápido e maintainability a longo prazo.

**Principais Pontos Fortes:**
- ✅ **Setup Completo** - Ambiente configurado em minutos
- ✅ **Ferramentas Modernas** - Vue 3, Vite, TypeScript
- ✅ **Testing Comprehensivo** - Unit, Integration, E2E
- ✅ **Debugging Tools** - Ferramentas integradas
- ✅ **CI/CD Pipeline** - Deploy automático
- ✅ **Performance Optimized** - Lazy loading, caching, otimização
- ✅ **Security Focused** - CSP, sanitização, boas práticas
- ✅ **Well Documented** - Guias completos e exemplos

**Próximos Passos:**
1. Configurar ambiente de desenvolvimento
2. Executar testes para validar setup
3. Explorar estrutura do projeto
4. Começar desenvolvimento de features
5. Configurar pipeline de CI/CD

---

**Última atualização**: 2025-10-26
**Versão**: 2.0.0
**Status**: Production Ready ✅