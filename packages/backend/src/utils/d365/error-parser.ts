/**
 * D365 Error Parser
 * Extracts meaningful error information from D365 Web API responses
 * Provides consistent error handling and user-friendly messages
 */

import { AppError } from '../errors';

/**
 * D365 error response structure
 */
export interface D365ErrorResponse {
  error: {
    code: string;
    message: string;
    innererror?: {
      message: string;
      type: string;
      stacktrace: string;
      internalexception?: {
        message: string;
        type: string;
        stacktrace: string;
      };
    };
  };
}

/**
 * Parsed error information
 */
export interface ParsedD365Error {
  /** HTTP status code */
  statusCode: number;
  /** D365 error code */
  errorCode: string;
  /** Primary error message */
  message: string;
  /** Detailed error message (if available) */
  details?: string;
  /** Error type/category */
  type?: string;
  /** Whether this error is retryable */
  isRetryable: boolean;
  /** User-friendly error message */
  userMessage: string;
  /** Original error response */
  originalError?: any;
}

/**
 * Common D365 error codes
 */
export const D365_ERROR_CODES = {
  // Authentication/Authorization
  UNAUTHORIZED: '0x80040220',
  INSUFFICIENT_PRIVILEGES: '0x80040221', // Changed to unique code
  ACCESS_DENIED: '0x80042f09',
  
  // Data validation
  DUPLICATE_RECORD: '0x80040237',
  INVALID_ARGUMENT: '0x80040203',
  MISSING_REQUIRED: '0x80040200',
  INVALID_RELATIONSHIP: '0x80040217',
  
  // Business logic
  BUSINESS_RULE_ERROR: '0x80040265',
  PLUGIN_ERROR: '0x80040266', // Changed to unique code
  WORKFLOW_ERROR: '0x80045001',
  
  // System errors
  GENERIC_SQL_ERROR: '0x80044150',
  TIMEOUT: '0x80044151',
  DEADLOCK: '0x80044152',
  THROTTLING: '0x80072321',
  SERVICE_UNAVAILABLE: '0x80044184',
  
  // Query errors
  INVALID_QUERY: '0x8004024a',
  QUERY_BUILDER_NO_ATTRIBUTE: '0x80040236',
  INVALID_FILTER: '0x8004025c',
} as const;

/**
 * Error code to user message mappings
 */
const ERROR_USER_MESSAGES: Record<string, string> = {
  [D365_ERROR_CODES.UNAUTHORIZED]: 'You are not authorized to access this resource',
  [D365_ERROR_CODES.INSUFFICIENT_PRIVILEGES]: 'You do not have sufficient privileges to perform this operation',
  [D365_ERROR_CODES.ACCESS_DENIED]: 'Access denied to the requested resource',
  [D365_ERROR_CODES.DUPLICATE_RECORD]: 'A record with these values already exists',
  [D365_ERROR_CODES.INVALID_ARGUMENT]: 'Invalid data provided',
  [D365_ERROR_CODES.MISSING_REQUIRED]: 'Required fields are missing',
  [D365_ERROR_CODES.INVALID_RELATIONSHIP]: 'Invalid relationship reference',
  [D365_ERROR_CODES.BUSINESS_RULE_ERROR]: 'Business rule validation failed',
  [D365_ERROR_CODES.PLUGIN_ERROR]: 'Server processing error occurred',
  [D365_ERROR_CODES.WORKFLOW_ERROR]: 'Workflow processing error occurred',
  [D365_ERROR_CODES.GENERIC_SQL_ERROR]: 'Database error occurred',
  [D365_ERROR_CODES.TIMEOUT]: 'Request timed out',
  [D365_ERROR_CODES.DEADLOCK]: 'Database conflict occurred, please retry',
  [D365_ERROR_CODES.THROTTLING]: 'Too many requests, please try again later',
  [D365_ERROR_CODES.SERVICE_UNAVAILABLE]: 'Service is temporarily unavailable',
  [D365_ERROR_CODES.INVALID_QUERY]: 'Invalid query syntax',
  [D365_ERROR_CODES.QUERY_BUILDER_NO_ATTRIBUTE]: 'Invalid field name in query',
  [D365_ERROR_CODES.INVALID_FILTER]: 'Invalid filter condition',
};

/**
 * Parse D365 error response
 * 
 * @param response - HTTP response object
 * @param responseBody - Response body (string or object)
 * @returns Parsed error information
 */
export async function parseD365Error(
  response: Response | { status: number; statusText: string },
  responseBody?: any
): Promise<ParsedD365Error> {
  const statusCode = response.status;
  let errorBody: D365ErrorResponse | null = null;

  // Try to parse error body
  if (responseBody) {
    errorBody = typeof responseBody === 'string' 
      ? tryParseJSON<D365ErrorResponse>(responseBody)
      : responseBody;
  } else if ('text' in response) {
    try {
      const text = await response.text();
      errorBody = tryParseJSON<D365ErrorResponse>(text);
    } catch {
      // Ignore parsing errors
    }
  }

  // Extract error details
  const errorCode = errorBody?.error?.code || '';
  const message = errorBody?.error?.message || response.statusText || 'Unknown error';
  const innerMessage = errorBody?.error?.innererror?.message;
  const errorType = errorBody?.error?.innererror?.type;

  // Determine if error is retryable
  const isRetryable = isRetryableError(statusCode, errorCode);

  // Get user-friendly message
  const userMessage = getUserMessage(statusCode, errorCode, message);

  return {
    statusCode,
    errorCode,
    message,
    details: innerMessage,
    type: errorType,
    isRetryable,
    userMessage,
    originalError: errorBody,
  };
}

