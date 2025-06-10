import { d365Service } from './d365.service';
import { AppError } from '../utils/errors';
import type { 
  D365Filter, 
  D365QueryOptions, 
  D365QueryResult, 
  D365Lead 
} from '../types/d365.types';
import type { Lead, LeadFilters, LeadStatus, LeadType } from '@partner-portal/shared';

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
    
    // CRITICAL: Always include initiative filter first (non-negotiable)
    if (!initiativeFilter.initiative) {
      throw new AppError('Initiative filter is required for all queries', 500);
    }
    filters.push(`tc_initiative eq '${this.escapeODataString(initiativeFilter.initiative)}'`);
    
    // Add organization filter if available
    if (initiativeFilter.organizationId) {
      filters.push(`_tc_assignedorganization_value eq '${initiativeFilter.organizationId}'`);
    }
    
    // Add user-provided filters
    if (userFilters) {
      // Status filter
      if (userFilters.status) {
        const statuses = Array.isArray(userFilters.status) ? userFilters.status : [userFilters.status];
        const statusFilters = statuses.map(s => `tc_leadstatus eq '${this.escapeODataString(s)}'`);
        if (statusFilters.length > 0) {
          filters.push(`(${statusFilters.join(' or ')})`);
        }
      }
      
      // Type filter
      if (userFilters.type) {
        const types = Array.isArray(userFilters.type) ? userFilters.type : [userFilters.type];
        const typeFilters = types.map(t => `tc_leadtype eq '${this.escapeODataString(t)}'`);
        if (typeFilters.length > 0) {
          filters.push(`(${typeFilters.join(' or ')})`);
        }
      }
      
      // Assigned to filter
      if (userFilters.assignedToId) {
        filters.push(`_ownerid_value eq '${userFilters.assignedToId}'`);
      }
      
      // Priority filter
      if (userFilters.priority) {
        filters.push(`tc_priority eq '${this.escapeODataString(userFilters.priority)}'`);
      }
      
      // Search filter (searches across name and email)
      if (userFilters.search) {
        const searchTerm = this.escapeODataString(userFilters.search);
        filters.push(`(contains(firstname, '${searchTerm}') or contains(lastname, '${searchTerm}') or contains(emailaddress1, '${searchTerm}'))`);
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
   * Build OData query parameters
   */
  private buildODataQuery(options: D365QueryOptions): string {
    const params: string[] = [];
    
    // Select fields
    const selectFields = [
      'contactid',
      'firstname',
      'lastname',
      'fullname',
      'emailaddress1',
      'telephone1',
      'telephone2',
      'address1_line1',
      'address1_line2',
      'address1_city',
      'address1_stateorprovince',
      'address1_postalcode',
      'address1_country',
      'tc_initiative',
      'tc_leadstatus',
      'tc_leadtype',
      'tc_priority',
      'tc_source',
      'tc_notes',
      'tc_tags',
      '_ownerid_value',
      '_tc_assignedorganization_value',
      'createdon',
      'modifiedon',
      'tc_lastcontactedon',
      'tc_assignedon'
    ];
    params.push(`$select=${selectFields.join(',')}`);
    
    // Pagination
    if (options.limit) {
      params.push(`$top=${options.limit}`);
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
   * Map D365 contact to our Lead interface
   */
  private mapD365ToLead(d365Contact: D365Lead): Lead {
    return {
      id: d365Contact.contactid,
      d365Id: d365Contact.contactid,
      initiativeId: d365Contact.tc_initiative,
      
      // Contact info
      firstName: d365Contact.firstname || '',
      lastName: d365Contact.lastname || '',
      displayName: `${d365Contact.firstname || ''} ${d365Contact.lastname || ''}`.trim(),
      email: d365Contact.emailaddress1,
      phoneNumber: d365Contact.telephone1,
      alternatePhone: d365Contact.telephone2,
      
      // Address
      address: (d365Contact.address1_line1 || d365Contact.address1_city) ? {
        street1: d365Contact.address1_line1 || '',
        street2: d365Contact.address1_line2,
        city: d365Contact.address1_city || '',
        state: d365Contact.address1_stateorprovince || '',
        zipCode: d365Contact.address1_postalcode || '',
        country: d365Contact.address1_country || 'USA'
      } : undefined,
      
      // Lead details
      status: (d365Contact.tc_leadstatus as LeadStatus) || 'new',
      type: (d365Contact.tc_leadtype as LeadType) || 'other',
      source: d365Contact.tc_source,
      priority: d365Contact.tc_priority as 'low' | 'medium' | 'high' | undefined,
      
      // Assignment
      assignedToId: d365Contact._ownerid_value,
      assignedOrganizationId: d365Contact._tc_assignedorganization_value,
      
      // Metadata
      notes: d365Contact.tc_notes,
      tags: d365Contact.tc_tags ? d365Contact.tc_tags.split(',').map(t => t.trim()) : undefined,
      
      // Timestamps
      createdAt: new Date(d365Contact.createdon),
      updatedAt: new Date(d365Contact.modifiedon),
      lastContactedAt: d365Contact.tc_lastcontactedon ? new Date(d365Contact.tc_lastcontactedon) : undefined,
      assignedAt: d365Contact.tc_assignedon ? new Date(d365Contact.tc_assignedon) : undefined
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
        additionalFilters: filters,
        oDataFilter
      });
      
      // Query D365
      const url = `${process.env.D365_URL}/api/data/v9.2/contacts?$filter=${oDataFilter}&${queryParams}`;
      
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
        value: D365Lead[]; 
        '@odata.count'?: number; 
        '@odata.nextLink'?: string 
      };
      
      // Map results
      const leads = data.value.map((contact: D365Lead) => this.mapD365ToLead(contact));
      
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
   * @param leadId - D365 Contact ID
   * @returns Lead if found and user has access
   */
  async getLeadById(
    initiativeFilter: D365Filter,
    leadId: string
  ): Promise<Lead | null> {
    try {
      // Get D365 access token
      const token = await d365Service.getAccessToken();
      if (!token) {
        throw new AppError('Unable to authenticate with D365', 500);
      }
      
      // Query specific lead
      const selectFields = [
        'contactid',
        'firstname',
        'lastname',
        'fullname',
        'emailaddress1',
        'telephone1',
        'telephone2',
        'address1_line1',
        'address1_line2',
        'address1_city',
        'address1_stateorprovince',
        'address1_postalcode',
        'address1_country',
        'tc_initiative',
        'tc_leadstatus',
        'tc_leadtype',
        'tc_priority',
        'tc_source',
        'tc_notes',
        'tc_tags',
        '_ownerid_value',
        '_tc_assignedorganization_value',
        'createdon',
        'modifiedon',
        'tc_lastcontactedon',
        'tc_assignedon'
      ];
      
      const url = `${process.env.D365_URL}/api/data/v9.2/contacts(${leadId})?$select=${selectFields.join(',')}`;
      
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
      
      const d365Lead = await response.json() as D365Lead;
      
      // CRITICAL: Verify the lead belongs to the user's initiative
      if (d365Lead.tc_initiative !== initiativeFilter.initiative) {
        console.warn('[LeadService] Cross-initiative access attempt:', {
          userId: initiativeFilter.userId,
          requestedLead: leadId,
          leadInitiative: d365Lead.tc_initiative,
          userInitiative: initiativeFilter.initiative
        });
        return null; // Return null as if not found - don't reveal it exists
      }
      
      return this.mapD365ToLead(d365Lead);
    } catch (error) {
      console.error('[LeadService] Error fetching lead:', error);
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to fetch lead', 500);
    }
  }
  
  /**
   * Update a lead with initiative verification
   * 
   * @param initiativeFilter - Security filter from middleware
   * @param leadId - D365 Contact ID
   * @param updates - Fields to update
   * @returns Updated lead if successful
   */
  async updateLead(
    initiativeFilter: D365Filter,
    leadId: string,
    updates: Partial<Lead>
  ): Promise<Lead> {
    try {
      // First, verify the lead exists and user has access
      const existingLead = await this.getLeadById(initiativeFilter, leadId);
      if (!existingLead) {
        throw new AppError('Lead not found', 404);
      }
      
      // Get D365 access token
      const token = await d365Service.getAccessToken();
      if (!token) {
        throw new AppError('Unable to authenticate with D365', 500);
      }
      
      // Build D365 update payload
      const d365Updates: any = {};
      
      if (updates.firstName !== undefined) d365Updates.firstname = updates.firstName;
      if (updates.lastName !== undefined) d365Updates.lastname = updates.lastName;
      if (updates.email !== undefined) d365Updates.emailaddress1 = updates.email;
      if (updates.phoneNumber !== undefined) d365Updates.telephone1 = updates.phoneNumber;
      if (updates.alternatePhone !== undefined) d365Updates.telephone2 = updates.alternatePhone;
      
      if (updates.status !== undefined) d365Updates.tc_leadstatus = updates.status;
      if (updates.type !== undefined) d365Updates.tc_leadtype = updates.type;
      if (updates.priority !== undefined) d365Updates.tc_priority = updates.priority;
      if (updates.source !== undefined) d365Updates.tc_source = updates.source;
      if (updates.notes !== undefined) d365Updates.tc_notes = updates.notes;
      
      if (updates.tags !== undefined) {
        d365Updates.tc_tags = updates.tags.join(', ');
      }
      
      if (updates.address) {
        d365Updates.address1_line1 = updates.address.street1;
        d365Updates.address1_line2 = updates.address.street2;
        d365Updates.address1_city = updates.address.city;
        d365Updates.address1_stateorprovince = updates.address.state;
        d365Updates.address1_postalcode = updates.address.zipCode;
        d365Updates.address1_country = updates.address.country;
      }
      
      // Update in D365
      const url = `${process.env.D365_URL}/api/data/v9.2/contacts(${leadId})`;
      
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0',
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(d365Updates)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[LeadService] D365 update failed:', response.status, errorText);
        throw new AppError('Failed to update lead in D365', response.status);
      }
      
      // Return the updated lead
      const updated = await this.getLeadById(initiativeFilter, leadId);
      if (!updated) {
        throw new AppError('Failed to retrieve updated lead', 500);
      }
      
      return updated;
    } catch (error) {
      console.error('[LeadService] Error updating lead:', error);
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to update lead', 500);
    }
  }
}

// Export singleton instance
export const leadService = new LeadService();