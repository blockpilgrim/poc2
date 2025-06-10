import { Request, Response } from 'express';
import { leadService } from '../services/lead.service';
import { AppError } from '../utils/errors';
import type { LeadFilters, LeadStatus, LeadType } from '@partner-portal/shared';
import type { D365QueryOptions } from '../types/d365.types';

/**
 * Lead Controller
 * Handles API endpoints for lead management
 * All endpoints require authentication and initiative enforcement
 */
export class LeadController {
  /**
   * GET /api/v1/leads
   * Get paginated list of leads for the user's initiative
   * 
   * Query parameters:
   * - page: Page number (default: 1)
   * - limit: Items per page (default: 25, max: 100)
   * - status: Filter by status (can be array)
   * - type: Filter by type (can be array)
   * - assignedToId: Filter by assigned user
   * - priority: Filter by priority
   * - search: Search across name and email
   * - sortBy: Field to sort by (default: modifiedon)
   * - sortOrder: Sort direction (asc/desc, default: desc)
   */
  async getLeads(req: Request, res: Response): Promise<void> {
    try {
      // Ensure D365 filter is present (injected by middleware)
      if (!req.d365Filter) {
        throw new AppError('D365 filter not found - ensure enforceInitiative middleware is applied', 500);
      }
      
      // Parse query parameters
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);
      const offset = (page - 1) * limit;
      
      // Build filters
      const filters: LeadFilters = {};
      
      if (req.query.status) {
        filters.status = Array.isArray(req.query.status) 
          ? (req.query.status as LeadStatus[])
          : [req.query.status as LeadStatus];
      }
      
      if (req.query.type) {
        filters.type = Array.isArray(req.query.type) 
          ? (req.query.type as LeadType[])
          : [req.query.type as LeadType];
      }
      
      if (req.query.assignedToId) {
        filters.assignedToId = req.query.assignedToId as string;
      }
      
      if (req.query.assignedOrganizationId) {
        filters.assignedOrganizationId = req.query.assignedOrganizationId as string;
      }
      
      if (req.query.priority) {
        filters.priority = req.query.priority as string;
      }
      
      if (req.query.search) {
        filters.search = req.query.search as string;
      }
      
      // Build query options
      const options: D365QueryOptions = {
        limit,
        offset,
        orderBy: req.query.sortBy as string || 'modifiedon',
        orderDirection: req.query.sortOrder === 'asc' ? 'asc' : 'desc'
      };
      
      // Fetch leads with mandatory initiative filtering
      const result = await leadService.getLeads(req.d365Filter, filters, options);
      
      // Build response with pagination metadata
      const totalPages = Math.ceil((result.totalCount || 0) / limit);
      
      res.json({
        data: result.value,
        pagination: {
          page,
          limit,
          total: result.totalCount || 0,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        filters: {
          initiative: req.d365Filter.initiative,
          ...filters
        }
      });
    } catch (error) {
      console.error('[LeadController] Error fetching leads:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          error: error.message,
          code: error.statusCode === 404 ? 'NOT_FOUND' : 'FETCH_ERROR'
        });
      } else {
        res.status(500).json({
          error: 'Failed to fetch leads',
          code: 'INTERNAL_ERROR'
        });
      }
    }
  }
  
  /**
   * GET /api/v1/leads/:id
   * Get a single lead by ID
   * Returns 404 if lead not found or user doesn't have access
   */
  async getLeadById(req: Request, res: Response): Promise<void> {
    try {
      // Ensure D365 filter is present
      if (!req.d365Filter) {
        throw new AppError('D365 filter not found - ensure enforceInitiative middleware is applied', 500);
      }
      
      const { id } = req.params;
      
      if (!id) {
        throw new AppError('Lead ID is required', 400);
      }
      
      // Fetch lead with initiative verification
      const lead = await leadService.getLeadById(req.d365Filter, id);
      
      if (!lead) {
        throw new AppError('Lead not found', 404);
      }
      
      res.json({
        data: lead
      });
    } catch (error) {
      console.error('[LeadController] Error fetching lead:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          error: error.message,
          code: error.statusCode === 404 ? 'NOT_FOUND' : 'FETCH_ERROR'
        });
      } else {
        res.status(500).json({
          error: 'Failed to fetch lead',
          code: 'INTERNAL_ERROR'
        });
      }
    }
  }
  
  /**
   * PATCH /api/v1/leads/:id
   * Update a lead
   * Only updates provided fields
   */
  async updateLead(req: Request, res: Response): Promise<void> {
    try {
      // Ensure D365 filter is present
      if (!req.d365Filter) {
        throw new AppError('D365 filter not found - ensure enforceInitiative middleware is applied', 500);
      }
      
      const { id } = req.params;
      
      if (!id) {
        throw new AppError('Lead ID is required', 400);
      }
      
      // Validate request body
      const allowedFields = [
        'firstName',
        'lastName',
        'email',
        'phoneNumber',
        'alternatePhone',
        'address',
        'status',
        'type',
        'priority',
        'source',
        'notes',
        'tags'
      ];
      
      const updates: any = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }
      
      if (Object.keys(updates).length === 0) {
        throw new AppError('No valid fields to update', 400);
      }
      
      // Update lead with initiative verification
      const updatedLead = await leadService.updateLead(req.d365Filter, id, updates);
      
      res.json({
        data: updatedLead,
        message: 'Lead updated successfully'
      });
    } catch (error) {
      console.error('[LeadController] Error updating lead:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          error: error.message,
          code: error.statusCode === 404 ? 'NOT_FOUND' : 'UPDATE_ERROR'
        });
      } else {
        res.status(500).json({
          error: 'Failed to update lead',
          code: 'INTERNAL_ERROR'
        });
      }
    }
  }
  
  /**
   * GET /api/v1/leads/stats
   * Get lead statistics for the user's initiative
   * Returns counts by status, type, etc.
   */
  async getLeadStats(req: Request, res: Response): Promise<void> {
    try {
      // Ensure D365 filter is present
      if (!req.d365Filter) {
        throw new AppError('D365 filter not found - ensure enforceInitiative middleware is applied', 500);
      }
      
      // For now, return a simple implementation
      // In production, this would use OData aggregation queries
      const allLeads = await leadService.getLeads(req.d365Filter, {}, { limit: 1000 });
      
      // Calculate stats
      const statusCounts: Record<string, number> = {};
      const typeCounts: Record<string, number> = {};
      let totalLeads = 0;
      
      for (const lead of allLeads.value) {
        totalLeads++;
        statusCounts[lead.status] = (statusCounts[lead.status] || 0) + 1;
        typeCounts[lead.type] = (typeCounts[lead.type] || 0) + 1;
      }
      
      res.json({
        data: {
          total: totalLeads,
          byStatus: statusCounts,
          byType: typeCounts,
          initiative: req.d365Filter.initiative
        }
      });
    } catch (error) {
      console.error('[LeadController] Error fetching lead stats:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          error: error.message,
          code: 'STATS_ERROR'
        });
      } else {
        res.status(500).json({
          error: 'Failed to fetch lead statistics',
          code: 'INTERNAL_ERROR'
        });
      }
    }
  }
}

// Export singleton instance
export const leadController = new LeadController();