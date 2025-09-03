# Script para configurar os 3 repositórios independentes

Write-Host "=== Configurando repositórios independentes ===" -ForegroundColor Green

# 1. REPOSITÓRIO PRINCIPAL (meuapp)
Write-Host "`n1. Configurando repositório principal..." -ForegroundColor Yellow
Set-Location "D:\REVALIDAFLOW\Projeto vs code\meuapp"

# Adicionar pastas ao .gitignore se não existirem
$gitignoreContent = @"
# Ignorar outros repositórios
backend/
backend-python-agent/

# Logs
*.log

# Dependencies
node_modules/

# Environment
.env.local
.env.production

# Build
dist/
build/
"@

$gitignoreContent | Out-File -FilePath ".gitignore" -Encoding UTF8 -Force
Write-Host "✓ .gitignore atualizado para repositório principal"

# Status e commit
git status
git add .
git commit -m "Configuração: repositório principal independente"
Write-Host "✓ Commit realizado no repositório principal"

# 2. REPOSITÓRIO BACKEND
Write-Host "`n2. Configurando repositório backend..." -ForegroundColor Yellow
Set-Location "backend"

# Verificar se é um repositório Git
if (!(Test-Path ".git")) {
    git init
    Write-Host "✓ Repositório Git inicializado em backend/"
}

# .gitignore para backend
$backendGitignore = @"
# Logs
*.log

# Dependencies
node_modules/

# Environment
.env
.env.local
.env.production

# Build
dist/
build/

# IDE
.vscode/
.idea/
"@

$backendGitignore | Out-File -FilePath ".gitignore" -Encoding UTF8 -Force
Write-Host "✓ .gitignore criado para backend"

# Status e commit
git status
git add .
git commit -m "Configuração: repositório backend independente"
Write-Host "✓ Commit realizado no repositório backend"

# 3. REPOSITÓRIO BACKEND-PYTHON-AGENT
Write-Host "`n3. Configurando repositório backend-python-agent..." -ForegroundColor Yellow
Set-Location "../backend-python-agent"

# Verificar se é um repositório Git
if (!(Test-Path ".git")) {
    git init
    Write-Host "✓ Repositório Git inicializado em backend-python-agent/"
}

# .gitignore para Python
$pythonGitignore = @"
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg

# Virtual Environment
.venv/
venv/
ENV/
env/

# IDE
.vscode/
.idea/
*.swp
*.swo

# Logs
*.log

# Environment
.env
.env.local

# Cache
memoria/vectors/
*.cache
"@

$pythonGitignore | Out-File -FilePath ".gitignore" -Encoding UTF8 -Force
Write-Host "✓ .gitignore criado para backend-python-agent"

# Status e commit
git status
git add .
git commit -m "Configuração: repositório backend-python-agent independente"
Write-Host "✓ Commit realizado no repositório backend-python-agent"

# VOLTA PARA PASTA PRINCIPAL
Set-Location "../"

Write-Host "`n=== CONFIGURAÇÃO CONCLUÍDA ===" -ForegroundColor Green
Write-Host "Repositórios configurados:" -ForegroundColor White
Write-Host "• meuapp/ (principal)" -ForegroundColor Cyan
Write-Host "• backend/ (independente)" -ForegroundColor Cyan  
Write-Host "• backend-python-agent/ (independente)" -ForegroundColor Cyan

Write-Host "`nPróximos passos:" -ForegroundColor Yellow
Write-Host "1. Conectar cada repositório ao GitHub:"
Write-Host "   cd backend && git remote add origin URL_DO_REPO_BACKEND"
Write-Host "   cd backend-python-agent && git remote add origin URL_DO_REPO_PYTHON"
Write-Host "2. Push inicial:"
Write-Host "   git push -u origin main (em cada pasta)"
