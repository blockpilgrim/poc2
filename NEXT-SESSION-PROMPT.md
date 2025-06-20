# Prompt for Next Claude Session - Phase 3 Implementation

Copy and paste this prompt to start the next session:

---

Please begin by carefully reading @project-charter.md, paying special attention to:
1. The "Current Focus Area" section - you'll be implementing Phase 3
2. The "Implementation Notes for Future Sessions" which contains critical context from Phase 2
3. The "Success Metrics" to understand quality expectations

Next, read these implementation summaries to understand what was recently completed:
- @PHASE2-IMPLEMENTATION-SUMMARY.md - Overview of Phase 2 changes
- @PHASE2.1-IMPLEMENTATION-SUMMARY.md - Additional improvements made

Then analyze the current implementation:
1. Read `/backend/src/services/lead.service.ts` focusing on:
   - The `buildSecureODataFilter` method (lines ~244-324) that needs refactoring
   - The helper methods available from Phase 2 (validateOrganizationContext, executeD365Query, etc.)
   - Current patterns for error handling and logging
2. Quickly review `/backend/src/services/__tests__/lead.service.test.ts` to understand expected behavior

Your goal is to implement Phase 3: Improve Maintainability, specifically:
- Break down `buildSecureODataFilter` into 4-5 focused methods as suggested in the charter
- Improve type safety (replace `Record<string, any>`, add return types)
- Maintain 100% backward compatibility - no API changes
- Keep all tests passing

Before starting implementation, briefly summarize:
1. What helper methods are available from Phase 2
2. Your plan for breaking down buildSecureODataFilter
3. Any risks or concerns you see

Then proceed with implementation. Remember: this is a POC, so don't over-engineer. Focus on clarity and maintainability while preserving all existing functionality.

---

## Additional Context for Copy/Paste if Needed:

### Available Helper Methods from Phase 2:
```typescript
validateOrganizationContext() // Validates org context with security logging
buildD365Headers()           // Standard D365 headers
executeD365Query()          // Fetch with retry (handles 404 specially)
getD365InitiativeGuid()     // Maps initiative ID to D365 GUID
buildUserOrganization()     // Creates org context object
logOrganizationValidationFailure() // Logs org validation errors
```

### Key Constraints:
- Don't break retry logic when refactoring
- Keep helper methods focused (single responsibility)
- Maintain backward compatibility
- All tests must continue passing
- Don't change the D365 data model or query behavior