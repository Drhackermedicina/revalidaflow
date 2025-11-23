# Architecture Documentation

## System Overview

Revalidaflow is a real-time clinical simulation platform built on a **Client-Server** architecture within a **Monorepo**. It separates concerns between a rich interactive frontend and a scalable backend service, connected via REST APIs and WebSockets.

## High-Level Architecture

```mermaid
graph TD
    User[User (Candidate/Actor/Evaluator)] -->|HTTPS| CDN[Firebase Hosting]
    User -->|WebSocket/HTTPS| API[Backend Service (Cloud Run)]
    
    subgraph Frontend [Vue.js Application]
        UI[Vuetify UI]
        Store[Pinia Store]
        SocketClient[Socket.IO Client]
        AuthClient[Firebase Auth SDK]
    end
    
    subgraph Backend [Node.js Server]
        Express[Express API]
        SocketServer[Socket.IO Server]
        Logic[Business Logic]
    end
    
    subgraph Infrastructure [Google Cloud / Firebase]
        Auth[Firebase Auth]
        Firestore[Firestore Database]
        Storage[Firebase Storage]
    end
    
    CDN --> UI
    UI --> Store
    Store --> SocketClient
    Store --> AuthClient
    
    SocketClient <-->|Real-time Events| SocketServer
    Express --> Logic
    Logic --> Firestore
    Logic --> Storage
    AuthClient --> Auth
```

## Core Components

### Frontend (Vue.js)
- **Framework**: Vue 3 with Composition API.
- **UI Library**: Vuetify for responsive, material design components.
- **State Management**: Pinia for handling complex application state (e.g., current simulation status, user session).
- **Real-time**: `socket.io-client` for bidirectional communication with the backend.

### Backend (Node.js)
- **Server**: Express.js for REST endpoints.
- **Real-time**: `socket.io` for managing simulation rooms and event broadcasting.
- **Hosting**: Deployed as a containerized service on Google Cloud Run.

### Data Layer (Firestore)
- **Database**: Google Cloud Firestore (NoSQL).
- **Collections**:
    - `users`: User profiles and roles.
    - `estacoes_clinicas`: Clinical station content.
    - `simulations`: Active and past simulation records.
    - `evaluations`: Completed evaluation forms.

## Key Workflows

### 1. Real-time Simulation
1.  **Room Creation**: Evaluator/Admin creates a simulation room via REST API.
2.  **Joining**: Candidate and Actor join the room via Socket.IO.
3.  **State Sync**: Actions (e.g., timer start, checklist item marked) are emitted to the backend and broadcasted to all room participants instantly.

### 2. Authentication
- Uses **Firebase Authentication** for secure sign-up/sign-in.
- Frontend obtains an ID token, which is verified by the backend for protected routes.

### 3. Evaluation
- Evaluators fill out forms in real-time.
- Data is saved to Firestore upon completion.
- Results are immediately available to the Candidate (if allowed by settings).
