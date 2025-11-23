# Development Guide

## Prerequisites

- **Node.js**: Version 16 or higher.
- **npm**: Package manager (usually bundled with Node.js).
- **Firebase CLI**: For deployment and local emulation (`npm install -g firebase-tools`).

## Installation

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd REVALIDAFLOW
    ```

2.  **Install Frontend Dependencies**:
    ```bash
    npm install
    ```

3.  **Install Backend Dependencies**:
    ```bash
    cd backend
    npm install
    cd ..
    ```

## Running Locally

To run the full application locally, you need to start both the frontend and backend servers.

### 1. Start Backend Server
```bash
cd backend
npm start
```
*Runs on port 3000 by default.*

### 2. Start Frontend Development Server
```bash
npm run dev
```
*Runs on `http://localhost:5173` (or similar).*

> **Note**: Ensure your `.env` files are correctly configured with your Firebase and Google Cloud credentials.

## Building for Production

### Frontend
To build the Vue.js application for production:
```bash
npm run build
```
Output will be in the `dist/` directory.

## Deployment

The project uses Firebase Hosting for the frontend and Google Cloud Run for the backend.

### Deploy Frontend
```bash
firebase deploy --only hosting
```

### Deploy Backend
The backend is typically deployed via Google Cloud Build or manually containerized and pushed to Cloud Run. Refer to the specific CI/CD configuration for details.

## Testing

Run the test suite with:
```bash
npm test
```
*(Check `package.json` for specific test scripts)*

## Contribution Guidelines

1.  Create a feature branch (`git checkout -b feature/my-feature`).
2.  Commit your changes (`git commit -m 'Add some feature'`).
3.  Push to the branch (`git push origin feature/my-feature`).
4.  Open a Pull Request.
