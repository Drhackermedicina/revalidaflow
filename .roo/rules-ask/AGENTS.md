# Project Documentation Rules (Non-Obvious Only)

- The project is a monorepo with a Vue.js frontend and a Node.js backend.
- The frontend is hosted on Firebase Hosting.
- The backend is hosted on Google Cloud Run.
- Firebase is used for authentication, Firestore database, and Storage.
- WebSockets (Socket.IO) are used for real-time communication during simulations.
- The backend has a mock mode for local development without Firebase connection.
- The project uses Vite for frontend build tooling.
- The project uses Vitest for testing.
- The project uses ESLint and Prettier for code linting and formatting.
- Path aliases `@images` and `@styles` should be used instead of `@/assets/images` and `@/assets/styles`.
