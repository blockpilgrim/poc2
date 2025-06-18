# Lead Access and Filtering Guide

This guide explains how leads are accessed and filtered in the Partner Portal based on user roles and lead types.

## Overview

The Partner Portal manages two types of leads:
- **Foster Leads** (called "Ready Now Leads" in the UI) - for families interested in fostering children
- **Volunteer Leads** - for individuals interested in volunteering

Users access leads through role-specific pages that show only the leads relevant to their work.

## Role-Based Access

### User Roles

Users are assigned roles in Microsoft Entra ID (Azure AD):
- `Admin` - Can see all leads
- `Foster-Partner` - Can see foster leads for their organization
- `Foster-Network-Wide-Partner` - Can see foster leads across all organizations
- `Volunteer-Partner` - Can see volunteer leads for their organization
- `Volunteer-Network-Wide-Partner` - Can see volunteer leads across all organizations

### Navigation

Based on their roles, users see different navigation options:
- **Admin users**: See "All Leads" link
- **Foster role users**: See "Ready Now Leads" link
- **Volunteer role users**: See "Volunteer Leads" link
- **Users with both roles**: See both "Ready Now Leads" and "Volunteer Leads" links
- **Users with no lead roles**: See no lead navigation

### Pages

- `/leads` - All Leads page (Admin only)
- `/leads/ready-now` - Foster leads page
- `/leads/volunteer` - Volunteer leads page

## Lead Type Filtering

### Understanding Engagement Interest

In Dynamics 365, leads have a field called `tc_engagementinterest` that indicates what type of lead it is:
- `948010000` = Foster interest
- `948010001` = Volunteer interest
- `948010000,948010001` = Both foster and volunteer interest

### Inclusive Filtering

The system uses **inclusive filtering**, meaning:
- A lead with foster interest appears on the "Ready Now Leads" page
- A lead with volunteer interest appears on the "Volunteer Leads" page
- A lead with BOTH interests appears on BOTH pages

This ensures no leads are missed and each team sees all relevant leads.

## Implementation Details

### Key Files

**Frontend:**
- `/src/constants/roles.ts` - Role constants and helper functions
- `/src/constants/leads.ts` - Engagement interest values
- `/src/pages/leads/ready-now.tsx` - Foster leads page
- `/src/pages/leads/volunteer.tsx` - Volunteer leads page
- `/src/components/data/LeadTable/LeadTable.tsx` - Filtering logic

**Backend:**
- `/src/constants/d365-mappings.ts` - Maps D365 values to lead types
- `/src/services/lead.service.ts` - Fetches and transforms lead data

### Data Flow

1. Backend fetches leads from D365 with `tc_engagementinterest` field
2. Backend includes both:
   - `type` - Single categorization (foster/volunteer/other)
   - `engagementInterest` - Raw D365 value for inclusive filtering
3. Frontend filters leads based on `engagementInterest` containing the target value
4. Users see all leads relevant to their role

### Example Code

Checking user roles:
```typescript
import { hasFosterRole, hasVolunteerRole } from '@/constants/roles';

const { roles } = useAuthStore();
if (hasFosterRole(roles)) {
  // Show foster-related UI
}
```

Filtering leads:
```typescript
<LeadTable engagementInterestFilter={ENGAGEMENT_INTEREST.FOSTER} />
```

## Important Notes

- **Performance**: Currently uses client-side filtering (fetches all leads, then filters). This will need server-side filtering for large datasets.
- **Role Names**: Always use hyphenated format (e.g., "Foster-Partner", not "Foster Partner")
- **No Lead Creation**: The system is read-only. Lead creation happens in D365, not the portal.

## Common Questions

**Q: What if a lead needs both foster and volunteer support?**  
A: It will appear on both the "Ready Now Leads" and "Volunteer Leads" pages.

**Q: Why do we have both `type` and `engagementInterest` fields?**  
A: `type` provides a single category for sorting/display, while `engagementInterest` preserves all values for inclusive filtering.

**Q: Can users see leads outside their organization?**  
A: Only users with "Network-Wide" roles can see leads across all organizations. Regular "Partner" roles see only their organization's leads.