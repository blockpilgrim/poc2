/**
 * D365 Query Builder Service
 * Constructs secure OData queries for D365 with built-in security constraints
 */

import { AppError } from '../../utils/errors';
import type { D365Filter, D365QueryOptions } from '../../types/d365.types';
import type { LeadFilters } from '@partner-portal/shared';
import {
  ODATA_OPERATORS,
  ODATA_PARAMS,
  QUERY_DEFAULTS,
  FILTER_TEMPLATES,
  SORT_FIELD_MAPPINGS,
  QUERY_ERRORS,
  escapeODataString,
  combineFilters,
} from '../../constants/d365/query';

/**
 * Query builder configuration
 */
export interface QueryBuilderConfig {
  requireInitiative?: boolean;
  defaultPageSize?: number;
  maxPageSize?: number;
  defaultSortField?: string;
  defaultSortOrder?: 'asc' | 'desc';
}

/**
 * D365 Query Builder
 * Builds secure OData queries with consistent security filters
 */
export class D365QueryBuilder {
  private config: Required<QueryBuilderConfig>;

  constructor(config: QueryBuilderConfig = {}) {
    this.config = {
      requireInitiative: true,
      defaultPageSize: QUERY_DEFAULTS.PAGE_SIZE,
      maxPageSize: QUERY_DEFAULTS.MAX_PAGE_SIZE,
      defaultSortField: QUERY_DEFAULTS.SORT_FIELD,
      defaultSortOrder: QUERY_DEFAULTS.SORT_ORDER as 'asc' | 'desc',
      ...config,
    };
  }

  /**
   * Build a complete OData query URL with filters and options
   */
  buildQuery(
    baseUrl: string,
    entity: string,
    initiativeFilter: D365Filter,
    userFilters?: LeadFilters,
    options?: D365QueryOptions
  ): string {
    const filter = this.buildSecureFilter(initiativeFilter, userFilters);
    const queryParams = this.buildQueryParams(filter, options);
    
    return `${baseUrl}/${entity}?${queryParams}`;
  }

  /**
   * Build secure OData filter that ALWAYS includes initiative constraint
   * This is the primary security mechanism preventing cross-initiative data access
   */
  buildSecureFilter(
    initiativeFilter: D365Filter,
    userFilters?: LeadFilters
  ): string {
    const filters: string[] = [];
    
    // CRITICAL: Always include initiative filter first (non-negotiable)
    if (this.config.requireInitiative && !initiativeFilter.initiative) {
      throw new AppError(QUERY_ERRORS.MISSING_INITIATIVE, 500);
    }
    
    if (initiativeFilter.initiative) {
      filters.push(FILTER_TEMPLATES.INITIATIVE(initiativeFilter.initiative));
    }
    
    // Add organization filter if available
    if (initiativeFilter.organizationId) {
      filters.push(FILTER_TEMPLATES.ORGANIZATION(initiativeFilter.organizationId));
    }
    
    // Add user-provided filters
    if (userFilters) {
      const userFilterStrings = this.buildUserFilters(userFilters);
      filters.push(...userFilterStrings);
    }
    
    return combineFilters(filters, 'and');
  }

  /**
   * Build filter strings from user-provided filters
   */
  private buildUserFilters(filters: LeadFilters): string[] {
    const filterStrings: string[] = [];
    
    // Status filter
    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      if (statuses.length > 0) {
        filterStrings.push(FILTER_TEMPLATES.STATUS(statuses));
      }
    }
    
    // Type filter
    if (filters.type) {
      const types = Array.isArray(filters.type) ? filters.type : [filters.type];
      if (types.length > 0) {
        filterStrings.push(FILTER_TEMPLATES.TYPE(types));
      }
    }
    
    // Assigned to filter
    if (filters.assignedToId) {
      filterStrings.push(FILTER_TEMPLATES.OWNER(filters.assignedToId));
    }
    
    // Priority filter
    if (filters.priority) {
      filterStrings.push(
        `tc_priority ${ODATA_OPERATORS.EQUALS} '${escapeODataString(filters.priority)}'`
      );
    }
    
