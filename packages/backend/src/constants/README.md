# Backend Constants

This directory contains centralized constants and configurations for the backend services.

## Structure

```
constants/
├── d365/                    # D365-specific constants
│   ├── entities.ts         # Entity names and API configuration
│   ├── field-mappings.ts   # Field mapping configurations
│   └── query.ts           # Query building constants
└── lead/                   # Lead-specific constants
    ├── defaults.ts        # Default values for leads
    └── validations.ts     # Validation rules and patterns
```

## Usage

### Importing Constants

```typescript
// Import specific constants
import { D365_ENTITIES, LEAD_FIELD_MAPPINGS } from '../constants';

// Import from specific modules
import { QUERY_DEFAULTS } from '../constants/d365/query';
import { LEAD_DEFAULTS } from '../constants/lead/defaults';
```

### Adding New Constants

1. Create a new file in the appropriate subdirectory
2. Export your constants with clear, descriptive names
3. Add exports to the subdirectory's index.ts
4. Update the main index.ts if needed

### Naming Conventions

- Use UPPER_SNAKE_CASE for constant names
- Group related constants in objects
- Use `as const` for literal types
- Prefix with module name for clarity (e.g., `D365_`, `LEAD_`)

## Key Constants

### D365 Constants

- **D365_ENTITIES**: Entity names for D365 Web API
- **D365_API**: API version and configuration
- **D365_HEADERS**: Standard headers for D365 requests
- **LEAD_FIELD_MAPPINGS**: Bidirectional field mappings
- **ODATA_OPERATORS**: OData query operators
- **FILTER_TEMPLATES**: Reusable filter patterns

### Lead Constants

- **LEAD_DEFAULTS**: Default values for new leads
- **LEAD_STATUS_TRANSITIONS**: Valid status change rules
- **LEAD_VALIDATION_ERRORS**: Error message templates
- **LEAD_FIELD_LENGTHS**: Field size constraints

## Maintenance

When D365 fields change:
1. Update field names in `d365/field-mappings.ts`
2. Update any affected transformations
3. Run tests to ensure compatibility

When adding new features:
1. Add constants to appropriate files
2. Document any complex constants
3. Consider backward compatibility