# Feature Status Reference

Quick reference for what's currently functional in the Partner Portal.

## Lead Management

### ✅ Functional

| Feature | Description | Notes |
|---------|-------------|-------|
| View lead list | Browse all leads | Filtered by user's organization |
| Search leads | Text search across lead fields | Only functional filter |
| Sort leads | Sort by any column | Default: updatedAt desc |
| Pagination | Navigate through pages | Default: 25 per page |
| View lead details | Click to see full info | Shows all tc_everychildlead fields |
| Role-based access | See leads based on role | Foster/Volunteer filtering |
| Initiative filtering | Automatic by user's state | Via JWT claims |

### 🚧 UI Present but Non-Functional

| Feature | Current State | Reason |
|---------|---------------|---------|
| Status filter | Disabled dropdown | Backend endpoint not implemented |
| Type filter | Disabled dropdown | Backend endpoint not implemented |
| Create lead | Disabled button | POST endpoint not implemented |
| Edit lead | Disabled button | PATCH endpoint not implemented |
| Bulk actions | Not shown | Bulk endpoints not implemented |

### ❌ Not Available

| Feature | Impact | Workaround |
|---------|--------|------------|
| Phone numbers | No contact phone | Use email only |
| Addresses | No location info | N/A |
| Lead assignment | Can't change owner | Contact admin |
| Lead notes | No comments | Use external system |
| Tags/Categories | No grouping | Use type field |

## API Endpoints

### ✅ Functional

```
GET  /api/v1/auth/login      - Login with Azure AD
GET  /api/v1/auth/callback   - OAuth callback
POST /api/v1/auth/logout     - Logout
GET  /api/v1/auth/me         - Current user + theme
GET  /api/v1/auth/profile    - User + D365 org data
GET  /api/v1/leads           - List leads (search only)
GET  /api/v1/leads/:id       - Get single lead
GET  /api/v1/leads/stats     - Lead statistics
```

### 🚧 Returns 501 Not Implemented

```
POST  /api/v1/leads          - Create lead
PATCH /api/v1/leads/:id      - Update lead
POST  /api/v1/leads/bulk     - Bulk update
```

### ❌ Not Built

```
DELETE /api/v1/leads/:id     - Delete lead
GET    /api/v1/organizations - List organizations
GET    /api/v1/users         - List users
```

## Query Parameters

### ✅ Functional

| Parameter | Example | Description |
|-----------|---------|-------------|
| search | `?search=john` | Text search |
| page | `?page=2` | Page number |
| pageSize | `?pageSize=50` | Results per page |
| sortBy | `?sortBy=name` | Sort field |
| sortOrder | `?sortOrder=asc` | Sort direction |

### 🚧 Accepted but Ignored

| Parameter | Example | Note |
|-----------|---------|------|
| status | `?status=assigned` | No backend support |
| type | `?type=foster` | No backend support |
| dateFrom | `?dateFrom=2024-01-01` | No backend support |
| dateTo | `?dateTo=2024-12-31` | No backend support |

## State Management

### ✅ Functional Stores

- **authStore** - User auth, profile, theme
- **uiStore** - Toasts, loading states
- **filterStore** - Search, pagination, sort

### 🚧 Partial Functionality

- **filterStore** - Status/type filters tracked but don't affect data
- **uiStore** - Modal state exists but no modal component

## Quick Decision Guide

**Q: Can I filter by lead status?**  
A: No, backend doesn't support it yet. UI is ready.

**Q: Can I create new leads?**  
A: No, POST endpoint not implemented.

**Q: Can I update lead information?**  
A: No, PATCH endpoint returns 501.

**Q: Can I search for leads?**  
A: Yes, text search is fully functional.

**Q: Why are some dropdowns disabled?**  
A: UI is built for future features, disabled until backend support.

**Q: What data is automatically filtered?**  
A: Initiative (state) and organization based on JWT claims.

## Development Tips

1. **Check this guide first** before implementing features
2. **Test with search** - it's the only working filter
3. **Don't remove disabled UI** - backend support coming
4. **Use title attributes** for disabled elements
5. **Check Backend API Reference** for endpoint details

Last Updated: After Step 3 Frontend Refactoring