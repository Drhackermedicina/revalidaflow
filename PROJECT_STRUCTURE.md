# Estrutura do Projeto

Este documento descreve a organização das pastas e submódulos do projeto.

## Raiz do Projeto

- **backend/**  
  Submódulo Git. Contém o backend Node.js, APIs, rotas, scripts de deploy e configurações do Cloud Build.
  - server.js: Servidor principal Express + Socket.IO.
  - routes/: Rotas do agente e funcionalidades.
  - cloudbuild.yaml: Configuração de deploy automático.
  - Dockerfile: Imagem para deploy.
  - Outros arquivos e scripts de backend.

- **src/**  
  Frontend Vue.js, componentes, páginas, serviços, layouts e utilitários.

- **geradorestaçõespython/**  
  Scripts Python para geração de estações, provas e gabaritos.

- **public/**  
  Arquivos estáticos, imagens e logos.

- **roo-code-memory-bank/**  
  Módulos e configurações Roo para automação e memória de código.

- **.env.example, .gitignore, README.md, etc**  
  Arquivos de configuração e documentação.

## Observações

- O diretório backend é um submódulo Git. Para comandos git (add, commit, push) de arquivos dentro dele, execute os comandos diretamente na pasta backend.
- O deploy automático é configurado via Cloud Build (backend/cloudbuild.yaml).

---

*Atualize este documento conforme novas pastas ou submódulos forem adicionados.*
