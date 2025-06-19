/**
 * D365 Lead Entity Field Constants
 * Centralizes all field names and navigation properties for tc_everychildlead entity
 * 
 * IMPORTANT: D365 Web API Naming Conventions
 * - $select: Use lowercase field names (e.g., 'tc_name', '_tc_contact_value')
 * - $expand: Use PascalCase navigation properties (e.g., 'tc_Contact', 'tc_LeadOwner')
 * - $filter: Use field names with _value suffix for lookups
 * - $orderby: Use lowercase field names
 * 
 * This structure clearly distinguishes between different contexts to ensure
 * proper OData query construction.
 */

/**
 * tc_everychildlead entity fields
 */
export const D365_LEAD_FIELDS = {
  // Primary key
  ID: 'tc_everychildleadid',
  
  // Basic fields
  NAME: 'tc_name',
  STATUS: 'tc_ecleadlifecyclestatus',
  ENGAGEMENT_INTEREST: 'tc_engagementinterest',
  LEAD_SCORE: 'tc_leadscore2',
  
  // State fields
  STATE_CODE: 'statecode',
  STATUS_REASON: 'statuscode',
  
  // Date fields
  CREATED_ON: 'createdon',
  MODIFIED_ON: 'modifiedon',
  
  // Lookup field values (for $select and $filter) - use _value suffix
  CONTACT_VALUE: '_tc_contact_value',
  LEAD_OWNER_VALUE: '_tc_leadowner_value',
  INITIATIVE: '_tc_initiative_value',
  FOSTER_ORGANIZATION: '_tc_fosterorganization_value',
  
  // Navigation properties (for $expand) - PascalCase
  CONTACT_NAV: 'tc_Contact',         // Navigation to Contact entity
  LEAD_OWNER_NAV: 'tc_LeadOwner',   // Navigation to Contact entity (owner)
  
  // 1:N Relationships (manually created N:N via junction entity)
  VOLUNTEER_ORG_RELATIONSHIP: 'tc_tc_ecleadsvolunteerorg_ECLead_tc_everychi',
} as const;

/**
 * Fields within expanded Contact entity
 */
export const D365_CONTACT_FIELDS = {
  ID: 'contactid',
  FULLNAME: 'fullname',
  FIRSTNAME: 'firstname',
  LASTNAME: 'lastname',
  EMAIL: 'emailaddress1',
  PHONE: 'telephone1',
  MOBILE: 'mobilephone',
  AZURE_ID: 'msevtmgt_aadobjectid',
} as const;

/**
 * Fields within expanded Account (Organization) entity
 */
export const D365_ACCOUNT_FIELDS = {
  ID: 'accountid',
  NAME: 'name',
  ORGANIZATION_TYPE: 'tc_organizationleadtype',
  STATUS: 'statecode',
  PARENT_ACCOUNT: '_parentaccountid_value',
} as const;

/**
 * Complete field selection for lead queries
 * Used to ensure consistent field selection across queries
 */
export const LEAD_SELECT_FIELDS = [
  D365_LEAD_FIELDS.ID,
  D365_LEAD_FIELDS.NAME,
  D365_LEAD_FIELDS.STATUS,
  D365_LEAD_FIELDS.ENGAGEMENT_INTEREST,
  D365_LEAD_FIELDS.LEAD_SCORE,
  D365_LEAD_FIELDS.CREATED_ON,
  D365_LEAD_FIELDS.MODIFIED_ON,
  D365_LEAD_FIELDS.INITIATIVE,
  D365_LEAD_FIELDS.FOSTER_ORGANIZATION,
  D365_LEAD_FIELDS.CONTACT_VALUE,
  D365_LEAD_FIELDS.LEAD_OWNER_VALUE,
] as const;

/**
 * Standard expand configuration for lead queries
 * Includes related Contact and Lead Owner information
 */
