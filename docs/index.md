# Revalidaflow Documentation

## Project Overview

**Revalidaflow** is a real-time clinical simulation platform for medical students.

- **Type**: Monorepo (Frontend + Backend)
- **Primary Language**: JavaScript (Vue.js / Node.js)
- **Architecture**: Client-Server with Real-time WebSockets

## Quick Reference

- **Frontend**: Vue.js 3, Vuetify, Pinia
- **Backend**: Node.js, Express, Socket.IO
- **Database**: Firestore (NoSQL)
- **Auth**: Firebase Authentication

## Core Documentation

- [Project Overview](./project-overview.md) - Executive summary and features.
- [Architecture](./architecture.md) - System design and data flow.
- [Source Tree Analysis](./source-tree-analysis.md) - Codebase structure and critical directories.
- [Development Guide](./development-guide.md) - Setup, installation, and contribution.

## Legacy Documentation

Older documentation files have been archived in the `legacy/` directory.

- [Legacy Documentation Folder](./legacy/)

## Getting Started

1.  **Install Dependencies**: `npm install` (root) and `cd backend && npm install`.
2.  **Start Backend**: `cd backend && npm start`.
3.  **Start Frontend**: `npm run dev`.
4.  **Open**: `http://localhost:5173`.

For detailed instructions, see the [Development Guide](./development-guide.md).
