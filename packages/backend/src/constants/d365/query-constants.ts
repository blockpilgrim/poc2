/**
 * D365 Query Constants
 * Centralizes query-related constants like pagination limits, state codes, and option sets
 */

/**
 * Query defaults and limits
 */
export const D365_QUERY_DEFAULTS = {
  /** Default page size for queries */
  PAGE_SIZE: 25,
  /** Maximum allowed page size */
  MAX_PAGE_SIZE: 100,
  /** Default sort field */
  SORT_FIELD: 'modifiedon',
  /** Default sort order */
  SORT_ORDER: 'desc',
  /** Query timeout in milliseconds */
  QUERY_TIMEOUT: 30000,
  /** Maximum number of expand levels */
  MAX_EXPAND_DEPTH: 2,
} as const;

/**
 * Entity state codes (common across most D365 entities)
 */
export const D365_STATE_CODES = {
  /** Active record */
  ACTIVE: 0,
  /** Inactive/deactivated record */
  INACTIVE: 1,
} as const;

/**
 * Lead Status (tc_ecleadlifecyclestatus) Option Set Values
 * Maps D365 option set integers to application status strings
 */
export const LEAD_STATUS_VALUES = {
  ASSIGNED: 948010000,         // Assigned to partner organization
  IN_PROGRESS: 948010001,       // Being actively worked on
  CERTIFIED: 948010002,         // Lead has been certified/approved
  ON_HOLD: 948010003,           // Temporarily paused
  CLOSED: 948010004,            // Lead is closed/completed
  ASSIGNED_ALT: 948010005,      // Alternative assigned status (if exists)
} as const;

/**
 * Lead Status Map for reverse lookup
 */
export const LEAD_STATUS_MAP: Record<number, string> = {
  [LEAD_STATUS_VALUES.ASSIGNED]: 'assigned',
  [LEAD_STATUS_VALUES.IN_PROGRESS]: 'in-progress',
  [LEAD_STATUS_VALUES.CERTIFIED]: 'certified',
  [LEAD_STATUS_VALUES.ON_HOLD]: 'on-hold',
  [LEAD_STATUS_VALUES.CLOSED]: 'closed',
  [LEAD_STATUS_VALUES.ASSIGNED_ALT]: 'assigned',
} as const;

/**
 * Engagement Interest (tc_engagementinterest) Option Set Values
 * Multi-select option set for lead types
 */
export const ENGAGEMENT_INTEREST_VALUES = {
  FOSTER: 948010000,
  VOLUNTEER: 948010001,
} as const;

/**
 * Engagement Interest Map for reverse lookup
 */
export const ENGAGEMENT_INTEREST_MAP: Record<number, string> = {
  [ENGAGEMENT_INTEREST_VALUES.FOSTER]: 'foster',
  [ENGAGEMENT_INTEREST_VALUES.VOLUNTEER]: 'volunteer',
} as const;

/**
 * Organization Lead Type Constants
 * Used to determine which organization field to filter on
 * These match the tc_organizationleadtype field values in Account entity
 */
export const ORGANIZATION_LEAD_TYPE = {
  FOSTER: '948010000',
  VOLUNTEER: '948010001',
} as const;

/**
 * Default values for unmapped or null values
 */
export const LEAD_DEFAULTS = {
  STATUS: 'other',
  TYPE: 'other',
} as const;

/**
 * D365 Web API configuration
 */
export const D365_API_CONFIG = {
  /** API version */
  VERSION: 'v9.2',
  /** OData max version header */
  ODATA_MAX_VERSION: '4.0',
  /** OData version header */
  ODATA_VERSION: '4.0',
  /** Default accept header */
  ACCEPT: 'application/json',
  /** Prefer header for including annotations */
  PREFER_ANNOTATIONS: 'odata.include-annotations="*"',
  /** Prefer header for returning representation */
  PREFER_REPRESENTATION: 'return=representation',
} as const;

