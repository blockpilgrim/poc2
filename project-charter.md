# Partner Portal v2.0 (Vite + React + Express) - Project Charter

## Project Overview

This document serves as a comprehensive guide for developing the Partner Portal v2.0. The project transitions from our current model of disparate, cloned Power Pages instances to a **single, centralized platform** built using a decoupled architecture with Vite + React (frontend) and Express.js (backend).

This strategic shift is driven by the critical need to overcome the scalability limitations, maintenance overhead, and branding inflexibility inherent in the previous multi-instance approach. Partner Portal v2.0 aims to deliver a unified, scalable, and maintainable solution that efficiently supports our expanding operations across multiple U.S. states, each represented as an "Initiative."

A core tenet of this project is to **preserve and potentially enhance the existing lead management capabilities** currently valued by our external partner organizations. This includes secure access to assigned leads, comprehensive dashboard views with filtering and search, detailed lead information management, and role-based access control tailored to their organizational context (e.g., differentiating access for Foster and Volunteer journeys, and scoping visibility to specific organizations or network-wide).

The new architecture, detailed herein, emphasizes clear separation of concerns, API-first design, robust security through initiative-based data segregation, and dynamic theming. This will provide a modern, reliable, and intuitive interface for our partners, significantly reducing operational burdens and accelerating the delivery of future improvements.

### Purpose

The Partner Portal v2.0 project implements a decoupled Single Page Application (SPA) + API architecture to serve as a Proof of Concept (POC) and foundational platform. This POC aims to:

* **Validate Architecture:** Demonstrate that a Vite + React frontend and an Express.js backend can effectively meet our organization's requirements for a centralized, scalable, and maintainable multi-state partner portal.
* **Deliver Core Functionality:** Build essential features focused on secure authentication, initiative-based data segregation, dynamic theming, and core lead management capabilities.
* **Establish Best Practices:** Implement and refine development patterns, security measures, and deployment strategies for this new architecture.
* **Mitigate Scalability Risks:** Directly address the limitations of the current "cloned instance" model by proving a single platform's ability to support multiple U.S. state "initiatives" with distinct branding and data boundaries.
* **Enhance Developer Experience:** Leverage modern tooling and a clear separation of concerns to improve development velocity and knowledge sharing.

This initiative will confirm the chosen technology stack's suitability to replace the existing Power Pages solution, providing a robust foundation for future enhancements and national rollout.

### Guiding Principles

- **Security**: Implement robust authentication, authorization, and data protection
- **Stability**: Build reliable, predictable, and fault-tolerant systems
- **Scalability**: Design for growth and multi-state expansion
- **Maintainability**: Create clean, documented, and modular code
- **Knowledge Sharing**: Build code that's accessible across all experience levels
- **Clarity**: Develop intuitive interfaces and clear code patterns
- **Simplicity**: Favor straightforward solutions over complex ones
- **Modern Best Practices**: Utilize current industry standards and patterns
- **Efficiency**: Eliminate redundant processes and optimize for both development velocity and system performance

## Architecture Overview

**Important Note for AI Agents:** This document contains references such as "(portable from Next.js)" or "(adapted from Next.js)". These allude to components and logic from a previous, internal Next.js prototype. You do not require any further context or code from this Next.js prototype to understand and assist with the goals of this current Vite + React + Express project. These notes primarily serve as reminders for the human developer leading this project.

### Frontend (Vite + React SPA)
- **Build Tool**: Vite (latest stable version - verify before install)
- **Framework**: React (latest stable version) with TypeScript (latest stable version)
- **Routing**: React Router (latest stable version - currently v7.x) for client-side navigation
- **Styling**: Tailwind CSS (latest stable version) with shadcn/ui components (portable from Next.js)
- **State Management**:
  - Zustand for UI state with structured store architecture (portable from Next.js)
  - TanStack Query (latest stable version) for server state (portable from Next.js)
  - State persistence layer for user preferences and filters
  - Multi-tab synchronization for consistency
- **Forms**: React Hook Form + Zod (portable from Next.js)
- **Tables**: TanStack Table (latest stable version) (portable from Next.js)
- **Development**: Vite dev server with proxy to Express API
- **Deployment**: Azure Static Web Apps

### Backend (Express API)
- **Runtime**: Node.js (latest LTS version - currently 22.x) with Express (latest stable version - currently 5.x) and TypeScript
- **Authentication**: MSAL Node (official Microsoft library)
- **API Design**: RESTful endpoints with OpenAPI documentation
- **Validation**: Zod for request/response validation
- **D365 Integration**: Existing D365 service code (adapted from Next.js)
- **Initiative Security**: Mandatory initiative-based filtering on all endpoints
- **Error Handling**: Centralized error middleware
- **Security**: Helmet.js, CORS, rate limiting, initiative boundary enforcement
- **Deployment**: Azure App Service or Azure Functions

### Shared Infrastructure
- **TypeScript Types**: Shared types package for frontend/backend contracts
- **Initiative Configuration**: Centralized theme and branding definitions
- **State Patterns**: Documented state management conventions
- **Environment Config**: Separate .env files for frontend/backend
- **CI/CD**: Azure DevOps with parallel frontend/backend pipelines
- **Monitoring**: Application Insights for both layers with initiative tracking

## Multi-State Initiative Architecture

### Initiative Context
Each U.S. state expansion is managed through security groups in Microsoft Entra ID:
- Users are assigned to Entra ID security groups (e.g., "Partner Portal - EC Oregon - All Users", "Partner Portal - EC Oregon - Foster Only")
- Portal users see initiative-specific theming based on their Entra ID group membership
- **Critical**: Users can ONLY access data tagged with their initiative
- **Group Structure**: Two-tier system with "All Users" groups for base access and role-specific groups (Foster Only, Volunteer Only, etc.)
- **Implementation**: System uses immutable GUIDs for group identification, not names, ensuring reliability

