/**
 * D365 Entity Names and Relationships
 * Centralized definition of D365 entities used in the application
 */

/**
 * D365 Entity Names
 */
export const D365_ENTITIES = {
  CONTACT: 'contacts',
  ACCOUNT: 'accounts',
  SYSTEMUSER: 'systemusers',
} as const;

/**
 * D365 API Configuration
 */
export const D365_API = {
  VERSION: 'v9.2',
  MAX_PAGE_SIZE: 5000,
  DEFAULT_PAGE_SIZE: 100,
  ODATA_MAX_VERSION: '4.0',
  ODATA_VERSION: '4.0',
} as const;

/**
 * D365 Request Headers
 */
export const D365_HEADERS = {
  'OData-MaxVersion': D365_API.ODATA_MAX_VERSION,
  'OData-Version': D365_API.ODATA_VERSION,
  'Accept': 'application/json',
  'Content-Type': 'application/json; charset=utf-8',
  'Prefer': 'odata.include-annotations="*"',
} as const;

/**
 * D365 Query Preferences
 */
export const D365_PREFERENCES = {
  INCLUDE_COUNT: '$count=true',
  RETURN_REPRESENTATION: 'return=representation',
  MAX_PAGE_SIZE: `odata.maxpagesize=${D365_API.DEFAULT_PAGE_SIZE}`,
} as const;

/**
 * Common D365 Field Names
 */
export const D365_COMMON_FIELDS = {
  // Audit fields
  CREATED_ON: 'createdon',
  MODIFIED_ON: 'modifiedon',
  CREATED_BY: '_createdby_value',
  MODIFIED_BY: '_modifiedby_value',
  
  // Ownership
  OWNER_ID: '_ownerid_value',
  OWNING_BUSINESS_UNIT: '_owningbusinessunit_value',
  
  // State
  STATE_CODE: 'statecode',
  STATUS_CODE: 'statuscode',
} as const;

/**
 * D365 Relationship Types
 */
export const D365_RELATIONSHIPS = {
  CONTACT_TO_ACCOUNT: '_parentcustomerid_value',
  CONTACT_TO_ORGANIZATION: '_tc_assignedorganization_value',
} as const;