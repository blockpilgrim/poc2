/**
 * D365 Query Constants
 * Constants for building OData queries and filters
 */

/**
 * OData operators
 */
export const ODATA_OPERATORS = {
  EQUALS: 'eq',
  NOT_EQUALS: 'ne',
  GREATER_THAN: 'gt',
  GREATER_THAN_OR_EQUAL: 'ge',
  LESS_THAN: 'lt',
  LESS_THAN_OR_EQUAL: 'le',
  AND: 'and',
  OR: 'or',
  NOT: 'not',
  CONTAINS: 'contains',
  STARTS_WITH: 'startswith',
  ENDS_WITH: 'endswith',
} as const;

/**
 * OData query parameters
 */
export const ODATA_PARAMS = {
  SELECT: '$select',
  FILTER: '$filter',
  ORDER_BY: '$orderby',
  TOP: '$top',
  SKIP: '$skip',
  COUNT: '$count',
  EXPAND: '$expand',
  SEARCH: '$search',
} as const;

/**
 * Query defaults
 */
export const QUERY_DEFAULTS = {
  PAGE_SIZE: 25,
  MAX_PAGE_SIZE: 100,
  SORT_FIELD: 'modifiedon',
  SORT_ORDER: 'desc',
} as const;

/**
 * Filter templates for common scenarios
 */
export const FILTER_TEMPLATES = {
  /**
   * Initiative filter template - CRITICAL for security
   */
  INITIATIVE: (initiative: string) => 
    `tc_initiative ${ODATA_OPERATORS.EQUALS} '${escapeODataString(initiative)}'`,
  
  /**
   * Organization filter template
   */
  ORGANIZATION: (orgId: string) => 
    `_tc_assignedorganization_value ${ODATA_OPERATORS.EQUALS} '${orgId}'`,
  
  /**
   * Owner filter template
   */
  OWNER: (ownerId: string) => 
    `_ownerid_value ${ODATA_OPERATORS.EQUALS} '${ownerId}'`,
  
  /**
   * Status filter template (supports multiple values)
   */
  STATUS: (statuses: string[]) => {
    if (statuses.length === 1) {
      return `tc_leadstatus ${ODATA_OPERATORS.EQUALS} '${escapeODataString(statuses[0])}'`;
    }
    const filters = statuses.map(s => 
      `tc_leadstatus ${ODATA_OPERATORS.EQUALS} '${escapeODataString(s)}'`
    );
    return `(${filters.join(` ${ODATA_OPERATORS.OR} `)})`;
  },
  
  /**
   * Type filter template (supports multiple values)
   */
  TYPE: (types: string[]) => {
    if (types.length === 1) {
      return `tc_leadtype ${ODATA_OPERATORS.EQUALS} '${escapeODataString(types[0])}'`;
    }
    const filters = types.map(t => 
      `tc_leadtype ${ODATA_OPERATORS.EQUALS} '${escapeODataString(t)}'`
    );
    return `(${filters.join(` ${ODATA_OPERATORS.OR} `)})`;
  },
  
  /**
   * Search filter template (searches across multiple fields)
   */
  SEARCH: (searchTerm: string) => {
    const escaped = escapeODataString(searchTerm);
    return `(${ODATA_OPERATORS.CONTAINS}(firstname, '${escaped}') ${ODATA_OPERATORS.OR} ` +
           `${ODATA_OPERATORS.CONTAINS}(lastname, '${escaped}') ${ODATA_OPERATORS.OR} ` +
           `${ODATA_OPERATORS.CONTAINS}(emailaddress1, '${escaped}'))`;
  },
  
  /**
   * Date range filter template
   */
  DATE_RANGE: (field: string, startDate: Date, endDate: Date) => 
    `${field} ${ODATA_OPERATORS.GREATER_THAN_OR_EQUAL} ${startDate.toISOString()} ${ODATA_OPERATORS.AND} ` +
    `${field} ${ODATA_OPERATORS.LESS_THAN_OR_EQUAL} ${endDate.toISOString()}`,
};

/**
 * Sort field mappings
 * Maps user-friendly sort fields to D365 field names
 */
export const SORT_FIELD_MAPPINGS: Record<string, string> = {
  'createdAt': 'createdon',
  'updatedAt': 'modifiedon',
  'firstName': 'firstname',
  'lastName': 'lastname',
  'email': 'emailaddress1',
  'status': 'tc_leadstatus',
  'type': 'tc_leadtype',
  'priority': 'tc_priority',
  'lastContactedAt': 'tc_lastcontactedon',
  'assignedAt': 'tc_assignedon',
};

/**
 * Error messages for query building
 */
export const QUERY_ERRORS = {
  MISSING_INITIATIVE: 'Initiative filter is required for all queries',
  INVALID_PAGE_SIZE: 'Page size must be between 1 and 100',
  INVALID_FILTER: 'Invalid filter configuration',
  INVALID_SORT_FIELD: 'Invalid sort field',
} as const;

/**
 * Escape string for safe use in OData queries
 * Prevents injection attacks by escaping single quotes
 */
export function escapeODataString(value: string): string {
  return value.replace(/'/g, "''");
}

/**
 * Build OData filter string from an array of filter conditions
 */
export function combineFilters(filters: string[], operator: 'and' | 'or' = 'and'): string {
  if (filters.length === 0) return '';
  if (filters.length === 1) return filters[0];
  return filters.join(` ${operator} `);
}