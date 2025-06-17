# Shared Types Architecture

## Overview

The `@partner-portal/shared` package serves as the **single source of truth** for type definitions shared between the frontend and backend. This architectural pattern ensures type safety and contract consistency across our decoupled application layers.

## Core Principles

### 1. Single Source of Truth
All data structures that cross the frontend/backend boundary are defined once in the shared package. This prevents drift and ensures both layers speak the same language.

### 2. Business Logic Encoding
Types aren't just data shapes - they encode critical business rules and constraints. For example, `LeadStatus` values directly map to D365 option sets.

### 3. Security by Design
Types enforce security boundaries. The `initiativeId` field on most entities ensures data segregation at the type level.

### 4. D365 Alignment
Many types map to D365 entities. The type definitions abstract D365's complexity while preserving necessary fidelity.

## Key Type Categories

### Entity Types
Core business objects that represent D365 entities or domain concepts:
- **User**: Authentication and identity
- **Lead**: Maps to `tc_everychildlead` D365 entity
- **Initiative**: State/region segregation boundary
- **Organization**: Partner organization context

### Contract Types
API communication contracts:
- **ApiResponse<T>**: Standardized response wrapper
- **PaginatedResponse<T>**: List endpoints with metadata
- **FilterParams**: Base filtering interface
- **ApiError**: Consistent error structure

### Auth Types
Security and authentication:
- **JWTPayload**: Token structure with claims
- **UserWithOrganization**: Extended user context
- **OrganizationData**: D365 organization details

## Critical Patterns

### Initiative Scoping
Most entity types include `initiativeId`. This is **non-negotiable** for security:
```typescript
interface Lead {
  id: string;
  initiativeId: string; // CRITICAL: Security boundary
  // ... other fields
}
```

### Optional vs Required
- **Required**: Identity, security, and audit fields
- **Optional**: D365 lookups that might be empty
- **Never Optional**: `initiativeId`, `id`, timestamps

### Status/Type Enumerations
Always use string literal unions for D365 option sets:
```typescript
type LeadStatus = 'assigned' | 'in-progress' | 'certified' | 'on-hold' | 'closed' | 'other';
```
The `'other'` value handles unmapped D365 values gracefully.

### Timestamp Patterns
All entities include audit timestamps:
```typescript
interface Entity {
  createdAt: Date;
  updatedAt: Date;
}
```

## Type Evolution Guidelines

### Adding Fields
1. New fields should be optional initially
2. Consider impact on both frontend and backend
3. Document D365 mapping if applicable

### Breaking Changes
1. Must be coordinated between teams
2. Document in BREAKING-CHANGES file
3. Consider API versioning impact
4. Update both producer and consumer

### Deprecation Process
1. Mark with `@deprecated` JSDoc
2. Provide migration path
3. Maintain for at least one release
4. Document removal timeline

## Security Considerations

### Never Add
- Cross-initiative references
- Direct user credentials
- Unfiltered D365 IDs
- Sensitive configuration

### Always Include
- Initiative context where applicable
- Proper organization scoping
- Audit trail fields

## Working with Shared Types

### Building
```bash
npm run build:shared
```

### Type Checking
```bash
npm run type-check
```

### Import Pattern
```typescript
import type { Lead, LeadFilters, LeadStatus } from '@partner-portal/shared';
```

## Common Pitfalls

1. **Don't duplicate types** - If it crosses layers, it belongs in shared
2. **Don't expose D365 internals** - Abstract complexity in type design
3. **Don't forget security** - Initiative scoping is mandatory
4. **Don't break contracts silently** - Coordinate changes

## Type Documentation Location

For specific type details:
- **Source**: `/packages/shared/src/types/`
- **Build Output**: `/packages/shared/dist/`
- **Tests**: `/packages/shared/src/__tests__/`

## Architecture Decision Records

### Why TypeScript Interfaces over Classes?
- Lighter weight for DTOs
- Better tree shaking
- No runtime overhead
- Cleaner JSON serialization

### Why Separate Package?
- Enforces architectural boundaries
- Enables independent versioning
- Prevents circular dependencies
- Clear ownership model

### Why Not Generate from OpenAPI?
- D365 complexity requires manual curation
- Business logic embedded in types
- Need TypeScript-specific features
- Simpler toolchain

## Related Documentation

- [Backend Architecture](./backend-architecture.md) - How types are consumed
- [D365 Integration Guide](./d365-integration-guide.md) - Entity mappings
- [State Management](./state-management.md) - Frontend type usage