/**
 * Tests for Retry Helper
 */

import { describe, it, expect, vi } from 'vitest';
import { 
  withRetry, 
  createRetryWrapper, 
  markRetryable, 
  createRetryableError 
} from '../retry-helper';

describe('RetryHelper', () => {
  describe('withRetry', () => {
    it('should execute function successfully on first attempt', async () => {
      const mockFn = vi.fn().mockResolvedValue('success');
      
      const result = await withRetry(mockFn, { maxRetries: 3 });
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and succeed', async () => {
      const mockFn = vi.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValue('success');
      
      const result = await withRetry(mockFn, { 
        maxRetries: 3,
        initialDelay: 1,
        jitter: false,
        logger: vi.fn()
      });
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Always fails'));
      
      await expect(withRetry(mockFn, { 
        maxRetries: 2,
        initialDelay: 1,
        jitter: false
      })).rejects.toThrow('Operation failed after 3 attempts: Always fails');
      
      expect(mockFn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should respect retryable status codes', async () => {
      const error = createRetryableError('Server error', 503);
      const mockFn = vi.fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');
      
      const result = await withRetry(mockFn, { 
        maxRetries: 3,
        initialDelay: 1,
        jitter: false,
        retryableStatusCodes: [503]
      });
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should not retry non-retryable errors', async () => {
      const error = createRetryableError('Bad request', 400);
      const mockFn = vi.fn().mockRejectedValue(error);
      
      await expect(withRetry(mockFn, { 
        maxRetries: 3,
        retryableStatusCodes: [500, 503]
      })).rejects.toThrow('Bad request');
      
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should respect explicit retryable flag', async () => {
      const error = markRetryable(new Error('Custom error'), false);
      const mockFn = vi.fn().mockRejectedValue(error);
      
      await expect(withRetry(mockFn, { maxRetries: 3 })).rejects.toThrow('Custom error');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should apply exponential backoff', async () => {
      const mockFn = vi.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockRejectedValueOnce(new Error('Fail 3'))
        .mockResolvedValue('success');
      
      const logger = vi.fn();
      
      const result = await withRetry(mockFn, { 
        maxRetries: 3,
        initialDelay: 10,
        backoffFactor: 2,
        jitter: false,
        logger
      });
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(4);
      
      // Check that logger was called with increasing delays
      const logCalls = logger.mock.calls.filter(call => call[0].includes('Retryable error'));
      expect(logCalls[0][1].delay).toBe(10);   // First retry: 10ms
      expect(logCalls[1][1].delay).toBe(20);   // Second retry: 20ms  
      expect(logCalls[2][1].delay).toBe(40);   // Third retry: 40ms
    });

    it('should cap delay at maxDelay', async () => {
      const mockFn = vi.fn()
        .mockRejectedValueOnce(new Error('Fail'))
        .mockResolvedValue('success');
      
      const logger = vi.fn();
      
      const result = await withRetry(mockFn, { 
        maxRetries: 5,
        initialDelay: 1000,
        backoffFactor: 10,
        maxDelay: 50,
        jitter: false,
        logger
      });
      
      expect(result).toBe('success');
      
      // Check that delay was capped
      const logCall = logger.mock.calls.find(call => call[0].includes('Retryable error'));
      expect(logCall[1].delay).toBe(50); // Should be capped at maxDelay
    });

    it('should retry on network errors', async () => {
      const networkError = new Error('ECONNRESET');
      const mockFn = vi.fn()
        .mockRejectedValueOnce(networkError)
        .mockResolvedValue('success');
      
      const result = await withRetry(mockFn, { 
        maxRetries: 3,
        initialDelay: 1,
        jitter: false
      });
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should retry on timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'AbortError';
      const mockFn = vi.fn()
        .mockRejectedValueOnce(timeoutError)
        .mockResolvedValue('success');
      
      const result = await withRetry(mockFn, { 
        maxRetries: 3,
        initialDelay: 1,
        jitter: false
      });
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('createRetryWrapper', () => {
    it('should create wrapper with preset configuration', async () => {
      const mockFn = vi.fn()
        .mockRejectedValueOnce(new Error('Fail'))
        .mockResolvedValue('success');
      
      const retryWithDefaults = createRetryWrapper({
        maxRetries: 5,
        initialDelay: 1,
        jitter: false
      });
      
      const result = await retryWithDefaults(mockFn);
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should allow overriding preset configuration', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Always fails'));
      
      const retryWithDefaults = createRetryWrapper({
        maxRetries: 5,
        initialDelay: 100
      });
      
      // Override with no retries
      await expect(retryWithDefaults(mockFn, { maxRetries: 0 }))
        .rejects.toThrow('Always fails');
      
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('error utilities', () => {
    it('should mark error as retryable', () => {
      const error = new Error('Test error');
      const retryableError = markRetryable(error, true);
      
      expect(retryableError).toBe(error);
      expect((retryableError as any).isRetryable).toBe(true);
    });

    it('should create retryable error with status code', () => {
      const error = createRetryableError('Server error', 500, true);
      
      expect(error.message).toBe('Server error');
      expect((error as any).statusCode).toBe(500);
      expect((error as any).isRetryable).toBe(true);
    });
  });
});