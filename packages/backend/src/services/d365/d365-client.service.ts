/**
 * D365 Client Service
 * Generic client for D365 Web API interactions with retry logic and error handling
 */

import { config } from '../../config';
import { AppError } from '../../utils/errors';
import { authService } from '../auth.service';
import {
  D365_API,
  D365_HEADERS,
  D365_PREFERENCES,
} from '../../constants/d365/entities';

/**
 * D365 API response structure
 */
export interface D365Response<T> {
  value: T[];
  '@odata.count'?: number;
  '@odata.nextLink'?: string;
  '@odata.context'?: string;
}

/**
 * D365 error response structure
 */
export interface D365Error {
  error: {
    code: string;
    message: string;
    innererror?: {
      message: string;
      type: string;
      stacktrace: string;
    };
  };
}

/**
 * Client configuration options
 */
export interface D365ClientConfig {
  baseUrl?: string;
  apiVersion?: string;
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  logger?: (message: string, data?: any) => void;
}

/**
 * Request options
 */
export interface RequestOptions {
  headers?: Record<string, string>;
  retries?: number;
  includeAnnotations?: boolean;
  prefer?: string[];
}

/**
 * Generic D365 Web API Client
 * Provides low-level API access with automatic token management and retry logic
 */
export class D365Client {
  private baseUrl: string;
  private apiVersion: string;
  private maxRetries: number;
  private retryDelay: number;
  private timeout: number;
  private logger: (message: string, data?: any) => void;

  constructor(config: D365ClientConfig = {}) {
    this.baseUrl = config.baseUrl || process.env.D365_URL || '';
    this.apiVersion = config.apiVersion || D365_API.VERSION;
    this.maxRetries = config.maxRetries ?? 3;
    this.retryDelay = config.retryDelay ?? 1000;
    this.timeout = config.timeout ?? 30000;
    this.logger = config.logger || ((msg, data) => console.log(`[D365Client] ${msg}`, data || ''));
    
    if (!this.baseUrl) {
      this.logger('No D365 URL configured - client will not make API calls');
    }
  }

  /**
   * Query entities with OData parameters
   */
  async query<T = any>(
    entity: string,
    queryString: string,
    options: RequestOptions = {}
  ): Promise<D365Response<T>> {
    const url = `${this.getApiUrl()}/${entity}?${queryString}`;
    
    return this.executeRequest<D365Response<T>>('GET', url, undefined, options);
  }

