import { d365Service } from './d365.service';
import { initiativeMappingService } from './initiative-mapping.service';
import { getInitiativeIdFromGuid } from '../config/initiatives.config';
import { AppError } from '../utils/errors';
import { escapeODataString, buildContainsExpression, combineFilters, buildD365Url } from '../utils/d365/odata-utils';
import { auditLogger, SecurityEventType } from '../utils/d365/audit-logger';
import { parseD365FetchError, formatErrorForLogging, createAppErrorFromD365, parseD365Error } from '../utils/d365/error-parser';
import { withRetry, RetryOptions } from '../utils/d365/retry-helper';
import { createLogger } from '../utils/logger';
import { 
  D365_LEAD_FIELDS, 
  buildLeadSelectClause, 
  buildLeadExpandClause,
  mapLeadSortField 
} from '../constants/d365/lead-fields';
import { 
  D365_QUERY_DEFAULTS, 
  D365_STATE_CODES,
  ORGANIZATION_LEAD_TYPE,
  hasOrganizationType,
  isValidOrganizationLeadType,
  QUERY_ERROR_MESSAGES,
  mapLeadStatus,
  mapLeadType,
  D365_HEADERS,
  D365_API_CONFIG
} from '../constants/d365/query-constants';
import type { 
  D365Filter, 
  D365QueryOptions, 
  D365QueryResult
} from '../types/d365.types';
import type { Lead, LeadFilters, LeadStatus, LeadType } from '@partner-portal/shared';

// Type for tc_everychildlead response
interface D365EveryChildLead {
  tc_everychildleadid: string;
  tc_name: string;
  tc_ecleadlifecyclestatus?: number;
  tc_engagementinterest?: string; // Multi-select option set returns comma-separated string
  tc_leadscore2?: number;
  statecode: number;
  createdon: string;
  modifiedon: string;
  _tc_initiative_value?: string;
  _tc_fosterorganization_value?: string;
  _tc_contact_value?: string;
  _tc_leadowner_value?: string;
  // Expanded entities (PascalCase navigation properties in D365 response)
  tc_Contact?: {
    fullname?: string;
    emailaddress1?: string;
  };
  tc_LeadOwner?: {
    fullname?: string;
  };
}

/**
 * OData query parameters for D365 API requests
 * Provides type safety for query building
 */
interface ODataQueryParams {
  $select: string;
  $expand: string;
  $filter?: string;
  $top?: number;
  $skip?: number;
  $orderby?: string;
  $count?: boolean;
}

/**
 * D365 lead query response structure
 * Strongly typed response from tc_everychildleads endpoint
 */
interface D365LeadQueryResponse {
  value: D365EveryChildLead[];
  '@odata.count'?: number;
  '@odata.nextLink'?: string;
}

/**
 * Error context for D365 operations
 * Provides structured information for error handling and logging
 */
interface D365ErrorContext {
  operation: string;
  entity: string;
  userId: string;
  filters?: Record<string, unknown>;
  resource?: string;
}

/**
 * Lead Service
 * Handles all lead-related operations with D365
 * CRITICAL: All queries MUST include initiative filtering for security
 */
export class LeadService {
  private readonly logger = createLogger('LeadService');
  
  // Cache field selections since they never change
  private readonly selectClause = buildLeadSelectClause();
  private readonly expandClause = buildLeadExpandClause();
  
  // Retry configuration for D365 API calls
  private readonly retryOptions: RetryOptions = {
    maxRetries: 3,
    initialDelay: 1000,
    backoffFactor: 2,
    retryableStatusCodes: [429, 500, 502, 503, 504],
    logger: (msg, data) => this.logger.debug(`[Retry] ${msg}`, data)
  };
  
  /**
   * Validate organization context is present (fail-secure check)
   * Logs security event if validation fails
   * 
   * @param initiativeFilter - Security filter to validate
   * @param context - Additional context for logging
   * @returns true if valid, false if invalid
   */
  private async validateOrganizationContext(
    initiativeFilter: D365Filter,
    context: { operation: string; resource?: string }
  ): Promise<boolean> {
    if (!initiativeFilter.organizationId) {
      this.logger.warn('Organization ID missing from request context', {
        userId: initiativeFilter.userId,
        initiative: initiativeFilter.initiative,
        operation: context.operation
      });
      
      await auditLogger.logSecurityEvent(SecurityEventType.MISSING_ORGANIZATION_DATA, {
        userId: initiativeFilter.userId || 'unknown',
        initiative: initiativeFilter.initiative,
        errorMessage: 'Organization ID missing from request context',
        resource: context.resource,
        result: 'failure'
      });
      
      return false;
    }
    
    return true;
  }
  
