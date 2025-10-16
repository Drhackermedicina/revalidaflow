# Repository Guidelines

## Project Structure & Module Organization
- Código frontend em `src/`: telas em `src/views/`, layouts compartilhados em `src/@layouts/`, helpers UI em `src/@core/`.
- Lógica de domínio distribuída entre `src/stores/`, `src/repositories/`, `src/services/` e `src/composables/`; utilitários em `src/utils/`.
- Backend Express em `backend/` com `server.js` como entrada e subpastas `routes/`, `services/`, `utils/`, `config/`.
- Testes em `tests/` (unitários, integração, e2e) e diagnósticos legados em `test/`; assets em `src/assets/`, build final em `dist/`.

## Build, Test, and Development Commands
- `npm run dev`: inicia Vite usando `config/vite.config.js`; variantes `dev:local` e `dev:cloud` ajustam o modo.
- `npm run backend:local`: sobe a API Express (equivalente a `cd backend && npm start`).
- `npm run build` / `npm run build:prod`: gera bundles para distribuição; use `npm run preview` para servir em `http://localhost:5050`.
- `npm run lint`: aplica ESLint com regras do projeto; `npm run test` roda Vitest, adicione `--coverage` quando necessário.
- `npx playwright test`: executa suítes E2E; use `--project=chromium` para depuração web.

## Coding Style & Naming Conventions
- Indentação de dois espaços, aspas simples em JS/Vue; siga `.eslintrc.cjs`.
- Nomeie componentes Vue em PascalCase (`AssessmentBoard.vue`) e stores/composables em camelCase (`useAssessmentStore`).
- Utilize aliases do `jsconfig.json` (`@core`, `@layouts`, etc.) para importações consistentes.

## Testing Guidelines
- Estruture specs espelhando o código (ex.: `tests/unit/repositories/QuestionBank.spec.ts`).
- Configure mocks globais em `tests/setup.js`; armazene artefatos Playwright em `tests/test-results/`.
- Respeite métricas de cobertura descritas em `docs/testing/GUIA_TESTES.md` e use `test/diagnostico-performance.js` para investigar regressões.

## Commit & Pull Request Guidelines
- Commits no formato `<type>: <summary>` no imperativo (`feat: adicionar cache`), sempre em português.
- PRs devem resumir o escopo, mencionar ambientes afetados e anexar evidências de `npm run test` e logs Playwright quando houver mudanças de UI.
- Inclua capturas de tela de alterações visuais e documente variáveis de ambiente, índices Firebase ou ajustes Sentry (ver `docs/SENTRY_SETUP.md` e `backend/DEPLOY_CLOUD_RUN.md`).

## Security & Configuration Tips
- Armazene segredos apenas em `.env.local` e `backend/.env`, ambos ignorados pelo Git.
- Gerencie Firebase com `firebase use --add` e valide `firestore.rules`/`storage.rules` antes de publicar.
- Ative Sentry conforme `docs/SENTRY_SETUP.md` e só realize deploys via `firebase deploy --only hosting,functions` ou scripts backend homologados.
