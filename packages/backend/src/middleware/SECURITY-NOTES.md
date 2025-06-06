# Security Middleware - Critical Production Considerations

## Overview
This document outlines critical security considerations for the authentication and authorization middleware implemented for the Partner Portal v2.0. These items MUST be addressed before production deployment.

## Critical Security Issues

### 1. JWT Token Security (HIGH PRIORITY)
**Current State**: Using HS256 symmetric algorithm with shared secret
**Risk**: If secret is compromised, attackers can forge tokens
**Required Action**:
```typescript
// Migrate from HS256 to RS256
// 1. Generate RSA key pair
// 2. Store private key securely (Azure Key Vault)
// 3. Update JWT service to use RS256
// 4. Distribute public key for token verification
```

### 2. Session Storage (HIGH PRIORITY)
**Current State**: In-memory session storage in auth service
**Risk**: Memory exhaustion, session loss on restart, no horizontal scaling
**Required Action**:
- Implement Redis-based session storage
- Add TTL to prevent memory leaks
- Configure session cleanup mechanism

### 3. Rate Limiting (HIGH PRIORITY)
**Current State**: No rate limiting on authentication endpoints
**Risk**: Brute force attacks, DoS vulnerability
**Required Action**:
```typescript
// Add rate limiting middleware
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  skipSuccessfulRequests: true
});

// Apply to auth routes
router.post('/login', authLimiter, authController.login);
```

### 4. Security Event Logging (MEDIUM PRIORITY)
**Current State**: Console logging only
**Risk**: No persistent audit trail, no alerting
**Required Action**:
- Integrate Azure Application Insights
- Create separate security audit log stream
- Set up alerts for CROSS_INITIATIVE_ATTEMPT events
- Implement log retention policy

### 5. Group GUID Resolution (MEDIUM PRIORITY)
**Current State**: `getGroupNamesFromIds()` not implemented
**Risk**: Authentication fails when Azure AD returns GUIDs instead of names
**Required Action**:
- Implement Microsoft Graph API integration
- Cache group name mappings
- Add fallback for GUID-based groups

## Security Best Practices Implemented

### ✅ Initiative Boundary Enforcement
- All tokens include initiative claims
- Middleware validates initiative on every request
- Cross-initiative access attempts are logged

### ✅ Role-Based Access Control
- Entra ID app roles with hierarchy
- Admin role inherits all permissions
- Network-wide roles properly scoped

### ✅ Backward Compatibility
- Feature flags for gradual migration
- Support for both Entra ID and legacy auth
- No breaking changes during transition

## Testing Recommendations

### Security Test Scenarios
1. **Token Forgery**: Attempt to create tokens with modified claims
2. **Cross-Initiative Access**: Try accessing data from different initiatives
3. **Role Escalation**: Attempt to access admin endpoints with lower roles
4. **Token Expiration**: Verify expired tokens are rejected
5. **Multiple Groups**: Test users with multiple initiative assignments

### Load Testing
- Test session storage under high concurrency
- Verify rate limiting effectiveness
- Monitor memory usage patterns

## Deployment Checklist

- [ ] Generate and secure RSA key pair for JWT signing
- [ ] Configure Redis for session storage
- [ ] Implement rate limiting on all auth endpoints
- [ ] Set up security event logging infrastructure
- [ ] Enable Azure AD group claims in app registration
- [ ] Configure CORS for production domains only
- [ ] Enable security headers (helmet.js)
- [ ] Review and update all TODO comments in code
- [ ] Perform security audit with penetration testing
- [ ] Document incident response procedures

## Monitoring Requirements

### Key Metrics
- Failed authentication attempts by IP
- Cross-initiative access attempts
- Token validation failures
- Average authentication latency
- Session storage utilization

### Alerts
- Multiple failed auth attempts from same IP
- Any CROSS_INITIATIVE_ATTEMPT events
- Unusual spike in auth requests
- Session storage approaching capacity

## Architecture Decisions

### Why Entra ID Groups over D365?
- Reduces dependency on D365 for authentication
- Aligns with Microsoft's security best practices
- Enables centralized identity management
- Simplifies role assignment process

### Initiative Assignment Strategy
- Primary initiative from alphabetically first group
- Consistent behavior for multi-initiative users
- Audit logging for transparency
- Future: User preference selection

## Contact
For security concerns or questions about this implementation, contact the security team.