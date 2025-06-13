# Partner Portal v2.0 Documentation

This directory contains technical documentation for the Partner Portal v2.0 project.

## Getting Started

1. [Project Charter](../project-charter.md) - Complete project overview and architecture
2. [Frontend Authentication Flow](./frontend-authentication-flow.md) - How authentication works
3. [Data Fetching](./data-fetching.md) - TanStack Query implementation guide
4. [State Management](./state-management.md) - Zustand store patterns (coming soon)

## Reference Guides

### Data Layer
- [Data Fetching Patterns](./data-fetching-patterns.md) - Common query/mutation patterns
- [API Contracts](./api-contracts.md) - REST API endpoints (coming soon)

### Security & Configuration
- [Azure AD Group Setup](./azure-ad-group-setup.md) - Entra ID configuration
- [Azure AD App Registration](./azure-ad-app-registration-requirements.md) - App registration requirements
- [Initiatives](./initiatives.md) - Multi-state setup (coming soon)

### UI & Theming
- [Initiative-Based Theming](./initiative-based-theming.md) - Dynamic theme implementation

### Deployment
- [Deployment Guide](./deployment.md) - Deployment procedures (coming soon)

## Quick Links

- **Backend API**: http://localhost:3000/api/v1
- **Frontend Dev**: http://localhost:5173
- **Shared Types**: `@partner-portal/shared`

## Key Concepts

### Initiative-Based Architecture
Every user belongs to an "initiative" (e.g., Arkansas, Tennessee) that determines:
- Data access boundaries
- Visual theme/branding
- Available features

### Security Model
- JWT tokens include Entra ID groups
- Groups map to initiatives
- All API queries filtered by initiative
- Frontend includes initiative in cache keys

### Tech Stack
- **Frontend**: Vite + React + TypeScript
- **State**: Zustand + TanStack Query
- **Backend**: Express + TypeScript
- **Auth**: MSAL (Microsoft Authentication Library)
- **Database**: D365 (via Web API)