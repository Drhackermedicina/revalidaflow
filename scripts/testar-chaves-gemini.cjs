#!/usr/bin/env node
/**
 * Script para testar todas as chaves da API do Gemini
 * Remove chaves inválidas do .env e relatório das válidas
 */

const fs = require('fs');
const path = require('path');

// Carregar módulo do backend
let GoogleGenerativeAI;
try {
  // Tentar carregar do backend (onde está instalado)
  const backendModulePath = path.join(__dirname, '..', 'backend', 'node_modules', '@google', 'generative-ai');
  const geminiModule = require(backendModulePath);
  GoogleGenerativeAI = geminiModule.GoogleGenerativeAI;
  
  if (!GoogleGenerativeAI || typeof GoogleGenerativeAI !== 'function') {
    throw new Error('GoogleGenerativeAI não encontrado no módulo');
  }
} catch (e) {
  console.error('❌ [ERRO] @google/generative-ai não encontrado!');
  console.error('   Erro:', e.message);
  console.error('   Execute: cd backend && npm install @google/generative-ai');
  process.exit(1);
}

// Cores para terminal
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Caminho do .env
const envPath = path.join(__dirname, '..', '.env');

/**
 * Carrega todas as chaves do .env
 */
function loadApiKeys() {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const keys = new Map();

  // Padrões a buscar
  const patterns = [
    /^GEMINI_API_KEY=(.+)$/m,
    /^GOOGLE_API_KEY_(\d+)=(.+)$/gm,
    /^VITE_GOOGLE_API_KEY_(\d+)=(.+)$/gm
  ];

  // Buscar GEMINI_API_KEY principal
  const geminiMatch = envContent.match(/^GEMINI_API_KEY=(.+)$/m);
  if (geminiMatch) {
    keys.set('GEMINI_API_KEY', geminiMatch[1].trim());
  }

  // Buscar todas as GOOGLE_API_KEY_X
  let match;
  const googlePattern = /^GOOGLE_API_KEY_(\d+)=(.+)$/gm;
  while ((match = googlePattern.exec(envContent)) !== null) {
    const index = match[1];
    const value = match[2].trim();
    if (value && !value.startsWith('#')) {
      keys.set(`GOOGLE_API_KEY_${index}`, value);
    }
  }

  // Buscar todas as VITE_GOOGLE_API_KEY_X
  const vitePattern = /^VITE_GOOGLE_API_KEY_(\d+)=(.+)$/gm;
  while ((match = vitePattern.exec(envContent)) !== null) {
    const index = match[1];
    const value = match[2].trim();
    if (value && !value.startsWith('#')) {
      keys.set(`VITE_GOOGLE_API_KEY_${index}`, value);
    }
  }

  return keys;
}

/**
 * Testa uma chave da API
 */
async function testApiKey(keyName, apiKey) {
  try {
    console.log(`${colors.cyan}[TESTE]${colors.reset} Testando ${keyName}...`);

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const result = await model.generateContent('Responda apenas "OK"');
    const response = await result.response;
    const text = response.text();

    if (text.toLowerCase().includes('ok') || text.trim()) {
      console.log(`${colors.green}[OK]${colors.reset} ${keyName} está funcionando!`);
      return { valid: true, keyName, apiKey };
    } else {
      console.log(`${colors.yellow}[AVISO]${colors.reset} ${keyName} retornou resposta inesperada`);
      return { valid: false, keyName, apiKey, reason: 'Resposta inesperada' };
    }
  } catch (error) {
    const errorMsg = error.message || '';
    
    if (errorMsg.includes('API_KEY_INVALID') || 
        errorMsg.includes('API key expired') ||
        errorMsg.includes('API key not valid') ||
        errorMsg.includes('INVALID_API_KEY')) {
      console.log(`${colors.red}[INVÁLIDA]${colors.reset} ${keyName}: Chave inválida ou expirada`);
      return { valid: false, keyName, apiKey, reason: 'API key inválida/expirada' };
    } else if (errorMsg.includes('quota') || errorMsg.includes('RESOURCE_EXHAUSTED')) {
      console.log(`${colors.yellow}[QUOTA]${colors.reset} ${keyName}: Quota excedida (mas chave válida)`);
      return { valid: true, keyName, apiKey, warning: 'Quota excedida' };
    } else {
      console.log(`${colors.red}[ERRO]${colors.reset} ${keyName}: ${errorMsg}`);
      return { valid: false, keyName, apiKey, reason: errorMsg };
    }
  }
}

