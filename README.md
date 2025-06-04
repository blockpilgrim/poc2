# Partner Portal v2.0

Multi-state initiative platform built with Vite + React (frontend) and Express.js (backend).

## Prerequisites

- Node.js 22.x (LTS)
- npm 10.x or higher
- Docker and Docker Compose (for containerized development)

## Quick Start

```bash
# Install dependencies for all packages
npm install

# Run in development mode
npm run dev

# Or use Docker
npm run docker:up
```

## Project Structure

```
poc-portal-2/
├── packages/
│   ├── frontend/       # Vite + React SPA
│   ├── backend/        # Express.js API
│   └── shared/         # Shared TypeScript types
└── docs/               # Documentation
```

## Available Scripts

- `npm run dev` - Run both frontend and backend in development mode
- `npm run dev:frontend` - Run only frontend
- `npm run dev:backend` - Run only backend
- `npm run build` - Build all packages
- `npm run test` - Run tests across all packages
- `npm run lint` - Lint all packages
- `npm run docker:up` - Start Docker development environment
- `npm run docker:down` - Stop Docker containers

## Development

The project uses npm workspaces for monorepo management. Each package has its own scripts and dependencies while sharing common development dependencies at the root level.

### Frontend Development
- Runs on http://localhost:5173
- Proxies API requests to backend on http://localhost:3000

### Backend Development
- Runs on http://localhost:3000
- Provides RESTful API endpoints

## Environment Variables

Each package has its own `.env` file for configuration. See `.env.example` files in each package for required variables.
