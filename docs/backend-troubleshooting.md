# Backend Troubleshooting Guide

## Common Issues & Solutions

### Authentication Issues

#### "Initiative filter is required for all queries"
**Cause:** The security middleware didn't inject the D365 filter.
**Solution:** Ensure `enforceInitiative` middleware is applied to the route:
```typescript
router.get('/leads', authenticateToken, enforceInitiative(), getLeads);
```

#### "No valid initiative groups assigned"
**Cause:** User's Entra ID groups don't map to any initiative.
**Solution:** 
1. Check user's group membership in Azure portal
2. Verify group GUIDs in `AUTH_GROUP_MAPPING` environment variable
3. Ensure group names follow pattern: "Partner Portal - EC {State}"

#### JWT Token Expired
**Symptoms:** 401 errors after ~15 minutes
**Solution:** Frontend should refresh tokens before expiry or implement auto-refresh

### D365 Query Issues

#### Empty Results When Data Should Exist
**Common Causes:**
1. Missing organization context (returns empty by design)
2. Wrong organization type filter (Foster vs Volunteer)
3. Initiative mismatch
4. Data filtered by `statecode` (inactive records)

**Debugging Steps:**
```typescript
// Check the security context
this.logger.info('D365 Filter:', req.d365Filter);
this.logger.info('OData Query:', oDataFilter);

// Enable retry logging
private readonly retryOptions: RetryOptions = {
  logger: (msg, data) => this.logger.debug(`[Retry] ${msg}`, data)
};
```

#### "tc_eclead_tc_ecleadsvolunteerorg_eclead" Syntax Error
**Cause:** Malformed many-to-many relationship query
**Correct Syntax:**
```
tc_eclead_tc_ecleadsvolunteerorg_eclead/any(o:o/_tc_volunteerorganization_value eq 'guid')
```
Note the closing parenthesis placement.

#### Option Set Values Returning Numbers
**Cause:** Forgot to map D365 integers to strings
**Solution:** Use mapping helpers:

### Retry & Network Issues

#### "Operation failed after 4 attempts"
**Cause:** D365 service persistently unavailable
**Common Scenarios:**
- D365 maintenance window
- Rate limiting (429 errors)
- Network connectivity issues

**Solutions:**
1. Check D365 service health
2. Implement circuit breaker pattern for persistent failures
3. Monitor retry metrics in logs

#### Slow Response Times
**Cause:** Retry logic adding latency
**Debugging:**
```typescript
// Look for retry attempts in logs
[LeadService] [Retry] Executing attempt 2/4
[LeadService] [Retry] Retryable error occurred, waiting before retry
```

**Solutions:**
1. Reduce retry attempts for user-facing operations
2. Implement request caching where appropriate
3. Use background jobs for non-critical operations
```typescript
import { mapLeadStatus, mapLeadType } from '../constants/d365-mappings';
status: mapLeadStatus(d365Lead.tc_ecleadlifecyclestatus)
```

### Performance Issues

#### Slow Query Response
**Common Causes:**
1. Too many `$expand` operations
2. Missing field selection (`$select`)
3. Large result sets without pagination

**Solutions:**
- Limit expanded fields: `$expand=tc_contact($select=fullname)`
- Use specific field selection
- Implement pagination: `$top=50`

#### Token Refresh Loops
**Cause:** Token expiry not handled properly
**Solution:** Cache tokens with proper expiry checking:
```typescript
if (tokenExpiresAt < Date.now() + 60000) { // 1 min buffer
  await refreshToken();
}
```

### Development Environment

#### "D365_URL is not defined"
**Solution:** Copy `.env.example` to `.env` and fill in values:
```bash
cp .env.example .env
```

#### CORS Errors in Development
**Solution:** Ensure frontend proxy is configured:
```typescript
// vite.config.ts
proxy: {
  '/api': 'http://localhost:3000'
}
```

#### TypeScript Errors After Shared Package Update
**Solution:** Rebuild shared package:
```bash
cd packages/shared && npm run build
cd ../backend && npm run dev
```

### Security & Permissions

#### Cross-Initiative Access Logged
**Cause:** User trying to access data from different initiative
**Expected Behavior:** Returns null/404, logs security event
**Action:** Review user's initiative assignment

#### Organization Type Not Filtering
**Symptoms:** User sees all leads regardless of org type
**Check:**
1. JWT includes `organizationLeadType`
2. D365 Account has `tc_organizationleadtype` field populated
3. Filter logic handles comma-separated values

### Debugging Tools

#### Check JWT Contents
```typescript
// In any authenticated endpoint
console.log('JWT Claims:', req.user);
console.log('D365 Filter:', req.d365Filter);
```

#### Test D365 Queries Directly
Use Postman with D365 token:
```
GET {D365_URL}/api/data/v9.2/tc_everychildleads?$filter=statecode eq 0
Authorization: Bearer {token}
```

#### Enable Debug Logging
```typescript
// Set in .env
LOG_LEVEL=debug
```

### Error Messages

#### "Unable to authenticate with D365"
**Causes:**
1. Invalid client credentials
2. D365 service unavailable
3. Network connectivity issues

**Debug:** Check D365 service status and credentials

#### "Failed to fetch leads from D365"
**Common HTTP Status Codes:**
- 400: Bad OData query syntax
- 401: Authentication failed
- 403: Insufficient D365 permissions
- 404: Entity or field doesn't exist
- 500: D365 internal error

### Best Practices for Debugging

1. **Use Structured Logging**
   ```typescript
   console.log('[ServiceName] Operation:', { 
     context, 
     filters, 
     result 
   });
   ```

2. **Check Security Context First**
   - Verify JWT claims
   - Check D365 filter injection
   - Validate organization context

3. **Test Queries Incrementally**
   - Start with simple queries
   - Add filters one by one
   - Test expansions separately

4. **Monitor Performance**
   - Log query execution time
   - Check payload sizes
   - Monitor token refresh frequency

5. **Handle Nulls Gracefully**
   ```typescript
   const name = lead.tc_contact?.fullname || 'Unknown';
   ```