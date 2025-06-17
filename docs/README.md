# Partner Portal v2.0 Documentation

## Quick Start Guides

- **[Lead Management Quick Reference](./lead-management-quick-reference.md)** - Common tasks and code locations for lead features
- **[State Management Quick Reference](./state-management-quick-reference.md)** - Quick guide to using stores

## Core Concepts

### Architecture & Patterns
- **[Shared Types Architecture](./shared-types-architecture.md)** - Type system design and principles
- **[Shared Types Quick Reference](./shared-types-quick-reference.md)** - Common types and patterns
- **[State Management](./state-management.md)** - Comprehensive guide to Zustand stores
- **[State Management Patterns](./state-management-patterns.md)** - Advanced patterns and best practices
- **[Data Fetching](./data-fetching.md)** - TanStack Query implementation
- **[Data Fetching Patterns](./data-fetching-patterns.md)** - Query patterns and examples

### UI Components & Features
- **[Lead Management UI](./lead-management-ui.md)** - Architecture and patterns for lead features
- **[Data Table Pattern](./data-table-pattern.md)** - Reusable table component guide
- **[Initiative-Based Theming](./initiative-based-theming.md)** - Dynamic theming system

### Authentication & Security
- **[Frontend Authentication Flow](./frontend-authentication-flow.md)** - Auth implementation details
- **[Azure AD App Registration Requirements](./azure-ad-app-registration-requirements.md)** - Azure setup guide
- **[Azure AD Group Setup](./azure-ad-group-setup.md)** - Security group configuration

### Backend Architecture & APIs
- **[Backend Architecture](./backend-architecture.md)** - Core design principles and patterns
- **[Backend API Reference](./backend-api-reference.md)** - Complete API endpoint documentation
- **[D365 Integration Guide](./d365-integration-guide.md)** - Dynamics 365 data model and queries
- **[Initiative GUID Configuration](./initiative-guid-configuration.md)** - Configuration-driven initiative mapping
- **[Backend Troubleshooting](./backend-troubleshooting.md)** - Common issues and debugging guide

## Documentation Structure

### For New Team Members

#### All Developers
1. **Start here:** **[Shared Types Architecture](./shared-types-architecture.md)** - Understanding the type system
2. Bookmark **[Shared Types Quick Reference](./shared-types-quick-reference.md)** for daily use

#### Frontend Developers
1. Start with **[Lead Management UI](./lead-management-ui.md)** for a complete feature example
2. Review **[State Management](./state-management.md)** to understand data flow
3. Check **[Data Fetching](./data-fetching.md)** for API integration patterns
4. Use **Quick Reference** guides for day-to-day tasks

#### Backend Developers
1. Start with **[Backend Architecture](./backend-architecture.md)** for design principles
2. Review **[Backend API Reference](./backend-api-reference.md)** for endpoint details
3. Check **[D365 Integration Guide](./d365-integration-guide.md)** for data model
4. Study security patterns in authentication documentation

### For Specific Tasks

#### Frontend Tasks
- **Building a new table?** → [Data Table Pattern](./data-table-pattern.md)
- **Adding filters?** → [State Management Patterns](./state-management-patterns.md)
- **Working with leads?** → [Lead Management Quick Reference](./lead-management-quick-reference.md)
- **Setting up auth?** → [Frontend Authentication Flow](./frontend-authentication-flow.md)

#### Backend Tasks
- **Adding an API endpoint?** → [Backend API Reference](./backend-api-reference.md)
- **Querying D365 data?** → [D365 Integration Guide](./d365-integration-guide.md)
- **Implementing security?** → [Backend Architecture](./backend-architecture.md#security-middleware-stack)
- **Handling errors?** → [Backend Architecture](./backend-architecture.md#error-handling)

### For Architecture Decisions
- **Why Zustand?** → [State Management](./state-management.md#why-zustand)
- **Why TanStack Query?** → [Data Fetching](./data-fetching.md#why-tanstack-query)
- **Security model** → [Azure AD Group Setup](./azure-ad-group-setup.md)

## Key Principles

1. **State Separation**: UI state (Zustand) vs Server state (TanStack Query)
2. **Type Safety**: TypeScript throughout with shared types
3. **Accessibility**: ARIA labels, keyboard navigation, screen reader support
4. **Performance**: Server-side pagination, optimistic updates, loading states
5. **Security**: Initiative-based data isolation, role-based access control

## Common Patterns

### Data Flow
```
User Action → Store Action → API Call → Update Store → UI Updates
```

### Component Structure
```
Page Component → Feature Component → Generic Component → UI Primitives
```

### Error Handling
```
API Error → Query Hook → Toast Notification → User Feedback
```

## Contributing to Docs

When adding new documentation:
1. Focus on concepts over implementation details
2. Include examples for common use cases
3. Link to related documentation
4. Keep code examples minimal and focused
5. Update this README with new doc references