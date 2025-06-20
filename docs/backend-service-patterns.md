# Backend Service Patterns

## Overview
This document describes the architectural patterns and best practices implemented in the backend services, particularly after the Phase 3 refactoring of the lead service.

## Service Architecture Principles

### 1. Single Responsibility Methods
Each method should do one thing well:
- Maximum 30 lines per method (except centralized handlers)
- Clear, descriptive names that indicate purpose
- Focused on a single operation or transformation

### 2. Type Safety
Zero tolerance for `any` types:
- All methods have explicit return types
- All parameters are properly typed
- Type guards for runtime validation
- Interfaces for all data structures

### 3. Error Handling Pattern
Centralized error handling with context:

```typescript
private async handleD365QueryError(
  error: unknown,
  context: D365ErrorContext
): Promise<never> {
  // Already formatted errors pass through
  if (error instanceof AppError) {
    this.logger.error(`${context.operation} failed`, error, context);
    throw error;
  }
  
  // Parse D365-specific errors
  if (error && typeof error === 'object' && 'status' in error) {
    const parsedError = await parseD365Error(error as Response);
    // Specific error code handling
    if (parsedError.statusCode === 404) {
      throw AppError.notFound(context.resource || 'Resource');
    }
    throw createAppErrorFromD365(parsedError);
  }
  
  // Generic fallback
  throw AppError.internal(`Failed to ${context.operation}`);
}
```

### 4. Security-First Design
All user input must be validated and escaped:
```typescript
// Always escape user input in OData filters
orgFilters.push(
  `${D365_LEAD_FIELDS.FOSTER_ORGANIZATION} eq '${escapeODataString(initiativeFilter.organizationId)}'`
);
```

## Lead Service Patterns

### Filter Building Pattern
Complex filters are built using focused helper methods:

```typescript
private async buildSecureODataFilter(
  initiativeFilter: D365Filter,
  userFilters?: LeadFilters
): Promise<string> {
  const filters: string[] = [];
  
  // Each method handles one aspect
  this.applyActiveRecordFilter(filters);
  this.applyInitiativeFilter(filters, initiativeFilter);
  
  if (initiativeFilter.organizationId) {
    const orgFilters = await this.buildOrganizationFilters(initiativeFilter);
    if (orgFilters.length > 0) {
      filters.push(`(${orgFilters.join(' or ')})`);
    }
  }
  
  this.applyUserSearchFilters(filters, userFilters);
  
  return combineFilters(filters, 'and');
}
```

### Retry Pattern
All external API calls use exponential backoff:

```typescript
private readonly retryOptions: RetryOptions = {
  maxRetries: 3,
  initialDelay: 1000,
  backoffFactor: 2,
  retryableStatusCodes: [429, 500, 502, 503, 504],
  logger: (msg, data) => this.logger.debug(`[Retry] ${msg}`, data)
};

// Usage
const response = await this.executeD365Query(url, token, context);
```

### Performance Optimization Pattern
Cache expensive computations at initialization:

```typescript
export class LeadService {
  // Computed once, used many times
  private readonly selectClause = buildLeadSelectClause();
  private readonly expandClause = buildLeadExpandClause();
}
```

### Query Building Pattern
Build query parameters as objects, not strings:

```typescript
private buildODataQueryParams(
  options: D365QueryOptions, 
  filter?: string
): ODataQueryParams {
  const params: ODataQueryParams = {
    $select: this.selectClause,
    $expand: this.expandClause,
    $count: true
  };
  
  if (filter) params.$filter = filter;
  if (options.limit) params.$top = Math.min(options.limit, MAX_PAGE_SIZE);
  if (options.offset) params.$skip = options.offset;
  
  return params;
}
```

## Validation Patterns

### Organization Type Validation
Security validations should log before throwing:

```typescript
private async validateOrganizationType(
  organizationLeadType: string,
  initiativeFilter: D365Filter
): Promise<void> {
  if (!isValidOrganizationLeadType(organizationLeadType)) {
    await this.logOrganizationValidationFailure(
      initiativeFilter,
      'INVALID_FORMAT',
      { errorMessage: 'Invalid organizationLeadType format' }
    );
    throw AppError.badRequest('Invalid organization configuration');
  }
}
```

## Logging Patterns

### Structured Logging
Use consistent log levels and structured data:

```typescript
this.logger.info('Querying leads with filter', {
  initiative: initiativeFilter.initiative,
  organization: initiativeFilter.organizationId,
  organizationType: initiativeFilter.organizationLeadType,
  additionalFilters: filters,
  oDataFilter
});
```

### Security Event Logging
All security-relevant operations must be logged:

```typescript
await auditLogger.logD365FilterApplied(
  initiativeFilter.userId || 'unknown',
  initiativeFilter.initiative,
  { filters, oDataFilter },
  `GET /api/v1/leads`
);
```

## Error Creation Patterns

### Use Factory Methods
Consistent error creation improves maintainability:

```typescript
// Good
throw AppError.badRequest('Invalid organization configuration');
throw AppError.notFound('Lead');
throw AppError.forbidden('Access denied to requested resource');
throw AppError.internal('Failed to fetch leads');

// Avoid
throw new AppError('Message', 400);
```

## Testing Considerations

### Testable Design
- Dependency injection for external services
- Pure functions where possible
- Minimal side effects in helper methods
- Clear separation of I/O and logic

### Mock-Friendly Architecture
Services expose interfaces that are easy to mock:
```typescript
vi.mock('../d365.service', () => ({
  d365Service: {
    getAccessToken: vi.fn()
  }
}));
```

## Anti-Patterns to Avoid

1. **Long Methods**: Break down any method over 30 lines
2. **Generic Types**: Avoid `Record<string, any>` - create specific interfaces
3. **String Building**: Don't build and parse strings unnecessarily
4. **Error Swallowing**: Always log errors with context
5. **Duplicate Logic**: Extract common patterns to helper methods
6. **Missing Validation**: Always validate and escape user input
7. **Synchronous Heavy Operations**: Use async/await appropriately

## Conclusion

These patterns ensure:
- **Maintainability**: Code is easy to understand and modify
- **Security**: All user input is validated and escaped
- **Performance**: Expensive operations are cached
- **Reliability**: Retry logic handles transient failures
- **Debuggability**: Comprehensive logging and error context