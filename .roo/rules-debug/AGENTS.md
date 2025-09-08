# Project Debug Rules (Non-Obvious Only)

- In the backend, `console.log` is only allowed in development mode (`NODE_ENV !== 'production'`).
- In production, avoid all `console.log` statements to reduce Cloud Run logging costs.
- The backend has a mock mode (`global.firebaseMockMode`) for local development without Firebase connection.
- Health checks in production return 204 No Content to minimize request and logging costs.
- The `/debug/metrics` endpoint provides insights into HTTP requests, Firestore reads, and socket connections.
- The `/debug/cache/cleanup` endpoint allows manual cleanup of expired cache entries.
