# Script para remover console.log de forma segura
$files = @(
    'src\pages\EditStationView.vue',
    'src\components\AICorrectionPanel.vue',
    'src\components\AIFieldAssistant.vue'
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "Processando $file..."
        
        # Ler conteúdo
        $content = Get-Content $file -Raw
        
        # Remover console.log simples (uma linha)
        $content = $content -replace "^\s*console\.log\([^)]*\);\s*$", ""
        
        # Remover console.log com múltiplas linhas de parâmetros
        $content = $content -replace "console\.log\(\s*'[^']*',\s*\{[^}]*\}\s*\);?", ""
        
        # Remover console.log básicos
        $content = $content -replace "console\.log\([^)]*\);?", ""
        
        # Limpar linhas vazias extras
        $content = $content -replace "\r?\n\s*\r?\n\s*\r?\n", "`r`n`r`n"
        
        # Salvar arquivo
        $content | Set-Content $file -NoNewline
        
        Write-Host "✅ $file processado"
    }
}

Write-Host "🎉 Remoção de console.log concluída!"