  /**
   * Build D365 request headers
   * 
   * @param token - Bearer token for authorization
   * @returns Headers object for D365 API requests
   */
  private buildD365Headers(token: string): Record<string, string> {
    return {
      'Authorization': `Bearer ${token}`,
      ...D365_HEADERS,
      'Prefer': D365_API_CONFIG.PREFER_ANNOTATIONS
    };
  }
  
  /**
   * Log organization security validation failure
   * 
   * @param initiativeFilter - Security filter that failed validation
   * @param errorType - Type of validation error
   * @param context - Additional context for logging
   */
  private async logOrganizationValidationFailure(
    initiativeFilter: D365Filter,
    errorType: 'INVALID_FORMAT' | 'MISSING_TYPE',
    context: { errorMessage: string }
  ): Promise<void> {
    const logData = {
      organizationLeadType: initiativeFilter.organizationLeadType,
      organizationId: initiativeFilter.organizationId,
      userId: initiativeFilter.userId
    };
    
    this.logger.error(context.errorMessage, undefined, logData);
    
    const eventType = errorType === 'INVALID_FORMAT' 
      ? SecurityEventType.INVALID_ORGANIZATION_TYPE 
      : SecurityEventType.MISSING_ORGANIZATION_DATA;
    
    await auditLogger.logSecurityEvent(eventType, {
      userId: initiativeFilter.userId || 'unknown',
      organizationId: initiativeFilter.organizationId,
      errorMessage: context.errorMessage,
      details: errorType === 'INVALID_FORMAT' 
        ? { organizationLeadType: initiativeFilter.organizationLeadType }
        : undefined
    });
  }
  
  /**
   * Execute D365 query with retry logic
   * 
   * @param url - D365 API URL
   * @param token - Bearer token
   * @param context - Context for error logging
   * @returns Response from D365
   */
  private async executeD365Query(
    url: string,
    token: string,
    context: { userId: string; operation: string; filter?: string }
  ): Promise<Response> {
    return withRetry(
      async () => {
        const response = await fetch(url, {
          method: 'GET',
          headers: this.buildD365Headers(token)
        });
        
        if (!response.ok) {
          const error = await parseD365FetchError(response);
          
          // Don't log 404 as failure for single resource queries
          if (response.status !== 404) {
            await auditLogger.logD365QueryFailed(
              context.userId,
              'tc_everychildleads',
              error,
              context.filter || url
            );
          }
          
          // Create a new error with status code for retry logic instead of mutating
          const retryableError = Object.assign(
            Object.create(Object.getPrototypeOf(error)),
            error,
            { statusCode: response.status }
          );
          throw retryableError;
        }
        
        return response;
      },
      this.retryOptions
    );
  }
  
  /**
   * Get D365 initiative GUID with error handling
   * 
   * @param initiativeId - Application initiative ID (e.g., 'ec-oregon')
   * @returns D365 GUID or throws AppError
   */
  private getD365InitiativeGuid(initiativeId: string): string {
    try {
      return initiativeMappingService.getD365InitiativeGuid(initiativeId);
    } catch (error) {
      this.logger.error('Failed to map initiative to D365 GUID', error, {
        initiative: initiativeId
      });
      // Return a generic error message to avoid exposing internal details
      throw AppError.internal('Invalid initiative configuration');
    }
  }
  
  /**
   * Build user organization context object
   * 
   * @param initiativeFilter - Filter containing organization data
   * @returns Organization object or undefined
   */
  private buildUserOrganization(
    initiativeFilter: D365Filter
  ): { id: string; name: string } | undefined {
    return initiativeFilter.organizationName 
      ? {
          id: initiativeFilter.organizationId!,
          name: initiativeFilter.organizationName
        }
      : undefined;
  }
  
  /**
   * Add active record filter to ensure only non-deleted records are returned
   * @param filters - Array to add filter to
   */
  private applyActiveRecordFilter(filters: string[]): void {
    filters.push(`${D365_LEAD_FIELDS.STATE_CODE} eq ${D365_STATE_CODES.ACTIVE}`);
  }