/**
 * Remove chaves inválidas do .env
 */
function removeInvalidKeys(validKeys, invalidKeys) {
  let envContent = fs.readFileSync(envPath, 'utf-8');
  const lines = envContent.split('\n');
  const newLines = [];
  const keysToRemove = new Set(invalidKeys);

  for (let line of lines) {
    let shouldKeep = true;
    
    for (const keyName of keysToRemove) {
      // Remover linha que começa com a chave
      if (line.trim().startsWith(`${keyName}=`)) {
        shouldKeep = false;
        break;
      }
    }
    
    if (shouldKeep) {
      newLines.push(line);
    }
  }

  // Salvar arquivo
  const newContent = newLines.join('\n');
  fs.writeFileSync(envPath, newContent, 'utf-8');
  console.log(`${colors.green}[ATUALIZADO]${colors.reset} .env atualizado (chaves inválidas removidas)`);
}

/**
 * Gera relatório
 */
function generateReport(results) {
  const valid = results.filter(r => r.valid);
  const invalid = results.filter(r => !r.valid);

  console.log('\n' + '='.repeat(60));
  console.log(`${colors.blue}📊 RELATÓRIO DE TESTE${colors.reset}`);
  console.log('='.repeat(60));
  console.log(`${colors.green}✅ Chaves válidas: ${valid.length}${colors.reset}`);
  valid.forEach(r => {
    const status = r.warning ? `⚠️  ${r.warning}` : '✅';
    console.log(`   ${status} ${r.keyName}`);
  });
  
  console.log(`\n${colors.red}❌ Chaves inválidas: ${invalid.length}${colors.reset}`);
  invalid.forEach(r => {
    console.log(`   ❌ ${r.keyName} - ${r.reason}`);
  });
  
  console.log('\n' + '='.repeat(60));
  
  return { valid, invalid };
}

/**
 * Função principal
 */
async function main() {
  console.log(`${colors.blue}🔍 Iniciando teste de chaves da API Gemini...${colors.reset}\n`);

  const keys = loadApiKeys();
  console.log(`📝 Encontradas ${keys.size} chave(s) no .env\n`);

  if (keys.size === 0) {
    console.log(`${colors.red}[ERRO] Nenhuma chave encontrada no .env!${colors.reset}`);
    process.exit(1);
  }

  const results = [];
  
  // Testar cada chave
  for (const [keyName, apiKey] of keys.entries()) {
    const result = await testApiKey(keyName, apiKey);
    results.push(result);
    
    // Pequeno delay entre testes
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Gerar relatório
  const { valid, invalid } = generateReport(results);

  // Remover chaves inválidas se solicitado
  if (invalid.length > 0 && process.argv.includes('--auto-remove')) {
    removeInvalidKeys(
      valid.map(r => r.keyName),
      invalid.map(r => r.keyName)
    );
    console.log(`${colors.green}\n✅ Limpeza concluída!${colors.reset}`);
  } else if (invalid.length > 0) {
    console.log(`\n${colors.yellow}⚠️  Execute com --auto-remove para remover chaves inválidas${colors.reset}`);
  }

  // Estatísticas
  console.log(`\n${colors.cyan}📈 Estatísticas:${colors.reset}`);
  console.log(`   Total testadas: ${keys.size}`);
  console.log(`   Válidas: ${valid.length} (${Math.round((valid.length / keys.size) * 100)}%)`);
  console.log(`   Inválidas: ${invalid.length} (${Math.round((invalid.length / keys.size) * 100)}%)`);

  // Retornar lista de chaves válidas para uso no workflow
  return { valid, invalid };
}

// Executar
if (require.main === module) {
  main().catch(error => {
    console.error(`${colors.red}[ERRO FATAL]${colors.reset}`, error);
    process.exit(1);
  });
}

module.exports = { main, loadApiKeys, testApiKey };

