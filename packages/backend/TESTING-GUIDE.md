# Phase 5: Testing & Validation - Manual Testing Guide

This document provides manual testing scenarios to validate the Entra ID Groups & Roles Integration implementation.

## Prerequisites

Before running manual tests, ensure you have:

1. **Azure AD App Registration** configured with:
   - Group claims enabled (`"groupMembershipClaims": "SecurityGroup"`)
   - Microsoft Graph API permission: `GroupMember.Read.All`
   - App Roles defined: `Admin`, `Foster Partner`, `Volunteer Partner`, `Volunteer Network-Wide Partner`, `Foster Network-Wide Partner`

2. **Test Users** assigned to:
   - Security groups (e.g., "EC Arkansas", "EC Oregon", "EC Tennessee")
   - App roles (Admin, FosterPartner, VolunteerPartner, etc.)

3. **Environment Configuration**:
   ```env
   ENTRA_GROUPS_ENABLED=true
   D365_ORG_DATA_ENABLED=true
   AZURE_GROUP_CLAIM_TYPE=securityGroup
   ```

## Test Scenarios

### Scenario 1: User with Single Initiative Group

**Setup**: User assigned to "EC Arkansas" group with "Foster Partner" role

**Expected Behavior**:
- ✅ User can authenticate successfully
- ✅ JWT token contains groups: ["EC Arkansas"]
- ✅ JWT token contains roles: ["FosterPartner"]
- ✅ User's initiative derived as "ec-arkansas"
- ✅ User can access foster-specific resources
- ❌ User cannot access admin-only resources

**Test Steps**:
1. Login with test user
2. Check `/api/auth/me` response
3. Verify initiative assignment
4. Test access to protected endpoints

### Scenario 2: User with Multiple Initiative Groups

**Setup**: User assigned to both "EC Arkansas" and "EC Tennessee" groups

**Expected Behavior**:
- ✅ User can authenticate successfully
- ✅ Primary initiative selected using alphabetical priority (ec-arkansas)
- ✅ User has access to their primary initiative resources
- ⚠️ Security logs capture multiple group memberships

**Test Steps**:
1. Login with multi-group user
2. Verify primary initiative selection logic
3. Check security audit logs
4. Confirm consistent initiative assignment across sessions

### Scenario 3: User with No "EC" Groups

**Setup**: User assigned to unrelated groups (e.g., "Marketing", "IT Support")

**Expected Behavior**:
- ❌ Authentication fails during callback
- ❌ Redirect to error page with message: "User is not assigned to any initiative group"
- ⚠️ Security event logged

**Test Steps**:
1. Attempt login with non-initiative user
2. Verify error handling
3. Check error page display
4. Confirm security logging

### Scenario 4: Admin Role Permissions

**Setup**: User with "Admin" app role assigned to "EC Oregon"

**Expected Behavior**:
- ✅ User can authenticate successfully
- ✅ Admin role grants access to all resource types
- ✅ Role hierarchy allows access to Foster and Volunteer resources
- ✅ Initiative still scoped to Oregon

**Test Steps**:
1. Login with admin user
2. Test access to admin-only endpoints
3. Test access to foster-specific endpoints
4. Test access to volunteer-specific endpoints
5. Verify initiative scoping is maintained

### Scenario 5: D365 Service Offline

**Setup**: Configure D365_ORG_DATA_ENABLED=true but simulate D365 unavailability

**Expected Behavior**:
- ✅ Authentication continues successfully
- ⚠️ Organization data is undefined/null
- ⚠️ Warning logged: "Failed to fetch organization data from D365"
- ✅ JWT token generated without organization data

**Test Steps**:
1. Temporarily break D365 connectivity
2. Attempt user login
3. Verify authentication succeeds
4. Check warning logs
5. Confirm JWT contains identity/role data but no organization data

### Scenario 6: D365 Service Disabled

**Setup**: Configure D365_ORG_DATA_ENABLED=false

**Expected Behavior**:
- ✅ Authentication completes without attempting D365 calls
- ✅ No D365-related errors or warnings
- ✅ JWT token contains Entra ID data only