  /**
   * Apply mandatory initiative security filter
   * CRITICAL: This ensures data isolation between initiatives
   * 
   * @param filters - Array to add filter to
   * @param initiativeFilter - Security context from JWT
   * @throws AppError if initiative is missing
   */
  private applyInitiativeFilter(filters: string[], initiativeFilter: D365Filter): void {
    if (!initiativeFilter.initiative) {
      throw AppError.internal(QUERY_ERROR_MESSAGES.MISSING_INITIATIVE);
    }
    
    const d365InitiativeGuid = this.getD365InitiativeGuid(initiativeFilter.initiative);
    filters.push(`${D365_LEAD_FIELDS.INITIATIVE} eq '${escapeODataString(d365InitiativeGuid)}'`);
  }

  /**
   * Validate organization lead type format
   * Security: Ensures organization type data is valid before using in filters
   * 
   * @param organizationLeadType - Comma-separated organization type values
   * @param initiativeFilter - Security context for logging
   * @throws AppError if format is invalid
   */
  private async validateOrganizationType(
    organizationLeadType: string,
    initiativeFilter: D365Filter
  ): Promise<void> {
    if (!isValidOrganizationLeadType(organizationLeadType)) {
      await this.logOrganizationValidationFailure(
        initiativeFilter,
        'INVALID_FORMAT',
        { errorMessage: 'Invalid organizationLeadType format' }
      );
      throw AppError.badRequest('Invalid organization configuration');
    }
  }

  /**
   * Build organization-based filters for lead assignment
   * Determines which organization fields to filter based on user's organization type
   * 
   * @param initiativeFilter - Security context containing organization info
   * @returns Array of organization filter expressions
   * @throws AppError if organization configuration is invalid
   */
  private async buildOrganizationFilters(initiativeFilter: D365Filter): Promise<string[]> {
    const orgFilters: string[] = [];
    
    if (!initiativeFilter.organizationId) {
      return orgFilters;
    }

    if (!initiativeFilter.organizationLeadType) {
      await this.logOrganizationValidationFailure(
        initiativeFilter,
        'MISSING_TYPE',
        { errorMessage: 'Missing organizationLeadType in JWT' }
      );
      throw AppError.badRequest('Missing organization type configuration');
    }

    // Validate organization type format
    await this.validateOrganizationType(initiativeFilter.organizationLeadType, initiativeFilter);

    // Foster organization filter
    if (hasOrganizationType(initiativeFilter.organizationLeadType, ORGANIZATION_LEAD_TYPE.FOSTER)) {
      orgFilters.push(`${D365_LEAD_FIELDS.FOSTER_ORGANIZATION} eq '${escapeODataString(initiativeFilter.organizationId)}'`);
    }
    
    // Volunteer organization filter (1:N relationship to junction entity)
    if (hasOrganizationType(initiativeFilter.organizationLeadType, ORGANIZATION_LEAD_TYPE.VOLUNTEER)) {
      orgFilters.push(
        `${D365_LEAD_FIELDS.VOLUNTEER_ORG_RELATIONSHIP}/any(o:o/_tc_volunteerorganization_value eq '${escapeODataString(initiativeFilter.organizationId)}')`
      );
    }

    return orgFilters;
  }

  /**
   * Apply user-provided search and filter criteria
   * @param filters - Array to add filters to
   * @param userFilters - Optional user-provided filters
   */
  private applyUserSearchFilters(filters: string[], userFilters?: LeadFilters): void {
    if (!userFilters) return;

    // Search filter (searches across lead name)
    if (userFilters.search) {
      filters.push(buildContainsExpression(D365_LEAD_FIELDS.NAME, userFilters.search));
    }
  }

  /**
   * Handle D365 query errors with proper context and logging
   * @param error - The error that occurred
   * @param context - Context information for debugging
   * @throws AppError with appropriate status code and message
   */
  private async handleD365QueryError(
    error: unknown,
    context: D365ErrorContext
  ): Promise<never> {
    if (error instanceof AppError) {
      // Already properly formatted, just log and rethrow
      this.logger.error(`${context.operation} failed`, error, {
        entity: context.entity,
        userId: context.userId,
        filters: context.filters,
        resource: context.resource
      });
      throw error;
    }

    // Parse D365-specific errors
    if (error && typeof error === 'object' && 'status' in error && typeof (error as any).status === 'number') {
      const parsedError = await parseD365Error(error as Response);
      this.logger.error(formatErrorForLogging(parsedError), undefined, {
        operation: context.operation,
        entity: context.entity,
        userId: context.userId,
        filters: context.filters
      });
      
      // Special handling for specific error codes
      if (parsedError.statusCode === 404) {
        throw AppError.notFound(context.resource || 'Resource');
      } else if (parsedError.statusCode === 403) {
        throw AppError.forbidden('Access denied to requested resource');
      }
      
      throw createAppErrorFromD365(parsedError);
    }

    // Generic error handling
    this.logger.error(`Unexpected error in ${context.operation}`, error, context);
    throw AppError.internal(`Failed to ${context.operation}`);
  }

