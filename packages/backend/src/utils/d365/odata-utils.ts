/**
 * OData Utilities for D365 Queries
 * Provides safe query building and string escaping functions
 * Extracted from abandoned implementation with focus on security
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
  IN: 'in',
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
 * Common OData functions
 */
export const ODATA_FUNCTIONS = {
  ANY: 'any',
  ALL: 'all',
  COUNT: 'count',
  SUBSTRING: 'substring',
  TO_LOWER: 'tolower',
  TO_UPPER: 'toupper',
  TRIM: 'trim',
  CONCAT: 'concat',
  INDEX_OF: 'indexof',
  LENGTH: 'length',
} as const;

/**
 * Escape string for safe use in OData queries
 * Prevents injection attacks by escaping single quotes
 * 
 * @param value - String to escape
 * @returns Escaped string safe for OData queries
 */
export function escapeODataString(value: string | null | undefined): string {
  if (value === null || value === undefined || typeof value !== 'string') {
    return '';
  }
  return value.replace(/'/g, "''");
}

/**
 * Escape and quote a string value for OData
 * 
 * @param value - String to escape and quote
 * @returns Quoted and escaped string
 */
export function quoteODataString(value: string): string {
  return `'${escapeODataString(value)}'`;
}

/**
 * Format a GUID for OData queries (removes braces if present)
 * 
 * @param guid - GUID string
 * @returns Formatted GUID without braces
 */
export function formatODataGuid(guid: string | null | undefined): string {
  if (!guid || typeof guid !== 'string') {
    return '';
  }
  // Remove braces if present
  return guid.replace(/[{}]/g, '');
}

/**
 * Format a date for OData queries
 * 
 * @param date - Date to format
 * @returns ISO string representation
 */
export function formatODataDate(date: Date | string): string {
  if (typeof date === 'string') {
    date = new Date(date);
  }
  return date.toISOString();
}

/**
 * Build an OData filter expression
 * 
 * @param field - Field name
 * @param operator - OData operator
 * @param value - Value to compare
 * @returns Filter expression string
 */
export function buildFilterExpression(
  field: string,
  operator: keyof typeof ODATA_OPERATORS,
  value: string | number | boolean | Date
): string {
  // Validate operator
  if (!ODATA_OPERATORS[operator]) {
    throw new Error(`Invalid OData operator: ${operator}`);
  }
  
  // Validate field name
  try {
    validateFieldName(field);
  } catch (error) {
    throw new Error(`Invalid field name in filter expression: ${field}`);
  }
  
  const op = ODATA_OPERATORS[operator];
  
  // Format value based on type
  let formattedValue: string;
  if (typeof value === 'string') {
    formattedValue = quoteODataString(value);
  } else if (value instanceof Date) {
    formattedValue = formatODataDate(value);
  } else if (typeof value === 'boolean') {
    formattedValue = value.toString();
  } else {
    formattedValue = value.toString();
  }
  
  return `${field} ${op} ${formattedValue}`;
}

/**
 * Build OData filter string from an array of filter conditions
 * 
 * @param filters - Array of filter expressions
 * @param operator - Logical operator to combine filters (default: 'and')
 * @returns Combined filter string
 */
export function combineFilters(
  filters: string[],
  operator: 'and' | 'or' = 'and'
): string {
  // Remove empty filters
  const validFilters = filters.filter(f => f && f.trim());
  
  if (validFilters.length === 0) return '';
  if (validFilters.length === 1) return validFilters[0];
  
  return validFilters.map(f => `(${f})`).join(` ${operator} `);
}

/**
 * Build an OData contains expression for text search
 * 
 * @param field - Field to search in
 * @param searchTerm - Term to search for
 * @param caseSensitive - Whether search should be case sensitive (default: false)
 * @returns Contains expression
 */
export function buildContainsExpression(
  field: string,
  searchTerm: string,
  caseSensitive: boolean = false
): string {
  const escapedTerm = escapeODataString(searchTerm);
  
  if (caseSensitive) {
    return `${ODATA_OPERATORS.CONTAINS}(${field}, '${escapedTerm}')`;
  }
  
  // Case-insensitive search
  return `${ODATA_OPERATORS.CONTAINS}(${ODATA_FUNCTIONS.TO_LOWER}(${field}), '${escapedTerm.toLowerCase()}')`;
}

/**
 * Build an OData IN expression for matching multiple values
 * 
 * @param field - Field to check
 * @param values - Array of values to match
 * @returns IN expression or equivalent OR expression
 */
export function buildInExpression(
  field: string,
  values: (string | number)[]
): string {
  if (values.length === 0) return 'false'; // No matches
  if (values.length === 1) {
    return buildFilterExpression(field, 'EQUALS', values[0]);
  }
  
  // Build OR expression for multiple values
  const expressions = values.map(value => 
    buildFilterExpression(field, 'EQUALS', value)
  );
  
  return combineFilters(expressions, 'or');
}

/**
 * Build a date range filter
 * 
 * @param field - Date field name
 * @param startDate - Start date (inclusive)
 * @param endDate - End date (inclusive)
 * @returns Date range filter expression
 */
export function buildDateRangeFilter(
  field: string,
  startDate?: Date | string,
  endDate?: Date | string
): string {
  const filters: string[] = [];
  
  if (startDate) {
    filters.push(
      buildFilterExpression(field, 'GREATER_THAN_OR_EQUAL', startDate)
    );
  }
  
  if (endDate) {
    filters.push(
      buildFilterExpression(field, 'LESS_THAN_OR_EQUAL', endDate)
    );
  }
  
  return combineFilters(filters, 'and');
}

/**
 * Build an OData query string from parameters
 * 
 * @param params - Object containing query parameters
 * @returns URL query string
 */
export function buildQueryString(params: Record<string, any>): string {
  const queryParts: string[] = [];
  
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      // Handle arrays (e.g., for $select)
      const stringValue = Array.isArray(value) ? value.join(',') : String(value);
      queryParts.push(`${key}=${encodeURIComponent(stringValue)}`);
    }
  }
  
  return queryParts.join('&');
}