### Security Model
Microsoft Entra ID groups serve as the **hard security boundary**:
1. JWT tokens include group GUIDs which are mapped to initiatives
2. All API endpoints enforce initiative-based filtering using GUID-based claims
3. Frontend queries include initiative in all data requests
4. Cross-initiative access attempts trigger security alerts
5. No dependency on Microsoft Graph API during authentication for better performance and reliability

### Role-Based Access Control
Microsoft Entra ID App Roles will define user permissions. The roles are designed to provide granular access based on user responsibilities and organizational structure:

-   **Admin**: Retains full access to all features and administrative functions within their assigned initiative.
-   **Foster-Partner**: Granted access to all portal features specifically related to foster journeys, but this access is restricted to foster journeys associated with the user's own organization.
-   **Volunteer-Partner**: Granted access to all portal features specifically related to volunteer journeys, with access limited to volunteer journeys associated with the user's own organization.
-   **Volunteer-Network-Wide-Partner**: Possesses comprehensive access to all portal features concerning volunteer journeys, with the ability to view and manage volunteer journeys across all participating organizations within the network.
-   **Foster-Network-Wide-Partner**: Possesses comprehensive access to all portal features concerning foster journeys, with the ability to view and manage foster journeys across all participating organizations within the network.

Roles will be assigned in Microsoft Entra ID and will be included as claims in the JWT, enabling the application to enforce permissions accordingly. Note: Role names use hyphens (e.g., "Foster-Partner") as per Entra ID configuration.

## Feature Checklist

### POC Stage - Architecture Validation & Core Infrastructure

#### Foundation Setup
- [x] Initialize Vite project with React (latest stable) and TypeScript (latest stable)
- [x] Initialize Express project with TypeScript
- [x] Set up project structure (controllers, services, middleware)
- [x] Create shared TypeScript types package
- [x] Set up monorepo structure (npm workspaces or similar)
- [x] Configure development proxy to Express API
- [x] Create health check endpoint
- [ ] Create development docker-compose setup

#### Core Authentication Flow
- [x] Configure MSAL Node for Azure AD authentication
- [x] Implement token validation middleware (updated for groups/roles)
- [x] Create authentication endpoints (/auth/login, /auth/callback, /auth/logout)
- [x] Implement JWT generation for API access (refactored for groups/roles)
- [x] **CRITICAL**: Include Entra ID groups in JWT claims (as GUIDs)
- [x] **CRITICAL**: Include Entra ID app roles in JWT claims
- [x] **CRITICAL**: Test complete end-to-end authentication flow with real Entra ID accounts and D365 data
- [x] **CRITICAL**: Implement GUID-based initiative mapping (no Graph API calls during auth)
- [x] Document Entra ID groups/roles configuration requirements
- [x] Implement authentication context/provider (Frontend - via authService and authStore)
- [x] Create login/logout flows with MSAL redirect (Frontend - complete)
- [x] Implement token management and refresh (Frontend - with interceptors)

#### Basic Initiative Support
- [x] Define Initiative type and theme contracts
- [x] **CRITICAL**: Extract initiative from Entra ID group membership (GUID-based)
- [x] **CRITICAL**: Extract roles from Entra ID app role assignments
- [x] **CRITICAL**: Implement initiative filter middleware for D365 queries
- [x] Refactor initiative validation to use Entra ID group GUIDs
- [ ] Update frontend query keys to use group-based initiatives
- [x] Store Entra ID groups and derived initiative in auth state (Frontend - in authStore)

#### D365 Integration (Real Data for POC)
- [x] Create D365 service architecture with real Web API implementation
- [x] Configure D365 environment variables (D365_URL, CLIENT_ID, CLIENT_SECRET)
- [x] Implement D365 authentication flow (client credentials & on-behalf-of)
- [x] Map user's Entra ID to D365 Contact and Account entities (via `msevtmgt_aadobjectid`)
- [x] Implement actual D365 Web API queries (Contact & Account retrieval)
- [x] **CRITICAL**: Create /api/auth/profile endpoint combining Entra ID identity with D365 org data
- [x] **CRITICAL**: Enhance /api/auth/me endpoint to include theme configuration
- [x] Verify D365 queries respect initiative boundaries (implemented in lead service)
- [x] **CRITICAL**: Implement tc_everychildlead queries with organization filtering
- [x] **CRITICAL**: Implement configuration-driven initiative GUID mapping for D365 queries
- [x] **NEW**: Fix D365 multi-select option set handling (tc_engagementinterest as comma-separated string)

#### Basic UI Foundation
- [x] Configure Tailwind CSS (latest stable) and migrate design tokens
- [x] Port shadcn/ui components from Next.js (Initial setup with key components: Button, Card, Input, Dialog)
- [x] Set up React Router (latest stable - v7) with route structure
- [x] Implement protected routes with role-based access control
- [x] **CRITICAL**: Create initiative theme configuration system with dynamic CSS variables
- [x] **CRITICAL**: Implement ThemeProvider component to apply initiative themes
- [x] Create theme assets (logos, favicons) for supported initiatives

### MVP Stage - Production-Ready Core Features

#### Complete Authentication & Authorization
- [ ] Complete refresh token handling implementation (partial implementation exists)
- [ ] **Security**: Implement secure session management
- [ ] **Security**: Upgrade JWT signing from HS256 to RS256 for production
- [ ] **Security**: Add token revocation/blacklisting mechanism
- [ ] **Security**: Implement comprehensive Graph API error handling and rate limiting
- [ ] **Security**: Add security-focused integration tests and audit logging
- [x] Validate Entra ID group membership during authentication
- [ ] Build comprehensive E2E tests for auth flows
- [x] Implement role-based access control middleware using Entra ID app roles (requireRoles, enforceInitiative)
- [x] Parse and validate Entra ID groups for initiative assignment
- [ ] **Security**: Configure Entra ID app registration permissions
- [x] Create initiative-based theme resolver using group membership
- [ ] Add route protection with React Router guards
- [x] Create user profile state management combining Entra ID and D365 data
- [ ] Display role-based UI elements based on Entra ID app roles
- [ ] **Security**: Secure token storage strategy
- [x] Apply initiative-based theme on login based on group membership