  /**
   * Build secure OData filter that ALWAYS includes initiative constraint
   * This is the primary security mechanism preventing cross-initiative data access
   * 
   * @param initiativeFilter - Required security filter from middleware
   * @param userFilters - Optional additional filters from the request
   * @returns Combined OData filter string
   */
  private async buildSecureODataFilter(
    initiativeFilter: D365Filter,
    userFilters?: LeadFilters
  ): Promise<string> {
    const filters: string[] = [];
    
    // 1. Always filter for active records only
    this.applyActiveRecordFilter(filters);
    
    // 2. CRITICAL: Always include initiative filter (non-negotiable)
    this.applyInitiativeFilter(filters, initiativeFilter);
    
    // 3. Organization-based assignment filter
    if (initiativeFilter.organizationId) {
      try {
        const orgFilters = await this.buildOrganizationFilters(initiativeFilter);
        if (orgFilters.length > 0) {
          filters.push(`(${orgFilters.join(' or ')})`);
        }
      } catch (error) {
        // Re-throw - error already logged in buildOrganizationFilters
        throw error;
      }
    }
    
    // 4. Add user-provided filters
    this.applyUserSearchFilters(filters, userFilters);
    
    return combineFilters(filters, 'and');
  }
  
  /**
   * Build OData query parameters object for D365 API
   * @param options - Query options for pagination and sorting
   * @param filter - OData filter string
   * @returns OData query parameters object
   */
  private buildODataQueryParams(options: D365QueryOptions, filter?: string): ODataQueryParams {
    const params: ODataQueryParams = {
      $select: this.selectClause,
      $expand: this.expandClause,
      $count: true
    };

    if (filter) {
      params.$filter = filter;
    }

    // Pagination
    if (options.limit) {
      params.$top = Math.min(options.limit, D365_QUERY_DEFAULTS.MAX_PAGE_SIZE);
    }
    if (options.offset) {
      params.$skip = options.offset;
    }

    // Sorting
    if (options.orderBy) {
      const d365Field = mapLeadSortField(options.orderBy);
      if (d365Field) {
        const direction = options.orderDirection === 'asc' ? ' asc' : ' desc';
        params.$orderby = `${d365Field}${direction}`;
      } else {
        this.logger.warn('Unknown sort field, using default', { field: options.orderBy });
        params.$orderby = `${D365_QUERY_DEFAULTS.SORT_FIELD} ${D365_QUERY_DEFAULTS.SORT_ORDER}`;
      }
    } else {
      params.$orderby = `${D365_QUERY_DEFAULTS.SORT_FIELD} ${D365_QUERY_DEFAULTS.SORT_ORDER}`;
    }

    return params;
  }

  /**
   * Build OData query parameters for tc_everychildlead
   * @param options - Query options for pagination and sorting
   * @returns Query string for OData request
   * @deprecated Use buildODataQueryParams instead
   */
  private buildODataQuery(options: D365QueryOptions): string {
    const params: string[] = [];
    
    // Use cached field selections
    params.push(`$select=${this.selectClause}`);
    params.push(`$expand=${this.expandClause}`);
    
    // Pagination
    if (options.limit) {
      params.push(`$top=${Math.min(options.limit, D365_QUERY_DEFAULTS.MAX_PAGE_SIZE)}`);
    }
    if (options.offset) {
      params.push(`$skip=${options.offset}`);
    }
    
    // Sorting
    if (options.orderBy) {
      // Map frontend field names to D365 field names
      const d365Field = mapLeadSortField(options.orderBy);
      if (d365Field) {
        // Always include direction (asc or desc)
        const direction = options.orderDirection === 'asc' ? ' asc' : ' desc';
        params.push(`$orderby=${d365Field}${direction}`);
      } else {
        // If no mapping found, default to modified date
        this.logger.warn('Unknown sort field, using default', { field: options.orderBy });
        params.push(`$orderby=${D365_QUERY_DEFAULTS.SORT_FIELD} ${D365_QUERY_DEFAULTS.SORT_ORDER}`);
      }
    } else {
      // Default sort by modified date
      params.push(`$orderby=${D365_QUERY_DEFAULTS.SORT_FIELD} ${D365_QUERY_DEFAULTS.SORT_ORDER}`);
    }
    
    // Include count for pagination
    params.push('$count=true');
    
    return params.join('&');
  }
  
