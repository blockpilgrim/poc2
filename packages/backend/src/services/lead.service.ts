import { d365Service } from './d365.service';
import { initiativeMappingService } from './initiative-mapping.service';
import { getInitiativeIdFromGuid } from '../config/initiatives.config';
import { AppError } from '../utils/errors';
import type { 
  D365Filter, 
  D365QueryOptions, 
  D365QueryResult
} from '../types/d365.types';
import type { Lead, LeadFilters } from '@partner-portal/shared';
import { 
  D365_LEAD_FIELDS,
  ORGANIZATION_LEAD_TYPE,
  hasOrganizationType,
  mapLeadStatus,
  mapLeadType
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
  // Expanded entities
  tc_contact?: {
    fullname?: string;
    emailaddress1?: string;
  };
  tc_leadowner?: {
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
          console.warn('[LeadService] Invalid organizationLeadType format:', {
            organizationLeadType: initiativeFilter.organizationLeadType,
            organizationId: initiativeFilter.organizationId
          });
        } else {
          // Foster organization filter
          if (hasOrganizationType(initiativeFilter.organizationLeadType, ORGANIZATION_LEAD_TYPE.FOSTER)) {
            orgFilters.push(`_tc_fosterorganization_value eq '${initiativeFilter.organizationId}'`);
          }
          
          // Volunteer organization filter (many-to-many relationship)
          if (hasOrganizationType(initiativeFilter.organizationLeadType, ORGANIZATION_LEAD_TYPE.VOLUNTEER)) {
            orgFilters.push(`tc_eclead_tc_ecleadsvolunteerorg_eclead/any(o:o/_tc_volunteerorganization_value eq '${initiativeFilter.organizationId}')`);
          }
        }
      } else {
        // If no organizationLeadType, default to foster organization filter for backward compatibility
        console.warn('[LeadService] No organizationLeadType provided, defaulting to foster filter');
        orgFilters.push(`_tc_fosterorganization_value eq '${initiativeFilter.organizationId}'`);
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
      D365_LEAD_FIELDS.FOSTER_ORGANIZATION
    ];
    params.push(`$select=${selectFields.join(',')}`);
    
    // Expand related entities
    params.push(`$expand=${D365_LEAD_FIELDS.CONTACT}($select=${D365_LEAD_FIELDS.CONTACT_FULLNAME},${D365_LEAD_FIELDS.CONTACT_EMAIL}),${D365_LEAD_FIELDS.LEAD_OWNER}($select=${D365_LEAD_FIELDS.CONTACT_FULLNAME})`);
    
    // Pagination
    if (options.limit) {
      params.push(`$top=${Math.min(options.limit, 100)}`); // Cap at 100 for performance
    }
    if (options.offset) {
      params.push(`$skip=${options.offset}`);
    }
    
    // Sorting
    if (options.orderBy) {
      const direction = options.orderDirection === 'desc' ? ' desc' : '';
      params.push(`$orderby=${options.orderBy}${direction}`);
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
    // Map tc_everychildlead to existing Lead interface
    // This is a temporary mapping until Step 2 updates the shared types
    const [firstName = '', lastName = ''] = (d365Lead.tc_contact?.fullname || '').split(' ', 2);
    
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
      d365Id: d365Lead.tc_everychildleadid,
      initiativeId: initiativeId || '',
      
      // Contact Information (from expanded tc_contact)
      firstName,
      lastName,
      displayName: d365Lead.tc_contact?.fullname || d365Lead.tc_name || '',
      email: d365Lead.tc_contact?.emailaddress1,
      
      // Lead Details
      status: mapLeadStatus(d365Lead.tc_ecleadlifecyclestatus) as any,
      type: mapLeadType(d365Lead.tc_engagementinterest) as any,
      
      // Assignment
      assignedOrganizationId: userOrganization?.id,
      assignedOrganizationName: userOrganization?.name,
      assignedToName: d365Lead.tc_leadowner?.fullname,
      
      // Metadata
      notes: `Lead: ${d365Lead.tc_name}${d365Lead.tc_leadscore2 ? ` (Score: ${d365Lead.tc_leadscore2})` : ''}`,
      
      // Timestamps
      createdAt: new Date(d365Lead.createdon),
      updatedAt: new Date(d365Lead.modifiedon)
    } as Lead;
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
      const oDataFilter = this.buildSecureODataFilter(initiativeFilter, filters);
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
        D365_LEAD_FIELDS.FOSTER_ORGANIZATION
      ];
      
      const expandClause = `$expand=${D365_LEAD_FIELDS.CONTACT}($select=${D365_LEAD_FIELDS.CONTACT_FULLNAME},${D365_LEAD_FIELDS.CONTACT_EMAIL}),${D365_LEAD_FIELDS.LEAD_OWNER}($select=${D365_LEAD_FIELDS.CONTACT_FULLNAME})`;
      
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