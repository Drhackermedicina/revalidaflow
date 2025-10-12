#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function countComponentsRecursive(dir) {
  let count = 0;
  if (!fs.existsSync(dir)) return 0;

  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      count += countComponentsRecursive(filePath);
    } else if (file.endsWith('.vue')) {
      count++;
    }
  }
  return count;
}

function getCurrentStats() {
  log('\n[PRD Updater] Escaneando codigo-fonte...', 'cyan');

  const stats = {
    pages: fs.existsSync('src/pages') ?
           fs.readdirSync('src/pages').filter(f => f.endsWith('.vue')).length : 0,
    components: fs.existsSync('src/components') ?
                countComponentsRecursive('src/components') : 0,
    composables: fs.existsSync('src/composables') ?
                 fs.readdirSync('src/composables').filter(f =>
                   f.endsWith('.js') || f.endsWith('.ts')).length : 0,
    services: fs.existsSync('src/services') ?
              fs.readdirSync('src/services').filter(f =>
                f.endsWith('.js') || f.endsWith('.ts')).length : 0,
    stores: fs.existsSync('src/stores') ?
            fs.readdirSync('src/stores').filter(f =>
              f.endsWith('.js') || f.endsWith('.ts')).length : 0
  };

  log(`   Paginas: ${stats.pages}`, 'green');
  log(`   Componentes: ${stats.components}`, 'green');
  log(`   Composables: ${stats.composables}`, 'green');
  log(`   Services: ${stats.services}`, 'green');
  log(`   Stores: ${stats.stores}`, 'green');

  return stats;
}

function loadMetadata() {
  const metadataPath = 'docs/.prd-metadata.json';
  if (fs.existsSync(metadataPath)) {
    return JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
  }
  return null;
}

function saveMetadata(metadata) {
  const metadataPath = 'docs/.prd-metadata.json';
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
}

function updatePRD(stats) {
  log('\n[PRD Updater] Atualizando PRD...', 'cyan');

  const prdPath = 'docs/PRD_REVALIDAFLOW.md';
  if (!fs.existsSync(prdPath)) {
    log('   PRD nao encontrado em docs/!', 'red');
    return false;
  }

  let prd = fs.readFileSync(prdPath, 'utf-8');
  let updated = false;

  const archRegex = /(Estrutura do Projeto[\s\S]*?Paginas \(src\/pages\/\): )\d+( arquivos[\s\S]*?Componentes \(src\/components\/\): )\d+\+?( arquivos[\s\S]*?Composables \(src\/composables\/\): )\d+( arquivos[\s\S]*?Stores \(src\/stores\/\): )\d+( arquivos)/;

  if (archRegex.test(prd)) {
    prd = prd.replace(archRegex,
      `$1${stats.pages}$2${stats.components}+$3${stats.composables}$4${stats.stores}$5`
    );
    log('   Secao "Arquitetura do Codigo" atualizada', 'green');
    updated = true;
  }

  fs.writeFileSync(prdPath, prd);
  return updated;
}

