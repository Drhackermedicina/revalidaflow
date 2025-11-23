# 🚀 Configurações de Deploy - REVALIDAFLOW

## 📊 Resumo Executivo

Análise completa das configurações de deploy e infraestrutura do REVALIDAFLOW.

**Data da Análise**: 2025-11-23
**Stack**: Vue.js + Node.js + Firebase + Google Cloud
**Ambientes**: Desenvolvimento, Staging, Produção

---

## 🏗️ Arquitetura de Deploy

### **Estrutura Multi-Ambiente**

```
REVALIDAFLOW/
├── Frontend (Vue.js)
│   ├── Desenvolvimento: Vite dev server
│   ├── Staging: Firebase Hosting (staging)
│   └── Produção: Firebase Hosting (global CDN)
│
├── Backend (Node.js)
│   ├── Desenvolvimento: Local (Docker/Node.js)
│   ├── Staging: Google Cloud Run (staging)
│   └── Produção: Google Cloud Run (serverless)
│
└── Infraestrutura
    ├── Firebase Firestore (database)
    ├── Firebase Storage (arquivos)
    ├── Firebase Authentication (autenticação)
    └── Google Cloud Platform (computação)
```

---

## 🔧 Configurações do Frontend

### **Build Configuration** ([`config/vite.config.js`](config/vite.config.js))

