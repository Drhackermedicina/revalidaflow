# Backup VS Code - Script de Restauração

## 📋 Lista de Extensões Instaladas

### Comando para instalar todas as extensões de uma vez:
```powershell
# Instalar todas as extensões de uma vez
$extensoes = @(
    "antfu.iconify",
    "cipchk.cssrem",
    "dbaeumer.vscode-eslint",
    "dongido.sync-env",
    "editorconfig.editorconfig",
    "fabiospampinato.vscode-highlight",
    "github.copilot",
    "github.copilot-chat",
    "github.vscode-github-actions",
    "github.vscode-pull-request-github",
    "google.geminicodeassist",
    "kilocode.kilo-code",
    "matijao.vue-nuxt-snippets",
    "ms-azuretools.vscode-containers",
    "ms-ceintl.vscode-language-pack-pt-br",
    "ms-python.debugpy",
    "ms-python.python",
    "ms-python.vscode-pylance",
    "ms-python.vscode-python-envs",
    "ms-vscode.powershell",
    "stylelint.vscode-stylelint",
    "vue.volar",
    "xabikos.javascriptsnippets"
)

foreach ($ext in $extensoes) {
    Write-Host "Instalando extensão: $ext" -ForegroundColor Green
    code --install-extension $ext
}
```

### Comando alternativo (uma linha por vez):
```bash
code --install-extension antfu.iconify
code --install-extension cipchk.cssrem
code --install-extension dbaeumer.vscode-eslint
code --install-extension dongido.sync-env
code --install-extension editorconfig.editorconfig
code --install-extension fabiospampinato.vscode-highlight
code --install-extension github.copilot
code --install-extension github.copilot-chat
code --install-extension github.vscode-github-actions
code --install-extension github.vscode-pull-request-github
code --install-extension google.geminicodeassist
code --install-extension kilocode.kilo-code
code --install-extension matijao.vue-nuxt-snippets
code --install-extension ms-azuretools.vscode-containers
code --install-extension ms-ceintl.vscode-language-pack-pt-br
code --install-extension ms-python.debugpy
code --install-extension ms-python.python
code --install-extension ms-python.vscode-pylance
code --install-extension ms-python.vscode-python-envs
code --install-extension ms-vscode.powershell
code --install-extension stylelint.vscode-stylelint
code --install-extension vue.volar
code --install-extension xabikos.javascriptsnippets
```

## 📂 Principais Pastas para Backup Manual

### Windows:
```
# Configurações do usuário
%APPDATA%\Code\User\settings.json
%APPDATA%\Code\User\keybindings.json
%APPDATA%\Code\User\snippets\

# Extensões (opcional - são reinstaladas via script acima)
%USERPROFILE%\.vscode\extensions\
```

### Localização exata no seu sistema:
```
C:\Users\[SEU_USUARIO]\AppData\Roaming\Code\User\
```

## 🔧 Configurações Importantes

1. **settings.json** - Todas as configurações personalizadas
2. **keybindings.json** - Atalhos de teclado personalizados
3. **snippets/** - Snippets personalizados
4. **tasks.json** - Tarefas personalizadas (se houver)

## 🚀 Processo de Restauração Completa

1. Instalar o VS Code
2. Executar o script PowerShell acima para instalar extensões
3. Copiar os arquivos de configuração para a pasta User
4. Reiniciar o VS Code

## 📝 Extensões Principais Identificadas

- **GitHub Copilot** - Assistente de código AI
- **Python** - Suporte completo para Python
- **Vue/Nuxt** - Desenvolvimento Vue.js
- **PowerShell** - Suporte para PowerShell
- **ESLint** - Linting JavaScript/TypeScript
- **EditorConfig** - Configuração de editor
- **Containers** - Trabalho com Docker

Data do backup: $(Get-Date -Format "dd/MM/yyyy HH:mm")
