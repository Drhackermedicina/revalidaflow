# Backup Git e Configurações Adicionais

## 🔧 Configurações Git para Backup

### Configurações atuais:
```
Nome: taiszocche92-glitch
Email: taiszocche92@gmail.com
Repositório: https://github.com/taiszocche92-glitch/revalidafacilapp.git
```

### Comandos para restaurar Git após formatação:
```powershell
# Configurar usuário
git config --global user.name "taiszocche92-glitch"
git config --global user.email "taiszocche92@gmail.com"

# Configurar repositório (dentro da pasta do projeto)
git remote set-url origin https://github.com/taiszocche92-glitch/revalidafacilapp.git
```

## 🐍 Configurações Python

### Dependências do projeto (backend-python-agent):
- As dependências estão no arquivo `requirements.txt`
- Para restaurar: `pip install -r requirements.txt`

### Virtual Environment:
- Recriar o ambiente virtual: `python -m venv .venv`
- Ativar: `.venv\Scripts\Activate.ps1`

## 📂 Estrutura de Pastas Importantes

```
meuapp/
├── backend-python-agent/     # Projeto Python principal
├── backend/                  # Backend Node.js
├── src/                      # Frontend
├── backup-vscode/           # Este backup
└── outros arquivos...
```

## 🔐 Arquivos Sensíveis (NÃO fazer backup público)

- `apikeys.txt`
- `revalida-companion-firebase-adminsdk.json`
- `temp_private_key_correct.txt`
- Qualquer arquivo com credenciais

⚠️ **IMPORTANTE**: Esses arquivos devem ser salvos separadamente e com segurança!

## 📝 Checklist Pós-Formatação

- [ ] Instalar VS Code
- [ ] Executar script de restauração de extensões
- [ ] Configurar Git (usuário e repositório)
- [ ] Instalar Python
- [ ] Recriar ambiente virtual
- [ ] Instalar dependências Python
- [ ] Configurar chaves API (separadamente)
- [ ] Testar conexão com repositório Git

Data: 29/08/2025