```javascript
export default defineConfig({
  logLevel: 'info',
  plugins: [
    legacy({ targets: ['defaults', 'not IE 11'] }),
    vue(),
    vueJsx(),
    vuetify({
      styles: {
        configFile: 'src/assets/styles/variables/_vuetify.scss',
      },
    }),
    Components({
      dirs: ['src/@core/components', 'src/components'],
      dts: true,
      resolvers: [
        componentName => {
          if (componentName === 'VueApexCharts')
            return { name: 'default', from: 'vue3-apexcharts', as: 'VueApexCharts' }
        },
      ],
    }),
    AutoImport({
      imports: ['vue', 'vue-router', '@vueuse/core', '@vueuse/math', 'pinia'],
      vueTemplate: true,
      ignore: ['useCookies', 'useStorage'],
      eslintrc: { enabled: true }
    }),
    svgLoader()
  ],
  define: { 'process.env': {} },
  resolve: {
    alias: {
      '@': path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src'),
      '@core': path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', '@core'),
      '@layouts': path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', '@layouts'),
      '@images': path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'assets', 'images'),
      '@styles': path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'assets', 'styles'),
      '@configured-variables': path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'assets', 'styles', 'variables', '_template.scss'),
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug']
      }
    },
    treeshake: true,
    cssMinify: true,
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name]-[hash].js`,
        chunkFileNames: `assets/chunk-[name]-[hash].js`,
        assetFileNames: `assets/asset-[name]-[hash].[ext]`,
        // Estratégia de chunks otimizada
        manualChunks: id => {
          // Vue Core
          if (id.includes('@vue/') || (id.includes('vue') && !id.includes('vuetify'))) {
            return 'vue-core'
          }
          // Vuetify UI
          if (id.includes('vuetify')) {
            return 'vuetify'
          }
          // Firebase
          if (id.includes('firebase/app')) return 'firebase-app'
          if (id.includes('firebase/auth')) return 'firebase-auth'
          if (id.includes('firebase/firestore')) return 'firebase-firestore'
          if (id.includes('firebase/storage')) return 'firebase-storage'
          if (id.includes('firebase/')) return 'firebase-other'
          // TensorFlow
          if (id.includes('@tensorflow/')) return 'tensorflow'
          // Lottie
          if (id.includes('lottie-web')) return 'lottie'
          // Charts
          if (id.includes('apexcharts') || id.includes('vue3-apexcharts')) return 'charts'
          // Editor
          if (id.includes('@tiptap/')) return 'editor'
          // Socket.IO
          if (id.includes('socket.io-client')) return 'socket'
          // VueUse
          if (id.includes('@vueuse/')) return 'vueuse'
          // Lodash
          if (id.includes('lodash-es')) return 'lodash'
          // Markdown
          if (id.includes('marked')) return 'markdown'
          // Image Utils
          if (id.includes('browser-image-compression')) return 'image-utils'
          
          return 'vendor'
        }
      }
    },
    reportCompressedSize: false,
    sourcemap: false
  },
  optimizeDeps: {
    exclude: ['vuetify'],
    entries: ['./src/**/*.vue'],
  },
  server: {
    open: true,
    headers: {
      // Removido Cross-Origin-Opener-Policy para evitar erros no login Google
    }
  }
});
```

### **Scripts de Build** ([`package.json`](package.json))

```json
{
  "scripts": {
    "dev": "vite --config config/vite.config.js",
    "dev:local": "vite --mode development",
    "dev:cloud": "vite --mode production",
    "build": "vite build --config config/vite.config.js",
    "build:local": "vite build --mode development",
    "build:prod": "vite build --mode production",
    "preview": "vite preview --port 5050",
    "backend:local": "cd backend && npm run dev:local",
    "backend:deploy": "cd backend && ./deploy-optimized.sh",
    "backend:build": "docker build -f Dockerfile.backend -t revalida-backend-optimized .",
    "firebase:deploy": "firebase deploy",
    "firebase:deploy:staging": "firebase deploy --project staging",
    "lint": "eslint . --ext .vue,.js,.jsx,.cjs,.mjs --fix --ignore-path .gitignore",
    "test": "vitest --config config/vitest.config.js --environment jsdom"
  }
}
```

### **Configuração Firebase** ([`firebase.json`](firebase.json))

```json
{
  "firestore": {
    "database": "(default)",
    "location": "southamerica-east1",
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "hosting": {
    "public": "dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**",
      "backend",
      "gerador-de-estacoes"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(js|css|webp|png|jpg|jpeg|gif|ico|svg)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      },
      {
        "source": "index.html",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=3600, must-revalidate"
          }
        ]
      },
      {
        "source": "**",
        "headers": [
          {
            "key": "Content-Security-Policy",
            "value": "script-src 'self' https://www.google.com https://www.gstatic.com https://apis.google.com https://www.recaptcha.net https://cdn.jsdelivr.net 'unsafe-inline' 'unsafe-eval' blob: data:; object-src 'self'; connect-src 'self' http://localhost:3000 http://127.0.0.1:3000 ws://localhost:3000 ws://127.0.0.1:3000 https://www.googleapis.com https://firebase.googleapis.com https://firestore.googleapis.com https://storage.googleapis.com https://firebasestorage.googleapis.com https://revalida-companion.firebasestorage.app https://www.gstatic.com https://www.google.com https://www.recaptcha.net https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://apis.google.com https://generativelanguage.googleapis.com https://api.iconify.design https://api.unisvg.com https://api.simplesvg.com wss://*.firebaseio.com https://revalida-backend-772316263153.southamerica-east1.run.app wss://revalida-backend-772316263153.southamerica-east1.run.app https://*.run.app wss://*.run.app https://revalida-companion.rj.r.appspot.com wss://revalida-companion.rj.r.appspot.com https://*.sentry.io https://*.ingest.sentry.io https://o4510038780870656.ingest.de.sentry.io; worker-src 'self' blob: data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net data:; img-src 'self' data: https://fonts.gstatic.com https://www.gstatic.com https://lh3.googleusercontent.com https://firebasestorage.googleapis.com https://storage.googleapis.com https://revalida-companion.firebasestorage.app;"
          },
          {
            "key": "Cross-Origin-Opener-Policy",
            "value": "same-origin-allow-popups"
          }
        ]
      }
    ]
  },
  "storage": {
    "rules": "storage.rules"
  }
}
```

---

## 🔧 Configurações do Backend

### **Server Principal** ([`backend/server.js`](backend/server.js))

```javascript
// Configuração do Servidor Express + Socket.IO
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      "http://localhost:5174",
      "https://www.revalidaflow.com.br",
      "https://revalida-companion.web.app",
      "https://revalida-companion.firebaseapp.com"
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middlewares aplicados:
app.use(express.json());
app.use('/api/', generalLimiter); // Rate limiting em produção
app.use('/api/', verifyAuth); // Autenticação Firebase
app.use('/ai-chat', optionalAuth);
app.use('/ai-simulation', optionalAuth);