  /**
   * Get a single entity by ID
   */
  async get<T = any>(
    entity: string,
    id: string,
    selectFields?: string[],
    options: RequestOptions = {}
  ): Promise<T | null> {
    let url = `${this.getApiUrl()}/${entity}(${id})`;
    
    if (selectFields && selectFields.length > 0) {
      url += `?$select=${selectFields.join(',')}`;
    }
    
    try {
      return await this.executeRequest<T>('GET', url, undefined, options);
    } catch (error) {
      if (error instanceof AppError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Create a new entity
   */
  async create<T = any>(
    entity: string,
    data: Record<string, any>,
    options: RequestOptions = {}
  ): Promise<T> {
    const url = `${this.getApiUrl()}/${entity}`;
    
    const headers = {
      ...options.headers,
      'Prefer': 'return=representation',
    };
    
    return this.executeRequest<T>('POST', url, data, { ...options, headers });
  }

  /**
   * Update an existing entity
   */
  async update<T = any>(
    entity: string,
    id: string,
    data: Record<string, any>,
    options: RequestOptions = {}
  ): Promise<T> {
    const url = `${this.getApiUrl()}/${entity}(${id})`;
    
    const headers = {
      ...options.headers,
      'Prefer': 'return=representation',
    };
    
    return this.executeRequest<T>('PATCH', url, data, { ...options, headers });
  }

  /**
   * Delete an entity
   */
  async delete(
    entity: string,
    id: string,
    options: RequestOptions = {}
  ): Promise<void> {
    const url = `${this.getApiUrl()}/${entity}(${id})`;
    
    await this.executeRequest('DELETE', url, undefined, options);
  }

  /**
   * Execute a batch request
   */
  async batch(operations: any[], options: RequestOptions = {}): Promise<any> {
    const url = `${this.getApiUrl()}/$batch`;
    
    const headers = {
      ...options.headers,
      'Content-Type': 'multipart/mixed;boundary=batch_boundary',
    };
    
    // TODO: Implement batch request formatting
    throw new Error('Batch operations not yet implemented');
  }

  /**
   * Execute HTTP request with retry logic
   */
  private async executeRequest<T = any>(
    method: string,
    url: string,
    data?: any,
    options: RequestOptions = {}
  ): Promise<T> {
    if (!this.baseUrl) {
      throw new AppError('D365 URL not configured', 500);
    }
    
    const token = await this.getAccessToken();
    if (!token) {
      throw new AppError('Unable to obtain D365 access token', 500);
    }
    
    const headers = {
      ...D365_HEADERS,
      ...options.headers,
      'Authorization': `Bearer ${token}`,
    };
    
    // Add preferences
    if (options.prefer && options.prefer.length > 0) {
      headers['Prefer'] = options.prefer.join(',');
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    
    let lastError: Error | null = null;
    const maxAttempts = (options.retries ?? this.maxRetries) + 1;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        this.logger(`${method} ${url} (attempt ${attempt}/${maxAttempts})`);
        
        const response = await fetch(url, {
          method,
          headers,
          body: data ? JSON.stringify(data) : undefined,
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        // Handle successful responses
        if (response.ok) {
          if (method === 'DELETE' || response.status === 204) {
            return undefined as any;
          }
          
          const contentType = response.headers.get('content-type');
          if (contentType?.includes('application/json')) {
            return await response.json();
          }
          
          return await response.text() as any;
        }
        
        // Handle errors
        const errorData = await this.parseErrorResponse(response);
        
        // Don't retry certain errors
        if (response.status === 400 || response.status === 404 || response.status === 409) {
          throw new AppError(
            errorData.message || `D365 API error: ${response.statusText}`,
            response.status
          );
        }
        
        // Retry on server errors or rate limiting
        if (attempt < maxAttempts && this.shouldRetry(response.status)) {
          lastError = new Error(errorData.message || response.statusText);
          await this.delay(this.calculateRetryDelay(attempt));
          continue;
        }
        
        // Max retries reached or non-retryable error
        throw new AppError(
          errorData.message || `D365 API error: ${response.statusText}`,
          response.status
        );
        
      } catch (error) {
        clearTimeout(timeoutId);
        
        if (error instanceof AppError) {
          throw error;
        }
        
        // Handle network errors
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            throw new AppError('D365 API request timeout', 504);
          }
          
          lastError = error;
          
          if (attempt < maxAttempts) {
            this.logger(`Network error on attempt ${attempt}, retrying...`, error.message);
            await this.delay(this.calculateRetryDelay(attempt));
            continue;
          }
        }
        
        throw new AppError(
          `D365 API network error: ${lastError?.message || 'Unknown error'}`,
          503
        );
      }
    }
    
    // Should never reach here
    throw new AppError(
      `D365 API error after ${maxAttempts} attempts: ${lastError?.message || 'Unknown error'}`,
      503
    );
  }

  /**
   * Get access token for D365
   */
  private async getAccessToken(): Promise<string | null> {
    return authService.getD365AccessToken();
  }

  /**
   * Parse error response from D365
   */
  private async parseErrorResponse(response: Response): Promise<{
    code?: string;
    message: string;
  }> {
    try {
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        const data = await response.json() as D365Error;
        return {
          code: data.error?.code,
          message: data.error?.message || response.statusText,
        };
      }
      
      const text = await response.text();
      return { message: text || response.statusText };
      
    } catch {
      return { message: response.statusText };
    }
  }

  /**
   * Determine if error should be retried
   */
  private shouldRetry(statusCode: number): boolean {
    // Retry on server errors and rate limiting
    return statusCode >= 500 || statusCode === 429 || statusCode === 503;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number): number {
    return this.retryDelay * Math.pow(2, attempt - 1);
  }

  /**
   * Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get full API URL
   */
  private getApiUrl(): string {
    return `${this.baseUrl}/api/data/${this.apiVersion}`;
  }

  /**
   * Check if client is configured
   */
  isConfigured(): boolean {
    return !!this.baseUrl;
  }
}

// Export singleton instance
export const d365Client = new D365Client();