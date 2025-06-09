# Azure AD Group Setup for Partner Portal v2.0

## Overview

The Partner Portal v2.0 uses Microsoft Entra ID security groups to manage initiative-based access control. This document outlines the required group naming convention and setup procedures.

## Group Naming Convention

### Production Groups
- **Format**: `Partner Portal - EC {State}`
- **Examples**:
  - `Partner Portal - EC Arkansas`
  - `Partner Portal - EC Oregon`
  - `Partner Portal - EC Tennessee`
  - `Partner Portal - EC Kentucky`
  - `Partner Portal - EC Oklahoma`

### Testing Groups
- **Format**: `Partner Portal - EC {State} - Testing`
- **Examples**:
  - `Partner Portal - EC Arkansas - Testing`
  - `Partner Portal - EC Oregon - Testing`
  - `Partner Portal - EC Tennessee - Testing`

### Legacy Groups (Backward Compatibility)
- **Format**: `EC {State}`
- **Examples**: `EC Arkansas`, `EC Oregon`, `EC Tennessee`
- **Note**: These are supported for backward compatibility but should be migrated to the new format

## Group Creation Steps

### 1. Access Azure Portal
1. Navigate to [Azure Portal](https://portal.azure.com)
2. Go to **Azure Active Directory** > **Groups**

### 2. Create Production Group
1. Click **New group**
2. **Group type**: Security
3. **Group name**: `Partner Portal - EC {State}` (replace {State} with actual state name)
4. **Group description**: `Partner Portal access for {State} initiative - Production`
5. **Membership type**: Assigned
6. Click **Create**

### 3. Create Testing Group (Optional)
1. Click **New group**
2. **Group type**: Security
3. **Group name**: `Partner Portal - EC {State} - Testing`
4. **Group description**: `Partner Portal access for {State} initiative - Testing Environment`
5. **Membership type**: Assigned
6. Click **Create**

## Group Assignment

### Adding Users to Groups
1. Navigate to the group in Azure AD
2. Go to **Members** > **Add members**
3. Search for and select users
4. Click **Select**

### User Assignment Rules
- **Production Users**: Assign to production groups only
- **Testing Users**: Can be assigned to testing groups for UAT
- **Developers/Admins**: May be assigned to both production and testing groups
- **Multiple States**: Users can be assigned to multiple state groups if they work across initiatives

## Group Priority and Selection

When users belong to multiple initiative groups, the system follows these priority rules:

1. **New Format over Legacy**: `Partner Portal - EC State` takes precedence over `EC State`
2. **Production over Testing**: Production groups take precedence over testing groups
3. **Alphabetical Order**: If multiple groups of the same priority exist, alphabetical order determines the primary initiative

## App Registration Configuration

### Required Permissions
The Azure AD app registration must have the following permissions to read group membership:

1. **Microsoft Graph API Permissions**:
   - `GroupMember.Read.All` (Application or Delegated)
   - `User.Read` (Delegated)
   - `Directory.Read.All` (Application) - Optional, for enhanced group management

### Token Configuration
1. Navigate to **App registrations** > Your app > **Token configuration**
2. Add **Groups claim**:
   - **Group types**: Security groups
   - **ID token**: ✓
   - **Access token**: ✓
   - **SAML token**: ✓

## Validation and Testing

### Verify Group Setup
1. **Check Group Names**: Ensure exact naming convention compliance
2. **Test User Assignment**: Add test users and verify access
3. **Validate Token Claims**: Check that JWT tokens include correct group claims

### Testing Scenarios
```typescript
// Example test cases for group validation
const testCases = [
  {
    groups: ['Partner Portal - EC Arkansas'],
    expectedInitiative: 'ec-arkansas',
    description: 'New format production group'
  },
  {
    groups: ['Partner Portal - EC Oregon - Testing'],
    expectedInitiative: 'ec-oregon',
    description: 'New format testing group'
  },
  {
    groups: ['EC Tennessee'],
    expectedInitiative: 'ec-tennessee',
    description: 'Legacy format group (backward compatibility)'
  },
  {
    groups: ['Partner Portal - EC Arkansas', 'EC Arkansas'],
    expectedInitiative: 'ec-arkansas',
    description: 'New format takes precedence over legacy'
  },
  {
    groups: ['Partner Portal - EC Arkansas', 'Partner Portal - EC Tennessee'],
    expectedInitiative: 'ec-arkansas',
    description: 'Alphabetical order (Arkansas before Tennessee)'
  }
];
```

## Migration Guide

### From Legacy to New Format

1. **Create New Groups**: Set up new format groups alongside existing ones
2. **Parallel Assignment**: Add users to both old and new groups temporarily
3. **Test Application**: Verify new groups work correctly
4. **Update Documentation**: Update any references to old group names
5. **Remove Legacy Groups**: After successful migration, remove old groups

### Migration Timeline
- **Week 1**: Create new groups and parallel assignments
- **Week 2**: Test and validate new group functionality
- **Week 3**: Update application documentation and user guides
- **Week 4**: Remove legacy group assignments (groups can remain for emergency rollback)

## Troubleshooting

### Common Issues

1. **"User is not assigned to any initiative group"**
   - **Cause**: User not in any valid initiative group
   - **Solution**: Check group membership and naming convention

2. **Wrong initiative selected for multi-group users**
   - **Cause**: Priority rules selecting unexpected group
   - **Solution**: Review group assignment strategy

3. **Groups not appearing in JWT tokens**
   - **Cause**: App registration missing group claims configuration
   - **Solution**: Configure token claims in app registration

### Debug Commands
```bash
# Check group membership via Microsoft Graph API
curl -H "Authorization: Bearer {token}" \
  "https://graph.microsoft.com/v1.0/me/memberOf"

# Validate JWT token claims
echo "{jwt_token}" | jq -R 'split(".")[1] | @base64d | fromjson | .groups'
```

## Security Considerations

1. **Principle of Least Privilege**: Only assign users to groups they actually need
2. **Regular Audits**: Periodically review group memberships
3. **Access Reviews**: Implement regular access reviews for group assignments
4. **Monitoring**: Log and monitor group-based access patterns
5. **Emergency Access**: Maintain emergency admin accounts with appropriate group access

## Contact Information

For questions or issues with group setup:
- **Technical Issues**: Development Team
- **Access Requests**: IT Security Team
- **Group Management**: Azure AD Administrators