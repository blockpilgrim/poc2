# Frontend Lead Refactoring Guide

## Overview

This document explains the frontend changes made during the Lead Data Source Realignment (Step 3), where we transitioned from using D365 Contact entities to tc_everychildlead entities. This is essential reading for understanding the current state of the Lead Management UI.

## Background

The initial implementation incorrectly assumed D365 Contact records represented leads. The actual business process uses the `tc_everychildlead` entity, requiring significant changes to the data model.

## Key Changes

### Lead Interface Updates

The Lead interface now reflects the tc_everychildlead structure:

**Removed Properties:**
- `firstName`, `lastName` → replaced by `subjectName`
- `email` → replaced by `subjectEmail`
- `phoneNumber`, `address` → not available in new model
- `priority`, `tags`, `notes` → not part of tc_everychildlead
- `assignedToName` → replaced by `leadOwnerName`

**New Properties:**
- `name` - Lead title
- `subjectName` - Full name of the lead subject
- `subjectEmail` - Email of the lead subject
- `leadOwnerName` - Internal owner of the lead
- `leadScore` - Lead scoring metric

### Status and Type Values

Updated to match D365 option sets:

**Status:** `assigned`, `in-progress`, `certified`, `on-hold`, `closed`, `other`

**Type:** `foster`, `volunteer`, `other`

## Current Limitations

### Backend Constraints

The backend currently only supports:
- ✅ Search filtering
- ✅ Pagination
- ✅ Sorting
- ✅ Read operations (GET)

Not yet implemented:
- ❌ Status/Type filtering
- ❌ Create leads (POST)
- ❌ Update leads (PATCH)
- ❌ Delete leads (DELETE)
- ❌ Bulk operations

### UI Adaptations

To handle these limitations gracefully:

1. **Disabled UI Elements** - Non-functional features are visually disabled with explanatory tooltips
2. **Filter Store** - Maintains filter state for future use but doesn't affect data queries
3. **Modal Components** - Not implemented; related hooks are commented out

## Architecture Patterns

### Handling Missing Features

```typescript
// Pattern 1: Disabled buttons with tooltips
<Button disabled className="opacity-50" title="Feature coming soon">
  Action
</Button>

// Pattern 2: Preserved but non-functional filters
// The UI maintains filter state for consistency, but backend ignores them
```

### State Management

The filter store tracks all filters for UI consistency, even though only search is functional. This allows:
- Consistent user experience
- Easy activation when backend support is added
- No breaking changes to component interfaces

## Development Guidelines

### When Backend Support Is Added

1. **Status/Type Filtering**
   - Remove `disabled` prop from filter dropdowns
   - Update `useLeads` hook to pass filters to API
   - No component structure changes needed

2. **CRUD Operations**
   - Uncomment modal-dependent hooks
   - Implement modal component
   - Enable action buttons

### Adding New Features

When adding features that depend on unavailable backend functionality:

1. Build the UI component completely
2. Add visual indicators that it's not functional (disabled state, opacity)
3. Add descriptive tooltips explaining the limitation
4. Document the limitation in code comments

### Testing Considerations

- Test with search functionality (the only working filter)
- Verify disabled states render correctly
- Ensure no console errors from missing functionality
- Check that the UI gracefully handles missing data fields

## Key Files

- `/src/stores/filterStore.ts` - Manages all filter state (functional and future)
- `/src/components/data/LeadTable/` - Table implementation with disabled filters
- `/src/hooks/queries/leads/` - Data fetching hooks
- `/src/pages/leads/` - Lead list and detail pages

## Future Roadmap

1. **Phase 1** (Current) - Read-only with search
2. **Phase 2** - Enable status/type filtering
3. **Phase 3** - Add create/update functionality
4. **Phase 4** - Implement bulk operations

## Quick Reference

```typescript
// Current functional query parameters
{
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Initiative and organization filtering happens automatically via JWT
```

Remember: The frontend is built for the complete feature set, but gracefully degrades based on backend capabilities. This approach ensures minimal refactoring as features are enabled.