/**
 * Create an AppError from parsed D365 error
 * 
 * @param parsedError - Parsed error information
 * @returns AppError instance
 */
export function createAppErrorFromD365(parsedError: ParsedD365Error): AppError {
  const error = new AppError(parsedError.userMessage, parsedError.statusCode);
  
  // Attach additional context
  (error as any).d365Error = {
    code: parsedError.errorCode,
    details: parsedError.details,
    type: parsedError.type,
    isRetryable: parsedError.isRetryable,
    originalMessage: parsedError.message,
  };
  
  return error;
}

/**
 * Parse error from fetch response
 * Convenience method that combines parsing and AppError creation
 * 
 * @param response - Fetch response
 * @returns AppError with D365 context
 */
export async function parseD365FetchError(response: Response): Promise<AppError> {
  const parsedError = await parseD365Error(response);
  return createAppErrorFromD365(parsedError);
}

/**
 * Determine if an error is retryable based on status code and error code
 */
function isRetryableError(statusCode: number, errorCode: string): boolean {
  // Retryable HTTP status codes
  const retryableStatusCodes = [429, 500, 502, 503, 504];
  if (retryableStatusCodes.includes(statusCode)) {
    return true;
  }

  // Retryable D365 error codes
  const retryableErrorCodes = [
    D365_ERROR_CODES.DEADLOCK,
    D365_ERROR_CODES.TIMEOUT,
    D365_ERROR_CODES.THROTTLING,
    D365_ERROR_CODES.SERVICE_UNAVAILABLE,
  ] as string[];
  
  return retryableErrorCodes.includes(errorCode);
}

/**
 * Get user-friendly error message based on status code and error code
 */
function getUserMessage(statusCode: number, errorCode: string, defaultMessage: string): string {
  // Check for known error code
  if (errorCode && ERROR_USER_MESSAGES[errorCode]) {
    return ERROR_USER_MESSAGES[errorCode];
  }

  // Fall back to status code-based messages
  switch (statusCode) {
    case 400:
      return 'Invalid request data';
    case 401:
      return 'Authentication required';
    case 403:
      return 'Access denied';
    case 404:
      return 'Resource not found';
    case 409:
      return 'Conflict with existing data';
    case 429:
      return 'Too many requests, please try again later';
    case 500:
      return 'Internal server error';
    case 502:
      return 'Service temporarily unavailable';
    case 503:
      return 'Service temporarily unavailable';
    case 504:
      return 'Request timed out';
    default:
      // Clean up technical messages for users
      return sanitizeErrorMessage(defaultMessage);
  }
}

/**
 * Sanitize error message for user display
 * Removes technical details and formats message
 */
function sanitizeErrorMessage(message: string): string {
  // Remove GUIDs
  message = message.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '[ID]');
  
  // Remove stack traces
  message = message.replace(/\n\s*at\s+.*$/gm, '');
  
  // Remove .NET exception types
  message = message.replace(/System\.\w+Exception:\s*/g, '');
  
  // Trim and capitalize
  message = message.trim();
  if (message && message[0] === message[0].toLowerCase()) {
    message = message[0].toUpperCase() + message.slice(1);
  }
  
  // Ensure it ends with a period
  if (message && !message.endsWith('.') && !message.endsWith('!') && !message.endsWith('?')) {
    message += '.';
  }
  
  return message || 'An unexpected error occurred.';
}

/**
 * Try to parse JSON, returning null on failure
 */
function tryParseJSON<T>(text: string): T | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Extract field name from D365 validation error
 * Useful for form validation feedback
 * 
 * @param errorMessage - D365 error message
 * @returns Field name if found, null otherwise
 */
export function extractFieldFromError(errorMessage: string): string | null {
  // Common patterns in D365 validation errors
  const patterns = [
    /attribute[s]?\s+['"]?(\w+)['"]?/i,
    /field[s]?\s+['"]?(\w+)['"]?/i,
    /property\s+['"]?(\w+)['"]?/i,
    /['"]?(\w+)['"]?\s+is\s+required/i,
    /['"]?(\w+)['"]?\s+is\s+invalid/i,
  ];

  for (const pattern of patterns) {
    const match = errorMessage.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Format D365 error for logging
 * Includes all available details for debugging
 * 
 * @param parsedError - Parsed error information
 * @returns Formatted string for logging
 */
export function formatErrorForLogging(parsedError: ParsedD365Error): string {
  const parts = [
    `D365 Error: ${parsedError.message}`,
    `Status: ${parsedError.statusCode}`,
    `Code: ${parsedError.errorCode || 'N/A'}`,
  ];

  if (parsedError.type) {
    parts.push(`Type: ${parsedError.type}`);
  }

  if (parsedError.details) {
    parts.push(`Details: ${parsedError.details}`);
  }

  parts.push(`Retryable: ${parsedError.isRetryable ? 'Yes' : 'No'}`);

  return parts.join(' | ');
}