# Lead Service Refactoring Guide

## Overview

The lead service has been refactored to follow a more modular architecture with better separation of concerns. The monolithic `lead.service.ts` has been split into specialized services.

## Architecture Changes

### Before (Monolithic)
```
lead.service.ts
├── Query building logic
├── Field mapping logic
├── D365 API calls
├── Business logic
└── Error handling
```

### After (Modular)
```
lead.service.refactored.ts (Orchestration)
├── d365-query-builder.service.ts (Query Construction)
├── d365-lead-mapper.service.ts (Data Transformation)
├── d365-client.service.ts (API Communication)
└── constants/ (Centralized Configuration)
```

## Key Improvements

### 1. Centralized Constants
- **Location**: `/packages/backend/src/constants/`
- **Benefits**: 
  - Single source of truth for field mappings
  - Easy to update D365 field names
  - Type-safe configurations

### 2. Specialized Services

#### D365QueryBuilder
- Handles all OData query construction
- Enforces security filters consistently
- Provides query validation

#### D365LeadMapper
- Bidirectional mapping between D365 and app models
- Configurable transformations
- Handles nested objects (addresses)

#### D365Client
- Generic D365 Web API client
- Built-in retry logic
- Consistent error handling
- Reusable for other entities

### 3. Enhanced Type Safety
- Strict TypeScript types throughout
- Runtime validation options
- Type guards for data validation

## Migration Steps

### Step 1: Review New Structure
1. Check new constants in `/constants/d365/`
2. Review service interfaces in `/services/d365/`
3. Compare old vs new lead service implementation

### Step 2: Update Imports
```typescript
// Old
import { leadService } from './services/lead.service';

// New (during transition)
import { leadService } from './services/lead.service.refactored';
```

### Step 3: Test Thoroughly
1. Run existing tests against new service
2. Verify query generation matches old behavior
3. Check field mappings are correct
4. Test error scenarios

### Step 4: Gradual Rollout
1. Use feature flag to switch between implementations
2. Monitor logs for any discrepancies
3. Roll back if issues detected

### Step 5: Cleanup
1. Remove old `lead.service.ts`
2. Rename `lead.service.refactored.ts` to `lead.service.ts`
3. Update all imports

## Configuration

### Environment Variables
No new environment variables required. The refactored services use the same configuration.

### Field Mapping Customization
To add or modify field mappings:
1. Edit `/constants/d365/field-mappings.ts`
2. Add mapping to `LEAD_FIELD_MAPPINGS` array
3. Update `LEAD_SELECT_FIELDS` if needed

### Query Customization
To modify query behavior:
1. Edit `/constants/d365/query.ts`
2. Add new filter templates or operators
3. Update query builder if needed

## Testing

### Unit Tests
Create tests for each new service:
```bash
packages/backend/src/services/d365/__tests__/
├── d365-client.service.test.ts
├── d365-query-builder.service.test.ts
└── d365-lead-mapper.service.test.ts
```

### Integration Tests
Test the refactored lead service:
```bash
packages/backend/src/services/__tests__/
└── lead.service.refactored.test.ts
```

## Benefits Summary

1. **Maintainability**: Clear separation of concerns
2. **Reusability**: Generic D365 client for other entities
3. **Testability**: Each component can be tested in isolation
4. **Flexibility**: Easy to extend or modify behavior
5. **Type Safety**: Better TypeScript support
6. **Performance**: Optimized query generation
7. **Security**: Centralized security filter enforcement

## Next Steps

1. Add comprehensive tests for new services
2. Create similar services for other D365 entities
3. Implement caching layer for frequently accessed data
4. Add metrics and monitoring
5. Document API changes for frontend team