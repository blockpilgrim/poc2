import { Request, Response } from 'express';
import { leadService } from '../services/lead.service';
import { AppError } from '../utils/errors';
import type { LeadFilters } from '@partner-portal/shared';
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
      // Accept both 'pageSize' (frontend) and 'limit' (legacy) for backward compatibility
      const pageSize = req.query.pageSize || req.query.limit;
      const limit = Math.min(parseInt(pageSize as string) || 25, 100);
      const offset = (page - 1) * limit;
      
      // Build filters - currently only search is supported
      const filters: LeadFilters = {};
      
      if (req.query.search) {
        filters.search = req.query.search as string;
      }
      
      // Build query options
      const options: D365QueryOptions = {
        limit,
        offset,
        orderBy: req.query.sortBy as string || 'updatedAt', // Default matches frontend
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
          pageSize: limit, // Use pageSize to match frontend expectations
          totalItems: result.totalCount || 0, // Use totalItems to match frontend
          totalPages,
          hasNext: page < totalPages,
          hasPrevious: page > 1 // Use hasPrevious to match frontend
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
  async updateLead(_req: Request, res: Response): Promise<void> {
    // TODO: Implement lead update functionality
    res.status(501).json({
      error: 'Lead updates are not yet implemented',
      code: 'NOT_IMPLEMENTED',
      message: 'This feature is coming soon'
    });
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