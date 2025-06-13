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
-   **Foster Partner**: Granted access to all portal features specifically related to foster journeys, but this access is restricted to foster journeys associated with the user's own organization.
-   **Volunteer Partner**: Granted access to all portal features specifically related to volunteer journeys, with access limited to volunteer journeys associated with the user's own organization.
-   **Volunteer Network-Wide Partner**: Possesses comprehensive access to all portal features concerning volunteer journeys, with the ability to view and manage volunteer journeys across all participating organizations within the network.
-   **Foster Network-Wide Partner**: Possesses comprehensive access to all portal features concerning foster journeys, with the ability to view and manage foster journeys across all participating organizations within the network.

Roles will be assigned in Microsoft Entra ID and will be included as claims in the JWT, enabling the application to enforce permissions accordingly.

## Reusable Components from Next.js Implementation

### Directly Portable (Copy with minimal changes)
1. **UI Components** (`components/ui/*`, `components/custom/*`)
   - All shadcn/ui components
   - Custom components (data cards, forms, tables)
   - Layout components (with router adjustments)

2. **State Management** (`lib/itemFilterStore.ts`)
   - Zustand stores work identically in Vite/React
   - Add persistence and multi-tab sync capabilities

3. **Form Schemas & Validation**
   - Zod schemas for forms
   - React Hook Form implementations

4. **Utility Functions** (`lib/utils/*`)
   - Error handling utilities
   - Theme utilities (adapt for initiative-based theming)
   - General helper functions

5. **Types & Interfaces**
   - Domain models
   - API contracts (with adjustments for initiative)

### Requires Adaptation
1. **D365 Client** (`lib/clients/d365Client.ts`)
   - Move to Express backend
   - Adapt token management for server environment
   - Fetch organization data from D365

2. **D365 Services** (`lib/services/d365ContactService.ts`)
   - Move to Express backend
   - Expose via RESTful endpoints
   - Fetch organizational data (Account) and lead management data

3. **Authentication Logic** (`lib/auth.ts`)
   - Replace Auth.js with MSAL Node
   - Implement JWT-based API authentication with Entra ID groups and roles

4. **API Routes** (`app/api/*`)
   - Convert to Express routes
   - Add mandatory initiative filtering middleware
   - Maintain same business logic

5. **Protected Routes**
   - Implement client-side route guards
   - API middleware for backend protection
   - Initiative validation on all requests

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
- [ ] Verify D365 queries respect initiative boundaries (if applicable)

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
- [ ] Implement structured Zustand store architecture
  - [x] Create useAuthStore for authentication, profile, and initiative (Frontend - enhanced with theme and organization data)
  - [ ] Create useUIStore for theme, loading, modals
  - [ ] Create useFilterStore for table filters and search
- [ ] Create state management documentation
  - [ ] Store structure and conventions
  - [ ] When to use local vs global state
  - [ ] Initiative data flow patterns
  - [ ] Performance optimization patterns
  - [ ] Testing strategies

#### Core API Development
- [x] Design RESTful API structure
- [x] Implement CRUD endpoints for leads with initiative filtering
  - [x] GET /api/v1/leads - List with pagination, filtering, sorting
  - [x] GET /api/v1/leads/:id - Get single lead with initiative verification
  - [x] PATCH /api/v1/leads/:id - Update lead with security checks
  - [x] GET /api/v1/leads/stats - Lead statistics endpoint
- [x] Add pagination, filtering, and sorting
- [ ] Create batch operations endpoints
- [ ] Implement comprehensive Zod validation
- [x] **Security**: Input validation for all endpoints
- [x] Add initiative audit logging (via D365_FILTER_APPLIED events)
- [x] Create cross-initiative access alerts

#### Frontend Data Layer
- [x] Configure TanStack Query with auth interceptors (QueryClient configured, interceptors in place)
- [x] Port query/mutation patterns from Next.js (adapted for Vite/React)
- [x] Implement optimistic updates (in useUpdateLead hook)
- [ ] Add error boundary integration
- [x] Create data prefetching strategies (query prefetching implemented)
- [x] Integrate with Zustand for hybrid state management (filterStore provides state, TanStack Query manages server state)
- [x] Create initiative-aware query factory (all query keys include initiative)
- [x] **CRITICAL**: Create TanStack Query hooks for API endpoints (complete with all CRUD operations)

