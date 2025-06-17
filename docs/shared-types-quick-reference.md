# Shared Types Quick Reference

## Most Used Types

### Lead
**Purpose**: Represents a tc_everychildlead from D365
```typescript
interface Lead {
  id: string;                      // D365 GUID
  name: string;                    // Lead title
  subjectName?: string;            // Person's name
  subjectEmail?: string;           // Person's email
  leadOwnerName?: string;          // Internal owner
  status: LeadStatus;              // Lifecycle status
  type: LeadType;                  // Foster/Volunteer
  leadScore?: number;              // Scoring metric
  initiativeId: string;            // Security boundary
  assignedOrganizationId?: string; // From JWT context
  assignedOrganizationName?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### User
**Purpose**: Authenticated user identity
```typescript
interface User {
  id: string;          // Entra ID
  email: string;
  name: string;
  initiative?: string; // Primary initiative
  roles: string[];     // Entra ID app roles
}
```

### Initiative
**Purpose**: State/region configuration
```typescript
interface Initiative {
  id: string;              // e.g., 'ec-oregon'
  name: string;            // Display name
  theme: ThemeConfig;      // Branding
  features?: string[];     // Feature flags
}
```

## Common Patterns

### API Responses
```typescript
// Single resource
ApiResponse<Lead>

// List with pagination
PaginatedResponse<Lead>

// Error
ApiError
```

### Filtering
```typescript
interface LeadFilters extends FilterParams {
  // Currently only search is implemented
  // Other filters handled server-side via JWT
}
```

### Status Enums
```typescript
type LeadStatus = 'assigned' | 'in-progress' | 'certified' | 'on-hold' | 'closed' | 'other';
type LeadType = 'foster' | 'volunteer' | 'other';
```

## Do's and Don'ts

### ✅ DO
- Import types with `import type` for better tree shaking
- Use optional chaining for optional fields
- Include initiativeId in security-sensitive types
- Map unknown D365 values to 'other'

### ❌ DON'T
- Add cross-initiative references
- Expose raw D365 field names
- Make security fields optional
- Duplicate types between packages

## Type Guards

```typescript
// Check if valid status
const isValidStatus = (status: string): status is LeadStatus => {
  return ['assigned', 'in-progress', 'certified', 'on-hold', 'closed', 'other'].includes(status);
};

// Check if has required fields
const isCompleteUser = (user: Partial<User>): user is User => {
  return !!(user.id && user.email && user.name);
};
```

## Migration Helpers

When types change:
```typescript
// Map old status to new
const mapLegacyStatus = (old: string): LeadStatus => {
  const mapping: Record<string, LeadStatus> = {
    'new': 'assigned',
    'contacted': 'in-progress',
    'qualified': 'in-progress',
    // ... etc
  };
  return mapping[old] || 'other';
};
```

## Quick Commands

```bash
# Type check shared package
npm run type-check -w @partner-portal/shared

# Build after changes
npm run build:shared

# Check what's exported
npm run preview -w @partner-portal/shared
```

## Common Issues

### "Cannot find module '@partner-portal/shared'"
- Run `npm run build:shared` first
- Check tsconfig paths configuration

### Type changes not reflecting
- Rebuild shared package
- Restart TypeScript server in IDE
- Check for duplicate type definitions

### Breaking changes
- Update both frontend and backend together
- Document in BREAKING-CHANGES file
- Coordinate with team

## Where to Find Things

| Type Category | Location | Example |
|--------------|----------|---------|
| Entities | `/types/{entity}.ts` | `lead.ts`, `user.ts` |
| API contracts | `/types/api.ts` | `ApiResponse`, `PaginatedResponse` |
| Auth types | `/types/auth.ts` | `JWTPayload`, `ExtendedJWTPayload` |
| Schemas | `/schemas/{entity}.ts` | Zod validation schemas |
| Constants | `/constants/{domain}.ts` | Static values, enums |

## Getting Help

1. Check type definitions: `/packages/shared/src/types/`
2. Look for JSDoc comments in source
3. Review [Shared Types Architecture](./shared-types-architecture.md)
4. Check existing usage in codebase