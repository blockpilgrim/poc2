# Backend Architecture - Current Implementation

This document describes the actual backend architecture after the successful three-phase refactoring completed in June 2025. It serves as the authoritative guide for understanding how the backend is structured and operates.

## Overview

The backend is a TypeScript-based Express.js API that integrates with Microsoft Dynamics 365 (D365) to manage partner portal leads. The architecture emphasizes security, maintainability, and clear separation of concerns.

### Key Architectural Decisions

1. **Direct D365 Integration**: The backend communicates directly with D365 Web API using the `tc_everychildlead` entity for lead management
2. **Initiative-Based Security**: All data access is filtered by initiative (state) based on user's Entra ID group membership
3. **Retry with Exponential Backoff**: All D365 API calls include automatic retry logic for transient failures
4. **Structured Error Handling**: Comprehensive error parsing and logging for D365-specific error scenarios
5. **Type Safety**: Full TypeScript coverage with zero `any` types in the lead service

## Directory Structure

```
packages/backend/
├── src/
│   ├── config/              # Configuration modules
│   ├── constants/           # Application constants
│   │   └── d365/           # D365-specific constants
│   │       ├── lead-fields.ts     # Field names and navigation properties
│   │       └── query-constants.ts # Pagination, state codes, mappings
│   ├── controllers/         # Express route controllers
│   ├── middleware/          # Express middleware
│   │   ├── auth.middleware.ts     # Authentication and authorization
│   │   └── error.middleware.ts    # Global error handling
│   ├── routes/              # API route definitions
│   ├── services/            # Business logic layer
│   │   ├── auth.service.ts        # MSAL authentication
│   │   ├── d365.service.ts        # D365 client and base operations
│   │   └── lead.service.ts        # Lead management (main service)
│   ├── types/               # TypeScript type definitions
│   └── utils/               # Utility functions
│       ├── d365/           # D365-specific utilities
│       │   ├── audit-logger.ts    # Security audit logging
│       │   ├── error-parser.ts    # D365 error response parsing
│       │   ├── odata-utils.ts     # OData query building
│       │   └── retry-helper.ts    # Retry with exponential backoff
│       └── logger.ts       # Centralized logging
└── tests/                   # Test suites
```

## Core Services

### Lead Service (`lead.service.ts`)

The main service for lead management, refactored for clarity and maintainability:

**Key Features:**
- Organization-based filtering (Foster vs Volunteer journeys)
- Initiative-based security boundaries
- Comprehensive error handling with context
- Automatic retry on transient failures
- Field mapping between frontend and D365 names

**Main Methods:**
- `getLeads()`: Paginated lead listing with filters
- `getLeadById()`: Single lead retrieval with security checks
- `getLeadStats()`: Aggregated statistics
- `updateLead()`: Lead updates (temporarily disabled)

**Helper Methods (focused, single-responsibility):**
- `buildSecureODataFilter()`: Orchestrates filter building (19 lines)
- `applyActiveRecordFilter()`: Adds active record filter (4 lines)
- `applyInitiativeFilter()`: Validates and adds initiative filter (8 lines)
- `validateOrganizationType()`: Validates organization format
- `buildOrganizationFilters()`: Handles Foster/Volunteer filtering (32 lines)
- `applyUserSearchFilters()`: Adds search criteria (7 lines)
- `executeD365Query()`: Executes queries with retry logic
- `handleD365QueryError()`: Comprehensive error handling (44 lines)

### D365 Service (`d365.service.ts`)

Base service for D365 Web API communication:

**Key Features:**
- OAuth2 client credentials flow
- On-behalf-of token exchange
- User organization lookup via Contact entity
- Centralized D365 URL building
- Shared retry logic application

**Main Methods:**
- `getAccessToken()`: OAuth token management
- `getUserOrganization()`: Maps Entra ID user to D365 organization
- `queryContactByAzureId()`: Contact entity queries for user lookup

### Auth Service (`auth.service.ts`)

MSAL-based authentication with Entra ID:

**Key Features:**
- JWT token generation with groups and roles
- Initiative extraction from group membership
- Role-based access control
- Session management

## Utility Modules

### Retry Helper (`retry-helper.ts`)

Implements exponential backoff with jitter:

```typescript
const result = await withRetry(
  () => fetch(url, options),
  {
    maxAttempts: 3,
    initialDelay: 1000,
    backoffMultiplier: 2,
    maxDelay: 10000,
    retryableStatusCodes: [429, 500, 502, 503, 504]
  }
);
```

### OData Utils (`odata-utils.ts`)

Safe OData query building with validation:

```typescript
const filter = buildODataFilter([
  { field: 'statecode', operator: 'eq', value: 0 },
  { field: 'name', operator: 'contains', value: escapeODataString(searchTerm) }
]);
// Output: statecode eq 0 and contains(name, 'escaped%20value')
```

