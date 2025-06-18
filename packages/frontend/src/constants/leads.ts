/**
 * Lead Management Constants
 * 
 * Centralized constants for lead management features to avoid hardcoded values
 * and ensure consistency with backend D365 mappings.
 */

/**
 * Engagement Interest Values
 * Maps to D365 tc_engagementinterest option set values
 * Used for filtering leads by type through the engagement interest field
 */
export const ENGAGEMENT_INTEREST = {
  FOSTER: '948010000',
  VOLUNTEER: '948010001',
} as const;

/**
 * Lead Status Values
 * Maps to the application's status strings (not D365 integers)
 */
export const LEAD_STATUS = {
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in-progress',
  CERTIFIED: 'certified',
  ON_HOLD: 'on-hold',
  CLOSED: 'closed',
  OTHER: 'other',
} as const;

/**
 * Lead Type Values
 * Maps to the application's type strings
 */
export const LEAD_TYPE = {
  FOSTER: 'foster',
  VOLUNTEER: 'volunteer',
  OTHER: 'other',
} as const;

/**
 * Default filter values
 */
export const DEFAULT_FILTERS = {
  SEARCH: '',
  STATUS: null,
  TYPE: null,
  PAGE: 1,
  PAGE_SIZE: 25,
  SORT_FIELD: 'updatedAt',
  SORT_ORDER: 'desc' as const,
} as const;

/**
 * Pagination options
 */
export const PAGINATION_OPTIONS = {
  PAGE_SIZES: [10, 20, 25, 30, 40, 50],
  DEFAULT_PAGE_SIZE: 25,
} as const;

/**
 * UI Messages
 */
export const LEAD_UI_MESSAGES = {
  FILTERS: {
    STATUS_COMING_SOON: 'Status filtering coming soon',
    TYPE_COMING_SOON: 'Type filtering coming soon',
  },
  ACTIONS: {
    CREATE_COMING_SOON: 'Lead creation coming soon',
  },
  EMPTY_STATE: {
    NO_LEADS: 'No leads found',
    NO_LEADS_WITH_FILTERS: 'No leads match your current filters',
  },
} as const;

/**
 * Helper to check if a lead has a specific engagement interest
 * Handles multi-select values (comma-separated string)
 */
export function hasEngagementInterest(
  engagementInterest: string | null | undefined,
  targetInterest: string
): boolean {
  if (!engagementInterest) return false;
  return engagementInterest.includes(targetInterest);
}

/**
 * Type guards for lead values
 */
export function isValidLeadStatus(value: unknown): value is typeof LEAD_STATUS[keyof typeof LEAD_STATUS] {
  return Object.values(LEAD_STATUS).includes(value as any);
}

export function isValidLeadType(value: unknown): value is typeof LEAD_TYPE[keyof typeof LEAD_TYPE] {
  return Object.values(LEAD_TYPE).includes(value as any);
}