  /**
   * Map D365 tc_everychildlead to our Lead interface
   * Includes data from expanded lookups with null safety
   * 
   * @param d365Lead - Raw lead data from D365
   * @param userOrganization - User's organization context
   * @returns Mapped Lead object
   */
  private mapD365ToLead(
    d365Lead: D365EveryChildLead,
    userOrganization?: { id: string; name: string }
  ): Lead {
    // Note: We keep the application initiative ID (e.g., 'ec-oregon') in the Lead object
    // rather than the D365 GUID for consistency with the rest of the application
    const initiativeId = getInitiativeIdFromGuid(d365Lead._tc_initiative_value || '');
    
    if (!initiativeId && d365Lead._tc_initiative_value) {
      this.logger.warn('Unknown D365 initiative GUID', {
        leadId: d365Lead.tc_everychildleadid,
        unknownGuid: d365Lead._tc_initiative_value
      });
    }
    
    return {
      id: d365Lead.tc_everychildleadid,
      name: d365Lead.tc_name || '',
      
      // Subject information from expanded tc_Contact navigation property
      // Note: Navigation properties use PascalCase in D365 responses
      subjectName: d365Lead.tc_Contact?.fullname,
      subjectEmail: d365Lead.tc_Contact?.emailaddress1,
      
      // Lead owner from expanded tc_LeadOwner navigation property
      leadOwnerName: d365Lead.tc_LeadOwner?.fullname,
      
      // Lead Details
      status: mapLeadStatus(d365Lead.tc_ecleadlifecyclestatus) as LeadStatus,
      type: mapLeadType(d365Lead.tc_engagementinterest) as LeadType,
      leadScore: d365Lead.tc_leadscore2,
      engagementInterest: d365Lead.tc_engagementinterest,
      
      // Organization assignment from JWT context
      assignedOrganizationId: userOrganization?.id,
      assignedOrganizationName: userOrganization?.name,
      
      // Initiative and timestamps
      initiativeId: initiativeId || '',
      createdAt: new Date(d365Lead.createdon),
      updatedAt: new Date(d365Lead.modifiedon)
    };
  }
  
  /**
   * Get leads with mandatory initiative filtering
   * 
   * @param initiativeFilter - Security filter from middleware (REQUIRED)
   * @param filters - Optional additional filters
   * @param options - Query options for pagination/sorting
   * @returns Paginated lead results
   */
  async getLeads(
    initiativeFilter: D365Filter,
    filters?: LeadFilters,
    options: D365QueryOptions = {}
  ): Promise<D365QueryResult<Lead>> {
    try {
      // CRITICAL: Fail-secure check - require organization ID
      const isValid = await this.validateOrganizationContext(initiativeFilter, {
        operation: 'getLeads'
      });
      
      if (!isValid) {
        return { value: [], totalCount: 0 };
      }
      
      // Get D365 access token
      const token = await d365Service.getAccessToken();
      if (!token) {
        throw AppError.internal('Unable to authenticate with D365');
      }
      
      // Build secure filter
      let oDataFilter: string;
      try {
        oDataFilter = await this.buildSecureODataFilter(initiativeFilter, filters);
      } catch (error) {
        // Handle security validation errors
        if (error instanceof AppError && error.statusCode === 400) {
          // Return empty results for invalid configuration
          return { value: [], totalCount: 0 };
        }
        throw error;
      }
      // Log query for audit (without token)
      this.logger.info('Querying leads with filter', {
        initiative: initiativeFilter.initiative,
        organization: initiativeFilter.organizationId,
        organizationType: initiativeFilter.organizationLeadType,
        additionalFilters: filters,
        oDataFilter
      });
      
      // Log query for security audit
      await auditLogger.logD365FilterApplied(
        initiativeFilter.userId || 'unknown',
        initiativeFilter.initiative,
        {
          organization: initiativeFilter.organizationId,
          organizationType: initiativeFilter.organizationLeadType,
          additionalFilters: filters,
          oDataFilter
        },
        `GET /api/v1/leads`
      );
      
      // Build D365 query URL with all parameters
      const queryParams = this.buildODataQueryParams(options, oDataFilter);
      const url = buildD365Url(
        process.env.D365_URL!, 
        'tc_everychildleads',
        undefined,
        queryParams
      );
      
      // Log the full query for debugging (without sensitive token)
      this.logger.info('D365 Query URL', { url: url.replace(process.env.D365_URL!, '[D365_URL]') });
      
      // Execute query with retry logic
      const response = await this.executeD365Query(url, token, {
        userId: initiativeFilter.userId || 'unknown',
        operation: 'getLeads',
        filter: oDataFilter
      });
      
      const data = await response.json() as D365LeadQueryResponse;
      
      // Map results with user organization context
      const userOrganization = this.buildUserOrganization(initiativeFilter);
      
      const leads = data.value.map((lead: D365EveryChildLead) => 
        this.mapD365ToLead(lead, userOrganization)
      );
      
      // Log successful query for audit
      await auditLogger.logD365QueryExecuted(
        initiativeFilter.userId || 'unknown',
        'tc_everychildleads',
        oDataFilter,
        data.value.length
      );
      
      return {
        value: leads,
        totalCount: data['@odata.count'],
        nextLink: data['@odata.nextLink']
      };
    } catch (error) {
      await this.handleD365QueryError(error, {
        operation: 'fetch leads',
        entity: 'tc_everychildleads',
        userId: initiativeFilter.userId || 'unknown',
        filters: { initiativeFilter, userFilters: filters }
      });
    }
  }
  
