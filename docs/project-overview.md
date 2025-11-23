# Project Overview

## Executive Summary

**Revalidaflow** is a comprehensive platform designed to simulate clinical stations for medical students preparing for the Revalida examination. It facilitates real-time interaction between candidates and actors/evaluators, providing a realistic assessment environment.

The application is built as a **monorepo** containing both the frontend (Vue.js) and backend (Node.js) components. It leverages the Firebase ecosystem for hosting, authentication, and data storage, while utilizing Google Cloud Run for scalable backend services.

## Key Features

- **Real-time Simulations**: Live interaction between users with synchronized states.
- **Role-based Access**: Distinct interfaces for Candidates, Actors, and Evaluators.
- **Clinical Stations**: Database of clinical scenarios with checklists and media assets.
- **Feedback & Evaluation**: Structured evaluation forms and performance tracking.
- **AI Integration**: (Experimental) AI-driven evaluation and interaction features using Gemini and other models.

## Technology Stack Summary

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | Vue.js 3 | Main application framework (Composition API) |
| **UI Framework** | Vuetify | Material Design component library |
| **State Management** | Pinia | Global state management |
| **Backend** | Node.js / Express | API and WebSocket server |
| **Real-time** | Socket.IO | Real-time bidirectional communication |
| **Database** | Firestore | NoSQL document database |
| **Auth** | Firebase Auth | User authentication and management |
| **Hosting** | Firebase Hosting | Frontend delivery |
| **Compute** | Google Cloud Run | Backend container hosting |

## Architecture Type

- **Type**: Monorepo
- **Pattern**: Client-Server with Real-time WebSockets
- **Status**: Brownfield (Active Development)

## Repository Structure

The project is organized as a monorepo:

- **Root**: Configuration and Frontend source code (`src/`)
- **Backend**: Dedicated backend directory (`backend/`)

## User Roles

1.  **Candidate**: The student performing the simulation.
2.  **Actor**: Simulates the patient or medical staff.
3.  **Evaluator**: Observes and grades the candidate's performance.
4.  **Admin**: Manages content, users, and system settings.
