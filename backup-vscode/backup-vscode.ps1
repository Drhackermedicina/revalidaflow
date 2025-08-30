# Script de Backup VS Code
# Executa backup completo das configurações e extensões do VS Code

param(
    [string]$BackupPath = "d:\Site arquivos\Projeto vs code\meuapp\backup-vscode"
)

Write-Host "🔄 Iniciando Backup do VS Code..." -ForegroundColor Cyan
Write-Host "📁 Pasta de destino: $BackupPath" -ForegroundColor Yellow

# Criar pasta de backup se não existir
if (-not (Test-Path $BackupPath)) {
    New-Item -ItemType Directory -Path $BackupPath -Force
    Write-Host "✅ Pasta de backup criada" -ForegroundColor Green
}

# 1. Backup das extensões
Write-Host "`n📦 Fazendo backup da lista de extensões..." -ForegroundColor Cyan
$extensoesList = code --list-extensions
$extensoesList | Out-File -FilePath "$BackupPath\extensoes-instaladas.txt" -Encoding UTF8
Write-Host "✅ Lista de extensões salva em: extensoes-instaladas.txt" -ForegroundColor Green

# 2. Backup das configurações do usuário
Write-Host "`n⚙️ Fazendo backup das configurações..." -ForegroundColor Cyan
$vscodeUserPath = "$env:APPDATA\Code\User"

if (Test-Path $vscodeUserPath) {
    $configBackupPath = "$BackupPath\configuracoes"
    if (-not (Test-Path $configBackupPath)) {
        New-Item -ItemType Directory -Path $configBackupPath -Force
    }
    
    # Copiar arquivos principais
    $arquivosConfig = @("settings.json", "keybindings.json", "tasks.json")
    foreach ($arquivo in $arquivosConfig) {
        $sourcePath = "$vscodeUserPath\$arquivo"
        if (Test-Path $sourcePath) {
            Copy-Item $sourcePath "$configBackupPath\$arquivo" -Force
            Write-Host "✅ $arquivo copiado" -ForegroundColor Green
        } else {
            Write-Host "⚠️ $arquivo não encontrado" -ForegroundColor Yellow
        }
    }
    
    # Copiar pasta snippets se existir
    $snippetsPath = "$vscodeUserPath\snippets"
    if (Test-Path $snippetsPath) {
        Copy-Item $snippetsPath "$configBackupPath\snippets" -Recurse -Force
        Write-Host "✅ Snippets copiados" -ForegroundColor Green
    }
} else {
    Write-Host "❌ Pasta de configurações do VS Code não encontrada" -ForegroundColor Red
}

# 3. Criar script de restauração
Write-Host "`n🔧 Criando script de restauração..." -ForegroundColor Cyan
$scriptRestauracao = @"
# Script de Restauração VS Code
# Execute este script após reinstalar o VS Code

Write-Host "🔄 Iniciando Restauração do VS Code..." -ForegroundColor Cyan

# Instalar extensões
Write-Host "`n📦 Instalando extensões..." -ForegroundColor Cyan
if (Test-Path "extensoes-instaladas.txt") {
    `$extensoes = Get-Content "extensoes-instaladas.txt"
    foreach (`$ext in `$extensoes) {
        if (`$ext.Trim() -ne "") {
            Write-Host "Instalando: `$ext" -ForegroundColor Yellow
            code --install-extension `$ext
        }
    }
    Write-Host "✅ Extensões instaladas" -ForegroundColor Green
}

# Restaurar configurações
Write-Host "`n⚙️ Restaurando configurações..." -ForegroundColor Cyan
`$vscodeUserPath = "`$env:APPDATA\Code\User"
`$configSourcePath = ".\configuracoes"

if (Test-Path `$configSourcePath) {
    if (-not (Test-Path `$vscodeUserPath)) {
        New-Item -ItemType Directory -Path `$vscodeUserPath -Force
    }
    
    # Copiar arquivos de configuração
    Get-ChildItem `$configSourcePath -File | ForEach-Object {
        Copy-Item `$_.FullName `$vscodeUserPath -Force
        Write-Host "✅ `$(`$_.Name) restaurado" -ForegroundColor Green
    }
    
    # Copiar snippets se existir
    `$snippetsSource = "`$configSourcePath\snippets"
    if (Test-Path `$snippetsSource) {
        Copy-Item `$snippetsSource `$vscodeUserPath -Recurse -Force
        Write-Host "✅ Snippets restaurados" -ForegroundColor Green
    }
}

Write-Host "`n🎉 Restauração concluída! Reinicie o VS Code." -ForegroundColor Green
Read-Host "Pressione Enter para continuar..."
"@

$scriptRestauracao | Out-File -FilePath "$BackupPath\restaurar-vscode.ps1" -Encoding UTF8
Write-Host "✅ Script de restauração criado: restaurar-vscode.ps1" -ForegroundColor Green

# 4. Criar arquivo de informações do backup
$infoBackup = @"
# Backup VS Code - $(Get-Date -Format "dd/MM/yyyy HH:mm:ss")

## 📊 Estatísticas do Backup
- Total de extensões: $($extensoesList.Count)
- Data do backup: $(Get-Date -Format "dd/MM/yyyy HH:mm:ss")
- Sistema: $env:COMPUTERNAME
- Usuário: $env:USERNAME

## 📂 Conteúdo do Backup
- extensoes-instaladas.txt - Lista de todas as extensões
- configuracoes/ - Configurações do usuário (settings, keybindings, snippets)
- restaurar-vscode.ps1 - Script automático de restauração
- README-Restauracao.md - Instruções detalhadas

## 🚀 Como Restaurar
1. Instale o VS Code na nova máquina
2. Execute: .\restaurar-vscode.ps1
3. Reinicie o VS Code

## 🔧 Restauração Manual (alternativa)
Se o script não funcionar, siga as instruções no README-Restauracao.md
"@

$infoBackup | Out-File -FilePath "$BackupPath\info-backup.txt" -Encoding UTF8

Write-Host "`n🎉 Backup concluído com sucesso!" -ForegroundColor Green
Write-Host "📁 Localização: $BackupPath" -ForegroundColor Cyan
Write-Host "`n📋 Arquivos criados:" -ForegroundColor Yellow
Get-ChildItem $BackupPath | ForEach-Object {
    Write-Host "   - $($_.Name)" -ForegroundColor White
}

Write-Host "`n💡 Para restaurar após formatação:" -ForegroundColor Cyan
Write-Host "   1. Copie a pasta 'backup-vscode' para a nova máquina" -ForegroundColor White
Write-Host "   2. Execute o arquivo 'restaurar-vscode.ps1'" -ForegroundColor White
