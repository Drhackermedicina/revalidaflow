# Source Tree Analysis

## Directory Structure

```
REVALIDAFLOW/
├── backend/                 # Node.js Backend Application
│   ├── src/                 # Backend source code (controllers, routes, services)
│   ├── server.js            # Backend entry point
│   └── package.json         # Backend dependencies
├── src/                     # Vue.js Frontend Application
│   ├── components/          # Reusable Vue components
│   ├── pages/               # Application views/pages
│   ├── stores/              # Pinia state management stores
│   ├── services/            # API clients and external service integrations
│   ├── plugins/             # Vue plugins (Vuetify, Router, etc.)
│   ├── assets/              # Static assets (images, styles)
│   ├── App.vue              # Main Vue component
│   └── main.js              # Frontend entry point
├── public/                  # Static files served directly
├── docs/                    # Project Documentation
│   ├── legacy/              # Archived documentation files
│   ├── index.md             # Master Documentation Index
│   └── ...                  # Current documentation
├── scripts/                 # Utility and build scripts
├── tests/                   # Test suites
├── config/                  # Configuration files
├── firebase.json            # Firebase hosting and functions config
├── package.json             # Root/Frontend dependencies
└── vite.config.js           # Vite build configuration
```

## Critical Directories

### Backend (`backend/`)
Contains the server-side logic, API definitions, and database interactions. It runs as a separate service (typically on Cloud Run) but is part of the same repository.

### Frontend Source (`src/`)
The core of the Vue.js application.
- **`components/`**: Building blocks of the UI.
- **`pages/`**: Corresponds to the routes defined in the application.
- **`stores/`**: Manages global state (User session, Simulation state, etc.) using Pinia.
- **`services/`**: Handles communication with the Backend and Firebase services.

### Documentation (`docs/`)
Central location for all project documentation.
- **`legacy/`**: Contains older documentation files that have been archived but kept for reference.

## Entry Points

- **Frontend**: `src/main.js` - Initializes the Vue app, plugins, and mounts the root component.
- **Backend**: `backend/server.js` - Starts the Express server and initializes Socket.IO.
