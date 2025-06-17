/**
 * Lead Service (Refactored)
 * Orchestrates lead operations using specialized D365 services
 */

import { AppError } from '../utils/errors';
import type { D365Filter, D365QueryOptions, D365QueryResult } from '../types/d365.types';
import type { Lead, LeadFilters } from '@partner-portal/shared';
import { d365Client } from './d365/d365-client.service';
import { d365QueryBuilder } from './d365/d365-query-builder.service';
import { d365LeadMapper } from './d365/d365-lead-mapper.service';
import { D365_ENTITIES } from '../constants/d365/entities';
import { LEAD_SELECT_FIELDS } from '../constants/d365/field-mappings';

/**
 * Lead Service
 * High-level service for lead management operations
 * Delegates technical concerns to specialized services
 */
export class LeadService {
  private readonly entity = D365_ENTITIES.CONTACT;

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
      // Ensure D365 client is configured
      if (!d365Client.isConfigured()) {
        throw new AppError('D365 service not configured', 500);
      }

      // Build query with security filters
      const queryParams = d365QueryBuilder.buildQueryParams(
        d365QueryBuilder.buildSecureFilter(initiativeFilter, filters),
        {
          ...options,
          select: options.select || LEAD_SELECT_FIELDS,
        }
      );

      // Log query for audit
      this.logQuery('getLeads', initiativeFilter, filters, queryParams);

      // Execute query
      const response = await d365Client.query<any>(
        this.entity,
        queryParams
      );

      // Map results
      const leads = d365LeadMapper.mapToLeads(response.value);

      return {
        value: leads,
        totalCount: response['@odata.count'],
        nextLink: response['@odata.nextLink']
      };
    } catch (error) {
      this.handleError('getLeads', error);
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
      // Ensure D365 client is configured
      if (!d365Client.isConfigured()) {
        throw new AppError('D365 service not configured', 500);
      }

      // Get lead from D365
      const d365Lead = await d365Client.get(
        this.entity,
        leadId,
        LEAD_SELECT_FIELDS
      );

      if (!d365Lead) {
        return null;
      }

      // CRITICAL: Verify the lead belongs to the user's initiative
      if (d365Lead.tc_initiative !== initiativeFilter.initiative) {
        this.logSecurityViolation(
          'getLeadById',
          initiativeFilter,
          leadId,
          d365Lead.tc_initiative
        );
        return null; // Return null as if not found - don't reveal it exists
      }

      // Map and return
      return d365LeadMapper.mapToLead(d365Lead);
    } catch (error) {
      this.handleError('getLeadById', error);
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

      // Map updates to D365 format
      const d365Updates = d365LeadMapper.mapToD365Update(updates);

      // Log update for audit
      this.logUpdate('updateLead', initiativeFilter, leadId, Object.keys(d365Updates));

      // Update in D365
      const updatedD365Lead = await d365Client.update(
        this.entity,
        leadId,
        d365Updates
      );

      // Map and return
      return d365LeadMapper.mapToLead(updatedD365Lead);
    } catch (error) {
      this.handleError('updateLead', error);
    }
  }

  /**
   * Create a new lead
   * 
   * @param initiativeFilter - Security filter from middleware
   * @param leadData - Lead data to create
   * @returns Created lead
   */
  async createLead(
    initiativeFilter: D365Filter,
    leadData: Partial<Lead>
  ): Promise<Lead> {
    try {
      // Ensure initiative is set
      const dataWithInitiative = {
        ...leadData,
        initiativeId: initiativeFilter.initiative,
      };

      // Map to D365 format
      const d365Data = d365LeadMapper.mapToD365Create(dataWithInitiative);

      // Create in D365
      const createdD365Lead = await d365Client.create(
        this.entity,
        d365Data
      );

      // Map and return
      return d365LeadMapper.mapToLead(createdD365Lead);
    } catch (error) {
      this.handleError('createLead', error);
    }
  }

  /**
   * Get lead statistics for the user's initiative
   * 
   * @param initiativeFilter - Security filter from middleware
   * @returns Lead statistics
   */
  async getLeadStats(
    initiativeFilter: D365Filter
  ): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
  }> {
    try {
      // For now, fetch all leads and calculate stats
      // In production, use OData aggregation queries
      const allLeads = await this.getLeads(
        initiativeFilter,
        {},
        { limit: 1000 }
      );

      const stats = {
        total: 0,
        byStatus: {} as Record<string, number>,
        byType: {} as Record<string, number>,
        byPriority: {} as Record<string, number>,
      };

      for (const lead of allLeads.value) {
        stats.total++;
        
        // Count by status
        stats.byStatus[lead.status] = (stats.byStatus[lead.status] || 0) + 1;
        
        // Count by type
        stats.byType[lead.type] = (stats.byType[lead.type] || 0) + 1;
        
        // Count by priority
        if (lead.priority) {
          stats.byPriority[lead.priority] = (stats.byPriority[lead.priority] || 0) + 1;
        }
      }

      return stats;
    } catch (error) {
      this.handleError('getLeadStats', error);
    }
  }

  /**
   * Batch update multiple leads
   * 
   * @param initiativeFilter - Security filter from middleware
   * @param updates - Array of lead IDs and their updates
   * @returns Results of batch update
   */
  async batchUpdateLeads(
    initiativeFilter: D365Filter,
    updates: Array<{ id: string; updates: Partial<Lead> }>
  ): Promise<Array<{ id: string; success: boolean; error?: string }>> {
    const results = [];

    for (const { id, updates: leadUpdates } of updates) {
      try {
        await this.updateLead(initiativeFilter, id, leadUpdates);
        results.push({ id, success: true });
      } catch (error) {
        results.push({
          id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }

  /**
   * Log query for audit purposes
   */
  private logQuery(
    operation: string,
    initiativeFilter: D365Filter,
    userFilters?: any,
    query?: string
  ): void {
    console.log(`[LeadService] ${operation}:`, {
      initiative: initiativeFilter.initiative,
      organization: initiativeFilter.organizationId,
      userId: initiativeFilter.userId,
      filters: userFilters,
      query: query?.substring(0, 200) // Log first 200 chars of query
    });
  }

  /**
   * Log update operations
   */
  private logUpdate(
    operation: string,
    initiativeFilter: D365Filter,
    entityId: string,
    fields: string[]
  ): void {
    console.log(`[LeadService] ${operation}:`, {
      initiative: initiativeFilter.initiative,
      userId: initiativeFilter.userId,
      entityId,
      updatedFields: fields
    });
  }

  /**
   * Log security violations
   */
  private logSecurityViolation(
    operation: string,
    initiativeFilter: D365Filter,
    requestedId: string,
    actualInitiative: string
  ): void {
    console.warn(`[LeadService] SECURITY VIOLATION in ${operation}:`, {
      userId: initiativeFilter.userId,
      userInitiative: initiativeFilter.initiative,
      requestedEntity: requestedId,
      entityInitiative: actualInitiative,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle errors consistently
   */
  private handleError(operation: string, error: unknown): never {
    console.error(`[LeadService] Error in ${operation}:`, error);
    
    if (error instanceof AppError) {
      throw error;
    }
    
    throw new AppError(
      `Failed to ${operation}`,
      error instanceof Error && 'status' in error ? (error as any).status : 500
    );
  }
}

// Export singleton instance
export const leadService = new LeadService();