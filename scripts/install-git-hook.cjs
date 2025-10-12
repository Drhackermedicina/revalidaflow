#!/usr/bin/env node

/**
 * install-git-hook.js
 *
 * Script para instalar Git Hook de pre-commit
 * que avisa quando o PRD n„o foi atualizado
 *
 * Uso: npm run install-git-hook
 */

const fs = require('fs');
const path = require('path');

const hookContent = `#!/bin/sh

# PRD Guardian - Pre-commit Hook (Modo Aviso)
# Detecta mudanÁas relevantes e avisa para atualizar PRD

echo ""
echo "= [PRD Guardian] Verificando mudanÁas..."

# Captura arquivos staged
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)

# Detecta mudanÁas relevantes
NEW_PAGES=$(echo "$STAGED_FILES" | grep "^src/pages/.*\\.vue$" || true)
NEW_COMPONENTS=$(echo "$STAGED_FILES" | grep "^src/components/.*\\.vue$" || true)
NEW_COMPOSABLES=$(echo "$STAGED_FILES" | grep "^src/composables/.*\\.(js|ts)$" || true)
PKG_CHANGED=$(echo "$STAGED_FILES" | grep "^package\\.json$" || true)

# Verifica se PRD foi modificado
PRD_MODIFIED=$(echo "$STAGED_FILES" | grep "^docs/PRD_REVALIDAFLOW\\.md$" || true)
CHANGELOG_MODIFIED=$(echo "$STAGED_FILES" | grep "^docs/CHANGELOG_PRD\\.md$" || true)

# Se h· mudanÁas relevantes
if [ -n "$NEW_PAGES" ] || [ -n "$NEW_COMPONENTS" ] || [ -n "$NEW_COMPOSABLES" ] || [ -n "$PKG_CHANGED" ]; then

    echo "=Ê MudanÁas detectadas no cÛdigo:"
    [ -n "$NEW_PAGES" ] && echo "   " P·ginas: $(echo "$NEW_PAGES" | wc -l) arquivo(s)"
    [ -n "$NEW_COMPONENTS" ] && echo "   " Componentes: $(echo "$NEW_COMPONENTS" | wc -l) arquivo(s)"
    [ -n "$NEW_COMPOSABLES" ] && echo "   " Composables: $(echo "$NEW_COMPOSABLES" | wc -l) arquivo(s)"
    [ -n "$PKG_CHANGED" ] && echo "   " package.json modificado"
    echo ""

    # Verificar se PRD foi atualizado
    if [ -z "$PRD_MODIFIED" ] && [ -z "$CHANGELOG_MODIFIED" ]; then
        echo "†  PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP"
        echo "†   LEMBRETE: Considere atualizar a documentaÁ„o!"
        echo "†  PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP"
        echo ""
        echo "=° AÁıes recomendadas:"
        echo "   1. Execute: npm run update-prd"
        echo "   2. Revise: docs/PRD_REVALIDAFLOW.md"
        echo "   3. Revise: docs/CHANGELOG_PRD.md"
        echo "   4. Git add + commit novamente"
        echo ""
        echo "=¨ Ou use o comando no Claude Code: /update-prd"
        echo ""
        echo " Commit ser· permitido, mas È importante manter a documentaÁ„o atualizada!"
        echo ""
    else
        echo " [PRD Guardian] DocumentaÁ„o foi atualizada!"
        echo " PRD sincronizado com cÛdigo"
        echo ""
    fi
fi

# SEMPRE PERMITIR COMMIT (modo n„o-bloqueante)
exit 0
`;

function installHook() {
  const hookPath = path.join('.git', 'hooks', 'pre-commit');

  // Verificar se .git existe
  if (!fs.existsSync('.git')) {
    console.error('L DiretÛrio .git n„o encontrado!');
    console.error('   Execute este script na raiz do repositÛrio Git.');
    process.exit(1);
  }

  // Criar diretÛrio de hooks se n„o existir
  const hooksDir = path.join('.git', 'hooks');
  if (!fs.existsSync(hooksDir)) {
    fs.mkdirSync(hooksDir, { recursive: true });
  }

  // Verificar se j· existe hook
  if (fs.existsSync(hookPath)) {
    const existingContent = fs.readFileSync(hookPath, 'utf-8');
    if (existingContent.includes('PRD Guardian')) {
      console.log('9  Git Hook PRD Guardian j· est· instalado!');
      return;
    }

    // Backup do hook existente
    const backupPath = hookPath + '.backup';
    fs.copyFileSync(hookPath, backupPath);
    console.log(`=Ê Backup do hook existente criado em: ${backupPath}`);
  }

  // Escrever hook
  fs.writeFileSync(hookPath, hookContent, { mode: 0o755 });

  // Tornar execut·vel (chmod +x)
  if (process.platform !== 'win32') {
    fs.chmodSync(hookPath, 0o755);
  }

  console.log(' Git Hook PRD Guardian instalado com sucesso!');
  console.log('');
  console.log('=À O que acontece agora:');
  console.log('   " Antes de cada commit, o hook verifica mudanÁas no cÛdigo');
  console.log('   " Se detectar mudanÁas, AVISA para atualizar o PRD');
  console.log('   " Commit N√O È bloqueado (modo n„o-bloqueante)');
  console.log('');
  console.log('=° Para desinstalar:');
  console.log(`   rm ${hookPath}`);
  console.log('');
}

// Executar
console.log('');
console.log('PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP');
console.log('   >ù Instalador de Git Hook - PRD Guardian');
console.log('PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP');
console.log('');

installHook();