export const LEAD_EXPAND_CONFIG = {
  contact: {
    navigationProperty: D365_LEAD_FIELDS.CONTACT_NAV,
    selectFields: [
      D365_CONTACT_FIELDS.FULLNAME,
      D365_CONTACT_FIELDS.EMAIL,
    ],
  },
  leadOwner: {
    navigationProperty: D365_LEAD_FIELDS.LEAD_OWNER_NAV,
    selectFields: [
      D365_CONTACT_FIELDS.FULLNAME,
    ],
  },
} as const;

/**
 * Build $select parameter value for lead queries
 */
export function buildLeadSelectClause(): string {
  return LEAD_SELECT_FIELDS.join(',');
}

/**
 * Build $expand parameter value for lead queries
 */
export function buildLeadExpandClause(): string {
  const expandParts: string[] = [];
  
  // Expand contact with selected fields
  expandParts.push(
    `${LEAD_EXPAND_CONFIG.contact.navigationProperty}($select=${LEAD_EXPAND_CONFIG.contact.selectFields.join(',')})`
  );
  
  // Expand lead owner with selected fields
  expandParts.push(
    `${LEAD_EXPAND_CONFIG.leadOwner.navigationProperty}($select=${LEAD_EXPAND_CONFIG.leadOwner.selectFields.join(',')})`
  );
  
  return expandParts.join(',');
}

/**
 * Field name mappings for sorting
 * Maps frontend field names to D365 field names for $orderby clause
 */
export const LEAD_SORT_FIELD_MAP: Record<string, string> = {
  // Frontend field -> D365 field
  'id': D365_LEAD_FIELDS.ID,
  'name': D365_LEAD_FIELDS.NAME,
  'status': D365_LEAD_FIELDS.STATUS,
  'type': D365_LEAD_FIELDS.ENGAGEMENT_INTEREST,
  'leadScore': D365_LEAD_FIELDS.LEAD_SCORE,
  'createdAt': D365_LEAD_FIELDS.CREATED_ON,
  'updatedAt': D365_LEAD_FIELDS.MODIFIED_ON,
  
  // Fields that don't have direct D365 equivalents (these will be ignored for sorting)
  'subjectName': `${D365_LEAD_FIELDS.CONTACT_NAV}/fullname`, // Can't sort on expanded fields in OData
  'subjectEmail': `${D365_LEAD_FIELDS.CONTACT_NAV}/emailaddress1`, // Can't sort on expanded fields
  'leadOwnerName': `${D365_LEAD_FIELDS.LEAD_OWNER_NAV}/fullname`, // Can't sort on expanded fields
  'assignedOrganizationName': D365_LEAD_FIELDS.FOSTER_ORGANIZATION, // Sort by org ID instead
  'initiativeId': D365_LEAD_FIELDS.INITIATIVE, // Sort by initiative GUID
  
  // Also support D365 field names directly (pass through)
  [D365_LEAD_FIELDS.ID]: D365_LEAD_FIELDS.ID,
  [D365_LEAD_FIELDS.NAME]: D365_LEAD_FIELDS.NAME,
  [D365_LEAD_FIELDS.STATUS]: D365_LEAD_FIELDS.STATUS,
  [D365_LEAD_FIELDS.ENGAGEMENT_INTEREST]: D365_LEAD_FIELDS.ENGAGEMENT_INTEREST,
  [D365_LEAD_FIELDS.LEAD_SCORE]: D365_LEAD_FIELDS.LEAD_SCORE,
  [D365_LEAD_FIELDS.CREATED_ON]: D365_LEAD_FIELDS.CREATED_ON,
  [D365_LEAD_FIELDS.MODIFIED_ON]: D365_LEAD_FIELDS.MODIFIED_ON,
};

/**
 * Map sort field from frontend to D365
 * 
 * @param frontendField - The field name from the frontend
 * @returns The corresponding D365 field name, or undefined if not sortable
 */
export function mapLeadSortField(frontendField: string | undefined): string | undefined {
  if (!frontendField) return undefined;
  
  const mappedField = LEAD_SORT_FIELD_MAP[frontendField];
  
  // Filter out fields that can't be sorted in OData (expanded fields)
  if (mappedField && mappedField.includes('/')) {
    return undefined; // Can't sort on expanded fields
  }
  
  return mappedField;
}