#### State Management Implementation
- [x] Implement structured Zustand store architecture
  - [x] Create useAuthStore for authentication, profile, and initiative (Frontend - enhanced with theme and organization data)
  - [x] Create useUIStore for theme, loading, modals (Complete with toast notifications, loading stack, navigation state)
  - [x] Create useFilterStore for table filters and search (Complete with persistence, URL sync helpers, generic table support)
- [x] Create state management documentation
  - [x] Store structure and conventions (docs/state-management-patterns.md)
  - [x] When to use local vs global state (docs/state-management.md with decision tree)
  - [x] Initiative data flow patterns (Documented in stores with query key integration)
  - [x] Performance optimization patterns (Selectors, persistence strategies documented)
  - [x] Testing strategies (Testing patterns included in documentation)

#### Core API Development
- [x] Design RESTful API structure
- [x] Implement CRUD endpoints for leads with initiative filtering
  - [x] GET /api/v1/leads - List with pagination, filtering, sorting (refactored for tc_everychildlead)
  - [x] GET /api/v1/leads/:id - Get single lead with initiative verification (refactored for tc_everychildlead)
  - [x] PATCH /api/v1/leads/:id - Update lead with security checks (temporarily disabled for Step 1)
  - [x] GET /api/v1/leads/stats - Lead statistics endpoint
- [x] Add pagination, filtering, and sorting
- [x] **CRITICAL**: Fix D365 query navigation properties (tc_tc_ecleadsvolunteerorg_ECLead_tc_everychi)
- [x] **CRITICAL**: Implement field name mapping for sorting (frontend → D365)
- [x] **Security**: Strict validation for organizationLeadType format
- [x] **Security**: Fail-secure behavior for invalid organization data
- [ ] Create batch operations endpoints
- [ ] Implement comprehensive Zod validation
- [x] **Security**: Input validation for all endpoints
- [x] Add initiative audit logging (via D365_FILTER_APPLIED events)
- [x] Create cross-initiative access alerts
- [x] **CRITICAL**: Implement organization-based filtering (Foster vs Volunteer)

#### Frontend Data Layer
- [x] Configure TanStack Query with auth interceptors (QueryClient configured, interceptors in place)
- [x] Port query/mutation patterns from Next.js (adapted for Vite/React)
- [x] Implement optimistic updates (in useUpdateLead hook)
- [ ] Add error boundary integration
- [x] Create data prefetching strategies (query prefetching implemented)
- [x] Integrate with Zustand for hybrid state management (filterStore provides state, TanStack Query manages server state)
- [x] Create initiative-aware query factory (all query keys include initiative)
- [x] **CRITICAL**: Create TanStack Query hooks for API endpoints (complete with all CRUD operations)
- [x] **CRITICAL**: Align frontend/backend parameter names (pageSize/limit, totalItems/total, hasPrevious/hasPrev)

#### Essential UI Implementation
- [x] Port page layouts from Next.js app (Lead pages implemented)
- [ ] Migrate form components with validation
- [x] Port table components with TanStack Table (DataTable component complete)
- [x] Implement loading and error states (Skeletons, empty states, error toasts)
- [x] Add responsive design considerations (Mobile cards, responsive table)
- [x] Implement initiative-based theme system (ThemeProvider with dynamic CSS variables)
- [x] Add initiative branding components (logos, colors in Header)
- [x] Connect UI to structured state stores (Complete - TanStack Query hooks integrated with filterStore and uiStore)
- [x] **CRITICAL**: Create data display components (tables, lists, cards) - Lead components complete
- [x] **NEW**: Implement role-based navigation (separate "Volunteer Leads" and "Ready Now Leads" pages)
- [x] **NEW**: Create inclusive lead filtering by engagement interest values

#### Security & Environment Configuration
- [ ] Configure CORS for frontend domain
- [ ] Implement security middleware (Helmet.js, rate limiting)
- [ ] Set up environment configuration
- [ ] Implement environment variable management
- [ ] **Security**: Configure Content Security Policy for SPA
- [ ] **Security**: Implement security headers middleware
- [ ] Configure ESLint and Prettier for both projects
- [ ] Set up git hooks for code quality
- [x] Document state management patterns and conventions (Complete - docs/state-management*.md files created)
- [x] Document backend architecture and API patterns (Complete - backend-architecture.md, backend-api-reference.md)
- [x] Document D365 integration patterns (Complete - d365-integration-guide.md, backend-troubleshooting.md)
- [x] Document shared types architecture (Complete - shared-types-architecture.md, shared-types-quick-reference.md)
- [x] Document frontend refactoring and feature status (Complete - frontend-lead-refactoring.md, feature-status-reference.md)
- [x] **NEW**: Create centralized constants for lead management (engagement interest values, UI messages)
- [x] **NEW**: Create role constants and helper functions for consistent role checks

#### Basic Deployment & Monitoring
- [ ] Configure Vite production builds
- [ ] Set up Express production configuration
- [ ] Create Azure Static Web Apps deployment
- [ ] Configure Azure App Service for API
- [ ] Implement CI/CD pipelines
- [ ] Add environment-specific configurations
- [ ] Integrate Application Insights
- [ ] Add structured logging with initiative context
- [ ] Implement error tracking

