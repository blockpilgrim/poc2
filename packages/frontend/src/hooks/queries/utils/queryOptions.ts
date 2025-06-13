/**
 * Common query options for consistent behavior across all queries
 */

/**
 * Default retry logic - don't retry on client errors (4xx)
 */
export const defaultRetry = (failureCount: number, error: Error): boolean => {
  const statusCode = error.message.match(/\b4\d{2}\b/);
  if (statusCode) return false;
  return failureCount < 3;
};

/**
 * Query options for data that changes frequently
 */
export const freshDataOptions = {
  staleTime: 1000 * 30, // 30 seconds
  gcTime: 1000 * 60 * 2, // 2 minutes
  retry: defaultRetry,
} as const;

/**
 * Query options for data that changes moderately
 */
export const standardDataOptions = {
  staleTime: 1000 * 60 * 2, // 2 minutes
  gcTime: 1000 * 60 * 5, // 5 minutes
  retry: defaultRetry,
} as const;

/**
 * Query options for data that rarely changes
 */
export const stableDataOptions = {
  staleTime: 1000 * 60 * 5, // 5 minutes
  gcTime: 1000 * 60 * 10, // 10 minutes
  retry: defaultRetry,
} as const;

/**
 * Query options for non-critical data (like stats)
 */
export const nonCriticalDataOptions = {
  staleTime: 1000 * 60 * 5, // 5 minutes
  gcTime: 1000 * 60 * 10, // 10 minutes
  retry: 1, // Only retry once
} as const;