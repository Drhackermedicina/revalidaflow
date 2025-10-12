/**
 * Script para substituir console.logs por sistema de Logger unificado
 * Executa automaticamente em todos os composables
 */

const fs = require('fs');
const path = require('path');

// Diretório dos composables
const composablesDir = path.join(__dirname, '..', 'src', 'composables');

// Função para processar um arquivo
function processFile(filePath) {
  const fileName = path.basename(filePath);
  const moduleName = fileName.replace(/\.(js|ts)$/, '');
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Verificar se já tem Logger importado
    const hasLoggerImport = content.includes('import Logger from') || 
                           content.includes("import { logger }") ||
                           content.includes('const logger =');
    
    // Verificar se tem console.log/error/warn/debug
    const hasConsole = /console\.(log|error|warn|debug)\(/.test(content);
    
    if (hasConsole && !hasLoggerImport) {
      // Adicionar import do Logger no início do arquivo
      const importStatement = `import Logger from '@/utils/logger';\nconst logger = new Logger('${moduleName}');\n\n`;
      
      // Encontrar onde inserir o import (após outros imports)
      const importRegex = /^(import .+ from .+;?\n)+/m;
      const match = content.match(importRegex);
      
      if (match) {
        // Inserir após os imports existentes
        const insertPosition = match.index + match[0].length;
        content = content.slice(0, insertPosition) + importStatement + content.slice(insertPosition);
      } else {
        // Se não houver imports, adicionar no início
        content = importStatement + content;
      }
      
      modified = true;
    }
    
    if (hasConsole) {
      // Substituir console.log por logger.debug
      content = content.replace(/console\.log\(/g, 'logger.debug(');
      
      // Substituir console.error por logger.error
      content = content.replace(/console\.error\(/g, 'logger.error(');
      
      // Substituir console.warn por logger.warn
      content = content.replace(/console\.warn\(/g, 'logger.warn(');
      
      // Substituir console.debug por logger.debug
      content = content.replace(/console\.debug\(/g, 'logger.debug(');
      
      modified = true;
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Processado: ${fileName}`);
      return true;
    } else {
      console.log(`⏭️  Ignorado: ${fileName} (sem console.log ou já tem Logger)`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Erro ao processar ${fileName}:`, error.message);
    return false;
  }
}

// Processar todos os arquivos .js e .ts no diretório composables
function processAllComposables() {
  console.log('🔄 Iniciando substituição de console.logs...\n');
  
  if (!fs.existsSync(composablesDir)) {
    console.error('❌ Diretório de composables não encontrado:', composablesDir);
    return;
  }
  
  const files = fs.readdirSync(composablesDir);
  const jsFiles = files.filter(file => /\.(js|ts)$/.test(file));
  
  let processed = 0;
  let total = jsFiles.length;
  
  jsFiles.forEach(file => {
    const filePath = path.join(composablesDir, file);
    if (processFile(filePath)) {
      processed++;
    }
  });
  
  console.log('\n' + '='.repeat(50));
  console.log(`✨ Concluído! ${processed}/${total} arquivos modificados`);
  console.log('='.repeat(50));
  
  if (processed > 0) {
    console.log('\n⚠️  IMPORTANTE:');
    console.log('1. Revise as mudanças antes de commitar');
    console.log('2. Teste o aplicativo para garantir que tudo funciona');
    console.log('3. O Logger só mostrará mensagens debug em desenvolvimento');
  }
}

// Executar
processAllComposables();