#### Core Testing
- [x] Set up Vitest for both frontend and backend
- [ ] Port applicable tests from Next.js
- [ ] Add API integration tests with Supertest
- [ ] Implement component testing
- [ ] Add state management unit tests
- [x] Test initiative boundary enforcement (lead service tests)
- [ ] **Priority**: Add comprehensive test coverage for authentication system
  - [ ] Unit tests for all auth services and middleware
  - [ ] Integration tests for complete auth flow
  - [ ] Security tests for initiative boundary enforcement
- [x] Unit tests for lead service with organization filtering
- [x] Unit tests for initiative GUID configuration module
- [x] Unit tests for D365 field name mapping (sorting)
- [x] Unit tests for security validation (organizationLeadType)
- [x] Unit tests for volunteer organization navigation property
- [x] Unit tests for expanded field sorting behavior

### Post-MVP Stage - Advanced Features & Optimization

#### Enhanced State Management
- [ ] Add persistence layer for user preferences
  - [ ] Implement persist middleware for Zustand
  - [ ] Define persistence strategy (localStorage vs sessionStorage)
  - [ ] Create partialize functions for selective persistence
- [ ] Implement multi-tab synchronization
  - [ ] Add broadcast channel or storage event listeners
  - [ ] Handle state reconciliation across tabs
- [ ] Add comprehensive middleware stack
  - [ ] Logger middleware for debugging
  - [ ] DevTools integration
  - [ ] Immer for immutable updates
- [ ] Monitor state management performance
- [ ] Track state persistence failures
- [ ] Test multi-tab synchronization scenarios

#### Advanced Initiative Support
- [x] **Scalability**: Implement dynamic initiative management for 50+ state support
  - [x] Move hardcoded state mappings to database or external configuration
  - [ ] Implement dynamic state/theme management system
  - [ ] Create admin interface for initiative configuration
  - [ ] Add configuration hot-reloading capabilities
- [ ] Create initiative configuration registry
  - [ ] Define theme configurations per initiative
  - [ ] Build branding asset management
  - [ ] Implement dynamic logo/color loading
- [ ] Implement initiative-based features
  - [ ] Feature flags per initiative
  - [ ] Custom validation rules if needed
  - [ ] Initiative-specific help content
- [ ] Add initiative switching safeguards
  - [ ] Prevent accidental cross-initiative requests
  - [ ] Clear data cache on initiative change
  - [ ] Re-authenticate if initiative mismatch
- [ ] Configure initiative-specific assets
- [ ] Test theme switching on login

#### Performance Optimization
- [ ] Implement code splitting with React.lazy
- [ ] Add route-based chunking
- [ ] Optimize bundle size with Rollup
- [ ] Implement API response caching per initiative
- [ ] Add image optimization strategies
- [ ] Monitor and optimize state update performance
- [ ] Implement offline support consideration
- [ ] **Scalability**: Implement distributed session storage (Redis) for OAuth state management

#### Advanced Testing & Security
- [ ] Create E2E tests with Playwright
- [ ] **Security**: Security regression test suite
- [ ] Monitor cross-initiative access attempts
- [ ] Track initiative-based usage metrics

#### Enhanced Documentation & Monitoring
- [ ] Add OpenAPI/Swagger documentation
- [ ] Create performance monitoring
- [ ] Add custom metrics and alerts

## Development Approach

### Version Management Strategy

**Core Dependency Versions**: The major dependency versions specified in this charter have been verified as of the last charter update and are suitable for project initialization.

**Feature-Specific Dependencies**: When implementing features that require new dependencies, verify latest stable versions before installation:

1. **Web Search First**: Perform a web search to confirm the latest stable versions of new dependencies
2. **Official Sources**: Check npm registry, official GitHub releases, and documentation
3. **Avoid Assumptions**: Don't assume training data contains the latest versions
4. **Document Versions**: Record specific versions in `VERSIONS.md` when installed

Example verification process for new dependencies:
```bash
# Before adding new feature dependencies
npm view [new-package]@latest version
npm view [another-package]@latest version
```

### Parallel Development Strategy

Unlike the Next.js POC approach, the decoupled architecture allows for parallel frontend/backend development:

1. **API-First Design**: Define OpenAPI contracts with initiative requirements
2. **Mock Development**: Frontend can use mock APIs with test initiatives
3. **Independent Testing**: Each layer can be tested in isolation
4. **Progressive Integration**: Connect real APIs as they're ready

### Project Structure

