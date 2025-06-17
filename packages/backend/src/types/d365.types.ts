/**
 * D365 Integration Types
 * Defines types for secure D365 data filtering and queries
 */

/**
 * D365 filter object injected by middleware
 * Contains mandatory security constraints that must be applied to all D365 queries
 */
export interface D365Filter {
  /**
   * User's initiative - REQUIRED for all queries
   * Maps to tc_initiative field in D365
   */
  initiative: string;
  
  /**
   * User's organization ID from D365
   * Used for additional data scoping
   */
  organizationId?: string;
  
  /**
   * User's organization name from D365
   * Used for display purposes
   */
  organizationName?: string;
  
  /**
   * User's organization lead type from D365
   * Comma-separated string of organization types (e.g., "948010000,948010001")
   * CRITICAL: Used to determine which organization fields to filter on
   */
  organizationLeadType?: string;
  
  /**
   * User ID for ownership filtering
   */
  userId?: string;
  
  /**
   * Allow additional filter properties for specific endpoints
   */
  [key: string]: any;
}

/**
 * D365 query options for pagination and sorting
 */
export interface D365QueryOptions {
  /**
   * Maximum number of records to return
   */
  limit?: number;
  
  /**
   * Number of records to skip for pagination
   */
  offset?: number;
  
  /**
   * Field to sort by
   */
  orderBy?: string;
  
  /**
   * Sort direction
   */
  orderDirection?: 'asc' | 'desc';
  
  /**
   * Fields to select (OData $select)
   */
  select?: string[];
  
  /**
   * Additional user-provided filter (will be combined with security filters)
   */
  userFilter?: string;
}

/**
 * D365 query result with pagination metadata
 */
export interface D365QueryResult<T> {
  /**
   * Array of records
   */
  value: T[];
  
  /**
   * Total count of records (if requested)
   */
  totalCount?: number;
  
  /**
   * Link to next page of results
   */
  nextLink?: string;
}

/**
 * D365 Lead entity mapping
 * Maps D365 contact fields to our Lead interface
 */
export interface D365Lead {
  contactid: string;
  firstname: string;
  lastname: string;
  emailaddress1?: string;
  telephone1?: string;
  telephone2?: string;
  
  // Address fields
  address1_line1?: string;
  address1_line2?: string;
  address1_city?: string;
  address1_stateorprovince?: string;
  address1_postalcode?: string;
  address1_country?: string;
  
  // Custom fields
  tc_initiative: string; // CRITICAL: Initiative assignment
  tc_leadstatus?: string;
  tc_leadtype?: string;
  tc_priority?: string;
  tc_source?: string;
  tc_notes?: string;
  tc_tags?: string;
  
  // Assignment fields
  _ownerid_value?: string;
  _tc_assignedorganization_value?: string;
  
  // Metadata
  createdon: string;
  modifiedon: string;
  tc_lastcontactedon?: string;
  tc_assignedon?: string;
}

/**
 * Type guard to check if a value is a D365Filter
 */
export function isD365Filter(value: any): value is D365Filter {
  return value && 
    typeof value === 'object' && 
    typeof value.initiative === 'string' &&
    value.initiative.length > 0;
}

/**
 * Extend Express Request to include D365 filter
 */
declare global {
  namespace Express {
    interface Request {
      /**
       * D365 filter injected by enforceInitiative middleware
       * Contains security constraints that must be applied to all D365 queries
       */
      d365Filter?: D365Filter;
    }
  }
}