#### Essential UI Implementation
- [ ] Port page layouts from Next.js app
- [ ] Migrate form components with validation
- [ ] Port table components with TanStack Table
- [ ] Implement loading and error states
- [ ] Add responsive design considerations
- [x] Implement initiative-based theme system (ThemeProvider with dynamic CSS variables)
- [x] Add initiative branding components (logos, colors in Header)
- [ ] Connect UI to structured state stores
- [ ] **CRITICAL**: Create data display components (tables, lists, cards)

#### Security & Environment Configuration
- [ ] Configure CORS for frontend domain
- [ ] Implement security middleware (Helmet.js, rate limiting)
- [ ] Set up environment configuration
- [ ] Implement environment variable management
- [ ] **Security**: Configure Content Security Policy for SPA
- [ ] **Security**: Implement security headers middleware
- [ ] Configure ESLint and Prettier for both projects
- [ ] Set up git hooks for code quality
- [ ] Document state management patterns and conventions

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
- [ ] Set up Vitest for both frontend and backend
- [ ] Port applicable tests from Next.js
- [ ] Add API integration tests with Supertest
- [ ] Implement component testing
- [ ] Add state management unit tests
- [ ] Test initiative boundary enforcement
- [ ] **Priority**: Add comprehensive test coverage for authentication system
  - [ ] Unit tests for all auth services and middleware
  - [ ] Integration tests for complete auth flow
  - [ ] Security tests for initiative boundary enforcement

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
- [ ] **Scalability**: Implement dynamic initiative management for 50+ state support
  - [ ] Move hardcoded state mappings to database or external configuration
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
│   ├── state-management.md     # State patterns documentation
│   ├── api-contracts.md        # API documentation
│   ├── initiatives.md          # Initiative setup guide
│   ├── initiative-based-theming.md  # Theme implementation guide
│   ├── azure-ad-group-setup.md # Entra ID configuration
│   └── deployment.md           # Deployment guide
│
│   Key implementation docs:
│   └── backend/src/services/GUID-MAPPING-IMPLEMENTATION.md
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
  roles: string[]; // Entra ID app roles (e.g., ["Admin", "Foster Partner", "Volunteer Network-Wide Partner"])
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

**Phase:** MVP Stage Core Features - Phase 2 COMPLETE ✅ → Phase 3: Lead Management UI

**Status:** Phase 2 Data Fetching Layer is COMPLETE!

**✅ Phase 1 Completed (State Management):**
- ✅ **uiStore** implemented with loading states, modals, toasts, navigation
- ✅ **filterStore** implemented with comprehensive filtering, search, sort, pagination
- ✅ **Store utilities** with type-safe functions and shared types

**✅ Phase 2 Completed (Data Fetching Layer):**
- ✅ **TanStack Query Hooks** implemented:
  - `useLeads` - List query with automatic filter integration from filterStore
  - `useLead` - Single lead query with error handling
  - `useUpdateLead` - Update mutation with optimistic updates
  - `useCreateLead` - Create mutation with cache invalidation
  - `useLeadStats` - Statistics query for dashboards
  - `useBulkUpdateLeads` - Bulk operations with confirmation