```
poc-portal-2/
├── packages/
│   ├── frontend/               # Vite + React SPA
│   │   ├── src/
│   │   │   ├── components/     # UI components (ported from Next.js)
│   │   │   ├── hooks/          # Custom React hooks
│   │   │   ├── pages/          # Route components
│   │   │   ├── services/       # API client services
│   │   │   ├── stores/         # Zustand stores (structured)
│   │   │   │   ├── auth/       # Auth + initiative store
│   │   │   │   ├── ui/         # UI state store
│   │   │   │   ├── filters/    # Filter state store
│   │   │   │   └── index.ts    # Store registry
│   │   │   ├── themes/         # Initiative theme configs
│   │   │   ├── types/          # TypeScript types
│   │   │   └── utils/          # Helper functions
│   │   ├── public/             # Static assets
│   │   │   └── logos/          # Initiative-specific logos
│   │   └── index.html          # SPA entry point
│   │
│   ├── backend/                # Express API
│   │   ├── src/
│   │   │   ├── controllers/    # Route handlers
│   │   │   ├── middleware/     # Express middleware
│   │   │   │   └── initiative/ # Initiative security
│   │   │   ├── services/       # Business logic
│   │   │   ├── models/         # Data models
│   │   │   ├── config/         # Initiative configs
│   │   │   ├── utils/          # Helper functions
│   │   │   └── app.ts          # Express app setup
│   │   └── tests/              # API tests
│   │
│   └── shared/                 # Shared types package
│       ├── src/
│       │   ├── types/          # Shared TypeScript types
│       │   ├── constants/      # Shared constants
│       │   └── initiatives/    # Initiative definitions
│       └── package.json
│
├── docs/
│   ├── README.md               # Documentation index and guide
│   ├── shared-types-architecture.md # Type system design principles
│   ├── shared-types-quick-reference.md # Common types and patterns
│   ├── state-management.md     # State patterns documentation
│   ├── state-management-patterns.md # Advanced state patterns
│   ├── state-management-quick-reference.md # Quick reference
│   ├── data-fetching.md        # TanStack Query guide
│   ├── data-fetching-patterns.md # Query patterns
│   ├── lead-management-ui.md   # Lead UI architecture
│   ├── lead-management-quick-reference.md # Lead tasks guide
│   ├── data-table-pattern.md   # Reusable table guide
│   ├── initiative-based-theming.md # Theme implementation
│   ├── frontend-authentication-flow.md # Auth flow
│   ├── azure-ad-group-setup.md # Entra ID configuration
│   ├── azure-ad-app-registration-requirements.md # Azure setup
│   ├── backend-architecture.md # Backend design principles
│   ├── backend-api-reference.md # API endpoint documentation
│   ├── d365-integration-guide.md # D365 data model and queries
│   ├── initiative-guid-configuration.md # Initiative GUID mapping
│   └── backend-troubleshooting.md # Common issues and debugging
│
│   Key implementation docs:
│   ├── backend/src/services/GUID-MAPPING-IMPLEMENTATION.md
│   ├── backend/LEAD-SERVICE-REFACTORING-STEP1.md
│   └── backend/BREAKING-CHANGES-STEP2.md
├── docker-compose.yml          # Local development setup
└── azure-pipelines.yml         # CI/CD configuration
```

### Key Technical Decisions

#### Why MSAL Node over Auth.js?
- Official Microsoft library with guaranteed Azure AD compatibility
- Better suited for API-based authentication flows
- More control over token handling and validation
- Direct support for advanced Azure AD features including groups and app roles
- Native support for extracting Entra ID claims from tokens

#### GUID-Based Initiative Mapping
- **Immutability**: GUIDs never change, unlike group names
- **Performance**: No Microsoft Graph API calls during token validation
- **Reliability**: Works even when Graph API is unavailable
- **Security**: Smaller attack surface with no external dependencies
- **Standards Compliance**: Aligns with Microsoft's intended design for group claims

#### API Design Principles
- RESTful design with consistent naming
- Versioned endpoints (/api/v1/...)
- Mandatory initiative filtering on all data endpoints
- Standardized error responses
- Comprehensive request/response validation
- HATEOAS where beneficial

#### Frontend State Strategy
- **Server State**: TanStack Query exclusively for API data
  - Query keys always include initiative
  - Automatic cache invalidation on initiative change
- **UI State**: Structured Zustand stores with clear separation:
  - `useAuthStore`: Authentication, user profile, initiative, theme
  - `useUIStore`: Loading states, modals, notifications
  - `useFilterStore`: Global filters, search parameters, table states
- **Form State**: React Hook Form with Zod validation
- **URL State**: React Router for navigation and deep linking
- **Persistence**: Selective state persistence with fallback strategies
- **Synchronization**: Multi-tab consistency via BroadcastChannel API

#### Initiative-Based Architecture
```typescript
// JWT Token Structure
interface JWTPayload {
  sub: string;
  email: string;
  groups: string[]; // Entra ID security groups (e.g., ["Partner Portal - EC Arkansas", "Partner Portal - EC Oregon - Testing"])
  roles: string[]; // Entra ID app roles (e.g., ["Admin", "Foster-Partner", "Volunteer-Network-Wide-Partner"])
  initiative: string; // Primary initiative derived from groups
  exp: number;
}

// Query Key Factory with Initiative
const queryKeys = {
  leads: (initiative: string, filters?: LeadFilters) =>
    ['leads', initiative, filters] as const,

  lead: (initiative: string, id: string) =>
    ['leads', initiative, id] as const,
};

// Backend Middleware
const enforceInitiative = async (req, res, next) => {
  // Extract initiative from JWT (already processed during auth)
  const userInitiative = req.user.initiative;

  if (!userInitiative) {
    return res.status(403).json({ error: 'No initiative access' });
  }

  // Inject D365 filter with initiative constraint
  const d365Filter = {
    initiative: userInitiative,
    userId: req.user.sub
  };

  req.d365Filter = d365Filter;

  // Log access for security audit
  logSecurityEvent('D365_FILTER_APPLIED', {
    userId: req.user.sub,
    email: req.user.email,
    initiative: userInitiative,
    filter: d365Filter,
    endpoint: `${req.method} ${req.path}`
  });

  next();
};

// Theme Configuration
// Themes are mapped by initiative ID (not group name) for consistency
const initiativeThemes: Record<string, ThemeConfig> = {
  'ec-arkansas': {
    primaryColor: '#00B274',
    secondaryColor: '#313E48',
    logo: '/logos/arkansas.svg',
    favicon: '/favicons/arkansas.ico',
    name: 'Arkansas Partner Portal',
  },
  'ec-tennessee': {
    primaryColor: '#F38359',
    secondaryColor: '#313E48',
    logo: '/logos/tennessee.svg',
    favicon: '/favicons/tennessee.ico',
    name: 'Tennessee Partner Portal',
  },
};
```

#### Security Considerations
- **Frontend**: CSP, secure token storage, input sanitization
- **Backend**: Rate limiting, CORS, helmet.js, input validation
- **Communication**: HTTPS only, JWT with short expiry
- **Data**: Encryption at rest and in transit
- **State**: No sensitive data in persisted state
- **Initiative Boundary**: Enforced at API level, monitored continuously

### Migration Path from Next.js

