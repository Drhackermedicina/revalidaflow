#!/usr/bin/env pwsh

# Script para remover console.log de arquivos Vue/JS/TS
param(
    [string]$FilePath
)

if (-not $FilePath) {
    Write-Host "Uso: .\clean-console-logs.ps1 -FilePath <caminho_do_arquivo>"
    exit 1
}

if (-not (Test-Path $FilePath)) {
    Write-Host "Arquivo não encontrado: $FilePath"
    exit 1
}

Write-Host "Limpando console.log de: $FilePath"

# Ler o arquivo
$content = Get-Content $FilePath -Raw

# Backup
$backupPath = $FilePath + ".backup"
$content | Set-Content $backupPath

# Remover console.log de várias formas
$patterns = @(
    '^\s*console\.log\([^)]*\);\s*$',           # console.log simples
    '^\s*console\.log\([^;]*$',                 # console.log multi-linha (início)
    '^\s*[^;]*\);\s*$',                         # console.log multi-linha (fim)
    'console\.log\([^)]*\);?'                   # console.log geral
)

foreach ($pattern in $patterns) {
    $content = $content -replace $pattern, ''
}

# Limpar linhas vazias extras
$content = $content -replace '\r?\n\s*\r?\n\s*\r?\n', "`r`n`r`n"

# Salvar
$content | Set-Content $FilePath

Write-Host "✅ Console.log removidos de: $FilePath"
Write-Host "📝 Backup salvo em: $backupPath"
