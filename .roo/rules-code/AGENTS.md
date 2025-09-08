# Project Coding Rules (Non-Obvious Only)

- Always use `npm run dev` to start the frontend development server.
- Always use `cd backend && npm start` to start the backend server.
- For frontend code, always follow the Vue.js Composition API and `script setup` syntax.
- For styling, always use the project's Prettier configuration (`semi: false`, `singleQuote: true`, `trailingComma: "all"`).
- Always use the path aliases `@images` and `@styles` instead of `@/assets/images` and `@/assets/styles`.
- In the backend, always avoid `console.log` in production to reduce Cloud Run logging costs.
- Always check if the backend is in mock mode (`global.firebaseMockMode`) before performing Firebase operations.