1. **Phase 1**: Port UI components and establish design system
2. **Phase 2**: Implement authentication with MSAL and initiative support
3. **Phase 3**: Migrate business logic to Express API with initiative filtering
4. **Phase 4**: Connect frontend to real API with initiative-aware queries
5. **Phase 5**: Performance optimization and security hardening

### Development Workflow

```bash
# Frontend development
cd packages/frontend
npm run dev              # Starts Vite dev server on port 5173

# Backend development
cd packages/backend
npm run dev              # Starts Express with nodemon on port 3000

# Full stack development
docker-compose up        # Runs both with proper networking

# Testing with different initiatives
npm run dev:arkansas     # Test with Arkansas theme/data
npm run dev:kentucky     # Test with Kentucky theme/data
```

## Non-Functional Requirements (NFRs) Summary

Beyond specific features, Partner Portal v2.0 must adhere to the following key non-functional requirements to ensure its success and long-term viability:

* **Scalability:**
    * Support a growing number of "Initiatives" (target: 50+ U.S. states) without degradation in performance or requiring separate deployments.
    * Handle a significant number of concurrent users (target: 1000+) efficiently.
    * Allow independent scaling of frontend and backend services.
* **Performance:**
    * Initial application load time: < 2 seconds.
    * Route transitions and data interactions: < 500 milliseconds.
    * Efficient data handling for large datasets on dashboards (e.g., tables with 1000+ records).
* **Maintainability:**
    * Single codebase for core platform logic, minimizing redundancy (target: <15% code duplication across initiative-specific configurations).
    * Modular design with clear separation of concerns (frontend, backend, shared types).
    * Comprehensive documentation for code, APIs, and operational procedures.
    * High test coverage (unit, integration, E2E) to facilitate safe and rapid changes.
* **Security:**
    * Strict enforcement of "Initiative" as a hard security boundary, preventing any cross-initiative data access.
    * Secure authentication via Azure AD (MSAL Node).
    * Protection against common web vulnerabilities (OWASP Top 10).
    * Role-based access control (RBAC) ensuring users only access features and data relevant to their roles and initiative.
    * Data encryption in transit (HTTPS) and at rest where applicable.
* **Availability & Reliability:**
    * High availability for both frontend and backend services (target: 99.9% uptime).
    * Fault-tolerant design with robust error handling and logging.
    * Consistent user experience with graceful degradation if partial service outages occur.
* **Usability & Accessibility:**
    * Intuitive user interface requiring minimal training for partners.
    * Responsive design for accessibility across common desktop screen resolutions.
    * Adherence to basic web accessibility guidelines (e.g., WCAG A/AA where feasible).
* **Developer Experience:**
    * Streamlined local development setup (target: < 5 minutes to run).
    * Fast build times and hot module reloading for frontend and backend.
    * Clear CI/CD pipelines for automated testing and deployment.

## Success Metrics

- **Performance**: Sub-2s initial load, <500ms route transitions
- **Maintainability**: Clear separation of concerns, <20% code duplication
- **Scalability**: Supports 1000+ concurrent users, handles 50+ initiatives
- **Security**: Passes security audit, zero cross-initiative data leaks
- **Developer Experience**: <5 min setup time, hot reload for both layers
- **State Management**: <16ms state updates, zero persistence failures
- **Initiative Isolation**: 100% data boundary enforcement
- **Authentication**: Zero Graph API calls during token validation (GUID-based)

## Risks & Mitigations

### Technical Risks
- **Risk**: Increased complexity from two codebases
  - **Mitigation**: Shared types, comprehensive documentation

- **Risk**: Authentication complexity in SPA
  - **Mitigation**: Well-tested auth library, clear patterns

- **Risk**: CORS and security issues
  - **Mitigation**: Careful configuration, security testing

- **Risk**: Initiative data leakage
  - **Mitigation**: Mandatory filtering, continuous monitoring, audit logs

- **Risk**: Theme configuration maintenance
  - **Mitigation**: Centralized theme registry, validation tests

### Organizational Risks
- **Risk**: Team needs to maintain two applications
  - **Mitigation**: Clear ownership, automated testing

- **Risk**: Deployment complexity
  - **Mitigation**: Infrastructure as Code, CI/CD automation

- **Risk**: Initiative configuration errors
  - **Mitigation**: Automated validation, staging environments per initiative

## Current Focus Area

### Backend Code Organization and Cleanup (Pragmatic Refactoring)

#### The Story: Why This Cleanup Is Necessary

**Investigation revealed an abandoned refactoring attempt** in `_unused_implementations` that was built for the wrong D365 data model (Contact entity instead of tc_everychildlead). This creates significant confusion:

1. **Wrong Data Model**: The abandoned code queries the Contact entity, but our leads are actually stored in `tc_everychildlead`
2. **Misleading Structure**: The abandoned code looks well-organized and professional, which might tempt someone to try using it
3. **Incompatible Design**: The patterns can't be retrofitted because the entities have completely different relationships and fields
4. **Maintenance Risk**: Having two different implementations for the same service creates confusion about which is correct

**The current implementation in `/packages/backend/src/services/lead.service.ts` works correctly** with the proper `tc_everychildlead` entity but needed organization and cleanup for maintainability. 

**Our pragmatic approach** was to improve the working code WITHOUT attempting to retrofit the abandoned code or make major architectural changes. We successfully completed three phases:

- **Phase 1**: Extracted reusable utilities and constants from the working code
- **Phase 2**: Reduced duplication and added retry logic
- **Phase 3**: Improved maintainability through method decomposition and type safety

**Now Phase 4 is about removing the confusion** by deleting the abandoned code and documenting the actual implementation.

#### Phase 1: Extract and Organize (1 day)
**Status**: ✅ COMPLETED
**Goal**: Improve clarity without changing functionality

