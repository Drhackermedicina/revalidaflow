# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

REVALIDAFLOW is a Vue.js + Node.js monorepo for medical students to practice clinical station simulations in real-time. It enables two-user interactions where one acts as an actor/evaluator and the other as a candidate.

- **Frontend**: Vue.js 3 with Vuetify, hosted on Firebase Hosting
- **Backend**: Node.js with Express and Socket.IO, hosted on Google Cloud Run
- **Database**: Google Firestore (collections: `estacoes_clinicas`, `usuarios`)
- **Storage**: Firebase Storage for attachments and files
- **Auth**: Firebase Authentication

## Common Development Commands

### Development
```bash
# Frontend development server
npm run dev                    # Runs on http://localhost:5173

# Backend development server
cd backend && npm start        # Runs on http://localhost:3000

# Development scripts (Windows)
scripts/iniciar-dev.bat       # Start both frontend and backend
scripts/iniciar-backend-local.bat  # Start backend only
```

### Build and Deploy
```bash
# Build variants
npm run build                 # Main build
npm run build:local           # Development build
npm run build:prod            # Production build
npm run build:revalida-companion    # Companion app build
npm run build:revalidaflowapp       # RevalidaFlow build
npm run build:webapp          # Web app build

# Backend operations
npm run backend:local         # Run local backend
npm run backend:build         # Docker build
npm run backend:deploy        # Deploy backend

# Firebase deployment
npm run firebase:deploy       # Deploy to production
npm run firebase:deploy:staging  # Deploy to staging
```

### Testing and Quality
```bash
npm test                      # Run Vitest tests
npm run lint                  # ESLint with auto-fix
scripts/rodar-testes.bat     # Interactive test runner
```

## Architecture

### Frontend Structure
- **@core/**: Core UI components and utilities
- **@layouts/**: Layout components and structure
- **pages/**: Main application pages
- **components/**: Reusable Vue components
- **composables/**: Vue composition API utilities
- **services/**: API and business logic services
- **stores/**: Pinia state management
- **utils/**: Utility functions

### Key Components
- **SimulationView.vue**: Main simulation interface
- **StationList.vue**: Clinical station selection
- **EditStationView.vue**: Station editing with AI assistant
- **AdminUpload.vue**: Station upload management
- **AIFieldAssistant.vue**: AI-powered editing assistant
- **AdminAgentAssistant.vue**: Global AI agent for administrators

### Backend Structure (backend/)
- **server.js**: Main server file
- **routes/**: API route handlers
- **utils/**: Backend utilities
- **config/**: Configuration files

### Environment Configuration
Frontend environment variables must have `VITE_` prefix:
- `VITE_FIREBASE_*`: Firebase configuration
- `VITE_BACKEND_URL`: Backend API URL

Backend uses standard environment variables without prefix.

### Build Configuration
- **Vite Config**: `config/vite.config.js`
- **Path Aliases**:
  - `@` → `src/`
  - `@core` → `src/@core/`
  - `@layouts` → `src/@layouts/`
  - `@images` → `src/assets/images/`
  - `@styles` → `src/assets/styles/`

### Firebase Integration
- **Hosting**: Frontend deployment to Firebase Hosting
- **Firestore**: Database with collections for stations and users
- **Storage**: File storage for attachments and images
- **Authentication**: User authentication and session management

### Real-time Features
- **WebSockets**: Socket.IO for real-time simulation communication
- **Performance Optimization**: Chunked builds, tree-shaking, and cache optimization

## Development Notes

### Key Challenges
1. **Backend Costs**: Optimize Cloud Run requests during simulations
2. **Data Consistency**: Firestore `estacoes_clinicas` collection needs standardization
3. **Station Management**: Upload and filtering improvements needed
4. **AI Integration**: Gemini chat integration in progress

### Testing Framework
- **Vitest**: Unit and integration testing
- **Playwright**: End-to-end testing (configured)
- **Vue Test Utils**: Component testing

### Documentation
Extensive documentation available in `docs/`:
- `docs/guides/PROJECT_OVERVIEW.md`: Detailed project overview
- `docs/architecture/`: Project structure documentation
- `docs/composables/`: Vue composables documentation
- `docs/development/`: Development guides and scripts
- `docs/testing/`: Testing documentation

### Performance Considerations
- Auto-imports configured for Vue, Vue Router, VueUse, and Pinia
- Component auto-registration from `@core/components` and `src/components`
- Optimized build with chunk size warnings at 5000kb
- CSP monitoring and fetch interceptors for deployment issues

### Code Style
- ESLint configuration with Vue plugin
- Auto-import type definitions
- Vuetify component library integration
- SCSS styling with configured variables
