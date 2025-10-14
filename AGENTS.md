# Repository Guidelines

## Project Structure & Module Organization
Frontend code lives in `src/`: feature views in `views/`, shared layouts in `@layouts/`, core UI helpers in `@core/`, and domain logic in `stores/`, `repositories/`, `services/`, and `composables/`. Assets stay in `src/assets/`; Vite builds output to `dist/`. The Express backend runs from `backend/` (`routes/`, `services/`, `utils/`, `config/`) with `server.js` as entry. Cross-team knowledge sits in `docs/` (notably `docs/architecture/` and `docs/testing/`). Automation utilities live in `scripts/` (Windows launchers, `install-git-hook.cjs`, data population helpers). Tests group under `tests/` (`unit/`, `integration/`, `e2e/`, `tests/setup.js`), with diagnostics kept in `test/`.

## Build, Test, and Development Commands
- `npm run dev` starts Vite with `config/vite.config.js`; `dev:local` and `dev:cloud` tweak the mode.
- `npm run backend:local` (or `cd backend && npm start`) runs the API; Docker assets sit next to `backend/Dockerfile`.
- `npm run build`, `build:prod`, and `build:revalida-*` produce target-specific bundles.
- `npm run preview` serves the compiled frontend on port 5050.
- `npm run lint` applies ESLint fixes to Vue/JS sources.
- `npm run test` triggers Vitest; add `--coverage` when required. Playwright suites run via `npx playwright test` (scope with `--project=chromium` for debugging).

## Coding Style & Naming Conventions
Honor `.eslintrc.cjs`, two-space indentation, and single quotes in JS/Vue templates. Name Vue SFCs in PascalCase (`AssessmentBoard.vue`) and Pinia stores/composables in camelCase (`useAssessmentStore`). Keep aliases aligned with `jsconfig.json` (`@core`, `@layouts`, etc.). Share cross-feature helpers through `src/utils/` or `src/composables/`. After adding Iconify assets, run `npm run build:icons` (also executed postinstall).

## Testing Guidelines
Mirror source paths for specs (e.g., `tests/unit/repositories/QuestionBank.spec.ts`). Configure suite-wide mocks in `tests/setup.js`. Follow coverage baselines from `docs/testing/GUIA_TESTES.md` and close gaps before merging. Store Playwright artifacts in `tests/test-results/` and prune stale snapshots. Use `test/diagnostico-performance.js` when diagnosing performance regressions.

## Commit & Pull Request Guidelines
Adopt `<type>: <summary>` messages in the imperative (`feat: add simulation cache`). PRs should summarize scope, note affected environments, and attach proof of `npm run test` plus Playwright logs for UI work. Include UI captures when the frontend changes and call out new environment variables, Firebase indexes, or Sentry adjustments (see `docs/SENTRY_SETUP.md`, `backend/DEPLOY_CLOUD_RUN.md`).

## Comunicação & Idioma
Padronize discussões, descrições de commits, PRs e respostas de agentes em português claro e objetivo. Prefira termos técnicos já usados nos arquivos do projeto e traduza apenas quando necessário para evitar ambiguidade.

## Security & Configuration Tips
Keep secrets in local `.env` files (`.env.local`, `backend/.env`) ignored by Git. Configure Firebase via `firebase use --add` and review `firestore.rules`/`storage.rules` alongside schema changes. Enable Sentry following `docs/SENTRY_SETUP.md`, and only deploy with `firebase deploy --only hosting,functions` or the backend scripts from vetted branches.