    // Search filter
    if (filters.search) {
      filterStrings.push(FILTER_TEMPLATES.SEARCH(filters.search));
    }
    
    // Date range filters
    if (filters.createdAfter || filters.createdBefore) {
      filterStrings.push(...this.buildDateRangeFilter(
        'createdon',
        filters.createdAfter,
        filters.createdBefore
      ));
    }
    
    if (filters.modifiedAfter || filters.modifiedBefore) {
      filterStrings.push(...this.buildDateRangeFilter(
        'modifiedon',
        filters.modifiedAfter,
        filters.modifiedBefore
      ));
    }
    
    return filterStrings;
  }

  /**
   * Build date range filter
   */
  private buildDateRangeFilter(
    field: string,
    after?: Date | string,
    before?: Date | string
  ): string[] {
    const filters: string[] = [];
    
    if (after) {
      const date = after instanceof Date ? after : new Date(after);
      filters.push(`${field} ${ODATA_OPERATORS.GREATER_THAN_OR_EQUAL} ${date.toISOString()}`);
    }
    
    if (before) {
      const date = before instanceof Date ? before : new Date(before);
      filters.push(`${field} ${ODATA_OPERATORS.LESS_THAN_OR_EQUAL} ${date.toISOString()}`);
    }
    
    return filters;
  }

  /**
   * Build OData query parameters
   */
  buildQueryParams(filter: string, options?: D365QueryOptions): string {
    const params: string[] = [];
    
    // Add filter if present
    if (filter) {
      params.push(`${ODATA_PARAMS.FILTER}=${encodeURIComponent(filter)}`);
    }
    
    // Add select fields
    if (options?.select && options.select.length > 0) {
      params.push(`${ODATA_PARAMS.SELECT}=${options.select.join(',')}`);
    }
    
    // Add pagination
    const limit = this.validatePageSize(options?.limit);
    params.push(`${ODATA_PARAMS.TOP}=${limit}`);
    
    if (options?.offset) {
      params.push(`${ODATA_PARAMS.SKIP}=${options.offset}`);
    }
    
    // Add sorting
    const orderBy = this.buildOrderBy(options?.orderBy, options?.orderDirection);
    params.push(`${ODATA_PARAMS.ORDER_BY}=${orderBy}`);
    
    // Include count for pagination
    params.push(`${ODATA_PARAMS.COUNT}=true`);
    
    return params.join('&');
  }

  /**
   * Validate and normalize page size
   */
  private validatePageSize(limit?: number): number {
    if (!limit) {
      return this.config.defaultPageSize;
    }
    
    if (limit < 1 || limit > this.config.maxPageSize) {
      throw new AppError(
        QUERY_ERRORS.INVALID_PAGE_SIZE,
        400
      );
    }
    
    return limit;
  }

  /**
   * Build order by clause
   */
  private buildOrderBy(field?: string, direction?: 'asc' | 'desc'): string {
    const sortField = field
      ? (SORT_FIELD_MAPPINGS[field] || field)
      : this.config.defaultSortField;
    
    const sortDirection = direction || this.config.defaultSortOrder;
    
    return sortDirection === 'desc'
      ? `${sortField} desc`
      : sortField;
  }

  /**
   * Parse OData next link for pagination
   */
  parseNextLink(nextLink: string): {
    skip?: number;
    top?: number;
    filter?: string;
  } {
    const url = new URL(nextLink);
    const params = new URLSearchParams(url.search);
    
    return {
      skip: params.get(ODATA_PARAMS.SKIP) 
        ? parseInt(params.get(ODATA_PARAMS.SKIP)!, 10) 
        : undefined,
      top: params.get(ODATA_PARAMS.TOP)
        ? parseInt(params.get(ODATA_PARAMS.TOP)!, 10)
        : undefined,
      filter: params.get(ODATA_PARAMS.FILTER) || undefined,
    };
  }
}

// Export singleton instance with default configuration
export const d365QueryBuilder = new D365QueryBuilder();