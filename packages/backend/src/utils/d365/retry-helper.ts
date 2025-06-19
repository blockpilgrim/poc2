/**
 * Retry Helper for D365 API Calls
 * Provides exponential backoff retry logic for transient failures
 * Extracted from abandoned implementation with improvements
 */

import { AppError } from '../errors';

/**
 * Retry configuration options
 */
export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Initial delay in milliseconds before first retry (default: 1000) */
  initialDelay?: number;
  /** Maximum delay in milliseconds between retries (default: 30000) */
  maxDelay?: number;
  /** Factor to multiply delay by for each retry (default: 2) */
  backoffFactor?: number;
  /** Add random jitter to prevent thundering herd (default: true) */
  jitter?: boolean;
  /** HTTP status codes that should trigger retry (default: [429, 500, 502, 503, 504]) */
  retryableStatusCodes?: number[];
  /** Logger function for retry attempts */
  logger?: (message: string, data?: any) => void;
}

/**
 * Default configuration for retry behavior
 */
const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffFactor: 2,
  jitter: true,
  retryableStatusCodes: [429, 500, 502, 503, 504],
  logger: (msg, data) => console.log(`[RetryHelper] ${msg}`, data || ''),
};

/**
 * Error interface for retry logic
 */
export interface RetryableError extends Error {
  statusCode?: number;
  code?: string;
  isRetryable?: boolean;
}

/**
 * Result of a retry operation
 */
export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  totalDelay: number;
}

/**
 * Execute a function with retry logic and exponential backoff
 * 
 * @param fn - Function to execute (should be idempotent)
 * @param options - Retry configuration options
 * @returns Promise resolving to the function result
 * @throws Error if all retry attempts fail
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error | null = null;
  let totalDelay = 0;

  for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
    try {
      config.logger(`Executing attempt ${attempt}/${config.maxRetries + 1}`);
      const result = await fn();
      
      if (attempt > 1) {
        config.logger('Retry successful', { attempt, totalDelay });
      }
      
      return result;
    } catch (error) {
      lastError = error as Error;
      
      // Check if we should retry
      if (!shouldRetry(error, attempt, config)) {
        throw error;
      }
      
      // Calculate delay for next attempt
      const delay = calculateDelay(attempt, config);
      totalDelay += delay;
      
      config.logger('Retryable error occurred, waiting before retry', {
        attempt,
        delay,
        error: error instanceof Error ? error.message : 'Unknown error',
        statusCode: (error as RetryableError).statusCode,
      });
      
      await sleep(delay);
    }
  }
  
  // All retries exhausted
  const finalError = new AppError(
    `Operation failed after ${config.maxRetries + 1} attempts: ${lastError?.message}`,
    503
  );
  (finalError as any).originalError = lastError;
  (finalError as any).attempts = config.maxRetries + 1;
  (finalError as any).totalDelay = totalDelay;
  
  throw finalError;
}

/**
 * Determine if an error should trigger a retry
 */
function shouldRetry(
  error: unknown,
  attempt: number,
  config: Required<RetryOptions>
): boolean {
  // Don't retry if we've exhausted attempts
  if (attempt > config.maxRetries) {
    return false;
  }
  
  // Check if error explicitly marked as retryable
  if ((error as RetryableError).isRetryable === true) {
    return true;
  }
  
  // Check if error explicitly marked as non-retryable
  if ((error as RetryableError).isRetryable === false) {
    return false;
  }
  
  // Check status code for HTTP errors
  const statusCode = (error as RetryableError).statusCode;
  if (statusCode && config.retryableStatusCodes.includes(statusCode)) {
    return true;
  }
  
  // Check for network errors
  if (error instanceof Error) {
    const networkErrors = [
      'ECONNRESET',
      'ENOTFOUND',
      'ESOCKETTIMEDOUT',
      'ETIMEDOUT',
      'ECONNREFUSED',
      'EHOSTUNREACH',
      'EPIPE',
      'EAI_AGAIN',
    ];
    
    if (networkErrors.includes(error.message) || 
        networkErrors.some(code => error.message.includes(code))) {
      return true;
    }
    
    // Check for timeout errors
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      return true;
    }
  }
  
  return false;
}

/**
 * Calculate delay for next retry attempt with exponential backoff
 */
function calculateDelay(
  attempt: number,
  config: Required<RetryOptions>
): number {
  // Calculate base delay with exponential backoff
  let delay = config.initialDelay * Math.pow(config.backoffFactor, attempt - 1);
  
  // Cap at maximum delay
  delay = Math.min(delay, config.maxDelay);
  
  // Add jitter to prevent thundering herd
  if (config.jitter) {
    // Add random jitter between -25% and +25% of the delay
    const jitterRange = delay * 0.25;
    const jitter = (Math.random() * 2 - 1) * jitterRange;
    delay += jitter;
  }
  
  return Math.max(0, Math.round(delay));
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a retry wrapper with preset configuration
 * Useful for creating service-specific retry logic
 * 
 * @param defaultOptions - Default options for this wrapper
 * @returns Function that executes with retry using the preset options
 */
export function createRetryWrapper(defaultOptions: RetryOptions = {}) {
  return <T>(fn: () => Promise<T>, overrideOptions?: RetryOptions): Promise<T> => {
    return withRetry(fn, { ...defaultOptions, ...overrideOptions });
  };
}

/**
 * Mark an error as retryable or non-retryable
 * Useful for custom business logic errors
 */
export function markRetryable(error: Error, retryable: boolean): RetryableError {
  (error as RetryableError).isRetryable = retryable;
  return error as RetryableError;
}

/**
 * Create a retryable error with status code
 */
export function createRetryableError(
  message: string,
  statusCode: number,
  retryable?: boolean
): RetryableError {
  const error = new Error(message) as RetryableError;
  error.statusCode = statusCode;
  if (retryable !== undefined) {
    error.isRetryable = retryable;
  }
  return error;
}