/**
 * D365 common headers
 */
export const D365_HEADERS = {
  'OData-MaxVersion': D365_API_CONFIG.ODATA_MAX_VERSION,
  'OData-Version': D365_API_CONFIG.ODATA_VERSION,
  'Accept': D365_API_CONFIG.ACCEPT,
  'Content-Type': 'application/json',
} as const;

/**
 * Error messages for query validation
 */
export const QUERY_ERROR_MESSAGES = {
  MISSING_INITIATIVE: 'Initiative filter is required for all queries',
  INVALID_PAGE_SIZE: `Page size must be between 1 and ${D365_QUERY_DEFAULTS.MAX_PAGE_SIZE}`,
  INVALID_SORT_FIELD: 'Invalid sort field specified',
  INVALID_FILTER: 'Invalid filter configuration',
  MISSING_ORGANIZATION: 'Organization filter is required',
  INVALID_ORGANIZATION_TYPE: 'Invalid organization type format',
} as const;

/**
 * Security validation patterns
 */
export const SECURITY_PATTERNS = {
  /** Valid organization lead type format (comma-separated numbers) */
  ORGANIZATION_TYPE_PATTERN: /^\d+(,\d+)*$/,
  /** Valid GUID format */
  GUID_PATTERN: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
} as const;

/**
 * Helper function to check if a value is a valid option set value
 */
export function isValidOptionSetValue(value: number, validValues: Record<string, number>): boolean {
  return Object.values(validValues).includes(value);
}

/**
 * Helper function to check if organization type contains a specific type
 * 
 * @param organizationLeadType - Comma-separated string of organization types from JWT
 * @param targetType - The type to check for (use ORGANIZATION_LEAD_TYPE constants)
 */
export function hasOrganizationType(
  organizationLeadType: string | undefined,
  targetType: string
): boolean {
  if (!organizationLeadType) return false;
  return organizationLeadType.split(',').includes(targetType);
}

/**
 * Validate organization lead type format
 * 
 * @param organizationLeadType - String to validate
 * @returns true if valid format
 */
export function isValidOrganizationLeadType(organizationLeadType: string): boolean {
  return SECURITY_PATTERNS.ORGANIZATION_TYPE_PATTERN.test(organizationLeadType);
}

/**
 * Validate GUID format
 * 
 * @param guid - String to validate
 * @returns true if valid GUID format
 */
export function isValidGuid(guid: string): boolean {
  return SECURITY_PATTERNS.GUID_PATTERN.test(guid);
}

/**
 * Helper function to map lead status from D365 integer to string
 */
export function mapLeadStatus(statusValue: number | null | undefined): string {
  if (statusValue === null || statusValue === undefined) {
    return LEAD_DEFAULTS.STATUS;
  }
  return LEAD_STATUS_MAP[statusValue] || LEAD_DEFAULTS.STATUS;
}

/**
 * Helper function to infer lead type from engagement interest
 * Handles multi-select option set values (comma-separated string)
 * Prioritizes 'foster' if both types are present
 */
export function mapLeadType(engagementInterest: string | number | null | undefined): string {
  if (engagementInterest === null || engagementInterest === undefined) {
    return LEAD_DEFAULTS.TYPE;
  }
  
  // Convert to string to handle both string and number inputs
  const interestStr = String(engagementInterest);
  
  // Check if it contains foster interest (948010000)
  if (interestStr.includes('948010000')) {
    return 'foster';
  }
  
  // Check if it contains volunteer interest (948010001)
  if (interestStr.includes('948010001')) {
    return 'volunteer';
  }
  
  // For backward compatibility, also check direct number mapping
  if (typeof engagementInterest === 'number' && ENGAGEMENT_INTEREST_MAP[engagementInterest]) {
    return ENGAGEMENT_INTEREST_MAP[engagementInterest];
  }
  
  return LEAD_DEFAULTS.TYPE;
}