### Audit Logger (`audit-logger.ts`)

Security event logging with structured data:

```typescript
auditLogger.log({
  eventType: 'ORGANIZATION_VALIDATION_FAILED',
  userId: 'user-id',
  details: { reason: 'Invalid format', attemptedValue: 'bad-data' }
});
```

### Error Parser (`error-parser.ts`)

D365-specific error response parsing:

```typescript
const parsed = parseD365Error(errorResponse);
// Returns: { code: 'PRIVILEGE_DENIED', message: 'User lacks read privilege' }
```

## Security Architecture

### Initiative Boundaries

Every API request is filtered by the user's initiative (state):

1. User's Entra ID groups are included in JWT
2. Groups are mapped to initiative using GUID configuration
3. All D365 queries include initiative filter
4. Cross-initiative access attempts are logged and blocked

### Organization-Based Access

Users can only see leads from their organization:

1. User's Entra ID is mapped to D365 Contact
2. Contact is linked to Account (organization)
3. Leads are filtered by organization type (Foster/Volunteer)
4. Network-wide roles see all organizations of their type

## Error Handling Patterns

### Layered Error Handling

1. **Utility Level**: Utilities throw specific errors
2. **Service Level**: Services catch, enhance, and re-throw
3. **Controller Level**: Controllers use error middleware
4. **Middleware Level**: Global error handler formats response

### Error Context

All errors include contextual information:

```typescript
{
  code: 'D365_QUERY_ERROR',
  message: 'Failed to retrieve leads',
  details: {
    operation: 'GET /api/v1/leads',
    entity: 'tc_everychildlead',
    filters: { initiative: 'ec-arkansas', organizationType: 'volunteer' },
    originalError: { ... }
  }
}
```

## Performance Optimizations

### Query Optimization

- Field selection limited to required fields
- Expand clauses cached at service initialization
- Pagination with configurable limits

### Retry Strategy

- Exponential backoff prevents thundering herd
- Jitter adds randomness to retry timing
- Maximum delay caps prevent infinite waits

### Logging Optimization

- Structured logging with consistent format
- Log levels for filtering in production
- Sensitive data excluded from logs

## Testing Strategy

### Unit Tests

- All utilities have comprehensive test coverage
- Service methods tested with mocked dependencies
- Edge cases and error scenarios covered

### Integration Tests

- API endpoints tested with supertest
- D365 service mocked at HTTP level
- Security boundaries verified

### Test Organization

```
backend/src/
├── utils/
│   └── d365/
│       └── __tests__/      # Utility unit tests
├── services/
│   └── __tests__/          # Service unit tests
└── tests/
    └── integration/        # API integration tests
```

## Configuration

### Environment Variables

```bash
# Server
PORT=3000
NODE_ENV=production

# Azure AD
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-secret

# D365
D365_URL=https://your-org.crm.dynamics.com
D365_API_VERSION=v9.2

# Security
JWT_SECRET=your-jwt-secret
SESSION_SECRET=your-session-secret
```

### Initiative Configuration

Initiatives are mapped using GUIDs in `initiative-config.ts`:

```typescript
export const INITIATIVE_GUID_MAP = {
  'group-guid-1': 'ec-arkansas',
  'group-guid-2': 'ec-tennessee',
  // ... more states
};
```

## Monitoring and Debugging

### Audit Events

Key security events logged:
- `D365_FILTER_APPLIED`: Every data query
- `ORGANIZATION_VALIDATION_FAILED`: Invalid org data
- `CROSS_INITIATIVE_ATTEMPT`: Security violations
- `TOKEN_VALIDATION_FAILED`: Auth failures

### Performance Metrics

- D365 query duration
- Retry attempt counts
- Error rates by type
- Initiative-based usage

### Debugging Tools

- Structured logs with correlation IDs
- D365 query logging in development
- Error stack traces in non-production

## Future Considerations

### Scalability

- Current architecture supports 50+ initiatives
- D365 API rate limits may require caching layer
- Consider Redis for session management at scale

### Maintainability

- Type definitions keep frontend/backend in sync
- Utility modules enable consistent patterns
- Clear separation enables parallel development

### Security

- Regular audit log reviews
- Automated security testing
- Penetration testing for boundaries

## Conclusion

This architecture provides a secure, maintainable, and scalable foundation for the Partner Portal v2.0. The three-phase refactoring has resulted in:

1. **Clear code organization** with focused, single-responsibility methods
2. **Comprehensive error handling** with actionable context
3. **Robust security boundaries** with audit logging
4. **Type safety** throughout the codebase
5. **Consistent patterns** via reusable utilities

The backend is production-ready and well-positioned for future enhancements.