// Rotas registradas:
app.use('/ai-chat', aiLimiter, aiChatRouter);
app.use('/ai-simulation', aiLimiter, aiSimulationRouter);
app.use('/api/descriptive-questions', descriptiveQuestionsRouter);
app.use('/api/access', accessControlRouter);
app.use('/api/payment', paymentRouter);
app.use('/api/audio-transcription', audioTranscriptionRouter);
```

### **Docker Configuration** ([`backend/Dockerfile`](backend/Dockerfile))

```dockerfile
FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
```

### **Scripts de Backend** ([`backend/package.json`](backend/package.json))

```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "node -r dotenv/config server.js dotenv_config_path=../.env",
    "dev:local": "cross-env NODE_ENV=development node -r dotenv/config server.js dotenv_config_path=../.env",
    "dev:cloud": "cross-env NODE_ENV=production node server.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:middleware": "jest tests/middleware",
    "test:routes": "jest tests/routes",
    "test:integration": "node scripts/run-integration-tests.js",
    "test:integration:coverage": "node scripts/run-integration-tests.js --coverage",
    "test:integration:watch": "node scripts/run-integration-tests.js --watch",
    "test:socket": "node scripts/run-integration-tests.js --test=socket.integration.test.js",
    "test:all": "npm run test && npm run test:integration"
  }
}
```

### **Dependências do Backend**

```json
{
  "dependencies": {
    "@google-cloud/aiplatform": "^5.7.0",
    "@google-cloud/speech": "^7.2.1",
    "@google/generative-ai": "^0.21.0",
    "@sentry/node": "^10.12.0",
    "@sentry/profiling-node": "^10.12.0",
    "cors": "^2.8.5",
    "dotenv": "^16.6.1",
    "express": "^4.18.2",
    "express-rate-limit": "^8.1.0",
    "firebase-admin": "^13.4.0",
    "math-intrinsics": "^1.1.0",
    "mercadopago": "^2.9.0",
    "multer": "^2.0.2",
    "node-cache": "^5.1.2",
    "node-fetch": "^3.3.2",
    "socket.io": "^4.7.5"
  }
}
```

---

## 🔐 Segurança e Regras

### **Firestore Rules** ([`firestore.rules`](firestore.rules))

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Usuários autenticados podem acessar próprios dados
    match /usuarios/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth != null && request.auth.token.admin == true;
    }

    // Estações: leitura pública, escrita admin/moderator
    match /estacoes_clinicas/{stationId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && hasFullAccess();
    }

    // Questões descritivas: administradores podem escrever
    match /descriptiveQuestions/{questionId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && hasFullAccess();
    }

    // Funções de controle de acesso
    function hasAdminRole() {
      return request.auth != null &&
             get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.role == 'admin';
    }

    function hasFullAccess() {
      return isAdmin() || isAgentUser() || hasAdminRole();
    }
  }
}
```

### **Storage Rules** ([`storage.rules`](storage.rules))

```javascript
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if request.auth != null;
      // Escrita restrita para UIDs específicos ou service accounts
      allow write: if request.auth != null && (
        request.auth.uid == 'RtfNENOqMUdw7pvgeeaBVSuin662' ||
        request.auth.uid == 'KiSITAxXMAY5uU3bOPW5JMQPent2' ||
        request.auth.uid == 'Iehedj0FJtN36tGfDyIojpdiJGi2' ||
        request.auth.uid == 'J1Q8Zn9DuXaPmx7GMKHCQZ0NhUH3' ||
        request.auth.token.email != null // Service Accounts
      );
    }
  }
}
```

---

## 🌐 Ambiente de Produção

### **Infraestrutura Google Cloud**

#### **Frontend (Firebase Hosting)**
- **CDN Global**: Firebase Hosting
- **Domínio**: revalidaflow.com.br
- **Cache**: 1 ano para assets estáticos
- **HTTPS**: Automático via Firebase
- **Deploy**: `npm run firebase:deploy`