/**
 * Parse OData next link for pagination
 * 
 * @param nextLink - The @odata.nextLink URL
 * @returns Object containing skip, top, and other parameters
 */
export function parseNextLink(nextLink: string): Record<string, string> {
  if (!nextLink || typeof nextLink !== 'string') {
    throw new Error('Invalid nextLink: must be a non-empty string');
  }
  
  try {
    const url = new URL(nextLink);
    const params: Record<string, string> = {};
    
    url.searchParams.forEach((value, key) => {
      params[key] = value;
    });
    
    return params;
  } catch (error) {
    throw new Error(`Failed to parse next link: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Build an OData ANY expression for filtering on collection navigation properties
 * 
 * @param navigationProperty - The navigation property path
 * @param alias - Alias for the collection item
 * @param filter - Filter expression to apply to collection items
 * @returns ANY expression
 */
export function buildAnyExpression(
  navigationProperty: string,
  alias: string,
  filter: string
): string {
  return `${navigationProperty}/${ODATA_FUNCTIONS.ANY}(${alias}:${filter})`;
}

/**
 * Build an OData orderby clause with multiple fields
 * 
 * @param fields - Array of field names and directions
 * @returns Order by clause
 */
export function buildOrderBy(
  fields: Array<{ field: string; direction?: 'asc' | 'desc' }>
): string {
  if (fields.length === 0) return '';
  
  return fields
    .map(({ field, direction }) => {
      return direction === 'desc' ? `${field} desc` : field;
    })
    .join(',');
}

/**
 * Validate and sanitize field names to prevent injection
 * 
 * @param field - Field name to validate
 * @returns Validated field name
 * @throws Error if field name is invalid
 */
export function validateFieldName(field: string | null | undefined): string {
  if (!field || typeof field !== 'string') {
    throw new Error('Field name must be a non-empty string');
  }
  
  // Allow alphanumeric, underscore, forward slash (for navigation), and dot
  const validPattern = /^[a-zA-Z_][a-zA-Z0-9_/\.]*$/;
  
  if (!validPattern.test(field)) {
    throw new Error(`Invalid field name format: ${field}. Field names must start with a letter or underscore and contain only letters, numbers, underscores, dots, or slashes.`);
  }
  
  return field;
}

/**
 * Build D365 Web API URL
 * 
 * @param baseUrl - Base D365 URL
 * @param entitySet - Entity set name (e.g., 'contacts', 'accounts')
 * @param resourceId - Optional resource ID for single entity queries
 * @param queryParams - Optional query parameters object
 * @returns Complete URL for D365 Web API request
 */
export function buildD365Url(
  baseUrl: string,
  entitySet: string,
  resourceId?: string,
  queryParams?: Record<string, any>
): string {
  if (!baseUrl || !entitySet) {
    throw new Error('Base URL and entity set are required');
  }
  
  // Remove trailing slash from base URL if present
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  
  // Build path
  let path = `/api/data/v9.2/${entitySet}`;
  if (resourceId) {
    path += `(${formatODataGuid(resourceId)})`;
  }
  
  // Build full URL
  const url = new URL(path, cleanBaseUrl);
  
  // Add query parameters if provided
  if (queryParams) {
    const queryString = buildQueryString(queryParams);
    if (queryString) {
      url.search = queryString;
    }
  }
  
  return url.toString();
}

/**
 * Build a complex filter with nested conditions
 * Useful for building filters with multiple AND/OR conditions
 * 
 * @example
 * const filter = buildComplexFilter({
 *   and: [
 *     { field: 'status', operator: 'EQUALS', value: 'active' },
 *     {
 *       or: [
 *         { field: 'priority', operator: 'EQUALS', value: 'high' },
 *         { field: 'dueDate', operator: 'LESS_THAN', value: new Date() }
 *       ]
 *     }
 *   ]
 * });
 */
export interface FilterCondition {
  field?: string;
  operator?: keyof typeof ODATA_OPERATORS;
  value?: any;
  and?: FilterCondition[];
  or?: FilterCondition[];
}

export function buildComplexFilter(condition: FilterCondition): string {
  if (condition.and) {
    const filters = condition.and.map(c => buildComplexFilter(c));
    return combineFilters(filters, 'and');
  }
  
  if (condition.or) {
    const filters = condition.or.map(c => buildComplexFilter(c));
    return combineFilters(filters, 'or');
  }
  
  if (condition.field && condition.operator && condition.value !== undefined) {
    return buildFilterExpression(condition.field, condition.operator, condition.value);
  }
  
  return '';
}