# REGISTRO DO PROJETO

Este arquivo serve como a "memória" persistente para o assistente Gemini CLI, permitindo que ele se familiarize rapidamente com o estado do projeto no início de cada sessão.

## Estrutura do Projeto

Abaixo está a estrutura completa de arquivos e pastas do projeto.

```
D:.
|   .editorconfig
|   .env
|   .env.example
|   .eslintrc-auto-import.json
|   .eslintrc.cjs
|   .firebaserc
|   .gitattributes
|   .gitignore
|   .npmrc
|   .prettierrc.json
|   .roomodes
|   .stylelintrc.json
|   apikeys.txt
|   auto-imports.d.ts
|   BACKEND_GIT_CHECKLIST.md
|   CHANGELOG.md
|   check_env_keys.py
|   components.d.ts
|   CONTEXT_GUIDE.md
|   debug-firestore.js
|   diagnose_google_import.py
|   firebase.json
|   firestore-diagnostic.js
|   firestore.indexes.json
|   firestore.rules
|   GEMINI_API_FIX_SUMMARY.md
|   GIT_USAGE.md
|   googdrive.json
|   index.html
|   jsconfig.json
|   LICENSE
|   orchestrator-export copy.yaml
|   package-lock.json
|   package.json
|   pnpm-lock.yaml
|   PROJECT_STRUCTURE.md
|   RELATORIO_OTIMIZACAO_MEMORIA.md
|   revalida-companion-firebase-adminsdk.json
|   set-admin-role.js
|   SimulationSetup.vue
|   SISTEMA_APRENDIZADO_AGENTE.md
|   STEPPER_SYNC_FIX.md
|   storage.rules
|   tarefaincompleta.md
|   tmp_check_keys.py
|   vite.config.js
|
+---.firebase
|       hosting.ZGlzdA.cache
|       hosting.ZGlzdC1yZXZhbGlkYS1jb21wYW5pb24.cache
|
+---.venv
|   |   pyvenv.cfg
|   |
|   +---Include
|   +---Lib
|   |   \---site-packages
|   \---Scripts
|           activate
|           activate.bat
|           Activate.ps1
|           deactivate.bat
|           dotenv.exe
|           f2py.exe
|           fastapi.exe
|           normalizer.exe
|           numpy-config.exe
|           pip.exe
|           pip3.12.exe
|           pip3.exe
|           pyrsa-decrypt.exe
|           pyrsa-encrypt.exe
|           pyrsa-keygen.exe
|           pyrsa-priv2pub.exe
|           pyrsa-sign.exe
|           pyrsa-verify.exe
|           python.exe
|           python_d.exe
|           pythonw.exe
|           pythonw_d.exe
|           tqdm.exe
|           uvicorn.exe
|
+---.vscode
|       anchor-comments.code-snippets
|       extensions.json
|       mcp.json
|       ngrok.exe
|       ngrok.zip
|       ngrok-v3.zip
|       revalida-companion-firebase-adminsdk.json
|       settings.json
|       tasks.json
|       vscode_extensions.json
|       vscode_settings.json
|       vscode_tasks.json
|       vue.code-snippets
|       vuetify.code-snippets
|       vue-ts.code-snippets
|
+---backend
|   |   .env
|   |   .gcloudignore
|   |   .gitignore
|   |   Dockerfile
|   |   FIREBASE_CONFIG.md
|   |   gcloud
|   |   package.json
|   |   package-lock.json
|   |   server.js
|   |   start-local.sh
|   |
|   +---.git
|   +---.git_disabled
|   |   \---logs
|   +---node_modules
|   +---routes
|   |       adminReset.js
|   \---scripts
+---backend-python-agent
|   |   .env
|   |   dockerfile
|   |   gabaritoestacoes.json
|   |   gemini_client.py
|   |   gerador.md
|   |   ingest_and_index.py
|   |   main.py
|   |   MODELOS_GEMINI_ATUAIS.md
|   |   OTIMIZACAO_CONCLUIDA.md
|   |   rag.py
|   |   referencias.md
|   |   requirements.txt
|   |   serviceAccountKey.json
|   |
|   +---.venv
|   +---api_docs
|   +---memoria
|   +---pdf_referencias
|   +---provas inep
|   +---__pycache__
|   +---scripts
|   +---tests
|   \---tests_essenciais
+---backupd
|       README_BACKUPD.txt
|       vscode_extensions_instaladas.txt
|
+---dist-revalida-companion
|   |   favicon.ico
|   |   index.html
|   |   loader.css
|   |   logo.png
|   |   revalidafacillogo.png
|   |
|   +---assets
|   \---images
+---public
|   |   favicon.ico
|   |   loader.css
|   |   logo.png
|   |   revalidafacillogo.png
|   |
|   \---images
+---roo-code-memory-bank
|   |   .gitignore
|   |   developer-primer.md
|   |   LICENSE
|   |   projectBrief.md
|   |   README.md
|   |
|   +---.git
|   +---.github
|   +---config
|   +---images
|   +---memory-bank
|   \---modules
+---scripts
|       migrateDatabase.js
|       migrateDatabaseAuth.js
|       start-local-dev.sh
|       update-app-domain.bat
|       validateDatabase.js
|
+---src
|   |   App.vue
|   |   main.js
|   |
|   +---@core
|   +---@layouts
|   +---assets
|   +---components
|   +---composables
|   +---config
|   +---layouts
|   +---pages
|   +---plugins
|   +---services
|   +---stores
|   +---utils
|   \---views
+---tests
|   \---unit
\---trashX
    |   .nvmrc
    |   .prettierignore
    |   adminviewtrue.vue.txt
    |   analisador_questoes.log
    |   vite.config.js.timestamp-1754424527931-8e47c972b39f.mjs.txt
    |   vite.config.js.timestamp-1754936968797-fe0fcc8d734f.mjs.txt
    |
    +---arquivosbackupd
    \---backup
```

## Histórico de Alterações

- 2025-08-24: Arquivo de registro inicializado e estrutura completa do projeto documentada.

## Tarefa Ativa (Boomerang Task)

**Objetivo:** Configurar o fluxo de trabalho de desenvolvimento e produção, incluindo a criação de um novo serviço no Cloud Run, a configuração do ambiente local e a documentação do processo de deploy.

**Subtarefas:**
- [x] Explicar como configurar o ambiente de desenvolvimento local (Frontend local + Backend local).
- [ ] Guiar na criação de um novo serviço no Google Cloud Run.
- [ ] Detalhar o processo de deploy do backend para o Cloud Run.
- [ ] Explicar como conectar o frontend da nuvem ao novo backend da nuvem.

**Status:** Em andamento

**Próxima Ação:** Iniciar com a primeira subtarefa, explicando a configuração do ambiente local.
