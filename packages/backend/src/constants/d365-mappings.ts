/**
 * D365 Option Set Mappings and Constants
 * 
 * This file centralizes all D365 integer-to-string mappings and constants
 * used throughout the application for the tc_everychildlead entity.
 * 
 * IMPORTANT: Volunteer Organization Filter
 * The volunteer organization filter uses a many-to-many relationship query:
 * tc_eclead_tc_ecleadsvolunteerorg_eclead/any(o:o/_tc_volunteerorganization_value eq '{orgId}')
 * 
 * This OData syntax means:
 * - tc_eclead_tc_ecleadsvolunteerorg_eclead: The many-to-many relationship table
 * - any(): OData function to check if any related record matches
 * - o: Alias for the related record in the subquery
 * - _tc_volunteerorganization_value: The volunteer org field in the relationship
 */

/**
 * Lead Status Mappings
 * Maps D365 tc_ecleadlifecyclestatus option set integers to application status strings
 */
export const LEAD_STATUS_MAP: Record<number, string> = {
  948010000: 'assigned',      // Assigned to partner organization
  948010001: 'in-progress',   // Being actively worked on
  948010002: 'certified',     // Lead has been certified/approved
  948010003: 'on-hold',       // Temporarily paused
  948010004: 'closed',        // Lead is closed/completed
  948010005: 'assigned',      // Alternative assigned status (if exists)
  // Note: unmapped values will default to 'other'
};

/**
 * Lead Type Mappings
 * Maps D365 tc_engagementinterest option set integers to lead types
 * Note: If both foster and volunteer interests are present, foster takes priority
 */
export const ENGAGEMENT_INTEREST_MAP: Record<number, string> = {
  948010000: 'foster',        // Foster interest
  948010001: 'volunteer',     // Volunteer interest
  // Add more engagement interests as discovered
};

/**
 * Organization Lead Type Constants
 * Used to determine which organization field to filter on
 */
export const ORGANIZATION_LEAD_TYPE = {
  FOSTER: '948010000',
  VOLUNTEER: '948010001',
} as const;

/**
 * D365 Field Names
 * Centralized field names for consistency
 */
export const D365_LEAD_FIELDS = {
  // Base fields
  ID: 'tc_everychildleadid',
  NAME: 'tc_name',
  STATUS: 'tc_ecleadlifecyclestatus',
  ENGAGEMENT_INTEREST: 'tc_engagementinterest',
  LEAD_SCORE: 'tc_leadscore2',
  STATE_CODE: 'statecode',
  CREATED_ON: 'createdon',
  MODIFIED_ON: 'modifiedon',
  
  // Lookup fields
  CONTACT: 'tc_contact',
  LEAD_OWNER: 'tc_leadowner',
  INITIATIVE: '_tc_initiative_value',
  FOSTER_ORGANIZATION: '_tc_fosterorganization_value',
  
  // Related entity fields
  CONTACT_FULLNAME: 'fullname',
  CONTACT_EMAIL: 'emailaddress1',
} as const;

/**
 * Default Values
 * Used when mapping unmapped or null values
 */
export const LEAD_DEFAULTS = {
  STATUS: 'other',
  TYPE: 'other',
} as const;

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
 * Prioritizes 'foster' if both types are present
 */
export function mapLeadType(engagementInterest: number | null | undefined): string {
  if (engagementInterest === null || engagementInterest === undefined) {
    return LEAD_DEFAULTS.TYPE;
  }
  return ENGAGEMENT_INTEREST_MAP[engagementInterest] || LEAD_DEFAULTS.TYPE;
}

/**
 * Helper function to check if organization type contains a specific type
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