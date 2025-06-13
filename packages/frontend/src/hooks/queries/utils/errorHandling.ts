import type { ToastType } from '../../../stores/uiStore';

interface ErrorConfig {
  pattern: string | RegExp;
  message: string;
  type: ToastType;
}

const errorConfigs: ErrorConfig[] = [
  {
    pattern: '404',
    message: 'Resource not found or you may not have access',
    type: 'error',
  },
  {
    pattern: '403',
    message: 'You do not have permission for this action',
    type: 'error',
  },
  {
    pattern: '401',
    message: 'Your session has expired. Please login again',
    type: 'error',
  },
  {
    pattern: /network|connection|fetch/i,
    message: 'Connection error. Please check your internet connection',
    type: 'error',
  },
  {
    pattern: '500',
    message: 'Server error. Please try again later',
    type: 'error',
  },
];

/**
 * Centralized API error handler
 * Maps common error patterns to user-friendly messages
 */
export const handleApiError = (
  error: Error,
  showToast: (message: string, type: ToastType) => void,
  defaultMessage = 'An unexpected error occurred'
): void => {
  const errorMessage = error.message || error.toString();
  
  // Find matching error config
  const config = errorConfigs.find(({ pattern }) => {
    if (typeof pattern === 'string') {
      return errorMessage.includes(pattern);
    }
    return pattern.test(errorMessage);
  });

  showToast(
    config?.message || errorMessage || defaultMessage,
    config?.type || 'error'
  );
};

/**
 * Type guard to check if an error is an API error
 */
export const isApiError = (error: unknown): error is Error => {
  return error instanceof Error;
};

/**
 * Extract error status code from error message
 */
export const getErrorStatusCode = (error: Error): number | null => {
  const match = error.message.match(/\b\d{3}\b/);
  return match ? parseInt(match[0], 10) : null;
};