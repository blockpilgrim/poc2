import type { LeadFilters } from '@partner-portal/shared';

/**
 * Centralized query keys factory for TanStack Query
 * This ensures consistent cache key generation across the application
 */

// Extended filter type that includes pagination and sorting
export interface LeadQueryFilters extends Partial<LeadFilters> {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

/**
 * Lead query keys factory
 * CRITICAL: All query keys must include initiative for security boundary enforcement
 */
export const leadKeys = {
  all: ['leads'] as const,
  lists: () => [...leadKeys.all, 'list'] as const,
  list: (initiative: string, filters: LeadQueryFilters) => 
    [...leadKeys.lists(), initiative, filters] as const,
  details: () => [...leadKeys.all, 'detail'] as const,
  detail: (initiative: string, id: string) => 
    [...leadKeys.details(), initiative, id] as const,
  stats: (initiative: string) => 
    [...leadKeys.all, 'stats', initiative] as const,
};

/**
 * Future query key factories can be added here
 * Example:
 * 
 * export const userKeys = {
 *   all: ['users'] as const,
 *   lists: () => [...userKeys.all, 'list'] as const,
 *   list: (filters: Partial<UserFilters>) => [...userKeys.lists(), filters] as const,
 *   details: () => [...userKeys.all, 'detail'] as const,
 *   detail: (id: string) => [...userKeys.details(), id] as const,
 * };
 */

/**
 * Invalidate all lead queries for a specific initiative
 */
export const invalidateLeadQueries = (initiative: string) => {
  return { queryKey: [...leadKeys.all, initiative] };
};

/**
 * Invalidate all queries for current user's initiative
 */
export const invalidateCurrentInitiativeQueries = () => {
  return { queryKey: leadKeys.all };
};