- ✅ **Security**: All query keys include initiative ID for data segregation
- ✅ **Store Integration**:
  - Filters automatically pulled from filterStore
  - Pagination updated after successful queries
  - Error messages shown as toasts via uiStore
  - No loading state duplication (uses TanStack Query's states)
- ✅ **Centralized Utilities**:
  - Error handling in `utils/errorHandling.ts`
  - Query options in `utils/queryOptions.ts`
  - Query keys factory in `queryKeys.ts`
- ✅ **TypeScript**: Fully typed with no errors
- ✅ **Documentation**: Added comprehensive guides in `/docs`

**🏗️ Infrastructure Ready for Phase 3:**
- All query hooks ready and tested
- Filter state management complete
- Error handling shows user-friendly toasts
- Optimistic updates for instant UI feedback
- Cache invalidation strategies in place

**🔧 Critical Context for Phase 3 UI Implementation:**

**DO NOT duplicate these features (already handled by hooks):**
```typescript
// ❌ DON'T do this - loading state already in query
const [isLoading, setIsLoading] = useState(false);

// ✅ DO this - use query's loading state
const { data, isLoading } = useLeads();
```

**Filter Integration is Automatic:**
```typescript
// The useLeads hook automatically uses filters from filterStore
const { data } = useLeads(); // No need to pass filters!

// To change filters, use filterStore actions
const { setLeadStatus, setLeadSearch } = useFilterStore();
```

**Error Handling is Built-in:**
```typescript
// Errors automatically show as toasts
const { data, error } = useLeads();
// No need to handle error - toast will appear
```

**Initiative Security is Enforced:**
```typescript
// All queries automatically include user's initiative
// This happens behind the scenes - you don't need to pass it
const { data } = useLeads(); // Initiative included in query key
```

**🎯 Phase 3: Build Lead Management UI (Ready to Start):**

### Phase 3: Lead Management UI Components

**Component Architecture to Build:**
```
/packages/frontend/src/
├── components/
│   ├── data/
│   │   ├── DataTable/
│   │   │   ├── DataTable.tsx           # Generic table component
│   │   │   ├── DataTablePagination.tsx # Pagination controls
│   │   │   ├── DataTableToolbar.tsx    # Filters and search
│   │   │   └── index.ts
│   │   ├── LeadTable/
│   │   │   ├── LeadTable.tsx           # Lead-specific table
│   │   │   ├── columns.tsx             # Column definitions
│   │   │   └── index.ts
│   │   └── EmptyState.tsx              # No data component
│   └── leads/
│       ├── LeadCard.tsx                # Lead summary card
│       ├── LeadForm.tsx                # Edit/create form
│       └── LeadStatusBadge.tsx         # Status display
├── pages/
│   └── leads/
│       ├── index.tsx                   # List page
│       └── [id].tsx                    # Detail page
```

**Key Implementation Guidelines:**

1. **Use the Hooks - Don't Reinvent:**
   - `useLeads()` for list data (filters automatic)
   - `useLead(id)` for single lead
   - `useUpdateLead()` for edits
   - Loading/error states from queries

2. **shadcn/ui Components Available:**
   - Button, Card, Dialog, Input already set up
   - Use these for consistent styling
   - Add Table components from shadcn/ui

3. **Filter Controls:**
   - Connect to filterStore actions
   - Don't manage filter state locally
   - Use `setLeadStatus`, `setLeadSearch`, etc.

4. **URL State Sync:**
   - Use React Router for `/leads` and `/leads/:id`
   - Consider syncing filters to URL for deep linking

5. **TypeScript Types:**
   - Import from `@partner-portal/shared`
   - Lead, LeadStatus, LeadType, etc.

**Success Criteria:**
- DataTable component with sorting, filtering, pagination
- Lead list page showing all leads with filters
- Lead detail page with edit capability
- Responsive design for mobile/desktop
- Loading skeletons for better UX
- Empty states with clear CTAs

**Next Steps After Phase 3:**
- Phase 4: Role-based navigation in Header
- Phase 5: Dashboard with statistics
- Phase 6: Testing and error boundaries

**📁 Phase 2 Deliverables (What's Available for Phase 3):**

```
/packages/frontend/src/hooks/queries/
├── queryKeys.ts              # Query key factory with initiative security
├── utils/
│   ├── errorHandling.ts      # Centralized error handling
│   └── queryOptions.ts       # Standardized query configurations
├── leads/
│   ├── useLeads.ts          # ✅ List query (auto-uses filterStore)
│   ├── useLead.ts           # ✅ Single lead query
│   ├── useUpdateLead.ts     # ✅ Update with optimistic updates
│   ├── useCreateLead.ts     # ✅ Create with cache invalidation
│   ├── useLeadStats.ts      # ✅ Statistics for dashboards
│   └── useBulkUpdateLeads.ts # ✅ Bulk operations
└── README.md                # Implementation guide

/docs/
├── data-fetching.md         # Comprehensive TanStack Query guide
└── data-fetching-patterns.md # Quick reference patterns
```

**🔧 Technical Considerations for Phase 3:**
- TanStack Table is not yet installed - install when building tables
- React Hook Form + Zod are available for forms
- Consider React Error Boundaries before building UI
- Plan loading skeletons (shadcn/ui has Skeleton component)
- Design empty states for better UX
- ESLint has known issues with @typescript-eslint (can ignore for now)

**🔒 Security Reminders:**
- Never store sensitive data in Zustand stores
- Initiative filtering is enforced server-side
- 404 responses for unauthorized access (not 403)
- All API calls include JWT automatically

**💡 Tips for Next Session:**
1. Start with query keys factory pattern
2. Test error scenarios early
3. Use React Query DevTools for debugging
4. Keep loading states in TanStack Query, not Zustand
5. Remember pagination updates after successful queries

---

*This charter represents a strategic exploration of decoupled architecture with multi-state initiative support. The initiative-based security model is non-negotiable and must be implemented from day one.*