  /**
   * Get a single lead by ID with initiative verification
   * 
   * @param initiativeFilter - Security filter from middleware
   * @param leadId - D365 tc_everychildlead ID
   * @returns Lead if found and user has access
   */
  async getLeadById(
    initiativeFilter: D365Filter,
    leadId: string
  ): Promise<Lead | null> {
    try {
      // CRITICAL: Fail-secure check - require organization ID
      const isValid = await this.validateOrganizationContext(initiativeFilter, {
        operation: 'getLeadById',
        resource: `lead:${leadId}`
      });
      
      if (!isValid) {
        return null;
      }
      
      // Get D365 access token
      const token = await d365Service.getAccessToken();
      if (!token) {
        throw AppError.internal('Unable to authenticate with D365');
      }
      
      // Build URL using consistent utility
      const queryOptions: ODataQueryParams = {
        $select: this.selectClause,
        $expand: this.expandClause
      };
      
      const url = buildD365Url(process.env.D365_URL!, 'tc_everychildleads', leadId, queryOptions);
      
      // Execute query with retry logic
      let response: Response;
      try {
        response = await this.executeD365Query(url, token, {
          userId: initiativeFilter.userId || 'unknown',
          operation: 'getLeadById',
          filter: `Lead ID: ${leadId}`
        });
      } catch (error) {
        // Handle 404 as null return (not found)
        if (error instanceof AppError && error.statusCode === 404) {
          return null;
        }
        throw error;
      }
      
      const d365Lead = await response.json() as D365EveryChildLead;
      
      // CRITICAL: Verify the lead belongs to the user's initiative
      // Convert initiative ID to D365 GUID for comparison
      let expectedD365Guid: string;
      try {
        expectedD365Guid = this.getD365InitiativeGuid(initiativeFilter.initiative);
      } catch (error) {
        this.logger.error('Failed to validate initiative for lead access', undefined, {
          initiative: initiativeFilter.initiative,
          leadId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        // Fail securely - deny access if we can't validate
        return null;
      }
      
      if (d365Lead._tc_initiative_value !== expectedD365Guid) {
        this.logger.warn('Cross-initiative access attempt', {
          userId: initiativeFilter.userId,
          requestedLead: leadId,
          leadInitiative: d365Lead._tc_initiative_value,
          userInitiative: initiativeFilter.initiative,
          expectedGuid: expectedD365Guid
        });
        await auditLogger.logCrossInitiativeAttempt(
          initiativeFilter.userId || 'unknown',
          initiativeFilter.initiative,
          `lead:${leadId}`,
          getInitiativeIdFromGuid(d365Lead._tc_initiative_value || '') || 'unknown'
        );
        return null; // Return null as if not found - don't reveal it exists
      }
      
      // Map result with user organization context
      const userOrganization = this.buildUserOrganization(initiativeFilter);
      
      return this.mapD365ToLead(d365Lead, userOrganization);
    } catch (error) {
      await this.handleD365QueryError(error, {
        operation: 'fetch lead',
        entity: 'tc_everychildleads',
        userId: initiativeFilter.userId || 'unknown',
        resource: `lead:${leadId}`
      });
    }
  }
  
}

// Export singleton instance
export const leadService = new LeadService();