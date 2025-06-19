/**
 * D365 Option Set Mappings and Constants
 * 
 * This file has been refactored. All constants and mappings have been moved to:
 * - ./d365/lead-fields.ts - for field names and navigation properties
 * - ./d365/query-constants.ts - for option sets, validation, and mapping functions
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
 * 
 * @deprecated This file is kept for backwards compatibility during migration.
 * Please import from the new modular files instead.
 */

// Re-export from new locations for backwards compatibility
export { 
  D365_LEAD_FIELDS,
  LEAD_SELECT_FIELDS,
  LEAD_SORT_FIELD_MAP as SORT_FIELD_MAP,
  mapLeadSortField as mapSortField
} from './d365/lead-fields';

export {
  LEAD_STATUS_MAP,
  ENGAGEMENT_INTEREST_MAP,
  ORGANIZATION_LEAD_TYPE,
  LEAD_DEFAULTS,
  mapLeadStatus,
  mapLeadType,
  hasOrganizationType
} from './d365/query-constants';