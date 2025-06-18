/**
 * D365 Option Set Mappings and Constants
 * 
 * This file centralizes all D365 integer-to-string mappings and constants
 * used throughout the application for the tc_everychildlead entity.
 * 
 * IMPORTANT: Volunteer Organization Filter
 * The volunteer organization filter uses a 1:N relationship query to a junction entity:
 * tc_tc_ecleadsvolunteerorg_ECLead_tc_everychi/any(o:o/_tc_volunteerorganization_value eq '{orgId}')
 * 
 * This OData syntax means:
 * - tc_tc_ecleadsvolunteerorg_ECLead_tc_everychi: The 1:N navigation property to the junction entity
 * - any(): OData function to check if any related record matches
 * - o: Alias for the junction entity record in the subquery
 * - _tc_volunteerorganization_value: The volunteer org lookup field in the junction entity
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
 * D365 Field Names and Navigation Properties
 * 
 * IMPORTANT: D365 Web API Naming Conventions
 * - $select: Use lowercase field names (e.g., 'tc_name', '_tc_contact_value')
 * - $expand: Use PascalCase navigation properties (e.g., 'tc_Contact', 'tc_LeadOwner')
 * - $filter: Use field names with _value suffix for lookups
 * 
 * This structure clearly distinguishes between different contexts to ensure
 * proper OData query construction.
 */
export const D365_LEAD_FIELDS = {
  // Base fields (for $select and $filter)
  ID: 'tc_everychildleadid',
  NAME: 'tc_name',
  STATUS: 'tc_ecleadlifecyclestatus',
  ENGAGEMENT_INTEREST: 'tc_engagementinterest',
  LEAD_SCORE: 'tc_leadscore2',
  STATE_CODE: 'statecode',
  CREATED_ON: 'createdon',
  MODIFIED_ON: 'modifiedon',
  
  // Lookup field values (for $select and $filter)
  CONTACT_VALUE: '_tc_contact_value',
  LEAD_OWNER_VALUE: '_tc_leadowner_value',
  INITIATIVE: '_tc_initiative_value',
  FOSTER_ORGANIZATION: '_tc_fosterorganization_value',
  
  // Navigation properties (for $expand) - PascalCase
  CONTACT_NAV: 'tc_Contact',         // Navigation to Contact entity
  LEAD_OWNER_NAV: 'tc_LeadOwner',   // Navigation to Contact entity (owner)
  
  // Fields within expanded entities (lowercase)
  CONTACT_FIELDS: {
    FULLNAME: 'fullname',
    EMAIL: 'emailaddress1',
  },
  
  // 1:N Relationships (manually created N:N via junction entity)
  VOLUNTEER_ORG_RELATIONSHIP: 'tc_tc_ecleadsvolunteerorg_ECLead_tc_everychi', // Navigation property to volunteer org assignments
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
 * Field name mappings for sorting
 * Maps frontend field names to D365 field names for $orderby clause
 */
export const SORT_FIELD_MAP: Record<string, string> = {
  // Frontend field -> D365 field
  'id': 'tc_everychildleadid',
  'name': 'tc_name',
  'status': 'tc_ecleadlifecyclestatus',
  'type': 'tc_engagementinterest',
  'leadScore': 'tc_leadscore2',
  'createdAt': 'createdon',
  'updatedAt': 'modifiedon',
  // Fields that don't have direct D365 equivalents (these will be ignored for sorting)
  'subjectName': 'tc_Contact/fullname', // Can't sort on expanded fields in OData
  'subjectEmail': 'tc_Contact/emailaddress1', // Can't sort on expanded fields
  'leadOwnerName': 'tc_LeadOwner/fullname', // Can't sort on expanded fields
  'assignedOrganizationName': '_tc_fosterorganization_value', // Sort by org ID instead
  'initiativeId': '_tc_initiative_value', // Sort by initiative GUID
  // Also support D365 field names directly (pass through)
  'tc_everychildleadid': 'tc_everychildleadid',
  'tc_name': 'tc_name',
  'tc_ecleadlifecyclestatus': 'tc_ecleadlifecyclestatus',
  'tc_engagementinterest': 'tc_engagementinterest',
  'tc_leadscore2': 'tc_leadscore2',
  'createdon': 'createdon',
  'modifiedon': 'modifiedon'
};

/**
 * Helper function to map sort field from frontend to D365
 * @param frontendField - The field name from the frontend
 * @returns The corresponding D365 field name, or undefined if not sortable
 */
export function mapSortField(frontendField: string | undefined): string | undefined {
  if (!frontendField) return undefined;
  
  const mappedField = SORT_FIELD_MAP[frontendField];
  
  // Filter out fields that can't be sorted in OData (expanded fields)
  if (mappedField && mappedField.includes('/')) {
    return undefined; // Can't sort on expanded fields
  }
  
  return mappedField;
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