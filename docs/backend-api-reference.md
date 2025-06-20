# Backend API Reference

## Overview
All API endpoints follow RESTful conventions and require authentication unless specified. Responses use standard HTTP status codes and consistent error formats.

## Base URL
```
Development: http://localhost:3000/api
Production: https://api.partnerportal.com/api
```

## Authentication

### POST /auth/login
Authenticate with Azure AD and receive JWT token.

**Request:**
```typescript
{
  returnTo?: string  // Optional redirect URL
}
```

**Response:**
```typescript
{
  redirectUrl: string  // Azure AD login URL
}
```

### GET /auth/callback
Handle Azure AD callback and generate JWT.

**Query Parameters:**
- `code`: Authorization code from Azure AD
- `state`: CSRF protection state

**Response:**
- Redirects to frontend with token in query params
- Or returns error page on failure

### POST /auth/logout
Invalidate session and clear tokens.

**Response:**
```typescript
{
  redirectUrl: string  // Azure AD logout URL
}
```

### GET /auth/me
Get current user profile and permissions.

**Response:**
```typescript
{
  data: {
    id: string,
    email: string,
    name: string,
    initiative: Initiative,
    organization?: OrganizationData,
    roles: string[],
    permissions: string[]
  }
}
```

### GET /auth/profile
Get detailed user profile with D365 organization data.

**Response:**
```typescript
{
  data: {
    user: ExtendedJWTPayload,
    organization?: {
      id: string,
      name: string,
      type: string,
      organizationLeadType?: string,
      attributes: Record<string, any>
    }
  }
}
```

## Lead Management

### GET /api/v1/leads
Get paginated list of leads for user's initiative/organization.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 50, max: 100)
- `search`: Search term for lead names
- `sortBy`: Field to sort by (name, status, type, createdAt, updatedAt)
- `sortOrder`: 'asc' or 'desc' (default: 'desc')

**Security:**
- Mandatory initiative filtering based on JWT
- Organization-based assignment filtering
- All filters are cumulative (AND condition)

**Response:**
```typescript
{
  data: Lead[],
  meta: {
    total: number,
    page: number,
    limit: number,
    pages: number
  }
}
```

### GET /api/v1/leads/:id
Get single lead by ID with initiative verification.

**Response:**
```typescript
{
  data: Lead
}
```

**Errors:**
- `404`: Lead not found or access denied

### PATCH /api/v1/leads/:id
Update lead fields (currently disabled during refactoring).

**Status:** `501 Not Implemented`

### GET /api/v1/leads/stats
Get aggregated statistics for user's leads.

**Response:**
```typescript
{
  data: {
    total: number,
    byStatus: Record<LeadStatus, number>,
    byType: Record<LeadType, number>,
    recentActivity: {
      created: number,
      updated: number,
      assigned: number
    }
  }
}
```

## Health Checks

### GET /health
Basic health check endpoint.

**Response:**
```typescript
{
  status: 'healthy',
  timestamp: string,
  version: string
}
```

### GET /health/ready
Check if service is ready to handle requests.

**Response:**
```typescript
{
  ready: boolean,
  checks: {
    database: boolean,
    d365: boolean,
    auth: boolean
  }
}
```

## Error Responses

All errors follow this format:
```typescript
{
  error: string,      // Human-readable message
  code: string,       // Machine-readable code
  details?: any       // Additional context
}
```

### Common Error Codes
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Invalid request data
- `D365_ERROR`: External service error
- `INTERNAL_ERROR`: Server error

## Request Headers

### Required Headers
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Optional Headers
```
X-Request-ID: <uuid>     # For request tracking
Accept-Language: en-US   # For localization
```

## Rate Limiting

- **Anonymous**: 10 requests/minute
- **Authenticated**: 100 requests/minute
- **Per endpoint**: Varies by resource intensity

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1640995200
```

## Pagination

List endpoints support pagination:
```
GET /api/v1/leads?page=2&limit=50
```

Response includes metadata:
```typescript
{
  data: T[],
  meta: {
    total: 150,      // Total records
    page: 2,         // Current page
    limit: 50,       // Page size
    pages: 3         // Total pages
  }
}
```

## Filtering & Sorting

### Filtering
Use query parameters for filtering:
```
GET /api/v1/leads?status=assigned&type=foster
```

### Sorting
Use `sortBy` and `sortOrder`:
```
GET /api/v1/leads?sortBy=createdAt&sortOrder=desc
```

## Security Considerations

### Initiative Filtering
All data endpoints automatically filter by user's initiative. This cannot be overridden by query parameters.

### Organization Scoping
Lead data is further filtered by organization based on:
- Foster organizations: Direct assignment
- Volunteer organizations: Many-to-many relationship
- Dual organizations: Combined filters

### Audit Logging
All data access is logged with:
- User identity
- Initiative context
- Organization filter
- Timestamp
- Resource accessed

## Versioning

API versions are included in the URL path:
```
/api/v1/leads  # Current version
/api/v2/leads  # Future version
```

Breaking changes require new version. Non-breaking changes are added to current version.

## CORS Policy

Allowed origins configured per environment:
- Development: `http://localhost:5173`
- Production: `https://partnerportal.com`

Credentials are included for authenticated requests.