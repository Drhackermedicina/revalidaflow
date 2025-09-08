# AGENTS.md

Este arquivo fornece orientações aos agentes ao trabalhar com código neste repositório.

## Comandos de Build/Lint/Test

- `npm run dev`: Inicia o servidor desenvolvimento do frontend.
- `npm run dev:local`: Inicia o servidor de desenvolvimento do frontend com proxy para o backend local.
- `npm run build`: Compila o frontend para produção.
- `npm run build:prod`: Compila o frontend para produção com variáveis de ambiente de produção.
- `npm run preview`: Inicia um servidor local para visualizar a build de produção.
- `npm run lint`: Executa o ESLint para verificar e corrigir problemas de estilo no código.
- `npm test`: Executa os testes com Vitest.
- `npm run backend:local`: Inicia o servidor backend localmente.
- `cd backend && npm start`: Inicia o servidor backend.
- `iniciar-dev.bat`: Inicia frontend e backend simultaneamente (Windows).
- `iniciar-backend-local.bat`: Inicia apenas o backend (Windows).
- `menu-dev.bat`: Abre menu com opções de desenvolvimento (Windows).
?- `rodar-testes.bat`: Executa testes com opções interativas (Windows).

## Diretrizes de Estilo de Código

- **Formatação**: Utiliza Prettier com as seguintes configurações:
  - `semi`: false (sem ponto e vírgula no final das linhas)
  - `singleQuote`: true (aspas simples para strings)
  - `trailingComma`: "all" (vírgula à direita em objetos e arrays multilinha)
- **Imports**:
  - Evite imports absolutos para `@/assets/images` e `@/assets/styles`. Use os aliases `@images` e `@styles` respectivamente.
  - Não use componentes do Vuetify diretamente via `vuetify/components`. Eles devem ser importados explicitamente quando necessário.
- **Nomenclatura**:
  - Componentes Vue devem usar PascalCase.
  - Nomes de variáveis e funções devem usar camelCase.
- **Vue**:
  - Prefira a Composition API.
  - Use `script setup` syntax quando possível.
- **Backend**:
  - Em produção, evite `console.log` para reduzir custos de logging no Cloud Run.
  - O backend possui um modo mock para desenvolvimento local que não se conecta ao Firebase.