**Test Steps**:
1. Set D365_ORG_DATA_ENABLED=false
2. Login with test user
3. Verify no D365 service calls made
4. Check logs for absence of D365-related entries

## Validation Checklist

Use this checklist to ensure all critical aspects are working:

### ✅ Authentication Flow
- [ ] Azure AD OAuth flow initiates correctly
- [ ] PKCE codes generated and validated
- [ ] ID token contains groups and roles claims
- [ ] JWT token includes derived initiative
- [ ] Refresh token functionality works
- [ ] Logout clears sessions properly

### ✅ Initiative Boundary Enforcement
- [ ] Users can only access their assigned initiative data
- [ ] Cross-initiative access attempts are blocked
- [ ] Multi-group users get consistent primary initiative
- [ ] Initiative validation works for all endpoints

### ✅ Role-Based Access Control
- [ ] Admin users can access all resources
- [ ] Foster partners limited to foster resources
- [ ] Volunteer partners limited to volunteer resources
- [ ] Network-wide roles access organization-wide data
- [ ] Role hierarchy enforced correctly

### ✅ Security Logging
- [ ] Successful authentications logged
- [ ] Failed authentications logged
- [ ] Cross-initiative attempts logged
- [ ] Role-based access denials logged
- [ ] Security events include proper context

### ✅ Error Handling
- [ ] Invalid tokens return 401 Unauthorized
- [ ] Missing tokens return 401 Unauthorized
- [ ] Insufficient roles return 403 Forbidden
- [ ] No initiative groups return 403 Forbidden
- [ ] D365 failures don't break authentication

### ✅ Feature Flag Compatibility
- [ ] ENTRA_GROUPS_ENABLED=true uses new approach
- [ ] ENTRA_GROUPS_ENABLED=false falls back to legacy
- [ ] D365_ORG_DATA_ENABLED toggles organization data
- [ ] Graceful degradation when services unavailable

## Performance Validation

### Response Time Targets
- Authentication callback: < 2 seconds
- Protected endpoint access: < 500ms
- JWT token verification: < 100ms

### Memory Usage
- Monitor memory usage during authentication flows
- Check for memory leaks during extended sessions
- Validate token cache efficiency

## Security Validation

### Token Security
- [ ] JWTs contain required claims (sub, email, groups, roles, initiative)
- [ ] Token expiration properly enforced
- [ ] Refresh tokens securely managed
- [ ] No sensitive data in client-side storage

### Initiative Isolation
- [ ] Database queries filtered by initiative
- [ ] API responses scoped to user's initiative
- [ ] File access restricted by initiative
- [ ] Cache isolation between initiatives

### Audit Trail
- [ ] All security events captured
- [ ] Logs contain sufficient context for investigation
- [ ] No PII in logs
- [ ] Log retention policies followed

## Troubleshooting Common Issues

### Authentication Failures
1. **"No groups claim in token"**
   - Check Azure AD app manifest: `groupMembershipClaims`
   - Verify user group assignments
   - Confirm Graph API permissions

2. **"User not assigned to initiative"**
   - Verify user has "EC [State]" group membership
   - Check group name spelling
   - Confirm group claim type configuration

3. **"Invalid token errors"**
   - Check JWT secret configuration
   - Verify token not expired
   - Confirm MSAL configuration

### Role Access Issues
1. **Admin can't access resources**
   - Check role hierarchy configuration
   - Verify app role assignments
   - Confirm role claim in JWT

2. **Role hierarchy not working**
   - Review `roleHierarchy` object
   - Check `hasRequiredRole` function
   - Verify middleware order

### D365 Integration Issues
1. **Organization data not loading**
   - Check D365 service configuration
   - Verify D365 access token acquisition
   - Review D365 API connectivity

2. **Authentication fails when D365 down**
   - Ensure D365_ORG_DATA_ENABLED flag respected
   - Check error handling in auth controller
   - Verify fallback behavior

## Next Steps After Validation

Once all manual tests pass:

1. **Document any configuration issues** found during testing
2. **Update Azure AD setup documentation** with actual requirements
3. **Create user onboarding guide** for administrators
4. **Prepare production deployment checklist**
5. **Schedule security review** with appropriate teams