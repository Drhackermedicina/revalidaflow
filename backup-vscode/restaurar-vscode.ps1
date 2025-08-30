# Script de Restauração VS Code
# Execute este script após reinstalar o VS Code

Write-Host "🔄 Iniciando Restauração do VS Code..." -ForegroundColor Cyan

# Instalar extensões
Write-Host "`n📦 Instalando extensões..." -ForegroundColor Cyan
if (Test-Path "extensoes-instaladas.txt") {
    $extensoes = Get-Content "extensoes-instaladas.txt"
    foreach ($ext in $extensoes) {
        if ($ext.Trim() -ne "") {
            Write-Host "Instalando: $ext" -ForegroundColor Yellow
            code --install-extension $ext
        }
    }
    Write-Host "✅ Extensões instaladas" -ForegroundColor Green
}

# Restaurar configurações
Write-Host "`n⚙️ Restaurando configurações..." -ForegroundColor Cyan
$vscodeUserPath = "$env:APPDATA\Code\User"
$configSourcePath = ".\configuracoes"

if (Test-Path $configSourcePath) {
    if (-not (Test-Path $vscodeUserPath)) {
        New-Item -ItemType Directory -Path $vscodeUserPath -Force
    }
    
    # Copiar arquivos de configuração
    Get-ChildItem $configSourcePath -File | ForEach-Object {
        Copy-Item $_.FullName $vscodeUserPath -Force
        Write-Host "✅ $($_.Name) restaurado" -ForegroundColor Green
    }
    
    # Copiar snippets se existir
    $snippetsSource = "$configSourcePath\snippets"
    if (Test-Path $snippetsSource) {
        Copy-Item $snippetsSource $vscodeUserPath -Recurse -Force
        Write-Host "✅ Snippets restaurados" -ForegroundColor Green
    }
}

Write-Host "`n🎉 Restauração concluída! Reinicie o VS Code." -ForegroundColor Green
Read-Host "Pressione Enter para continuar..."
