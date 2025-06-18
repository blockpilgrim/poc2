import { d365Service } from './d365.service';
import { initiativeMappingService } from './initiative-mapping.service';
import { getInitiativeIdFromGuid } from '../config/initiatives.config';
import { AppError } from '../utils/errors';
import type { 
  D365Filter, 
  D365QueryOptions, 
  D365QueryResult
} from '../types/d365.types';
import type { Lead, LeadFilters, LeadStatus, LeadType } from '@partner-portal/shared';
import { 
  D365_LEAD_FIELDS,
  ORGANIZATION_LEAD_TYPE,
  hasOrganizationType,
  mapLeadStatus,
  mapLeadType,
  mapSortField
} from '../constants/d365-mappings';

// Type for tc_everychildlead response
interface D365EveryChildLead {
  tc_everychildleadid: string;
  tc_name: string;
  tc_ecleadlifecyclestatus?: number;
  tc_engagementinterest?: number;
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
 * Lead Service
 * Handles all lead-related operations with D365
 * CRITICAL: All queries MUST include initiative filtering for security
 */
export class LeadService {
  /**
   * Build secure OData filter that ALWAYS includes initiative constraint
   * This is the primary security mechanism preventing cross-initiative data access
   * 
   * @param initiativeFilter - Required security filter from middleware
   * @param userFilters - Optional additional filters from the request
   * @returns Combined OData filter string
   */
  private buildSecureODataFilter(
    initiativeFilter: D365Filter,
    userFilters?: LeadFilters
  ): string {
    const filters: string[] = [];
    
    // 1. Always filter for active records only
    filters.push('statecode eq 0');
    
    // 2. CRITICAL: Always include initiative filter (non-negotiable)
    if (!initiativeFilter.initiative) {
      throw new AppError('Initiative filter is required for all queries', 500);
    }
    
    // Convert initiative ID to D365 GUID
    let d365InitiativeGuid: string;
    try {
      d365InitiativeGuid = initiativeMappingService.getD365InitiativeGuid(initiativeFilter.initiative);
    } catch (error) {
      console.error('[LeadService] Failed to map initiative to D365 GUID:', {
        initiative: initiativeFilter.initiative,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      // Return empty results rather than exposing internal error
      throw new AppError('Invalid initiative configuration', 500);
    }
    
    filters.push(`_tc_initiative_value eq '${this.escapeODataString(d365InitiativeGuid)}'`);
    
    // 3. Organization-based assignment filter
    // CRITICAL: Use organizationLeadType from JWT to determine correct filter
    if (initiativeFilter.organizationId) {
      const orgFilters: string[] = [];
      
      // Validate organizationLeadType format if present
      if (initiativeFilter.organizationLeadType) {
        // Validate format: should be comma-separated numbers
        const validPattern = /^\d+(,\d+)*$/;
        if (!validPattern.test(initiativeFilter.organizationLeadType)) {
          console.error('[LeadService] Invalid organizationLeadType format:', {
            organizationLeadType: initiativeFilter.organizationLeadType,
            organizationId: initiativeFilter.organizationId,
            userId: initiativeFilter.userId
          });
          // Security: Return empty results for invalid data
          throw new AppError('Invalid organization configuration', 400);
        }
        
        // Foster organization filter
        if (hasOrganizationType(initiativeFilter.organizationLeadType, ORGANIZATION_LEAD_TYPE.FOSTER)) {
          orgFilters.push(`_tc_fosterorganization_value eq '${initiativeFilter.organizationId}'`);
        }
        
        // Volunteer organization filter (1:N relationship to junction entity)
        if (hasOrganizationType(initiativeFilter.organizationLeadType, ORGANIZATION_LEAD_TYPE.VOLUNTEER)) {
          orgFilters.push(`${D365_LEAD_FIELDS.VOLUNTEER_ORG_RELATIONSHIP}/any(o:o/_tc_volunteerorganization_value eq '${initiativeFilter.organizationId}')`);
        }
      } else {
        // Security: No organizationLeadType means the user's JWT is incomplete
        console.error('[LeadService] Missing organizationLeadType in JWT:', {
          organizationId: initiativeFilter.organizationId,
          userId: initiativeFilter.userId
        });
        // Throw error to be handled by getLeads
        throw new AppError('Missing organization type configuration', 400);
      }
      
      if (orgFilters.length > 0) {
        filters.push(`(${orgFilters.join(' or ')})`);
      }
    }
    
    // Add user-provided filters
    if (userFilters) {
      // Search filter (searches across lead name)
      if (userFilters.search) {
        const searchTerm = this.escapeODataString(userFilters.search);
        filters.push(`contains(tc_name, '${searchTerm}')`);
      }
    }
    
    return filters.join(' and ');
  }
  
  /**
   * Escape string for safe use in OData queries
   * Prevents injection attacks
   */
  private escapeODataString(value: string): string {
    return value.replace(/'/g, "''");
  }
  
  /**
   * Build OData query parameters for tc_everychildlead
   */
  private buildODataQuery(options: D365QueryOptions): string {
    const params: string[] = [];
    
    // Select fields from tc_everychildlead
    const selectFields = [
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
      D365_LEAD_FIELDS.LEAD_OWNER_VALUE
    ];
    params.push(`$select=${selectFields.join(',')}`);
    
    // Expand related entities using PascalCase navigation properties
    // D365 Web API requires PascalCase for navigation properties in $expand
    const expandParts: string[] = [];
    
    // Expand contact with selected fields
    expandParts.push(
      `${D365_LEAD_FIELDS.CONTACT_NAV}($select=${D365_LEAD_FIELDS.CONTACT_FIELDS.FULLNAME},${D365_LEAD_FIELDS.CONTACT_FIELDS.EMAIL})`
    );
    
    // Expand lead owner with selected fields
    expandParts.push(
      `${D365_LEAD_FIELDS.LEAD_OWNER_NAV}($select=${D365_LEAD_FIELDS.CONTACT_FIELDS.FULLNAME})`
    );
    
    params.push(`$expand=${expandParts.join(',')}`);
    
    // Pagination
    if (options.limit) {
      params.push(`$top=${Math.min(options.limit, 100)}`); // Cap at 100 for performance
    }
    if (options.offset) {
      params.push(`$skip=${options.offset}`);
    }
    
    // Sorting
    if (options.orderBy) {
      // Map frontend field names to D365 field names
      const d365Field = mapSortField(options.orderBy);
      if (d365Field) {
        // Always include direction (asc or desc)
        const direction = options.orderDirection === 'asc' ? ' asc' : ' desc';
        params.push(`$orderby=${d365Field}${direction}`);
      } else {
        // If no mapping found, default to modified date
        console.warn('[LeadService] Unknown sort field, using default:', options.orderBy);
        params.push('$orderby=modifiedon desc');
      }
    } else {
      // Default sort by modified date
      params.push('$orderby=modifiedon desc');
    }
    
    // Include count for pagination
    params.push('$count=true');
    
    return params.join('&');
  }
  
  /**
   * Map D365 tc_everychildlead to our Lead interface
   * Includes data from expanded lookups with null safety
   */
  private mapD365ToLead(
    d365Lead: D365EveryChildLead,
    userOrganization?: { id: string; name: string }
  ): Lead {
    // Note: We keep the application initiative ID (e.g., 'ec-oregon') in the Lead object
    // rather than the D365 GUID for consistency with the rest of the application
    const initiativeId = getInitiativeIdFromGuid(d365Lead._tc_initiative_value || '');
    
    if (!initiativeId && d365Lead._tc_initiative_value) {
      console.warn('[LeadService] Unknown D365 initiative GUID:', {
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
      if (!initiativeFilter.organizationId) {
        console.warn('[LeadService] Organization ID missing from request context', {
          userId: initiativeFilter.userId,
          initiative: initiativeFilter.initiative
        });
        return { value: [], totalCount: 0 };
      }
      
      // Get D365 access token
      const token = await d365Service.getAccessToken();
      if (!token) {
        throw new AppError('Unable to authenticate with D365', 500);
      }
      
      // Build secure filter
      let oDataFilter: string;
      try {
        oDataFilter = this.buildSecureODataFilter(initiativeFilter, filters);
      } catch (error) {
        // Handle security validation errors
        if (error instanceof AppError && error.statusCode === 400) {
          // Return empty results for invalid configuration
          return { value: [], totalCount: 0 };
        }
        throw error;
      }
      const queryParams = this.buildODataQuery(options);
      
      // Log query for audit (without token)
      console.log('[LeadService] Querying leads with filter:', {
        initiative: initiativeFilter.initiative,
        organization: initiativeFilter.organizationId,
        organizationType: initiativeFilter.organizationLeadType,
        additionalFilters: filters,
        oDataFilter
      });
      
      // Query D365 - CHANGED: Now querying tc_everychildleads
      const url = `${process.env.D365_URL}/api/data/v9.2/tc_everychildleads?$filter=${oDataFilter}&${queryParams}`;
      
      // Log the full query for debugging (without sensitive token)
      console.log('[LeadService] D365 Query URL:', url.replace(process.env.D365_URL!, '[D365_URL]'));
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0',
          'Accept': 'application/json',
          'Prefer': 'odata.include-annotations="*"'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[LeadService] D365 query failed:', response.status, errorText);
        throw new AppError('Failed to fetch leads from D365', response.status);
      }
      
      const data = await response.json() as { 
        value: D365EveryChildLead[]; 
        '@odata.count'?: number; 
        '@odata.nextLink'?: string 
      };
      
      // Map results with user organization context
      const userOrganization = initiativeFilter.organizationName ? {
        id: initiativeFilter.organizationId,
        name: initiativeFilter.organizationName
      } : undefined;
      
      const leads = data.value.map((lead: D365EveryChildLead) => 
        this.mapD365ToLead(lead, userOrganization)
      );
      
      return {
        value: leads,
        totalCount: data['@odata.count'],
        nextLink: data['@odata.nextLink']
      };
    } catch (error) {
      console.error('[LeadService] Error fetching leads:', error);
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to fetch leads', 500);
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
      if (!initiativeFilter.organizationId) {
        console.warn('[LeadService] Organization ID missing from request context', {
          userId: initiativeFilter.userId,
          initiative: initiativeFilter.initiative
        });
        return null;
      }
      
      // Get D365 access token
      const token = await d365Service.getAccessToken();
      if (!token) {
        throw new AppError('Unable to authenticate with D365', 500);
      }
      
      // Query specific lead with expanded lookups
      const selectFields = [
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
        D365_LEAD_FIELDS.LEAD_OWNER_VALUE
      ];
      
      // Expand related entities using PascalCase navigation properties
      const expandParts: string[] = [];
      expandParts.push(
        `${D365_LEAD_FIELDS.CONTACT_NAV}($select=${D365_LEAD_FIELDS.CONTACT_FIELDS.FULLNAME},${D365_LEAD_FIELDS.CONTACT_FIELDS.EMAIL})`
      );
      expandParts.push(
        `${D365_LEAD_FIELDS.LEAD_OWNER_NAV}($select=${D365_LEAD_FIELDS.CONTACT_FIELDS.FULLNAME})`
      );
      const expandClause = `$expand=${expandParts.join(',')}`;
      
      const url = `${process.env.D365_URL}/api/data/v9.2/tc_everychildleads(${leadId})?$select=${selectFields.join(',')}&${expandClause}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0',
          'Accept': 'application/json'
        }
      });
      
      if (response.status === 404) {
        return null;
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[LeadService] D365 query failed:', response.status, errorText);
        throw new AppError('Failed to fetch lead from D365', response.status);
      }
      
      const d365Lead = await response.json() as D365EveryChildLead;
      
      // CRITICAL: Verify the lead belongs to the user's initiative
      // Convert initiative ID to D365 GUID for comparison
      let expectedD365Guid: string;
      try {
        expectedD365Guid = initiativeMappingService.getD365InitiativeGuid(initiativeFilter.initiative);
      } catch (error) {
        console.error('[LeadService] Failed to validate initiative for lead access:', {
          initiative: initiativeFilter.initiative,
          leadId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        // Fail securely - deny access if we can't validate
        return null;
      }
      
      if (d365Lead._tc_initiative_value !== expectedD365Guid) {
        console.warn('[LeadService] Cross-initiative access attempt:', {
          userId: initiativeFilter.userId,
          requestedLead: leadId,
          leadInitiative: d365Lead._tc_initiative_value,
          userInitiative: initiativeFilter.initiative,
          expectedGuid: expectedD365Guid
        });
        return null; // Return null as if not found - don't reveal it exists
      }
      
      // Map result with user organization context
      const userOrganization = initiativeFilter.organizationName ? {
        id: initiativeFilter.organizationId,
        name: initiativeFilter.organizationName
      } : undefined;
      
      return this.mapD365ToLead(d365Lead, userOrganization);
    } catch (error) {
      console.error('[LeadService] Error fetching lead:', error);
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to fetch lead', 500);
    }
  }
  
}

// Export singleton instance
export const leadService = new LeadService();