1. **Create utility modules** extracting useful patterns from abandoned code:
   - ✅ `/backend/src/utils/d365/retry-helper.ts` - Retry logic with exponential backoff (129 tests)
   - ✅ `/backend/src/utils/d365/odata-utils.ts` - OData query builders and string escaping (validated field names, improved type safety)
   - ✅ `/backend/src/utils/d365/audit-logger.ts` - Structured logging for security events (singleton pattern, configurable)
   - ✅ `/backend/src/utils/d365/error-parser.ts` - D365-specific error response parsing (comprehensive error code mapping)
   - ❌ `/backend/src/utils/d365/field-mapper.ts` - Not needed (mapping functions moved to query-constants.ts)

2. **Extract constants** from lead.service.ts:
   - ✅ Move D365 field names to `/backend/src/constants/d365/lead-fields.ts` (includes navigation properties, field builders)
   - ✅ Create `/backend/src/constants/d365/query-constants.ts` for pagination limits, state codes, etc. (includes mapping functions)
   - ✅ Keep these backend-specific, not in shared package

3. **Success criteria**:
   - ✅ All utilities tested and documented (124/129 tests passing)
   - ✅ No changes to API behavior (lead service tests confirm)
   - ✅ lead.service.ts imports from new locations

**Additional improvements implemented**:
- ✅ Created centralized logger utility (`/backend/src/utils/logger.ts`) for consistent logging
- ✅ Enhanced type safety with validation in utilities (null checks, type guards)
- ✅ Updated d365.service.ts to use new utilities and centralized configuration
- ✅ Migrated d365-mappings.ts to re-export from new modular locations
- ✅ Removed deprecated D365Lead interface from types
- ✅ Added buildD365Url utility for consistent URL construction
- ✅ Replaced all console.* statements with structured logger

**Key implementation details for next phases**:
- All utilities follow consistent error handling patterns (throw errors vs return null)
- Audit logger is configured as singleton with customizable handlers
- Retry helper supports configurable backoff and status code filtering
- OData utils validate field names to prevent injection
- Test suite needs minor updates for new logger format and URL encoding

#### Phase 2: Reduce Duplication (1 day)
**Status**: ✅ COMPLETED (including Phase 2.1 improvements)
**Goal**: DRY up the code without architectural changes

1. **In lead.service.ts**:
   - ✅ Extracted duplicate field selection logic into cached class properties (`selectClause`, `expandClause`)
   - ✅ Created helper methods for common patterns:
     - `validateOrganizationContext()` - Organization validation with security logging
     - `buildD365Headers()` - Consistent header construction
     - `executeD365Query()` - D365 fetch with retry logic
     - `getD365InitiativeGuid()` - Initiative GUID mapping with error handling
     - `buildUserOrganization()` - User organization context building
     - `logOrganizationValidationFailure()` - Security validation logging
   - ✅ Consolidated similar logging statements using helpers

2. **Add retry logic** to D365 API calls:
   - ✅ All fetch calls wrapped with `withRetry()` helper
   - ✅ Configured for transient failures (429, 500, 502, 503, 504, network errors)
   - ✅ Exponential backoff: 1s → 2s → 4s with jitter
   - ✅ Retry attempts logged for monitoring

3. **Success criteria**:
   - ✅ No duplicate code blocks in lead.service.ts
   - ✅ All D365 calls have retry capability
   - ✅ All tests passing (2 test updates required for logger format)

**Phase 2.1 Additional Improvements**:
- ✅ Removed unused `buildQueryString` import
- ✅ Fixed error object mutation (created proper error copies)
- ✅ Simplified query parameter building (reduced complexity)
- ✅ Improved type safety (no more `(error as any).statusCode`)

**Documentation Updates**:
- ✅ Updated backend-architecture.md with retry patterns and service architecture
- ✅ Updated d365-integration-guide.md with error handling section
- ✅ Updated backend-troubleshooting.md with retry debugging guidance

#### Phase 3: Improve Maintainability (1-2 days)
**Status**: ✅ COMPLETED (including critical review fixes)
**Goal**: Make the code easier to work with

1. **Split complex methods**:
   - ✅ Broke `buildSecureODataFilter` (71 lines) down to 19 lines orchestrator
   - ✅ Created 5 focused helper methods:
     - `applyActiveRecordFilter()` - 4 lines, adds active record filter
     - `applyInitiativeFilter()` - 8 lines, validates and adds initiative filter
     - `validateOrganizationType()` - Enhanced with logging, validates format
     - `buildOrganizationFilters()` - 32 lines, handles foster/volunteer filtering
     - `applyUserSearchFilters()` - 7 lines, adds user search criteria
   - ✅ Each method has single responsibility

2. **Add type safety**:
   - ✅ Created `ODataQueryParams` interface for query building
   - ✅ Created `D365LeadQueryResponse` interface for API responses
   - ✅ Created `D365ErrorContext` interface for error handling
   - ✅ Removed permissive index signature from ODataQueryParams
   - ✅ Added explicit return types to all methods
   - ✅ Zero `any` types remaining

3. **Improve error handling**:
   - ✅ Created `handleD365QueryError` method (44 lines) using D365 error parser
   - ✅ Added structured error context (operation, entity, filters, userId)
   - ✅ Distinguished 404 (not found) from 403 (forbidden) errors
   - ✅ Standardized error creation using AppError factory methods
   - ✅ Enhanced error type checking for Response-like objects

4. **Success criteria**:
   - ✅ No methods longer than 30 lines (except 44-line error handler)
   - ✅ Full TypeScript coverage (no `any` types)
   - ✅ Clear error messages with actionable context
   - ✅ All tests passing (19/19)

**Critical Review Fixes Implemented**:
- ✅ Removed redundant error logging in buildSecureODataFilter
- ✅ Enhanced validation logging consistency
- ✅ Eliminated query building/parsing inefficiency with new `buildODataQueryParams` method
- ✅ Added OData string escaping for all user input (security improvement)
- ✅ Standardized error creation using AppError factory methods
- ✅ Enhanced error type checking for Response-like objects
- ✅ Added proper type annotations throughout