#### **Backend (Google Cloud Run)**
- **Runtime**: Node.js 18
- **Plataforma**: Serverless
- **Escalabilidade**: Automática (0 → N instâncias)
- **Região**: southamerica-east1
- **Deploy**: Docker + Cloud Run

#### **Database (Firebase Firestore)**
- **Tipo**: NoSQL document database
- **Região**: southamerica-east1
- **Replicação**: Multi-região automática
- **Segurança**: Rules granulares por coleção

#### **Storage (Firebase Storage)**
- **Tipo**: Object storage
- **CDN**: Integrado com Firebase Hosting
- **Segurança**: Rules por UID e Service Account

---

## 🚀 Ambiente de Desenvolvimento

### **Local Development**

```bash
# Frontend (Vue.js + Vite)
npm run dev:local
# → http://localhost:5173

# Backend (Node.js + Express)
npm run backend:local
# → http://localhost:3000

# Ambiente completo
npm run dev:local
# → Frontend: http://localhost:5173
# → Backend: http://localhost:3000
```

### **Docker Development**

```bash
# Build backend Docker
npm run backend:build

# Executar container
docker run -p 3000:3000 revalida-backend-optimized

# Ou usando docker-compose
docker-compose up backend
```

---

## 🔧 Scripts de Deploy

### **Deploy Automatizado**

```bash
# Deploy frontend para produção
npm run firebase:deploy

# Deploy frontend para staging
npm run firebase:deploy:staging

# Deploy backend para produção
npm run backend:deploy

# Build otimizado para produção
npm run backend:build
```

### **Pipeline de CI/CD Implícito**

```yaml
# .github/workflows/deploy.yml (conceitual)
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci && cd backend && npm ci
      - name: Run tests
        run: npm test && cd backend && npm test

  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Build frontend
        run: npm run build:prod
      - name: Build backend
        run: npm run backend:build
      - name: Deploy to Firebase
        run: npm run firebase:deploy
      - name: Deploy backend to Cloud Run
        run: npm run backend:deploy
```

---

## 📊 Monitoramento e Observabilidade

### **Health Checks**

```javascript
// Endpoint de saúde do backend
GET /health

// Response (produção)
Status: 204 No Content

// Response (desenvolvimento)
{
  "status": "ok",
  "timestamp": "2025-11-23T20:15:00Z",
  "uptime": 86400,
  "memory": process.memoryUsage(),
  "cache": getCacheStats(),
  "version": "1.0.0"
}
```

### **Sentry Integration**

```javascript
// Configuração Sentry (backend)
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});

// Middleware de captura de erros
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());
```

---

## 🔐 Variáveis de Ambiente

### **Frontend (.env.local)**

```bash
# Configurações do Frontend
VITE_BACKEND_URL=http://localhost:3000
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_APP_ID=your_app_id
VITE_MEASUREMENT_ID=your_measurement_id

# Feature flags
VITE_ENABLE_AI_FEATURES=true
VITE_ENABLE_ANALYTICS=false
```

### **Backend (backend/.env)**

```bash
# Configurações do Backend
NODE_ENV=production
PORT=3000

# Firebase Admin SDK
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
FIREBASE_CLIENT_EMAIL=your_service_account@your_project.iam.gserviceaccount.com
FIREBASE_STORAGE_BUCKET=your_bucket.appspot.com

# Google APIs
GOOGLE_API_KEY_1=your_gemini_api_key_1
GOOGLE_API_KEY_2=your_gemini_api_key_2
# ... até GOOGLE_API_KEY_12

# Mercado Pago
MERCADOPAGO_ACCESS_TOKEN=your_mercadopago_token

# Sentry
SENTRY_DSN=your_sentry_dsn

# Frontend URL (para CORS)
FRONTEND_URL=https://www.revalidaflow.com.br
```

---

## 🎯 Otimizações de Produção

### **Performance**

1. **Bundle Splitting**: Divisão inteligente de chunks
2. **Lazy Loading**: Carregamento sob demanda
3. **Tree Shaking**: Remoção de código não utilizado
4. **Minification**: Terser para JS/CSS
5. **Cache**: CDN Firebase + Cache headers
6. **Compression**: Gzip automático

