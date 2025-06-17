# Initiative GUID Configuration Guide

## Overview

The Partner Portal uses a configuration-driven approach to map application initiative IDs (e.g., `ec-oregon`) to their corresponding D365 Initiative entity GUIDs. This design supports our scalability principle of supporting 50+ states without code changes.

## Background

### The Problem
- Application uses friendly initiative IDs: `ec-oregon`, `ec-kentucky`, etc.
- D365 `tc_everychildlead` entity uses lookup field `_tc_initiative_value` which stores GUIDs
- Direct use of string IDs in D365 queries would fail

### The Solution
A configuration-driven mapping layer that:
- Maintains backward compatibility with existing code
- Allows adding new states without code deployment
- Provides clear separation between configuration and code
- Enables environment-specific configurations

## Configuration Structure

The initiative configuration is defined in `packages/backend/src/config/initiatives.config.ts`:

```typescript
{
  initiatives: {
    'ec-oregon': {
      d365Guid: 'b6ced3de-2993-ed11-aad1-6045bd006a3a',
      displayName: 'Oregon',
      enabled: true
    },
    'ec-kentucky': {
      d365Guid: 'YOUR-KENTUCKY-GUID-HERE',
      displayName: 'Kentucky',
      enabled: true
    }
    // ... more states
  }
}
```

## Loading Configuration

### Development Mode
Uses the default configuration embedded in the code with placeholder GUIDs.

### Production Mode
Loads from environment variable `INITIATIVES_CONFIG_JSON`:

```bash
export INITIATIVES_CONFIG_JSON='{
  "initiatives": {
    "ec-oregon": {
      "d365Guid": "b6ced3de-2993-ed11-aad1-6045bd006a3a",
      "displayName": "Oregon",
      "enabled": true
    }
  }
}'
```

## How It Works

### 1. User Authentication
- User logs in with Entra ID groups
- Groups are mapped to initiative ID (e.g., `ec-oregon`)
- Initiative ID stored in JWT token

### 2. D365 Query Building
- Lead service receives request with initiative ID
- `initiativeMappingService.getD365InitiativeGuid()` converts ID to GUID
- Query uses GUID: `_tc_initiative_value eq 'b6ced3de-2993-ed11-aad1-6045bd006a3a'`

### 3. Response Mapping
- D365 returns leads with GUID values
- Service converts GUID back to initiative ID for consistency
- Frontend receives familiar initiative IDs

## Adding New States

### Step 1: Get D365 Initiative GUID
Query D365 to find the Initiative entity GUID:
```
GET /api/data/v9.2/tc_initiatives?$filter=tc_name eq 'EC New State'
```

### Step 2: Update Configuration

#### For Development:
Update `defaultConfig` in `initiatives.config.ts`:
```typescript
'ec-newstate': {
  d365Guid: 'actual-guid-from-d365',
  displayName: 'New State',
  enabled: true
}
```

#### For Production:
Update the `INITIATIVES_CONFIG_JSON` environment variable.

### Step 3: No Code Deployment Required!
In production, the configuration can be updated without deploying new code.

## Configuration Validation

The system validates configuration on startup:

1. **Format Validation**: Ensures GUIDs are valid UUID format
2. **Placeholder Detection**: Warns about placeholder GUIDs
3. **Production Safety**: Fails startup if enabled initiatives have invalid GUIDs

```
[InitiativesConfig] Initiative 'ec-kentucky' has placeholder GUID
[InitiativesConfig] Enabled initiative 'ec-kentucky' must have valid D365 GUID
```

## Future Enhancements

### Phase 1 (Current)
- JSON configuration in environment variables
- Manual GUID management

### Phase 2
- External configuration service
- Hot-reload capability
- Configuration versioning

### Phase 3
- D365 query for automatic GUID discovery
- Self-healing configuration
- Configuration audit trail

## Security Considerations

1. **GUIDs are not secrets**: Initiative GUIDs are identifiers, not credentials
2. **Validation**: Always validate GUIDs exist in D365
3. **Fail-secure**: Invalid configuration returns empty results, not errors
4. **Audit trail**: Log all configuration changes

## Troubleshooting

### Common Issues

#### "No D365 GUID mapping found"
- Check initiative ID spelling
- Verify configuration loaded correctly
- Ensure initiative is enabled

#### Empty query results
- Verify GUID matches D365 Initiative entity
- Check user has access to initiative
- Validate organization filters

#### Configuration not loading
- Check environment variable syntax
- Verify JSON is valid
- Check startup logs for errors

### Debug Commands

Check loaded configuration:
```javascript
console.log(initiativesConfig.initiatives);
```

Test GUID mapping:
```javascript
const guid = initiativeMappingService.getD365InitiativeGuid('ec-oregon');
console.log(guid); // Should output: b6ced3de-2993-ed11-aad1-6045bd006a3a
```

## Related Documentation

- [D365 Integration Guide](./d365-integration-guide.md)
- [Backend Architecture](./backend-architecture.md)
- [Project Charter](../project-charter.md) - See scalability requirements