**Documentation Updates**:
- ✅ Updated backend-architecture.md with Phase 3 patterns
- ✅ Updated d365-integration-guide.md with error handling and retry details
- ✅ Updated backend-troubleshooting.md with retry debugging
- ✅ Updated backend-api-reference.md with accurate endpoint details
- ✅ Created backend-service-patterns.md documenting all patterns

**Files Created/Updated in Phase 3**:
- `/PHASE3-IMPLEMENTATION-SUMMARY.md` - Full details of Phase 3 changes
- `/PHASE3-CRITICAL-REVIEW-FIXES.md` - Critical review fixes
- `/docs/backend-service-patterns.md` - Comprehensive patterns guide
- `/packages/backend/src/services/lead.service.ts` - Refactored with focused methods

#### Phase 4: Clean Up (0.5 day)

**Status**: Ready to begin

**Goal**: Remove obsolete code and create accurate documentation that reflects the current implementation.

##### Critical Understanding for Implementation

**Why we're deleting `_unused_implementations`**:
- It queries Contact entity (`contacts?$filter=...`) **for lead management** 
- Our leads are in tc_everychildlead entity (`tc_everychildleads?$filter=...`)
- These are completely different entities with different fields, relationships, and security models
- Contact entity doesn't have initiative filtering, organization assignments, or lead-specific fields
- Attempting to adapt this code would be like trying to use car parts to fix a boat

**Critical Distinction - Contact Entity Has Two Different Uses**:
1. **Legitimate Use (KEEP)**: The working code queries Contact to find user's organization during login
   - `d365Service.getUserOrganization()` → `queryContactByAzureId()` → get Account data
   - This is correct and necessary for organization-based security filtering
2. **Wrong Use (DELETE)**: The abandoned code tried to use Contact for lead management
   - This is fundamentally wrong - leads are stored in tc_everychildlead, not Contact

**What we've already accomplished**:
- The working lead service has been fully refactored and is clean
- All the good patterns from the abandoned code have been extracted as utilities
- The service now has zero `any` types, proper error handling, and retry logic
- All tests pass and the API behavior is unchanged

##### Phase 4 Implementation Tasks

1. **Delete Obsolete Code**
   ```
   rm -rf packages/backend/_unused_implementations
   ```
   This entire directory contains Contact-based implementations that will never work with our data model.

2. **Archive Old Refactoring Documents**
   ```bash
   mkdir -p docs/archive
   mv packages/backend/src/services/LEAD-SERVICE-REFACTOR.md docs/archive/
   mv packages/backend/LEAD-SERVICE-REFACTORING-STEP1.md docs/archive/
   ```
   These documents describe the abandoned refactoring attempt and should be preserved for history but moved out of active areas.

3. **Create Accurate Documentation**
   
   Create `/docs/BACKEND-ARCHITECTURE-CURRENT.md`:
   - Document the actual architecture after Phases 1-3
   - Explain the utility modules and their purposes
   - Describe the error handling patterns
   - Detail the security boundaries and retry logic
   
   Create `/docs/D365-TC-EVERYCHILDLEAD-INTEGRATION.md`:
   - Explain why we use tc_everychildlead for leads (not Contact)
   - Document the actual field mappings
   - Describe organization filtering (Foster vs Volunteer)
   - Include example OData queries that actually work
   - **Important**: Document that Contact IS used for user organization lookup (this is correct)
   - Clarify the distinction between Contact for users vs tc_everychildlead for leads

4. **Update README Files**
   
   Update `/packages/backend/README.md`:
   - Remove any references to the deleted code
   - Document the current architecture
   - Ensure development instructions are accurate

##### Success Criteria

- [ ] No abandoned code remains in codebase
- [ ] No imports break when obsolete code is deleted
- [ ] All tests continue to pass
- [ ] Documentation accurately reflects current implementation
- [ ] Future developers understand why we use tc_everychildlead

##### Testing Protocol

```bash
# Before deleting, check for any imports
grep -r "_unused_implementations" packages/backend/src

# After deletion, verify everything works
cd packages/backend
npm run build
npm test
npm run typecheck
```

##### Decision Framework for Unexpected Situations

If you encounter something unexpected during cleanup, use this framework:

1. **Is it Contact entity code in `_unused_implementations`?** → Delete it (wrong usage for leads)
2. **Is it Contact entity code in working services?** → Keep it (used for user organization lookup)
3. **Is it related to tc_everychildlead?** → Keep and document it
4. **Is it a utility that's actually being used?** → It should already be in `/utils` from Phase 1
5. **Is it documentation about the old approach?** → Archive it
6. **Is it documentation about what we actually built?** → Keep it in place

**Important Contact Entity Distinction**:
- **KEEP**: `d365Service.getUserOrganization()` and `queryContactByAzureId()` - These legitimately query Contact to find user's organization
- **DELETE**: Any Contact queries in `_unused_implementations` - These wrongly tried to use Contact for lead management

##### What Success Looks Like

After Phase 4:
- A developer new to the project can understand the architecture without confusion
- There's only one implementation of lead management (the correct one)
- The documentation matches the code
- No artifacts remain from the abandoned Contact-based approach

##### Important Reminders

- **Don't try to merge the implementations** - they're for different data models
- **Don't delete Contact queries in working code** - they're used correctly for user organization lookup
- **Do delete Contact queries in abandoned code** - they wrongly tried to manage leads via Contact
- **Don't feel bad about deleting code** - it was a learning experience
- **Keep the phase summaries** - they document our successful refactoring journey
- **Focus on clarity** - remove confusion, document reality

This cleanup is the final step in a successful refactoring journey. The hard work is done - we just need to remove the old scaffolding and clearly mark the finished building.

