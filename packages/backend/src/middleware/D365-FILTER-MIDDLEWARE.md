# D365 Initiative Filter Middleware

## Overview

The D365 Initiative Filter Middleware is a **critical security component** that ensures all D365 queries are automatically filtered by the user's initiative. This prevents cross-initiative data access and maintains strict data isolation between different state initiatives.

## How It Works

### 1. Middleware Injection

The `enforceInitiative` middleware now automatically injects a `D365Filter` object into the Express request:

```typescript
// In auth.middleware.ts
const d365Filter: D365Filter = {
  initiative: userInitiative,  // From Entra ID groups
  userId: req.user.sub,
  organizationId: req.user.organization?.id
};

req.d365Filter = d365Filter;
```

### 2. Service Layer Enforcement

The Lead Service **always** includes the initiative filter in D365 queries:

```typescript
// In lead.service.ts
private buildSecureODataFilter(initiativeFilter: D365Filter, userFilters?: LeadFilters): string {
  const filters: string[] = [];
  
  // CRITICAL: Always include initiative filter first (non-negotiable)
  if (!initiativeFilter.initiative) {
    throw new AppError('Initiative filter is required for all queries', 500);
  }
  filters.push(`tc_initiative eq '${this.escapeODataString(initiativeFilter.initiative)}'`);
  
  // Add other filters...
}
```

### 3. Security Features

- **Automatic Filter Injection**: Every protected endpoint gets `req.d365Filter` automatically
- **Cross-Initiative Protection**: Service methods verify lead ownership before returning data
- **Audit Logging**: All filter applications are logged with `D365_FILTER_APPLIED` events
- **Query Escaping**: OData strings are escaped to prevent injection attacks

## Usage

### Protected Endpoints

Any endpoint using `enforceInitiative` middleware automatically gets D365 filtering:

```typescript
router.get(
  '/leads',
  authenticateToken,
  enforceInitiative(),  // This injects req.d365Filter
  leadController.getLeads
);
```

### Controller Implementation

Controllers access the injected filter from the request:

```typescript
async getLeads(req: Request, res: Response) {
  // Filter is already injected by middleware
  if (!req.d365Filter) {
    throw new AppError('D365 filter not found', 500);
  }
  
  // Pass to service layer
  const leads = await leadService.getLeads(req.d365Filter, filters, options);
}
```

## Security Considerations

1. **Never Trust Client Input**: Initiative MUST come from JWT/Entra ID, never from request parameters
2. **Verify Ownership**: When fetching single records, always verify they belong to the user's initiative
3. **Audit Everything**: All D365 queries are logged for security auditing
4. **Fail Securely**: If no initiative is found, access is denied (no default fallback)

## Testing

To verify the middleware is working:

1. Check logs for `D365_FILTER_APPLIED` events
2. Attempt to access leads from different initiatives (should fail)
3. Verify OData queries include `tc_initiative` filter
4. Test with users having multiple initiative groups

## Production Checklist

- [ ] Ensure D365 custom field `tc_initiative` exists on all relevant entities
- [ ] Configure proper indexes on `tc_initiative` for performance
- [ ] Set up monitoring alerts for cross-initiative access attempts
- [ ] Review audit logs regularly for security anomalies
- [ ] Test with production-like data volumes