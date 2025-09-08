# Project Architecture Rules (Non-Obvious Only)

- The project is a monorepo with a Vue.js frontend and a Node.js backend.
- The frontend communicates with the backend via HTTP REST APIs and WebSockets.
- The backend is responsible for real-time communication during simulations using Socket.IO.
- Firebase is used for authentication, Firestore database, and Storage.
- The backend has a mock mode for local development without Firebase connection.
- The frontend uses path aliases `@images` and `@styles` for importing assets.
- The project uses Vite for frontend build tooling.
- The backend is hosted on Google Cloud Run and the frontend on Firebase Hosting.
- Cost optimization is critical for the backend on Cloud Run, so avoid unnecessary `console.log` in production.
- The backend implements a caching layer to reduce Firestore reads and optimize costs.