function updateChangelog(stats, metadata) {
  log('\n[PRD Updater] Atualizando CHANGELOG...', 'cyan');

  const changelogPath = 'docs/CHANGELOG_PRD.md';
  if (!fs.existsSync(changelogPath)) {
    log('   CHANGELOG nao encontrado!', 'red');
    return false;
  }

  let changelog = fs.readFileSync(changelogPath, 'utf-8');
  const today = new Date().toISOString().split('T')[0];

  if (changelog.includes(`## [Auto] - ${today}`)) {
    log('   Entrada ja existe para hoje', 'yellow');
    return true;
  }

  const oldStats = metadata?.statistics || {};
  const hasChanges =
    stats.pages !== oldStats.totalPages ||
    stats.components !== oldStats.totalComponents ||
    stats.composables !== oldStats.totalComposables;

  if (!hasChanges) {
    log('   Sem mudancas significativas', 'yellow');
    return true;
  }

  const entry = `
## [Auto] - ${today}

### Alterado
- Atualizacao automatica de contadores
- Paginas: ${oldStats.totalPages || '?'} → ${stats.pages}
- Componentes: ${oldStats.totalComponents || '?'} → ${stats.components}
- Composables: ${oldStats.totalComposables || '?'} → ${stats.composables}
- Services: ${oldStats.totalServices || '?'} → ${stats.services}
- Stores: ${oldStats.totalStores || '?'} → ${stats.stores}

---
`;

  const lines = changelog.split('\n');
  let insertIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('---')) {
      insertIndex = i + 1;
      break;
    }
  }

  lines.splice(insertIndex, 0, entry);
  changelog = lines.join('\n');

  fs.writeFileSync(changelogPath, changelog);
  log('   CHANGELOG entry adicionado', 'green');
  return true;
}

function updateFeatureTracking(stats) {
  const trackingPath = 'docs/FEATURES_TRACKING.md';
  if (!fs.existsSync(trackingPath)) return;

  let tracking = fs.readFileSync(trackingPath, 'utf-8');
  const statsRegex = /(Estrutura do Projeto[\s\S]*?Paginas \(src\/pages\/\): )\d+( arquivos[\s\S]*?Componentes \(src\/components\/\): )\d+\+?( arquivos[\s\S]*?Composables \(src\/composables\/\): )\d+( arquivos)/;

  if (statsRegex.test(tracking)) {
    tracking = tracking.replace(statsRegex,
      `$1${stats.pages}$2${stats.components}+$3${stats.composables}$4`
    );

    const dateRegex = /(Ultima sincronizacao\*\*: )\d{4}-\d{2}-\d{2}/;
    if (dateRegex.test(tracking)) {
      tracking = tracking.replace(dateRegex, `$1${new Date().toISOString().split('T')[0]}`);
    }

    fs.writeFileSync(trackingPath, tracking);
    log('   FEATURES_TRACKING atualizado', 'green');
  }
}

function main() {
  log('', 'reset');
  log('===============================================', 'bright');
  log('   PRD Updater - REVALIDAFLOW', 'bright');
  log('===============================================', 'bright');

  const stats = getCurrentStats();
  const metadata = loadMetadata();
  const prdUpdated = updatePRD(stats);
  const changelogUpdated = updateChangelog(stats, metadata);
  updateFeatureTracking(stats);

  const newMetadata = {
    ...metadata,
    version: metadata?.version || '1.0.0',
    lastUpdated: new Date().toISOString(),
    statistics: {
      totalPages: stats.pages,
      totalComponents: stats.components,
      totalComposables: stats.composables,
      totalServices: stats.services,
      totalStores: stats.stores,
      estimatedLinesOfCode: (stats.pages * 200) + (stats.components * 150) + (stats.composables * 100)
    },
    sections: {
      ...(metadata?.sections || {}),
      features: {
        lastModified: new Date().toISOString().split('T')[0],
        componentCount: stats.components,
        pageCount: stats.pages,
        composableCount: stats.composables,
        serviceCount: stats.services,
        storeCount: stats.stores
      }
    }
  };

  saveMetadata(newMetadata);

  log('', 'reset');
  if (prdUpdated || changelogUpdated) {
    log('Documentacao atualizada com sucesso!', 'green');
    log('', 'reset');
    log('Proximos passos:', 'bright');
    log('   1. Revise: docs/PRD_REVALIDAFLOW.md', 'cyan');
    log('   2. Revise: docs/CHANGELOG_PRD.md', 'cyan');
    log('   3. Adicione detalhes especificos manualmente', 'yellow');
    log('   4. Commit: git add docs/* && git commit -m "docs: Update PRD"', 'cyan');
    log('', 'reset');
  } else {
    log('Nenhuma atualizacao necessaria', 'yellow');
  }
}

main();