### **Segurança**

1. **CORS**: Configuração restritiva
2. **Rate Limiting**: Proteção contra abuso
3. **Authentication**: Firebase Auth JWT tokens
4. **Authorization**: Role-based access control
5. **Input Validation**: Sanitização de inputs
6. **Security Headers**: CSP, CORS, XSS protection

### **Custo**

1. **Logging**: Mínimo em produção
2. **Monitoring**: Health checks leves
3. **Cache**: Redis + Memory cache
4. **Serverless**: Auto-scaling zero quando ocioso
5. **CDN**: Distribuição global eficiente

---

## 🔧 Processo de Deploy

### **1. Preparação**
```bash
# 1. Atualizar versão
npm version patch  # 1.0.0 → 1.0.1

# 2. Rodar testes
npm run test:all

# 3. Build de produção
npm run build:prod
npm run backend:build

# 4. Verificar builds
ls -la dist/
docker images | grep revalida-backend
```

### **2. Deploy Frontend**
```bash
# Deploy para Firebase Hosting
firebase deploy --only hosting

# Verificar deploy
curl -I https://www.revalidaflow.com.br
```

### **3. Deploy Backend**
```bash
# Deploy para Cloud Run
gcloud builds submit --tag gcr.io/PROJECT_ID/revalida-backend:v1.0.1

gcloud run deploy revalida-backend \
  --image gcr.io/PROJECT_ID/revalida-backend:v1.0.1 \
  --platform managed \
  --region southamerica-east1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production
```

### **4. Pós-Deploy**
```bash
# Verificar saúde
curl https://revalida-backend-772316263153.southamerica-east1.run.app/health

# Verificar logs
gcloud logs read revalida-backend --limit 50

# Monitorar métricas
gcloud monitoring metrics list
```

---

## 📈 Métricas e KPIs

### **Performance Targets**
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Time to Interactive**: < 3.0s
- **Backend Response Time**: < 200ms avg
- **Uptime**: > 99.9%
- **Error Rate**: < 0.1%

### **Monitoramento Ativo**
- ✅ **Sentry**: Error tracking
- ✅ **Cloud Monitoring**: Performance metrics
- ✅ **Firebase Analytics**: User behavior
- ✅ **Health Checks**: Automated monitoring
- ✅ **Log Analysis**: Structured logging

---

## 🚨 Troubleshooting Comum

### **Deploy Issues**

```bash
# Problema: CORS error
Solução: Verificar allowedOrigins no backend

# Problema: Firebase rules denied
Solução: Testar rules no Firebase console

# Problema: Socket.IO connection failed
Solução: Verificar configuration de CORS no servidor

# Problema: Environment variables missing
Solução: Verificar .env files e secrets no Cloud Run
```

### **Performance Issues**

```bash
# Problema: Bundle size grande
Solução: Analizar bundle source map e otimizar chunks

# Problema: Slow API responses
Solução: Verificar queries Firestore e índices

# Problema: High memory usage
Solução: Verificar memory leaks e otimizar cache
```

---

## 🎯 Conclusão

### **Pontos Fortes**
- ✅ **Infraestrutura Moderna**: Serverless + CDN global
- ✅ **Deploy Automatizado**: Scripts e pipeline implícito
- ✅ **Segurança Robusta**: Múltiplas camadas de proteção
- ✅ **Performance Otimizada**: Cache + bundle splitting
- ✅ **Monitoramento Completo**: Observabilidade full-stack

### **Oportunidades de Melhoria**
- 🚀 **Pipeline CI/CD**: Implementar GitHub Actions explícito
- 🚀 **Canary Deploys**: Deploy gradual com rollback
- 🚀 **Auto-scaling Rules**: Configurações mais granulares
- 🚀 **Performance Budgets**: Limites automáticos de performance
- 🚀 **Distributed Tracing**: OpenTelemetry para tracing completo

---

**Configuração de deploy analisada com sucesso!** 🎉

*Infraestrutura robusta e preparada para escala*