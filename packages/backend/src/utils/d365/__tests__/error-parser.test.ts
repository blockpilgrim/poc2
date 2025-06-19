/**
 * Tests for D365 Error Parser
 */

import { describe, it, expect } from 'vitest';
import {
  parseD365Error,
  createAppErrorFromD365,
  parseD365FetchError,
  extractFieldFromError,
  formatErrorForLogging,
  D365_ERROR_CODES,
  type D365ErrorResponse,
  type ParsedD365Error
} from '../error-parser';
import { AppError } from '../../errors';

describe('D365 Error Parser', () => {
  describe('parseD365Error', () => {
    it('should parse standard D365 error response', async () => {
      const errorResponse: D365ErrorResponse = {
        error: {
          code: D365_ERROR_CODES.INSUFFICIENT_PRIVILEGES,
          message: 'User does not have sufficient privileges',
          innererror: {
            message: 'Missing read privilege',
            type: 'Microsoft.Crm.CrmException',
            stacktrace: 'stack trace here'
          }
        }
      };

      const response = {
        status: 403,
        statusText: 'Forbidden'
      };

      const parsed = await parseD365Error(response, errorResponse);

      expect(parsed.statusCode).toBe(403);
      expect(parsed.errorCode).toBe(D365_ERROR_CODES.INSUFFICIENT_PRIVILEGES);
      expect(parsed.message).toBe('User does not have sufficient privileges');
      expect(parsed.details).toBe('Missing read privilege');
      expect(parsed.type).toBe('Microsoft.Crm.CrmException');
      expect(parsed.isRetryable).toBe(false);
      expect(parsed.userMessage).toBe('You do not have sufficient privileges to perform this operation');
    });

    it('should handle string response body', async () => {
      const errorJson = JSON.stringify({
        error: {
          code: D365_ERROR_CODES.DUPLICATE_RECORD,
          message: 'Duplicate record found'
        }
      });

      const response = {
        status: 409,
        statusText: 'Conflict'
      };

      const parsed = await parseD365Error(response, errorJson);

      expect(parsed.errorCode).toBe(D365_ERROR_CODES.DUPLICATE_RECORD);
      expect(parsed.message).toBe('Duplicate record found');
      expect(parsed.userMessage).toBe('A record with these values already exists');
    });

    it('should handle missing error body', async () => {
      const response = {
        status: 500,
        statusText: 'Internal Server Error'
      };

      const parsed = await parseD365Error(response);

      expect(parsed.statusCode).toBe(500);
      expect(parsed.errorCode).toBe('');
      expect(parsed.message).toBe('Internal Server Error');
      expect(parsed.userMessage).toBe('Internal server error');
      expect(parsed.isRetryable).toBe(true);
    });

    it('should identify retryable errors by status code', async () => {
      const testCases = [
        { status: 429, expected: true },
        { status: 500, expected: true },
        { status: 502, expected: true },
        { status: 503, expected: true },
        { status: 504, expected: true },
        { status: 400, expected: false },
        { status: 401, expected: false },
        { status: 403, expected: false },
        { status: 404, expected: false }
      ];

      for (const { status, expected } of testCases) {
        const response = { status, statusText: 'Error' };
        const parsed = await parseD365Error(response);
        expect(parsed.isRetryable).toBe(expected);
      }
    });

    it('should identify retryable errors by error code', async () => {
      const retryableCodes = [
        D365_ERROR_CODES.DEADLOCK,
        D365_ERROR_CODES.TIMEOUT,
        D365_ERROR_CODES.THROTTLING,
        D365_ERROR_CODES.SERVICE_UNAVAILABLE
      ];

      for (const code of retryableCodes) {
        const errorResponse: D365ErrorResponse = {
          error: { code, message: 'Error' }
        };
        const response = { status: 400, statusText: 'Bad Request' };
        const parsed = await parseD365Error(response, errorResponse);
        expect(parsed.isRetryable).toBe(true);
      }
    });

    it('should handle Response object with text method', async () => {
      const errorResponse: D365ErrorResponse = {
        error: {
          code: D365_ERROR_CODES.INVALID_QUERY,
          message: 'Invalid query syntax'
        }
      };

      const response = {
        status: 400,
        statusText: 'Bad Request',
        text: async () => JSON.stringify(errorResponse)
      } as any;

      const parsed = await parseD365Error(response);

      expect(parsed.errorCode).toBe(D365_ERROR_CODES.INVALID_QUERY);
      expect(parsed.message).toBe('Invalid query syntax');
    });

    it('should handle invalid JSON in response', async () => {
      const response = {
        status: 500,
        statusText: 'Server Error',
        text: async () => 'Not valid JSON'
      } as any;

      const parsed = await parseD365Error(response);

      expect(parsed.message).toBe('Server Error');
      expect(parsed.errorCode).toBe('');
    });
  });

  describe('createAppErrorFromD365', () => {
    it('should create AppError with D365 context', () => {
      const parsedError: ParsedD365Error = {
        statusCode: 403,
        errorCode: D365_ERROR_CODES.ACCESS_DENIED,
        message: 'Access denied to resource',
        details: 'User lacks required permissions',
        type: 'SecurityException',
        isRetryable: false,
        userMessage: 'Access denied'
      };

      const appError = createAppErrorFromD365(parsedError);

      expect(appError).toBeInstanceOf(AppError);
      expect(appError.message).toBe('Access denied');
      expect(appError.statusCode).toBe(403);
      expect((appError as any).d365Error).toEqual({
        code: D365_ERROR_CODES.ACCESS_DENIED,
        details: 'User lacks required permissions',
        type: 'SecurityException',
        isRetryable: false,
        originalMessage: 'Access denied to resource'
      });
    });
  });

  describe('parseD365FetchError', () => {
    it('should parse error from fetch response', async () => {
      const errorResponse: D365ErrorResponse = {
        error: {
          code: D365_ERROR_CODES.THROTTLING,
          message: 'Too many requests'
        }
      };

      const response = new Response(JSON.stringify(errorResponse), {
        status: 429,
        statusText: 'Too Many Requests'
      });

      const error = await parseD365FetchError(response);

      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(429);
      expect(error.message).toBe('Too many requests, please try again later');
    });
  });

  describe('extractFieldFromError', () => {
    it('should extract field name from validation errors', () => {
      const testCases = [
        {
          message: "The attribute 'firstname' is required",
          expected: 'firstname'
        },
        {
          message: "Field 'emailaddress1' is invalid",
          expected: 'emailaddress1'
        },
        {
          message: "Property tc_leadtype cannot be null",
          expected: 'tc_leadtype'
        },
        {
          message: "'lastname' is required for this operation",
          expected: 'lastname'
        },
        {
          message: "telephone1 is invalid",
          expected: 'telephone1'
        }
      ];

      for (const { message, expected } of testCases) {
        expect(extractFieldFromError(message)).toBe(expected);
      }
    });

    it('should return null when no field name found', () => {
      expect(extractFieldFromError('Generic error message')).toBeNull();
      expect(extractFieldFromError('Something went wrong')).toBeNull();
    });
  });

  describe('formatErrorForLogging', () => {
    it('should format error with all details', () => {
      const parsedError: ParsedD365Error = {
        statusCode: 500,
        errorCode: D365_ERROR_CODES.GENERIC_SQL_ERROR,
        message: 'Database error occurred',
        details: 'Constraint violation',
        type: 'SqlException',
        isRetryable: false,
        userMessage: 'Database error occurred'
      };

      const formatted = formatErrorForLogging(parsedError);

      expect(formatted).toContain('D365 Error: Database error occurred');
      expect(formatted).toContain('Status: 500');
      expect(formatted).toContain('Code: ' + D365_ERROR_CODES.GENERIC_SQL_ERROR);
      expect(formatted).toContain('Type: SqlException');
      expect(formatted).toContain('Details: Constraint violation');
      expect(formatted).toContain('Retryable: No');
    });

    it('should handle missing optional fields', () => {
      const parsedError: ParsedD365Error = {
        statusCode: 404,
        errorCode: '',
        message: 'Not found',
        isRetryable: false,
        userMessage: 'Resource not found'
      };

      const formatted = formatErrorForLogging(parsedError);

      expect(formatted).toContain('D365 Error: Not found');
      expect(formatted).toContain('Status: 404');
      expect(formatted).toContain('Code: N/A');
      expect(formatted).not.toContain('Type:');
      expect(formatted).not.toContain('Details:');
    });
  });

  describe('sanitizeErrorMessage', () => {
    it('should sanitize error messages for users', () => {
      // This is tested indirectly through getUserMessage
      const response = { status: 500, statusText: 'Error' };
      const errorBody = {
        error: {
          code: '',
          message: 'System.Data.SqlException: something at line 123'
        }
      };

      parseD365Error(response, errorBody).then(parsed => {
        expect(parsed.userMessage).toBe('Internal server error');
      });
    });
  });
});