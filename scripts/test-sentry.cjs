#!/usr/bin/env node

/**
 * Script para testar a configuração do Sentry
 * Execute: node scripts/test-sentry.js
 */

console.log('🧪 Teste do Sentry para REVALIDAFLOW\n');

// Teste 1: Frontend
console.log('1. 📱 Testando configuração do Frontend...');

try {
  // Simula carregamento do frontend
  process.env.VITE_SENTRY_DSN = process.env.VITE_SENTRY_DSN || 'https://test@sentry.io/123';

  if (process.env.VITE_SENTRY_DSN && process.env.VITE_SENTRY_DSN !== 'https://test@sentry.io/123') {
    console.log('   ✅ VITE_SENTRY_DSN configurado');
  } else {
    console.log('   ⚠️  VITE_SENTRY_DSN não configurado (usando valor de teste)');
  }

  console.log(`   📝 Frontend DSN: ${process.env.VITE_SENTRY_DSN?.substring(0, 30)}...`);
} catch (error) {
  console.log('   ❌ Erro na configuração do frontend:', error.message);
}

console.log('');

// Teste 2: Backend
console.log('2. 🖥️  Testando configuração do Backend...');

try {
  require('dotenv').config();

  // Carrega configuração do Sentry do backend
  const sentryConfig = require('../backend/config/sentry');

  if (process.env.SENTRY_DSN && process.env.SENTRY_DSN !== 'YOUR_SENTRY_DSN_HERE') {
    console.log('   ✅ SENTRY_DSN configurado');
  } else {
    console.log('   ⚠️  SENTRY_DSN não configurado');
  }

  console.log(`   📝 Backend DSN: ${(process.env.SENTRY_DSN || 'não configurado')?.substring(0, 30)}...`);
} catch (error) {
  console.log('   ❌ Erro na configuração do backend:', error.message);
}

console.log('');

// Teste 3: Dependências
console.log('3. 📦 Verificando dependências...');

try {
  const frontendPkg = require('../package.json');
  const backendPkg = require('../backend/package.json');

  // Verifica frontend
  if (frontendPkg.dependencies['@sentry/vue']) {
    console.log('   ✅ @sentry/vue instalado no frontend');
  } else {
    console.log('   ❌ @sentry/vue não encontrado no frontend');
  }

  if (frontendPkg.dependencies['@sentry/vite-plugin']) {
    console.log('   ✅ @sentry/vite-plugin instalado no frontend');
  } else {
    console.log('   ❌ @sentry/vite-plugin não encontrado no frontend');
  }

  // Verifica backend
  if (backendPkg.dependencies['@sentry/node']) {
    console.log('   ✅ @sentry/node instalado no backend');
  } else {
    console.log('   ❌ @sentry/node não encontrado no backend');
  }

  if (backendPkg.dependencies['@sentry/profiling-node']) {
    console.log('   ✅ @sentry/profiling-node instalado no backend');
  } else {
    console.log('   ❌ @sentry/profiling-node não encontrado no backend');
  }

} catch (error) {
  console.log('   ❌ Erro ao verificar dependências:', error.message);
}

console.log('');

// Teste 4: Arquivos de configuração
console.log('4. 📄 Verificando arquivos de configuração...');

const fs = require('fs');
const path = require('path');

const filesToCheck = [
  { path: 'src/plugins/sentry.js', name: 'Frontend Sentry Plugin' },
  { path: 'backend/config/sentry.js', name: 'Backend Sentry Config' },
  { path: 'docs/SENTRY_SETUP.md', name: 'Documentação Setup' }
];

filesToCheck.forEach(file => {
  const fullPath = path.join(__dirname, '..', file.path);
  if (fs.existsSync(fullPath)) {
    console.log(`   ✅ ${file.name}`);
  } else {
    console.log(`   ❌ ${file.name} não encontrado`);
  }
});

console.log('');

// Instruções finais
console.log('📋 PRÓXIMOS PASSOS:');
console.log('');
console.log('1. 🌐 Crie conta no Sentry: https://sentry.io');
console.log('2. 📱 Crie projeto Vue.js para frontend');
console.log('3. 🖥️  Crie projeto Node.js para backend');
console.log('4. 🔑 Configure DSNs no arquivo .env:');
console.log('   VITE_SENTRY_DSN=seu_frontend_dsn');
console.log('   SENTRY_DSN=seu_backend_dsn');
console.log('5. 📚 Leia: docs/SENTRY_SETUP.md');
console.log('');
console.log('🎯 Com Sentry configurado, você terá:');
console.log('   • Monitoramento de erros em tempo real');
console.log('   • Alertas automáticos');
console.log('   • Performance monitoring');
console.log('   • Session replay em erros');
console.log('   • Tracking de WebSocket e Firebase errors');
console.log('');